import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 4 -- recipient entry, Join, exact review and exact-version confirmation. Gateways are scripted from the
// contracts read in SecurePayAPI (AgreementInvitationController, AgreementJoinService, AgreementConfirmationService);
// the API itself is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/recipient/controller';
export * from './src/features/recipient/view';
export { ApiError } from './src/api/securepay/http';
export { RecipientReviewCard } from './src/components/RecipientReview';
export { JoinPromptCard } from './src/components/JoinPrompt';
export { JoinedStatusCard } from './src/components/JoinedStatus';
export { CanonicalAgreementCard } from './src/components/CanonicalAgreement';
export { NoticeCard } from './src/components/NoticeCard';
export { secureAuthView } from './src/features/identity/view';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const text = (component, props) => api.renderToStaticMarkup(api.createElement(component, props)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const TOKEN = 'tok';
const invitation = (o = {}) => ({ publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile the bathroom', intendedRole: 'SERVICE_PROVIDER', currency: 'KES', proposedAmountMinor: 6800050, invitationExpiresAt: '2026-12-01T00:00:00Z', proposalVersionNumber: 1, notice: 'Viewing this invitation is not acceptance and does not join the agreement.', ...o });
const join = (o = {}) => ({ agreementId: 'a1', publicReference: 'AGR-1', participantId: 'p-me', role: 'SERVICE_PROVIDER', participantStatus: 'JOINED_UNCONFIRMED', joinedVersionId: 'v1', joinedVersionNumber: 1, confirmationRequired: true, joinedAt: 'x', notice: 'n', ...o });
const version = (o = {}) => ({ id: 'v1', versionNumber: 1, snapshot: { title: 'Bathroom retiling', purpose: 'Retile the bathroom', currency: 'KES', proposed_amount_minor: 6800050 }, contentHash: 'h1', parentVersionId: null, amendmentReason: null, materialChange: false, versionStatus: 'CURRENT', createdAt: 'x', ...o });
const confirmation = (o = {}) => ({ id: 'c1', agreementVersionId: 'v1', participantId: 'p-me', versionNumber: 1, versionContentHash: 'h1', status: 'CONFIRMED', assuranceMethod: 'AUTHENTICATED_SESSION', confirmedAt: 'x', confirmationCurrent: true, reconfirmationRequired: false, ...o });
const err = (kind, status, message) => new api.ApiError(kind, message ?? 'x', status ?? null, null);

function setup(over = {}) {
  const calls = []; let n = 0;
  const gateway = {
    invitation: async t => { calls.push(['invitation', t]); return invitation(); },
    join: async (t, k) => { calls.push(['join', t, k]); return join(); },
    versions: async id => { calls.push(['versions', id]); return [version()]; },
    version: async (id, vid) => { calls.push(['version', id, vid]); return version(); },
    confirmVersion: async (id, vid, body) => { calls.push(['confirm', id, vid, body]); return confirmation(); },
    participants: async id => { calls.push(['participants', id]); return [{ id: 'p-creator', identityId: 'i1', roleCode: 'CLIENT', participantStatus: 'CREATOR', addedAt: 'x' }, { id: 'p-me', identityId: 'i2', roleCode: 'SERVICE_PROVIDER', participantStatus: 'JOINED_UNCONFIRMED', addedAt: 'x' }]; },
    ...over,
  };
  return { calls, controller: api.createRecipientController(gateway, TOKEN, () => `key-${++n}`) };
}
const names = calls => calls.map(c => c[0]);

// ------------------------------------------------------------ public entry
test('opening the invitation reads it and nothing else: no join, no confirmation, no version', async () => {
  const { controller, calls } = setup();
  await controller.load();
  assert.deepEqual(names(calls), ['invitation']);
  assert.equal(controller.getSnapshot().phase, 'invitation-ready');
  assert.equal(controller.getSnapshot().join, null); assert.equal(controller.getSnapshot().confirmation, null);
});
test('the public card orients: nothing joined or agreed, what happens next, no invented inviter, no pressure wording', () => {
  const card = api.recipientReviewView(invitation());
  assert.equal(card.inviterName, ''); // SecurePay exposes no inviter identity, so none is claimed
  assert.equal(card.role, 'Service provider');
  assert.equal(card.proposedAmount, 'KES 68,000.50'); // integer-exact
  const out = text(api.RecipientReviewCard, { data: card, onChoice() {}, notice: invitation().notice });
  assert.match(out, /Opening this page has not added you to the Agreement, and nothing has been agreed/);
  assert.match(out, /What happens next/); assert.match(out, /Joining does not mean you agree/);
  assert.match(out, /You.ve been invited to look at this before deciding anything/);
  assert.doesNotMatch(out, /Someone has invited|Accept invitation|Sign contract|Pay now|Join now to see/i);
  assert.doesNotMatch(out, /[^\d]0\.[0-9]|undefined/);
});
test('the invitation view only shows facts SecurePay put in the public view', () => {
  const card = api.recipientReviewView(invitation({ purpose: '', proposedAmountMinor: null }));
  assert.equal(card.purpose, null); assert.equal(card.proposedAmount, null);
  assert.deepEqual(Object.keys(card).sort(), ['expiry', 'inviterName', 'nextSteps', 'primaryLabel', 'primaryValue', 'proposedAmount', 'purpose', 'role', 'secondaryLabel', 'secondaryValue', 'title', 'type']);
});

// ------------------------------------------------------------ authentication continuity
test('authentication alone never joins: sign-in only reaches the explicit Join step, same invitation', async () => {
  const { controller, calls } = setup();
  await controller.load(); controller.proceed(false);
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  controller.afterIdentitySignedIn();
  assert.equal(controller.getSnapshot().phase, 'join-prompt');
  assert.deepEqual(names(calls), ['invitation']); // one read of ONE invitation; no join
  assert.equal(controller.getSnapshot().invitation.title, 'Bathroom retiling');
});
test('the sign-in card says what identity is for and that it joins nothing', () => {
  const out = text(api.NoticeCard, { data: { type: 'NOTICE', label: 'x', text: 'x', tone: 'important' } });
  const auth = api.secureAuthView({ phase: 'credentials', busy: false, ksNumber: '', password: '', otp: '', challengeToken: null, error: null }, { title: 'SecurePay needs to know who you are', reason: 'Before adding you to this Agreement, SecurePay needs to know who you are.' });
  assert.equal(auth.title, 'SecurePay needs to know who you are'); assert.match(auth.reason, /Before adding you/);
  assert.ok(out);
});
test('session ending during Join does not imply Join happened; after sign-in the person is back at Join, not joined', async () => {
  let first = true;
  const { controller, calls } = setup({ join: async (t, k) => { calls.push(['join', t, k]); if (first) { first = false; throw err('http', 401, 'auth'); } return join(); } });
  await controller.load(); controller.proceed(true); await controller.join();
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  assert.equal(controller.getSnapshot().join, null);
  controller.afterIdentitySignedIn();
  assert.equal(controller.getSnapshot().phase, 'join-prompt'); // must press Join again; nothing silent
  await controller.join();
  const keys = calls.filter(c => c[0] === 'join').map(c => c[2]); assert.equal(keys[0], keys[1]);
});
test('session ending before confirmation does not imply confirmation; the reviewed version is kept', async () => {
  const { controller } = setup({ confirmVersion: async () => { throw err('http', 401, 'auth'); } });
  await controller.load(); controller.proceed(true); await controller.join(); await controller.confirm();
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  assert.equal(controller.getSnapshot().confirmation, null);
  controller.afterIdentitySignedIn();
  assert.equal(controller.getSnapshot().phase, 'version-ready');
});

// ------------------------------------------------------------ join
test('Join calls only the Join authority, then reads the exact version -- it never confirms', async () => {
  const { controller, calls } = setup();
  await controller.load(); controller.proceed(true); await controller.join();
  assert.equal(calls.some(c => c[0] === 'confirm'), false);
  assert.equal(controller.getSnapshot().phase, 'version-ready');
  assert.equal(controller.getSnapshot().confirmation, null);
});
test('the Join card says joining is participation, not agreement and not payment', () => {
  const card = api.joinPromptView();
  assert.equal(card.primaryLabel, 'Join this Agreement');
  assert.match(card.text, /does not mean you agree to the terms, and nothing is paid/);
  assert.doesNotMatch(JSON.stringify(card), /Accept|Agree &|Confirm participation|Sign/);
});
test('after Join: joined and NOT agreed are two separate statements, with no success ceremony', () => {
  const view = api.joinedStatusView(join());
  assert.equal(view.title, 'You have joined this Agreement');
  assert.equal(view.notAgreed, 'You have not yet agreed to these terms.');
  const out = text(api.JoinedStatusCard, { data: view });
  assert.match(out, /Service provider/); assert.doesNotMatch(out, /all set|complete|confirmed|success|congrat/i);
});
test('an uncertain Join is not shown as joined and retries with the SAME key', async () => {
  let first = true;
  const { controller, calls } = setup({ join: async (t, k) => { calls.push(['join', t, k]); if (first) { first = false; throw err('timeout', null, 'timed out'); } return join(); } });
  await controller.load(); controller.proceed(true); await controller.join();
  const s = controller.getSnapshot();
  assert.equal(s.phase, 'join-uncertain'); assert.equal(s.join, null); assert.match(s.error, /couldn.t confirm whether that went through/);
  await controller.join();
  const keys = calls.filter(c => c[0] === 'join').map(c => c[2]); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  assert.equal(controller.getSnapshot().phase, 'version-ready');
});
test('5xx after Join is uncertain too; a definite 4xx is a failure with the backend reason', async () => {
  const a = setup({ join: async () => { throw err('http', 503, 'down'); } });
  await a.controller.load(); a.controller.proceed(true); await a.controller.join();
  assert.equal(a.controller.getSnapshot().phase, 'join-uncertain');
  const b = setup({ join: async () => { throw err('http', 403, 'AGREEMENT_OWNERSHIP_MISMATCH'); } });
  await b.controller.load(); b.controller.proceed(true); await b.controller.join();
  assert.equal(b.controller.getSnapshot().phase, 'join-error');
  assert.match(b.controller.getSnapshot().error, /isn.t linked to the account you.re signed in with/);
  assert.doesNotMatch(b.controller.getSnapshot().error, /KS\d|@|\+254/); // says nothing about who it was intended for
});
test('Joined but the version read failed: only the READ is retried, never Join', async () => {
  let reads = 0;
  const { controller, calls } = setup({ version: async () => { reads++; if (reads === 1) throw err('network', null, 'off'); return version(); } });
  await controller.load(); controller.proceed(true); await controller.join();
  assert.equal(controller.getSnapshot().phase, 'error'); assert.ok(controller.getSnapshot().join);
  await controller.reloadVersion();
  assert.equal(controller.getSnapshot().phase, 'version-ready');
  assert.equal(calls.filter(c => c[0] === 'join').length, 1);
});

// ------------------------------------------------------------ exact review
test('the review is the canonical Agreement card, from the backend version only, with real roles from the participant list', async () => {
  const { controller } = setup();
  await controller.load(); controller.proceed(true); await controller.join();
  await new Promise(r => setTimeout(r, 0));
  const s = controller.getSnapshot();
  const parties = api.participantsView(s.participants, s.join.participantId);
  assert.deepEqual(parties, [{ name: 'Another participant', role: 'Client · started this Agreement' }, { name: 'You', role: 'Service provider · has joined' }]);
  const card = api.exactVersionView(s.version, parties);
  const out = text(api.CanonicalAgreementCard, { data: card, onChoice() {} });
  assert.match(out, /Bathroom retiling/); assert.match(out, /KES 68,000\.50/); assert.match(out, /You/); assert.match(out, /Client/);
  assert.match(out, /Version:\s*1/);
});
test('no roles are invented when SecurePay does not list participants; the review still stands', async () => {
  const { controller } = setup({ participants: async () => { throw err('http', 403, 'no'); } });
  await controller.load(); controller.proceed(true); await controller.join(); await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().participants, null);
  assert.deepEqual(api.participantsView(null, 'p-me'), []);
  assert.equal(controller.getSnapshot().phase, 'version-ready');
});

// ------------------------------------------------------------ confirmation
test('confirmation is impossible before Join has fetched the exact version', async () => {
  const { controller, calls } = setup();
  await controller.load(); await controller.confirm(); controller.proceed(true); await controller.confirm();
  assert.equal(calls.some(c => c[0] === 'confirm'), false);
});
test('confirmation sends exactly the reviewed version id, number and content hash; Join alone never confirms', async () => {
  const { controller, calls } = setup();
  await controller.load(); controller.proceed(true); await controller.join();
  assert.equal(calls.some(c => c[0] === 'confirm'), false);
  await controller.confirm();
  const call = calls.find(c => c[0] === 'confirm');
  assert.equal(call[2], 'v1'); assert.equal(call[3].expectedVersionNumber, 1); assert.equal(call[3].expectedContentHash, 'h1');
  assert.equal(controller.getSnapshot().phase, 'confirmed');
});
test('the confirm CTA names the real operation: this participant confirming this exact version; no Sign, no legal claim', () => {
  const card = api.exactVersionView(version());
  assert.equal(card.primaryLabel, 'Yes, I confirm this version');
  assert.equal(card.secondaryLabel, 'This needs changing');
  assert.match(card.consequence, /recorded against version 1 exactly/); assert.match(card.consequence, /nothing is paid/);
  assert.doesNotMatch(JSON.stringify(card) + JSON.stringify(api.confirmedView(confirmation())), /\bsign|signed|legally|binding|active|Agreement complete|all set/i);
  const done = api.confirmedView(confirmation({ versionNumber: 3 }));
  assert.match(done.text, /version 3/); assert.match(done.text, /does not mean every participant has confirmed, and no payment has been made/);
});
test('an uncertain confirmation is NOT shown as confirmed and retries the SAME request', async () => {
  let first = true;
  const { controller, calls } = setup({ confirmVersion: async (id, vid, body) => { calls.push(['confirm', id, vid, body]); if (first) { first = false; throw err('timeout', null, 't'); } return confirmation(); } });
  await controller.load(); controller.proceed(true); await controller.join(); await controller.confirm();
  const s = controller.getSnapshot();
  assert.equal(s.phase, 'confirm-uncertain'); assert.equal(s.confirmation, null);
  await controller.confirm();
  const sends = calls.filter(c => c[0] === 'confirm'); assert.equal(sends.length, 2); assert.deepEqual(sends[0][3], sends[1][3]);
  assert.equal(controller.getSnapshot().phase, 'confirmed');
});

// ------------------------------------------------------------ stale / changed
test('the Agreement moving after review: the old confirmation is not applied; the current version needs a fresh review and an explicit press', async () => {
  const v2 = version({ id: 'v2', versionNumber: 2, contentHash: 'h2' });
  let confirms = 0;
  const { controller, calls } = setup({
    confirmVersion: async (id, vid, body) => { confirms++; calls.push(['confirm', id, vid, body]); throw err('http', 422, 'version superseded'); },
    versions: async () => [version({ versionStatus: 'SUPERSEDED' }), v2],
    version: async (id, vid) => vid === 'v2' ? v2 : version(),
  });
  await controller.load(); controller.proceed(true); await controller.join(); await controller.confirm();
  const s = controller.getSnapshot();
  assert.equal(s.phase, 'version-ready'); assert.equal(s.changed, true); assert.equal(s.version.versionNumber, 2);
  assert.equal(confirms, 1); // never auto-confirmed on v2
  assert.equal(s.confirmIdempotencyKey, null);
  const notice = api.changedVersionNoticeView();
  assert.match(notice.label, /changed since you reviewed it/); assert.match(notice.text, /nothing you did applied to the new one/);
});

// ------------------------------------------------------------ change / decline
test('"This needs changing" promises nothing SecurePay cannot do and sends nothing', async () => {
  const notice = api.needsChangingView();
  assert.match(notice.text, /isn.t a way to send a change request from here yet, and nothing has been sent/);
  assert.match(notice.text, /You haven.t confirmed anything/);
  assert.doesNotMatch(notice.text, /declin|reject|we.ll tell|has been notified|edit/i);
  const { calls } = setup();
  assert.equal(calls.length, 0);
});
test('there is no Decline control and leaving is never treated as a decision', async () => {
  const src = await readFile('src/features/recipient/RecipientExperience.tsx', 'utf8');
  assert.doesNotMatch(src, /Decline|decline|Reject|reject/);
  const { controller, calls } = setup();
  await controller.load(); controller.proceed(true); await controller.join(); controller.reset();
  assert.equal(calls.some(c => c[0] === 'confirm'), false);
});

// ------------------------------------------------------------ errors
test('unusable invitations fail closed in plain, distinct words without echoing raw backend text', () => {
  const problem = m => api.invitationProblem(err('http', 422, m));
  assert.match(problem('invitation expired'), /has expired/);
  assert.match(problem('invitation revoked'), /withdrew it/);
  assert.match(problem('invitation not found'), /can.t find this invitation/);
  assert.match(problem('agreement no longer available'), /no longer available/);
  assert.match(problem('invitation already joined'), /already been used/);
  const odd = problem('some internal detail SELECT * FROM'); assert.doesNotMatch(odd, /SELECT|internal/);
  assert.match(api.invitationProblem(err('network', null, 'off')), /Nothing has changed/);
});
test('an invalid invitation fails closed in the controller', async () => {
  const { controller } = setup({ invitation: async () => { throw err('http', 422, 'invitation expired'); } });
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'invitation-error'); assert.match(controller.getSnapshot().error, /has expired/);
});

// ------------------------------------------------------------ source + legacy + scope
test('source provenance: the recipient path renders only the Agreement version; a Store listing cannot rewrite it', async () => {
  const src = (await readFile('src/features/recipient/view.ts', 'utf8')) + (await readFile('src/features/recipient/controller.ts', 'utf8'));
  assert.doesNotMatch(src, /useCurrentSource|searchStore|reviewedSource|stores\//); // no live-listing read on this path
});
test('production recipient path has no funding/payment authority and no contradictory legacy wording', async () => {
  for (const f of ['src/features/recipient/RecipientExperience.tsx', 'src/features/recipient/view.ts', 'src/features/recipient/controller.ts', 'src/components/RecipientReview.tsx', 'src/components/JoinPrompt.tsx', 'src/components/JoinedStatus.tsx']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src, /Accept invitation|Join & Accept|Sign contract|Accept & Join|Agree & Continue|Agreement complete|Transaction confirmed|Pay now|fundAgreement|payment-intent/i, f);
  }
});
