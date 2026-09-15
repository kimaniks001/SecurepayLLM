import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/config/securepay';
export * from './src/api/securepay';
export * from './src/api/securepay/http';
export * from './src/api/securepay/agent/adapters';
export * from './src/api/securepay/agreements/adapters';
export * from './src/api/securepay/money/adapters';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('fixture mode is explicit and rejected in production; base URL fails closed', () => {
  assert.equal(api.runtimeMode(undefined, false), 'real');
  assert.equal(api.runtimeMode('fixture', false), 'fixture');
  assert.throws(() => api.runtimeMode('fixture', true));
  assert.throws(() => api.runtimeMode('other', false));
  for (const url of [undefined, 'http://api.example', 'https://user:secret@api.example', 'https://api.example/?token=x']) assert.throws(() => api.apiBaseUrl(url));
  assert.equal(api.apiBaseUrl('http://localhost:8080/'), 'http://localhost:8080');
});

test('HTTP attaches one token boundary, never cookies; public Agent and invitation omit token', async () => {
  const calls = [];
  const client = api.createSecurePayApi('https://api.example', () => 'session-token', async (url, init) => { calls.push({ url, ...init }); return json({}); });
  await client.agent.createConversation();
  await client.agreements.invitation('private/token');
  await client.agreements.detail('agreement-id');
  assert.equal(calls[0].headers.has('Authorization'), false);
  assert.equal(calls[1].headers.has('Authorization'), false);
  assert.equal(calls[1].url, 'https://api.example/api/v1/agreement-invitations/private%2Ftoken');
  assert.equal(calls[2].headers.get('Authorization'), 'Bearer session-token');
  assert.equal(calls[2].credentials, 'omit');
  assert.equal(calls[2].redirect, 'error');
  assert.equal(calls[2].cache, 'no-store');
});

test('consequential POST is attempted once and preserves backend status/code/message', async () => {
  let calls = 0;
  const client = api.createSecurePayApi('https://api.example', () => 'token', async () => { calls++; return json({ code: 'AGENT_AGREEMENT_HANDOFF_STALE', message: 'create a fresh handoff' }, 409); });
  await assert.rejects(client.agent.continueHandoff('h', { expectedTradeContextVersion: 7, expectedCandidateDigest: 'reviewed' }), error => error.status === 409 && error.code === 'AGENT_AGREEMENT_HANDOFF_STALE' && error.message === 'create a fresh handoff');
  assert.equal(calls, 1);
});

test('turn retry preserves caller ID; auth, Join and exact-version confirmation are separate', async () => {
  const calls = [];
  const client = api.createSecurePayApi('https://api.example', () => 'token', async (url, init) => { calls.push({ url, body: init.body && JSON.parse(init.body) }); return json({}); });
  const turn = { message: 'Tile my bathroom', clientTurnId: 'stable-turn' };
  await client.agent.submitTurn('c', turn);
  await client.agent.submitTurn('c', turn);
  assert.deepEqual(calls[0], calls[1]);
  await client.auth.completeOtp({ challengeToken: 'challenge', otpProof: '123456' });
  assert.equal(calls.length, 3);
  await client.agreements.join('invitation', 'join-key');
  assert.deepEqual(calls[3].body, { idempotencyKey: 'join-key' });
  await client.agreements.confirmVersion('a', 'v7', { idempotencyKey: 'confirm-key', expectedVersionNumber: 7, expectedContentHash: 'hash7' });
  assert.equal(calls[4].url, 'https://api.example/api/v1/agreements/a/versions/v7/confirm');
  assert.deepEqual(calls[4].body, { idempotencyKey: 'confirm-key', expectedVersionNumber: 7, expectedContentHash: 'hash7' });
  await client.agent.continueHandoff('h', { expectedTradeContextVersion: 7, expectedCandidateDigest: 'digest7' });
  assert.deepEqual(calls[5].body, { expectedTradeContextVersion: 7, expectedCandidateDigest: 'digest7' });
});

test('network, timeout, abort, missing authentication and invalid response remain failures', async () => {
  const client = (fetcher, timeout = 100) => api.createHttpClient('https://api.example', () => null, fetcher, timeout);
  await assert.rejects(client(async () => { throw new TypeError('offline'); }).request('/api/test'), { kind: 'network' });
  const pending = async (_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new Error('aborted'));
    else signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  await assert.rejects(client(pending, 1).request('/api/test'), { kind: 'timeout' });
  await assert.rejects(client(pending).request('/api/test', { signal: AbortSignal.abort() }), { kind: 'aborted' });
  await assert.rejects(client(() => assert.fail('no unauthenticated private request')).request('/api/test', { auth: 'required' }), { status: 401 });
  await assert.rejects(client(async () => new Response('<html>bad gateway</html>')).request('/api/test'), { kind: 'invalid-response' });
  await assert.rejects(client(async () => new Response('{"amountMinor":9007199254740993}')).request('/api/test'), { kind: 'invalid-response' });
  assert.equal(await client(async () => new Response(null, { status: 204 })).request('/api/test'), undefined);
});

test('future Agent components are ignored while text and candidate state survive', () => {
  const view = api.agentResponseView({ message: 'Still here', components: [{ type: 'FUTURE_COMPONENT', data: {} }, { type: 'AGREEMENT_PREVIEW', data: { what: ['Tiling'], who: ['Peter (being considered)'], money: ['KES 100 candidate'], when: [], stillWorthSettling: ['Scope'], disclaimer: 'Not an agreement' } }], contextualPanel: null, contextUpdates: [], suggestedActions: [] });
  assert.equal(view.message.text, 'Still here');
  assert.equal(view.components.length, 1);
  assert.equal(view.components[0].who[0], 'Peter (being considered)');
  const context = api.tradeContextView({ conversationId: 'c', version: 2, entities: [{ id: 'fact', type: 'AMOUNT', name: '100', state: 'CANDIDATE', attributes: { source: 'quotation' } }, { id: 'future', type: 'FUTURE', name: 'Future fact', state: 'FUTURE', attributes: {} }], relationships: [] });
  assert.equal(context.candidates.length, 1);
  assert.equal(context.confirmed.length, 0);
  assert.equal(context.facts.length, 2);
  assert.equal(context.candidates[0].provenance.source, 'quotation');
});

test('handoff retains exact review snapshot and every backend state without progression inference', () => {
  for (const status of ['IDENTITY_REQUIRED', 'NEEDS_RESOLUTION', 'REVIEW_STALE', 'READY_FOR_REVIEW', 'READY_TO_PROGRESS', 'PROGRESSED', 'EXPIRED', 'FUTURE']) {
    const view = api.handoffView({ handoffId: 'h', status, tradeContextVersion: 4, candidateDigest: 'digest', progressedAgreementId: null });
    assert.equal(view.status, status === 'FUTURE' ? 'UNKNOWN' : status);
    assert.deepEqual(view.reviewSnapshot, { expectedTradeContextVersion: 4, expectedCandidateDigest: 'digest' });
    assert.equal(view.progressedAgreementId, null);
  }
});

test('Money readiness never grants a financial next action; missing evaluation differs from outage', () => {
  for (const status of ['NO_EVALUATION_YET', 'READY', 'NOT_READY', 'PARTIALLY_READY', 'BLOCKED', 'NEW_STATE']) {
    assert.equal(api.readiness(status), status === 'NEW_STATE' ? 'UNKNOWN' : status);
  }
  assert.equal(api.moneyNextActionView('a', { status: 'ready', data: [] }).action, null);
  assert.equal(api.moneyNextActionView('a', { status: 'error', error: new api.ApiError('network', 'offline') }).action, null);
  assert.equal(api.moneyNextActionView('a', { status: 'ready', data: [{ agreementId: 'other', actionCode: 'FUND_AGREEMENT' }] }).action, null);
  const action = { agreementId: 'a', actionCode: 'FUND_AGREEMENT', reason: 'backend reason' };
  assert.equal(api.moneyNextActionView('a', { status: 'ready', data: [action] }).action, action);
  assert.equal(api.moneyFailureView(new api.ApiError('http', 'missing', 404, 'PAYMENT_READY_EVALUATION_NOT_FOUND')).readiness, 'NO_EVALUATION_YET');
  assert.equal(api.moneyFailureView(new api.ApiError('http', 'not found', 404)).readiness, 'UNKNOWN');
  assert.equal(api.moneyFailureView(new api.ApiError('network', 'offline')).readiness, 'UNKNOWN');
});

test('production build excludes locked fixture App and financial demo records', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /(?:mockAgent|moneyData|demoData|src\/App\.tsx)/.test(path)), false);
  const main = await readFile('src/main.tsx', 'utf8');
  assert.match(main, /RuntimeApp/);
});

test('authority failures keep their exact error instead of returning a successful fixture', async () => {
  for (const [status, code] of [[404, 'AGENT_CONVERSATION_NOT_FOUND'], [403, 'AGENT_AGREEMENT_HANDOFF_CONFLICT'], [409, 'AGENT_AGREEMENT_HANDOFF_STALE'], [410, 'AGENT_AGREEMENT_HANDOFF_EXPIRED'], [422, 'AGREEMENT_INVITATION_ERROR'], [422, 'AGREEMENT_CONFIRMATION_ERROR'], [409, 'IDEMPOTENCY_CONFLICT'], [401, 'UNAUTHORIZED'], [403, 'FORBIDDEN'], [503, 'UNAVAILABLE']]) {
    const client = api.createHttpClient('https://api.example', () => 'token', async () => json({ code, message: 'backend message' }, status));
    await assert.rejects(client.request('/api/test'), error => error instanceof api.ApiError && error.status === status && error.code === code);
  }
});

test('Agreement Detail preserves missing version, empty milestones and backend status', () => {
  const dto = { overview: { agreementId: 'a', status: 'DRAFT', proposedAmountMinor: null }, currentVersion: null, participants: [], milestones: [], terms: [], documents: [], activity: [], versionHistory: [], money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 } };
  const view = api.agreementDetailView(dto);
  assert.equal(view.version, null);
  assert.equal(view.status, 'DRAFT');
  assert.deepEqual(view.milestones, []);
  assert.equal(view.money.readiness, 'NO_EVALUATION_YET');
});
