import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Phase 6 (Community Life) Slice 2 -- The Trust Project membership + Conversation & Help.
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
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth, headers: options.headers, body: options.body }); return {}; } } };
}

// ─── api/securepay/community -- Slice 2 gateway shape ─────────────────────────

test('gateway: membership.me/accept/decline and invite() all require authentication', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.membership.me();
  await gateway.membership.invite('KS200', 'key-1');
  await gateway.membership.accept();
  await gateway.membership.decline();
  assert.ok(calls.every(c => c.auth === 'required'));
  assert.equal(calls[1].path, '/api/v1/community/membership/invite');
  assert.equal(calls[1].headers['Idempotency-Key'], 'key-1');
  assert.deepEqual(calls[1].body, { inviteeCanonicalKsNumber: 'KS200' });
});

test('gateway: replies.create/list/withdraw hit the real per-object paths, authenticated', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.replies.create('obj-1', 'hello', 'k1');
  await gateway.replies.list('obj-1');
  await gateway.replies.withdraw('obj-1', 'reply-1');
  assert.equal(calls[0].path, '/api/v1/community/objects/obj-1/replies');
  assert.equal(calls[0].headers['Idempotency-Key'], 'k1');
  assert.match(calls[1].path, /\/api\/v1\/community\/objects\/obj-1\/replies\?/);
  assert.equal(calls[2].path, '/api/v1/community/objects/obj-1/replies/reply-1/withdraw');
  assert.ok(calls.every(c => c.auth === 'required'));
});

test('gateway: help.offer/list/withdraw hit the real per-object paths, authenticated', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.help.offer('obj-1', 'k1');
  await gateway.help.list('obj-1');
  await gateway.help.withdraw('obj-1', 'help-1');
  assert.equal(calls[0].path, '/api/v1/community/objects/obj-1/help');
  assert.equal(calls[0].headers['Idempotency-Key'], 'k1');
  assert.equal(calls[2].path, '/api/v1/community/objects/obj-1/help/help-1/withdraw');
  assert.ok(calls.every(c => c.auth === 'required'));
});

test('gateway: principles() is read-only and does not require authentication (an invitee must see it before accepting)', async () => {
  const { calls, http } = fakeHttp();
  const gateway = api.communityGatewayModule.createCommunityGateway(http);
  await gateway.principles();
  assert.equal(calls[0].path, '/api/v1/community/principles');
  assert.equal(calls[0].auth, 'none');
});

// ─── controller.ts -- Slice 2 membership state machine ─────────────────────────

function fakeCommunityGateway(overrides = {}) {
  const calls = [];
  const membershipMe = overrides.membershipMe ?? (async () => ({ status: null, invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: null, respondedAt: null }));
  return {
    calls,
    gateway: {
      create: async () => { throw new Error('not used in this test'); },
      feed: async () => { calls.push(['feed']); return []; },
      mine: async () => { calls.push(['mine']); return []; },
      get: async () => { throw new Error('not used in this test'); },
      close: async () => { throw new Error('not used in this test'); },
      membership: {
        me: async () => { calls.push(['membership.me']); return membershipMe(); },
        invite: async (...args) => { calls.push(['membership.invite', ...args]); return overrides.invite ? overrides.invite(...args) : (() => { throw new Error('not used'); })(); },
        accept: async () => { calls.push(['membership.accept']); return overrides.accept ? overrides.accept() : { status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-02T00:00:00Z' }; },
        decline: async () => { calls.push(['membership.decline']); return overrides.decline ? overrides.decline() : { status: 'DECLINED', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-02T00:00:00Z' }; },
      },
      replies: { create: async () => { throw new Error('not used'); }, list: async () => [], withdraw: async () => { throw new Error('not used'); } },
      help: { offer: async () => { throw new Error('not used'); }, list: async () => [], withdraw: async () => { throw new Error('not used'); } },
      principles: async () => { calls.push(['principles']); return overrides.principles ? overrides.principles() : []; },
    },
  };
}
const storeGatewayStub = { search: async () => [] };

test('controller: a genuinely signed-out caller (auth-required call rejected by the http client) is distinguished from an authenticated non-member', async () => {
  const { gateway } = fakeCommunityGateway({
    membershipMe: async () => { throw new api.http.ApiError('http', 'Authentication required', 401, 'AUTHENTICATION_REQUIRED'); },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  assert.equal(controller.getSnapshot().membership.kind, 'signed-out');
});

test('controller: an authenticated caller with no membership record is "none", never fabricated as any other status', async () => {
  const { gateway } = fakeCommunityGateway();
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  assert.equal(controller.getSnapshot().membership.kind, 'none');
});

test('controller: an INVITED membership carries inviter provenance, and does not itself grant feed access', async () => {
  const { gateway, calls } = fakeCommunityGateway({
    membershipMe: async () => ({ status: 'INVITED', invitedByCanonicalKsNumber: 'KS100', invitedByDisplayName: 'Mary W.', invitedAt: '2026-09-01T00:00:00Z', respondedAt: null }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  const snap = controller.getSnapshot();
  assert.equal(snap.membership.kind, 'invited');
  assert.equal(snap.membership.membership.invitedByDisplayName, 'Mary W.');
  assert.ok(!calls.some(c => c[0] === 'feed')); // invited != active -- the real feed is never fetched
});

test('controller: an ACTIVE membership loads the real feed', async () => {
  const { gateway, calls } = fakeCommunityGateway({
    membershipMe: async () => ({ status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  assert.equal(controller.getSnapshot().membership.kind, 'active');
  assert.ok(calls.some(c => c[0] === 'feed'));
});

test('controller.acceptInvitation transitions membership to ACTIVE on explicit action, then loads the real feed', async () => {
  // Stateful mock: membershipMe reflects INVITED until accept() has actually been called, matching
  // the real backend's own sequencing -- acceptInvitation() re-runs enter() afterward, which must see
  // the NEW state, not the pre-acceptance snapshot.
  let accepted = false;
  const { gateway, calls } = fakeCommunityGateway({
    membershipMe: async () => accepted
      ? { status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-02T00:00:00Z' }
      : { status: 'INVITED', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: null },
    accept: async () => { accepted = true; return { status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-02T00:00:00Z' }; },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  assert.equal(controller.getSnapshot().membership.kind, 'invited');

  await controller.acceptInvitation();

  assert.equal(controller.getSnapshot().membership.kind, 'active');
  assert.ok(calls.some(c => c[0] === 'membership.accept'));
  assert.ok(calls.some(c => c[0] === 'feed')); // enter() re-runs after acceptance, loading the real feed
});

test('controller.declineInvitation transitions membership to DECLINED, never touching the feed', async () => {
  const { gateway, calls } = fakeCommunityGateway({
    membershipMe: async () => ({ status: 'INVITED', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: null }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();

  await controller.declineInvitation();

  assert.equal(controller.getSnapshot().membership.kind, 'declined');
  assert.ok(!calls.some(c => c[0] === 'feed'));
});

test('controller.submitInvite validates locally and sends the invitee KS Number with a stable, per-draft idempotency key', async () => {
  const { gateway, calls } = fakeCommunityGateway({
    invite: async () => ({ status: 'INVITED', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: null }),
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  controller.openInvite();
  await controller.submitInvite();
  assert.match(controller.getSnapshot().inviteDraft.error, /KS Number/);
  assert.equal(calls.filter(c => c[0] === 'membership.invite').length, 0);

  controller.setInviteKsNumber('KS200');
  await controller.submitInvite();
  assert.equal(calls.filter(c => c[0] === 'membership.invite').length, 1);
  assert.equal(calls[calls.length - 1][1], 'KS200');
  assert.ok(controller.getSnapshot().inviteDraft.sent);
});

// ─── Correction (Slice 2 pre-merge): idempotency-key lifecycle for invitation and "I can help" ────

test('correction 1: controller.submitInvite reuses the SAME idempotency key across a failed attempt, a retry, and an edit to the KS Number', async () => {
  let attempt = 0;
  const usedKeys = [];
  const { gateway } = fakeCommunityGateway({
    invite: async (ksNumber, idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      attempt += 1;
      if (attempt === 1) throw new Error('network blip');
      return { status: 'INVITED', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: null };
    },
  });
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);

  controller.openInvite();
  const openedKey = controller.getSnapshot().inviteDraft.idempotencyKey;
  assert.ok(openedKey);

  controller.setInviteKsNumber('KS200');
  await controller.submitInvite(); // fails (attempt 1) -- key must NOT be regenerated on failure
  assert.ok(controller.getSnapshot().inviteDraft.error);
  assert.equal(controller.getSnapshot().inviteDraft.idempotencyKey, openedKey);

  // The user changes the KS Number while the SAME invite panel remains open -- still one stable
  // invitation intention/draft, so still the same key (per the mandate's own explicit note).
  controller.setInviteKsNumber('KS201');
  await controller.submitInvite(); // succeeds (attempt 2) -- the retry
  assert.ok(controller.getSnapshot().inviteDraft.sent);

  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], openedKey);
  assert.equal(usedKeys[1], openedKey); // SAME key reused across the retry, never regenerated per Submit press

  // A confirmed success discards this intention -- reopening (or continuing) mints a genuinely new one.
  assert.notEqual(controller.getSnapshot().inviteDraft.idempotencyKey, openedKey);
});

test('correction 2: controller.offerHelp reuses the SAME help-intent key across a retry, and mints a fresh one only after a confirmed withdrawal', async () => {
  let attempt = 0;
  const usedKeys = [];
  const object = { id: 'obj-1', objectType: 'NEED', status: 'ACTIVE', title: 'T', body: 'B', locationLabel: null, authorCanonicalKsNumber: 'KS999', authorDisplayName: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null };
  const { gateway } = fakeCommunityGateway({
    membershipMe: async () => ({ status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
  });
  gateway.feed = async () => [object];
  gateway.help.offer = async (objectId, key) => {
    usedKeys.push(key);
    attempt += 1;
    if (attempt === 1) throw new Error('network blip');
    return { id: 'help-1', objectId, authorCanonicalKsNumber: 'KS100', authorDisplayName: null, status: 'ACTIVE', createdAt: '2026-09-02T00:00:00Z', withdrawnAt: null, canWithdraw: true };
  };
  gateway.help.withdraw = async () => {};

  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  await controller.openObject('obj-1');
  const openedKey = controller.getSnapshot().helpIntentKey;
  assert.ok(openedKey);

  await controller.offerHelp(); // fails (attempt 1) -- must not regenerate the key on failure
  assert.ok(controller.getSnapshot().helpError);
  assert.equal(controller.getSnapshot().helpIntentKey, openedKey);

  await controller.offerHelp(); // succeeds (attempt 2) -- the retry, same key
  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], openedKey);
  assert.equal(usedKeys[1], openedKey);

  await controller.withdrawHelp('help-1');
  // A confirmed withdrawal ends this intent -- a future "I can help" attempt on this object is a
  // genuinely new intent and must get its own fresh key.
  assert.notEqual(controller.getSnapshot().helpIntentKey, openedKey);
});

test('correction 4/5: a fresh controller (simulating a page reload) shows the callers own pre-existing reply as withdrawable and anothers reply as not', async () => {
  const ownReply = { id: 'reply-own', objectId: 'obj-1', authorCanonicalKsNumber: 'KS100', authorDisplayName: 'Me', body: 'mine', status: 'ACTIVE', createdAt: '2026-09-01T00:00:00Z', withdrawnAt: null, canWithdraw: true };
  const foreignReply = { id: 'reply-foreign', objectId: 'obj-1', authorCanonicalKsNumber: 'KS200', authorDisplayName: 'Someone else', body: 'theirs', status: 'ACTIVE', createdAt: '2026-09-01T00:01:00Z', withdrawnAt: null, canWithdraw: false };
  const object = { id: 'obj-1', objectType: 'QUESTION', status: 'ACTIVE', title: 'T', body: 'B', locationLabel: null, authorCanonicalKsNumber: 'KS999', authorDisplayName: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null };
  const { gateway } = fakeCommunityGateway({
    membershipMe: async () => ({ status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
  });
  gateway.feed = async () => [object];
  gateway.replies.list = async () => [ownReply, foreignReply];

  // A brand-new controller instance -- no prior session state at all, exactly matching a real page
  // reload, where "did this session create it" tracking would have nothing to go on.
  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  await controller.openObject('obj-1');

  const responses = api.communityView.combineRealResponses(controller.getSnapshot().objectReplies.data, []);
  assert.equal(responses.find(r => r.id === 'reply-own').canWithdraw, true);
  assert.equal(responses.find(r => r.id === 'reply-foreign').canWithdraw, false);
});

test('correction 4/5: a fresh controller detects a pre-existing own ACTIVE help signal after reload, and never treats anothers help response as withdrawable', async () => {
  const ownHelp = { id: 'help-own', objectId: 'obj-1', authorCanonicalKsNumber: 'KS100', authorDisplayName: 'Me', status: 'ACTIVE', createdAt: '2026-09-01T00:00:00Z', withdrawnAt: null, canWithdraw: true };
  const foreignHelp = { id: 'help-foreign', objectId: 'obj-1', authorCanonicalKsNumber: 'KS200', authorDisplayName: 'Someone else', status: 'ACTIVE', createdAt: '2026-09-01T00:01:00Z', withdrawnAt: null, canWithdraw: false };
  const object = { id: 'obj-1', objectType: 'NEED', status: 'ACTIVE', title: 'T', body: 'B', locationLabel: null, authorCanonicalKsNumber: 'KS999', authorDisplayName: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', closedAt: null };
  const { gateway } = fakeCommunityGateway({
    membershipMe: async () => ({ status: 'ACTIVE', invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: '2026-09-01T00:00:00Z', respondedAt: '2026-09-01T00:00:00Z' }),
  });
  gateway.feed = async () => [object];
  gateway.help.list = async () => [ownHelp, foreignHelp];

  const controller = api.communityController.createCommunityController(storeGatewayStub, gateway);
  await controller.enter();
  await controller.openObject('obj-1');

  const activeId = api.communityView.myActiveHelpResponseId(controller.getSnapshot().objectHelp.data);
  assert.equal(activeId, 'help-own'); // the caller's own pre-existing ACTIVE signal, never the other person's
});

// ─── Source-level doctrine checks ─────────────────────────

test('CommunityExperience never calls Agreement/handoff/payment authority when wiring membership or conversation', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /agreementGateway|handoffController|createHandoff|adoptHandoff|confirmVersion|moneyGateway|paymentIntent/);
});

test('The invite panel copy never claims trust certification or endorsement', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /trustworthy|certified|verified professional/i);
  assert.match(contents, /add something useful to a community that chooses to trade fairly/);
});

test('Accepting an invitation never implies commercial obligation or Agreement participation (invitee-facing copy)', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /does not create any commercial obligation/);
  assert.match(contents, /does not make you party to anyone else's Agreement/);
});
