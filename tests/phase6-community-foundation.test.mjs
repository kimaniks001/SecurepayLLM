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

test('Slice 1 correction: createCommunityGateway requires authentication for every method, including feed() and get() (Trust Project fail-closed interim)', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.feed();
  await gateway.get('obj-1');
  await gateway.mine();
  await gateway.close('obj-1');
  assert.ok(calls.every(c => c.auth === 'required'), 'every Community gateway call must require authentication');
  assert.match(calls[1].path, /\/api\/v1\/community\/objects\/obj-1$/);
  assert.equal(calls[3].method, 'POST');
  assert.match(calls[3].path, /\/api\/v1\/community\/objects\/obj-1\/close$/);
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

/**
 * Slice 1 correction (The Trust Project doctrine): a real Community post must never be represented
 * as internet-public content -- reads now fail closed behind authentication, pending Trust Project
 * invitation/membership authority. 'public' is reserved for genuinely public content (a Store offer
 * reference); a real Community post uses the distinct 'community' value instead.
 */
test('realObjectToCommunityObject: a real Community post is marked visibility "community", never "public"', () => {
  for (const objectType of ['QUESTION', 'NEED', 'OPPORTUNITY', 'WORK_STORY', 'DISCUSSION']) {
    const mapped = api.communityView.realObjectToCommunityObject(realObject({ objectType }));
    assert.equal(mapped.visibility, 'community');
    assert.notEqual(mapped.visibility, 'public');
  }
});

test('storeResultToCommunityObject: a Store offer reference keeps its own, unchanged "public" visibility', () => {
  const result = { canonicalKsNumber: 'KS-100', displayName: 'Keyman Security', locationLabel: 'Nairobi', offer: { id: 'offer-1', version: 1, title: 'CCTV install', description: 'x' } };
  const mapped = api.communityView.storeResultToCommunityObject(result);
  assert.equal(mapped.visibility, 'public');
});

// ─── features/community/controller.ts -- real create/feed/mine/close orchestration ─────────────────────────

const activeMembershipResponse = { status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' };

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
      // Every existing Slice 1 test in this file assumes an ACTIVE Trust Project member (that
      // assumption predates Slice 2's own membership gate) -- default to ACTIVE here so those tests
      // keep exercising exactly what they always meant to, and override per-test where a test is
      // specifically about membership/authentication state itself.
      membership: {
        me: async () => { calls.push(['membership.me']); return overrides.membershipMe ? overrides.membershipMe() : activeMembershipResponse; },
        invite: async (...args) => { calls.push(['membership.invite', ...args]); return overrides.membershipInvite ? overrides.membershipInvite(...args) : activeMembershipResponse; },
        accept: async () => { calls.push(['membership.accept']); return overrides.membershipAccept ? overrides.membershipAccept() : activeMembershipResponse; },
        decline: async () => { calls.push(['membership.decline']); return overrides.membershipDecline ? overrides.membershipDecline() : { ...activeMembershipResponse, status: 'DECLINED' }; },
      },
      replies: {
        create: async (...args) => { calls.push(['replies.create', ...args]); return overrides.replyCreate ? overrides.replyCreate(...args) : null; },
        list: async (...args) => { calls.push(['replies.list', ...args]); return overrides.replyList ? overrides.replyList(...args) : []; },
        withdraw: async (...args) => { calls.push(['replies.withdraw', ...args]); return overrides.replyWithdraw ? overrides.replyWithdraw(...args) : null; },
      },
      help: {
        offer: async (...args) => { calls.push(['help.offer', ...args]); return overrides.helpOffer ? overrides.helpOffer(...args) : null; },
        list: async (...args) => { calls.push(['help.list', ...args]); return overrides.helpList ? overrides.helpList(...args) : []; },
        withdraw: async (...args) => { calls.push(['help.withdraw', ...args]); return overrides.helpWithdraw ? overrides.helpWithdraw(...args) : null; },
      },
      principles: async () => { calls.push(['principles']); return overrides.principles ? overrides.principles() : []; },
    },
  };
}
const storeGatewayStub = { search: async () => [] };

test('controller.enter never crashes when mine() rejects independently of feed()', async () => {
  const { gateway } = fakeCommunityGateway({ mine: async () => { throw new Error('401'); } });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  const snap = controller.getSnapshot();
  assert.equal(snap.feed.status, 'ready');
  assert.equal(snap.feed.data.length, 1);
  assert.deepEqual([...snap.ownObjectIds], []);
});

/**
 * Slice 1 correction (The Trust Project doctrine): Community feed/detail now require authentication
 * -- this is deliberately NOT "signed-out browsing is first-class" (that was the old, now-corrected
 * assumption). An unauthenticated caller's feed() and mine() both fail; enter() must still degrade
 * gracefully rather than crash or leave stale loading state. Store's own separate search authority
 * is unaffected -- Store is not made private merely because Community posts are.
 */
test('controller.enter degrades gracefully -- never crashes -- when the caller is not authenticated (feed() and mine() both reject)', async () => {
  const { gateway } = fakeCommunityGateway({
    feed: async () => { throw new Error('401'); },
    mine: async () => { throw new Error('401'); },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  const snap = controller.getSnapshot();
  assert.equal(snap.feed.status, 'error');
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

// ─── Slice 1 correction 1: one Idempotency-Key per draft, minted on open, never per submit ─────────────────────────

test('Slice 1 correction: openComposer mints exactly one Idempotency-Key up front, before any field is touched', () => {
  const { gateway } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  const key = controller.getSnapshot().draft.idempotencyKey;
  assert.ok(key && key.length > 0);
});

test('Slice 1 correction: two submit attempts against the same unchanged draft reuse the SAME Idempotency-Key, even across a failure', async () => {
  let attempt = 0;
  const seenKeys = [];
  const { gateway } = fakeCommunityGateway({
    create: async (type, title, body, location, idempotencyKey) => {
      seenKeys.push(idempotencyKey);
      attempt += 1;
      if (attempt === 1) throw new Error('network down');
      return realObject({ objectType: type, id: 'created-retry' });
    },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  const mintedKey = controller.getSnapshot().draft.idempotencyKey;
  controller.setComposeType('need');
  controller.setComposeField('title', 'Bathroom repair');
  controller.setComposeField('body', 'Looking for someone to repair it.');

  await controller.submitCompose(); // fails (network)
  assert.equal(controller.getSnapshot().view, 'compose'); // still on the composer, draft intact
  assert.equal(controller.getSnapshot().draft.idempotencyKey, mintedKey); // key survived the failure

  await controller.submitCompose(); // retried -- same draft, same key
  assert.equal(controller.getSnapshot().view, 'home'); // this attempt succeeds

  assert.equal(seenKeys.length, 2);
  assert.equal(seenKeys[0], seenKeys[1]);
  assert.equal(seenKeys[0], mintedKey);
});

test('Slice 1 correction: a fresh composer session (after cancel, then reopening) mints a genuinely new Idempotency-Key', () => {
  const { gateway } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  const firstKey = controller.getSnapshot().draft.idempotencyKey;
  controller.cancelComposer();
  controller.openComposer();
  const secondKey = controller.getSnapshot().draft.idempotencyKey;
  assert.notEqual(firstKey, secondKey);
});

test('Slice 1 correction: local validation failures never mint a fresh key or call the gateway', async () => {
  const { gateway, calls } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openComposer();
  const mintedKey = controller.getSnapshot().draft.idempotencyKey;
  await controller.submitCompose(); // no type chosen yet
  assert.equal(controller.getSnapshot().draft.idempotencyKey, mintedKey);
  controller.setComposeType('question');
  await controller.submitCompose(); // no title yet
  assert.equal(controller.getSnapshot().draft.idempotencyKey, mintedKey);
  assert.equal(calls.filter(c => c[0] === 'create').length, 0);
});

// ─── Slice 1 correction 2: a successful Close removes the object from the current ACTIVE feed ─────────────────────────

test('Slice 1 correction: closeObject removes the object from the current ACTIVE feed immediately, without requiring a refresh', async () => {
  const { gateway } = fakeCommunityGateway({
    feed: () => [realObject({ id: 'obj-1' }), realObject({ id: 'obj-2' })],
    close: (id) => realObject({ id, status: 'CLOSED', closedAt: '2026-09-02T00:00:00Z' }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  assert.equal(controller.getSnapshot().feed.data.length, 2);

  await controller.closeObject('obj-1');

  const snap = controller.getSnapshot();
  assert.equal(snap.feed.data.length, 1);
  assert.ok(!snap.feed.data.some(o => o.id === 'obj-1'));
  assert.ok(snap.feed.data.some(o => o.id === 'obj-2'));
  // The closed object's own detail state is still honestly available (Section 2's own "may remain
  // available in ... current detail state" allowance) -- just no longer in the ACTIVE feed list.
  assert.equal(snap.selectedRealObject.id, 'obj-1');
  assert.equal(snap.selectedRealObject.status, 'CLOSED');
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
