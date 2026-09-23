import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
// UI Phase 2 -- Discovery, Finding & Commercial Sources. Contracts below are the ones read from SecurePayAPI
// (tool outputs, StoreService.searchPublishedOffers, DefaultCommercialSourceSelectionPort); the API is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/discovery/money';
export * from './src/features/discovery/result';
export * from './src/features/discovery/controller';
export * from './src/api/securepay/agent/discovery';
export * from './src/api/securepay/agent/adapters';
export * from './src/features/agent/controller';
export { ApiError } from './src/api/securepay/http';
export { ResultCard } from './src/features/discovery/ui/ResultCard';
export { OfferPhoto } from './src/features/discovery/ui/OfferPhoto';
export { FactCompare } from './src/features/discovery/ui/FactCompare';
export { PriceContext } from './src/features/discovery/ui/PriceContext';
export { FoundOnSecurePay } from './src/features/discovery/ui/FoundOnSecurePay';
export { SourceReference, SourceFailureNote } from './src/features/discovery/ui/SourceReference';
export { DiscoveryHost } from './src/features/discovery/ui/DiscoveryHost';
export { UnderstoodWorkbench } from './src/features/workbench/UnderstoodWorkbench';
export { projectWorkbench } from './src/features/workbench/projection';
export { StoreHome } from './src/components/StoreHome';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const { createRequire } = await import('node:module');
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const api = module.exports;
const html = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const storeOffer = (over = {}) => ({ id: 'o-1', kind: 'PRODUCT', title: 'Leather shoes', description: 'Black, sizes 40-44', priceMinor: 400000, currency: 'KES', quantityAvailable: 3, availabilityState: 'AVAILABLE', availabilityConfirmedAt: null, mediaRefs: [], updatedAt: '2026-09-18T10:00:00Z', ...over });
const searchRow = (over = {}, offer = {}) => ({ canonicalKsNumber: 'KS003', displayName: 'Wanjiru Traders', locationLabel: 'Westlands', offer: storeOffer(offer), ...over });

// ---------------------------------------------------------------- MONEY
test('money: minor units are formatted with integer arithmetic only (no float division)', () => {
  assert.equal(api.formatMinor(400000, 'KES'), 'KES 4,000');
  assert.equal(api.formatMinor(400050, 'KES'), 'KES 4,000.50');
  assert.equal(api.formatMinor(5, 'KES'), 'KES 0.05');
  assert.equal(api.formatMinor(9007199254740991, 'KES'), 'KES 90,071,992,547,409.91');   // MAX_SAFE_INTEGER: a float path would round
  assert.equal(api.formatMinor(null, 'KES'), null); assert.equal(api.formatMinor(-1, 'KES'), null); assert.equal(api.formatMinor(1.5, 'KES'), null);
  assert.equal(api.minorToDecimal(400000), '4000'); assert.equal(api.minorToDecimal(400050), '4000.5'); assert.equal(api.minorToDecimal(1999), '19.99');
});

// ---------------------------------------------------------------- AGENT DISCOVERY PAYLOADS (real contracts)
const providersData = () => ({ kind: 'PROVIDERS', supported: true, providerCount: 2, providers: [
  { providerRef: 'KS003', displayName: 'Njeri Painting Services', serviceArea: 'Westlands', matchingCapabilities: ['House painting'] },
  { providerRef: 'KS007', displayName: 'Kamau Hardware', serviceArea: 'Nyeri', matchingCapabilities: ['Roof repair'] }] });
test('providers: real mapping only; extra invented fields (rating, verified, score) never surface', () => {
  const dirty = providersData(); dirty.providers[0] = { ...dirty.providers[0], rating: 4.9, verified: true, score: 0.97, avatar: 'https://x/y.png' };
  const view = api.agentComponentView({ type: 'PROVIDER_RESULTS', data: dirty });
  assert.equal(view.type, 'DISCOVERY'); assert.equal(view.payload.kind, 'providers');
  assert.deepEqual(Object.keys(view.payload.providers[0]).sort(), ['displayName', 'matchingCapabilities', 'providerRef', 'serviceArea']);
  assert.equal(JSON.stringify(view.payload).match(/rating|verified|score|avatar/), null);
});
test('listings: real mapping; NO offer id or description exists on an Agent listing; malformed entries dropped and counted', () => {
  const data = { kind: 'STORE_LISTINGS', supported: true, listingCount: 3, listings: [
    { providerRef: 'KS003', displayName: 'Wanjiru Traders', title: 'Leather shoes', priceMinor: 400000, currency: 'KES', availabilityState: 'AVAILABLE' },
    { providerRef: 'KS004', displayName: 'Bata', title: 'Sandals', currency: 'KES', availabilityState: 'LOW_AVAILABILITY' },      // no price: allowed (null)
    { providerRef: 'KS005', displayName: 'Bad', title: 'Broken', priceMinor: 'free', currency: 'KES' }] };                          // unreadable price: dropped
  const view = api.agentComponentView({ type: 'PROVIDER_RESULTS', data });
  assert.equal(view.payload.listings.length, 2); assert.equal(view.payload.dropped, 1);
  assert.equal(view.payload.listings[1].priceMinor, null);
  const result = api.resultFromAgentListing(view.payload.listings[0], 0);
  assert.equal(result.offerId, null);                      // cannot be selected as a commercial source directly
  assert.equal(result.description, ''); assert.equal(result.mediaUrl, null); assert.equal(result.priceLabel, 'KES 4,000');
});
test('unsupported vs empty are different states, in the payload and on screen', () => {
  const unsupported = api.agentComponentView({ type: 'PROVIDER_RESULTS', data: { kind: 'STORE_LISTINGS', supported: false, listingCount: 0, listings: [] } });
  const empty = api.agentComponentView({ type: 'PROVIDER_RESULTS', data: { kind: 'STORE_LISTINGS', supported: true, listingCount: 0, listings: [] } });
  assert.equal(unsupported.payload.supported, false); assert.equal(empty.payload.supported, true);
  const a = html(api.FoundOnSecurePay, { views: [unsupported], onOpenStore() {} }); const b = html(api.FoundOnSecurePay, { views: [empty], onOpenStore() {} });
  assert.match(a, /can.t search Store listings right now/); assert.doesNotMatch(a, /found nothing/);
  assert.match(b, /found nothing matching that/); assert.doesNotMatch(b, /can.t search/);
});
test('malformed and unknown discovery payloads never throw; the Agent message survives; nothing is fabricated', () => {
  for (const c of [{ type: 'PROVIDER_RESULTS', data: { kind: 'PROVIDERS' } }, { type: 'PROVIDER_RESULTS', data: { kind: 'MYSTERY', supported: true } }, { type: 'PRICE_CONTEXT', data: { category: 'x' } }, { type: 'PROVIDER_PROFILE', data: { found: 'yes' } }, { type: 'PROVIDER_COMPARISON', data: { profiles: [] } }, { type: 'PROVIDER_RESULTS', data: null }]) assert.equal(api.agentComponentView(c), null);
  const response = api.agentResponseView({ protocolVersion: '1', message: 'I looked.', contextUpdates: [], components: [{ type: 'MESSAGE', data: { text: 'I looked.' } }, { type: 'PROVIDER_RESULTS', data: { kind: 'PROVIDERS' } }, { type: 'COMMUNITY_RESULT', data: { anything: 1 } }, { type: 'BRAND_NEW_TYPE', data: {} }], contextualPanel: null, suggestedActions: [] });
  assert.equal(response.message.text, 'I looked.'); assert.deepEqual(response.components.map(c => c.type), ['MESSAGE']);
});
test('profile + comparison: real fields only; comparison needs two real profiles and shows differences, not a winner', () => {
  const profile = (ref, name, area, services) => ({ providerRef: ref, displayName: name, found: true, serviceArea: area, about: '', services, products: [] });
  const s = (title, priceMinor) => ({ title, description: '', priceMinor, currency: 'KES', availabilityState: 'TAKING_WORK' });
  const one = api.agentComponentView({ type: 'PROVIDER_PROFILE', data: profile('KS003', 'Njeri Painting', 'Westlands', [s('House painting', 800000)]) });
  assert.equal(one.payload.kind, 'profile');
  const cmp = api.agentComponentView({ type: 'PROVIDER_COMPARISON', data: { profiles: [profile('KS003', 'Njeri Painting', 'Westlands', [s('House painting', 800000), s('Fence painting', 1500000)]), profile('KS007', 'Kamau Works', 'Nyeri', [s('House painting', 900000)])] } });
  assert.equal(cmp.payload.kind, 'comparison');
  const rows = api.profileRows(cmp.payload.profiles);
  assert.deepEqual(rows.find(r => r.label === 'Service prices').values, ['KES 8,000 – KES 15,000', 'KES 9,000']);
  const out = html(api.FoundOnSecurePay, { views: [cmp], onOpenStore() {} });
  assert.match(out, /Side by side/);
  assert.doesNotMatch(text(out), /winner|best|recommended|top choice|#1|rating|verified/i);
  assert.equal(api.agentComponentView({ type: 'PROVIDER_COMPARISON', data: { profiles: [profile('KS003', 'N', '', [])] } }), null);   // one profile is not a comparison
});

// ---------------------------------------------------------------- PRICE CONTEXT
const price = (over = {}) => ({ category: 'painting', location: 'Westlands', unit: 'listing', lowMinor: 800000, highMinor: 1500000, medianMinor: 1100000, currency: 'KES', sampleSize: 6, sourceType: 'LIVE_LISTINGS', asOf: '2026-09-20T08:00:00Z', ...over });
test('price context: exact amounts, sample size is the headline, thin data is said plainly, never "market price"', () => {
  const strong = html(api.PriceContext, { price: api.discoveryPayload({ type: 'PRICE_CONTEXT', data: price() }).price });
  assert.match(strong, /KES 8,000 – KES 15,000/); // both endpoints carry their currency
  assert.match(strong, /Based on 6 current SecurePay listings/); assert.match(strong, /Median KES 11,000/); assert.match(strong, /not a quote/);
  assert.match(strong, /Calculated 2026-09-20/);
  const thin = html(api.PriceContext, { price: api.discoveryPayload({ type: 'PRICE_CONTEXT', data: price({ sampleSize: 2, lowMinor: 800000, highMinor: 1000000 }) }).price });
  assert.match(thin, /Based on 2 current SecurePay listings/); assert.match(thin, /too few to treat as a range/); assert.doesNotMatch(thin, /Median/);
  const one = html(api.PriceContext, { price: api.discoveryPayload({ type: 'PRICE_CONTEXT', data: price({ sampleSize: 1, lowMinor: 800000, highMinor: 800000, medianMinor: 800000 }) }).price });
  assert.match(one, /Based on 1 current SecurePay listing\b/); assert.doesNotMatch(one, /Median/);
  for (const out of [strong, thin, one]) assert.doesNotMatch(text(out), /market price|average|typical|fair price|recommended/i);
  const none = html(api.PriceContext, { price: api.discoveryPayload({ type: 'PRICE_CONTEXT', data: price({ sampleSize: 0, lowMinor: null, highMinor: null, medianMinor: null, sourceType: 'NO_DATA', asOf: '1970-01-01T00:00:00Z', currency: '' }) }).price });
  assert.match(none, /no priced listings for this yet/); assert.doesNotMatch(none, /KES/);
});

// ---------------------------------------------------------------- STORE RESULTS
test('store results: real field mapping only; no image, rating, badge or discount is manufactured', () => {
  const [r] = api.resultsFromSearch([searchRow()], null);
  assert.deepEqual([r.offerId, r.ownerKs, r.ownerName, r.title, r.priceLabel, r.availabilityLabel, r.place, r.quantity, r.mediaUrl], ['o-1', 'KS003', 'Wanjiru Traders', 'Leather shoes', 'KES 4,000', 'Available', 'Westlands', 3, null]);
  const out = html(api.ResultCard, { offer: r, onOpen() {} });
  assert.match(out, /Leather shoes/); assert.match(out, /KES 4,000/); assert.match(out, /Wanjiru Traders/); assert.match(out, /Available/);
  assert.doesNotMatch(out, /<img/); assert.doesNotMatch(text(out), /★|star|rating|review|verified|discount|% off|best|recommended|top choice/i);
});
test('store results: media only from the one trusted origin; unpriced and closed offers are shown as they are', () => {
  const trusted = 'https://api.securepay.test';
  const [a, b] = api.resultsFromSearch([searchRow({}, { mediaRefs: [`${trusted}/m/1.jpg`] }), searchRow({}, { id: 'o-2', mediaRefs: ['https://evil.example/x.jpg'], priceMinor: null, availabilityState: 'FULLY_BOOKED' })], trusted);
  assert.equal(a.mediaUrl, `${trusted}/m/1.jpg`); assert.equal(b.mediaUrl, null);
  assert.equal(b.priceLabel, null); assert.equal(b.tone, 'closed'); assert.equal(api.isClosed(b), true);
  assert.match(html(api.ResultCard, { offer: b, onOpen() {} }), /No price listed/);
});
test('store results: malformed payload fails closed with a readable error, not a half result', () => {
  assert.throws(() => api.resultsFromSearch([{ canonicalKsNumber: 'KS003', displayName: 'X', offer: { id: 1 } }], null), /unreadable/);
  assert.throws(() => api.resultsFromSearch('nope', null), /unreadable/);
  assert.throws(() => api.resultsFromStore({ canonicalKsNumber: 'KS003' }, null), /unreadable/);
});
test('compare: facts side by side, differences only; a fact that is the same for all is labelled "same"; no winner language', () => {
  const offers = api.resultsFromSearch([searchRow(), searchRow({ canonicalKsNumber: 'KS004', displayName: 'Bata' }, { id: 'o-2', title: 'Sandals', priceMinor: 250000, availabilityState: 'LOW_AVAILABILITY' })], null);
  const rows = api.compareRows(offers);
  assert.deepEqual(rows.find(r => r.label === 'Listed price').values, ['KES 4,000', 'KES 2,500']);
  const out = html(api.FactCompare, { heads: offers.map(o => o.title), rows });
  assert.match(out, /Listed price/); assert.match(out, /same/); assert.doesNotMatch(text(out), /winner|best|recommended|top choice|cheapest/i); assert.doesNotMatch(out, /<table/i);
});
test('one result language: the standalone Store home renders the SAME ResultCard (no OfferCard, no image slot)', async () => {
  assert.equal((await readdir('src/components')).includes('OfferCard.tsx'), false);
  const offer = { id: 'o-1', storeId: 'KS003', storeName: 'Wanjiru Traders', title: 'Leather shoes', description: '', offerType: 'product', priceType: 'fixed', price: 'KES 4,000', currency: 'KES', scope: { included: [], excluded: [] }, media: [], serviceArea: 'Westlands', availability: 'Available', conditions: [], documents: [], milestoneSeeds: [], obligationSeeds: [], customizationAllowed: true, secureLink: {}, lifecycle: 'published', version: '', isExternalReference: false };
  const out = html(api.StoreHome, { onOpenOffer() {}, onOpenStore() {}, onManageStore() {}, onCreateOffer() {}, onStartConversation() {}, offers: [offer], stores: [], query: '', onQueryChange() {}, searchStatus: 'ready' });
  assert.match(out, /Leather shoes/); assert.match(out, /Wanjiru Traders/); assert.doesNotMatch(out, /<img/); assert.doesNotMatch(out, /SecureLink|View offer/);
  const empty = html(api.StoreHome, { onOpenOffer() {}, onOpenStore() {}, onManageStore() {}, onCreateOffer() {}, onStartConversation() {}, offers: [], stores: [], query: 'shoes', onQueryChange() {}, searchStatus: 'ready' });
  assert.match(empty, /Nothing matching “shoes” is published on SecurePay yet/); assert.doesNotMatch(empty, /0 results/i);
});

// ---------------------------------------------------------------- DISCOVERY CONTROLLER
const fakeStore = (over = {}) => { const calls = []; return { calls, gateway: {
  search: async params => { calls.push(['search', params]); return [searchRow(), searchRow({ canonicalKsNumber: 'KS004', displayName: 'Bata' }, { id: 'o-2', title: 'Sandals', priceMinor: 250000 })]; },
  store: async ks => { calls.push(['store', ks]); return { canonicalKsNumber: ks, displayName: 'Wanjiru Traders', identityType: 'INDIVIDUAL', status: 'ACTIVE', profile: { tagline: null, about: 'Shoes and bags', locationLabel: 'Westlands' }, offers: [storeOffer(), storeOffer({ id: 'o-9', title: 'Handbag' })] }; },
  ...over } }; };
const fakeAgentGateway = (over = {}) => { const calls = []; return { calls, gateway: {
  createConversation: async () => ({ conversationId: 'c' }), submitTurn: async () => ({}), readContext: async () => ({ conversationId: 'c', version: 1, entities: [], relationships: [] }),
  adoptFact: async () => ({}), submitAmount: async (id, body) => { calls.push(['amount', body]); return {}; },
  selectCommercialSource: async (id, body) => { calls.push(['select', body]); return { sourceType: 'STORE_LISTING', sourceId: body.sourceId, sourceTitle: 'Leather shoes', sourceOwnerKsNumber: body.sourceOwnerKsNumber, contextReference: '#', capturedPriceMinor: 400000, capturedCurrency: 'KES', selectedAt: 't' }; },
  ...over } }; };
const rig = (storeOver, agentOver) => { const s = fakeStore(storeOver); const a = fakeAgentGateway(agentOver); const agent = api.createAgentController(a.gateway, (() => { let n = 0; return () => `id-${++n}`; })()); return { s, a, agent, d: api.createDiscoveryController(s.gateway, agent, null) }; };

test('discovery search uses ONLY the real Store search parameters: kind, category (words), location, limit<=10', async () => {
  const { s, d } = rig();
  await d.search({ kind: 'PRODUCT', what: ' shoes ', place: ' Westlands ' });
  assert.deepEqual(s.calls[0], ['search', { kind: 'PRODUCT', category: 'shoes', location: 'Westlands', limit: 10 }]);
  assert.equal(d.getSnapshot().phase, 'results'); assert.equal(d.getSnapshot().results.length, 2);
  await d.search({ kind: 'SERVICE', what: '', place: 'Nairobi' });
  assert.deepEqual(s.calls[1][1], { kind: 'SERVICE', category: undefined, location: 'Nairobi', limit: 10 });
  for (const call of s.calls) assert.deepEqual(Object.keys(call[1]).filter(k => !['kind', 'category', 'location', 'limit'].includes(k)), []); // no size/colour/budget/brand/rating/distance
});
test('empty is its own state; failure preserves the query and Retry repeats exactly it; a stale response is ignored', async () => {
  const empty = rig({ search: async () => [] });
  await empty.d.search({ kind: 'PRODUCT', what: 'unicorn', place: '' });
  assert.equal(empty.d.getSnapshot().phase, 'empty');
  let fail = true;
  const flaky = rig({ search: async () => { if (fail) throw new api.ApiError('network', 'down'); return [searchRow()]; } });
  await flaky.d.search({ kind: 'PRODUCT', what: 'shoes', place: 'Westlands' });
  const f = flaky.d.getSnapshot(); assert.equal(f.phase, 'failed'); assert.deepEqual(f.query, { kind: 'PRODUCT', what: 'shoes', place: 'Westlands' }); assert.match(f.error, /unavailable/i);
  fail = false; await flaky.d.retry();
  assert.equal(flaky.d.getSnapshot().phase, 'results');
  let release; const slow = rig({ search: params => new Promise(r => { release = () => r([searchRow({}, { title: params.category })]); }) });
  const first = slow.d.search({ kind: 'PRODUCT', what: 'old', place: '' }); const firstRelease = release;
  const second = slow.d.search({ kind: 'PRODUCT', what: 'new', place: '' }); release();
  await second; firstRelease(); await first;
  assert.equal(slow.d.getSnapshot().results[0].title, 'new');
});
test('an Agent listing has no offer id: opening its seller loads the REAL Store (with offer ids); an unreadable Store fails calmly', async () => {
  const { s, d } = rig();
  await d.openStore('KS003', 'Wanjiru Traders');
  assert.deepEqual(s.calls[0], ['store', 'KS003']); const st = d.getSnapshot();
  assert.equal(st.phase, 'store'); assert.ok(st.store.offers.every(o => o.offerId));
  const bad = rig({ store: async () => ({ canonicalKsNumber: 'KS003' }) });
  await bad.d.openStore('KS003', 'X'); assert.equal(bad.d.getSnapshot().phase, 'failed');
});
test('compare selection is capped, needs two, and never reorders results', async () => {
  const { d } = rig(); await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' });
  const keys = d.getSnapshot().results.map(r => r.key);
  d.toggleCompare(keys[0]); d.openCompare(); assert.equal(d.getSnapshot().phase, 'results');           // one is not a comparison
  d.toggleCompare(keys[1]); d.openCompare();
  assert.equal(d.getSnapshot().phase, 'comparing'); assert.deepEqual(d.getSnapshot().offers.map(o => o.key), keys);
  d.back(); assert.equal(d.getSnapshot().phase, 'results'); assert.equal(d.getSnapshot().compare.length, 2);
  assert.equal(api.MAX_COMPARE, 3);
});

// ---------------------------------------------------------------- USE THIS = REAL COMMERCIAL SOURCE SELECTION
test('Use this: selects the REAL Store offer (STORE_LISTING, real id + owner KS) then returns to the conversation; never buys/joins/confirms', async () => {
  const { a, agent, d } = rig();
  await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' });
  d.openDetail(d.getSnapshot().results[0]);
  const result = await d.use(d.getSnapshot().offer);
  assert.equal(result, 'selected'); assert.equal(d.getSnapshot().phase, 'closed');
  assert.deepEqual(a.calls.find(c => c[0] === 'select')[1], { sourceType: 'STORE_LISTING', sourceId: 'o-1', sourceOwnerKsNumber: 'KS003' });
  const amount = a.calls.find(c => c[0] === 'amount')[1];                 // source-derived fact becomes a CANDIDATE only
  assert.equal(amount.amount, '4000'); assert.equal(amount.currency, 'KES'); assert.equal(amount.sourceKind, 'STORE_LISTING');
  const snap = agent.getSnapshot(); assert.equal(snap.source.sourceId, 'o-1'); assert.equal(snap.offerSelectionFailure, null);
  assert.equal(a.calls.some(c => /handoff|agreement|join|confirm|fund|release/i.test(c[0])), false);
});
test('Use this: an unpriced offer submits no amount; a listing without an offer id can never be used', async () => {
  const { a, d } = rig({ search: async () => [searchRow({}, { priceMinor: null })] });
  await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); d.openDetail(d.getSnapshot().results[0]);
  await d.use(d.getSnapshot().offer);
  assert.equal(a.calls.some(c => c[0] === 'amount'), false); assert.ok(a.calls.some(c => c[0] === 'select'));
  const agentListing = api.resultFromAgentListing({ providerRef: 'KS003', displayName: 'X', title: 'T', priceMinor: 1, currency: 'KES', availabilityState: 'AVAILABLE' }, 0);
  assert.equal(await d.use(agentListing), 'unavailable');
});
test('Source failure: calm recoverable state; nothing from the offer is submitted; Retry works; Continue without is an explicit choice', async () => {
  let failing = true;
  const { a, agent, d } = rig({}, { selectCommercialSource: async (id, body) => { a.calls.push(['select', body]); if (failing) throw new api.ApiError('network', 'down'); return { sourceType: 'STORE_LISTING', sourceId: body.sourceId, sourceTitle: 'Leather shoes', sourceOwnerKsNumber: 'KS003', contextReference: '#', capturedPriceMinor: 400000, capturedCurrency: 'KES', selectedAt: 't' }; } });
  await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); d.openDetail(d.getSnapshot().results[0]);
  assert.equal(await d.use(d.getSnapshot().offer), 'failed');
  const s = d.getSnapshot(); assert.equal(s.phase, 'source-failed'); assert.equal(s.offer.offerId, 'o-1');
  assert.equal(a.calls.some(c => c[0] === 'amount'), false);           // never silently continues as DIRECT with source-derived facts
  assert.equal(agent.getSnapshot().source, null);
  failing = false; assert.equal(await d.retrySource(), 'selected');
  assert.equal(agent.getSnapshot().source.sourceId, 'o-1');
  const other = rig({}, { selectCommercialSource: async () => { throw new api.ApiError('network', 'down'); } });
  await other.d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); other.d.openDetail(other.d.getSnapshot().results[0]);
  await other.d.use(other.d.getSnapshot().offer); await other.d.continueWithoutSource();
  assert.equal(other.d.getSnapshot().phase, 'closed'); assert.equal(other.agent.getSnapshot().source, null); assert.equal(other.agent.getSnapshot().offerSelectionFailure, null);
});
// ---- explicit useOffer() outcome: no inference from stale/existing state ----------------------------------------
const offerFact = (over = {}) => ({ amount: '4000', currency: 'KES', sourceDescription: 'Offer: Leather shoes', sourceId: 'o-1', sourceOwnerKsNumber: 'KS003', ...over });
const gate = () => { let open; const promise = new Promise(r => { open = r; }); return { promise, open }; };
test('useOffer returns an explicit typed outcome: fresh success carries the real source and what became of the amount', async () => {
  const { a, agent } = rig();
  const result = await agent.useOffer(offerFact());
  assert.equal(result.status, 'selected'); assert.equal(result.source.sourceId, 'o-1'); assert.equal(result.amount, 'submitted');
  assert.deepEqual(a.calls.map(c => c[0]), ['select', 'amount']);                    // the amount is submitted only AFTER the source is selected
  const unpriced = rig(); const r2 = await unpriced.agent.useOffer(offerFact({ amount: undefined, currency: undefined }));
  assert.equal(r2.status, 'selected'); assert.equal(r2.amount, 'none');
  const noPointer = rig(); assert.equal((await noPointer.agent.useOffer(offerFact({ sourceId: undefined }))).status, 'no-source'); assert.equal(noPointer.a.calls.some(c => c[0] === 'select'), false);
});
test('useOffer failure: explicit "failed" with the reason; NOTHING derived from the offer is submitted; the failure is held for Retry / Continue without', async () => {
  const { a, agent } = rig({}, { selectCommercialSource: async () => { throw new api.ApiError('network', 'down'); } });
  const result = await agent.useOffer(offerFact());
  assert.equal(result.status, 'failed'); assert.match(result.error, /couldn.t reach the Store/);
  assert.equal(a.calls.some(c => c[0] === 'amount'), false); assert.equal(agent.getSnapshot().source, null);
  assert.equal(agent.getSnapshot().offerSelectionFailure.fact.sourceId, 'o-1');
});
test('useOffer retry: explicit outcome again; success then submits the candidate amount; a retry with nothing to retry says so', async () => {
  let failing = true;
  const { a, agent } = rig({}, { selectCommercialSource: async (id, body) => { a.calls.push(['select', body]); if (failing) throw new api.ApiError('network', 'down'); return { sourceType: 'STORE_LISTING', sourceId: body.sourceId, sourceTitle: 'Leather shoes', sourceOwnerKsNumber: 'KS003', contextReference: '#', capturedPriceMinor: 400000, capturedCurrency: 'KES', selectedAt: 't' }; } });
  assert.equal((await agent.retryOfferSelection()).status, 'no-source');            // nothing failed yet
  assert.equal((await agent.useOffer(offerFact())).status, 'failed');
  assert.equal((await agent.retryOfferSelection()).status, 'failed'); assert.equal(a.calls.some(c => c[0] === 'amount'), false);
  failing = false;
  const ok = await agent.retryOfferSelection();
  assert.equal(ok.status, 'selected'); assert.equal(ok.amount, 'submitted'); assert.equal(agent.getSnapshot().offerSelectionFailure, null);
});
test('useOffer while the Agent is busy: explicit "busy", nothing selected, nothing submitted', async () => {
  const hold = gate();
  const { a, agent } = rig({}, { submitTurn: async () => { await hold.promise; return { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; } });
  const turn = agent.send('hello');                                                  // the Agent is now working
  await new Promise(r => setTimeout(r, 0));
  assert.equal(agent.getSnapshot().busy, true);
  assert.deepEqual(await agent.useOffer(offerFact()), { status: 'busy' });
  assert.deepEqual(await agent.retryOfferSelection(), { status: 'busy' });
  assert.equal(await agent.continueOfferWithoutSource(), 'busy');
  assert.equal(a.calls.some(c => c[0] === 'select' || c[0] === 'amount'), false);
  hold.open(); await turn;
});
test('an ALREADY-selected same source + a busy Agent is never mistaken for a fresh success (the discovery layer trusts the result, not state)', async () => {
  const hold = gate(); let hold2 = false;
  const { a, agent, d } = rig({}, { submitTurn: async () => { if (hold2) await hold.promise; return { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; } });
  await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); d.openDetail(d.getSnapshot().results[0]);
  assert.equal(await d.use(d.getSnapshot().offer), 'selected');                        // o-1 really selected once
  assert.equal(agent.getSnapshot().source.sourceId, 'o-1');
  const selects = a.calls.filter(c => c[0] === 'select').length; const amounts = a.calls.filter(c => c[0] === 'amount').length;
  hold2 = true; const turn = agent.send('another message'); await new Promise(r => setTimeout(r, 0));
  d.open(); await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); d.openDetail(d.getSnapshot().results[0]);
  assert.equal(await d.use(d.getSnapshot().offer), 'busy');                            // same source is still in state, yet this attempt did nothing
  assert.equal(d.getSnapshot().phase, 'detail');
  assert.equal(a.calls.filter(c => c[0] === 'select').length, selects); assert.equal(a.calls.filter(c => c[0] === 'amount').length, amounts);
  hold.open(); await turn;
});
test('discovery reacts to the explicit result: selected closes, failed shows the reason, retry re-asks, continue-without is explicit and only closes when it really happened', async () => {
  let failing = true;
  const { a, agent, d } = rig({}, { selectCommercialSource: async (id, body) => { a.calls.push(['select', body]); if (failing) throw new api.ApiError('network', 'down'); return { sourceType: 'STORE_LISTING', sourceId: body.sourceId, sourceTitle: 'Leather shoes', sourceOwnerKsNumber: 'KS003', contextReference: '#', capturedPriceMinor: 400000, capturedCurrency: 'KES', selectedAt: 't' }; } });
  await d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); d.openDetail(d.getSnapshot().results[0]);
  assert.equal(await d.use(d.getSnapshot().offer), 'failed');
  assert.match(d.getSnapshot().error, /couldn.t reach the Store/); assert.equal(a.calls.some(c => c[0] === 'amount'), false);
  failing = false; assert.equal(await d.retrySource(), 'selected'); assert.equal(d.getSnapshot().phase, 'closed');
  assert.equal(a.calls.filter(c => c[0] === 'amount').length, 1);
  const other = rig({}, { selectCommercialSource: async () => { throw new api.ApiError('network', 'down'); } });
  await other.d.search({ kind: 'PRODUCT', what: 'shoes', place: '' }); other.d.openDetail(other.d.getSnapshot().results[0]);
  await other.d.use(other.d.getSnapshot().offer); await other.d.continueWithoutSource();
  assert.equal(other.d.getSnapshot().phase, 'closed'); assert.equal(other.agent.getSnapshot().source, null);
});

// ---------------------------------------------------------------- SOURCE REFERENCE / CHANGED / UNAVAILABLE
test('SourceReference: provenance not endorsement; CHANGED shows "Selected earlier" vs "Current listing"; UNAVAILABLE is calm', () => {
  const base = { sourceType: 'STORE_LISTING', title: 'Leather shoes', ownerKs: 'KS003', capturedPriceMinor: 400000, capturedCurrency: 'KES' };
  // Phase 3: an absent sourceType is never assumed to be the Store.
  assert.doesNotMatch(html(api.SourceReference, { source: { ...base, sourceType: undefined } }), /SecurePay Store/);
  const fresh = html(api.SourceReference, { source: base });
  assert.match(fresh, /Started from/); assert.match(fresh, /SecurePay Store · Leather shoes/); assert.match(fresh, /Listed at KES 4,000 when chosen/); assert.doesNotMatch(fresh, /recommended|trusted|verified/i);
  const changed = html(api.SourceReference, { source: { ...base, status: 'CHANGED', current: { priceMinor: 450000, currency: 'KES', availability: 'LOW_AVAILABILITY' }, capturedAvailability: 'AVAILABLE' } });
  assert.match(changed, /has changed since you chose it/); assert.match(changed, /Selected earlier/); assert.match(changed, /KES 4,000/); assert.match(changed, /Current listing/); assert.match(changed, /KES 4,500/);
  assert.match(html(api.SourceReference, { source: { ...base, status: 'UNAVAILABLE' } }), /isn.t available any more/);
  const current = html(api.SourceReference, { source: { ...base, status: 'CURRENT' } });
  assert.doesNotMatch(current, /changed|isn.t available/);
});
test('Source failure note: explains the consequence plainly and offers both real actions', () => {
  const out = html(api.SourceFailureNote, { busy: false, error: 'SecurePay is unavailable.', onRetry() {}, onContinueWithout() {} });
  assert.match(out, /couldn.t link this listing/); assert.match(out, /Try again/); assert.match(out, /Continue without this listing/); assert.match(out, /won.t be attributed to this listing/);
});
test('the handoff review card surfaces the backend source status with Selected earlier / Current listing (frontend never reconciles)', async () => {
  const src = await readFile('src/components/CanonicalAgreement.tsx', 'utf8');
  assert.match(src, /SourceReference/); assert.match(src, /current/);
});

// ---------------------------------------------------------------- WORKBENCH ENTRY POINTS
const ctx = (entities, relationships = []) => api.tradeContextView({ conversationId: 'c', version: 1, entities, relationships });
const ent = (id, type, name, state = 'CONFIRMED', attributes = {}) => ({ id, type, name, state, confidence: 1, attributes });
const stateWith = (data, source = null) => ({ conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data, error: null }, source, offerSelectionFailure: null });
// KS001 Upgrade Phase 1, Section 14 -- "See on SecurePay" is no longer shown merely because an ITEM/SERVICE
// row exists; it appears only once the backend's own real discoveryInvited=true marker is present (the
// person explicitly confirmed they want help finding it). Discovery remains a supporting capability, never
// the default next step for an ordinary row.
test('UNDERSTOOD: an ordinary ITEM/SERVICE row never shows "See on SecurePay" until discovery is explicitly invited', () => {
  const wb = api.projectWorkbench(ctx([ent('a', 'ITEM', 'shoes'), ent('b', 'SERVICE', 'House painting'), ent('c', 'CONCEPT', 'value')]));
  assert.deepEqual(wb.items.filter(i => i.section === 'what').map(i => i.find), [undefined, undefined]);
  const out = html(api.UnderstoodWorkbench, { state: stateWith(ctx([ent('a', 'ITEM', 'shoes')])), controller: {}, activeSpec: null, onOpen() {}, onFind() {} });
  assert.doesNotMatch(out, /See on SecurePay/);
  assert.equal(api.projectWorkbench(ctx([ent('n', 'CONCEPT', 'thing')])).items.some(i => i.find), false);
});
test('UNDERSTOOD: "See on SecurePay" appears (kind from the entity, never guessed) once discoveryInvited=true is recorded', () => {
  const wb = api.projectWorkbench(ctx([
    ent('a', 'ITEM', 'shoes', 'CANDIDATE', { discoveryInvited: 'true' }),
    ent('b', 'SERVICE', 'House painting', 'CANDIDATE', { discoveryInvited: 'true' }),
  ]));
  assert.deepEqual(wb.items.filter(i => i.section === 'what').map(i => i.find), [{ kind: 'PRODUCT', what: 'shoes' }, { kind: 'SERVICE', what: 'House painting' }]);
  const out = html(api.UnderstoodWorkbench, {
    state: stateWith(ctx([ent('a', 'ITEM', 'shoes', 'CANDIDATE', { discoveryInvited: 'true' })])),
    controller: {}, activeSpec: null, onOpen() {}, onFind() {},
  });
  assert.match(out, /aria-label="See shoes on SecurePay"/); assert.match(out, /See on SecurePay/);
});
test('UNDERSTOOD: discoveryInvited is never shown as an ordinary descriptive detail', () => {
  const wb = api.projectWorkbench(ctx([ent('a', 'ITEM', 'shoes', 'CANDIDATE', { discoveryInvited: 'true', size: '42' })]));
  const row = wb.items.find(i => i.section === 'what');
  assert.deepEqual(row.details, ['Size: 42']);
});
test('UNDERSTOOD shows the selected source as provenance ("Started from"), distinct from what SecurePay found', () => {
  const source = { sourceType: 'STORE_LISTING', sourceId: 'o-1', sourceTitle: 'Leather shoes', sourceOwnerKsNumber: 'KS003', contextReference: '#', capturedPriceMinor: 400000, capturedCurrency: 'KES', selectedAt: 't' };
  const out = html(api.UnderstoodWorkbench, { state: stateWith(ctx([]), source), controller: {}, activeSpec: null, onOpen() {}, onFind() {} });
  assert.match(out, /Started from/); assert.match(out, /SecurePay Store · Leather shoes/); assert.match(out, /KS003/); assert.match(out, /Listed at KES 4,000/);
});

// ---------------------------------------------------------------- DISCOVERY SURFACE (rendered)
const renderHost = state => {
  const controller = { subscribe: () => () => {}, getSnapshot: () => state, setQuery() {}, search() {}, close() {}, back() {}, editSearch() {}, openDetail() {}, toggleCompare() {}, openCompare() {}, use() {}, retry() {}, openStore() {}, retrySource() {}, continueWithoutSource() {} };
  return html(api.DiscoveryHost, { controller, panelSlot: null, contextDetails: [], onBackToConversation() {}, onAddPerson() {} });
};
const offerA = () => api.resultsFromSearch([searchRow()], null)[0];
const offerB = () => api.resultsFromSearch([searchRow({ canonicalKsNumber: 'KS004', displayName: 'Bata' }, { id: 'o-2', title: 'Sandals', priceMinor: 250000, availabilityState: 'FULLY_BOOKED' })], null)[0];
test('discovery surface renders each state as a real sheet (no desktop slot in SSR): form, empty, failed, results, detail, comparing, source failure', () => {
  const q = { kind: 'PRODUCT', what: 'black size 42 shoes', place: 'Westlands' };
  const form = renderHost({ phase: 'form', query: q });
  assert.match(form, /role="dialog"/); assert.match(form, /Something to buy/); assert.match(form, /Someone to do a job/); assert.match(form, /title or description/); assert.match(form, /isn’t a map or a distance/);
  assert.match(form, /Add them by name instead/);                                   // the two WHO paths are told apart
  const empty = renderHost({ phase: 'empty', query: q });
  assert.match(text(empty), /Nothing matching “black size 42 shoes” in Westlands is published on SecurePay yet/);
  for (const word of ['black', 'size', '42', 'shoes']) assert.match(empty, new RegExp(`>${word}<`));   // one-word retries the person chooses
  assert.match(text(empty), /Change the search/); assert.match(text(empty), /add them by name/); assert.match(text(empty), /Keep talking with KS001/);
  assert.doesNotMatch(text(empty), /0 results|No results/i);
  const failed = renderHost({ phase: 'failed', query: q, error: 'SecurePay is unavailable. Please try again.', failure: { retry: { type: 'search', query: q } } });
  assert.match(failed, /role="alert"/); assert.match(text(failed), /Your search is kept: “black size 42 shoes” in Westlands/); assert.match(text(failed), /Try again/);
  const results = renderHost({ phase: 'results', query: { ...q, what: 'shoes' }, results: [offerA(), offerB()], compare: ['KS003:o-1', 'KS004:o-2'] });
  assert.match(text(results), /2 published products/); assert.match(text(results), /Newest first, from current SecurePay listings\. SecurePay doesn’t choose for you\./);
  assert.match(text(results), /Compare 2 facts side by side/); assert.match(results, /type="checkbox"/);
  const searching = renderHost({ phase: 'searching', query: q }); assert.match(searching, /role="status"/); assert.match(text(searching), /Looking on SecurePay…/);
  const detail = renderHost({ phase: 'detail', query: q, offer: offerA(), back: { phase: 'results', query: q, results: [offerA()], compare: [] } });
  assert.match(text(detail), /Use this/); assert.match(text(detail), /Nothing is bought, joined or agreed/); assert.match(text(detail), /KES 4,000/); assert.match(text(detail), /More from Wanjiru Traders/);
  const closed = renderHost({ phase: 'detail', query: q, offer: offerB(), back: { phase: 'results', query: q, results: [offerB()], compare: [] } });
  assert.match(closed, /<button[^>]*disabled[^>]*>Use this/); assert.match(text(closed), /lists this as “fully booked” right now/);
  const cmp = renderHost({ phase: 'comparing', query: q, offers: [offerA(), offerB()], back: { phase: 'results', query: q, results: [], compare: [] } });
  assert.match(text(cmp), /Side by side/); assert.match(text(cmp), /KES 4,000/); assert.match(text(cmp), /KES 2,500/);
  const failedSource = renderHost({ phase: 'source-failed', query: q, offer: offerA(), back: { phase: 'results', query: q, results: [], compare: [] }, error: 'SecurePay is unavailable.' });
  assert.match(text(failedSource), /couldn’t link this listing/); assert.doesNotMatch(failedSource, />Use this</);
  const linking = renderHost({ phase: 'source-selecting', query: q, offer: offerA(), back: { phase: 'results', query: q, results: [], compare: [] } });
  assert.match(linking, /aria-busy="true"/); assert.match(text(linking), /Linking to your conversation…/);
  assert.equal(renderHost({ phase: 'closed' }), '');
});
test('the "still to check" line preserves what the search could not filter by and says so', () => {
  const controller = { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'results', query: { kind: 'PRODUCT', what: 'shoes', place: '' }, results: [offerA()], compare: [] }), close() {}, back() {}, editSearch() {}, openDetail() {}, toggleCompare() {}, openCompare() {} };
  const out = text(html(api.DiscoveryHost, { controller, panelSlot: null, contextDetails: ['KES 4,000', 'size 42'], onBackToConversation() {}, onAddPerson() {} }));
  assert.match(out, /searched only for the words above\. Your other details — KES 4,000, size 42 — aren’t search filters, so check them on each listing/);
  assert.doesNotMatch(out, /black size 42 shoes under|matching your budget|in size 42/i);
});
test('discovery copy never claims filters that do not exist and never ranks', async () => {
  for (const f of ['src/features/discovery/ui/DiscoveryHost.tsx', 'src/features/discovery/ui/FoundOnSecurePay.tsx', 'src/features/discovery/ui/ResultCard.tsx', 'src/features/discovery/ui/PriceContext.tsx', 'src/features/discovery/ui/FactCompare.tsx', 'src/features/discovery/result.ts']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /best match|Recommended|Top choice|#1\b|\bverified\b|★|\brating\b|\breviews?\b|km away|market price/i, f);
  }
  const host = await readFile('src/features/discovery/ui/DiscoveryHost.tsx', 'utf8');
  assert.match(host, /title or description/); assert.match(host, /isn’t a map or a distance/); assert.match(host, /doesn’t choose for you/);
});
test('discovery reaches no Agreement/Money/handoff/invitation authority', async () => {
  for (const f of ['src/features/discovery/controller.ts', 'src/features/discovery/ui/DiscoveryHost.tsx', 'src/features/discovery/ui/FoundOnSecurePay.tsx', 'src/features/discovery/result.ts']) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /issueInvitation|createHandoff|adoptHandoff|continueHandoff|confirmVersion|agreementGateway|moneyGateway|paymentIntent|api\.agreements/, f);
  }
});
test('the discovery instrument shares the ONE surface shell with the Phase 1 instruments and the same conversation controller', async () => {
  for (const f of ['src/features/discovery/ui/DiscoveryHost.tsx', 'src/features/instruments/ui/InstrumentHost.tsx']) assert.match(await readFile(f, 'utf8'), /SurfaceShell/);
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /createDiscoveryController\(storeGateway, controller/);
});

// ---------------------------------------------------------------- PROTOTYPE COMPONENTS
test('fixture-era discovery components (invented avatars/ratings/images/maps) are NOT reachable from the production bundle; the Phase 2 modules are', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, jsx: 'automatic',
    define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"', 'import.meta.env.VITE_SECUREPAY_API_BASE_URL': '"http://localhost"' }, loader: { '.png': 'dataurl', '.svg': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl' } });
  const paths = Object.keys(result.metafile.inputs);
  for (const name of ['ProviderCard', 'StoreProductCard', 'ComparisonView', 'ProductComparison', 'ProviderHistory', 'MapCard', 'PriceContextCard', 'ProviderQuoteCard', 'LocationPicker', 'ConversationWorkspace', 'ContextPanel', 'OfferCard'])
    assert.equal(paths.some(p => new RegExp(`/${name}\\.tsx$`).test(p)), false, `${name} must not be reachable from production`);
  for (const name of ['DiscoveryHost', 'FoundOnSecurePay', 'ResultCard', 'PriceContext', 'FactCompare', 'SourceReference'])
    assert.ok(paths.some(p => new RegExp(`/${name}\\.tsx$`).test(p)), `${name} must be in the production bundle`);
});


// ---------------------------------------------------------------- MEDIA, PLACE AND STATUS TREATMENT
const cardFor = (over = {}, media = null) => api.resultsFromSearch([searchRow({}, { mediaRefs: media ? [media] : [], ...over })], 'https://api.securepay.test')[0];
test('place is plain seller-written text: no map pin, no distance/nearby/nearest/km language on any result surface', async () => {
  const out = html(api.ResultCard, { offer: cardFor(), onOpen() {} });
  assert.match(text(out), /Westlands/); assert.doesNotMatch(out, /lucide-map-pin|<svg/i);
  assert.doesNotMatch(text(out), /nearby|nearest|\bkm\b|kilomet|away|distance/i);
  for (const f of ['src/features/discovery/ui/ResultCard.tsx', 'src/features/discovery/ui/DiscoveryHost.tsx', 'src/features/discovery/ui/FoundOnSecurePay.tsx', 'src/features/discovery/result.ts']) {
    const src = (await readFile(f, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /MapPin|map-pin|\bnearby\b|\bnearest\b/i, f);
  }
});
test('genuine trusted media renders with a meaningful accessible name built only from known facts; no fake image exists anywhere', async () => {
  const withPhoto = html(api.ResultCard, { offer: cardFor({}, 'https://api.securepay.test/media/shoes.jpg'), onOpen() {} });
  assert.match(withPhoto, /<img[^>]+src="https:\/\/api\.securepay\.test\/media\/shoes\.jpg"/);
  assert.match(withPhoto, /alt="Photo of Leather shoes, published by Wanjiru Traders"/);
  assert.doesNotMatch(withPhoto, /alt=""/);
  const direct = html(api.OfferPhoto, { url: 'https://api.securepay.test/m.jpg', title: 'Handbag', seller: 'Bata' });
  assert.match(direct, /alt="Photo of Handbag, published by Bata"/); assert.match(direct, /loading="lazy"/);
  for (const f of ['src/features/discovery/ui/ResultCard.tsx', 'src/features/discovery/ui/OfferPhoto.tsx', 'src/features/discovery/ui/DiscoveryHost.tsx', 'src/features/discovery/result.ts']) {
    const src = (await readFile(f, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /unsplash|picsum|placeholder\.|stock|data:image|\/assets\//i, f);          // no stock/placeholder imagery
  }
  assert.match(await readFile('src/features/discovery/ui/OfferPhoto.tsx', 'utf8'), /onError=/);          // a broken image collapses away
});
test('missing or untrusted media leaves NO photo element and no empty shell', () => {
  for (const media of [null, 'https://evil.example/x.jpg', 'opaque-asset-id-123', 'http://api.securepay.test/plain.jpg']) {
    const offer = cardFor({}, media); assert.equal(offer.mediaUrl, null, String(media));
    const out = html(api.ResultCard, { offer, onOpen() {} });
    assert.doesNotMatch(out, /<img/); assert.doesNotMatch(out, /h-28|h-40|object-cover/);
  }
});
test('status colour states the listing\'s own fact and never a ranking; order is the backend\'s and photos do not affect it', () => {
  const dot = state => html(api.ResultCard, { offer: cardFor({ availabilityState: state }), onOpen() {} });
  assert.match(dot('AVAILABLE'), /bg-forest-500/); assert.match(dot('LOW_AVAILABILITY'), /bg-ember-400/); assert.match(dot('UNAVAILABLE'), /bg-sand-300/);
  assert.match(dot('NEEDS_CONFIRMATION'), /border-sand-400/);
  for (const state of ['AVAILABLE', 'LOW_AVAILABILITY', 'UNAVAILABLE', 'NEEDS_CONFIRMATION']) assert.doesNotMatch(text(dot(state)), /recommended|best|top choice|winner|#1|preferred|popular|trusted/i);
  const rows = [searchRow({}, { id: 'a', title: 'No photo' }), searchRow({}, { id: 'b', title: 'Has photo', mediaRefs: ['https://api.securepay.test/p.jpg'] }), searchRow({}, { id: 'c', title: 'Cheap', priceMinor: 100 })];
  assert.deepEqual(api.resultsFromSearch(rows, 'https://api.securepay.test').map(r => r.title), ['No photo', 'Has photo', 'Cheap']);   // neither imagery nor price reorders
});
test('media contract in the frontend: only the one trusted origin renders; refs are opaque and never proxied', async () => {
  const adapters = await readFile('src/api/securepay/store/adapters.ts', 'utf8');
  assert.match(adapters, /new URL\(ref\)\.origin === trustedOrigin/);
  for (const f of ['src/features/discovery/result.ts', 'src/features/discovery/ui/OfferPhoto.tsx']) assert.doesNotMatch(await readFile(f, 'utf8'), /fetch\(|proxy|createObjectURL/, f);
});
