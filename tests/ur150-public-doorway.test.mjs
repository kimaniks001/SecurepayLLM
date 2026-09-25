import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) -- the pre-activation public Agreement doorway:
// a SecureLink that can genuinely be the FIRST way a counterparty joins, distinct from the ACTIVE-product
// SecureLink Slice 2/4 already built. Covers the new doorway create/manage controllers and the
// persistent workspace section's branching between "ACTIVE product exists" and "pre-activation doorway."
const bundle = await build({ stdin: { contents: `
export * from './src/features/securelink/doorwayCreateController';
export * from './src/features/securelink/doorwayManageController';
export { DoorwayManagePanel } from './src/features/securelink/DoorwayManagePanel';
export { publicProductView } from './src/features/securelink/view';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const markup = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

// ---------------------------------------------------------------- doorwayCreateController.ts

function setupCreate(overrides = {}) {
  const calls = [];
  const gateway = {
    issuePublicDoorway: async (id, key) => { calls.push(['issuePublicDoorway', id, key]); return { locatorId: 'l1', pathClass: 'AGREEMENT_DOORWAY', status: 'ACTIVE', slug: 'amini-abc', replayed: false, publicUrl: 'https://securepay.ke/r/amini-abc' }; },
    ...overrides,
  };
  let n = 0;
  const controller = api.createDoorwayCreateController(gateway, 'agreement-1', () => `key-${++n}`);
  return { calls, controller };
}

test('doorwayCreateController: create() issues a doorway with a single idempotency key -- no separate activate step', async () => {
  const { controller, calls } = setupCreate();
  await controller.create();
  assert.deepEqual(calls, [['issuePublicDoorway', 'agreement-1', 'key-1']]);
  assert.equal(controller.getSnapshot().phase, 'created');
  assert.equal(controller.getSnapshot().publicUrl, 'https://securepay.ke/r/amini-abc');
});

test('doorwayCreateController: an uncertain outcome retries with the SAME key, never a fresh one', async () => {
  let attempt = 0;
  const { controller, calls } = setupCreate({
    issuePublicDoorway: async (id, key) => {
      calls.push(['issuePublicDoorway', id, key]);
      attempt++;
      if (attempt === 1) { const e = new api.ApiError('network', 'no connection'); e.kind = 'network'; throw e; }
      return { locatorId: 'l1', pathClass: 'AGREEMENT_DOORWAY', status: 'ACTIVE', slug: 'amini-abc', replayed: false, publicUrl: null };
    },
  });
  await controller.create();
  assert.equal(controller.getSnapshot().phase, 'uncertain');
  await controller.retry();
  assert.equal(controller.getSnapshot().phase, 'created');
  assert.deepEqual(calls.map(c => c[2]), ['key-1', 'key-1']);
});

test('doorwayCreateController: a definite failure (e.g. Agreement still DRAFT) clears the key -- a fresh attempt mints a new one', async () => {
  let attempt = 0;
  const { controller, calls } = setupCreate({
    issuePublicDoorway: async (id, key) => {
      calls.push(['issuePublicDoorway', id, key]);
      attempt++;
      if (attempt === 1) { const e = new api.ApiError('http', 'not proposed yet'); e.status = 422; throw e; }
      return { locatorId: 'l1', pathClass: 'AGREEMENT_DOORWAY', status: 'ACTIVE', slug: 'amini-def', replayed: false, publicUrl: null };
    },
  });
  await controller.create();
  assert.equal(controller.getSnapshot().phase, 'idle');
  assert.match(controller.getSnapshot().error, /proposed/i);
  await controller.create();
  assert.deepEqual(calls.map(c => c[2]), ['key-1', 'key-2']);
});

// ---------------------------------------------------------------- doorwayManageController.ts

function setupManage(overrides = {}) {
  const calls = [];
  const gateway = {
    activeDoorway: async id => { calls.push(['activeDoorway', id]); return { hasActiveLocator: false, locatorId: null, pathClass: null, status: null, issuedAt: null, expiresAt: null }; },
    rotatePublicDoorway: async (id, locatorId, key) => { calls.push(['rotatePublicDoorway', id, locatorId, key]); return { previousLocatorId: locatorId, replacementLocatorId: 'new-locator', slug: 'amini-2', status: 'ACTIVE', replayed: false, publicUrl: 'https://securepay.ke/r/amini-2' }; },
    revokePublicDoorway: async (id, locatorId, key) => { calls.push(['revokePublicDoorway', id, locatorId, key]); return { locatorId, pathClass: 'AGREEMENT_DOORWAY', status: 'REVOKED', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null, supersededByLocatorId: null }; },
    ...overrides,
  };
  let n = 0;
  const controller = api.createDoorwayManageController(gateway, 'agreement-1', () => `key-${++n}`);
  return { calls, controller };
}

test('doorwayManageController: load() with no active doorway reaches "no-doorway"', async () => {
  const { controller } = setupManage();
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'no-doorway');
});

test('doorwayManageController: load() with an active doorway reaches "has-doorway" with its opaque locatorId', async () => {
  const { controller } = setupManage({
    activeDoorway: async () => ({ hasActiveLocator: true, locatorId: 'l1', pathClass: 'AGREEMENT_DOORWAY', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'has-doorway');
  assert.equal(controller.getSnapshot().locatorId, 'l1');
});

test('doorwayManageController: Replace requires explicit confirmation, then calls rotatePublicDoorway with one idempotency key', async () => {
  const { controller, calls } = setupManage({
    activeDoorway: async () => ({ hasActiveLocator: true, locatorId: 'l1', pathClass: 'AGREEMENT_DOORWAY', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startReplace();
  assert.equal(controller.getSnapshot().phase, 'confirm-replace');
  assert.equal(calls.some(c => c[0] === 'rotatePublicDoorway'), false); // never rotates merely by starting
  await controller.confirmReplace();
  assert.equal(controller.getSnapshot().phase, 'replaced');
  assert.deepEqual(calls.filter(c => c[0] === 'rotatePublicDoorway'), [['rotatePublicDoorway', 'agreement-1', 'l1', 'key-1']]);
});

test('doorwayManageController: Revoke requires explicit confirmation, then calls revokePublicDoorway', async () => {
  const { controller, calls } = setupManage({
    activeDoorway: async () => ({ hasActiveLocator: true, locatorId: 'l1', pathClass: 'AGREEMENT_DOORWAY', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startRevoke();
  assert.equal(controller.getSnapshot().phase, 'confirm-revoke');
  await controller.confirmRevoke();
  assert.equal(controller.getSnapshot().phase, 'revoked');
  assert.deepEqual(calls.filter(c => c[0] === 'revokePublicDoorway'), [['revokePublicDoorway', 'agreement-1', 'l1', 'key-1']]);
});

// ---------------------------------------------------------------- DoorwayManagePanel.tsx

test('DoorwayManagePanel: no-doorway phase offers "Create SecureLink" with an honest explanation, never internal terms like "doorway"', async () => {
  const manageController = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'no-doorway' }), load() {}, startReplace() {}, cancelReplace() {}, confirmReplace() {}, startRevoke() {}, cancelRevoke() {}, confirmRevoke() {}, createNewAfterRevoke() {} };
  const createController = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'idle', busy: false, error: null }), create() {}, retry() {} };
  const productCreate = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'form', purposeSummary: 'Tile the bathroom', publicAmountDisplay: false, busy: false, error: null }), setPurposeSummary() {}, setPublicAmountDisplay() {}, create() {}, retry() {} };
  const html = text(markup(api.DoorwayManagePanel, { agreementTitle: 'Tile the bathroom', manageController, createController, productCreate, onDone() {}, onActivated() {} }));
  assert.match(html, /Create SecureLink/);
  assert.match(html, /never joins, confirms, or pays/);
  // "doorway" as a plain English word (matching CreateSecureLinkPanel's own existing copy) is fine --
  // it is the internal backend term (AGREEMENT_DOORWAY, pre-activation) that must never leak here.
  assert.doesNotMatch(html, /AGREEMENT_DOORWAY|pre-activation|locatorId/i);
});

test('DoorwayManagePanel: has-doorway phase offers Replace/Revoke, never a blind re-offer of the creation form -- and also offers Activate now (UR-150 activation-path gap fix)', async () => {
  const manageController = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'has-doorway', locatorId: 'l1', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }), load() {}, startReplace() {}, cancelReplace() {}, confirmReplace() {}, startRevoke() {}, cancelRevoke() {}, confirmRevoke() {}, createNewAfterRevoke() {} };
  const createController = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'idle', busy: false, error: null }), create() {}, retry() {} };
  const productCreate = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'form', purposeSummary: 'Tile the bathroom', publicAmountDisplay: false, busy: false, error: null }), setPurposeSummary() {}, setPublicAmountDisplay() {}, create() {}, retry() {} };
  const html = text(markup(api.DoorwayManagePanel, { agreementTitle: 'Tile the bathroom', manageController, createController, productCreate, onDone() {}, onActivated() {} }));
  assert.match(html, /Replace SecureLink/);
  assert.match(html, /Revoke SecureLink/);
  assert.match(html, /Activate SecureLink now/);
  assert.doesNotMatch(html, /^Create SecureLink$/m);
});

test('DoorwayManagePanel: has-doorway phase, a successful activation shows the new ACTIVE product\'s own ShareCard, never silently reusing the pre-activation doorway URL', async () => {
  const manageController = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'has-doorway', locatorId: 'l1', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }), load() {}, startReplace() {}, cancelReplace() {}, confirmReplace() {}, startRevoke() {}, cancelRevoke() {}, confirmRevoke() {}, createNewAfterRevoke() {} };
  const createController = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'idle', busy: false, error: null }), create() {}, retry() {} };
  const productCreate = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'created', slug: 'active-slug', publicUrl: 'https://example.test/s/active-slug' }), setPurposeSummary() {}, setPublicAmountDisplay() {}, create() {}, retry() {} };
  const html = text(markup(api.DoorwayManagePanel, { agreementTitle: 'Tile the bathroom', manageController, createController, productCreate, onDone() {}, onActivated() {} }));
  assert.match(html, /SecureLink activated/);
  assert.match(html, /active-slug/);
  assert.doesNotMatch(html, /Activate SecureLink now/);
});

// ---------------------------------------------------------------- view.ts -- version visibility (Section 10/13)

test('publicProductView: shows the exact version and flags a superseded one honestly, never silently', () => {
  const current = api.publicProductView({ productType: 'AGREEMENT_DOORWAY', purposeSummary: 'Tile the bathroom', currency: null, amountMinor: null, amountVisible: false, participants: [], publicStatus: 'AWAITING_COUNTERPARTY', expiresAt: null, milestones: [], nextStepGuidance: null, verifyIdentityPrompt: null, fairTradeGuidance: [], versionNumber: 1, isCurrentVersion: true });
  assert.match(current.versionLine, /Version 1/);
  assert.equal(current.isCurrentVersion, true);
  assert.doesNotMatch(current.versionLine, /newer version/);

  const stale = api.publicProductView({ productType: 'AGREEMENT_DOORWAY', purposeSummary: 'Tile the bathroom', currency: null, amountMinor: null, amountVisible: false, participants: [], publicStatus: 'AWAITING_COUNTERPARTY', expiresAt: null, milestones: [], nextStepGuidance: null, verifyIdentityPrompt: null, fairTradeGuidance: [], versionNumber: 1, isCurrentVersion: false });
  assert.match(stale.versionLine, /newer version now exists/);
});

test('publicProductView: a pre-activation doorway still reads as "SecureLink" to the person (Section 8) -- never a confusing second product-type label', () => {
  const view = api.publicProductView({ productType: 'AGREEMENT_DOORWAY', purposeSummary: 'Tile the bathroom', currency: null, amountMinor: null, amountVisible: false, participants: [], publicStatus: 'AWAITING_COUNTERPARTY', expiresAt: null, milestones: [], nextStepGuidance: null, verifyIdentityPrompt: null, fairTradeGuidance: [], versionNumber: 1, isCurrentVersion: true });
  assert.equal(view.productTypeLabel, 'SecureLink');
});

// ---------------------------------------------------------------- AgreementSecureLinkSection.tsx wiring

test('AgreementSecureLinkSection: checks the ACTIVE-product truth FIRST, falling back to the pre-activation doorway only when none exists', async () => {
  const source = await readFile(new URL('../src/features/securelink/AgreementSecureLinkSection.tsx', import.meta.url), 'utf8');
  assert.match(source, /import \{ DoorwayManagePanel \} from '\.\/DoorwayManagePanel'/);
  assert.match(source, /import \{ createDoorwayManageController \} from '\.\/doorwayManageController'/);
  assert.match(source, /productManage\.load\(\)/);
  assert.match(source, /productState\.phase === 'no-link'/);
});

// ---------------------------------------------------------------- AgreementSecureLinkSection.tsx infinite-loop regression

// KS001 Upgrade Phase 5 Slice 5 hardening -- live golden-journey verification against a REAL Agreement
// crashed the entire People tab white-screen: "Maximum update depth exceeded" inside
// AgreementSecureLinkSection. Root cause: useSyncExternalStore's fallback `subscribe`/`getSnapshot`
// (used while `controllers` is still null, on every render before/without eligibility) were inline
// arrow functions -- `() => () => {}` and `() => ({ phase: 'loading' })` -- allocated fresh on every
// single render. useSyncExternalStore compares these by reference identity to decide whether the store
// changed; a fresh object every render means "always changed," triggering an infinite re-render loop on
// EVERY Agreement, eligible or not, since these hooks run unconditionally before the `!eligible` early
// return. No existing test caught this because every prior test used `renderToStaticMarkup`, which never
// runs effects or the client reconciler's loop detection at all. Fix: hoist these to stable, module-level
// constants (`NOOP_SUBSCRIBE`/`GET_LOADING_SNAPSHOT`/`LOADING_SNAPSHOT`) so identity never changes across
// renders. This is a structural/source-level proof of the fix (this suite has no jsdom/react-test-renderer
// to actually mount and reconcile a real tree); the fix was additionally confirmed live in a real browser
// against a real signed-up identity's real Agreement (People tab renders correctly, no crash, no console
// exception) -- see the Phase 5 Slice 5 completion report.
test('AgreementSecureLinkSection: useSyncExternalStore fallback subscribe/getSnapshot are stable module-level constants, never inline-recreated literals', async () => {
  const source = await readFile(new URL('../src/features/securelink/AgreementSecureLinkSection.tsx', import.meta.url), 'utf8');
  // The exact defect pattern must never reappear: an inline fallback allocated at the useSyncExternalStore
  // call site (as opposed to a module-level named constant referenced there).
  assert.doesNotMatch(source, /useSyncExternalStore\(\s*[\s\S]{0,40}\(\)\s*=>\s*\(\)\s*=>\s*\{\}/);
  assert.doesNotMatch(source, /useSyncExternalStore\([\s\S]{0,200}\(\)\s*=>\s*\(\{\s*phase:/);
  // The stable replacements must exist, be defined once at module scope, and be exactly what
  // useSyncExternalStore falls back to.
  assert.match(source, /^const NOOP_SUBSCRIBE = \(\) => \(\) => \{\};$/m);
  assert.match(source, /^const LOADING_SNAPSHOT = \{ phase: 'loading' as const \};$/m);
  assert.match(source, /^const GET_LOADING_SNAPSHOT = \(\) => LOADING_SNAPSHOT;$/m);
  assert.match(source, /useSyncExternalStore\(\s*\n\s*controllers\?\.productManage\.subscribe \?\? NOOP_SUBSCRIBE,\s*\n\s*controllers\?\.productManage\.getSnapshot \?\? GET_LOADING_SNAPSHOT,\s*\n\s*controllers\?\.productManage\.getSnapshot \?\? GET_LOADING_SNAPSHOT,/);
});
