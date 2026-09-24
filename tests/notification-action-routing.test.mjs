import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// KS001 Upgrade Phase 4 Care convergence (Section 1-3, 12, 38, 42) -- the closed actionKey routing
// contract: actionKey decides the notification's action, never agreementId's mere presence.
const bundle = await build({ stdin: { contents: `
export { actionFor } from './src/features/notifications/NotificationsExperience';
export { parseNotificationActionKey } from './src/api/securepay/notifications';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

const notification = (overrides = {}) => ({
  id: 'n1', category: 'AGREEMENTS', eventKey: 'k', priority: 'HIGH', title: 't', body: 'b',
  agreementId: null, bridgeId: null, actionKey: null, createdAt: '2026-01-01T00:00:00Z',
  readAt: null, resolvedAt: null, resolutionAction: null, version: 1, ...overrides,
});

test('Scenario A -- OPEN_INVITATIONS renders "Review invitation" and routes to the invitations area, never "Open Agreement", even with an agreementId present', () => {
  const calls = { agreement: [], invitations: 0 };
  const action = api.actionFor(
    notification({ actionKey: 'OPEN_INVITATIONS', agreementId: 'agr-1' }),
    id => calls.agreement.push(id),
    () => { calls.invitations += 1; },
  );
  assert.equal(action.label, 'Review invitation');
  action.run();
  assert.equal(calls.invitations, 1);
  assert.deepEqual(calls.agreement, []);
});

test('OPEN_AGREEMENT opens the workspace Agreement, using the real agreementId', () => {
  const calls = { agreement: [], invitations: 0 };
  const action = api.actionFor(
    notification({ actionKey: 'OPEN_AGREEMENT', agreementId: 'agr-2' }),
    id => calls.agreement.push(id),
    () => { calls.invitations += 1; },
  );
  assert.equal(action.label, 'Open Agreement');
  action.run();
  assert.deepEqual(calls.agreement, ['agr-2']);
  assert.equal(calls.invitations, 0);
});

test('REVIEW_AGREEMENT opens the existing confirmation/review path (same navigation as OPEN_AGREEMENT, distinct copy)', () => {
  const action = api.actionFor(notification({ actionKey: 'REVIEW_AGREEMENT', agreementId: 'agr-3' }), () => {}, () => {});
  assert.equal(action.label, 'Review Agreement');
});

test('Scenario J -- an unknown/unrecognized actionKey renders no button at all, never a guessed destination', () => {
  const action = api.actionFor(notification({ actionKey: 'DELETE_EVERYTHING', agreementId: 'agr-4' }), () => {}, () => {});
  assert.equal(action, null);
});

test('a null actionKey is purely informational -- no button', () => {
  const action = api.actionFor(notification({ actionKey: null, agreementId: 'agr-5' }), () => {}, () => {});
  assert.equal(action, null);
});

test('an Agreement-scoped actionKey with no agreementId never crashes and never guesses -- no button', () => {
  const openAgreement = api.actionFor(notification({ actionKey: 'OPEN_AGREEMENT', agreementId: null }), () => {}, () => {});
  const reviewAgreement = api.actionFor(notification({ actionKey: 'REVIEW_AGREEMENT', agreementId: null }), () => {}, () => {});
  assert.equal(openAgreement, null);
  assert.equal(reviewAgreement, null);
});

test('parseNotificationActionKey only ever returns the three closed values or null, never echoes an arbitrary string', () => {
  assert.equal(api.parseNotificationActionKey('OPEN_INVITATIONS'), 'OPEN_INVITATIONS');
  assert.equal(api.parseNotificationActionKey('OPEN_AGREEMENT'), 'OPEN_AGREEMENT');
  assert.equal(api.parseNotificationActionKey('REVIEW_AGREEMENT'), 'REVIEW_AGREEMENT');
  assert.equal(api.parseNotificationActionKey('anything-else'), null);
  assert.equal(api.parseNotificationActionKey(null), null);
  assert.equal(api.parseNotificationActionKey(''), null);
});
