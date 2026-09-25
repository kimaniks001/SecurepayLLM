import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Phase 6 (Community Life) Slice 3 -- Named Circles ("the homes inside The Trust Project").
const bundle = await build({ stdin: { contents: `
export * as communityGatewayModule from './src/api/securepay/community';
export * as communityController from './src/features/community/controller';
export * as http from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

function fakeHttp() {
  const calls = [];
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth, headers: options.headers, body: options.body }); return {}; } } };
}

// ─── api/securepay/community -- Slice 3 circles gateway shape ─────────────────────────

test('gateway: circles.create/discover/mine/get/close hit the real per-circle paths, authenticated', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.circles.create('Name', 'Purpose', 'OPEN', 'PUBLIC', 'Cat', 'Loc', 'key-1');
  await gateway.circles.discover();
  await gateway.circles.mine();
  await gateway.circles.get('circle-1');
  await gateway.circles.close('circle-1');
  assert.equal(calls[0].path, '/api/v1/community/circles');
  assert.equal(calls[0].headers['Idempotency-Key'], 'key-1');
  assert.deepEqual(calls[0].body, { name: 'Name', purpose: 'Purpose', membershipMode: 'OPEN', visibility: 'PUBLIC', categoryLabel: 'Cat', locationLabel: 'Loc' });
  assert.match(calls[1].path, /\/api\/v1\/community\/circles\?/);
  assert.equal(calls[2].path, '/api/v1/community/circles/mine?limit=50&offset=0');
  assert.equal(calls[3].path, '/api/v1/community/circles/circle-1');
  assert.equal(calls[4].path, '/api/v1/community/circles/circle-1/close');
  assert.ok(calls.every(c => c.auth === 'required'));
});

test('gateway: circles.join/request/invite/acceptInvitation/declineInvitation/leave hit the real paths', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.circles.join('circle-1', 'k1');
  await gateway.circles.request('circle-1', 'k2');
  await gateway.circles.invite('circle-1', 'KS200', 'k3');
  await gateway.circles.acceptInvitation('circle-1');
  await gateway.circles.declineInvitation('circle-1');
  await gateway.circles.leave('circle-1');
  assert.equal(calls[0].path, '/api/v1/community/circles/circle-1/join');
  assert.equal(calls[0].headers['Idempotency-Key'], 'k1');
  assert.equal(calls[1].path, '/api/v1/community/circles/circle-1/requests');
  assert.equal(calls[2].path, '/api/v1/community/circles/circle-1/invitations');
  assert.deepEqual(calls[2].body, { inviteeCanonicalKsNumber: 'KS200' });
  assert.equal(calls[3].path, '/api/v1/community/circles/circle-1/invitations/accept');
  assert.equal(calls[4].path, '/api/v1/community/circles/circle-1/invitations/decline');
  assert.equal(calls[5].path, '/api/v1/community/circles/circle-1/leave');
});

test('gateway: circles.objects.create/list hit the real Circle-scoped object paths', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.circles.objects.create('circle-1', 'QUESTION', 'Q', 'body', null, 'k1');
  await gateway.circles.objects.list('circle-1');
  assert.equal(calls[0].path, '/api/v1/community/circles/circle-1/objects');
  assert.equal(calls[0].headers['Idempotency-Key'], 'k1');
  assert.match(calls[1].path, /\/api\/v1\/community\/circles\/circle-1\/objects\?/);
});

// ─── controller.ts -- Slice 3 Circle state machine ─────────────────────────

function fakeCircleGateway(overrides = {}) {
  const calls = [];
  return {
    calls,
    gateway: {
      create: async () => { throw new Error('not used'); },
      feed: async () => { calls.push(['feed']); return []; },
      mine: async () => { calls.push(['mine']); return []; },
      get: async () => { throw new Error('not used'); },
      close: async () => { throw new Error('not used'); },
      membership: {
        me: async () => { calls.push(['membership.me']); return { status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }; },
        invite: async () => { throw new Error('not used'); },
        accept: async () => { throw new Error('not used'); },
        decline: async () => { throw new Error('not used'); },
      },
      replies: { create: async () => { throw new Error('not used'); }, list: async () => [], withdraw: async () => { throw new Error('not used'); } },
      help: { offer: async () => { throw new Error('not used'); }, list: async () => [], withdraw: async () => { throw new Error('not used'); } },
      principles: async () => [],
      circles: {
        create: async (...args) => { calls.push(['circles.create', ...args]); return overrides.create ? overrides.create(...args) : (() => { throw new Error('not used'); })(); },
        discover: async (...args) => { calls.push(['circles.discover', ...args]); return overrides.discover ? overrides.discover(...args) : []; },
        mine: async (...args) => { calls.push(['circles.mine', ...args]); return overrides.mine ? overrides.mine(...args) : []; },
        get: async (...args) => { calls.push(['circles.get', ...args]); return overrides.get ? overrides.get(...args) : circleFixture(args[0]); },
        close: async (...args) => { calls.push(['circles.close', ...args]); return overrides.close ? overrides.close(...args) : (() => { throw new Error('not used'); })(); },
        membership: async (...args) => { calls.push(['circles.membership', ...args]); return overrides.membership ? overrides.membership(...args) : { status: null, isOwner: false, invitedByDisplayName: null, createdAt: null, respondedAt: null }; },
        join: async (...args) => { calls.push(['circles.join', ...args]); return overrides.join ? overrides.join(...args) : (() => { throw new Error('not used'); })(); },
        request: async (...args) => { calls.push(['circles.request', ...args]); return overrides.request ? overrides.request(...args) : (() => { throw new Error('not used'); })(); },
        pendingRequests: async (...args) => { calls.push(['circles.pendingRequests', ...args]); return overrides.pendingRequests ? overrides.pendingRequests(...args) : []; },
        approveRequest: async (...args) => { calls.push(['circles.approveRequest', ...args]); return overrides.approveRequest ? overrides.approveRequest(...args) : (() => { throw new Error('not used'); })(); },
        declineRequest: async (...args) => { calls.push(['circles.declineRequest', ...args]); return overrides.declineRequest ? overrides.declineRequest(...args) : (() => { throw new Error('not used'); })(); },
        invite: async (...args) => { calls.push(['circles.invite', ...args]); return overrides.invite ? overrides.invite(...args) : (() => { throw new Error('not used'); })(); },
        acceptInvitation: async (...args) => { calls.push(['circles.acceptInvitation', ...args]); return overrides.acceptInvitation ? overrides.acceptInvitation(...args) : (() => { throw new Error('not used'); })(); },
        declineInvitation: async (...args) => { calls.push(['circles.declineInvitation', ...args]); return overrides.declineInvitation ? overrides.declineInvitation(...args) : (() => { throw new Error('not used'); })(); },
        leave: async (...args) => { calls.push(['circles.leave', ...args]); return overrides.leave ? overrides.leave(...args) : (() => { throw new Error('not used'); })(); },
        removeMember: async (...args) => { calls.push(['circles.removeMember', ...args]); return overrides.removeMember ? overrides.removeMember(...args) : (() => { throw new Error('not used'); })(); },
        members: async (...args) => { calls.push(['circles.members', ...args]); return overrides.members ? overrides.members(...args) : []; },
        objects: {
          create: async (...args) => { calls.push(['circles.objects.create', ...args]); return overrides.objectsCreate ? overrides.objectsCreate(...args) : (() => { throw new Error('not used'); })(); },
          list: async (...args) => { calls.push(['circles.objects.list', ...args]); return overrides.objectsList ? overrides.objectsList(...args) : []; },
        },
      },
    },
  };
}
function circleFixture(id, overrides = {}) {
  return {
    id, name: 'Test Circle', purpose: 'A place to test.', membershipMode: 'OPEN', visibility: 'PUBLIC', categoryLabel: null, locationLabel: null,
    status: 'ACTIVE', creatorCanonicalKsNumber: 'KS999', creatorDisplayName: 'Someone', memberCount: 3,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null, ...overrides,
  };
}
const storeGatewayStub = { search: async () => [] };

test('controller.showCommunityTab("circles") loads Your Circles from real backend data', async () => {
  const { gateway, calls } = fakeCircleGateway({ mine: async () => [circleFixture('circle-1')] });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.showCommunityTab('circles');
  assert.equal(controller.getSnapshot().communityTab, 'circles');
  assert.equal(controller.getSnapshot().myCircles.status, 'ready');
  assert.equal(controller.getSnapshot().myCircles.data[0].id, 'circle-1');
  assert.ok(calls.some(c => c[0] === 'circles.mine'));
});

test('controller.showCommunityTab("discover") loads Discover Circles from real backend data', async () => {
  const { gateway, calls } = fakeCircleGateway({ discover: async () => [circleFixture('circle-2')] });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.showCommunityTab('discover');
  assert.equal(controller.getSnapshot().discoverCircles.status, 'ready');
  assert.equal(controller.getSnapshot().discoverCircles.data[0].id, 'circle-2');
  assert.ok(calls.some(c => c[0] === 'circles.discover'));
});

test('controller.openCircle loads the Circle feed for an ACTIVE member', async () => {
  const { gateway } = fakeCircleGateway({
    membership: async () => ({ status: 'ACTIVE', isOwner: false, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    objectsList: async () => [{ id: 'obj-1', objectType: 'QUESTION', status: 'ACTIVE', title: 'Q', body: 'B', locationLabel: null, authorCanonicalKsNumber: null, authorDisplayName: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null, circleId: 'circle-1' }],
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().view, 'circleDetail');
  assert.equal(controller.getSnapshot().circleMembership.data.status, 'ACTIVE');
  assert.equal(controller.getSnapshot().circleObjects.status, 'ready');
  assert.equal(controller.getSnapshot().circleObjects.data[0].id, 'obj-1');
});

test('controller.openCircle never fetches the scoped feed for a non-member -- private content is never even requested', async () => {
  const { gateway, calls } = fakeCircleGateway({
    membership: async () => ({ status: null, isOwner: false, invitedByDisplayName: null, createdAt: null, respondedAt: null }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().circleObjects.status, 'idle');
  assert.ok(!calls.some(c => c[0] === 'circles.objects.list'));
});

test('an INVITE_ONLY Circle for a non-invited caller gets a truthful null membership state (never fabricated)', async () => {
  const { gateway } = fakeCircleGateway({
    get: async id => circleFixture(id, { membershipMode: 'INVITE_ONLY' }),
    membership: async () => ({ status: null, isOwner: false, invitedByDisplayName: null, createdAt: null, respondedAt: null }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().selectedCircle.membershipMode, 'INVITE_ONLY');
  assert.equal(controller.getSnapshot().circleMembership.data.status, null);
});

test('an invited member sees INVITED status and can accept, converging to ACTIVE and loading the feed', async () => {
  let accepted = false;
  const { gateway } = fakeCircleGateway({
    membership: async () => accepted
      ? { status: 'ACTIVE', isOwner: false, invitedByDisplayName: 'Mary W.', createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-02T00:00:00Z' }
      : { status: 'INVITED', isOwner: false, invitedByDisplayName: 'Mary W.', createdAt: '2026-09-01T00:00:00Z', respondedAt: null },
    acceptInvitation: async () => { accepted = true; },
    objectsList: async () => [],
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().circleMembership.data.status, 'INVITED');

  await controller.acceptCircleInvitation();
  assert.equal(controller.getSnapshot().circleMembership.data.status, 'ACTIVE');
});

test('an invited member can decline, converging to DECLINED', async () => {
  let declined = false;
  const { gateway } = fakeCircleGateway({
    membership: async () => declined
      ? { status: 'DECLINED', isOwner: false, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-02T00:00:00Z' }
      : { status: 'INVITED', isOwner: false, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: null },
    declineInvitation: async () => { declined = true; },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  await controller.declineCircleInvitation();
  assert.equal(controller.getSnapshot().circleMembership.data.status, 'DECLINED');
});

test('correction-pattern: joinCircle reuses the SAME idempotency key across a failed attempt and a retry', async () => {
  let attempt = 0;
  const usedKeys = [];
  const { gateway } = fakeCircleGateway({
    join: async (circleId, key) => {
      usedKeys.push(key);
      attempt += 1;
      if (attempt === 1) throw new Error('network blip');
    },
    membership: async () => attempt >= 2
      ? { status: 'ACTIVE', isOwner: false, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }
      : { status: null, isOwner: false, invitedByDisplayName: null, createdAt: null, respondedAt: null },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  const openedKey = controller.getSnapshot().circleJoinIntentKey;
  assert.ok(openedKey);

  await controller.joinCircle(); // fails (attempt 1)
  assert.ok(controller.getSnapshot().circleJoinError);
  await controller.joinCircle(); // retries (attempt 2) -- succeeds

  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], openedKey);
  assert.equal(usedKeys[1], openedKey);
});

test('correction-pattern: requestToJoinCircle reuses the SAME idempotency key across a retry', async () => {
  let attempt = 0;
  const usedKeys = [];
  const { gateway } = fakeCircleGateway({
    get: async id => circleFixture(id, { membershipMode: 'REQUEST_TO_JOIN' }),
    request: async (circleId, key) => {
      usedKeys.push(key);
      attempt += 1;
      if (attempt === 1) throw new Error('network blip');
    },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  const openedKey = controller.getSnapshot().circleJoinIntentKey;

  await controller.requestToJoinCircle();
  await controller.requestToJoinCircle();

  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], openedKey);
  assert.equal(usedKeys[1], openedKey);
});

test('correction-pattern: submitCreateCircle reuses the SAME idempotency key across a failed attempt and a retry', async () => {
  let attempt = 0;
  const usedKeys = [];
  const { gateway } = fakeCircleGateway({
    create: async (name, purpose, mode, visibility, cat, loc, key) => {
      usedKeys.push(key);
      attempt += 1;
      if (attempt === 1) throw new Error('network blip');
      return circleFixture('new-circle');
    },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openCreateCircle();
  const openedKey = controller.getSnapshot().createCircleDraft.idempotencyKey;
  controller.setCreateCircleField('name', 'N');
  controller.setCreateCircleField('purpose', 'P');

  await controller.submitCreateCircle(); // fails (attempt 1)
  assert.ok(controller.getSnapshot().createCircleDraft.error);
  assert.equal(controller.getSnapshot().createCircleDraft.idempotencyKey, openedKey);

  await controller.submitCreateCircle(); // retries -- succeeds
  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], openedKey);
  assert.equal(usedKeys[1], openedKey);
});

test('correction-pattern: submitCircleCompose reuses the SAME idempotency key across a retry', async () => {
  let attempt = 0;
  const usedKeys = [];
  const { gateway } = fakeCircleGateway({
    membership: async () => ({ status: 'ACTIVE', isOwner: false, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    objectsCreate: async (circleId, type, title, body, loc, key) => {
      usedKeys.push(key);
      attempt += 1;
      if (attempt === 1) throw new Error('network blip');
      return { id: 'obj-1', objectType: type, status: 'ACTIVE', title, body, locationLabel: loc, authorCanonicalKsNumber: null, authorDisplayName: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null, circleId };
    },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  controller.openCircleComposer();
  const openedKey = controller.getSnapshot().circleComposeDraft.idempotencyKey;
  controller.setCircleComposeType('question');
  controller.setCircleComposeField('title', 'T');
  controller.setCircleComposeField('body', 'B');

  await controller.submitCircleCompose(); // fails
  await controller.submitCircleCompose(); // retries -- succeeds

  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], openedKey);
  assert.equal(usedKeys[1], openedKey);
});

test('private Circle content never reaches Community LIVE state -- feed() and circles.objects.list() populate entirely separate state', async () => {
  const { gateway, calls } = fakeCircleGateway({
    membership: async () => ({ status: 'ACTIVE', isOwner: false, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    objectsList: async () => [{ id: 'circle-obj', objectType: 'QUESTION', status: 'ACTIVE', title: 'Circle-only', body: 'B', locationLabel: null, authorCanonicalKsNumber: null, authorDisplayName: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null, circleId: 'circle-1' }],
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().circleObjects.data[0].id, 'circle-obj');
  // Community LIVE's own feed() was never called by any Circle action.
  assert.ok(!calls.some(c => c[0] === 'feed'));
  assert.equal(controller.getSnapshot().feed.status, 'idle');
});

// ─── Source-level doctrine checks ─────────────────────────

test('Community Home distinguishes Community LIVE, Your Circles, and Discover Circles', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /Community LIVE/);
  assert.match(contents, /Your Circles/);
  assert.match(contents, /Discover Circles/);
});

test('the old per-identity Circle profile entry point is unchanged and never confused with named Circles', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /circlesEntryLabel="Your Circle profile"/);
  assert.match(contents, /Not a named Circle or group\./);
});

test('no fixture/hardcoded named Circle content exists in the production Circle UI path', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  // The mandate's own conceptual examples must never appear as if they were real, seeded data.
  assert.doesNotMatch(contents, /Builders in Nyeri|Parents Improving Aging Homes|Solar Installers|Young Surveyors|ShortStay Hosts/);
});

test('Circle actions never call Agreement/handoff/payment/Money authority', async () => {
  const controllerSource = await readFile('src/features/community/controller.ts', 'utf8');
  assert.doesNotMatch(controllerSource, /agreementGateway|handoffController|createHandoff|adoptHandoff|confirmVersion|moneyGateway|paymentIntent/);
});

test('Circle creation copy never claims partnership, joint venture, or commercial alliance', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /Not a partnership, joint/);
});

// ─── Pre-merge completion pass: visibility, owner UI, honest lifecycle copy ─────────────────────────

test('the create-Circle UI offers visibility as a SEPARATE choice from membership mode', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /How do people join\?/);
  assert.match(contents, /Who can find this Circle\?/);
});

test('the invite-only copy correction: the Circle owner, never "an existing member", is named as the real invitation authority', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /an existing member must invite you/);
  assert.match(contents, /The Circle owner must invite you before you can join/);
});

test('the Circle-scoped post Close action is driven by the server-derived canClose field, never the LIVE-only ownObjectIds set', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /state\.selectedRealObject\.canClose/);
});

test('the owner-leave copy never tells the owner to perform an unsupported stewardship transfer', async () => {
  const controllerSource = await readFile('src/features/community/controller.ts', 'utf8');
  assert.doesNotMatch(controllerSource, /transfer Circle stewardship/i);
});

test('controller.openCreateCircle defaults visibility to PUBLIC and submitCreateCircle sends the chosen visibility', async () => {
  const { gateway, calls } = fakeCircleGateway({ create: async () => circleFixture('new-circle', { visibility: 'PRIVATE' }) });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openCreateCircle();
  assert.equal(controller.getSnapshot().createCircleDraft.visibility, 'PUBLIC');

  controller.setCreateCircleVisibility('PRIVATE');
  controller.setCreateCircleField('name', 'N');
  controller.setCreateCircleField('purpose', 'P');
  await controller.submitCreateCircle();

  const createCall = calls.find(c => c[0] === 'circles.create');
  assert.equal(createCall[4], 'PRIVATE'); // (name, purpose, membershipMode, visibility, ...)
});

test('controller: an owner can approve and decline pending Circle requests, refreshing the queue afterward', async () => {
  let approved = false;
  const { gateway, calls } = fakeCircleGateway({
    get: id => circleFixture(id, { membershipMode: 'REQUEST_TO_JOIN' }),
    membership: async () => ({ status: 'ACTIVE', isOwner: true, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    pendingRequests: async () => (approved ? [] : [{ membershipId: 'req-1', requesterCanonicalKsNumber: 'KS200', requesterDisplayName: 'Mary W.', requestedAt: '2026-09-01T00:00:00Z' }]),
    approveRequest: async () => { approved = true; },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().circlePendingRequests.data.length, 1);

  await controller.approveCircleRequest('req-1');

  assert.ok(calls.some(c => c[0] === 'circles.approveRequest' && c[2] === 'req-1'));
  assert.equal(controller.getSnapshot().circlePendingRequests.data.length, 0);
});

test('controller: an owner can remove a member, refreshing the member list afterward', async () => {
  let removed = false;
  const { gateway, calls } = fakeCircleGateway({
    membership: async () => ({ status: 'ACTIVE', isOwner: true, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    members: async () => (removed
      ? [{ membershipId: 'owner-m', canonicalKsNumber: 'KS999', displayName: 'Owner' }]
      : [{ membershipId: 'owner-m', canonicalKsNumber: 'KS999', displayName: 'Owner' }, { membershipId: 'member-m', canonicalKsNumber: 'KS200', displayName: 'Mary W.' }]),
    removeMember: async () => { removed = true; },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  assert.equal(controller.getSnapshot().circleMembers.data.length, 2);

  await controller.removeCircleMember('member-m');

  assert.ok(calls.some(c => c[0] === 'circles.removeMember' && c[2] === 'member-m'));
  assert.equal(controller.getSnapshot().circleMembers.data.length, 1);
});

test('controller: an owner can close their Circle after explicit confirmation, and the closed status is reflected immediately', async () => {
  const { gateway, calls } = fakeCircleGateway({
    membership: async () => ({ status: 'ACTIVE', isOwner: true, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    close: async () => circleFixture('circle-1', { status: 'CLOSED' }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  controller.openCircleCloseConfirm();
  assert.equal(controller.getSnapshot().circleCloseConfirmOpen, true);

  await controller.confirmCloseCircle();

  assert.ok(calls.some(c => c[0] === 'circles.close'));
  assert.equal(controller.getSnapshot().selectedCircle.status, 'CLOSED');
  assert.equal(controller.getSnapshot().circleCloseConfirmOpen, false);
});

test('correction-pattern: submitCircleInvite binds its idempotency key to the first attempted target, exactly like Trust Project invitation', async () => {
  let attempt = 0;
  const usedPairs = [];
  const { gateway } = fakeCircleGateway({
    membership: async () => ({ status: 'ACTIVE', isOwner: true, invitedByDisplayName: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
    invite: async (circleId, target, key) => {
      usedPairs.push([target, key]);
      attempt += 1;
      if (attempt === 1) throw new Error('network blip');
    },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.openCircle('circle-1');
  controller.openCircleInvite();
  const openedKey = controller.getSnapshot().circleInviteDraft.idempotencyKey;

  controller.setCircleInviteKsNumber('KS200');
  await controller.submitCircleInvite(); // fails (attempt 1) -- binds target+key
  assert.equal(controller.getSnapshot().circleInviteDraft.attemptedTargetKsNumber, 'KS200');

  // An edit attempted after the first remote attempt is refused.
  controller.setCircleInviteKsNumber('KS201');
  assert.equal(controller.getSnapshot().circleInviteDraft.ksNumber, 'KS200');

  await controller.submitCircleInvite(); // retries -- succeeds, reusing the exact same pair
  assert.ok(controller.getSnapshot().circleInviteDraft.sent);

  assert.equal(usedPairs.length, 2);
  assert.deepEqual(usedPairs[0], ['KS200', openedKey]);
  assert.deepEqual(usedPairs[1], ['KS200', openedKey]);
});
