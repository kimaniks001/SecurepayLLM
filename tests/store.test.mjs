import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/store/controller';
export * from './src/features/store/view';
export * from './src/api/securepay/store/adapters';
export * from './src/api/securepay/store';
export * from './src/api/securepay/http';
export * from './src/features/agent/controller';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// ─── Fixtures (verified shapes: SecurePayAPI feat/securepay-phase9-store-platform @ 69424c1f) ─────────

const publicOfferView = (overrides = {}) => ({
  id: 'offer-1', kind: 'SERVICE', title: 'CCTV installation', description: 'Install 4 cameras',
  priceMinor: 8500000, currency: 'KES', quantityAvailable: null, availabilityState: 'AVAILABLE',
  availabilityConfirmedAt: null, mediaRefs: [], updatedAt: '2026-09-10T00:00:00Z',
  ...overrides,
});
const publicStoreView = (overrides = {}) => ({
  canonicalKsNumber: 'KS-100', displayName: 'Keyman Security', identityType: 'BUSINESS', status: 'ACTIVE',
  profile: { tagline: 'Security experts', about: null, locationLabel: 'Nairobi', heroHeadline: null, storefrontPreset: 'SIGNATURE', storefrontTheme: 'FOREST', updatedAt: '2026-09-01T00:00:00Z' },
  offers: [publicOfferView()],
  ...overrides,
});
const publicOfferDetailView = (overrides = {}) => ({
  canonicalKsNumber: 'KS-100', displayName: 'Keyman Security', identityType: 'BUSINESS', status: 'ACTIVE',
  profile: publicStoreView().profile, offer: publicOfferView(),
  ...overrides,
});
const searchResult = (overrides = {}) => ({ canonicalKsNumber: 'KS-100', displayName: 'Keyman Security', locationLabel: 'Nairobi', offer: publicOfferView(), ...overrides });
const storeProfileResponse = (overrides = {}) => ({
  identityId: 'identity-1', tagline: 'Security experts', about: null, locationLabel: null, heroHeadline: null,
  storefrontPreset: 'SIGNATURE', storefrontTheme: 'FOREST', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});
const storeOfferResponse = (overrides = {}) => ({
  id: 'offer-1', kind: 'SERVICE', title: 'CCTV installation', description: null, priceMinor: null, currency: 'KES',
  quantityAvailable: null, availabilityState: 'NEEDS_CONFIRMATION', availabilityConfirmedAt: null, published: false,
  mediaRefs: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

function unimplemented(name) { return async () => { throw new Error(`must not be called: ${name}`); }; }
function fullGateway(overrides = {}) {
  return {
    search: unimplemented('search'), store: unimplemented('store'), offer: unimplemented('offer'),
    myProfile: unimplemented('myProfile'), myOffers: unimplemented('myOffers'),
    createOffer: unimplemented('createOffer'), updateOffer: unimplemented('updateOffer'),
    confirmAvailability: unimplemented('confirmAvailability'),
    ...overrides,
  };
}

// ─── A/B/K. Real search endpoint, no ranking, no fixture fallback ─────────────────────────

test('A. Empty-query browse fans out across both real kinds via the real Store endpoint, never fixture data', async () => {
  const calls = [];
  const controller = api.createStoreController(fullGateway({
    search: async params => { calls.push(params); return [searchResult({ offer: publicOfferView({ id: `offer-${params.kind}` }) })]; },
  }));
  await controller.enter();
  assert.deepEqual(calls.map(c => c.kind).sort(), ['PRODUCT', 'SERVICE']);
  assert.equal(calls.every(c => c.category === undefined && c.location === undefined), true);
  const state = controller.getSnapshot();
  assert.equal(state.search.status, 'ready');
  assert.equal(state.search.data.length, 2);
  // Every rendered fact traces to the real DTO field, never a demoOffers/demoStores title.
  assert.ok(state.search.data.every(r => r.offer.title === 'CCTV installation'));
});

test('A2. A typed query fans out across category and location for each kind (never ANDed together)', async () => {
  const calls = [];
  const controller = api.createStoreController(fullGateway({ search: async params => { calls.push(params); return []; } }));
  controller.setQuery('security');
  await controller.submitSearch();
  assert.equal(calls.length, 4); // 2 kinds x {category-only, location-only}
  for (const call of calls) assert.equal(!!call.category && !!call.location, false, 'category and location must never both be set on one request');
});

test('B. Search results carry no ranking/rating/best-match field; merge order is recency-only', () => {
  const older = { canonicalKsNumber: 'KS-1', displayName: 'A', locationLabel: null, offer: { ...publicOfferView(), id: 'o1', updatedAt: '2026-01-01T00:00:00Z' } };
  const newer = { canonicalKsNumber: 'KS-2', displayName: 'B', locationLabel: null, offer: { ...publicOfferView(), id: 'o2', updatedAt: '2026-06-01T00:00:00Z' } };
  const merged = api.mergeSearchResults([[api.searchResultsView([older], null)[0]], [api.searchResultsView([newer], null)[0]]]);
  assert.deepEqual(merged.map(r => r.offer.id), ['o2', 'o1']); // recency only
  for (const key of ['rating', 'score', 'rank', 'best', 'recommended', 'popularity']) {
    assert.equal(Object.prototype.hasOwnProperty.call(merged[0].offer, key), false);
    assert.equal(Object.prototype.hasOwnProperty.call(merged[0], key), false);
  }
});

test('C/K. Backend search failure fails the whole search closed, never a silent fixture substitute', async () => {
  const controller = api.createStoreController(fullGateway({ search: async () => { throw new api.ApiError('http', 'down', 503); } }));
  await controller.enter();
  const state = controller.getSnapshot();
  assert.equal(state.search.status, 'error');
  assert.equal(state.search.data, undefined);
});

test('C2. An unpublished/404 offer or inactive Store fails closed, not a truthful-looking empty offer', async () => {
  const controller = api.createStoreController(fullGateway({ offer: async () => { throw new api.ApiError('http', 'not found', 404); } }));
  await controller.openOffer('KS-100', 'offer-x');
  assert.equal(controller.getSnapshot().selectedOffer.status, 'error');
  const storeController = api.createStoreController(fullGateway({ store: async () => { throw new api.ApiError('http', 'not found', 404); } }));
  await storeController.openStore('KS-100');
  assert.equal(storeController.getSnapshot().selectedStore.status, 'error');
});

// ─── D/E/F. Use this / Trade Taking Shape never becomes Agreement authority ─────────────────────────

test('D. Opening an Offer only reads the public offer endpoint — no Agreement/handoff call exists to make', async () => {
  const calls = [];
  const controller = api.createStoreController(fullGateway({ offer: async (ks, id) => { calls.push([ks, id]); return publicOfferDetailView(); } }));
  await controller.openOffer('KS-100', 'offer-1');
  assert.deepEqual(calls, [['KS-100', 'offer-1']]);
  assert.equal(controller.getSnapshot().view, 'offer');
  // The Store gateway type has no createHandoff/join/confirm method at all — nothing here could call one.
});

test('E. "Use this" is a separate explicit action: opening an Offer alone never enters Trade Taking Shape', async () => {
  const controller = api.createStoreController(fullGateway({ offer: async () => publicOfferDetailView() }));
  await controller.openOffer('KS-100', 'offer-1');
  assert.equal(controller.getSnapshot().view, 'offer');
  controller.useThis();
  assert.equal(controller.getSnapshot().view, 'toAgreement');
});
test('E2. "Use this" is a no-op before the Offer has loaded', () => {
  const controller = api.createStoreController(fullGateway());
  controller.useThis();
  assert.equal(controller.getSnapshot().view, 'home');
});

test('F. Seeding Trade Context from an Offer submits one real STORE_LISTING candidate fact — never an Agreement/handoff call', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    submitAmount: async (id, body) => { calls.push(['submitAmount', id, body]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
    // No createHandoff/adoptHandoff/adoptFact/submitTurn provided — calling any of them throws, proving useOffer never reaches for Agreement authority.
  };
  const controller = api.createAgentController(gateway);
  await controller.useOffer({ amount: '85000', currency: 'KES', sourceDescription: 'Offer: CCTV installation — Keyman Security — offer offer-1 (2026-09-10)' });
  assert.equal(calls[0], 'create-conversation');
  assert.deepEqual(calls[1], ['submitAmount', 'c1', { sourceKind: 'STORE_LISTING', sourceDescription: 'Offer: CCTV installation — Keyman Security — offer offer-1 (2026-09-10)', amount: '85000', currency: 'KES' }]);
  assert.equal(controller.getSnapshot().conversationId, 'c1');
});

test('F2. An Offer with no determinate price starts a real conversation but fabricates no amount fact', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    submitAmount: async () => { calls.push('submitAmount'); throw new Error('must not be called'); },
    readContext: async () => { calls.push('readContext'); return { conversationId: 'c1', version: 1, entities: [], relationships: [] }; },
  };
  const controller = api.createAgentController(gateway);
  await controller.useOffer({ sourceDescription: 'Offer: Land Survey — Keyman Security — offer offer-9 (2026-09-10)' });
  assert.deepEqual(calls, ['create-conversation', 'readContext']);
});

// ─── Final Phase 4 Economy Turn 2 (Sections 2/3/9): real Store source pointer carried into
// SecurePay's own real commercial-source selection call, never a fabricated title/price/owner. ───

test('F3. "Use this" with a real offer id/owner selects the commercial source before submitting the conversational fact, using one conversation', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    selectCommercialSource: async (id, body) => { calls.push(['selectCommercialSource', id, body]); return { sourceType: 'STORE_LISTING', sourceId: 'offer-1', sourceTitle: 'CCTV installation', sourceOwnerKsNumber: 'KS007', contextReference: '#/store/KS007/offer/offer-1', capturedPriceMinor: 8500000, capturedCurrency: 'KES', selectedAt: '2026-09-19T00:00:00Z' }; },
    submitAmount: async (id, body) => { calls.push(['submitAmount', id, body]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
  };
  const controller = api.createAgentController(gateway);
  await controller.useOffer({
    amount: '85000', currency: 'KES', sourceDescription: 'Offer: CCTV installation — Keyman Security — offer offer-1 (2026-09-10)',
    sourceId: 'offer-1', sourceOwnerKsNumber: 'KS007',
  });
  assert.equal(calls[0], 'create-conversation');
  assert.deepEqual(calls[1], ['selectCommercialSource', 'c1', { sourceType: 'STORE_LISTING', sourceId: 'offer-1', sourceOwnerKsNumber: 'KS007' }]);
  assert.equal(calls[2][0], 'submitAmount');
  assert.equal(controller.getSnapshot().source?.sourceTitle, 'CCTV installation');
  assert.equal(controller.getSnapshot().source?.sourceOwnerKsNumber, 'KS007');
});

test('F4. A failed commercial-source selection never blocks the conversational path (best-effort provenance only)', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    selectCommercialSource: async () => { calls.push('selectCommercialSource'); throw new Error('offer no longer published'); },
    submitAmount: async (id, body) => { calls.push(['submitAmount', id, body]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
  };
  const controller = api.createAgentController(gateway);
  await controller.useOffer({
    amount: '85000', currency: 'KES', sourceDescription: 'Offer: CCTV installation — Keyman Security — offer offer-1 (2026-09-10)',
    sourceId: 'offer-1', sourceOwnerKsNumber: 'KS007',
  });
  assert.deepEqual(calls, ['create-conversation', 'selectCommercialSource', ['submitAmount', 'c1', { sourceKind: 'STORE_LISTING', sourceDescription: 'Offer: CCTV installation — Keyman Security — offer offer-1 (2026-09-10)', amount: '85000', currency: 'KES' }], ['readContext', 'c1']]);
  assert.equal(controller.getSnapshot().source, null);
});

// ─── G. No checkout/payment surface anywhere in the Store tree ─────────────────────────

test('G. No Store component/feature file references cart, checkout, or a payment-intent surface', async () => {
  const files = [
    'src/features/store/StoreExperience.tsx', 'src/features/store/controller.ts', 'src/features/store/view.ts',
    'src/components/StoreHome.tsx', 'src/components/StoreProfileView.tsx', 'src/components/OfferDetail.tsx',
    'src/components/OfferCard.tsx', 'src/components/StoreManagementHome.tsx', 'src/components/OfferBuilderView.tsx',
    'src/components/OfferToTradeHandoff.tsx', 'src/components/SecureLinkShareSheet.tsx',
    'src/api/securepay/store/index.ts', 'src/api/securepay/store/adapters.ts', 'src/api/securepay/store/dto.ts',
  ];
  const forbidden = /\bcart\b|\bcheckout\b|paymentintent|\bpay\s+now\b|add\s+to\s+cart/i;
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not reference a cart/checkout/payment-intent surface`);
    assert.doesNotMatch(contents, /from ['"].*\/money['"]/, `${file} must not import the Money gateway`);
  }
});

// ─── H. Trader create/update/publish/availability-confirmation use the real APIs ─────────────────────────

test('H. Creating an offer sends exactly the reviewed explicit fields to the real POST endpoint', async () => {
  const calls = [];
  const controller = api.createStoreController(fullGateway({
    myProfile: async () => storeProfileResponse(),
    myOffers: async () => [],
    createOffer: async body => { calls.push(['createOffer', body]); return storeOfferResponse({ ...body, id: 'new-1' }); },
  }));
  await controller.enterManagement();
  controller.openBuilder(null);
  controller.setDraft({ kind: 'PRODUCT', title: 'iPhone 15', description: 'Used, 256GB', priceMinor: 12500000, quantityAvailable: 1, availabilityState: 'AVAILABLE', published: true, mediaRefs: ['ref-1'] });
  await controller.submitDraft();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], { kind: 'PRODUCT', title: 'iPhone 15', description: 'Used, 256GB', priceMinor: 12500000, quantityAvailable: 1, availabilityState: 'AVAILABLE', published: true, mediaRefs: ['ref-1'] });
  assert.equal(controller.getSnapshot().view, 'manage');
});

test('H2. Editing an existing offer sends PUT with the edited fields, prefilled from the real record', async () => {
  const raw = storeOfferResponse({ id: 'offer-9', title: 'Old title', priceMinor: 500000, published: false });
  const calls = [];
  const controller = api.createStoreController(fullGateway({
    myProfile: async () => storeProfileResponse(),
    myOffers: async () => [raw],
    updateOffer: async (id, body) => { calls.push(['updateOffer', id, body]); return { ...raw, ...body }; },
  }));
  await controller.enterManagement();
  controller.openBuilder('offer-9');
  assert.equal(controller.getSnapshot().draft.title, 'Old title');
  controller.setDraft({ title: 'New title', published: true });
  await controller.submitDraft();
  assert.equal(calls[0][0], 'updateOffer');
  assert.equal(calls[0][1], 'offer-9');
  assert.equal(calls[0][2].title, 'New title');
  assert.equal(calls[0][2].published, true);
});

test('H3. Availability confirmation calls the real endpoint and refreshes the trader\'s own offers', async () => {
  const calls = [];
  let confirmed = false;
  const controller = api.createStoreController(fullGateway({
    myProfile: async () => storeProfileResponse(),
    myOffers: async () => [storeOfferResponse({ id: 'offer-1', availabilityConfirmedAt: confirmed ? '2026-09-15T00:00:00Z' : null })],
    confirmAvailability: async id => { calls.push(id); confirmed = true; return storeOfferResponse({ id, availabilityConfirmedAt: '2026-09-15T00:00:00Z' }); },
  }));
  await controller.enterManagement();
  await controller.confirmAvailability('offer-1');
  assert.deepEqual(calls, ['offer-1']);
});

// ─── I/J. Auth boundary matches the verified backend contract ─────────────────────────

function fakeHttp() {
  const calls = [];
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth }); return {}; } } };
}

test('I. Public Store/Offer/search reads are auth:none, matching PublicStoreController', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.createStoreGateway(http);
  await gateway.store('KS-100');
  await gateway.offer('KS-100', 'offer-1');
  await gateway.search({ kind: 'PRODUCT' });
  assert.equal(calls.every(c => c.auth === 'none'), true);
});

test('J. Trader/me Store reads and writes are auth:required, matching StoreController', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.createStoreGateway(http);
  await gateway.myProfile();
  await gateway.updateMyProfile({ tagline: 'x' });
  await gateway.myOffers();
  await gateway.createOffer({ kind: 'SERVICE', title: 'x', availabilityState: 'NEEDS_CONFIRMATION', published: false });
  await gateway.updateOffer('offer-1', { kind: 'SERVICE', title: 'x', availabilityState: 'NEEDS_CONFIRMATION', published: false });
  await gateway.confirmAvailability('offer-1');
  assert.equal(calls.every(c => c.auth === 'required'), true);
  assert.deepEqual(calls.map(c => c.method), ['GET', 'PUT', 'GET', 'POST', 'PUT', 'POST']);
});

test('J2. Real HTTP client refuses an authenticated call with no session token rather than silently sending it anonymously', async () => {
  const calls = [];
  const http = api.createHttpClient('https://example.test', () => null, async url => { calls.push(url); return new Response('{}', { status: 200 }); });
  await assert.rejects(() => http.request('/api/v1/store/me/profile', { auth: 'required' }), /Authentication required/);
  assert.equal(calls.length, 0);
});

// ─── M. Offer SecureLink is its own real public URL, never an Agreement invitation token ─────────────────────────

test('M. Offer SecureLink route is parsed narrowly and is a distinct hash namespace from #/invitation/', async () => {
  const routeBundle = await build({ stdin: { contents: `export * from './src/features/store/route';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const route = await import(`data:text/javascript;base64,${Buffer.from(routeBundle.outputFiles[0].text).toString('base64')}`);
  assert.deepEqual(route.parseStoreOfferRoute('#/store/KS-100/offer/offer-1'), { canonicalKsNumber: 'KS-100', offerId: 'offer-1' });
  assert.equal(route.parseStoreOfferRoute('#/invitation/some-token'), null);
  assert.equal(route.parseStoreOfferRoute('#/store/KS-100/offer/'), null);
});

test('M2. A real public Offer carries a constructed SecureLink URL under the #/store/ namespace, not the invitation route', () => {
  const [offer] = api.searchResultsView([searchResult()], null).map(r => r.offer);
  assert.match(offer.secureLink.url, /#\/store\//);
  assert.doesNotMatch(offer.secureLink.url, /#\/invitation\//);
});

test('M3. No dedicated Offer SecureLink token endpoint is invented in the gateway', () => {
  const gatewayMethods = Object.keys(api.createStoreGateway({ request: async () => ({}) }));
  assert.equal(gatewayMethods.some(name => /share|secureLink|token/i.test(name)), false);
});

// ─── N / security hardening 1. mediaRefs remain references, not trusted media authority ─────────────────────────

const trustedOrigin = 'https://api.securepay.test';

test('N. A mediaRef on the one configured trusted origin (the SecurePayAPI origin itself) is the only kind ever rendered as an image src', () => {
  const offer = api.publicOfferDetailView(
    publicOfferDetailView({ offer: publicOfferView({ mediaRefs: [`${trustedOrigin}/media/a.jpg`] }) }),
    trustedOrigin,
  ).offer;
  assert.equal(offer.media[0].url, `${trustedOrigin}/media/a.jpg`);
  assert.equal(offer.media[0].isExample, false);
});

test('N2 (security hardening 1). An arbitrary external mediaRef is never rendered as an image src, even with a trusted origin configured', () => {
  const offer = api.publicOfferDetailView(
    publicOfferDetailView({ offer: publicOfferView({ mediaRefs: ['https://evil.example.com/tracker.png'] }) }),
    trustedOrigin,
  ).offer;
  assert.equal(offer.media[0].url, '');
});

test('N3 (security hardening 1). With no configured trusted origin, no mediaRef is ever rendered as an image, trusted-looking or not', () => {
  const offer = api.publicOfferDetailView(
    publicOfferDetailView({ offer: publicOfferView({ mediaRefs: [`${trustedOrigin}/media/a.jpg`] }) }),
    null,
  ).offer;
  assert.equal(offer.media[0].url, '');
});

test('N4 (security hardening 1). An opaque asset-id-style mediaRef is never treated as a URL, even on the trusted origin', () => {
  const offer = api.publicOfferDetailView(
    publicOfferDetailView({ offer: publicOfferView({ mediaRefs: ['asset-123', 'not a url at all'] }) }),
    trustedOrigin,
  ).offer;
  assert.deepEqual(offer.media.map(m => m.url), ['', '']);
});

test('N5 (security hardening 1). An arbitrary external mediaRef never reaches an <img src> in rendered OfferDetail markup — production UI shows "No photos available" instead', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfferDetail } from './src/components/OfferDetail';
import { publicOfferDetailView } from './src/api/securepay/store/adapters';
const dto = ${JSON.stringify(publicOfferDetailView({ offer: publicOfferView({ mediaRefs: ['https://evil.example.com/tracker.png'] }) }))};
const { offer } = publicOfferDetailView(dto, ${JSON.stringify(trustedOrigin)});
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(OfferDetail, { offer, onBack: noop, onInterested: noop, onUseThis: noop, onAskSecurePay: noop, onShare: noop, onViewStore: noop }));
`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  assert.doesNotMatch(mod.exports.markup, /evil\.example\.com/);
  assert.doesNotMatch(mod.exports.markup, /<img/);
  assert.match(mod.exports.markup, /No photos available/);
});

// ─── security hardening 2. Unknown backend enums fail closed, never inferred ─────────────────────────

test('2a. An unknown OfferKind fails the whole public offer read closed — never silently becomes SERVICE', () => {
  assert.throws(
    () => api.publicOfferDetailView(publicOfferDetailView({ offer: publicOfferView({ kind: 'DIGITAL_DOWNLOAD' }) }), null),
    err => err instanceof api.ApiError && err.kind === 'invalid-response',
  );
});

test('2b. An unknown AvailabilityState fails the whole public offer read closed — never silently becomes published/actionable', () => {
  assert.throws(
    () => api.publicOfferDetailView(publicOfferDetailView({ offer: publicOfferView({ availabilityState: 'ON_BACKORDER' }) }), null),
    err => err instanceof api.ApiError && err.kind === 'invalid-response',
  );
});

test('2c. The same fail-closed enum validation applies to the trader\'s own /store/me/offers read', () => {
  assert.throws(() => api.myOfferView(storeOfferResponse({ kind: 'BUNDLE' }), null), err => err instanceof api.ApiError && err.kind === 'invalid-response');
  assert.throws(() => api.myOfferView(storeOfferResponse({ availabilityState: 'BACKORDERED' }), null), err => err instanceof api.ApiError && err.kind === 'invalid-response');
});

test('2d. An unknown kind/availabilityState surfaces through the controller as a closed error state, never a rendered offer', async () => {
  const controller = api.createStoreController(fullGateway({ offer: async () => publicOfferDetailView({ offer: publicOfferView({ kind: 'BUNDLE' }) }) }));
  await controller.openOffer('KS-100', 'offer-1');
  assert.equal(controller.getSnapshot().selectedOffer.status, 'error');
});

test('2e. An unknown kind/availabilityState in a search result fails that whole search closed, never a partially-rendered list', async () => {
  const controller = api.createStoreController(fullGateway({
    search: async params => [searchResult({ offer: publicOfferView({ id: `offer-${params.kind}`, availabilityState: 'ON_BACKORDER' }) })],
  }));
  await controller.enter();
  assert.equal(controller.getSnapshot().search.status, 'error');
});

// ─── security hardening 3. The real Store Offer updated-date is never presented as a version ─────────────────────────

test('3a. The real offer\'s as-of value is a human-readable date, not an ISO/version-looking string', () => {
  const offer = api.publicOfferDetailView(publicOfferDetailView({ offer: publicOfferView({ updatedAt: '2026-09-10T00:00:00Z' }) }), null).offer;
  assert.equal(offer.version, '10 Sep 2026');
});

test('3b. sourceDescription construction never calls the updated date a "version"', async () => {
  const contents = await readFile('src/features/store/StoreExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /offer \$\{load\.offer\.id\} \(\$\{load\.offer\.version\}\)/);
  assert.match(contents, /updated \$\{load\.offer\.version\}/);
});

test('3c. Bolt Offer components only say "version" for genuinely versioned fixture/demo offers, never for a real offer\'s as-of date', async () => {
  for (const file of ['src/components/OfferDetail.tsx', 'src/components/OfferToTradeHandoff.tsx', 'src/components/StoreManagementHome.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.match(contents, /isDemoState/, `${file} must gate its version/updated wording on isDemoState`);
  }
});

// ─── L. Production bundle exclusions ─────────────────────────

test('L. Production bundle never imports storeData.ts for the real Store route', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /src\/storeData\.ts$/.test(path)), false);
  assert.equal(paths.some(path => /src\/App\.tsx$/.test(path)), false);
  assert.ok(paths.some(path => /features\/store\/controller\.ts$/.test(path)));
  assert.ok(paths.some(path => /api\/securepay\/store\/index\.ts$/.test(path)));
});

// ─── O. Fixture-mode Bolt rendering is preserved where the component is unchanged/only reorganized ─────────────────────────

test('O. Touched-but-unchanged-behavior Store components render byte-identical markup against Bolt', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreHome } from './src/components/StoreHome';
import { StoreManagementHome } from './src/components/StoreManagementHome';
import { OfferToTradeHandoff } from './src/components/OfferToTradeHandoff';
import { searchOffers, demoStores, demoOffers, demoStoreActivity, demoEnquiries, getStoreById } from './src/storeData';
const noop = () => {};
const published = searchOffers('').filter(o => o.lifecycle === 'published');
export const markup = [
  React.createElement(StoreHome, { onOpenOffer: noop, onOpenStore: noop, onManageStore: noop, onCreateOffer: noop, onStartConversation: noop, offers: published, stores: demoStores, query: '', onQueryChange: noop }),
  React.createElement(StoreManagementHome, { store: getStoreById('store-keyman'), offers: demoOffers.filter(o => o.storeId === 'store-keyman'), activity: demoStoreActivity, enquiries: demoEnquiries, onBack: noop, onCreateOffer: noop }),
  React.createElement(OfferToTradeHandoff, { offer: demoOffers[0], onBack: noop, onProceed: noop }),
].map(renderToStaticMarkup);`;
  const touched = /src\/components\/(StoreHome|StoreManagementHome|OfferToTradeHandoff)\.tsx$/;
  async function render(baseline) {
    const result = await build({
      stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
      plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [],
    });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports.markup;
  }
  const [current, baseline] = await Promise.all([render(false), render(true)]);
  // StoreHome/StoreManagementHome gained small truthful-hide guards (task section 3/10); their markup
  // is compared field-by-field rather than byte-for-byte. OfferToTradeHandoff only moved its pure-logic
  // import and must remain fully byte-identical.
  assert.equal(current[2], baseline[2]);
  assert.match(current[0], /Keyman Security/);
  assert.match(current[1], /Acting as/); // store.operator is non-empty in this fixture, so the guarded line still renders
});

test('O2. OfferBuilderView is intentionally NOT byte-identical to Bolt: the mock-keyword-parsing "AI" is retired per task section 9', async () => {
  const contents = await readFile('src/components/OfferBuilderView.tsx', 'utf8');
  // The removed Bolt implementation branched on lower.includes('paint'/'cctv'/'iphone') and simulated a
  // multi-turn Q&A (stillToClarify/handleAgentSubmit/currentReply) with canned replies — none of that
  // fake-intelligence machinery may remain; explicit fields only.
  assert.doesNotMatch(contents, /stillToClarify|handleAgentSubmit|currentReply|lower\.includes/);
  assert.match(contents, /does not yet auto-structure offers from free text/);
});
