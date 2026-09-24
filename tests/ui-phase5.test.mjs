import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 5 -- creator invitation issuance, People, and version-aware confirmation visibility. Gateways are scripted
// from the contracts read in SecurePayAPI (AgreementInvitationService, AgreementController, AgreementConfirmationService,
// AgreementDetailProjectionService); the API itself is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/invitations/controller';
export { InvitePanel, invitationStatusText } from './src/features/invitations/InvitePanel';
export { peopleFromProjection, invitationsForYouView } from './src/features/workspace/view';
export { createWorkspaceController } from './src/features/workspace/controller';
export { AgreementPeople } from './src/components/AgreementPeople';
export { InvitationsForYou } from './src/components/InvitationsForYou';
export { handoffNoticeView } from './src/features/handoff/view';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const err = (kind, status, message) => new api.ApiError(kind, message ?? 'x', status ?? null, null);
const ORIGIN = 'https://app.example';

function setup(over = {}) {
  const calls = []; let n = 0;
  const gateway = {
    propose: async id => { calls.push(['propose', id]); return { id, status: 'PROPOSED' }; },
    invitations: async id => { calls.push(['invitations', id]); return []; },
    revokeInvitation: async (id, inv) => { calls.push(['revoke', id, inv]); return {}; },
    issueInvitation: async (id, body) => { calls.push(['issue', id, body]); return { invitationId: 'inv-1', status: 'ISSUED', invitationToken: 'SECRET+/TOKEN', replayed: false }; },
    lookupInvitationTargetByKsNumber: async (id, ksNumber) => { calls.push(['lookup', id, ksNumber]); return { identityId: 'target-1', canonicalKsNumber: ksNumber, displayName: 'A SecurePay Identity', identityType: 'INDIVIDUAL' }; },
    ...over,
  };
  const changed = [];
  return { calls, changed, controller: api.createInviteController(gateway, 'agr-1', ORIGIN, () => changed.push(1), () => `key-${++n}`) };
}
const fill = async c => { c.open(); c.setRole('SERVICE_PROVIDER'); c.setKs('KS003'); await c.checkKs(); };
const issues = calls => calls.filter(c => c[0] === 'issue');

// ------------------------------------------------------------ issuance
test('nothing is issued by opening the panel, the form or Agreement Detail: only an explicit issue() call', async () => {
  const { controller, calls } = setup();
  await controller.loadList(); controller.open(); controller.setRole('BUYER'); controller.setKs('KS003');
  assert.equal(issues(calls).length, 0); assert.equal(calls.some(c => c[0] === 'propose'), false);
});
test('issue needs an explicit role and a KS Number; the body is exactly key + role + KS (no identity id, no guessed role)', async () => {
  const { controller, calls } = setup();
  controller.open(); await controller.issue(); assert.equal(issues(calls).length, 0);
  controller.setRole('SERVICE_PROVIDER'); await controller.issue(); assert.equal(issues(calls).length, 0);
  controller.setKs(' KS 003 '); await controller.issue(); assert.equal(issues(calls).length, 0); // Section 10 -- no confirmed preview yet
  await controller.checkKs(); await controller.issue();
  assert.deepEqual(issues(calls)[0], ['issue', 'agr-1', { idempotencyKey: 'key-1', roleCode: 'SERVICE_PROVIDER', intendedKsNumber: 'KS003' }]);
  assert.equal('intendedIdentityId' in issues(calls)[0][2], false);
});

// ------------------------------------------------------------ KS001 Upgrade Phase 4 continuation -- contact target
test('contact-targeted issuance sends channel+destination, never intendedKsNumber, and requires NO preview/check step', async () => {
  const { controller, calls } = setup();
  controller.open(); controller.setTargetMode('CONTACT'); controller.setRole('SERVICE_PROVIDER');
  controller.setContactChannel('SMS'); controller.setContactDestination('0712345678');
  await controller.issue();
  assert.deepEqual(issues(calls)[0], ['issue', 'agr-1', { idempotencyKey: 'key-1', roleCode: 'SERVICE_PROVIDER', contactChannel: 'SMS', contactDestination: '0712345678' }]);
  assert.equal('intendedKsNumber' in issues(calls)[0][2], false);
  assert.equal('intendedIdentityId' in issues(calls)[0][2], false);
  // Section 10/32 -- issuing to a contact never triggers any lookup/preview call at all.
  assert.equal(calls.some(c => c[0] === 'lookup'), false);
});
test('a blank contact destination never issues; switching target mode clears the other mode\'s state', async () => {
  const { controller, calls } = setup();
  controller.open(); controller.setRole('SERVICE_PROVIDER'); controller.setKs('KS003'); await controller.checkKs();
  controller.setTargetMode('CONTACT');
  assert.equal(controller.getSnapshot().ksPreview.status, 'idle'); // switching modes invalidates the KS preview
  await controller.issue();
  assert.equal(issues(calls).length, 0); // blank contact destination
  controller.setContactChannel('EMAIL'); controller.setContactDestination('mary@example.com');
  controller.setTargetMode('KS_NUMBER');
  assert.equal(controller.getSnapshot().contactDestination, ''); // switching back clears the contact field too
});
test('the issued success state carries the server-returned masked target hint, never a client-guessed mask', async () => {
  const { controller } = setup({ issueInvitation: async (id, body) => ({ invitationId: 'inv-9', status: 'ISSUED', invitationToken: 'RAW', replayed: false, targetKind: 'CONTACT', targetHint: '•••• 5678' }) });
  controller.open(); controller.setTargetMode('CONTACT'); controller.setRole('SERVICE_PROVIDER');
  controller.setContactChannel('SMS'); controller.setContactDestination('0712345678');
  await controller.issue();
  assert.equal(controller.getSnapshot().issued.targetKind, 'CONTACT');
  assert.equal(controller.getSnapshot().issued.targetHint, '•••• 5678');
});
test('the role list is the canonical vocabulary, and an unknown word cannot be typed in as a role', () => {
  const codes = api.INVITE_ROLES.map(r => r.code);
  assert.ok(codes.includes('SERVICE_PROVIDER') && codes.includes('CLIENT') && codes.includes('BUYER') && codes.includes('SELLER'));
  assert.equal(new Set(codes).size, codes.length);
});
test('success says only that an invitation exists: link from the returned token, no join, no send, no confirmation', async () => {
  const { controller } = setup(); await fill(controller); await controller.issue();
  const s = controller.getSnapshot();
  assert.equal(s.phase, 'issued'); assert.equal(s.issued.link, `${ORIGIN}/#/invitation/${encodeURIComponent('SECRET+/TOKEN')}`);
  assert.equal(s.request, null);
});
test('creating an invitation asks the workspace to re-read the Agreement (to show authoritative People), nothing else', async () => {
  const { controller, changed, calls } = setup(); await fill(controller); await controller.issue();
  assert.equal(changed.length, 1); assert.equal(calls.some(c => c[0] === 'confirm' || c[0] === 'join'), false);
});
test('propose is its own explicit step: draft -> proposed, it invites nobody', async () => {
  const { controller, calls } = setup(); await controller.propose();
  assert.deepEqual(calls.map(c => c[0]), ['propose']); assert.equal(issues(calls).length, 0);
});

// ------------------------------------------------------------ idempotency
test('uncertain create: retry uses the SAME key and SAME body; inputs are locked while it is unresolved', async () => {
  let first = true;
  const { controller, calls } = setup({ issueInvitation: async (id, body) => { calls.push(['issue', id, body]); if (first) { first = false; throw err('timeout', null, 't'); } return { invitationId: 'inv-1', status: 'ISSUED', invitationToken: 'T', replayed: false }; } });
  await fill(controller); await controller.issue();
  assert.equal(controller.getSnapshot().phase, 'uncertain'); assert.match(controller.getSnapshot().error, /couldn.t confirm whether that went through/);
  controller.setKs('KS999'); controller.setRole('BUYER'); // ignored: the request under retry must not change
  assert.equal(controller.getSnapshot().ksNumber, 'KS003'); assert.equal(controller.getSnapshot().roleCode, 'SERVICE_PROVIDER');
  await controller.issue();
  const sent = issues(calls); assert.equal(sent.length, 2); assert.deepEqual(sent[0][2], sent[1][2]);
  assert.equal(controller.getSnapshot().phase, 'issued');
});
test('5xx and network errors are uncertain; a 4xx is definite and releases the key', async () => {
  for (const e of [err('network', null), err('http', 503), err('timeout', null)]) {
    const { controller } = setup({ issueInvitation: async () => { throw e; } }); await fill(controller); await controller.issue();
    assert.equal(controller.getSnapshot().phase, 'uncertain');
  }
  const { controller, calls } = setup({ issueInvitation: async (id, b) => { calls.push(['issue', id, b]); throw err('http', 422, 'x'); } });
  await fill(controller); await controller.issue();
  assert.equal(controller.getSnapshot().phase, 'error'); assert.equal(controller.getSnapshot().request, null);
  await controller.issue(); assert.notEqual(issues(calls)[0][2].idempotencyKey, issues(calls)[1][2].idempotencyKey); // new explicit attempt -> fresh key
});
test('success releases the key; a later invitation gets a fresh one', async () => {
  const { controller, calls } = setup(); await fill(controller); await controller.issue(); controller.reset();
  await fill(controller); await controller.issue();
  assert.notEqual(issues(calls)[0][2].idempotencyKey, issues(calls)[1][2].idempotencyKey);
});
test('reset/abandon ends the retry sequence and forgets the link', async () => {
  const { controller, calls } = setup({ issueInvitation: async (id, b) => { calls.push(['issue', id, b]); throw err('timeout', null); } });
  await fill(controller); await controller.issue(); controller.reset();
  assert.equal(controller.getSnapshot().request, null); assert.equal(controller.getSnapshot().issued, null);
  await fill(controller); await controller.issue();
  assert.notEqual(issues(calls)[0][2].idempotencyKey, issues(calls)[1][2].idempotencyKey);
});
test('a replay after a lost response has no token: it says the invitation exists and cannot be shown again', async () => {
  const { controller } = setup({ issueInvitation: async () => ({ invitationId: 'inv-1', status: 'ISSUED', invitationToken: null, replayed: true, targetKind: 'KS_NUMBER', targetHint: 'KS0002' }) });
  await fill(controller); await controller.issue();
  assert.equal(controller.getSnapshot().phase, 'issued-earlier'); assert.deepEqual(controller.getSnapshot().issued, { invitationId: 'inv-1', link: null, targetKind: 'KS_NUMBER', targetHint: 'KS0002' });
});

// ------------------------------------------------------------ permissions and validation
test('401 / 403 / validation never claim an invitation exists, and expose no raw backend text', async () => {
  const cases = [[err('http', 401, 'auth'), /session ended.*No invitation was created/], [err('http', 403, 'forbidden'), /can.t invite people to this Agreement\. No invitation was created/], [err('http', 422, 'only creator may issue invitations for now'), /Only the person who created this Agreement/], [err('http', 422, 'agreement cannot issue invitations in status DRAFT'), /isn.t in a state where invitations can be created/], [err('http', 422, 'SELECT secret'), /Check the KS Number and role/]];
  for (const [e, want] of cases) {
    const { controller } = setup({ issueInvitation: async () => { throw e; } }); await fill(controller); await controller.issue();
    const s = controller.getSnapshot(); assert.equal(s.phase, 'error'); assert.equal(s.issued, null); assert.match(s.error, want); assert.doesNotMatch(s.error, /SELECT|secret|forbidden/);
  }
});

// ------------------------------------------------------------ sharing
test('the invitation link is never persisted and no delivery is claimed', async () => {
  for (const f of ['src/features/invitations/controller.ts', 'src/features/invitations/InvitePanel.tsx']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|console\.|document\.cookie/, f);
    // KS001 Upgrade Phase 4 continuation -- "SMS"/"EMAIL" are now legitimate contact-CHANNEL identifiers
    // (never a delivery claim by themselves); the forbidden words remain the actual claim-shaped phrases.
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /Resend|Sent to|Delivered|WhatsApp|Notified|Extend|SMS sent|SMS delivered/, f);
  }
});
const panel = (snapshot, over = {}) => text(html(api.InvitePanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'closed', roleCode: null, targetMode: 'KS_NUMBER', ksNumber: '', ksPreview: { status: 'idle' }, contactChannel: 'SMS', contactDestination: '', request: null, issued: null, error: null, list: { status: 'ready', items: [] }, proposing: false, proposeError: null, revokingId: null, revokeError: null, ...snapshot }), loadList() {}, open() {}, issue() {}, reset() {}, propose() {}, revoke() {}, setKs() {}, checkKs() {}, setRole() {}, setTargetMode() {}, setContactChannel() {}, setContactDestination() {} }, agreementStatus: 'PROPOSED', isCreator: true, ...over }));
test('the ready state: "Invitation ready", copy is not send, the raw token is not shown, focusable region', () => {
  const html5 = html(api.InvitePanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'issued', roleCode: null, targetMode: 'KS_NUMBER', ksNumber: '', ksPreview: { status: 'idle' }, contactChannel: 'SMS', contactDestination: '', request: null, issued: { invitationId: 'i', link: 'https://app.example/#/invitation/RAWTOKEN123' }, error: null, list: { status: 'ready', items: [] }, proposing: false, proposeError: null, revokingId: null, revokeError: null }), loadList() {}, open() {}, issue() {}, reset() {}, propose() {}, revoke() {}, setKs() {}, checkKs() {}, setRole() {}, setTargetMode() {}, setContactChannel() {}, setContactDestination() {} }, agreementStatus: 'PROPOSED', isCreator: true });
  const out = text(html5);
  assert.match(out, /Invitation ready/); assert.match(out, /Nothing has been sent, and no one has joined/); assert.match(out, /Copy invitation link/);
  assert.match(out, /shows this link only now/);
  assert.doesNotMatch(html5, /RAWTOKEN123/); assert.doesNotMatch(out, /Sent\b|Delivered|Participant added|shared successfully|joined successfully/);
});
test('the form says what it does and does not do; labels are real labels', () => {
  const out = panel({ phase: 'form' });
  assert.match(out, /Who should take part in this Agreement\?/); assert.match(out, /Their KS Number/); assert.match(out, /Their role in this Agreement/);
  assert.match(out, /Creating an invitation makes a link you can share\. It doesn.t send anything, and nobody has joined or agreed to anything/);
  assert.match(out, /Only the account with this KS Number will be able to join/);
  const markup = html(api.InvitePanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'form', roleCode: null, targetMode: 'KS_NUMBER', ksNumber: '', ksPreview: { status: 'idle' }, contactChannel: 'SMS', contactDestination: '', request: null, issued: null, error: null, list: { status: 'idle' }, proposing: false, proposeError: null, revokingId: null, revokeError: null }), loadList() {}, open() {}, issue() {}, reset() {}, propose() {}, revoke() {}, setKs() {}, checkKs() {}, setRole() {}, setTargetMode() {}, setContactChannel() {}, setContactDestination() {} }, agreementStatus: 'PROPOSED', isCreator: true });
  assert.match(markup, /<label[^>]*for="[^"]+-ks"/); assert.match(markup, /<label[^>]*for="[^"]+-role"/); assert.match(markup, /<select/);
});
test('a draft offers Propose, not Invite; a non-creator or a non-invitable status sees no invite controls', () => {
  assert.match(panel({}, { agreementStatus: 'DRAFT' }), /Propose this Agreement/); assert.doesNotMatch(panel({}, { agreementStatus: 'DRAFT' }), /Invite someone/);
  assert.match(panel({}, { agreementStatus: 'DRAFT' }), /invites nobody and tells nobody/);
  assert.equal(panel({}, { isCreator: false }), '');
  for (const status of ['CANCELLED', 'EXPIRED', 'CONFIRMATION_PENDING']) assert.doesNotMatch(panel({}, { agreementStatus: status }), /Invite someone|Propose this/);
  assert.match(panel({}, { agreementStatus: 'PARTICIPANTS_JOINING' }), /Invite someone/);
});
test('the uncertain state is announced and promises no second invitation', () => {
  const out = panel({ phase: 'uncertain', roleCode: 'BUYER', ksNumber: 'KS003', ksPreview: { status: 'idle' }, error: 'SecurePay couldn’t confirm whether that went through.' });
  assert.match(out, /We.re not sure that went through/); assert.match(out, /can.t create two/); assert.match(out, /Check and try again/);
});
test('invitation status words follow SecurePay statuses: opened is not joined, and expiry comes from expiresAt', () => {
  const inv = o => ({ id: 'i', roleCode: 'BUYER', status: 'ISSUED', issuedAt: '2026-09-01T00:00:00Z', expiresAt: '2030-01-01T00:00:00Z', revokedAt: null, ...o });
  assert.match(api.invitationStatusText(inv({})), /Not opened yet/);
  assert.match(api.invitationStatusText(inv({ status: 'VIEWED' })), /Link opened · nobody has joined with it/);
  assert.doesNotMatch(api.invitationStatusText(inv({ status: 'VIEWED' })), /accepted|seen|delivered/i);
  assert.match(api.invitationStatusText(inv({ status: 'JOINED' })), /Someone joined with this invitation/);
  assert.match(api.invitationStatusText(inv({ status: 'REVOKED' })), /Revoked/);
  assert.equal(api.invitationStatusText(inv({ expiresAt: '2020-01-01T00:00:00Z' })), 'Expired');
});
test('the invitation list failing is not "no invitations"', () => {
  const out = panel({ list: { status: 'error' } });
  assert.match(out, /couldn.t be loaded/); assert.doesNotMatch(out, /No invitations have been created/);
  assert.match(panel({ list: { status: 'ready', items: [] } }), /No invitations have been created/);
});
test('revoke states its real effect and exists only for usable invitations', () => {
  const inv = o => ({ id: 'i', roleCode: 'BUYER', status: 'ISSUED', issuedAt: '2026-09-01T00:00:00Z', expiresAt: '2030-01-01T00:00:00Z', revokedAt: null, ...o });
  const out = panel({ list: { status: 'ready', items: [inv({}), inv({ id: 'j', status: 'REVOKED' }), inv({ id: 'k', status: 'JOINED' })] } });
  assert.equal((out.match(/Revoke this invitation/g) ?? []).length, 1);
  assert.match(out, /Revoking stops a link from working\. It doesn.t remove anyone who has already joined/);
});
test('revoke calls the real endpoint then re-reads the list', async () => {
  const { controller, calls } = setup(); await controller.revoke('inv-9');
  assert.deepEqual(calls.map(c => c[0]), ['revoke', 'invitations']); assert.deepEqual(calls[0], ['revoke', 'agr-1', 'inv-9']);
});

// ------------------------------------------------------------ People
// KS001 Upgrade Phase 4 continuation (item 4) -- peopleView (client-side participants+confirmations+
// version composition) is RETIRED. Confirmation-current/reconfirmation-required/stale-version logic now
// lives, and is tested, server-side (AgreementConfirmationService/AgreementPeopleProjectionService,
// SecurePayAPI). This frontend mapper (peopleFromProjection) is a THIN presentation layer over the
// server's own humanState enum -- these tests prove the mapping and the bounded-identity/unknown-fallback
// doctrine only, never a client-side confirmation derivation (there is none left to test here).
const PP = (id, humanState, role = 'SERVICE_PROVIDER', extra = {}) => ({
  participantId: id, identityId: null, displayName: null, canonicalKsNumber: null, roleCode: role,
  isCreator: humanState === 'CREATOR', invitationId: null, invitationStatus: null, invitationIssuedAt: null,
  invitationExpiresAt: null, invitationFirstViewedAt: null, joinedAt: null, confirmedVersionNumber: null,
  confirmationCurrent: false, reconfirmationRequired: false, humanState, ...extra,
});
const projectionOf = people => ({
  people,
  summary: { peopleCount: people.length, expectedParticipantCount: 0, pendingInvitationCount: 0, joinedParticipantCount: 0, confirmedCurrentParticipantCount: 0, reconfirmationRequiredCount: 0, allExpectedHaveJoined: false, allJoinedHaveConfirmedCurrent: false, allExpectedHaveConfirmedCurrent: false },
});
const one = person => api.peopleFromProjection(projectionOf([person]), [])[0];

test('real identity is shown where SecurePay supplies it, and only that: no internal ids, no invented names', () => {
  assert.equal(one(PP('p1', 'JOINED_NOT_CONFIRMED', 'SERVICE_PROVIDER', { displayName: 'Wanjiru Traders', canonicalKsNumber: 'KS003' })).name, 'Wanjiru Traders · KS003');
  assert.equal(one(PP('p1', 'JOINED_NOT_CONFIRMED', 'SERVICE_PROVIDER', { canonicalKsNumber: 'KS003' })).name, 'KS003');
  assert.equal(one(PP('p1', 'INVITED')).name, 'Someone invited');
});
// KS001 Upgrade Phase 4 continuation (Section 31) -- a contact-bound invitation before Join.
test('a contact-bound invitation shows the masked contact hint, never a name that does not exist yet, and never the raw contact', () => {
  const invited = one(PP('p1', 'INVITED', 'SERVICE_PROVIDER', { maskedContactTarget: '•••• 5678' }));
  assert.equal(invited.name, '•••• 5678');
  const opened = one(PP('p1', 'INVITATION_OPENED', 'SERVICE_PROVIDER', { maskedContactTarget: 'm•••@example.com' }));
  assert.equal(opened.name, 'm•••@example.com');
  assert.doesNotMatch(opened.statusText, /m•••@example\.com opened/); // subject prefix stays absent -- no real name is known yet
  // Once a real identity has joined, the real name always wins over any retained masked hint.
  const joined = one(PP('p1', 'JOINED_NOT_CONFIRMED', 'SERVICE_PROVIDER', { displayName: 'Mary Wanjiku', maskedContactTarget: '•••• 5678' }));
  assert.equal(joined.name, 'Mary Wanjiku');
  assert.equal(one(PP('p1', 'JOINED_NOT_CONFIRMED')).name, 'Participant'); // already joined, unresolved name -- distinct fallback from merely invited
  assert.doesNotMatch(JSON.stringify(api.peopleFromProjection(projectionOf([PP('p1', 'INVITED')]), [])), /identityId/);
});
test('roles come from SecurePay roleCode only, in plain words', () => {
  assert.equal(one(PP('p1', 'INVITED', 'SERVICE_PROVIDER')).role, 'Service Provider');
  assert.equal(one(PP('p1', 'CREATOR', 'PROPOSER')).role, 'Proposer');
});
test('the creator is not asked to confirm: "Started this Agreement", neutral', () => {
  const c = one(PP('p0', 'CREATOR', 'PROPOSER'));
  assert.equal(c.statusText, 'Started this Agreement'); assert.equal(c.statusKind, 'neutral');
});
test('invited: the invitation exists, they have not opened or joined yet', () => {
  assert.equal(one(PP('p1', 'INVITED')).statusText, 'Invitation ready · not opened yet');
});
test('invitation opened is distinct from invited and from joined', () => {
  const named = one(PP('p1', 'INVITATION_OPENED', 'SERVICE_PROVIDER', { displayName: 'Mary' }));
  assert.equal(named.statusText, 'Mary opened the invitation · has not joined'); assert.equal(named.statusKind, 'waiting');
  assert.equal(one(PP('p1', 'INVITATION_OPENED')).statusText, 'Invitation opened · not joined yet');
});
test('joined but unconfirmed is distinct from confirmed', () => {
  const p = one(PP('p1', 'JOINED_NOT_CONFIRMED', 'SERVICE_PROVIDER', { displayName: 'Mary' }));
  assert.equal(p.statusText, 'Mary joined · review still needed'); assert.equal(p.statusKind, 'waiting');
});
test('current confirmation is clearly current, named when identity is known', () => {
  const p = one(PP('p1', 'CONFIRMED_CURRENT', 'SERVICE_PROVIDER', { displayName: 'Mary', confirmedVersionNumber: 3 }));
  assert.equal(p.statusText, 'Mary confirmed'); assert.equal(p.statusKind, 'current');
});
test('reconfirmation required is distinct from a fresh confirmation, and never called "confirmed"', () => {
  const p = one(PP('p1', 'RECONFIRMATION_REQUIRED', 'SERVICE_PROVIDER', { displayName: 'Mary' }));
  assert.equal(p.statusText, 'Mary needs to review the changed Agreement'); assert.equal(p.statusKind, 'needs');
  assert.doesNotMatch(p.statusText, /^Mary confirmed$/);
});
test('expired and revoked invitations are their own historical statuses, never shown as pending', () => {
  assert.equal(one(PP('p1', 'INVITATION_EXPIRED')).statusText, 'Invitation expired');
  assert.equal(one(PP('p1', 'INVITATION_REVOKED')).statusText, 'Invitation revoked');
});
test('one participant confirming never implies the others did; each row is independent, driven by ITS OWN humanState', () => {
  const out = api.peopleFromProjection(projectionOf([
    PP('pA', 'JOINED_NOT_CONFIRMED', 'BUYER', { displayName: 'Kamau' }),
    PP('pB', 'CONFIRMED_CURRENT', 'SELLER', { displayName: 'Kamau' }),
  ]), []);
  assert.equal(out[0].statusKind, 'waiting'); assert.equal(out[1].statusKind, 'current');
});
test('when the People read fails (null projection) every row is UNKNOWN, never "not confirmed"/"not joined"', () => {
  const participants = [{ participantId: 'p1', roleCode: 'SERVICE_PROVIDER', participantStatus: 'JOINED_UNCONFIRMED', ksNumber: null, displayName: null }];
  const rows = api.peopleFromProjection(null, participants);
  assert.equal(rows[0].statusKind, 'unknown');
  assert.match(rows[0].statusText, /couldn.t be loaded/);
  assert.doesNotMatch(rows[0].statusText, /not confirmed|still needed|not joined/i);
});
test('an Agreement change makes an earlier confirmation stale (server-driven RECONFIRMATION_REQUIRED), with no automatic action', async () => {
  const before = one(PP('p1', 'CONFIRMED_CURRENT', 'SERVICE_PROVIDER', { displayName: 'Mary' }));
  const after = one(PP('p1', 'RECONFIRMATION_REQUIRED', 'SERVICE_PROVIDER', { displayName: 'Mary' }));
  assert.equal(before.statusKind, 'current'); assert.equal(after.statusKind, 'needs');
  const src = await readFile('src/features/invitations/controller.ts', 'utf8');
  assert.doesNotMatch(src, /confirmVersion|reinvite/i);
});
test('People renders the words and an icon (never colour alone), with no scoreboard or percentage', () => {
  const people = api.peopleFromProjection(projectionOf([
    PP('p1', 'CONFIRMED_CURRENT', 'SERVICE_PROVIDER', { displayName: 'Kamau' }),
    PP('p2', 'JOINED_NOT_CONFIRMED'),
    PP('p3', 'INVITED'),
  ]), []);
  const markup = html(api.AgreementPeople, { people });
  const out = text(markup);
  assert.match(out, /Kamau/); assert.match(out, /Kamau confirmed/); assert.match(out, /Joined · review still needed/); assert.match(out, /Invitation ready · not opened yet/);
  assert.match(markup, /<ul[^>]*aria-label="People on this Agreement"/); assert.match(markup, /aria-hidden="true"/);
  assert.doesNotMatch(out, /%|\d+\/\d+|complete|progress/i);
});

// ------------------------------------------------------------ workspace partial failure + creator
/** Raw AgreementDetailResponse.participants shape -- distinct from the People-projection row shape (PP) above. */
const RP = (id, status, role = 'SERVICE_PROVIDER', extra = {}) => ({ participantId: id, roleCode: role, participantStatus: status, ksNumber: null, displayName: null, ...extra });
const detailDto = { overview: { agreementId: 'agr-1', publicReference: 'AGR-1', title: 'T', purpose: '', description: '', agreementType: 'SERVICE', status: 'PROPOSED', currency: 'KES', proposedAmountMinor: null, createdAt: 'x', updatedAt: 'x', expiresAt: null }, currentVersion: { versionId: 'v3', versionNumber: 3, contentHash: 'h', createdAt: 'x', amendmentReason: null, materialChange: false }, participants: [RP('p0', 'CREATOR', 'PROPOSER', { displayName: 'James', ksNumber: 'KS001' }), RP('p1', 'JOINED_UNCONFIRMED', 'SERVICE_PROVIDER', { displayName: 'Kamau', ksNumber: 'KS003' })], milestones: [], terms: [], documents: [], activity: [], versionHistory: [], money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 } };
const summary = (over = {}) => ({ agreementId: 'agr-1', publicReference: 'AGR-1', title: 'T', purpose: '', status: 'PROPOSED', agreementType: 'SERVICE', proposedAmountMinor: null, currency: 'KES', createdAt: 'x', updatedAt: 'x', currentActor: { roleCode: 'PROPOSER', participantStatus: 'CREATOR' }, counterparty: null, nextDeadline: null, attentionRequired: false, nextActions: [], currentAgreementVersionId: 'v3', completion: { completed: false, status: 'X', reasonCodes: [], agreementVersionId: 'v3', completedAt: null }, ...over });
const hub = items => ({ needsMe: items, waitingOnOthers: [], takingShape: [], active: [], changedReviewRequired: [], completed: [], cancelled: [], expired: [] });
const tick = () => new Promise(r => setTimeout(r, 0));
test('workspace: Detail loads, participants survive a failed confirmations read (unknown), and the caller\'s own status is carried from the Hub', async () => {
  const gateway = { currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }), hub: async () => hub([summary()]), detail: async () => detailDto, confirmations: async () => { throw err('http', 500, 'down'); }, money: { status: async () => { throw err('http', 404, 'x'); }, records: async () => [] } };
  const c = api.createWorkspaceController(gateway); c.enter(); await tick(); c.openFromHome('agr-1'); await tick();
  const s = c.getSnapshot();
  assert.equal(s.detail.status, 'ready'); assert.equal(s.detail.data.confirmations, null); assert.equal(s.selectedActorStatus, 'CREATOR');
  // The gateway mock above declares no `people` method at all -- bestEffort's own catch-all means the
  // People read fails the same way an outright missing/erroring endpoint would: null, never thrown.
  assert.equal(s.detail.data.people, null);
  const people = api.peopleFromProjection(s.detail.data.people, s.detail.data.dto.participants);
  assert.equal(people[1].statusKind, 'unknown'); assert.equal(people[0].statusText.length > 0, true);
});
test('workspace: a recipient (not CREATOR) never gets invite controls', async () => {
  const gateway = { currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }), hub: async () => hub([summary({ currentActor: { roleCode: 'SERVICE_PROVIDER', participantStatus: 'JOINED_UNCONFIRMED' } })]), detail: async () => detailDto, confirmations: async () => [], money: { status: async () => { throw err('http', 404, 'x'); }, records: async () => [] } };
  const c = api.createWorkspaceController(gateway); c.enter(); await tick(); c.openFromHome('agr-1'); await tick();
  assert.equal(c.getSnapshot().selectedActorStatus, 'JOINED_UNCONFIRMED');
});
test('workspace: reloadDetailQuietly refreshes People without tearing down the view', async () => {
  let n = 0;
  const gateway = { currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }), hub: async () => hub([summary()]), detail: async () => { n++; return detailDto; }, confirmations: async () => [], money: { status: async () => { throw err('http', 404, 'x'); }, records: async () => [] } };
  const c = api.createWorkspaceController(gateway); c.enter(); await tick(); c.openFromHome('agr-1'); await tick();
  const seen = []; c.subscribe(() => seen.push(c.getSnapshot().detail.status));
  await c.reloadDetailQuietly();
  assert.equal(n, 2); assert.ok(seen.every(s => s === 'ready'));
});

// ------------------------------------------------------------ copy + scope
test('the draft-created notice says nobody has been invited', () => {
  const view = api.handoffNoticeView({ status: 'PROGRESSED', progressedAgreementId: 'a', reviewedSource: null });
  assert.match(view.text, /Nobody has been invited/);
});
test('Phase 5 code has no Money, funding or execution affordances', async () => {
  for (const f of ['src/features/invitations/controller.ts', 'src/features/invitations/InvitePanel.tsx']) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /Pay now|Fund|STK|Wallet|settle|Payment Ready|escrow|milestone/i, f);
  }
});

// ------------------------------------------------------------ Phase 5 correction pass
const bareState = o => ({ phase: 'closed', roleCode: null, targetMode: 'KS_NUMBER', ksNumber: '', ksPreview: { status: 'idle' }, contactChannel: 'SMS', contactDestination: '', request: null, issued: null, error: null, list: { status: 'ready', items: [] }, proposing: false, proposeError: null, revokingId: null, revokeError: null, ...o });
const stubPanel = (snapshot, calls = [], over = {}) => html(api.InvitePanel, { controller: { subscribe: () => () => {}, getSnapshot: () => bareState(snapshot), loadList() {}, open: () => calls.push('open'), issue() {}, reset: () => calls.push('reset'), propose() {}, revoke: id => calls.push(['revoke', id]), setKs() {}, checkKs() {}, setRole() {}, setTargetMode() {}, setContactChannel() {}, setContactDestination() {} }, agreementStatus: 'PROPOSED', isCreator: true, ...over });

test('replay without a token keeps the EXACT returned invitation id, never the token', async () => {
  const { controller } = setup({ issueInvitation: async () => ({ invitationId: 'inv-42', status: 'ISSUED', invitationToken: null, replayed: true, targetKind: 'KS_NUMBER', targetHint: 'KS0002' }) });
  await fill(controller); await controller.issue();
  const s = controller.getSnapshot();
  assert.equal(s.phase, 'issued-earlier'); assert.deepEqual(s.issued, { invitationId: 'inv-42', link: null, targetKind: 'KS_NUMBER', targetHint: 'KS0002' });
  assert.doesNotMatch(JSON.stringify(s), /TOKEN|token/i);
});
test('the direct revoke action uses exactly that id, and never picks one by role, date, position or text', async () => {
  const calls = [];
  const items = [{ id: 'inv-A', roleCode: 'SERVICE_PROVIDER', status: 'ISSUED', issuedAt: '2026-09-20T10:00:00Z', expiresAt: '2030-01-01T00:00:00Z', revokedAt: null }, { id: 'inv-B', roleCode: 'SERVICE_PROVIDER', status: 'ISSUED', issuedAt: '2026-09-20T10:00:00Z', expiresAt: '2030-01-01T00:00:00Z', revokedAt: null }];
  const markup = stubPanel({ phase: 'issued-earlier', issued: { invitationId: 'inv-B', link: null }, list: { status: 'ready', items } }, calls);
  assert.match(text(markup), /You can revoke exactly this invitation/);
  // The panel's own action is bound to the returned id (inv-B, the SECOND list entry, same role and date as inv-A).
  const src = await readFile('src/features/invitations/InvitePanel.tsx', 'utf8');
  assert.match(src, /const id = state\.issued\.invitationId;/); assert.match(src, /controller\.revoke\(id\)/);
  const block = src.slice(src.indexOf("state.phase === 'issued-earlier'"), src.indexOf('Invitations</h3>'));
  assert.doesNotMatch(block, /items\[0\]|items\.find\(|\.filter\(|roleCode|issuedAt|\.sort\(/);
  // And the controller revokes precisely the id it is given, then re-reads the list.
  const { controller, calls: gcalls } = setup(); await controller.revoke('inv-B');
  assert.deepEqual(gcalls[0], ['revoke', 'agr-1', 'inv-B']);
});
test('after the exact invitation is revoked, the creator can deliberately create a new one with a fresh key', async () => {
  let n = 0;
  const { controller, calls } = setup({
    issueInvitation: async (id, body) => { calls.push(['issue', id, body]); n++; return n === 1 ? { invitationId: 'inv-1', status: 'ISSUED', invitationToken: null, replayed: true } : { invitationId: 'inv-2', status: 'ISSUED', invitationToken: 'NEW', replayed: false }; },
    invitations: async () => [{ id: 'inv-1', roleCode: 'SERVICE_PROVIDER', status: 'REVOKED', issuedAt: 'x', expiresAt: 'y', revokedAt: 'z' }],
  });
  await fill(controller); await controller.issue(); await controller.revoke('inv-1');
  assert.equal(controller.getSnapshot().list.items[0].status, 'REVOKED');
  const done = stubPanel({ phase: 'issued-earlier', issued: { invitationId: 'inv-1', link: null }, list: { status: 'ready', items: controller.getSnapshot().list.items } });
  assert.match(text(done), /That invitation is revoked/); assert.match(text(done), /Create a new invitation/); assert.doesNotMatch(text(done), /Revoke this invitation/);
  controller.reset(); await fill(controller); await controller.issue();
  assert.notEqual(issues(calls)[0][2].idempotencyKey, issues(calls)[1][2].idempotencyKey);
  assert.equal(controller.getSnapshot().phase, 'issued');
});
test('an uncertain revoke keeps the exact id and re-reads the list; it is not shown as revoked until SecurePay says so', async () => {
  const { controller } = setup({ revokeInvitation: async () => { throw err('timeout', null); }, issueInvitation: async () => ({ invitationId: 'inv-1', status: 'ISSUED', invitationToken: null, replayed: true }), invitations: async () => [{ id: 'inv-1', roleCode: 'BUYER', status: 'ISSUED', issuedAt: 'x', expiresAt: '2030-01-01T00:00:00Z', revokedAt: null }] });
  await fill(controller); await controller.issue(); await controller.revoke('inv-1');
  const s = controller.getSnapshot();
  assert.match(s.revokeError, /couldn.t confirm whether that went through/); assert.equal(s.issued.invitationId, 'inv-1');
  assert.doesNotMatch(text(stubPanel(s)), /That invitation is revoked/);
});
test('reset clears the replayed invitation identity', async () => {
  const { controller } = setup({ issueInvitation: async () => ({ invitationId: 'inv-1', status: 'ISSUED', invitationToken: null, replayed: true }) });
  await fill(controller); await controller.issue(); controller.reset();
  assert.equal(controller.getSnapshot().issued, null); assert.equal(controller.getSnapshot().phase, 'closed');
});
test('the gateway types the token as nullable', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  assert.match(src, /invitationToken: string \| null/); assert.doesNotMatch(src, /invitationToken: string;/);
});
// The old "CONFIRMED participant status but no matching confirmation record" contradiction-detection
// logic (matching confirmation records by participantId, distinguishing a missing row from a genuine
// "not confirmed") is RETIRED from the frontend entirely -- AgreementConfirmationService now computes
// confirmationCurrent/reconfirmationRequired server-side (see AgreementPeopleProjectionServiceTest,
// SecurePayAPI) and hands the frontend one already-resolved humanState per participant, tested above.
// KS001 Upgrade Phase 4 (Section 10) -- the KS Number IS now checked server-side, with a bounded
// preview, before the creator can ever press "Create invitation." This supersedes the earlier
// "not checked when the invitation is created" disclaimer.
test('the KS helper says SecurePay checks the number before issuance, and only the exact account can join', () => {
  const out = text(stubPanel({ phase: 'form' }));
  assert.match(out, /SecurePay checks this KS Number against real SecurePay identities before you can invite them/);
  assert.match(out, /Only the account with this KS Number will be able to join/);
});
test('a found KS preview shows the bounded identity, never contact details, and enables Create invitation', () => {
  const markup = stubPanel({ phase: 'form', ksNumber: 'KS0010492', ksPreview: { status: 'found', checked: 'KS0010492', target: { identityId: 'id-1', canonicalKsNumber: 'KS0010492', displayName: 'Mary Wanjiku', identityType: 'INDIVIDUAL' } }, roleCode: 'SERVICE_PROVIDER' });
  const out = text(markup);
  assert.match(out, /Mary Wanjiku/);
  assert.match(out, /KS0010492/);
  // Scoped to the identity-preview box itself -- the panel's own "I have their phone or email" MODE
  // TOGGLE (a real, unrelated Section 8 affordance) legitimately contains those words elsewhere.
  const previewBlock = markup.match(/<div role="status"[^>]*>[\s\S]*?<\/div>/)[0];
  assert.match(previewBlock, /Mary Wanjiku/);
  assert.doesNotMatch(previewBlock, /@|phone|email/i);
  const submitButton = markup.match(/<button type="submit"[^>]*>/)[0];
  assert.doesNotMatch(submitButton, /\sdisabled(=|\s|>)/);
});
test('a not-found KS preview blocks issuance and never claims an identity was verified when it was not', () => {
  const out = text(stubPanel({ phase: 'form', ksNumber: 'KS9999999', ksPreview: { status: 'not-found', checked: 'KS9999999' }, roleCode: 'SERVICE_PROVIDER' }));
  assert.match(out, /couldn.t find an active identity with that KS Number/);
});
test('editing the KS Number after a found preview invalidates it (checked no longer matches) so Create invitation stays disabled', () => {
  const markup = stubPanel({ phase: 'form', ksNumber: 'KS0010499', ksPreview: { status: 'found', checked: 'KS0010492', target: { identityId: 'id-1', canonicalKsNumber: 'KS0010492', displayName: 'Mary Wanjiku', identityType: 'INDIVIDUAL' } }, roleCode: 'SERVICE_PROVIDER' });
  const out = text(markup);
  assert.doesNotMatch(out, /Mary Wanjiku/); // stale preview for a DIFFERENT (already-edited) number is never shown as current
});
test('an unknown invitation status fails closed: not "Not opened yet", not joined/revoked/expired, and no Revoke', () => {
  const inv = o => ({ id: 'i', roleCode: 'BUYER', status: 'ISSUED', issuedAt: '2026-09-01T00:00:00Z', expiresAt: '2030-01-01T00:00:00Z', revokedAt: null, ...o });
  for (const status of ['PENDING_REVIEW', '', 'issued', 'SUSPENDED']) {
    const said = api.invitationStatusText(inv({ status }));
    assert.equal(said, 'Invitation status unavailable'); assert.doesNotMatch(said, /Not opened|joined|Revoked|Expired/i);
  }
  const out = text(stubPanel({ list: { status: 'ready', items: [inv({ status: 'SUSPENDED' })] } }));
  assert.match(out, /Invitation status unavailable/); assert.doesNotMatch(out, /Revoke this invitation/);
  assert.match(api.invitationStatusText(inv({})), /^Not opened yet/);
});

// ─── PHASE 4 NEXT SLICE — InvitationsForYou (Home) ─────────────────────────────────────────────────
const invCard = (overrides = {}) => ({
  invitationId: 'invitation-1', actionable: true, inviterLine: 'James invited you',
  agreementTitle: 'Kitchen cabinetry', roleLine: 'Your proposed role: Carpenter',
  amountLine: 'KES 180,000.00 proposed', expiryLine: 'Expires Fri, 2 Oct', statusNote: null, ...overrides,
});

test('InvitationsForYou renders nothing at all when there are no invitations (Section 25 -- no empty-state module)', () => {
  const out = html(api.InvitationsForYou, { items: [], onReview: () => {} });
  assert.equal(out, '');
});

test('InvitationsForYou: an actionable card offers Review invitation and calls onReview with the exact invitation id', () => {
  const calls = [];
  const markup = html(api.InvitationsForYou, { items: [invCard()], onReview: id => calls.push(id) });
  const out = text(markup);
  assert.match(out, /James invited you/);
  assert.match(out, /Kitchen cabinetry/);
  assert.match(out, /Carpenter/);
  assert.match(out, /Review invitation/);
  assert.doesNotMatch(out, /Accept|Confirm|Join Agreement|Pay/);
});

test('InvitationsForYou: a non-actionable (expired/revoked) card shows its status note and no Review CTA', () => {
  const out = text(html(api.InvitationsForYou, {
    items: [invCard({ actionable: false, statusNote: 'This invitation has expired.', expiryLine: null })],
    onReview: () => {},
  }));
  assert.match(out, /This invitation has expired/);
  assert.doesNotMatch(out, /Review invitation/);
});

test('InvitationsForYou is bounded: at most 3 cards render, the rest are reachable through a real "View all invitations" doorway -- never a full inbox table inline', () => {
  const items = [1, 2, 3, 4, 5].map(n => invCard({ invitationId: `invitation-${n}` }));
  const out = text(html(api.InvitationsForYou, { items, onReview: () => {}, onViewAll: () => {} }));
  assert.equal((out.match(/Review invitation/g) || []).length, 3);
  // KS001 Upgrade Phase 4 final convergence (Section 4) -- "+N more" is no longer dead text; it is now
  // folded into a real, clickable "View all invitations" action routing to the dedicated Invitations surface.
  assert.match(out, /View all invitations \(\+2 more\)/);
});

test('KS001 Upgrade Phase 4 final convergence (Section 4) -- "View all invitations" is offered even when every current invitation already fits on the card, so the full history (past/expired/revoked) stays reachable', () => {
  const out = text(html(api.InvitationsForYou, { items: [invCard()], onReview: () => {}, onViewAll: () => {} }));
  assert.match(out, /View all invitations/);
  assert.doesNotMatch(out, /more\)/);
});
