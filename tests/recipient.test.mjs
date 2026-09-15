import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/recipient/controller';
export * from './src/features/recipient/route';
export * from './src/features/identity/controller';
export * from './src/api/securepay/http';
export * from './src/api/securepay/session';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const TOKEN = 'raw-invitation-token';
const invitationDto = (overrides = {}) => ({
  publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile the bathroom', intendedRole: 'PROVIDER',
  currency: 'KES', proposedAmountMinor: 6800000, invitationExpiresAt: '2026-12-01T00:00:00Z', proposalVersionNumber: 1,
  notice: 'Viewing this invitation is not acceptance and does not join the agreement.', ...overrides,
});
const joinDto = (overrides = {}) => ({
  agreementId: 'agreement-1', publicReference: 'AGR-1', participantId: 'participant-1', role: 'PROVIDER',
  participantStatus: 'JOINED_UNCONFIRMED', joinedVersionId: 'version-1', joinedVersionNumber: 1, confirmationRequired: true,
  joinedAt: '2026-09-15T00:00:00Z', notice: 'Joining identifies participation only. Joining is not acceptance or confirmation.',
  ...overrides,
});
const versionDto = (overrides = {}) => ({
  id: 'version-1', versionNumber: 1, snapshot: { title: 'Bathroom retiling', purpose: 'Retile the bathroom', currency: 'KES', proposed_amount_minor: 6800000, version_number: 1 },
  contentHash: 'hash-1', parentVersionId: null, amendmentReason: null, materialChange: false, versionStatus: 'CURRENT', createdAt: '2026-09-15T00:00:00Z',
  ...overrides,
});
const confirmationDto = (overrides = {}) => ({
  id: 'confirmation-1', agreementVersionId: 'version-1', participantId: 'participant-1', versionNumber: 1, versionContentHash: 'hash-1',
  status: 'CONFIRMED', assuranceMethod: 'AUTHENTICATED_SESSION', confirmedAt: '2026-09-15T00:01:00Z', confirmationCurrent: true, reconfirmationRequired: false,
  ...overrides,
});

function setup(overrides = {}) {
  const calls = [];
  const gateway = {
    invitation: async token => { calls.push(['invitation', token]); return invitationDto(); },
    join: async (token, idempotencyKey) => { calls.push(['join', token, idempotencyKey]); return joinDto(); },
    versions: async agreementId => { calls.push(['versions', agreementId]); return [{ versionId: 'version-1', versionNumber: 1, contentHash: 'hash-1', createdAt: '2026-09-15T00:00:00Z', amendmentReason: null, materialChange: false }]; },
    version: async (agreementId, versionId) => { calls.push(['version', agreementId, versionId]); return versionDto(); },
    confirmVersion: async (agreementId, versionId, body) => { calls.push(['confirmVersion', agreementId, versionId, body]); return confirmationDto(); },
    ...overrides,
  };
  let n = 0;
  return { calls, controller: api.createRecipientController(gateway, TOKEN, () => `key-${++n}`) };
}

test('1/2/3. public invitation review works without auth and never calls Join or confirmation', async () => {
  const { controller, calls } = setup();
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'invitation-ready');
  assert.deepEqual(calls, [['invitation', TOKEN]]);
  assert.equal(calls.some(call => call[0] === 'join'), false);
  assert.equal(calls.some(call => call[0] === 'confirmVersion'), false);
});

test('4. auth alone never calls Join: signing in only moves the recipient phase to the explicit Join boundary', async () => {
  const auth = {
    signIn: async () => ({ challengeToken: 'chal', expiresAt: '2026-01-01T00:00:00Z' }),
    completeOtp: async () => ({ accessToken: 'tok', accessTokenExpiresAt: '2999-01-01T00:00:00Z', refreshToken: 'ref', refreshTokenExpiresAt: '2999-01-01T00:00:00Z' }),
    resendOtp: async () => {},
  };
  const session = api.createSessionStore();
  const identity = api.createIdentityController(auth, session);
  const { controller, calls } = setup();
  await controller.load();
  controller.proceed(false);
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  identity.setKsNumber('KS-1'); identity.setPassword('secret');
  await identity.submitCredentials();
  identity.setOtp('123456');
  await identity.submitOtp();
  assert.equal(identity.getSnapshot().phase, 'signed-in');
  assert.equal(controller.getSnapshot().phase, 'identity-required'); // sign-in alone never moved this
  controller.afterIdentitySignedIn();
  assert.equal(controller.getSnapshot().phase, 'join-prompt');
  assert.equal(calls.some(call => call[0] === 'join'), false);
});

test('5. Join requires explicit user action: it is a no-op from every other phase', async () => {
  const { controller, calls } = setup();
  await controller.load(); // phase: invitation-ready
  await controller.join();
  assert.equal(calls.some(call => call[0] === 'join'), false);
  assert.equal(controller.getSnapshot().phase, 'invitation-ready');
});

test('6. Join uses a stable idempotency key on deliberate retry', async () => {
  let attempt = 0;
  const { controller, calls } = setup({ join: async (token, idempotencyKey) => { attempt++; calls.push(['join', token, idempotencyKey]); if (attempt === 1) throw new api.ApiError('network', 'unavailable'); return joinDto(); } });
  await controller.load();
  controller.proceed(true);
  await controller.join(); // fails
  assert.equal(controller.getSnapshot().phase, 'join-error');
  await controller.join(); // deliberate retry
  const joinCalls = calls.filter(call => call[0] === 'join');
  assert.equal(joinCalls.length, 2);
  assert.equal(joinCalls[0][2], joinCalls[1][2]); // same idempotency key both times
});

test('7/8. successful Join retains authoritative agreementId/joinedVersionId, stays unconfirmed, and the exact version comes from the version endpoint', async () => {
  const { controller, calls } = setup();
  await controller.load();
  controller.proceed(true);
  await controller.join();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'version-ready');
  assert.equal(state.join.agreementId, 'agreement-1');
  assert.equal(state.join.joinedVersionId, 'version-1');
  assert.equal(state.join.participantStatus, 'JOINED_UNCONFIRMED');
  assert.deepEqual(state.version, versionDto());
  assert.deepEqual(calls.find(call => call[0] === 'version'), ['version', 'agreement-1', 'version-1']);
  assert.equal(state.confirmation, null);
});

test('9. confirmation is impossible until the exact version has been fetched/reviewed', async () => {
  const { controller, calls } = setup();
  await controller.load();
  await controller.confirm(); // invitation-ready: no join/version yet
  controller.proceed(true);
  await controller.confirm(); // join-prompt: still no version
  assert.equal(calls.some(call => call[0] === 'confirmVersion'), false);
});

test('10. confirm sends the exact reviewed version id/number/contentHash unchanged', async () => {
  const { controller, calls } = setup();
  await controller.load();
  controller.proceed(true);
  await controller.join();
  await controller.confirm();
  const confirmCall = calls.find(call => call[0] === 'confirmVersion');
  assert.deepEqual(confirmCall.slice(1), ['agreement-1', 'version-1', { idempotencyKey: 'key-2', expectedVersionNumber: 1, expectedContentHash: 'hash-1' }]);
  assert.equal(controller.getSnapshot().phase, 'confirmed');
});

test('11. retry of the same explicit confirm reuses the same idempotency key for the same exact body/version', async () => {
  let attempt = 0;
  const { controller, calls } = setup({ confirmVersion: async (agreementId, versionId, body) => { attempt++; calls.push(['confirmVersion', agreementId, versionId, body]); if (attempt === 1) throw new api.ApiError('network', 'unavailable'); return confirmationDto(); } });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  await controller.confirm();
  assert.equal(controller.getSnapshot().phase, 'confirm-error');
  await controller.confirm(); // deliberate retry, same explicit action
  const confirmCalls = calls.filter(call => call[0] === 'confirmVersion');
  assert.equal(confirmCalls.length, 2);
  assert.deepEqual(confirmCalls[0][3], confirmCalls[1][3]);
  assert.equal(controller.getSnapshot().phase, 'confirmed');
});

test('12/13. stale/superseded confirmation never fabricates success, never auto-retries, and forces a fresh version read+review', async () => {
  const { controller, calls } = setup({ confirmVersion: async (agreementId, versionId, body) => { calls.push(['confirmVersion', agreementId, versionId, body]); throw new api.ApiError('http', 'stale version number', 422, 'AGREEMENT_CONFIRMATION_ERROR'); } });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  await controller.confirm();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'version-ready');
  assert.equal(state.changed, true);
  assert.equal(state.confirmation, null);
  assert.equal(calls.filter(call => call[0] === 'confirmVersion').length, 1); // never auto-retried
  assert.equal(calls.filter(call => call[0] === 'versions').length, 1); // fresh current-version lookup
  assert.equal(calls.filter(call => call[0] === 'version').length, 2); // joined version, then the re-read current version
  assert.equal(state.confirmIdempotencyKey, null); // a new confirm click must mint a fresh key
});

test('14. wrong recipient / 403 on Join fails closed', async () => {
  const { controller, calls } = setup({ join: async () => { throw new api.ApiError('http', 'forbidden', 403, 'AGREEMENT_OWNERSHIP_MISMATCH'); } });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'join-error');
  assert.equal(state.join, null);
  assert.equal(calls.some(call => call[0] === 'version'), false);
});

test('15. invalid/expired invitation fails closed', async () => {
  const { controller } = setup({ invitation: async () => { throw new api.ApiError('http', 'invitation expired', 422, 'AGREEMENT_INVITATION_ERROR'); } });
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'invitation-error');
  assert.equal(controller.getSnapshot().invitation, null);
});

test('route: the invitation token lives only in a hash fragment and is parsed narrowly', () => {
  assert.equal(api.parseInvitationRoute('#/invitation/abc123'), 'abc123');
  assert.equal(api.parseInvitationRoute('#/invitation/' + encodeURIComponent('a/b c')), 'a/b c');
  assert.equal(api.parseInvitationRoute('#/demo/agreements'), null);
  assert.equal(api.parseInvitationRoute('#/invitation/'), null);
  assert.equal(api.parseInvitationRoute(''), null);
});

test('16. production path wires the real recipient/identity/session modules and cannot fall back to fixture state', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /(?:mockAgent|demoData|src\/App\.tsx)/.test(path)), false);
  for (const required of ['features/recipient/controller.ts', 'features/recipient/RecipientExperience.tsx', 'features/identity/controller.ts', 'api/securepay/session.ts']) {
    assert.equal(paths.some(path => path.endsWith(required)), true, `expected ${required} in the production bundle`);
  }
  const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(runtime, /parseInvitationRoute/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage/);
  // A same-tab hash change to a different invitation must remount a fresh controller, not reuse
  // one closed over the previous token (caught during browser acceptance walkthrough).
  assert.match(runtime, /key=\{invitationToken\}/);
});

test('recipient review renders unmodified against Bolt when no real notice is supplied, and never shows the demo caption when one is', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecipientReviewCard } from './src/components/RecipientReview';
const data = { type: 'RECIPIENT_REVIEW', inviterName: 'James', title: 'Bathroom retiling', role: 'Provider', labour: 'KES 68,000', materials: 'Customer supplies tiles, adhesive and grout', completion: 'By 20 October 2026', primaryLabel: 'Continue', primaryValue: 'continue_review', secondaryLabel: "Not me / I wasn't expecting this", secondaryValue: 'not_me' };
const noop = () => {};
export const fixtureMarkup = renderToStaticMarkup(React.createElement(RecipientReviewCard, { data, onChoice: noop }));
export const realMarkup = renderToStaticMarkup(React.createElement(RecipientReviewCard, { data, onChoice: noop, notice: 'Viewing this invitation is not acceptance and does not join the agreement.' }));`;
  const touched = /src\/components\/RecipientReview\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [] });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports;
  }
  const current = await render(false);
  const baseline = await render(true);
  assert.equal(current.fixtureMarkup, baseline.fixtureMarkup); // unchanged when the real notice is omitted
  assert.match(current.fixtureMarkup, /Demo SecureLink invitation/);
  assert.doesNotMatch(current.realMarkup, /Demo SecureLink invitation/);
  assert.match(current.realMarkup, /does not join the agreement/);
});
