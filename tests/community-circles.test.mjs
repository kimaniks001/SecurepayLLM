import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * as circleController from './src/features/circle/controller';
export * as circleAdapters from './src/api/securepay/circle/adapters';
export * as circleGatewayModule from './src/api/securepay/circle';
export * as communityController from './src/features/community/controller';
export * as communityView from './src/features/community/view';
export * as http from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// ─── Fixtures (verified shapes: SecurePayAPI feat/securepay-phase10-community-circles @ b371a906) ─────

const circleProfileResponse = (overrides = {}) => ({
  canonicalKsNumber: 'KS-200', displayName: 'James Kimani', verificationStatus: 'ACTIVE',
  memberSince: '2026-01-01T00:00:00Z', referredTraderCount: 3, activatedReferredTraderCount: 2,
  agreementsBroughtInCount: 1,
  ...overrides,
});

const publicOfferView = (overrides = {}) => ({
  id: 'offer-1', kind: 'SERVICE', title: 'CCTV installation', description: 'Install 4 cameras',
  priceMinor: 8500000, currency: 'KES', quantityAvailable: null, availabilityState: 'AVAILABLE',
  availabilityConfirmedAt: null, mediaRefs: [], updatedAt: '2026-09-10T00:00:00Z',
  ...overrides,
});
const searchResult = (overrides = {}) => ({ canonicalKsNumber: 'KS-100', displayName: 'Keyman Security', locationLabel: 'Nairobi', offer: publicOfferView(), ...overrides });

function fakeHttp() {
  const calls = [];
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth }); return {}; } } };
}

// ─── A/B. GET /api/v1/circle/me auth boundary ─────────────────────────

test('A. GET /api/v1/circle/me uses auth:required', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.circleGatewayModule.createCircleGateway(http);
  await gateway.me();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/v1/circle/me');
  assert.equal(calls[0].auth, 'required');
});

test('B. Missing authentication fails /circle/me before any network call', async () => {
  const fetchCalls = [];
  const httpClient = api.http.createHttpClient('https://example.test', () => null, async url => { fetchCalls.push(url); return new Response('{}', { status: 200 }); });
  const gateway = api.circleGatewayModule.createCircleGateway(httpClient);
  await assert.rejects(() => gateway.me(), /Authentication required/);
  assert.equal(fetchCalls.length, 0);
});

// ─── C/D. Production bundle exclusions ─────────────────────────

test('C. Real Circle route never imports circleData.ts', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /src\/circleData\.ts$/.test(path)), false);
  assert.ok(paths.some(path => /features\/circle\/controller\.ts$/.test(path)));
  assert.ok(paths.some(path => /api\/securepay\/circle\/index\.ts$/.test(path)));
});

test('D. Real Community route never imports communityData.ts', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /src\/communityData\.ts$/.test(path)), false);
  assert.equal(paths.some(path => /src\/App\.tsx$/.test(path)), false);
  assert.ok(paths.some(path => /features\/community\/controller\.ts$/.test(path)));
});

// ─── E/S. Real API failure never falls back to fixture data ─────────────────────────

test('E. Circle profile read failure leaves the controller in a closed error state, never demo data', async () => {
  const controller = api.circleController.createCircleController({ me: async () => { throw new Error('network down'); } });
  await controller.load();
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.profile.status, 'error');
  assert.notEqual(snapshot.profile.status, 'ready');
});

test('E2. Community store search failure leaves the controller in a closed error state, never demo objects', async () => {
  const controller = api.communityController.createCommunityController({ search: async () => { throw new Error('network down'); } });
  await controller.enter();
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.search.status, 'error');
});

test('S. Circle/Community controllers never import circleData.ts/communityData.ts at the source level', async () => {
  const files = ['src/features/circle/controller.ts', 'src/features/circle/CircleExperience.tsx', 'src/features/community/controller.ts', 'src/features/community/CommunityExperience.tsx', 'src/features/community/view.ts'];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /from ['"].*circleData['"]/, `${file} must not import circleData.ts`);
    assert.doesNotMatch(contents, /from ['"].*communityData['"]/, `${file} must not import communityData.ts`);
  }
});

// ─── F/G. CircleProfile renders only real backend fields; growth-credit points are retired ─────────────────────────

test('F. circleProfileView exposes exactly the real backend fields, no rank/medal/score/reputation field', () => {
  const view = api.circleAdapters.circleProfileView(circleProfileResponse());
  assert.deepEqual(Object.keys(view).sort(), [
    'activatedReferredTraderCount', 'agreementsBroughtInCount', 'canonicalKsNumber', 'displayName',
    'memberSince', 'referredTraderCount', 'verificationStatus',
  ].sort());
});

// Final Phase 4 Economy correction (programme decision): the weighted growthCreditTotal points
// mechanic is retired -- it conflicted with the locked no-points/no-gamification doctrine. The
// adapter must never surface it even if a stale/rollback backend response still includes it.
test('G. growthCreditTotal is never surfaced by the adapter, even if present on the wire', () => {
  const view = api.circleAdapters.circleProfileView(circleProfileResponse({ growthCreditTotal: 42 }));
  assert.equal('growthCreditTotal' in view, false);
});

test('G2. The real Circle profile card never renders a growth-credit/points concept', async () => {
  const contents = await readFile('src/features/circle/CircleExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /growthCredit/i);
  assert.doesNotMatch(contents, /growth credit/i);
  assert.doesNotMatch(contents, /\bpoints\b/i);
});

test('G3. The rendered real Circle profile card never shows a currency figure', async () => {
  const contents = await readFile('src/features/circle/CircleExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /KES|KSh|Ksh/);
});

// ─── H. No rank/rating/reputation/medal/follower/like/success-rate inference in the data layer ─────────────────────────

test('H. Circle data-layer files never compute rank/rating/reputation/medal/follower/like/success-rate fields', async () => {
  const files = ['src/api/securepay/circle/dto.ts', 'src/api/securepay/circle/adapters.ts', 'src/features/circle/controller.ts'];
  const forbidden = /\brank(ing)?\b|\brating\b|\breputation\b|\bmedal\b|\bfollower\b|\blike[sd]?\b|success.?rate/i;
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not infer a rank/rating/reputation/medal/follower/like/success-rate field`);
  }
});

// ─── I. Unknown verification/status enums fail closed ─────────────────────────

test('I. An unrecognized verificationStatus fails the whole Circle profile read closed', () => {
  assert.throws(() => api.circleAdapters.circleProfileView(circleProfileResponse({ verificationStatus: 'ENLIGHTENED' })), /unrecognized Circle verification status/);
});

// ─── J/K. No fake named-Circle Join/Create authority ─────────────────────────

test('J. The real Circle gateway exposes only the one verified self-scoped read, no join/create/membership method', () => {
  const gateway = api.circleGatewayModule.createCircleGateway({ request: async () => ({}) });
  assert.deepEqual(Object.keys(gateway), ['me']);
});

test('K. The real Circle experience renders no Join/Create Circle action and a truthful named-Circle gap notice', async () => {
  const contents = await readFile('src/features/circle/CircleExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /Join Circle|Create Circle|onJoin|onCreate/);
  assert.match(contents, /Named Circles/);
  assert.match(contents, /not available yet/);
});

// ─── L/M. Real Community composer/discussion never claim persistence ─────────────────────────

test('L. The real Community experience never mounts the Composer and never claims a post was published', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /CommunityComposer/);
  assert.match(contents, /not available yet/);
});

test('M. The real Community experience never mounts a Discussion/reply surface or claims shared persistence', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /CommunityDiscussion|CommunityStory|CommunityResult/);
});

// ─── N/Q. No Agreement/Money/party authority from Community or Circle ─────────────────────────

test('N. Opening a real Community object creates no Agreement/join/confirm/payment authority', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /agreementGateway|handoffController|createHandoff|adoptHandoff|confirmVersion|moneyGateway/);
});

test('Q. Circle is never treated as an Agreement party', async () => {
  const files = ['src/features/circle/controller.ts', 'src/features/circle/CircleExperience.tsx', 'src/api/securepay/circle/index.ts', 'src/api/securepay/circle/adapters.ts'];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /AgreementGateway|agreementGateway|createHandoff|\bparty\b/i, `${file} must never reach for Agreement-party authority`);
  }
});

// ─── O/P. Community "Use this" only ever reuses the real STORE_LISTING seam, never COMMUNITY_KNOWLEDGE ─────────────────────────

test('O. No Community-specific external-fact/adoption call exists — a Store offer hands off through the existing real Store pipeline only', async () => {
  const files = ['src/features/community/controller.ts', 'src/features/community/view.ts', 'src/features/community/CommunityExperience.tsx'];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /adoptFact|external-facts|submitAmount|useOffer\(/, `${file} must not duplicate the Agent provenance/adoption engine`);
  }
  const experience = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(experience, /onOpenStoreOffer/);
});

test('P. COMMUNITY_KNOWLEDGE is never wired for a Store Offer — it stays STORE_LISTING via the existing Store path', async () => {
  const files = [
    'src/features/community/controller.ts', 'src/features/community/view.ts', 'src/features/community/CommunityExperience.tsx',
    'src/features/circle/controller.ts', 'src/features/circle/CircleExperience.tsx',
    'src/api/securepay/circle/index.ts', 'src/api/securepay/circle/adapters.ts', 'src/api/securepay/circle/dto.ts',
  ];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    // Matches only an actual code usage (a quoted string literal), not the doctrine prose in
    // CommunityExperience.tsx's own comment explaining why it is *not* used.
    assert.doesNotMatch(contents, /['"]COMMUNITY_KNOWLEDGE['"]/, `${file} must never wire COMMUNITY_KNOWLEDGE as a real sourceKind`);
  }
});

// ─── R. No Money/payment-intent/checkout/cart logic in Community or Circle ─────────────────────────

test('R. No Community/Circle path imports Money/payment-intent/checkout/cart logic', async () => {
  const files = [
    'src/features/community/controller.ts', 'src/features/community/view.ts', 'src/features/community/CommunityExperience.tsx',
    'src/features/circle/controller.ts', 'src/features/circle/CircleExperience.tsx',
    'src/api/securepay/circle/index.ts', 'src/api/securepay/circle/adapters.ts', 'src/api/securepay/circle/dto.ts',
  ];
  const forbidden = /\bcart\b|\bcheckout\b|paymentintent|\bpay\s+now\b|add\s+to\s+cart/i;
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not reference a cart/checkout/payment-intent surface`);
    assert.doesNotMatch(contents, /from ['"].*\/money['"]/, `${file} must not import the Money gateway`);
  }
});

// ─── U. No arbitrary client-side ranking/recommendation algorithm ─────────────────────────

test('U. Community/Circle feature files introduce no new sort/ranking logic of their own', async () => {
  // Phase 6 Slice 2 correction: this originally banned any `.sort(` at all, back when the only real
  // content was the Store merge's own recency ordering. Slice 2 explicitly requires real replies to
  // be shown "ordered chronologically" (a flat chronological list, not ranked) -- controller.ts's own
  // .sort() is exactly that single, narrow, timestamp-based chronological ordering in
  // combineRealResponses, never an engagement/popularity/score-based ranking. The forbidden pattern
  // below still catches an actual ranking algorithm if one is ever introduced.
  const files = ['src/features/community/controller.ts', 'src/features/community/view.ts', 'src/features/circle/controller.ts'];
  const forbiddenRankingTerms = /\.sort\([^)]*\b(score|rank|popularity|engagement|weight|relevance)\b/i;
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbiddenRankingTerms, `${file} must not introduce an engagement/popularity/score-based ranking`);
  }
  const viewContents = await readFile('src/features/community/view.ts', 'utf8');
  assert.match(viewContents, /createdAtIso\.localeCompare\(/, 'the one permitted sort must be plain chronological ordering by timestamp');
});

test('U2. Community browsing reuses the existing recency-only Store search fan-out/merge, not a new engine', async () => {
  const contents = await readFile('src/features/community/controller.ts', 'utf8');
  assert.match(contents, /searchRequests/);
  assert.match(contents, /mergeSearchResults/);
});

// ─── V. No stale MW-07/MW-08 backend endpoint is wired ─────────────────────────

test('V. Only the verified /api/v1/circle/me and existing public Store endpoints are referenced — no stale named-group/MW endpoint', async () => {
  const files = ['src/api/securepay/circle/index.ts', 'src/features/community/controller.ts', 'src/features/community/CommunityExperience.tsx'];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /\/circles\/|circle-membership|circle_membership|\/circle\/join|\/circle\/create|mw-0[78]/i, `${file} must not wire a stale/invented named-Circle endpoint`);
  }
  const gatewayContents = await readFile('src/api/securepay/circle/index.ts', 'utf8');
  assert.match(gatewayContents, /\/api\/v1\/circle\/me/);
});

// ─── T. Fixture-mode Bolt Community/Circle rendering remains fully preserved for untouched components ─────────────────────────

test('T. Untouched fixture Community/Circle components render byte-identical markup against Bolt', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommunityObjectCard } from './src/components/CommunityObjectCard';
import { CommunityPersonProfile } from './src/components/CommunityPersonProfile';
import { CommunityBusinessProfile } from './src/components/CommunityBusinessProfile';
import { CommunityComposer } from './src/components/CommunityComposer';
import { CommunityToTradeHandoff } from './src/components/CommunityToTradeHandoff';
import { CommunitySourceChanged } from './src/components/CommunitySourceChanged';
import { CircleHome } from './src/components/CircleHome';
import { CircleDiscoveryList } from './src/components/CircleDiscoveryList';
import { CircleMemberDirectory } from './src/components/CircleMemberDirectory';
import { CircleEconomicSummary } from './src/components/CircleEconomicSummary';
import { CircleCreateFlow } from './src/components/CircleCreateFlow';
import { CircleJoinFlow } from './src/components/CircleJoinFlow';
import { demoCommunityObjects, demoPeople, demoBusinesses } from './src/communityData';
import { demoCircles } from './src/circleData';
const noop = () => {};
export const markup = [
  React.createElement(CommunityObjectCard, { object: demoCommunityObjects[0], onOpen: noop }),
  React.createElement(CommunityPersonProfile, { person: demoPeople[0], onBack: noop, onViewBusiness: noop, onMessage: noop }),
  React.createElement(CommunityBusinessProfile, { business: demoBusinesses[0], onBack: noop, onViewStore: noop, onMessage: noop }),
  React.createElement(CommunityComposer, { onBack: noop, onPublish: noop }),
  React.createElement(CommunityToTradeHandoff, { object: demoCommunityObjects[0], onBack: noop, onProceed: noop }),
  React.createElement(CommunitySourceChanged, { oldText: 'a', newText: 'b', onRefresh: noop }),
  React.createElement(CircleHome, { circle: demoCircles[0], onBack: noop, onOpenMembers: noop, onOpenEconomicStory: noop, onOpenObject: noop, onCreate: noop, onJoin: noop, onAskAgent: noop }),
  React.createElement(CircleDiscoveryList, { onBack: noop, onOpenCircle: noop, onCreate: noop }),
  React.createElement(CircleMemberDirectory, { circle: demoCircles[0], onBack: noop, onOpenPerson: noop }),
  React.createElement(CircleEconomicSummary, { circle: demoCircles[0], onBack: noop }),
  React.createElement(CircleCreateFlow, { onBack: noop, onPublish: noop }),
  React.createElement(CircleJoinFlow, { circle: demoCircles[0], onBack: noop, onJoin: noop }),
].map(renderToStaticMarkup);`;
  const touched = /src\/components\/(CommunityObjectCard|CommunityPersonProfile|CommunityBusinessProfile|CommunityComposer|CommunityToTradeHandoff|CommunitySourceChanged|CircleHome|CircleDiscoveryList|CircleMemberDirectory|CircleEconomicSummary|CircleCreateFlow|CircleJoinFlow)\.tsx$/;
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
  assert.deepEqual(current, baseline);
});

test('T2. Rewritten fixture-mode CommunityHome/CommunityObjectDetail still render the same real Bolt fixture content', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommunityHome } from './src/components/CommunityHome';
import { CommunityObjectDetail } from './src/components/CommunityObjectDetail';
import { demoCommunityObjects, demoPeople, demoBusinesses, searchCommunity, getCommunityObjectById } from './src/communityData';
import { getOfferById } from './src/storeData';
const noop = () => {};
const offerRefObject = getCommunityObjectById('co-offer-ref-1');
export const homeMarkup = renderToStaticMarkup(React.createElement(CommunityHome, {
  query: '', onQueryChange: noop, objects: searchCommunity(''), people: demoPeople, businesses: demoBusinesses,
  onOpenObject: noop, onOpenPerson: noop, onOpenBusiness: noop, onCreate: noop, onStartConversation: noop, onOpenCircles: noop,
}));
export const detailMarkup = renderToStaticMarkup(React.createElement(CommunityObjectDetail, {
  object: offerRefObject, offer: getOfferById(offerRefObject.relatedOfferId), onBack: noop, onICanHelp: noop, onDiscuss: noop, onViewOffer: noop, onToTrade: noop,
}));`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  assert.match(mod.exports.homeMarkup, /Peter Mwangi/);
  assert.match(mod.exports.homeMarkup, /Keyman Security/);
  assert.match(mod.exports.homeMarkup, /Your Circles/);
  assert.match(mod.exports.detailMarkup, /4-Camera CCTV Package/);
  assert.match(mod.exports.detailMarkup, /Store offer reference/);
});

// ─── Real Community composition over the real Store search (task sections 7/9) ─────────────────────────

test('Real Community "Offers from stores" composes only real, factual Store search results — never fabricated authorship/responses', () => {
  const object = api.communityView.storeResultToCommunityObject(searchResult());
  assert.equal(object.objectType, 'store_offer_reference');
  assert.equal(object.author, 'Keyman Security');
  assert.equal(object.title, 'CCTV installation');
  assert.deepEqual(object.responses, []);
  assert.equal(object.relatedStoreId, 'KS-100');
  assert.equal(object.relatedOfferId, 'offer-1');
});

test('parseStoreOfferCommunityObjectId recovers the exact real identifiers for hand-off into the Store feature', () => {
  const object = api.communityView.storeResultToCommunityObject(searchResult({ canonicalKsNumber: 'KS-100', offer: publicOfferView({ id: 'offer-1' }) }));
  const parsed = api.communityView.parseStoreOfferCommunityObjectId(object.id);
  assert.deepEqual(parsed, { canonicalKsNumber: 'KS-100', offerId: 'offer-1' });
});

// ─── Pre-merge hardening pass (2026-09-15) ─────────────────────────

const communityHomeDefaultProps = {
  query: '', onQueryChange: () => {}, objects: [], people: [], businesses: [],
  onOpenObject: () => {}, onOpenPerson: () => {}, onOpenBusiness: () => {}, onCreate: () => {}, onStartConversation: () => {}, onOpenCircles: () => {},
};

async function renderCommunityHome(props) {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommunityHome } from './src/components/CommunityHome';
export const markup = renderToStaticMarkup(React.createElement(CommunityHome, ${JSON.stringify(props)}));`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports.markup;
}

test('H1. Real-mode Community never names a fictitious named Circle or implies membership in one', async () => {
  const markup = await renderCommunityHome({
    ...communityHomeDefaultProps,
    circlesEntryLabel: 'Your Circle profile',
    circlesEntryDescription: 'See your real network activity — referrals, agreements brought in, and growth credit. Not a named Circle or group.',
  });
  assert.match(markup, /Your Circle profile/);
  assert.doesNotMatch(markup, /Construction Circle/);
  assert.doesNotMatch(markup, /Creative Professionals/);
});

test('H2. Fixture-mode Community (default props) still names the demo Circles — unchanged', async () => {
  const markup = await renderCommunityHome(communityHomeDefaultProps);
  assert.match(markup, /Your Circles/);
  assert.match(markup, /Construction Circle/);
  assert.match(markup, /Creative Professionals/);
});

test('H3. The real Community experience wires the truthful named-Circle copy overrides', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /circlesEntryLabel="Your Circle profile"/);
  assert.doesNotMatch(contents, /Construction Circle|Creative Professionals/);
});

test('H4. Real-mode Community search placeholder and empty state match the real search capability (Store offers only)', async () => {
  const markup = await renderCommunityHome({
    ...communityHomeDefaultProps,
    query: 'chair', storeSearchStatus: 'ready',
    searchPlaceholder: 'Search store offers by category or location...',
    noResultsMessage: 'No store offers found for "chair".',
  });
  assert.match(markup, /Search store offers by category or location/);
  assert.match(markup, /No store offers found for &quot;chair&quot;/);
  assert.doesNotMatch(markup, /Search people, businesses, questions, needs, work/);
  assert.doesNotMatch(markup, /No results for &quot;chair&quot;/);
});

test('H5. Fixture-mode Community search placeholder/empty state remain byte-identical to Bolt', async () => {
  const markup = await renderCommunityHome({ ...communityHomeDefaultProps, query: 'chair' });
  assert.match(markup, /Search people, businesses, questions, needs, work/);
  assert.match(markup, /No results for &quot;chair&quot;/);
});

async function renderCommunityObjectDetail(object, offer) {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommunityObjectDetail } from './src/components/CommunityObjectDetail';
import { getCommunityObjectById } from './src/communityData';
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(CommunityObjectDetail, {
  object: getCommunityObjectById(${JSON.stringify(object)}), offer: ${offer ? JSON.stringify(offer) : 'null'},
  onBack: noop, onICanHelp: noop, onDiscuss: noop, onViewOffer: noop, onToTrade: noop,
}));`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports.markup;
}

const fixtureStoreOffer = {
  id: 'offer-cctv', storeId: 'store-keyman', storeName: 'Keyman Security', title: '4-Camera CCTV Package',
  description: 'x', offerType: 'service', priceType: 'fixed', price: 'KES 85,000', currency: 'KES',
  scope: { included: [], excluded: [] }, media: [], serviceArea: '', availability: 'Available',
  conditions: [], documents: [], milestoneSeeds: [], obligationSeeds: [], customizationAllowed: true,
  secureLink: { id: 'l', url: '', label: 'x', linkType: 'offer', qrAvailable: false, whatsappShareAvailable: false, embedAvailable: false },
  lifecycle: 'published', version: 'v1', isExternalReference: false, isDemoState: true,
};

test('H6. A Store Offer reference never renders "Posted by" — it names the Store, not an author', async () => {
  const markup = await renderCommunityObjectDetail('co-offer-ref-1', fixtureStoreOffer);
  assert.match(markup, /Store: Keyman Security/);
  assert.doesNotMatch(markup, /Posted by/);
});

test('H7. Genuine Community content (need/question/etc.) keeps "Posted by" unchanged', async () => {
  const markup = await renderCommunityObjectDetail('co-need-1', null);
  assert.match(markup, /Posted by James Kimani/);
});

test('H8. Real Circle memberSince wording never implies named-Circle/community membership', async () => {
  const contents = await readFile('src/features/circle/CircleExperience.tsx', 'utf8');
  assert.match(contents, /SecurePay identity since \{profile\.memberSince\}/);
  assert.doesNotMatch(contents, />Member since/);
});

test('H9. CircleExperience resets the profile on sign-out and reloads fresh on every transition into signed-in', async () => {
  const contents = await readFile('src/features/circle/CircleExperience.tsx', 'utf8');
  assert.match(contents, /if \(sessionState\.status === 'signed-in'\) void controller\.load\(\);\s*\n\s*else controller\.reset\(\);/);
});

test('H10. Circle controller: signing out clears a previous ready profile, and re-authenticating loads the new session\'s own profile, never the old one', async () => {
  let response = circleProfileResponse({ canonicalKsNumber: 'KS-OLD', displayName: 'Old Identity' });
  const gateway = { me: async () => response };
  const controller = api.circleController.createCircleController(gateway);

  await controller.load();
  assert.equal(controller.getSnapshot().profile.status, 'ready');
  assert.equal(controller.getSnapshot().profile.data.canonicalKsNumber, 'KS-OLD');

  // Simulates the CircleExperience effect's sign-out branch.
  controller.reset();
  assert.equal(controller.getSnapshot().profile.status, 'idle');

  // Simulates re-authentication as a different identity.
  response = circleProfileResponse({ canonicalKsNumber: 'KS-NEW', displayName: 'New Identity' });
  await controller.load();
  assert.equal(controller.getSnapshot().profile.status, 'ready');
  assert.equal(controller.getSnapshot().profile.data.canonicalKsNumber, 'KS-NEW');
  assert.notEqual(controller.getSnapshot().profile.data.displayName, 'Old Identity');
});

test('H11. Community search: a slower stale response never overwrites a newer, faster one', async () => {
  function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
  const defA = deferred();
  const defB = deferred();
  let callIndex = 0;
  const resultA = searchResult({ canonicalKsNumber: 'KS-A', offer: publicOfferView({ id: 'offer-a', title: 'Search A result' }) });
  const resultB = searchResult({ canonicalKsNumber: 'KS-B', offer: publicOfferView({ id: 'offer-b', title: 'Search B result' }) });
  const gateway = {
    search: async () => {
      callIndex += 1;
      if (callIndex <= 2) { await defA.promise; return [resultA]; }
      await defB.promise; return [resultB];
    },
  };
  const controller = api.communityController.createCommunityController(gateway);

  const pA = controller.enter(); // search A: query '' -> 2 calls, pending on defA
  controller.setQuery('b');
  const pB = controller.submitSearch(); // search B: query 'b' -> 4 calls, pending on defB

  defB.resolve();
  await pB;
  assert.equal(controller.getSnapshot().search.status, 'ready');
  assert.equal(controller.getSnapshot().search.data[0].canonicalKsNumber, 'KS-B');

  defA.resolve(); // stale — must never overwrite B's result
  await pA;
  assert.equal(controller.getSnapshot().search.status, 'ready');
  assert.equal(controller.getSnapshot().search.data[0].canonicalKsNumber, 'KS-B');
});

test('H12. Community search: a stale slower error never overwrites a newer ready result', async () => {
  function deferred() { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }
  const defA = deferred();
  const defB = deferred();
  let callIndex = 0;
  const resultB = searchResult({ canonicalKsNumber: 'KS-B', offer: publicOfferView({ id: 'offer-b' }) });
  const gateway = {
    search: async () => {
      callIndex += 1;
      if (callIndex <= 2) { await defA.promise; return []; }
      await defB.promise; return [resultB];
    },
  };
  const controller = api.communityController.createCommunityController(gateway);

  const pA = controller.enter();
  controller.setQuery('b');
  const pB = controller.submitSearch();

  defB.resolve();
  await pB;
  assert.equal(controller.getSnapshot().search.status, 'ready');

  defA.reject(new Error('stale network failure'));
  await pA;
  // The stale rejection must not flip a already-ready, newer result into an error state.
  assert.equal(controller.getSnapshot().search.status, 'ready');
  assert.equal(controller.getSnapshot().search.data[0].canonicalKsNumber, 'KS-B');
});

// ─── W. All prior Golden Spine A-F production-foundation tests remain green ─────────────────────────

test('W. All prior Golden Spine A-F test suites remain green', async () => {
  const files = ['foundation', 'agent', 'handoff', 'recipient', 'signed-in', 'money', 'store'].map(name => `tests/${name}.test.mjs`);
  const result = spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
