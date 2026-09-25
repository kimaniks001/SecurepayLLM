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
  return { community: [], circles: [], stores: [], people: [], ...overrides };
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
