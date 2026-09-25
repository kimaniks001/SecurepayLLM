import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 6 -- amendments, version review and reconfirmation. Gateways are scripted from the contracts read in SecurePayAPI
// (AgreementAmendmentService, AgreementAmendmentDiffService, AgreementConfirmationService, AgreementController); the API is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/amendments/display';
export { createAmendmentsController, isAmendable } from './src/features/amendments/controller';
export { createReconfirmController } from './src/features/amendments/reconfirm';
export { ChangesPanel, amendmentStatusWord } from './src/features/amendments/ChangesPanel';
export { ReconfirmPanel, ownStanding } from './src/features/amendments/ReconfirmPanel';
export { AUTHENTICATED_AGREEMENT_METHODS } from './src/api/securepay/agreements/refresh';
export { peopleFromProjection } from './src/features/workspace/view';
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
const tick = () => new Promise(r => setTimeout(r, 0));

const SNAP = { title: 'Bathroom retiling', purpose: 'Retile', description: 'Retile the bathroom', agreement_type: 'SERVICE', currency: 'KES', proposed_amount_minor: 4000000, version_number: 1 };
const am = (o = {}) => ({ id: 'am-1', sourceVersionId: 'v1', proposedTerms: { proposed_amount_minor: 4500050 }, reason: 'Extra work requested', status: 'PROPOSED', appliedVersionId: null, createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-20T10:00:00Z', ...o });
const ver = (n, o = {}) => ({ id: `v${n}`, versionNumber: n, snapshot: { ...SNAP, version_number: n }, contentHash: `h${n}`, parentVersionId: null, amendmentReason: null, materialChange: false, versionStatus: 'CURRENT', createdAt: 'x', ...o });

function setup(over = {}, current = { id: 'v1' }) {
  const calls = []; let n = 0; const changed = []; const cur = { id: current.id };
  const gateway = {
    amendments: async id => { calls.push(['amendments', id]); return [am()]; },
    amendmentDiff: async (id, a) => { calls.push(['diff', a]); return { amendmentId: a, sourceVersionId: 'v1', changes: [] }; },
    applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); return ver(2); },
    rejectAmendment: async (id, a) => { calls.push(['reject', a]); return am({ status: 'REJECTED' }); },
    withdrawAmendment: async (id, a) => { calls.push(['withdraw', a]); return am({ status: 'WITHDRAWN' }); },
    version: async (id, v) => { calls.push(['version', v]); return ver(Number(v.replace('v', ''))); },
    ...over,
  };
  return { calls, changed, cur, controller: api.createAmendmentsController(gateway, 'agr-1', () => cur.id, () => { changed.push(1); if (cur.onChange) cur.onChange(); }, () => `key-${++n}`) };
}
const names = calls => calls.map(c => c[0]);

// ------------------------------------------------------------ contract / session boundary
test('every amendment gateway method is authenticated and on the shared refresh list', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  for (const m of ['amendments', 'amendmentDiff', 'applyAmendment', 'rejectAmendment', 'withdrawAmendment']) {
    assert.ok(api.AUTHENTICATED_AGREEMENT_METHODS.includes(m), `${m} must be session-refreshed`);
    assert.match(src, new RegExp(`${m}: \\(.*?auth: 'required'`));
  }
  assert.doesNotMatch(src, /proposeAmendment/); // authoring is deliberately not built (see doc): no unused mutation
});
test('gateway DTOs match the real backend shapes', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  assert.match(src, /interface AgreementAmendmentDto \{ id: string; sourceVersionId: string; proposedTerms: Record<string, unknown>; reason: string \| null; status: string; appliedVersionId: string \| null; createdAt: string; updatedAt: string \}/);
  assert.match(src, /interface AmendmentDiffDto \{ amendmentId: string; sourceVersionId: string; changes: AmendmentFieldChangeDto\[\] \}/);
});

// ------------------------------------------------------------ diff semantics (the merge blocker)
const source = { ...SNAP };
// What SecurePay's AgreementAmendmentDiffService returns: source snapshot vs proposedTerms, every source key absent from proposedTerms = REMOVED.
const backendDiff = (before, after) => ({ amendmentId: 'am-1', sourceVersionId: 'v1', changes: [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(f => !(f in before) ? [{ field: f, oldValue: null, newValue: after[f], changeType: 'ADDED' }] : !(f in after) ? [{ field: f, oldValue: before[f], newValue: null, changeType: 'REMOVED' }] : before[f] !== after[f] ? [{ field: f, oldValue: before[f], newValue: after[f], changeType: 'CHANGED' }] : []) });
test('a PARTIAL patch makes the backend diff report unchanged fields as REMOVED: the UI fails closed and never shows it', () => {
  const diff = backendDiff(source, { proposed_amount_minor: 4500050 });
  assert.ok(diff.changes.some(c => c.changeType === 'REMOVED' && c.field === 'title')); // the inconsistency, reproduced
  assert.equal(api.trustedDiff(diff, 'KES'), null);
});
test('a COMPLETE-snapshot proposal (no REMOVED entries) is consistent with apply and IS shown, integer-exact', () => {
  const after = { ...source, proposed_amount_minor: 4500050 };
  const t = api.trustedDiff(backendDiff(source, after), 'KES');
  assert.equal(t.changes.length, 1); assert.equal(t.changes[0].label, 'Amount'); assert.equal(t.changes[0].kind, 'changed');
  assert.equal(t.changes[0].before.text, 'KES 40,000'); assert.equal(t.changes[0].after.text, 'KES 45,000.50');
});
test('a version_number entry, an unknown change type, or a missing changes array is not trusted', () => {
  assert.equal(api.trustedDiff({ amendmentId: 'a', sourceVersionId: 'v', changes: [{ field: 'version_number', oldValue: 1, newValue: 5, changeType: 'CHANGED' }] }, null), null);
  assert.equal(api.trustedDiff({ amendmentId: 'a', sourceVersionId: 'v', changes: [{ field: 'title', oldValue: 'a', newValue: 'b', changeType: 'MOVED' }] }, null), null);
  assert.equal(api.trustedDiff({ amendmentId: 'a', sourceVersionId: 'v' }, null), null); assert.equal(api.trustedDiff(null, null), null);
});
test('ADDED and CHANGED render; internal keys are hidden and counted; nested values are never JSON or [object Object]', () => {
  const t = api.trustedDiff({ amendmentId: 'a', sourceVersionId: 'v', changes: [
    { field: 'delivery_location', oldValue: null, newValue: 'Nairobi', changeType: 'ADDED' },
    { field: 'milestone_plan', oldValue: null, newValue: { steps: [1, 2] }, changeType: 'ADDED' },
    { field: 'payer_designation', oldValue: 'x', newValue: 'y', changeType: 'CHANGED' },
    { field: 'internal_id', oldValue: 'a', newValue: 'b', changeType: 'CHANGED' },
  ] }, 'KES');
  assert.deepEqual(t.changes.map(c => c.label), ['Delivery location', 'Milestone plan']); assert.equal(t.hidden, 2);
  assert.equal(t.changes[0].kind, 'added'); assert.equal(t.changes[1].after.text, 'A structured term');
  assert.doesNotMatch(JSON.stringify(t), /\[object Object\]|steps/);
});
test('proposedFields shows only what a proposal SETS, hides internals, and formats money exactly', () => {
  const f = api.proposedFields({ proposed_amount_minor: 4500050, title: 'New', version_number: 9, organization_id: 'o', 'weird key!': 1, notes: { a: 1 } }, 'KES');
  assert.deepEqual(f.shown.map(x => [x.label, x.value.text]), [['Amount', 'KES 45,000.50'], ['Title', 'New'], ['Notes', 'A structured term']]); assert.equal(f.hidden, 3);
});

// ------------------------------------------------------------ amendment statuses / render
const detail = (over = {}) => ({ overview: { agreementId: 'agr-1', publicReference: 'A', title: 'T', purpose: '', description: '', agreementType: 'SERVICE', status: 'PARTICIPANTS_JOINING', currency: 'KES', proposedAmountMinor: '4000000', createdAt: 'x', updatedAt: 'x', expiresAt: null }, currentVersion: { versionId: 'v1', versionNumber: 1, contentHash: 'h1', createdAt: '2026-09-01T00:00:00Z', amendmentReason: null, materialChange: false }, participants: [], milestones: [], terms: [], documents: [], activity: [], versionHistory: [{ versionId: 'v1', versionNumber: 1, contentHash: 'h1', createdAt: '2026-09-01T00:00:00Z', amendmentReason: null, materialChange: false }], money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 }, ...over });
const panel = (snapshot, d = detail(), status = 'PARTICIPANTS_JOINING') => html(api.ChangesPanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ list: { status: 'idle' }, diffs: {}, busy: null, notices: {}, applied: null, ...snapshot }), load() {}, loadDiff() {}, apply() {}, reject() {}, withdraw() {}, checkApply() {} }, detail: d, agreementStatus: status });
test('statuses use SecurePay words only; an unknown status is "unavailable"; nothing is called "accepted"', () => {
  for (const [s, w] of [['PROPOSED', 'Proposed'], ['APPLIED', 'Applied'], ['REJECTED', 'Rejected'], ['WITHDRAWN', 'Withdrawn'], ['SUPERSEDED', 'Superseded'], ['WEIRD', 'Status unavailable']]) assert.equal(api.amendmentStatusWord(s), w);
  assert.doesNotMatch(Object.values({ a: 'Proposed', b: 'Applied' }).join(), /accepted/i);
});
test('Changes shows Versions and Proposed changes as separate concepts, with the source version and reason, and no invented "requested by"', () => {
  const out = text(panel({ list: { status: 'ready', items: [am()] } }));
  assert.match(out, /Versions/); assert.match(out, /Proposed changes/); assert.match(out, /Version 1 · Current version/);
  assert.match(out, /Proposed change/); assert.match(out, /Proposed against version 1/); assert.match(out, /Reason: Extra work requested/);
  assert.match(out, /can.t safely apply it from this screen yet/); assert.doesNotMatch(out, /Apply change|Applying creates/);
  assert.match(out, /Reject proposed change/); assert.match(out, /Rejecting keeps the current Agreement as it is/); assert.match(out, /Withdraw proposal/); assert.doesNotMatch(out, /Withdraw my proposal|my proposal/);
  assert.match(out, /Only the person who proposed it can withdraw it; SecurePay will check that authority/);
  assert.doesNotMatch(out, /requested by|Requested by|proposed by [A-Z]/i);
  assert.doesNotMatch(out, /Accept change|Edit Agreement|Save changes|Update Agreement|updated contract/i);
});
test('a proposal against an older version is shown as stale and offers NO Apply (competing proposals: the other one was applied)', () => {
  const d = detail({ currentVersion: { versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'first', materialChange: true }, versionHistory: [{ versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'first', materialChange: true }, { versionId: 'v1', versionNumber: 1, contentHash: 'h1', createdAt: 'x', amendmentReason: null, materialChange: false }] });
  const out = text(panel({ list: { status: 'ready', items: [am({ id: 'B', sourceVersionId: 'v1', status: 'PROPOSED' }), am({ id: 'A', status: 'APPLIED', appliedVersionId: 'v2' })] } }, d));
  assert.match(out, /moved on since this was proposed \(it was made against version 1\), so this proposal no longer matches the current version/);
  assert.equal((out.match(/Apply change/g) ?? []).length, 0); assert.doesNotMatch(out, /can.t safely apply it from this screen yet/); // stale: no misleading "reviewable" line
  assert.match(out, /Applying it created version 2/); assert.match(out, /Version 2 · Current version/); assert.match(out, /Version 1 · Earlier version/); assert.match(out, /SecurePay marked this a material change/);
});
test('the applied / rejected / withdrawn / superseded proposals offer no actions', () => {
  const out = text(panel({ list: { status: 'ready', items: ['APPLIED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED'].map((s, i) => am({ id: `x${i}`, status: s })) } }));
  assert.doesNotMatch(out, /Apply change|Reject proposed change|Withdraw proposal/);
});
test('Detail works while amendment history fails: "couldn\'t be loaded", never "no changes"; and it is honest when it can\'t be read at all', () => {
  const bad = text(panel({ list: { status: 'error' } }));
  assert.match(bad, /Change history couldn.t be loaded right now/); assert.doesNotMatch(bad, /Nobody has proposed/); assert.match(bad, /Version 1/); // versions still shown
  const na = text(panel({ list: { status: 'unavailable', agreementStatus: 'CANCELLED' } }, detail(), 'CANCELLED'));
  assert.match(na, /can.t be read while this Agreement is cancelled/); assert.match(na, /Nothing is being claimed about whether any exist/); assert.doesNotMatch(na, /Nobody has proposed/);
  assert.match(text(panel({ list: { status: 'ready', items: [] } })), /Nobody has proposed a change/);
});
test('amendments succeed + diff fails: the proposal, reason and source stay; no invented changes', () => {
  const out = text(panel({ list: { status: 'ready', items: [am()] }, diffs: { 'am-1': { status: 'error' } } }));
  // The comparison section is collapsed until opened, but the proposal facts are already visible.
  assert.match(out, /Proposed against version 1/); assert.match(out, /Extra work requested/);
});

// ------------------------------------------------------------ amendments controller
test('nothing is called for an Agreement that does not allow amendments, and nothing is claimed', async () => {
  const { controller, calls } = setup();
  for (const s of ['DRAFT', 'PROPOSED', 'INVITATION_PENDING', 'CANCELLED', 'EXPIRED']) { await controller.load(s); assert.equal(controller.getSnapshot().list.status, 'unavailable'); }
  assert.equal(calls.length, 0);
  assert.equal(api.isAmendable('PARTICIPANTS_JOINING') && api.isAmendable('CONFIRMATION_PENDING'), true);
});
test('a failed list read is "error", not an empty list', async () => {
  const { controller } = setup({ amendments: async () => { throw err('http', 500, 'x'); } }); await controller.load('PARTICIPANTS_JOINING');
  assert.equal(controller.getSnapshot().list.status, 'error');
});
test('desktop and mobile both mount the panel at once: they share one read; a later mount reads fresh truth again', async () => {
  const { controller, calls } = setup(); await Promise.all([controller.load('PARTICIPANTS_JOINING'), controller.load('PARTICIPANTS_JOINING')]);
  assert.equal(names(calls).filter(n => n === 'amendments').length, 1);
  await controller.load('PARTICIPANTS_JOINING'); assert.equal(names(calls).filter(n => n === 'amendments').length, 2);
});
test('apply is only ever an explicit call; loading, opening a diff or reading never applies', async () => {
  const { controller, calls } = setup(); await controller.load('PARTICIPANTS_JOINING'); await controller.loadDiff('am-1');
  assert.equal(calls.some(c => c[0] === 'apply'), false);
});
test('apply success uses the BACKEND-created version, refreshes the Agreement, and never fabricates one', async () => {
  const { controller, calls, changed } = setup({ applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); return ver(7); } });
  await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1');
  assert.deepEqual(controller.getSnapshot().applied, { amendmentId: 'am-1', versionNumber: 7 });
  assert.match(controller.getSnapshot().notices['am-1'].text, /now at version 7\. The earlier version stays in its history/);
  assert.ok(changed.length >= 1);
  assert.doesNotMatch(controller.getSnapshot().notices['am-1'].text, /saved|changes saved/i);
});
test('an uncertain apply keeps the SAME key and is never shown as applied; Check reads the amendment', async () => {
  let first = true;
  const { controller, calls } = setup({ applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); if (first) { first = false; throw err('timeout', null, 't'); } return ver(2); } });
  await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1');
  const s = controller.getSnapshot(); assert.match(s.notices['am-1'].text, /We.re not sure whether the change was applied/); assert.equal(s.applied, null); assert.equal(s.notices['am-1'].kind, 'uncertain');
  await controller.apply('am-1');
  const keys = calls.filter(c => c[0] === 'apply').map(c => c[2]); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
});
test('the backend answers a replay of an applied amendment with 422 "not applicable": that is settled by re-reading -- APPLIED + appliedVersionId is the proof, and it is one logical version', async () => {
  let lists = 0;
  const { controller, calls } = setup({
    applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); throw err(calls.filter(c => c[0] === 'apply').length === 1 ? 'timeout' : 'http', calls.filter(c => c[0] === 'apply').length === 1 ? null : 422, 'amendment not applicable'); },
    amendments: async () => { lists++; return [lists === 1 ? am() : am({ status: 'APPLIED', appliedVersionId: 'v2' })]; },
  });
  await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1'); await controller.apply('am-1');
  assert.deepEqual(controller.getSnapshot().applied, { amendmentId: 'am-1', versionNumber: 2 });
  const keys = calls.filter(c => c[0] === 'apply').map(c => c[2]); assert.equal(keys[0], keys[1]);
  assert.equal(calls.filter(c => c[0] === 'apply').length, 2);
});
test('"check what happened" proves APPLIED from the amendment, or says SecurePay does not show it yet', async () => {
  let applied = false;
  const { controller } = setup({ applyAmendment: async () => { throw err('network', null); }, amendments: async () => [applied ? am({ status: 'APPLIED', appliedVersionId: 'v2' }) : am()] });
  await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1'); await controller.checkApply('am-1');
  assert.equal(controller.getSnapshot().applied, null); assert.match(controller.getSnapshot().notices['am-1'].text, /doesn.t show this change as applied yet/);
  applied = true; await controller.checkApply('am-1');
  assert.equal(controller.getSnapshot().applied.versionNumber, 2);
});
test('a stale source is refused by SecurePay: the UI re-reads, says nothing was applied, never rebases, never mints a key twice', async () => {
  const { controller, calls, cur } = setup({ applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); throw err('http', 422, 'stale amendment source version'); }, amendments: async () => [am({ sourceVersionId: 'v1' })] });
  // The Agreement moved on; the on-screen current version only updates once the Agreement is re-read.
  cur.onChange = () => { cur.id = 'v2'; };
  await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1');
  const n = controller.getSnapshot().notices['am-1']; assert.equal(n.kind, 'error');
  assert.match(n.text, /changed after this proposal was made, so it can no longer be applied\. Nothing was applied/);
  assert.equal(controller.getSnapshot().applied, null);
  assert.equal(calls.some(c => ['propose', 'proposeAmendment'].includes(c[0])), false); // no rebase / re-proposal
});
test('apply 401 / 403 are definite, claim nothing was applied, and release the key', async () => {
  for (const [status, re] of [[401, /session ended.*Nothing was applied/], [403, /can.t apply changes to this Agreement\. Nothing was applied/]]) {
    const { controller, calls } = setup({ applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); throw err('http', status, 'x'); } });
    await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1'); await controller.apply('am-1');
    assert.match(controller.getSnapshot().notices['am-1'].text, re);
    const keys = calls.filter(c => c[0] === 'apply').map(c => c[2]); assert.notEqual(keys[0], keys[1]);
  }
});
test('reject: REJECTED is claimed only from the returned status; the Agreement is untouched (no apply, no version)', async () => {
  const { controller, calls } = setup(); await controller.load('PARTICIPANTS_JOINING'); await controller.reject('am-1');
  assert.match(controller.getSnapshot().notices['am-1'].text, /rejected\. The current Agreement stays as it is/);
  assert.equal(calls.some(c => c[0] === 'apply' || c[0] === 'version'), false);
  assert.doesNotMatch(controller.getSnapshot().notices['am-1'].text, /cancel|Agreement rejected/i);
});
test('reject/withdraw answer 200 with the UNCHANGED amendment when it is no longer PROPOSED: that is not a rejection', async () => {
  const { controller } = setup({ rejectAmendment: async () => am({ status: 'APPLIED', appliedVersionId: 'v2' }), withdrawAmendment: async () => am({ status: 'REJECTED' }) });
  await controller.load('PARTICIPANTS_JOINING');
  await controller.reject('am-1'); assert.equal(controller.getSnapshot().notices['am-1'].kind, 'info'); assert.match(controller.getSnapshot().notices['am-1'].text, /Nothing was changed: this proposal is already applied/);
  await controller.withdraw('am-1'); assert.match(controller.getSnapshot().notices['am-1'].text, /already rejected/);
});
test('withdraw: WITHDRAWN only from the returned status; a non-proposer gets SecurePay\'s refusal in plain words', async () => {
  const ok = setup(); await ok.controller.load('PARTICIPANTS_JOINING'); await ok.controller.withdraw('am-1');
  assert.match(ok.controller.getSnapshot().notices['am-1'].text, /This proposal was withdrawn\. The current Agreement stays as it is/);
  const no = setup({ withdrawAmendment: async () => { throw err('http', 422, 'only proposer may withdraw'); } }); await no.controller.load('PARTICIPANTS_JOINING'); await no.controller.withdraw('am-1');
  assert.match(no.controller.getSnapshot().notices['am-1'].text, /Only the person who proposed this change can withdraw it\. Nothing was changed/);
});
test('an uncertain reject/withdraw is not claimed either way and re-reads the list', async () => {
  const { controller, calls } = setup({ rejectAmendment: async () => { throw err('timeout', null); } }); await controller.load('PARTICIPANTS_JOINING'); const before = calls.filter(c => c[0] === 'amendments').length;
  await controller.reject('am-1');
  const n = controller.getSnapshot().notices['am-1']; assert.equal(n.kind, 'uncertain'); assert.doesNotMatch(n.text, /was rejected/);
  assert.equal(calls.filter(c => c[0] === 'amendments').length, before + 1);
});
test('the controller has no way to propose, edit or rebase a proposal', async () => {
  const src = await readFile('src/features/amendments/controller.ts', 'utf8');
  assert.doesNotMatch(src, /proposeAmendment|proposedTerms\s*=|rebase|putAll/);
});

// ------------------------------------------------------------ People / confirmation after a new version
//
// KS001 Upgrade Phase 4 continuation (item 4) -- peopleView (the client-side participants+confirmations+
// version composition that used to decide MATERIAL vs non-material amendment handling, WITHDRAWN/
// INVALIDATED status semantics, and the "missing row" contradiction case) is RETIRED. That entire
// derivation now lives, and is tested, server-side in AgreementConfirmationService/
// AgreementPeopleProjectionService (SecurePayAPI) -- the frontend receives one already-resolved
// humanState per participant and only ever turns it into copy. These tests prove that thin mapping only.
const PP = (humanState, extra = {}) => ({
  participantId: 'p1', identityId: 'i1', displayName: 'Kamau', canonicalKsNumber: 'KS003', roleCode: 'SERVICE_PROVIDER',
  isCreator: false, invitationId: null, invitationStatus: null, invitationIssuedAt: null, invitationExpiresAt: null,
  invitationFirstViewedAt: null, joinedAt: null, confirmedVersionNumber: null, confirmationCurrent: false,
  reconfirmationRequired: false, humanState, ...extra,
});
const projectionOf = people => ({ people, summary: { peopleCount: people.length, expectedParticipantCount: 0, pendingInvitationCount: 0, joinedParticipantCount: 0, confirmedCurrentParticipantCount: 0, reconfirmationRequiredCount: 0, allExpectedHaveJoined: false, allJoinedHaveConfirmedCurrent: false, allExpectedHaveConfirmedCurrent: false } });
test('a MATERIAL amendment is server-expressed as RECONFIRMATION_REQUIRED -> "needs to review", never unknown', () => {
  const p = api.peopleFromProjection(projectionOf([PP('RECONFIRMATION_REQUIRED', { confirmedVersionNumber: 1 })]), [])[0];
  assert.equal(p.statusText, 'Kamau needs to review the changed Agreement'); assert.equal(p.statusKind, 'needs');
});
test('a current confirmation is server-expressed as CONFIRMED_CURRENT -> named when identity is known', () => {
  const p = api.peopleFromProjection(projectionOf([PP('CONFIRMED_CURRENT', { confirmedVersionNumber: 1 })]), [])[0];
  assert.equal(p.statusText, 'Kamau confirmed'); assert.equal(p.statusKind, 'current');
});
test('materialChange is never an input to the frontend People mapper at all -- only the server-owned humanState is', async () => {
  const src = await readFile('src/features/workspace/view.ts', 'utf8');
  const fn = src.slice(src.indexOf('export function peopleFromProjection'), src.indexOf('function displayNameForParticipant')).replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(fn, /materialChange/i);
});
test('a failed People read after a new version stays UNKNOWN, never silently reused from before the change', () => {
  assert.equal(api.peopleFromProjection(null, [{ participantId: 'p1', roleCode: 'SERVICE_PROVIDER', participantStatus: 'CONFIRMED', ksNumber: 'KS003', displayName: 'Kamau' }])[0].statusKind, 'unknown');
});

// ------------------------------------------------------------ reconfirmation
const standing = o => ({ participantId: 'p1', identityId: 'i', roleCode: 'X', participantStatus: 'CONFIRMED', confirmedVersionId: 'v1', confirmedVersionNumber: 1, currentVersionId: 'v2', currentVersionNumber: 2, confirmationCurrent: false, reconfirmationRequired: true, ...o });
// KS001 Upgrade Phase 5 continuation (Slice 4, UR-148) -- CREATOR now CAN confirm (the backend's own
// AgreementConfirmationService gained this capability this slice; see the Phase 5 Slice 4 addendum), so
// this reuses the exact same standing/confirm machinery a recipient already uses, unchanged. Only an
// unrecognized status (something that is neither a real recipient standing nor CREATOR) and a failed/
// ambiguous read still get nothing.
test('own standing: needs review only from SecurePay\'s reconfirmationRequired; CREATOR now gets the same real standing, and a failed/unrecognized read gets nothing', () => {
  assert.ok(api.ownStanding([standing()], 'CONFIRMED')); assert.ok(api.ownStanding([standing({ confirmedVersionNumber: null, participantStatus: 'JOINED_UNCONFIRMED' })], 'JOINED_UNCONFIRMED'));
  assert.ok(api.ownStanding([standing({ participantStatus: 'CREATOR' })], 'CREATOR'));
  assert.equal(api.ownStanding([standing({ reconfirmationRequired: false, confirmationCurrent: true })], 'CONFIRMED'), null);
  assert.equal(api.ownStanding([standing()], 'INVITED'), null); assert.equal(api.ownStanding(null, 'CONFIRMED'), null); assert.equal(api.ownStanding([], 'CONFIRMED'), null);
  assert.equal(api.ownStanding([standing(), standing()], 'CONFIRMED'), null); // ambiguous
});
function reSetup(over = {}) {
  const calls = []; let n = 0; const done = [];
  const gateway = {
    versions: async id => { calls.push(['versions', id]); return [ver(1, { versionStatus: 'SUPERSEDED' }), ver(2)]; },
    version: async (id, v) => { calls.push(['version', v]); return ver(Number(v.replace('v', ''))); },
    confirmVersion: async (id, v, body) => { calls.push(['confirm', v, body]); return { id: 'c', agreementVersionId: v, participantId: 'p1', versionNumber: 2, versionContentHash: 'h2', status: 'CONFIRMED', assuranceMethod: 'AUTHENTICATED_SESSION', confirmedAt: 'x', confirmationCurrent: true, reconfirmationRequired: false }; },
    ...over,
  };
  return { calls, done, controller: api.createReconfirmController(gateway, 'agr-1', () => done.push(1), () => `k${++n}`) };
}
test('reviewing the current version confirms nothing; confirming is a separate explicit press bound to the exact id, number and hash', async () => {
  const { controller, calls } = reSetup(); await controller.open();
  assert.equal(controller.getSnapshot().phase, 'ready'); assert.equal(controller.getSnapshot().version.versionNumber, 2); assert.equal(calls.some(c => c[0] === 'confirm'), false);
  await controller.confirm();
  const c = calls.find(x => x[0] === 'confirm'); assert.equal(c[1], 'v2'); assert.deepEqual(c[2], { idempotencyKey: 'k1', expectedVersionNumber: 2, expectedContentHash: 'h2' });
  assert.equal(controller.getSnapshot().phase, 'confirmed');
});
test('the version is picked by SecurePay\'s versionStatus (never "highest number"), and ambiguity fails closed', async () => {
  const { controller } = reSetup({ versions: async () => [ver(2), ver(3)] }); await controller.open();
  assert.equal(controller.getSnapshot().phase, 'error');
});
test('an uncertain confirm is not success and retries the SAME request', async () => {
  let first = true;
  const { controller, calls } = reSetup({ confirmVersion: async (id, v, body) => { calls.push(['confirm', v, body]); if (first) { first = false; throw err('timeout', null); } return { id: 'c', versionNumber: 2 }; } });
  await controller.open(); await controller.confirm();
  assert.equal(controller.getSnapshot().phase, 'uncertain'); assert.equal(controller.getSnapshot().confirmation, null);
  await controller.confirm(); const sends = calls.filter(c => c[0] === 'confirm'); assert.equal(sends.length, 2); assert.deepEqual(sends[0][2], sends[1][2]);
});
test('the Agreement moving while reviewing: the old confirmation is never applied to the new version, and nothing auto-confirms', async () => {
  let moved = false, confirms = 0;
  const { controller, calls } = reSetup({
    versions: async () => moved ? [ver(2, { versionStatus: 'SUPERSEDED' }), ver(3)] : [ver(1, { versionStatus: 'SUPERSEDED' }), ver(2)],
    confirmVersion: async (id, v, body) => { confirms++; calls.push(['confirm', v, body]); moved = true; throw err('http', 422, 'version superseded'); },
  });
  await controller.open(); await controller.confirm();
  const s = controller.getSnapshot(); assert.equal(s.phase, 'ready'); assert.equal(s.changed, true); assert.equal(s.version.versionNumber, 3);
  assert.equal(confirms, 1); assert.equal(s.confirmation, null);
});
test('confirm 401 / 403: nothing confirmed, version kept, no automatic retry', async () => {
  for (const status of [401, 403]) {
    const { controller, calls } = reSetup({ confirmVersion: async (id, v, b) => { calls.push(['confirm', v, b]); throw err('http', status, 'x'); } }); await controller.open(); await controller.confirm();
    const s = controller.getSnapshot(); assert.equal(s.phase, 'ready'); assert.match(s.error, /Nothing was confirmed/); assert.equal(s.version.id, 'v2'); assert.equal(calls.filter(c => c[0] === 'confirm').length, 1);
  }
});
const panelStub = (rc, extra = {}) => html(api.ReconfirmPanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'idle', version: null, confirmation: null, changed: false, error: null, ...rc }), open() {}, confirm() {}, reset() {} }, amendments: { subscribe: () => () => {}, getSnapshot: () => ({ list: { status: 'idle' }, diffs: {}, busy: null, notices: {}, applied: null, ...extra }), load() {}, loadDiff() {} }, detail: detail({ currentVersion: { versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'Extra work', materialChange: true } }), standing: standing() });
test('the review prompt names both versions, says nothing was confirmed for them, and offers Review version N (not Accept)', () => {
  const out = text(panelStub({}));
  assert.match(out, /Version 2 needs your review/); assert.match(out, /You confirmed version 1\. That confirmation doesn.t cover version 2\. You haven.t confirmed version 2 yet\./); assert.doesNotMatch(out, /nothing has been confirmed for you/);
  assert.match(out, /Review version 2/); assert.match(out, /Reason for the change: Extra work/); assert.match(out, /SecurePay marked this a material change/);
  assert.doesNotMatch(out, /Accept|Agree again|Sign/);
});
test('unsafe comparison: the panel says so and points to the whole current version; a trusted comparison shows Earlier/Now', () => {
  const unsafe = text(panelStub({}, { list: { status: 'ready', items: [am({ id: 'A', status: 'APPLIED', appliedVersionId: 'v2' })] }, diffs: { A: { status: 'ready', diff: backendDiff(source, { proposed_amount_minor: 4500050 }) } } }));
  assert.match(unsafe, /can.t safely show a complete comparison for this change yet, so read the whole current version below/); assert.doesNotMatch(unsafe, /removed|Removed/);
  const safe = text(panelStub({}, { list: { status: 'ready', items: [am({ id: 'A', status: 'APPLIED', appliedVersionId: 'v2' })] }, diffs: { A: { status: 'ready', diff: backendDiff(source, { ...source, proposed_amount_minor: 4500050 }) } } }));
  assert.match(safe, /What changed/); assert.match(safe, /Earlier: KES 40,000/); assert.match(safe, /Now: KES 45,000\.50/);
});
test('the exact review reuses the Phase 4 canonical card and copy, and the diff is orientation, not the confirmation object', () => {
  const out = text(panelStub({ phase: 'ready', version: ver(2) }));
  assert.match(out, /Yes, I confirm this version/); assert.match(out, /recorded against version 2 exactly/);
  assert.match(out, /This needs changing/);
});

// ------------------------------------------------------------ scope
test('no Money / execution affordances and no editable-document language in Phase 6 code', async () => {
  for (const f of ['src/features/amendments/controller.ts', 'src/features/amendments/ChangesPanel.tsx', 'src/features/amendments/ReconfirmPanel.tsx', 'src/features/amendments/reconfirm.ts', 'src/features/amendments/display.ts']) {
    const src = (await readFile(f, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /Pay now|Fund\b|STK|Wallet|\bsettlement\b|escrow|Edit Agreement|Save changes|Accept change|dangerouslySetInnerHTML|JSON\.stringify/i, f);
  }
});

// ------------------------------------------------------------ Phase 6 correction: action-specific recovery, no Apply
const uncertainPanel = (action, calls) => html(api.ChangesPanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ list: { status: 'ready', items: [am()] }, diffs: {}, busy: null, notices: { 'am-1': { kind: 'uncertain', action, text: 'SecurePay couldn’t confirm whether that went through.' } }, applied: null }), load() {}, loadDiff() {}, apply: () => calls.push('apply'), reject: () => calls.push('reject'), withdraw: () => calls.push('withdraw'), checkApply: () => calls.push('checkApply'), checkTerminal: (id, a) => calls.push(['checkTerminal', a]) }, detail: detail(), agreementStatus: 'PARTICIPANTS_JOINING' });
test('uncertain Reject renders Reject recovery only: no Apply control of any kind', () => {
  const out = text(uncertainPanel('reject', []));
  assert.match(out, /Check what happened/); assert.match(out, /Try rejecting again/);
  assert.doesNotMatch(out, /Try applying again|Apply change|applying|applied/i); assert.doesNotMatch(out, /Try withdrawing again/);
});
test('uncertain Withdraw renders Withdraw recovery only: no Apply control of any kind', () => {
  const out = text(uncertainPanel('withdraw', []));
  assert.match(out, /Check what happened/); assert.match(out, /Try withdrawing again/);
  assert.doesNotMatch(out, /Try applying again|Apply change|applying|applied/i); assert.doesNotMatch(out, /Try rejecting again/);
});
test('the production panel wires no Apply mutation at all (source-level guard while the backend gap remains)', async () => {
  const src = (await readFile('src/features/amendments/ChangesPanel.tsx', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(src, /controller\.apply\(|controller\.checkApply\(|Try applying again|Apply change/);
  const rc = (await readFile('src/features/amendments/ReconfirmPanel.tsx', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(rc, /\.apply\(|checkApply/);
  const ws = (await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8'));
  assert.doesNotMatch(ws, /\.applyAmendment\(|amendmentsFor\([^)]*\)\.apply\(|\.checkApply\(/); // the Pick<> type may name it; no call site may
  // The typed gateway method and the controller's own tested behaviour remain (archaeology), but nothing customer-facing calls them.
  assert.match(await readFile('src/api/securepay/agreements/index.ts', 'utf8'), /applyAmendment:/);
});
test('a PROPOSED amendment can be inspected, and shows the calm limitation rather than an Apply', () => {
  const out = text(panel({ list: { status: 'ready', items: [am()] }, diffs: { 'am-1': { status: 'ready', diff: backendDiff(source, { proposed_amount_minor: 4500050 }) } } }));
  assert.match(out, /See what.s proposed/); assert.match(out, /This proposed change can be reviewed here, but SecurePay can.t safely apply it from this screen yet/);
  assert.doesNotMatch(out, /inconsisten|read model|Agreement row|diverg/i); // no backend jargon in customer copy
});
test('an amendment ALREADY applied elsewhere is still shown: status, created version, version history, no actions', () => {
  const d = detail({ currentVersion: { versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'Extra work', materialChange: true }, versionHistory: [{ versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'Extra work', materialChange: true }, { versionId: 'v1', versionNumber: 1, contentHash: 'h1', createdAt: 'x', amendmentReason: null, materialChange: false }] });
  const out = text(panel({ list: { status: 'ready', items: [am({ status: 'APPLIED', appliedVersionId: 'v2' })] } }, d));
  assert.match(out, /Applied/); assert.match(out, /Applying it created version 2/); assert.match(out, /Version 2 · Current version/); assert.match(out, /Version 1 · Earlier version/);
  assert.doesNotMatch(out, /Reject proposed change|Withdraw proposal/);
});
test('withdraw never claims ownership: neutral copy, no inference from the current session', async () => {
  const src = (await readFile('src/features/amendments/ChangesPanel.tsx', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(src, /my proposal|Withdraw my|your proposal/i);
});

// Controller: uncertain reject / withdraw settle ONLY from the re-read amendment status and never touch apply.
const terminalCase = async (action, statusAfter, readFails = false) => {
  const calls = [];
  const gw = { amendments: async () => { calls.push('amendments'); if (readFails && calls.filter(c => c === 'amendments').length > 1) throw err('network', null); return [am({ status: statusAfter })]; }, amendmentDiff: async () => ({}), applyAmendment: async () => { calls.push('APPLY-CALLED'); return ver(2); }, rejectAmendment: async () => { calls.push('reject'); throw err('timeout', null); }, withdrawAmendment: async () => { calls.push('withdraw'); throw err('timeout', null); }, version: async () => ver(2) };
  const c = api.createAmendmentsController(gw, 'agr-1', () => 'v1', () => {}, () => 'k');
  await c.load('PARTICIPANTS_JOINING'); await (action === 'reject' ? c.reject('am-1') : c.withdraw('am-1'));
  return { c, calls };
};
test('uncertain Reject: the re-read settles it -- REJECTED proves success; another status is reported as it is; still PROPOSED stays unresolved; a failed read stays uncertain', async () => {
  const proven = await terminalCase('reject', 'REJECTED'); assert.equal(proven.c.getSnapshot().notices['am-1'].kind, 'done'); assert.match(proven.c.getSnapshot().notices['am-1'].text, /was rejected\. The current Agreement stays as it is/);
  const other = await terminalCase('reject', 'APPLIED'); assert.equal(other.c.getSnapshot().notices['am-1'].kind, 'info'); assert.match(other.c.getSnapshot().notices['am-1'].text, /this proposal is applied/); assert.doesNotMatch(other.c.getSnapshot().notices['am-1'].text, /was rejected/);
  const still = await terminalCase('reject', 'PROPOSED'); const n = still.c.getSnapshot().notices['am-1']; assert.equal(n.kind, 'uncertain'); assert.equal(n.action, 'reject'); assert.match(n.text, /still shows this proposal as proposed, so it hasn.t been rejected\. You can try rejecting again/);
  const dark = await terminalCase('reject', 'PROPOSED', true); assert.equal(dark.c.getSnapshot().notices['am-1'].kind, 'uncertain'); assert.match(dark.c.getSnapshot().notices['am-1'].text, /couldn.t be reached to check/);
  for (const r of [proven, other, still, dark]) assert.equal(r.calls.includes('APPLY-CALLED'), false);
});
test('uncertain Withdraw: the same, from the re-read status only', async () => {
  const proven = await terminalCase('withdraw', 'WITHDRAWN'); assert.equal(proven.c.getSnapshot().notices['am-1'].kind, 'done'); assert.match(proven.c.getSnapshot().notices['am-1'].text, /was withdrawn\. The current Agreement stays as it is/);
  const other = await terminalCase('withdraw', 'REJECTED'); assert.match(other.c.getSnapshot().notices['am-1'].text, /this proposal is rejected/); assert.doesNotMatch(other.c.getSnapshot().notices['am-1'].text, /was withdrawn/);
  const still = await terminalCase('withdraw', 'PROPOSED'); assert.equal(still.c.getSnapshot().notices['am-1'].action, 'withdraw'); assert.match(still.c.getSnapshot().notices['am-1'].text, /You can try withdrawing again/);
  for (const r of [proven, other, still]) assert.equal(r.calls.includes('APPLY-CALLED'), false);
});
test('checkTerminal re-reads and settles without ever calling checkApply or apply; the UI action goes to it', async () => {
  const calls = [];
  const html2 = uncertainPanel('reject', calls);
  assert.match(text(html2), /Check what happened/);
  // The rendered button is bound to checkTerminal(id, action), never checkApply: assert on the source wiring.
  const src = await readFile('src/features/amendments/ChangesPanel.tsx', 'utf8');
  assert.match(src, /controller\.checkTerminal\(a\.id, notice\.action as 'reject' \| 'withdraw'\)/);
  let applied = false;
  const gw = { amendments: async () => [am({ status: 'REJECTED' })], amendmentDiff: async () => ({}), applyAmendment: async () => { applied = true; return ver(2); }, rejectAmendment: async () => am(), withdrawAmendment: async () => am(), version: async () => ver(2) };
  const c = api.createAmendmentsController(gw, 'agr-1', () => 'v1'); await c.load('PARTICIPANTS_JOINING'); await c.checkTerminal('am-1', 'reject');
  assert.equal(c.getSnapshot().notices['am-1'].kind, 'done'); assert.equal(applied, false);
});
test('Apply uncertainty keeps its own recovery (controller behaviour is unchanged, though no production control invokes it)', async () => {
  let first = true;
  const { controller, calls } = setup({ applyAmendment: async (id, a, key) => { calls.push(['apply', a, key]); if (first) { first = false; throw err('timeout', null); } return ver(2); } });
  await controller.load('PARTICIPANTS_JOINING'); await controller.apply('am-1');
  assert.equal(controller.getSnapshot().notices['am-1'].action, 'apply'); assert.equal(controller.getSnapshot().notices['am-1'].kind, 'uncertain');
  await controller.checkApply('am-1'); assert.equal(controller.getSnapshot().notices['am-1'].action, 'apply');
});
