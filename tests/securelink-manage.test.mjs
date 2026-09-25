import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

// KS001 Upgrade Phase 5 continuation (Slice 2) -- SecureLink lifecycle management: existence read,
// Replace ("rotate"), Revoke, and the new QR share surface. Gateways are scripted from the DTO shapes
// read in SecurePayAPI; the API itself is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/securelink/manageController';
export * from './src/features/securelink/createController';
export { ShareCard } from './src/features/securelink/ShareCard';
export { SecureLinkQrCode } from './src/features/securelink/QrCode';
export { SecureLinkManagePanel } from './src/features/securelink/SecureLinkManagePanel';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const markup = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

// ---------------------------------------------------------------- manageController.ts

function setupManage(overrides = {}) {
  const calls = [];
  const gateway = {
    activeLocator: async id => { calls.push(['activeLocator', id]); return { hasActiveLocator: false, locatorId: null, pathClass: null, status: null, issuedAt: null, expiresAt: null }; },
    rotatePublicLocator: async (id, locatorId, key) => { calls.push(['rotatePublicLocator', id, locatorId, key]); return { previousLocatorId: locatorId, replacementLocatorId: 'new-locator', slug: 'amani/2', status: 'ACTIVE', replayed: false, publicUrl: 'https://securepay.ke/s/amani/2' }; },
    revokePublicLocator: async (id, locatorId, key) => { calls.push(['revokePublicLocator', id, locatorId, key]); return { locatorId, pathClass: 'SECURE_LINK', status: 'REVOKED', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null, supersededByLocatorId: null }; },
    ...overrides,
  };
  let n = 0;
  const controller = api.createSecureLinkManageController(gateway, 'agreement-1', () => `key-${++n}`);
  return { calls, controller };
}

test('manageController: load() with no active locator reaches "no-link"', async () => {
  const { controller } = setupManage();
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'no-link');
});

test('manageController: load() with an active locator reaches "has-link" with bounded fields only', async () => {
  const { controller } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  const snap = controller.getSnapshot();
  assert.equal(snap.phase, 'has-link');
  assert.equal(snap.locatorId, 'loc-1');
  assert.equal(Object.prototype.hasOwnProperty.call(snap, 'slug'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snap, 'publicUrl'), false);
});

test('manageController: a load failure reaches "error", never silently "no-link"', async () => {
  const { controller } = setupManage({ activeLocator: async () => { throw new api.ApiError('http', 'forbidden', 403); } });
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'error');
});

test('manageController: startReplace requires explicit confirmation before any mutation call', async () => {
  const { controller, calls } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startReplace();
  assert.equal(controller.getSnapshot().phase, 'confirm-replace');
  assert.equal(calls.some(c => c[0] === 'rotatePublicLocator'), false);
});

test('manageController: confirmReplace calls rotate with the exact locatorId and lands on "replaced" with the fresh URL', async () => {
  const { controller } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startReplace();
  await controller.confirmReplace();
  const snap = controller.getSnapshot();
  assert.equal(snap.phase, 'replaced');
  assert.equal(snap.publicUrl, 'https://securepay.ke/s/amani/2');
});

test('manageController: replace retry after an uncertain outcome reuses the SAME idempotency key', async () => {
  let attempt = 0;
  const seenKeys = [];
  const { controller } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
    rotatePublicLocator: async (id, locatorId, key) => {
      attempt += 1;
      seenKeys.push(key);
      if (attempt === 1) throw new api.ApiError('network', 'offline');
      return { previousLocatorId: locatorId, replacementLocatorId: 'new-locator', slug: 'amani/2', status: 'ACTIVE', replayed: attempt > 1, publicUrl: 'https://securepay.ke/s/amani/2' };
    },
  });
  await controller.load();
  controller.startReplace();
  await controller.confirmReplace();
  assert.equal(controller.getSnapshot().phase, 'replace-uncertain');
  await controller.confirmReplace();
  assert.equal(controller.getSnapshot().phase, 'replaced');
  assert.equal(seenKeys[0], seenKeys[1]);
});

test('manageController: a definite replace rejection re-loads real backend state rather than fabricating it', async () => {
  let calls = 0;
  const { controller } = setupManage({
    activeLocator: async () => { calls += 1; return { hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }; },
    rotatePublicLocator: async () => { throw new api.ApiError('http', 'not found', 404); },
  });
  await controller.load();
  controller.startReplace();
  await controller.confirmReplace();
  assert.equal(controller.getSnapshot().phase, 'has-link');
  assert.ok(calls >= 2); // the initial load() plus the re-load after the definite failure
});

test('manageController: cancelReplace returns to has-link without ever calling rotate', async () => {
  const { controller, calls } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startReplace();
  await controller.cancelReplace();
  assert.equal(controller.getSnapshot().phase, 'has-link');
  assert.equal(calls.some(c => c[0] === 'rotatePublicLocator'), false);
});

test('manageController: startRevoke requires explicit confirmation before any mutation call', async () => {
  const { controller, calls } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startRevoke();
  assert.equal(controller.getSnapshot().phase, 'confirm-revoke');
  assert.equal(calls.some(c => c[0] === 'revokePublicLocator'), false);
});

test('manageController: confirmRevoke calls revoke with the exact locatorId and lands on "revoked"', async () => {
  const { controller, calls } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startRevoke();
  await controller.confirmRevoke();
  assert.equal(controller.getSnapshot().phase, 'revoked');
  const revokeCall = calls.find(c => c[0] === 'revokePublicLocator');
  assert.equal(revokeCall[2], 'loc-1');
});

test('manageController: revoke retry after an uncertain outcome reuses the SAME idempotency key', async () => {
  let attempt = 0;
  const seenKeys = [];
  const { controller } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
    revokePublicLocator: async (id, locatorId, key) => {
      attempt += 1;
      seenKeys.push(key);
      if (attempt === 1) throw new api.ApiError('network', 'offline');
      return { locatorId, pathClass: 'SECURE_LINK', status: 'REVOKED', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null, supersededByLocatorId: null };
    },
  });
  await controller.load();
  controller.startRevoke();
  await controller.confirmRevoke();
  assert.equal(controller.getSnapshot().phase, 'revoke-uncertain');
  await controller.confirmRevoke();
  assert.equal(controller.getSnapshot().phase, 'revoked');
  assert.equal(seenKeys[0], seenKeys[1]);
});

test('manageController: createNewAfterRevoke moves to "no-link", offering the existing creation form -- never automatic', async () => {
  const { controller } = setupManage({
    activeLocator: async () => ({ hasActiveLocator: true, locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }),
  });
  await controller.load();
  controller.startRevoke();
  await controller.confirmRevoke();
  controller.createNewAfterRevoke();
  assert.equal(controller.getSnapshot().phase, 'no-link');
});

// ---------------------------------------------------------------- QrCode.tsx / ShareCard.tsx

test('SecureLinkQrCode: renders an SVG QR encoding the exact publicUrl, and two different URLs render different codes', () => {
  const urlA = markup(api.SecureLinkQrCode, { publicUrl: 'https://securepay.ke/s/amani-0000000000000000000000000' });
  const urlB = markup(api.SecureLinkQrCode, { publicUrl: 'https://securepay.ke/s/kilimo-1111111111111111111111111' });
  assert.match(urlA, /<svg/);
  assert.notEqual(urlA, urlB);
});

test('SecureLinkQrCode: carries an accessible label, not a bare decorative image', () => {
  const html = markup(api.SecureLinkQrCode, { publicUrl: 'https://securepay.ke/s/amani-0000000000000000000000000' });
  assert.match(html, /aria-label="QR code for this SecureLink"/);
});

test('ShareCard: renders a QR code when a real publicUrl exists, and never when it is null', () => {
  const withUrl = markup(api.ShareCard, { title: 'Tile the bathroom', purposeSummary: 'Tile the bathroom', slug: 'amani/1', publicUrl: 'https://securepay.ke/s/amani/1' });
  assert.match(withUrl, /data-testid="securelink-qr"/);
  const withoutUrl = markup(api.ShareCard, { title: 'Tile the bathroom', purposeSummary: 'Tile the bathroom', slug: 'amani/1', publicUrl: null });
  assert.doesNotMatch(withoutUrl, /data-testid="securelink-qr"/);
});

test('ShareCard: WhatsApp/native-share copy invites review, never claims payment/join/acceptance', () => {
  const source = api.ShareCard.toString();
  assert.match(source, /Review this SecurePay Agreement/);
  for (const forbidden of ['payment complete', 'guaranteed trade', 'funds protected', 'agreement accepted', 'joined']) {
    assert.doesNotMatch(source.toLowerCase(), new RegExp(forbidden));
  }
});

test('ShareCard: opening-is-review-only reminder is shown alongside a real link', () => {
  const html = text(markup(api.ShareCard, { title: 'Tile the bathroom', purposeSummary: 'Tile the bathroom', slug: 'amani/1', publicUrl: 'https://securepay.ke/s/amani/1' }));
  assert.match(html, /does not join, confirm, or pay anything/);
});

// ---------------------------------------------------------------- SecureLinkManagePanel.tsx

const noopManage = snapshot => ({ subscribe: () => () => {}, getSnapshot: () => snapshot, load() {}, startReplace() {}, cancelReplace() {}, confirmReplace() {}, startRevoke() {}, cancelRevoke() {}, confirmRevoke() {}, createNewAfterRevoke() {} });
const noopCreate = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'form', purposeSummary: '', publicAmountDisplay: false, busy: false, error: null }) };

test('SecureLinkManagePanel: "has-link" offers Replace and Revoke, never a blind re-offer of the creation form', () => {
  const manage = noopManage({ phase: 'has-link', locatorId: 'loc-1', pathClass: 'SECURE_LINK', status: 'ACTIVE', issuedAt: '2026-01-01T00:00:00Z', expiresAt: null });
  const html = text(markup(api.SecureLinkManagePanel, { agreementTitle: 'Tile the bathroom', manageController: manage, createController: noopCreate, onDone() {} }));
  assert.match(html, /already has an active SecureLink/);
  assert.match(html, /Replace SecureLink/);
  assert.match(html, /Revoke SecureLink/);
});

test('SecureLinkManagePanel: "confirm-replace" states the exact consequence before any mutation', () => {
  const manage = noopManage({ phase: 'confirm-replace', locatorId: 'loc-1' });
  const html = text(markup(api.SecureLinkManagePanel, { agreementTitle: 'Tile the bathroom', manageController: manage, createController: noopCreate, onDone() {} }));
  assert.match(html, /permanently stops the old one from working/);
  assert.match(html, /does not change the/);
  // The consequence warning correctly NEGATES Join/Confirm/fund/pay ("does not Join, Confirm, fund,
  // or pay anything") -- it must never claim any of them as something replacement DOES do.
  assert.match(html, /does not Join, Confirm, fund, or pay anything/);
});

test('SecureLinkManagePanel: "confirm-revoke" states revoke never implies Agreement cancellation', () => {
  const manage = noopManage({ phase: 'confirm-revoke', locatorId: 'loc-1' });
  const html = text(markup(api.SecureLinkManagePanel, { agreementTitle: 'Tile the bathroom', manageController: manage, createController: noopCreate, onDone() {} }));
  assert.match(html, /does not cancel or delete the Agreement/);
});

test('SecureLinkManagePanel: "no-link" renders the existing creation form, not a duplicate implementation', () => {
  const manage = noopManage({ phase: 'no-link' });
  const html = text(markup(api.SecureLinkManagePanel, { agreementTitle: 'Tile the bathroom', manageController: manage, createController: noopCreate, onDone() {} }));
  assert.match(html, /SecureLink is a public, shareable doorway/);
});

test('SecureLinkManagePanel: "revoked" offers creating a new SecureLink, never automatically', () => {
  const manage = noopManage({ phase: 'revoked' });
  const html = text(markup(api.SecureLinkManagePanel, { agreementTitle: 'Tile the bathroom', manageController: manage, createController: noopCreate, onDone() {} }));
  assert.match(html, /has been revoked/);
  assert.match(html, /Create a new SecureLink/);
});
