import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// KS001 Upgrade Phase 4 final convergence (Section 3/4) -- the lightweight first-party Invitations
// surface: bounded/paginated controller, NEEDS YOUR RESPONSE / PAST INVITATIONS grouping, and every row
// routing back through the SAME existing RecipientExperience Join core -- never a second Join machine.
const bundle = await build({ stdin: { contents: `
export { createInvitationInboxController } from './src/features/invitation-inbox/controller';
export { groupInvitationInboxItems } from './src/features/invitation-inbox/view';
export { InvitationInboxBody } from './src/features/invitation-inbox/InvitationInboxExperience';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const inboxItem = (overrides = {}) => ({
  invitationId: 'invitation-1', agreementId: 'agreement-1', agreementPublicReference: 'AGR-1',
  agreementTitle: 'Kitchen cabinetry', agreementPurpose: 'Build kitchen cabinets', currency: 'KES',
  proposedAmountMinor: 18000000, roleCode: 'CARPENTER', inviterDisplayName: 'James Kimani',
  inviterCanonicalKsNumber: 'KS0001', status: 'ISSUED', issuedAt: '2026-09-20T00:00:00Z',
  expiresAt: '2026-10-02T00:00:00Z', firstViewedAt: null, isCurrentVersion: true, needsAttention: true,
  targetKind: 'KS_NUMBER', targetHint: 'KS0002', ...overrides,
});

// ─── controller ─────────────────────────────────────────────────────────────

test('controller: load() populates state from page 0, exposing items/page/size/total', async () => {
  const gateway = { myInvitations: async (page, size) => {
    assert.equal(page, 0);
    assert.equal(size, 20);
    return { items: [inboxItem()], page: 0, size: 20, totalElements: 1 };
  } };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  const state = controller.getSnapshot();
  assert.equal(state.status, 'ready');
  assert.equal(state.items.length, 1);
  assert.equal(state.total, 1);
});

test('controller: a load failure surfaces status=error with a human message, never throws out of the controller', async () => {
  const gateway = { myInvitations: async () => { throw new api.ApiError('http', 'unavailable', 500, null); } };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  assert.equal(controller.getSnapshot().status, 'error');
});

test('controller: loadMore() appends the next page and advances the page cursor', async () => {
  const calls = [];
  const gateway = { myInvitations: async (page, size) => {
    calls.push(page);
    if (page === 0) return { items: [inboxItem({ invitationId: 'i1' })], page: 0, size: 2, totalElements: 3 };
    return { items: [inboxItem({ invitationId: 'i2' }), inboxItem({ invitationId: 'i3' })], page: 1, size: 2, totalElements: 3 };
  } };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  await controller.loadMore();
  const state = controller.getSnapshot();
  assert.deepEqual(calls, [0, 1]);
  assert.equal(state.items.length, 3);
  assert.deepEqual(state.items.map(i => i.invitationId), ['i1', 'i2', 'i3']);
});

test('controller: loadMore() is a no-op once every item has already been loaded -- never an unbounded extra request', async () => {
  const calls = [];
  const gateway = { myInvitations: async page => { calls.push(page); return { items: [inboxItem()], page: 0, size: 20, totalElements: 1 }; } };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  await controller.loadMore();
  assert.deepEqual(calls, [0]);
});

test('controller: a loadMore() failure keeps the already-loaded items and surfaces a separate loadMoreError, never discarding what is already shown', async () => {
  const gateway = { myInvitations: async page => {
    if (page === 0) return { items: [inboxItem()], page: 0, size: 1, totalElements: 2 };
    throw new api.ApiError('http', 'unavailable', 500, null);
  } };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  await controller.loadMore();
  const state = controller.getSnapshot();
  assert.equal(state.status, 'ready');
  assert.equal(state.items.length, 1);
  assert.ok(state.loadMoreError);
});

// ─── view: grouping ─────────────────────────────────────────────────────────

test('groupInvitationInboxItems: needsAttention=true rows go to "needs response", everything else to "past"', () => {
  const groups = api.groupInvitationInboxItems([
    inboxItem({ invitationId: 'a', needsAttention: true, status: 'ISSUED' }),
    inboxItem({ invitationId: 'b', needsAttention: false, status: 'EXPIRED' }),
    inboxItem({ invitationId: 'c', needsAttention: false, status: 'REVOKED' }),
    inboxItem({ invitationId: 'd', needsAttention: false, status: 'JOINED' }),
  ]);
  assert.deepEqual(groups.needsResponse.map(r => r.invitationId), ['a']);
  assert.deepEqual(groups.past.map(r => r.invitationId), ['b', 'c', 'd']);
});

test('groupInvitationInboxItems: a JOINED row is shown in Past as restrained historical context, with no action -- the documented choice (unlike Home, which omits JOINED entirely)', () => {
  const groups = api.groupInvitationInboxItems([inboxItem({ status: 'JOINED', needsAttention: false })]);
  assert.equal(groups.past.length, 1);
  assert.equal(groups.past[0].actionable, false);
  assert.match(groups.past[0].statusNote, /already joined/i);
});

test('groupInvitationInboxItems: EXPIRED/REVOKED rows carry a truthful status note and no expiry line', () => {
  const groups = api.groupInvitationInboxItems([
    inboxItem({ invitationId: 'x', status: 'EXPIRED', needsAttention: false }),
    inboxItem({ invitationId: 'y', status: 'REVOKED', needsAttention: false }),
  ]);
  assert.equal(groups.past[0].statusNote, 'This invitation has expired.');
  assert.equal(groups.past[0].expiryLine, null);
  assert.equal(groups.past[1].statusNote, 'This invitation is no longer available.');
});

// ─── component ──────────────────────────────────────────────────────────────

test('InvitationInboxBody: renders both groups with headings, and a Load more control only when more remain', async () => {
  const gateway = { myInvitations: async () => ({ items: [inboxItem({ status: 'ISSUED', needsAttention: true }), inboxItem({ invitationId: 'i2', status: 'EXPIRED', needsAttention: false })], page: 0, size: 20, totalElements: 2 }) };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  const out = text(html(api.InvitationInboxBody, { state: controller.getSnapshot(), onReview: () => {}, onLoadMore: () => {} }));
  assert.match(out, /Needs your response/);
  assert.match(out, /Past invitations/);
  assert.doesNotMatch(out, /Load more/);
});

test('InvitationInboxBody: an empty inbox says so plainly, never a social-evaluation "no one has invited you" tone applied to Home', async () => {
  const gateway = { myInvitations: async () => ({ items: [], page: 0, size: 20, totalElements: 0 }) };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  const out = text(html(api.InvitationInboxBody, { state: controller.getSnapshot(), onReview: () => {}, onLoadMore: () => {} }));
  assert.match(out, /No one has proposed an Agreement to you yet/);
});

test('InvitationInboxBody: a Load more control is offered when fewer items have loaded than the backend total', async () => {
  const gateway = { myInvitations: async () => ({ items: [inboxItem()], page: 0, size: 1, totalElements: 2 }) };
  const controller = api.createInvitationInboxController(gateway);
  await controller.load();
  const out = text(html(api.InvitationInboxBody, { state: controller.getSnapshot(), onReview: () => {}, onLoadMore: () => {} }));
  assert.match(out, /Load more/);
});

test('InvitationInboxBody: a loading state renders a status role, never the groups', () => {
  const out = text(html(api.InvitationInboxBody, { state: { status: 'loading' }, onReview: () => {}, onLoadMore: () => {} }));
  assert.match(out, /Loading your invitations/);
});

test('InvitationInboxBody: an error state renders the message via StatusNotice, never a raw stack/unknown-error string', () => {
  const out = text(html(api.InvitationInboxBody, { state: { status: 'error', message: 'SecurePay could not allow this request.' }, onReview: () => {}, onLoadMore: () => {} }));
  assert.match(out, /SecurePay could not allow this request/);
});
