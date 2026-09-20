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
export * from './src/features/recipient/view';
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

// Real backend shape for GET /api/v1/agreements/{id}/versions: List<AgreementVersionResponse>, the
// exact same record the single-version GET returns (id + authoritative versionStatus per entry) —
// never the lighter AgreementVersionSummaryResponse (versionId, no versionStatus) used elsewhere.
function setup(overrides = {}) {
  const calls = [];
  const gateway = {
    invitation: async token => { calls.push(['invitation', token]); return invitationDto(); },
    join: async (token, idempotencyKey) => { calls.push(['join', token, idempotencyKey]); return joinDto(); },
    versions: async agreementId => { calls.push(['versions', agreementId]); return [versionDto()]; },
    version: async (agreementId, versionId) => { calls.push(['version', agreementId, versionId]); return versionDto(); },
    confirmVersion: async (agreementId, versionId, body) => { calls.push(['confirmVersion', agreementId, versionId, body]); return confirmationDto(); },
    ...overrides,
  };
  let n = 0;
  return { calls, controller: api.createRecipientController(gateway, TOKEN, () => `key-${++n}`) };
}
// No gateway call in this suite may ever be made with an undefined/"undefined" identifier — the
// concrete regression the review flagged (recovery calling GET .../versions/undefined).
function assertNoUndefinedArgs(calls) {
  for (const call of calls) {
    for (const arg of call.slice(1)) {
      if (typeof arg === 'object' && arg !== null) continue;
      assert.notEqual(arg, undefined, `call ${JSON.stringify(call)} received an undefined argument`);
      assert.notEqual(arg, 'undefined', `call ${JSON.stringify(call)} received the literal string "undefined"`);
    }
  }
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
  await controller.join(); // outcome unknown
  assert.equal(controller.getSnapshot().phase, 'join-uncertain');
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
  assert.equal(controller.getSnapshot().phase, 'confirm-uncertain');
  await controller.confirm(); // deliberate retry, same explicit action
  const confirmCalls = calls.filter(call => call[0] === 'confirmVersion');
  assert.equal(confirmCalls.length, 2);
  assert.deepEqual(confirmCalls[0][3], confirmCalls[1][3]);
  assert.equal(controller.getSnapshot().phase, 'confirmed');
});

test('12A. genuine supersession: authoritative current version actually differs from the reviewed one', async () => {
  // Version-1 is CURRENT when joined/reviewed; it is only superseded by version-2 in the window
  // between that review and the explicit confirm click (the real race this recovery exists for).
  const reviewedEntry = versionDto({ id: 'version-1', versionNumber: 1, contentHash: 'hash-1', versionStatus: 'CURRENT' });
  const supersededEntry = { ...reviewedEntry, versionStatus: 'SUPERSEDED' };
  const currentEntry = versionDto({ id: 'version-2', versionNumber: 2, contentHash: 'hash-2', versionStatus: 'CURRENT', snapshot: { title: 'Bathroom retiling', purpose: 'Retile the bathroom, redo grout too', currency: 'KES', proposed_amount_minor: 7200000, version_number: 2 } });
  let supersededYet = false;
  const { controller, calls } = setup({
    confirmVersion: async (agreementId, versionId, body) => { calls.push(['confirmVersion', agreementId, versionId, body]); supersededYet = true; throw new api.ApiError('http', 'version superseded', 422, 'AGREEMENT_CONFIRMATION_ERROR'); },
    versions: async agreementId => { calls.push(['versions', agreementId]); return supersededYet ? [supersededEntry, currentEntry] : [reviewedEntry]; },
    version: async (agreementId, versionId) => { calls.push(['version', agreementId, versionId]); return versionId === 'version-2' ? currentEntry : reviewedEntry; },
  });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  assert.equal(controller.getSnapshot().version.id, 'version-1'); // reviewed version-1 while it was still CURRENT
  await controller.confirm();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'version-ready');
  assert.equal(state.changed, true);
  assert.equal(state.confirmation, null);
  assert.deepEqual(state.version, currentEntry);
  assert.equal(calls.filter(call => call[0] === 'confirmVersion').length, 1); // never auto-retried
  assert.equal(calls.filter(call => call[0] === 'versions').length, 1); // fresh authoritative lookup
  assert.deepEqual(calls.find(call => call[0] === 'version' && call[2] === 'version-2'), ['version', 'agreement-1', 'version-2']);
  assert.equal(state.confirmIdempotencyKey, null); // a new confirm click must mint a fresh key
  assertNoUndefinedArgs(calls);
});

test('12B. 422 with the same reviewed version still CURRENT is a real confirmation failure, not "this changed"', async () => {
  const { controller, calls } = setup({
    confirmVersion: async (agreementId, versionId, body) => { calls.push(['confirmVersion', agreementId, versionId, body]); throw new api.ApiError('http', 'cannot confirm for another participant', 422, 'AGREEMENT_CONFIRMATION_ERROR'); },
  });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  const reviewed = controller.getSnapshot().version;
  await controller.confirm();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'confirm-error');
  assert.equal(state.changed, false); // never told the person the Agreement changed
  assert.deepEqual(state.version, reviewed); // unchanged
  assert.match(state.error, /cannot confirm for another participant/);
  assert.equal(calls.filter(call => call[0] === 'confirmVersion').length, 1); // not auto-retried
  assert.ok(state.confirmIdempotencyKey); // same key kept for a deliberate retry of the same body
  // A deliberate retry against the same unchanged body reuses that key.
  const keyBeforeRetry = state.confirmIdempotencyKey;
  await controller.confirm();
  const confirmCalls = calls.filter(call => call[0] === 'confirmVersion');
  assert.equal(confirmCalls.length, 2);
  assert.equal(confirmCalls[1][3].idempotencyKey, keyBeforeRetry);
});

test('12C. 409 with the same reviewed version still CURRENT clears the key and never auto-retries', async () => {
  let attempt = 0;
  const { controller, calls } = setup({
    confirmVersion: async (agreementId, versionId, body) => {
      attempt++; calls.push(['confirmVersion', agreementId, versionId, body]);
      if (attempt === 1) throw new api.ApiError('http', 'idempotency key reused with different request', 409, 'AGREEMENT_CONFLICT');
      return confirmationDto();
    },
  });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  const reviewed = controller.getSnapshot().version;
  await controller.confirm();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'confirm-error');
  assert.equal(state.changed, false); // real conflict, not a version change
  assert.deepEqual(state.version, reviewed); // unchanged
  assert.match(state.error, /idempotency key reused/); // real backend message preserved
  assert.equal(calls.filter(call => call[0] === 'confirmVersion').length, 1); // never auto-retried
  // 2. the 409 key is cleared, unlike 12B's 422.
  assert.equal(state.confirmIdempotencyKey, null);
  const firstKey = calls.find(call => call[0] === 'confirmVersion')[3].idempotencyKey;
  // 3. the next explicit confirmation click mints a fresh key for this same still-current version.
  await controller.confirm();
  const confirmCalls = calls.filter(call => call[0] === 'confirmVersion');
  assert.equal(confirmCalls.length, 2);
  const secondKey = confirmCalls[1][3].idempotencyKey;
  assert.notEqual(secondKey, firstKey);
  assert.equal(controller.getSnapshot().phase, 'confirmed');
  assert.equal(controller.getSnapshot().confirmIdempotencyKey, secondKey);
});

test('12D. /versions is consumed with the exact backend shape (id, versionStatus) and recovery never calls .../versions/undefined', async () => {
  // A joined version that is already SUPERSEDED at join time exercises loadVersion's own recovery
  // path (not the confirm-failure path), against a raw literal shaped exactly like the real
  // AgreementVersionResponse record — id, not versionId; versionStatus, not an inferred number.
  const supersededAtJoin = { id: 'version-1', versionNumber: 1, snapshot: { title: 'x', purpose: 'y', currency: 'KES', proposed_amount_minor: 100, version_number: 1 }, contentHash: 'hash-1', parentVersionId: null, amendmentReason: null, materialChange: false, versionStatus: 'SUPERSEDED', createdAt: '2026-09-01T00:00:00Z' };
  const nowCurrent = { id: 'version-2', versionNumber: 2, snapshot: { title: 'x', purpose: 'y (amended)', currency: 'KES', proposed_amount_minor: 150, version_number: 2 }, contentHash: 'hash-2', parentVersionId: 'version-1', amendmentReason: 'scope change', materialChange: true, versionStatus: 'CURRENT', createdAt: '2026-09-10T00:00:00Z' };
  const { controller, calls } = setup({
    version: async (agreementId, versionId) => { calls.push(['version', agreementId, versionId]); return versionId === 'version-1' ? supersededAtJoin : nowCurrent; },
    versions: async agreementId => { calls.push(['versions', agreementId]); return [supersededAtJoin, nowCurrent]; },
  });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'version-ready');
  assert.equal(state.changed, true);
  assert.deepEqual(state.version, nowCurrent);
  assertNoUndefinedArgs(calls);
  assert.equal(calls.some(call => call[0] === 'version' && call[2] === 'version-2'), true);
});

test('12E. ambiguous/missing CURRENT authority fails closed instead of guessing', async () => {
  const { controller, calls } = setup({
    confirmVersion: async () => { throw new api.ApiError('http', 'version superseded', 422, 'AGREEMENT_CONFIRMATION_ERROR'); },
    versions: async agreementId => { calls.push(['versions', agreementId]); return []; }, // no CURRENT entry at all
  });
  await controller.load();
  controller.proceed(true);
  await controller.join();
  await controller.confirm();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'error');
  assert.equal(state.confirmation, null);
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
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
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

// Deep-review correction pass: RecipientReviewCard's old Bolt baseline hardcoded a construction/
// labour shape ("Labour"/"Materials"/"Complete" rows, always shown, fed by a real adapter that
// forced proposedAmountMinor into "labour" and invented materials: 'Not specified'). The public
// invitation contract makes no labour assumption at all -- it exists for service, product,
// contribution, project, and general commercial Agreements alike. This intentionally no longer
// asserts byte-identical markup against that labour-shaped Bolt baseline; it instead asserts the
// generalized real behaviour directly: role and expiry always shown, purpose/proposed amount shown
// only when the backend actually supplies them, and the demo-caption swap still works.
test('recipient review is generic (not labour-shaped) and never fabricates purpose or proposed amount', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecipientReviewCard } from './src/components/RecipientReview';
const withBoth = { type: 'RECIPIENT_REVIEW', inviterName: 'James', title: 'Bathroom retiling', role: 'Provider', purpose: 'Retile the bathroom', proposedAmount: 'KES 68,000.00', expiry: 'Invitation expires 20 October 2026', primaryLabel: 'Continue', primaryValue: 'continue_review', secondaryLabel: "Not me / I wasn't expecting this", secondaryValue: 'not_me' };
const withNeither = { ...withBoth, purpose: null, proposedAmount: null };
const noop = () => {};
export const bothMarkup = renderToStaticMarkup(React.createElement(RecipientReviewCard, { data: withBoth, onChoice: noop }));
export const neitherMarkup = renderToStaticMarkup(React.createElement(RecipientReviewCard, { data: withNeither, onChoice: noop }));
export const demoCaptionMarkup = renderToStaticMarkup(React.createElement(RecipientReviewCard, { data: withBoth, onChoice: noop }));
export const realCaptionMarkup = renderToStaticMarkup(React.createElement(RecipientReviewCard, { data: withBoth, onChoice: noop, notice: 'Viewing this invitation is not acceptance and does not join the agreement.' }));`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  const { bothMarkup, neitherMarkup, demoCaptionMarkup, realCaptionMarkup } = mod.exports;

  // The old labour-specific vocabulary must be gone entirely.
  assert.doesNotMatch(bothMarkup, /Labour|Materials|Complete:/);
  // Real facts, when supplied, are shown.
  assert.match(bothMarkup, /Purpose:/);
  assert.match(bothMarkup, /Proposed amount:/);
  assert.match(bothMarkup, /Invitation expires 20 October 2026/);
  // When the backend supplies neither, nothing is fabricated to fill the row -- it simply doesn't render.
  assert.doesNotMatch(neitherMarkup, /Purpose:/);
  assert.doesNotMatch(neitherMarkup, /Proposed amount:/);
  // Role and expiry are unconditional -- every invitation has these.
  assert.match(neitherMarkup, /Your role:/);
  assert.match(neitherMarkup, /Invitation expires/);
  // The card states its own authority boundary regardless of backend notice text.
  assert.match(bothMarkup, /does not join or accept anything yet/);
  // The demo/real notice-caption swap still works.
  assert.match(demoCaptionMarkup, /Demo SecureLink invitation/);
  assert.doesNotMatch(realCaptionMarkup, /Demo SecureLink invitation/);
  assert.match(realCaptionMarkup, /does not join the agreement/);
});

test('recipientReviewView never labels a proposed amount as labour, and never fabricates purpose/amount when the backend omits them', () => {
  const withAmount = api.recipientReviewView({
    publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile the bathroom', intendedRole: 'PROVIDER',
    currency: 'KES', proposedAmountMinor: 6800000, invitationExpiresAt: '2026-12-01T00:00:00Z', proposalVersionNumber: 1,
    notice: 'Viewing this invitation is not acceptance and does not join the agreement.',
  });
  assert.equal(withAmount.purpose, 'Retile the bathroom');
  assert.match(withAmount.proposedAmount, /KES/);
  assert.ok(!('labour' in withAmount));
  assert.ok(!('materials' in withAmount));

  const withoutAmount = api.recipientReviewView({
    publicReference: 'AGR-2', title: 'Used iPhone purchase', purpose: '', intendedRole: 'BUYER',
    currency: 'KES', proposedAmountMinor: null, invitationExpiresAt: '2026-12-01T00:00:00Z', proposalVersionNumber: 1,
    notice: 'Viewing this invitation is not acceptance and does not join the agreement.',
  });
  assert.equal(withoutAmount.purpose, null);
  assert.equal(withoutAmount.proposedAmount, null);
});
