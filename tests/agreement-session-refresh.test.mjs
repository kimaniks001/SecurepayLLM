import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
// The production AgreementGateway must refresh an expired-but-refreshable access token BEFORE every authenticated call.
const bundle = await build({ stdin: { contents: `
export * from './src/api/securepay/agreements/refresh';
export { createSessionStore, withSessionRefresh } from './src/api/securepay/session';
export { createAgreementGateway } from './src/api/securepay/agreements';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const listed = new Set(api.AUTHENTICATED_AGREEMENT_METHODS);

test('every AgreementGateway method with auth "required" is on the refresh list (drift fails loudly); the public doorway is not', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  const body = src.slice(src.indexOf('return {'));
  const found = [...body.matchAll(/^ {4}(\w+): \(.*?auth: '(\w+)'/gm)].map(m => ({ name: m[1], auth: m[2] }));
  assert.ok(found.length >= 27, `parsed ${found.length} gateway methods`);
  const required = found.filter(m => m.auth === 'required').map(m => m.name);
  const missing = required.filter(name => !listed.has(name));
  assert.deepEqual(missing, [], `authenticated Agreement methods missing from AUTHENTICATED_AGREEMENT_METHODS: ${missing.join(', ')}`);
  assert.equal(listed.has('invitation'), false); // public GET /agreement-invitations/{token}: auth 'none'
  assert.equal(found.find(m => m.name === 'invitation').auth, 'none');
  for (const name of listed) assert.ok(found.some(m => m.name === name), `${name} is on the list but is not a gateway method`);
});

test('the explicit methods each production feature relies on are covered', () => {
  const needed = {
    recipient: ['join', 'versions', 'version', 'confirmVersion', 'participants'],
    workspace: ['hub', 'home', 'detail', 'currentUserAgreements', 'currentUserActions', 'confirmations', 'milestoneEffectiveStates', 'calendarEvents', 'calendarConflicts', 'myCalendar', 'tagsForAgreement', 'tagAgreement', 'untagAgreement'],
    invitations: ['propose', 'invitations', 'issueInvitation', 'revokeInvitation'],
  };
  for (const [area, methods] of Object.entries(needed)) for (const m of methods) assert.ok(listed.has(m), `${area}: ${m} must be session-refreshed`);
});

test('RuntimeApp wires the Agreement gateway from that list, not a hand-copied one', async () => {
  const src = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(src, /withSessionRefresh\(api\.agreements, AUTHENTICATED_AGREEMENT_METHODS, session, api\.auth\)/);
});

const tokens = (access, exp) => ({ accessToken: access, accessTokenExpiresAt: exp, refreshToken: 'r1', refreshTokenExpiresAt: '2099-01-01T00:00:00Z' });

test('an expired session is refreshed BEFORE issueInvitation (and propose/revoke/list), using the refreshed token', async () => {
  const session = api.createSessionStore();
  session.setTokens(tokens('old', '2000-01-01T00:00:00Z'));
  const order = [];
  const auth = { refresh: async rt => { order.push(['refresh', rt]); return tokens('new', '2099-01-01T00:00:00Z'); } };
  // A real gateway over a stub http that records which token was current at call time.
  const http = { request: async (path, opts) => { order.push(['http', opts.method ?? 'GET', path, session.getAccessToken()]); return {}; } };
  const wrapped = api.withSessionRefresh(api.createAgreementGateway(http), api.AUTHENTICATED_AGREEMENT_METHODS, session, auth);
  await wrapped.issueInvitation('agr-1', { idempotencyKey: 'k', roleCode: 'BUYER', intendedKsNumber: 'KS003' });
  assert.deepEqual(order[0], ['refresh', 'r1']);
  assert.equal(order[1][0], 'http'); assert.equal(order[1][3], 'new');
  session.setTokens(tokens('old2', '2000-01-01T00:00:00Z'));
  for (const call of [() => wrapped.propose('agr-1'), () => wrapped.invitations('agr-1'), () => wrapped.revokeInvitation('agr-1', 'i'), () => wrapped.confirmations('agr-1')]) {
    order.length = 0; session.setTokens(tokens('old2', '2000-01-01T00:00:00Z')); await call();
    assert.equal(order[0][0], 'refresh'); assert.equal(order[1][3], 'new');
  }
});

test('a still-valid session is not refreshed; the public invitation GET never refreshes', async () => {
  const session = api.createSessionStore();
  session.setTokens(tokens('fresh', '2099-01-01T00:00:00Z'));
  let refreshes = 0; const auth = { refresh: async () => { refreshes++; return tokens('x', '2099-01-01T00:00:00Z'); } };
  const wrapped = api.withSessionRefresh(api.createAgreementGateway({ request: async () => ({}) }), api.AUTHENTICATED_AGREEMENT_METHODS, session, auth);
  await wrapped.issueInvitation('agr-1', { idempotencyKey: 'k', roleCode: 'BUYER', intendedKsNumber: 'KS003' });
  assert.equal(refreshes, 0);
  session.setTokens(tokens('old', '2000-01-01T00:00:00Z'));
  await wrapped.invitation('tok'); // public doorway: not wrapped, never triggers a refresh
  assert.equal(refreshes, 0);
});

test('when refresh is rejected the call is not made and the session is cleared: the feature sees the real failure', async () => {
  const session = api.createSessionStore();
  session.setTokens(tokens('old', '2000-01-01T00:00:00Z'));
  let sent = 0; const boom = new Error('refresh rejected');
  const wrapped = api.withSessionRefresh(api.createAgreementGateway({ request: async () => { sent++; return {}; } }), api.AUTHENTICATED_AGREEMENT_METHODS, session, { refresh: async () => { throw boom; } });
  await assert.rejects(wrapped.issueInvitation('agr-1', { idempotencyKey: 'k', roleCode: 'BUYER', intendedKsNumber: 'KS003' }), boom);
  assert.equal(sent, 0); assert.equal(session.getSnapshot().status, 'signed-out');
});
