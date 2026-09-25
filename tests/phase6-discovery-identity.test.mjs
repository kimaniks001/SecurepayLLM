import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Phase 6 Slice 5 (Discovery & Identity) -- "SecurePay should help people find what actually exists
// in their Community without deciding what is best for them."
const bundle = await build({ stdin: { contents: `
export * as communityGatewayModule from './src/api/securepay/community';
export * as communityController from './src/features/community/controller';
export * as discoveryGatewayModule from './src/api/securepay/discovery';
export * as http from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

function fakeHttp() {
  const calls = [];
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth, body: options.body }); return {}; } } };
}

function discoveryResultsFixture(overrides = {}) {
  return {
    community: [], communityHasMore: false, circles: [], circlesHasMore: false,
    stores: [], storesHasMore: false, people: [], peopleHasMore: false, ...overrides,
  };
}

function communityItemFixture(overrides = {}) {
  return {
    id: 'obj-1', objectType: 'NEED', title: 'Bathroom repair', locationLabel: null,
    authorCanonicalKsNumber: 'KS900', authorDisplayName: 'James', createdAt: '2026-09-26T08:00:00Z', ...overrides,
  };
}

function profileFixture(overrides = {}) {
  return {
    canonicalKsNumber: 'KS100', displayName: 'Mary', identityType: 'INDIVIDUAL',
    hasStore: false, storeTagline: null, storeLocationLabel: null, recentActivity: [], ...overrides,
  };
}

function communityObjectFixture(overrides = {}) {
  return {
    id: 'obj-1', objectType: 'NEED', status: 'ACTIVE', title: 'Bathroom repair', body: 'body',
    locationLabel: null, authorCanonicalKsNumber: 'KS900', authorDisplayName: 'James',
    createdAt: '2026-09-26T08:00:00Z', updatedAt: '2026-09-26T08:00:00Z', closedAt: null,
    circleId: null, canClose: false, ...overrides,
  };
}

function baseCommunityGateway(overrides = {}) {
  return {
    feed: async () => [], mine: async () => [], search: async () => [], get: async () => communityObjectFixture(),
    circles: { discover: async () => [], mine: async () => [], myInvitations: async () => [] },
    membership: { me: async () => ({ status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: null, respondedAt: null }) },
    principles: async () => [],
    ...overrides,
  };
}

function baseDiscoveryGateway(overrides = {}) {
  return {
    search: async () => discoveryResultsFixture(),
    profiles: { search: async () => [], get: async () => profileFixture() },
    ...overrides,
  };
}

// ─── api/securepay/community -- new Slice 5 search endpoints ─────────────────────────

test('gateway: community.search hits GET /api/v1/community/objects/search with q, types, and pagination', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);

  await gateway.search('bathroom', ['NEED', 'QUESTION'], 20, 10);

  assert.equal(calls[0].method, 'GET');
  assert.match(calls[0].path, /^\/api\/v1\/community\/objects\/search\?/);
  const query = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(query.get('q'), 'bathroom');
  assert.deepEqual(query.getAll('types'), ['NEED', 'QUESTION']);
  assert.equal(query.get('limit'), '20');
  assert.equal(query.get('offset'), '10');
  assert.equal(calls[0].auth, 'required');
});

test('gateway: community.search omits q entirely when blank -- never sends an empty q param', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);

  await gateway.search('', [], 50, 0);

  const query = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(query.has('q'), false);
});

test('gateway: circles.discover is backward compatible (no args) and additive with q', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);

  await gateway.circles.discover();
  await gateway.circles.discover(20, 5, 'construction');

  assert.match(calls[0].path, /^\/api\/v1\/community\/circles\?/);
  const firstQuery = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(firstQuery.has('q'), false);
  assert.equal(firstQuery.get('limit'), '50');

  const secondQuery = new URLSearchParams(calls[1].path.split('?')[1]);
  assert.equal(secondQuery.get('q'), 'construction');
  assert.equal(secondQuery.get('limit'), '20');
  assert.equal(secondQuery.get('offset'), '5');
});

// ─── api/securepay/discovery -- the new unified gateway ─────────────────────────

test('gateway: discovery.search hits GET /api/v1/discovery/search with q/scope/pagination, authenticated', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.discoveryGatewayModule.createDiscoveryGateway(http);

  await gateway.search('bathroom', 'COMMUNITY', 20, 10);

  assert.match(calls[0].path, /^\/api\/v1\/discovery\/search\?/);
  const query = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(query.get('q'), 'bathroom');
  assert.equal(query.get('scope'), 'COMMUNITY');
  assert.equal(query.get('limit'), '20');
  assert.equal(query.get('offset'), '10');
  assert.equal(calls[0].auth, 'required');
});

test('gateway: discovery.search defaults to scope=EVERYTHING when omitted', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.discoveryGatewayModule.createDiscoveryGateway(http);

  await gateway.search('bathroom');

  const query = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(query.get('scope'), 'EVERYTHING');
});

test('gateway: discovery.profiles.search and .get hit the real profile endpoints, authenticated', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.discoveryGatewayModule.createDiscoveryGateway(http);

  await gateway.profiles.search('mary', 50, 0);
  await gateway.profiles.get('KS100');

  assert.match(calls[0].path, /^\/api\/v1\/community\/profiles\/search\?/);
  assert.equal(calls[1].path, '/api/v1/community/profiles/KS100');
  assert.ok(calls.every(c => c.auth === 'required'));
});

// ─── controller.ts -- the Search Community screen ─────────────────────────

test('controller: openSearch switches to the search view without auto-running a search', async () => {
  const searchCalls = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({ search: async (...args) => { searchCalls.push(args); return discoveryResultsFixture(); } });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.openSearch();

  assert.equal(controller.getSnapshot().view, 'search');
  assert.equal(searchCalls.length, 0, 'opening the screen must never itself run a search -- the person types first');
});

test('controller: submitDiscoverySearch calls discovery.search with the current query and scope, and stores the results', async () => {
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async () => discoveryResultsFixture({ community: [communityObjectFixture()] }),
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.openSearch();
  controller.setSearchQuery('bathroom');
  await controller.submitDiscoverySearch();

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.discoverySearch.status, 'ready');
  assert.equal(snapshot.discoverySearch.data.community.length, 1);
  assert.equal(snapshot.discoverySearch.data.community[0].title, 'Bathroom repair');
});

test('controller: setSearchScope both updates the scope and re-runs the search under the new scope', async () => {
  const scopesRequested = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope) => { scopesRequested.push(scope); return discoveryResultsFixture(); },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.openSearch();
  controller.setSearchScope('CIRCLES');
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(controller.getSnapshot().searchScope, 'CIRCLES');
  assert.ok(scopesRequested.includes('CIRCLES'));
});

test('controller: a failed search surfaces a real error, never a fabricated empty result treated as success', async () => {
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({ search: async () => { throw new Error('network down'); } });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.openSearch();
  await controller.submitDiscoverySearch();

  assert.equal(controller.getSnapshot().discoverySearch.status, 'error');
});

// ─── controller.ts -- opening search results through each domain's own authoritative surface ─────

test('controller: openObject falls back to a real fetch when the id is not already in the loaded feed (e.g. reached from Search)', async () => {
  const getCalls = [];
  const community = baseCommunityGateway({
    get: async id => { getCalls.push(id); return communityObjectFixture({ id, title: 'Fetched fresh' }); },
  });
  const discovery = baseDiscoveryGateway();
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  await controller.openObject('obj-not-in-feed');

  assert.deepEqual(getCalls, ['obj-not-in-feed']);
  assert.equal(controller.getSnapshot().selectedRealObject?.title, 'Fetched fresh');
  assert.equal(controller.getSnapshot().view, 'object');
});

test('controller: openProfile opens the profile view and loads the real public profile', async () => {
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    profiles: { search: async () => [], get: async ks => profileFixture({ canonicalKsNumber: ks, displayName: 'Keyman Electrical', identityType: 'BUSINESS' }) },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  await controller.openProfile('KS200');

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.view, 'profile');
  assert.equal(snapshot.selectedProfile.status, 'ready');
  assert.equal(snapshot.selectedProfile.data.displayName, 'Keyman Electrical');
  assert.equal(snapshot.selectedProfile.data.identityType, 'BUSINESS');
});

test('controller: a profile that cannot be found (absent or PRIVATE) surfaces a real error, never a fabricated profile', async () => {
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    profiles: { search: async () => [], get: async () => { throw new Error('not found'); } },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  await controller.openProfile('KS999');

  assert.equal(controller.getSnapshot().selectedProfile.status, 'error');
});

// ─── controller.ts -- Discover Circles' own additive text query (Section 12) ─────────────────────────

test('controller: setDiscoverCirclesQuery + submitDiscoverCirclesQuery calls circles.discover with the query, never breaking the original unfiltered browse', async () => {
  const discoverCalls = [];
  const community = baseCommunityGateway({
    circles: { discover: async (...args) => { discoverCalls.push(args); return []; }, mine: async () => [], myInvitations: async () => [] },
  });
  const discovery = baseDiscoveryGateway();
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  await controller.showCommunityTab('discover');
  controller.setDiscoverCirclesQuery('construction');
  await controller.submitDiscoverCirclesQuery();

  assert.deepEqual(discoverCalls[0], [50, 0, undefined]);
  assert.deepEqual(discoverCalls[1], [50, 0, 'construction']);
});

// ─── Doctrine-style source checks: the UI is really wired, never a placeholder ─────────────────────────

test('the "Search Community" entry point is real and reachable from Community home', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /onClick=\{\(\) => controller\.openSearch\(\)\}/);
  assert.match(contents, /Search Community, Circles, Stores, people/);
});

test('CommunitySearchView renders sectioned typed results -- Community/Circles/Stores/People are never flattened into one generic list', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /function CommunitySearchView/);
  assert.match(contents, />Community<\/h3>/);
  assert.match(contents, />Circles<\/h3>/);
  assert.match(contents, />Stores<\/h3>/);
  assert.match(contents, /People &amp;amp; businesses|People &amp; businesses/);
});

test('discovery/profile results carry no ranking or recommendation language anywhere in the new UI code', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  // Strip comments first -- doctrine prose legitimately NAMES these concepts to say they are absent
  // (e.g. "never a fabricated... trust score"), which a naive full-file scan cannot distinguish from
  // an actual implementation. "recommend" is deliberately excluded -- this UI's own reassurance copy
  // (both pre-existing and new) truthfully tells the person "never ranked, never recommended for
  // you", which is the ABSENCE of the concept stated in visible text, not an implementation of it.
  const withoutComments = contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const forbidden = ['score', 'rating', 'trending', 'trustScore', 'reputationScore', 'popularity', 'follower', 'leaderboard'];
  const lower = withoutComments.toLowerCase();
  for (const token of forbidden) {
    assert.equal(lower.includes(token.toLowerCase()), false, `must not mention forbidden token '${token}' outside a comment`);
  }
});

test('opening a Store search result reuses the existing onOpenStoreOffer navigation -- never a second Store view', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /onOpenStoreItem=\{\(ks, offerId\) => onOpenStoreOffer\(ks, offerId\)\}/);
});

test('the profile view never renders an internal identity id, and "View Store" only appears when hasStore is true', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  const start = contents.indexOf('function CommunityProfileView');
  const end = contents.indexOf('\nexport function CommunityExperience');
  const componentSource = contents.slice(start, end);
  assert.doesNotMatch(componentSource, /identityId/);
  assert.match(componentSource, /profile\.data\.hasStore &&/);
});

test('AgentExperience threads a real discoveryGateway prop into CommunityExperience -- never omitted/undefined by default', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(contents, /discoveryGateway: DiscoveryGateway/);
  assert.match(contents, /discoveryGateway=\{discoveryGateway\}/);
});

// ─── Final pre-merge correction -- real end-to-end pagination ─────────────────────────

test('a scoped first page renders with the correct SEARCH_PAGE_SIZE and offset 0', async () => {
  const searchCalls = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (...args) => { searchCalls.push(args); return discoveryResultsFixture({ community: [communityItemFixture()], communityHasMore: true }); },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchScope('COMMUNITY');
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(searchCalls[0], ['', 'COMMUNITY', api.communityController.SEARCH_PAGE_SIZE, 0]);
  assert.equal(controller.getSnapshot().discoverySearch.data.community.length, 1);
});

test('Load more requests the next offset and appends to the existing page, never repeating it', async () => {
  const searchCalls = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope, limit, offset) => {
      searchCalls.push(offset);
      return offset === 0
        ? discoveryResultsFixture({ community: [communityItemFixture({ id: 'obj-1', title: 'Page 1' })], communityHasMore: true })
        : discoveryResultsFixture({ community: [communityItemFixture({ id: 'obj-2', title: 'Page 2' })], communityHasMore: false });
    },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchScope('COMMUNITY');
  await new Promise(resolve => setTimeout(resolve, 0));
  await controller.loadMoreSearchResults();

  assert.deepEqual(searchCalls, [0, api.communityController.SEARCH_PAGE_SIZE]);
  const community_ = controller.getSnapshot().discoverySearch.data.community;
  assert.deepEqual(community_.map(c => c.title), ['Page 1', 'Page 2']);
  assert.equal(controller.getSnapshot().discoverySearch.data.communityHasMore, false);
});

test('a query change resets pagination to a fresh page 1, never appending to the old query\'s results', async () => {
  let call = 0;
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope, limit, offset) => {
      call += 1;
      return discoveryResultsFixture({ community: [communityItemFixture({ id: `obj-${call}`, title: `${q}-${offset}` })], communityHasMore: true });
    },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchScope('COMMUNITY');
  await new Promise(resolve => setTimeout(resolve, 0));
  await controller.loadMoreSearchResults();
  assert.equal(controller.getSnapshot().discoverySearch.data.community.length, 2);

  await controller.submitDiscoverySearch();

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.discoverySearch.data.community.length, 1, 'a fresh search must replace, never append to, the previous query\'s accumulated pages');
  assert.equal(snapshot.searchOffset, 0);
});

test('a scope change resets pagination to a fresh page 1 under the new scope', async () => {
  const scopesAndOffsets = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope, limit, offset) => { scopesAndOffsets.push([scope, offset]); return discoveryResultsFixture({ circles: [], circlesHasMore: false }); },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchScope('COMMUNITY');
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.setSearchScope('CIRCLES');
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(scopesAndOffsets, [['COMMUNITY', 0], ['CIRCLES', 0]]);
  assert.equal(controller.getSnapshot().searchOffset, 0);
});

test('a stale Load more response from an abandoned query can never append after a newer search has started', async () => {
  let resolveStalePage;
  const stalePagePromise = new Promise(resolve => { resolveStalePage = resolve; });
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope, limit, offset) => {
      if (q === 'paint' && offset === api.communityController.SEARCH_PAGE_SIZE) {
        await stalePagePromise;
        return discoveryResultsFixture({ community: [communityItemFixture({ id: 'stale', title: 'Stale page 2' })] });
      }
      return discoveryResultsFixture({ community: [communityItemFixture({ id: `${q}-1`, title: `${q} page 1` })], communityHasMore: true });
    },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchQuery('paint');
  controller.setSearchScope('COMMUNITY');
  await new Promise(resolve => setTimeout(resolve, 0));
  const loadMore = controller.loadMoreSearchResults();

  // A brand-new search starts (e.g. the person changed the query) while the stale "Load more" is
  // still in flight.
  controller.setSearchQuery('plumber');
  await controller.submitDiscoverySearch();
  resolveStalePage();
  await loadMore;

  const snapshot = controller.getSnapshot();
  assert.deepEqual(snapshot.discoverySearch.data.community.map(c => c.title), ['plumber page 1'], 'the stale load-more response must never overwrite or append onto the newer search');
});

test('a Load more failure preserves page 1 and never converts it into an empty/error state', async () => {
  let attempt = 0;
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope, limit, offset) => {
      if (offset === 0) return discoveryResultsFixture({ community: [communityItemFixture({ id: 'page1', title: 'Page 1' })], communityHasMore: true });
      attempt += 1;
      throw new Error('network blip');
    },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchScope('COMMUNITY');
  await new Promise(resolve => setTimeout(resolve, 0));
  await controller.loadMoreSearchResults();

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.discoverySearch.status, 'ready');
  assert.deepEqual(snapshot.discoverySearch.data.community.map(c => c.title), ['Page 1']);
  assert.ok(snapshot.searchLoadMoreError);
  assert.equal(attempt, 1);
});

test('EVERYTHING scope never triggers a Load more request, even if called directly', async () => {
  const searchCalls = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (...args) => { searchCalls.push(args); return discoveryResultsFixture(); },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.openSearch();
  await controller.submitDiscoverySearch();
  searchCalls.length = 0;
  await controller.loadMoreSearchResults();

  assert.equal(searchCalls.length, 0, 'EVERYTHING is a bounded preview -- Load more must be a no-op');
});

test('the UI never renders a "Load more" affordance for the EVERYTHING scope even when a *HasMore flag is true', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /const hasMore = data && scope !== 'EVERYTHING' &&/);
});

test('Store scope Load more advances the real offset -- page 2 is not page 1 repeated', async () => {
  const offsetsRequested = [];
  const community = baseCommunityGateway();
  const discovery = baseDiscoveryGateway({
    search: async (q, scope, limit, offset) => {
      offsetsRequested.push(offset);
      return offset === 0
        ? discoveryResultsFixture({ stores: [{ offerId: 'o1', kind: 'PRODUCT', title: 'Offer 1', priceMinor: null, currency: null, availabilityState: 'AVAILABLE', canonicalKsNumber: 'KS1', displayName: 'Store 1', locationLabel: null }], storesHasMore: true })
        : discoveryResultsFixture({ stores: [{ offerId: 'o2', kind: 'SERVICE', title: 'Offer 2', priceMinor: null, currency: null, availabilityState: 'TAKING_WORK', canonicalKsNumber: 'KS2', displayName: 'Store 2', locationLabel: null }], storesHasMore: false });
    },
  });
  const controller = api.communityController.createCommunityController({ search: async () => [] }, community, discovery);

  controller.setSearchScope('STORES');
  await new Promise(resolve => setTimeout(resolve, 0));
  await controller.loadMoreSearchResults();

  assert.deepEqual(offsetsRequested, [0, api.communityController.SEARCH_PAGE_SIZE]);
  const stores = controller.getSnapshot().discoverySearch.data.stores;
  assert.deepEqual(stores.map(s => s.offerId), ['o1', 'o2']);
});

test('the public directory identity-type contract exposes only INDIVIDUAL and BUSINESS -- never SYSTEM or TEST', async () => {
  const dto = await readFile('src/api/securepay/discovery/dto.ts', 'utf8');
  assert.match(dto, /export type PublicDirectoryIdentityType = 'INDIVIDUAL' \| 'BUSINESS';/);
  assert.doesNotMatch(dto, /identityType: 'INDIVIDUAL' \| 'BUSINESS' \| 'SYSTEM' \| 'TEST'/);

  const experience = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(experience, /const IDENTITY_TYPE_LABEL: Record<PublicDirectoryIdentityType, string> = \{/);
  // Item 6 -- never a ternary against a wider identity-type union.
  assert.doesNotMatch(experience, /identityType === 'BUSINESS' \? 'Business' : 'Person'/);
});
