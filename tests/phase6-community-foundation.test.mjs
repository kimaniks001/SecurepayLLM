import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Phase 6 (Community Life) Slice 1 -- real Question/Need/Opportunity/Work Story/Discussion authority.
// Covers the API gateway, the controller's create/feed/mine/close orchestration, and the view mapper.
const bundle = await build({ stdin: { contents: `
export * as communityGatewayModule from './src/api/securepay/community';
export * as communityController from './src/features/community/controller';
export * as communityView from './src/features/community/view';
export * as http from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

function fakeHttp() {
  const calls = [];
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth, headers: options.headers, body: options.body }); return { id: 'obj-1' }; } } };
}

const realObject = (overrides = {}) => ({
  id: 'obj-1', objectType: 'NEED', status: 'ACTIVE', title: 'Bathroom repair',
  body: "Looking for someone to repair my mother's bathroom before October.", locationLabel: 'Othaya',
  authorCanonicalKsNumber: 'KS100', authorDisplayName: 'Mary W.',
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null,
  ...overrides,
});

// ─── api/securepay/community -- gateway shape ─────────────────────────

test('createCommunityGateway: create() sends an Idempotency-Key header and the real path, authenticated', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.create('NEED', 'Bathroom repair', 'body text', 'Othaya', 'idem-1');
  assert.equal(calls[0].path, '/api/v1/community/objects');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].auth, 'required');
  assert.equal(calls[0].headers['Idempotency-Key'], 'idem-1');
  assert.deepEqual(calls[0].body, { objectType: 'NEED', title: 'Bathroom repair', body: 'body text', locationLabel: 'Othaya' });
});

test('createCommunityGateway: feed() and get() are readable without requiring authentication', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.feed();
  await gateway.get('obj-1');
  assert.equal(calls[0].auth, 'optional');
  assert.equal(calls[1].auth, 'optional');
  assert.match(calls[1].path, /\/api\/v1\/community\/objects\/obj-1$/);
});

test('createCommunityGateway: mine() and close() require authentication', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.mine();
  await gateway.close('obj-1');
  assert.equal(calls[0].auth, 'required');
  assert.equal(calls[1].auth, 'required');
  assert.equal(calls[1].method, 'POST');
  assert.match(calls[1].path, /\/api\/v1\/community\/objects\/obj-1\/close$/);
});

// ─── features/community/view.ts -- realObjectToCommunityObject ─────────────────────────

test('realObjectToCommunityObject: maps every real backend object type to the UI type, with no fabricated responses', () => {
  const mapping = [
    ['QUESTION', 'question'], ['NEED', 'need'], ['OPPORTUNITY', 'opportunity'],
    ['WORK_STORY', 'work_story'], ['DISCUSSION', 'discussion'],
  ];
  for (const [backend, ui] of mapping) {
    const mapped = api.communityView.realObjectToCommunityObject(realObject({ objectType: backend }));
    assert.equal(mapped.objectType, ui);
    assert.deepEqual(mapped.responses, []);
  }
});

test('realObjectToCommunityObject: uses the server-resolved author display name, never a client-invented one', () => {
  const mapped = api.communityView.realObjectToCommunityObject(realObject({ authorDisplayName: 'Keyman Electrical' }));
  assert.equal(mapped.author, 'Keyman Electrical');
  assert.match(mapped.provenance, /KS100/);
});

test('realObjectToCommunityObject: falls back to the canonical KS number when no display name is set, never a fabricated one', () => {
  const mapped = api.communityView.realObjectToCommunityObject(realObject({ authorDisplayName: null }));
  assert.equal(mapped.author, 'KS100');
});

test('realObjectToCommunityObject: status maps ACTIVE/CLOSED/REMOVED to the UI vocabulary honestly', () => {
  assert.equal(api.communityView.realObjectToCommunityObject(realObject({ status: 'ACTIVE' })).status, 'active');
  assert.equal(api.communityView.realObjectToCommunityObject(realObject({ status: 'CLOSED' })).status, 'closed');
  assert.equal(api.communityView.realObjectToCommunityObject(realObject({ status: 'REMOVED' })).status, 'withdrawn');
});

// ─── features/community/controller.ts -- real create/feed/mine/close orchestration ─────────────────────────

function fakeCommunityGateway(overrides = {}) {
  const calls = [];
  return {
    calls,
    gateway: {
      create: async (...args) => { calls.push(['create', ...args]); return overrides.create ? overrides.create(...args) : realObject(); },
      feed: async () => { calls.push(['feed']); return overrides.feed ? overrides.feed() : [realObject()]; },
      mine: async () => { calls.push(['mine']); return overrides.mine ? overrides.mine() : []; },
      get: async (id) => { calls.push(['get', id]); return realObject({ id }); },
      close: async (id) => { calls.push(['close', id]); return overrides.close ? overrides.close(id) : realObject({ id, status: 'CLOSED', closedAt: '2026-09-02T00:00:00Z' }); },
    },
  };
}
const storeGatewayStub = { search: async () => [] };

test('controller.enter loads the real feed and never crashes when signed out (mine() rejecting)', async () => {
  const { gateway } = fakeCommunityGateway({ mine: async () => { throw new Error('401'); } });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  const snap = controller.getSnapshot();
  assert.equal(snap.feed.status, 'ready');
  assert.equal(snap.feed.data.length, 1);
  assert.deepEqual([...snap.ownObjectIds], []);
});

test('controller.enter records the caller\'s own object ids from mine() when signed in', async () => {
  const { gateway } = fakeCommunityGateway({ mine: async () => [realObject({ id: 'mine-1' })] });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  assert.ok(controller.getSnapshot().ownObjectIds.has('mine-1'));
});

test('controller.submitCompose validates locally before calling the gateway', async () => {
  const { gateway, calls } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  await controller.submitCompose();
  assert.equal(controller.getSnapshot().draft.error, 'Choose what you would like to share.');
  controller.setComposeType('need');
  await controller.submitCompose();
  assert.match(controller.getSnapshot().draft.error, /title/);
  assert.equal(calls.filter(c => c[0] === 'create').length, 0);
});

test('controller.submitCompose creates a real object, adds it to the feed and to ownObjectIds, and returns home', async () => {
  const { gateway, calls } = fakeCommunityGateway({ create: async (type) => realObject({ objectType: type, id: 'created-1' }) });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  controller.setComposeType('need');
  controller.setComposeField('title', 'Bathroom repair');
  controller.setComposeField('body', "Looking for someone to repair my mother's bathroom before October.");
  await controller.submitCompose();

  const snap = controller.getSnapshot();
  assert.equal(snap.view, 'home');
  assert.equal(calls[0][0], 'create');
  assert.equal(calls[0][1], 'NEED'); // the backend enum spelling, never the lowercase UI spelling
  assert.ok(snap.feed.status === 'ready' && snap.feed.data.some(o => o.id === 'created-1'));
  assert.ok(snap.ownObjectIds.has('created-1'));
  assert.match(snap.notice, /Shared/);
});

test('controller.submitCompose surfaces a gateway failure without losing the draft', async () => {
  const { gateway } = fakeCommunityGateway({ create: async () => { throw new Error('boom'); } });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  controller.setComposeType('need');
  controller.setComposeField('title', 'x');
  controller.setComposeField('body', 'y');
  await controller.submitCompose();
  const snap = controller.getSnapshot();
  assert.equal(snap.view, 'compose');
  assert.ok(snap.draft.error);
  assert.equal(snap.draft.submitting, false);
});

test('controller.closeObject updates the object in place and shows a notice', async () => {
  const { gateway, calls } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  await controller.closeObject('obj-1');
  assert.equal(calls.filter(c => c[0] === 'close').length, 1);
  const snap = controller.getSnapshot();
  assert.equal(snap.selectedRealObject.status, 'CLOSED');
  assert.match(snap.notice, /Closed/);
});

test('controller.cancelComposer discards the draft without calling the gateway', async () => {
  const { gateway, calls } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  controller.setComposeType('question');
  controller.setComposeField('title', 'abandoned');
  controller.cancelComposer();
  assert.equal(controller.getSnapshot().view, 'home');
  assert.equal(controller.getSnapshot().draft.title, '');
  assert.equal(calls.length, 0);
});

// ─── Source-level doctrine checks ─────────────────────────

test('CommunityExperience wires the real composer (CommunityCreatePanel), never the fixture-only CommunityComposer', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /CommunityCreatePanel/);
  assert.doesNotMatch(contents, /from '\.\.\/\.\.\/components\/CommunityComposer'/);
});

test('CommunityExperience never creates Agreement/handoff/payment authority from a real Community object', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /agreementGateway|handoffController|createHandoff|adoptHandoff|confirmVersion|moneyGateway/);
});

test('CommunityObjectDetail only offers Close to the real, own, still-ACTIVE object (author-only, backend-enforced regardless)', async () => {
  const contents = await readFile('src/components/CommunityObjectDetail.tsx', 'utf8');
  assert.match(contents, /onClose/);
  assert.match(contents, /object\.status === 'active'/);
});

test('CommunityCreatePanel presents the exact five real Community composer options, no more, no fewer', async () => {
  const contents = await readFile('src/features/community/controller.ts', 'utf8');
  for (const label of ['Ask a question', 'Post a need', 'Share an opportunity', 'Share a work story', 'Start a discussion']) {
    assert.match(contents, new RegExp(label));
  }
});
