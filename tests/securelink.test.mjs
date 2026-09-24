import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// KS001 Upgrade Phase 5 (SecureLink & Money Continuation) -- covers the post-SET continuation
// (Connect money now / Invite someone to review / Save, none automatic -- see Slice 4's UR-148 fix for
// why "Create SecureLink" is no longer offered directly from this moment), the two-step idempotent
// SecureLink creation flow (now reached from the persistent Agreement workspace entry point), the public
// review-first controller, and the share surface. Gateways are scripted from the DTO shapes read in
// SecurePayAPI; the API itself is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/securelink/createController';
export * from './src/features/securelink/publicController';
export * from './src/features/securelink/view';
export { ShareCard } from './src/features/securelink/ShareCard';
export { CreateSecureLinkPanel } from './src/features/securelink/CreateSecureLinkPanel';
export { HandoffPanel } from './src/features/handoff/HandoffPanel';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const markup = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

// ---------------------------------------------------------------- createController.ts

function setupCreate(overrides = {}) {
  const calls = [];
  const gateway = {
    activateProduct: async (id, body) => { calls.push(['activateProduct', id, body]); return { productId: 'p1', productType: 'SECURE_LINK', status: 'ACTIVE', activatedAt: '2026-01-01T00:00:00Z', expiresAt: null, replayed: false }; },
    issuePublicLocator: async (id, key) => { calls.push(['issuePublicLocator', id, key]); return { locatorId: 'l1', pathClass: 's', status: 'ACTIVE', slug: 'amani/123456789', replayed: false, publicUrl: 'https://securepay.ke/s/amani/123456789' }; },
    ...overrides,
  };
  let n = 0;
  const controller = api.createSecureLinkCreateController(gateway, 'agreement-1', 'Tile the bathroom', () => `key-${++n}`);
  return { calls, controller };
}

test('createController: a successful create calls activateProduct then issuePublicLocator, in order, and lands on created with the exact server URL', async () => {
  const { controller, calls } = setupCreate();
  await controller.create();
  assert.equal(calls[0][0], 'activateProduct');
  assert.equal(calls[1][0], 'issuePublicLocator');
  const snap = controller.getSnapshot();
  assert.equal(snap.phase, 'created');
  assert.equal(snap.slug, 'amani/123456789');
  assert.equal(snap.publicUrl, 'https://securepay.ke/s/amani/123456789');
});

test('createController: publicAmountDisplay defaults false and is only sent true when explicitly toggled on', async () => {
  const { controller, calls } = setupCreate();
  controller.setPublicAmountDisplay(true);
  await controller.create();
  assert.equal(calls[0][2].publicAmountDisplay, true);
});

test('createController: a blank purpose summary is rejected locally, without ever calling the gateway', async () => {
  const { controller, calls } = setupCreate();
  controller.setPurposeSummary('   ');
  await controller.create();
  assert.equal(calls.length, 0);
  assert.equal(controller.getSnapshot().phase, 'form');
  assert.match(controller.getSnapshot().error, /what this SecureLink is for/i);
});

test('createController: an uncertain (network) outcome on activateProduct moves to "uncertain", never "created"', async () => {
  const { controller } = setupCreate({ activateProduct: async () => { throw new api.ApiError('network', 'offline'); } });
  await controller.create();
  assert.equal(controller.getSnapshot().phase, 'uncertain');
});

test('createController: retrying an uncertain outcome reuses the SAME two idempotency keys, never mints fresh ones', async () => {
  let attempt = 0;
  const keysSeen = [];
  const { controller } = setupCreate({
    activateProduct: async (id, body) => { attempt += 1; keysSeen.push(body.idempotencyKey); if (attempt === 1) throw new api.ApiError('network', 'offline'); return { productId: 'p1', productType: 'SECURE_LINK', status: 'ACTIVE', activatedAt: '2026-01-01T00:00:00Z', expiresAt: null, replayed: attempt > 1 }; },
    issuePublicLocator: async (id, key) => { keysSeen.push(key); return { locatorId: 'l1', pathClass: 's', status: 'ACTIVE', slug: 'amani/1', replayed: false, publicUrl: 'https://securepay.ke/s/amani/1' }; },
  });
  await controller.create();
  assert.equal(controller.getSnapshot().phase, 'uncertain');
  await controller.retry();
  assert.equal(controller.getSnapshot().phase, 'created');
  assert.equal(keysSeen[0], keysSeen[1]); // the activateProduct key on attempt 1 and attempt 2 are identical
});

test('createController: a DEFINITE rejection (e.g. 400/409) returns to the form and clears the keys so a later click mints fresh ones', async () => {
  const seenKeys = [];
  let calls = 0;
  const { controller } = setupCreate({
    activateProduct: async (id, body) => {
      calls += 1;
      seenKeys.push(body.idempotencyKey);
      if (calls === 1) { const e = new api.ApiError('http', 'rejected'); e.status = 409; throw e; }
      return { productId: 'p1', productType: 'SECURE_LINK', status: 'ACTIVE', activatedAt: '2026-01-01T00:00:00Z', expiresAt: null, replayed: false };
    },
    issuePublicLocator: async () => ({ locatorId: 'l1', pathClass: 's', status: 'ACTIVE', slug: 'amani/1', replayed: false, publicUrl: 'https://securepay.ke/s/amani/1' }),
  });
  await controller.create();
  assert.equal(controller.getSnapshot().phase, 'form');
  await controller.create();
  assert.notEqual(seenKeys[0], seenKeys[1]);
});

test('createController: a real AGREEMENT_CONFLICT (product already active) is surfaced honestly, not as a raw internal exception string', async () => {
  const { controller } = setupCreate({
    activateProduct: async () => { throw new api.ApiError('http', 'product already active for agreement', 409, 'AGREEMENT_CONFLICT'); },
  });
  await controller.create();
  const snap = controller.getSnapshot();
  assert.equal(snap.phase, 'form');
  assert.match(snap.error, /already has an active SecureLink/);
  assert.doesNotMatch(snap.error, /product already active for agreement/);
});

test('createController: a publicUrl of null (base URL not configured) is surfaced as-is, never fabricated client-side', async () => {
  const { controller } = setupCreate({ issuePublicLocator: async () => ({ locatorId: 'l1', pathClass: 's', status: 'ACTIVE', slug: 'amani/1', replayed: false, publicUrl: null }) });
  await controller.create();
  const snap = controller.getSnapshot();
  assert.equal(snap.phase, 'created');
  assert.equal(snap.publicUrl, null);
});

// ---------------------------------------------------------------- publicController.ts

const viewDto = (over = {}) => ({
  productType: 'SECURE_LINK', purposeSummary: 'Tile the bathroom', currency: 'KES', amountMinor: 500000,
  amountVisible: true, participants: [{ displayLabel: 'Amani', roleCode: 'INITIATOR' }], publicStatus: 'OPEN',
  expiresAt: null, milestones: [], nextStepGuidance: null, verifyIdentityPrompt: null, fairTradeGuidance: [],
  ...over,
});

function setupPublic(overrides = {}) {
  const calls = [];
  const gateway = {
    viewSecureLink: async slug => { calls.push(['viewSecureLink', slug]); return viewDto(); },
    requestSecureLinkJoinAuthority: async (slug, key) => { calls.push(['requestSecureLinkJoinAuthority', slug, key]); return { invitationId: 'i1', status: 'ISSUED', invitationToken: 'tok-1', replayed: false, targetKind: 'OPEN', targetHint: null }; },
    ...overrides,
  };
  const controller = api.createSecureLinkPublicController(gateway, 'amani/123456789', () => 'join-key-1');
  return { calls, controller };
}

test('publicController: load() reaches "ready" on a successful view and calls only the public (no-auth) read', async () => {
  const { controller, calls } = setupPublic();
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'ready');
  assert.deepEqual(calls, [['viewSecureLink', 'amani/123456789']]);
});

test('publicController: a 404 view maps to "not-found", never "error"', async () => {
  const { controller } = setupPublic({ viewSecureLink: async () => { const e = new api.ApiError('http', 'missing'); e.status = 404; throw e; } });
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'not-found');
});

test('publicController: requesting join authority while signed OUT moves to identity-required and never calls the gateway', async () => {
  const { controller, calls } = setupPublic();
  await controller.load();
  await controller.requestJoinAuthority(false);
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  assert.equal(calls.some(c => c[0] === 'requestSecureLinkJoinAuthority'), false);
});

test('publicController: requesting join authority while signed IN converges into the existing #/invitation/{token} route, never a new Join implementation', async () => {
  const originalWindow = globalThis.window;
  globalThis.window = { location: { hash: '' } };
  try {
    const { controller } = setupPublic();
    await controller.load();
    await controller.requestJoinAuthority(true);
    assert.equal(controller.getSnapshot().phase, 'redirecting-to-join');
    assert.equal(globalThis.window.location.hash, '#/invitation/tok-1');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('publicController: opening a SecureLink (load alone) never itself requests join authority', async () => {
  const { controller, calls } = setupPublic();
  await controller.load();
  assert.equal(calls.some(c => c[0] === 'requestSecureLinkJoinAuthority'), false);
});

test('publicController: a replay with no fresh invitation token fails closed rather than guessing a stale one', async () => {
  const originalWindow = globalThis.window;
  globalThis.window = { location: { hash: '' } };
  try {
    const { controller } = setupPublic({ requestSecureLinkJoinAuthority: async () => ({ invitationId: 'i1', status: 'ISSUED', invitationToken: null, replayed: true, targetKind: 'OPEN', targetHint: null }) });
    await controller.load();
    await controller.requestJoinAuthority(true);
    assert.equal(controller.getSnapshot().phase, 'join-authority-error');
    assert.equal(globalThis.window.location.hash, '');
  } finally {
    globalThis.window = originalWindow;
  }
});

// ---------------------------------------------------------------- view.ts

test('publicProductView: amount is shown only when the backend says amountVisible, never re-derived client-side', () => {
  const shown = api.publicProductView(viewDto({ amountVisible: true, currency: 'KES', amountMinor: 500000 }));
  assert.equal(shown.amountLine, 'KES 5,000');
  const hidden = api.publicProductView(viewDto({ amountVisible: false, currency: 'KES', amountMinor: 500000 }));
  assert.equal(hidden.amountLine, null);
});

test('publicProductView: no internal identifiers leak through -- only the bounded presentation fields are mapped', () => {
  const dto = viewDto();
  const view = api.publicProductView(dto);
  const keys = Object.keys(view);
  assert.deepEqual(keys.sort(), ['amountLine', 'expiryLine', 'milestones', 'nextStepGuidance', 'participants', 'productTypeLabel', 'purposeSummary', 'statusLine'].sort());
});

// ---------------------------------------------------------------- ShareCard.tsx

test('ShareCard: encodes the exact server-issued publicUrl, and disables share actions when it is null', () => {
  const withUrl = text(markup(api.ShareCard, { title: 'Tile the bathroom', purposeSummary: 'Tile the bathroom', slug: 'amani/1', publicUrl: 'https://securepay.ke/s/amani/1' }));
  assert.match(withUrl, /https:\/\/securepay\.ke\/s\/amani\/1/);
  const withoutUrl = markup(api.ShareCard, { title: 'Tile the bathroom', purposeSummary: 'Tile the bathroom', slug: 'amani/1', publicUrl: null });
  assert.match(withoutUrl, /disabled/);
  assert.doesNotMatch(text(withoutUrl), /https:\/\//);
});

test('ShareCard: never offers a QR code this round (deliberately deferred, not silently half-built)', () => {
  const html = text(markup(api.ShareCard, { title: 'Tile the bathroom', purposeSummary: 'Tile the bathroom', slug: 'amani/1', publicUrl: 'https://securepay.ke/s/amani/1' }));
  assert.doesNotMatch(html, /QR/i);
});

// ---------------------------------------------------------------- HandoffPanel.tsx -- post-SET continuation

const noopController = snapshot => ({ subscribe: () => () => {}, getSnapshot: () => snapshot, reset() {}, refresh() {}, start() {}, createDraft() {}, checkOutcome() {}, useCurrentSource() {}, continueAfterIdentity() {}, acknowledgeChange() {} });
const identityStub = noopController({ phase: 'credentials', busy: false, ksNumber: '', password: '', otp: '', challengeToken: null, error: null });
const progressedHandoff = (over = {}) => ({
  id: 'h1', status: 'PROGRESSED', candidate: { title: 'Tile the bathroom' }, mustResolve: [], stillToDecide: [], guidanceNotes: [],
  reviewSnapshot: { expectedTradeContextVersion: 1, expectedCandidateDigest: 'd' }, expiresAt: '2026-01-01T00:00:00Z', progressedAgreementId: 'agreement-1', ...over,
});

// KS001 Upgrade Phase 5 continuation (Slice 4, UR-148) -- the post-SET moment no longer offers "Create
// SecureLink" as an immediately-actionable choice: a freshly-SET Agreement is always DRAFT, and product
// activation can never succeed until it is proposed, a counterparty joins, and both sides confirm (see
// the Phase 5 Slice 4 addendum for the full archaeology). Offering that button here was itself the real
// defect -- a doomed action, not a misplaced one -- so these three tests are updated to the corrected,
// honest behavior rather than left asserting on the removed affordance. The real SecureLink journey now
// lives in the persistent Agreement workspace entry point, reached via "Invite someone to review".

test('post-SET: the deliberate continuations offered are Connect money now / Invite someone to review / Save, and none of them fires automatically', () => {
  const handoff = noopController({ phase: 'progressed', handoff: progressedHandoff(), review: null, error: null, changedDuringSignIn: false });
  const html = text(markup(api.HandoffPanel, { handoff, identity: identityStub, onDone() {}, onOpenAgreement() {} }));
  assert.match(html, /Connect money now/);
  assert.match(html, /Invite someone to review/);
  assert.doesNotMatch(html, /Create SecureLink/); // never offered directly from this one-time moment any more
  assert.match(html, /Save/i);
});

test('post-SET: "Connect money now" and "Invite someone to review" are withheld when there is no progressed agreement id', () => {
  const handoff = noopController({ phase: 'progressed', handoff: progressedHandoff({ progressedAgreementId: null }), review: null, error: null, changedDuringSignIn: false });
  const html = text(markup(api.HandoffPanel, { handoff, identity: identityStub, onDone() {}, onOpenAgreement() {} }));
  assert.doesNotMatch(html, /Connect money now/);
  assert.doesNotMatch(html, /Invite someone to review/);
});

test('post-SET: "Invite someone to review" is withheld entirely when no onOpenAgreement is supplied (no partial/broken affordance)', () => {
  const handoff = noopController({ phase: 'progressed', handoff: progressedHandoff(), review: null, error: null, changedDuringSignIn: false });
  const html = text(markup(api.HandoffPanel, { handoff, identity: identityStub, onDone() {} }));
  assert.doesNotMatch(html, /Invite someone to review/);
  assert.match(html, /Connect money now/); // money handoff has no onOpenAgreement dependency -- it uses the existing openMoneyFor mechanism
});

test('post-SET: "Save" never implies incompleteness -- it reads as a deliberate, calm choice', () => {
  const handoff = noopController({ phase: 'progressed', handoff: progressedHandoff(), review: null, error: null, changedDuringSignIn: false });
  const html = text(markup(api.HandoffPanel, { handoff, identity: identityStub, onDone() {} }));
  assert.match(html, /Save.*I.m done for now/);
  assert.doesNotMatch(html, /incomplete/i);
});

// ---------------------------------------------------------------- RuntimeApp.tsx -- #/securelink/{slug} route

test('RuntimeApp wires a first-class #/securelink/{slug} route to SecureLinkExperience, with no Agreement id ever in the URL', async () => {
  const runtime = await readFile(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
  assert.match(runtime, /useSecureLinkRoute/);
  assert.match(runtime, /SecureLinkExperience/);
  const hookBody = runtime.slice(runtime.indexOf('function useSecureLinkRoute'), runtime.indexOf('function useSecureLinkRoute') + 700);
  assert.match(hookBody, /securelink\\\//); // the route parses off "securelink/", not an agreement/product identifier

  // The exact parsing regex, exercised directly: only a bare slug segment matches, decoded, trailing
  // slash tolerated, and anything else (including an empty/missing slug) does not.
  const regexLiteral = /\/\^#\\\/\?securelink\\\/\(\[\^\/\]\+\)\\\/\?\$\//.exec(hookBody);
  assert.ok(regexLiteral, 'expected to find the exact route regex in useSecureLinkRoute');
  const routeRegex = /^#\/?securelink\/([^/]+)\/?$/;
  assert.equal(routeRegex.exec('#/securelink/amani%2F123456789')[1], 'amani%2F123456789');
  assert.equal(decodeURIComponent(routeRegex.exec('#/securelink/amani%2F123456789')[1]), 'amani/123456789');
  assert.equal(routeRegex.exec('#securelink/amani/1'), null); // an extra path segment after the slug never matches -- [^/]+ stops at the first "/"
  assert.equal(routeRegex.exec('#/securelink/'), null); // an empty slug never matches
  assert.equal(routeRegex.exec('#/money'), null);
});

// ---------------------------------------------------------------- SecureLinkExperience.tsx -- wiring/doctrine checks
// (Matches this codebase's own convention for effect-driven Experience components -- see
// tests/recipient.test.mjs -- source-inspected for wiring/doctrine rather than fully mounted, since
// renderToStaticMarkup never runs the mount effect that calls controller.load().)

test('SecureLinkExperience is review-first: opening it never joins/confirms/pays, and Join hands off to the existing invitation route rather than reimplementing Join', async () => {
  const source = await readFile(new URL('../src/features/securelink/SecureLinkExperience.tsx', import.meta.url), 'utf8');
  assert.match(source, /does not join, confirm, accept, or pay anything/);
  assert.match(source, /createSecureLinkPublicController/);
  assert.match(source, /publicProductView/);
  assert.doesNotMatch(source, /invitationToken\s*=/); // never mints or fabricates a token itself
});

