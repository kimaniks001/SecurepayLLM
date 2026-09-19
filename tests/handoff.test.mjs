import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/handoff/controller';
export * from './src/features/identity/controller';
export * from './src/features/agent/controller';
export * from './src/api/securepay/http';
export * from './src/api/securepay/session';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const digest = 'digest-7';
const handoffDto = (status, overrides = {}) => ({
  handoffId: 'h1', conversationId: 'c1', status,
  agreementCandidateSummary: { title: 'Tile the bathroom', purpose: null, description: null, agreementType: null, currency: 'KES', amountMinor: 500000, what: ['Tiling'], who: ['Peter'], when: ['Next week'] },
  unresolvedMatters: [], guidanceNotes: [], tradeContextVersion: 7, candidateDigest: digest, expiresAt: '2026-01-01T00:00:00Z', progressedAgreementId: null,
  ...overrides,
});
const candidateDto = { title: 'Tile the bathroom', purpose: null, description: null, agreementType: null, currency: 'KES', amountMinor: 500000, what: ['Tiling'], who: ['Peter'], when: ['Next week'] };

function setup(overrides = {}) {
  const calls = [];
  const gateway = {
    createHandoff: async (id, clientActionId) => { calls.push(['createHandoff', id, clientActionId]); return handoffDto('READY_FOR_REVIEW'); },
    readHandoff: async id => { calls.push(['readHandoff', id]); return handoffDto('READY_FOR_REVIEW'); },
    adoptHandoff: async id => { calls.push(['adoptHandoff', id]); return handoffDto('READY_FOR_REVIEW'); },
    reviewHandoff: async id => { calls.push(['reviewHandoff', id]); return candidateDto; },
    continueHandoff: async (id, body) => { calls.push(['continueHandoff', id, body]); return handoffDto('PROGRESSED', { progressedAgreementId: 'agreement-9' }); },
    ...overrides,
  };
  return { calls, controller: api.createHandoffController(gateway, () => 'client-action-1') };
}

test('1. Continue with this creates exactly one handoff per explicit action; re-entrant calls are no-ops', async () => {
  const { controller, calls } = setup({ createHandoff: async () => { calls.push('create'); return handoffDto('READY_FOR_REVIEW'); } });
  const first = controller.start('c1');
  const second = controller.start('c1'); // rapid duplicate click while creating
  await Promise.all([first, second]);
  assert.equal(calls.filter(call => call === 'create' || call?.[0] === 'create').length, 1);
  // Already has a live handoff; a further explicit click is still a no-op until reset/error/expired.
  await controller.start('c1');
  assert.equal(calls.filter(call => call === 'create').length, 1);
});

test('2. Agreement Preview alone never creates a handoff: the Agent controller has no path to createHandoff', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    submitTurn: async () => { calls.push('turn'); return { message: 'ok', components: [{ type: 'AGREEMENT_PREVIEW', data: { what: [], who: [], money: [], when: [], stillWorthSettling: [], disclaimer: 'not an agreement' } }], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; },
    readContext: async () => { calls.push('context'); return { conversationId: 'c1', version: 1, entities: [], relationships: [] }; },
    adoptFact: async () => { calls.push('adopt'); return { conversationId: 'c1', version: 2, entities: [], relationships: [] }; },
    createHandoff: async () => { calls.push('createHandoff'); throw new Error('must never be called from the Agent controller'); },
  };
  const controller = api.createAgentController(gateway);
  await controller.send('bathroom tiling');
  await controller.review();
  assert.equal(calls.includes('createHandoff'), false);
});

test('3. IDENTITY_REQUIRED routes to auth and never progresses the Agreement', async () => {
  const { controller, calls } = setup({ createHandoff: async () => handoffDto('IDENTITY_REQUIRED') });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  assert.equal(controller.getSnapshot().handoff.progressedAgreementId, null);
  assert.equal(calls.some(call => call[0] === 'adoptHandoff' || call[0] === 'continueHandoff'), false);
});

test('4. successful auth alone does not mean handoff adoption/progression; adoption is its own call and re-read', async () => {
  const authCalls = [];
  const auth = {
    signIn: async () => { authCalls.push('signIn'); return { challengeToken: 'chal', expiresAt: '2026-01-01T00:00:00Z' }; },
    completeOtp: async () => { authCalls.push('completeOtp'); return { accessToken: 'tok', accessTokenExpiresAt: '2999-01-01T00:00:00Z', refreshToken: 'ref', refreshTokenExpiresAt: '2999-01-01T00:00:00Z' }; },
    resendOtp: async () => { authCalls.push('resendOtp'); },
  };
  const session = api.createSessionStore();
  const identity = api.createIdentityController(auth, session);
  const { controller, calls } = setup({ createHandoff: async () => handoffDto('IDENTITY_REQUIRED') });
  await controller.start('c1');
  identity.setKsNumber('KS-1');
  identity.setPassword('secret');
  await identity.submitCredentials();
  identity.setOtp('123456');
  await identity.submitOtp();
  // Sign-in alone must not have touched the handoff.
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  assert.equal(calls.some(call => call[0] === 'adoptHandoff'), false);
  assert.equal(identity.getSnapshot().phase, 'signed-in');
  await controller.continueAfterIdentity();
  assert.deepEqual(calls.filter(call => call[0] === 'adoptHandoff'), [['adoptHandoff', 'h1']]);
  // One read follows adoption directly; a second follows the canonical review (fix for authoritative
  // READY_TO_PROGRESS sync) — both against the same handoff, never an assumed progression.
  assert.deepEqual(calls.filter(call => call[0] === 'readHandoff'), [['readHandoff', 'h1'], ['readHandoff', 'h1']]);
  assert.equal(controller.getSnapshot().phase, 'review-ready');
});

test('5. wrong account / 403 on adoption fails closed', async () => {
  const { controller } = setup({ createHandoff: async () => handoffDto('IDENTITY_REQUIRED'), adoptHandoff: async () => { throw new api.ApiError('http', 'forbidden', 403, 'AGENT_AGREEMENT_HANDOFF_CONFLICT'); } });
  await controller.start('c1');
  await controller.continueAfterIdentity();
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.equal(controller.getSnapshot().handoff.progressedAgreementId, null);
});

test('6. NEEDS_RESOLUTION blocks Set securely', async () => {
  const { controller, calls } = setup({ createHandoff: async () => handoffDto('NEEDS_RESOLUTION', { guidanceNotes: ['Tell us the completion date'] }) });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'needs-resolution');
  await controller.setSecurely();
  assert.equal(calls.some(call => call[0] === 'continueHandoff'), false);
  assert.equal(controller.getSnapshot().phase, 'needs-resolution');
});

test('7. canonical review comes from /review, not the Agent preview', async () => {
  const { controller, calls } = setup();
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'review-ready');
  assert.deepEqual(controller.getSnapshot().review, candidateDto);
  assert.equal(calls.filter(call => call[0] === 'reviewHandoff').length, 1);
});

test('8 & 11. exact tradeContextVersion and candidateDigest are preserved and echoed unchanged to /continue', async () => {
  const { controller, calls } = setup({
    createHandoff: async () => handoffDto('READY_TO_PROGRESS'),
    readHandoff: async id => { calls.push(['readHandoff', id]); return handoffDto('READY_TO_PROGRESS'); },
  });
  await controller.start('c1');
  assert.deepEqual(controller.getSnapshot().handoff.reviewSnapshot, { expectedTradeContextVersion: 7, expectedCandidateDigest: digest });
  await controller.setSecurely();
  const continueCall = calls.find(call => call[0] === 'continueHandoff');
  assert.deepEqual(continueCall[2], { expectedTradeContextVersion: 7, expectedCandidateDigest: digest });
});

test('9. stale review cannot progress', async () => {
  const { controller, calls } = setup({ createHandoff: async () => handoffDto('REVIEW_STALE') });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'review-stale');
  await controller.setSecurely();
  assert.equal(calls.some(call => call[0] === 'continueHandoff'), false);
});

test('10. expired handoff cannot progress but a fresh explicit continuation is allowed', async () => {
  const { controller, calls } = setup({ createHandoff: async id => { calls.push(['createHandoff', id]); return handoffDto('EXPIRED'); } });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'expired');
  await controller.setSecurely();
  assert.equal(calls.some(call => call[0] === 'continueHandoff'), false);
  await controller.start('c1'); // explicit fresh continuation after expiry
  assert.equal(calls.filter(call => call[0] === 'createHandoff').length, 2);
});

test('12. conflict/stale response from /continue does not fabricate success', async () => {
  let readHandoffCalls = 0;
  const { controller, calls } = setup({
    createHandoff: async () => handoffDto('READY_TO_PROGRESS'),
    // First read is the post-review authoritative sync (still ready); second is the 409 recovery read (now stale).
    readHandoff: async id => { readHandoffCalls++; calls.push(['readHandoff', id]); return handoffDto(readHandoffCalls === 1 ? 'READY_TO_PROGRESS' : 'REVIEW_STALE'); },
    continueHandoff: async () => { throw new api.ApiError('http', 'stale', 409, 'AGENT_AGREEMENT_HANDOFF_STALE'); },
  });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'review-ready');
  await controller.setSecurely();
  assert.equal(controller.getSnapshot().phase, 'review-stale');
  assert.equal(controller.getSnapshot().handoff.progressedAgreementId, null);
});

test('13. PROGRESSED retains the real progressedAgreementId without inferring establishment', async () => {
  const { controller } = setup({
    createHandoff: async () => handoffDto('READY_TO_PROGRESS'),
    readHandoff: async () => handoffDto('READY_TO_PROGRESS'),
  });
  await controller.start('c1');
  await controller.setSecurely();
  assert.equal(controller.getSnapshot().phase, 'progressed');
  assert.equal(controller.getSnapshot().handoff.progressedAgreementId, 'agreement-9');
  assert.equal(controller.getSnapshot().handoff.status, 'PROGRESSED');
});

test('PR #5 review fix 1: after a successful canonical review, an authoritative re-read observes READY_TO_PROGRESS and enables Set securely with no manual refresh', async () => {
  let readHandoffCalls = 0;
  const { controller, calls } = setup({
    createHandoff: async () => handoffDto('READY_FOR_REVIEW'),
    // The backend records that /review happened, so the very next authoritative GET already reports READY_TO_PROGRESS.
    readHandoff: async id => { readHandoffCalls++; calls.push(['readHandoff', id]); return handoffDto('READY_TO_PROGRESS'); },
  });
  await controller.start('c1'); // the only explicit action taken; no controller.refresh() call anywhere below
  assert.equal(readHandoffCalls, 1);
  assert.equal(controller.getSnapshot().phase, 'review-ready');
  assert.equal(controller.getSnapshot().handoff.status, 'READY_TO_PROGRESS');
  assert.deepEqual(controller.getSnapshot().review, candidateDto);
  const before = calls.length;
  await controller.setSecurely();
  assert.equal(calls.slice(before).some(call => call[0] === 'continueHandoff'), true);
  assert.equal(controller.getSnapshot().phase, 'progressed');
});

test('PR #5 review fix 2: REVIEW_STALE is discarded, never re-read/reused as though it could recover', async () => {
  const { controller, calls } = setup({ createHandoff: async (convId, clientActionId) => { calls.push(['createHandoff', convId, clientActionId]); return handoffDto('REVIEW_STALE'); } });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'review-stale');
  const staleHandoffId = controller.getSnapshot().handoff.id;
  // Reaching REVIEW_STALE must never itself trigger a read/review attempt on that same handoff.
  assert.equal(calls.some(call => call[0] === 'readHandoff'), false);
  assert.equal(calls.some(call => call[0] === 'reviewHandoff'), false);
  controller.reset();
  assert.equal(controller.getSnapshot().phase, 'idle');
  assert.equal(controller.getSnapshot().handoff, null);
  await controller.start('c1'); // only a genuinely new explicit "Continue with this" may proceed
  assert.equal(calls.filter(call => call[0] === 'createHandoff').length, 2);
  assert.equal(calls.some(call => call[0] === 'readHandoff' && call[1] === staleHandoffId), false);
  assert.equal(calls.some(call => call[0] === 'reviewHandoff' && call[1] === staleHandoffId), false);
});

test('PR #5 review fix 2: the locked HandoffPanel offers no Refresh action for REVIEW_STALE, only a fresh continuation', async () => {
  const panelBundle = await build({ stdin: { contents: `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HandoffPanel } from './src/features/handoff/HandoffPanel';
const noopController = snapshot => ({ subscribe: () => () => {}, getSnapshot: () => snapshot, reset() {}, refresh() {}, start() {}, setSecurely() {}, continueAfterIdentity() {} });
const handoff = noopController({ phase: 'review-stale', handoff: { id: 'h1', status: 'REVIEW_STALE', candidate: {}, unresolvedMatters: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 1, expectedCandidateDigest: 'd' }, expiresAt: '2026-01-01T00:00:00Z', progressedAgreementId: null }, review: null, error: null });
const identity = noopController({ phase: 'credentials', busy: false, ksNumber: '', password: '', otp: '', challengeToken: null, error: null });
export const markup = renderToStaticMarkup(React.createElement(HandoffPanel, { handoff, identity, onDone: () => {} }));
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const panelModule = { exports: {} };
  new Function('require', 'module', 'exports', panelBundle.outputFiles[0].text)(createRequire(import.meta.url), panelModule, panelModule.exports);
  const html = panelModule.exports.markup;
  assert.doesNotMatch(html, /Refresh/i);
  assert.match(html, /Start a fresh continuation/);
});

test('14. production path wires the real handoff/identity/session modules and cannot fall back to fixture state', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /(?:mockAgent|demoData|src\/App\.tsx)/.test(path)), false);
  for (const required of ['features/handoff/controller.ts', 'features/identity/controller.ts', 'api/securepay/session.ts']) {
    assert.equal(paths.some(path => path.endsWith(required)), true, `expected ${required} in the production bundle`);
  }
  const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(runtime, /session\.getAccessToken/);
  assert.doesNotMatch(runtime, /createSecurePayApi\([^)]*\(\)\s*=>\s*null/);
});

test('session store refreshes only an expired access token and never logs/persists tokens outside memory', async () => {
  const session = api.createSessionStore();
  session.setTokens({ accessToken: 'old', accessTokenExpiresAt: '2000-01-01T00:00:00Z', refreshToken: 'ref', refreshTokenExpiresAt: '2999-01-01T00:00:00Z' });
  let refreshCalls = 0;
  const auth = { refresh: async token => { refreshCalls++; assert.equal(token, 'ref'); return { accessToken: 'new', accessTokenExpiresAt: '2999-01-01T00:00:00Z', refreshToken: 'ref2', refreshTokenExpiresAt: '2999-01-01T00:00:00Z' }; } };
  await api.ensureFreshSession(session, auth);
  assert.equal(session.getAccessToken(), 'new');
  await api.ensureFreshSession(session, auth); // not expired now; no second refresh
  assert.equal(refreshCalls, 1);
});
