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

// Phase 7 Slice 5 -- the overview SecurePay returns (AgreementAmendmentReadService) and the decision response (AgreementController).
const change = (o = {}) => ({ type: 'OBLIGATION_BENEFICIARY', field: 'for', subject: 'Build the fence', before: 'No one yet', after: 'Wanjiru', ...o });
const open = (o = {}) => ({ amendmentId: 'am-1', sourceVersionNumber: 1, proposedByName: 'Peter', proposedByCaller: false, reason: 'Say who the fence is for', proposedAt: '2026-09-20T10:00:00Z', changes: [change()], responders: [{ name: 'Wanjiru', isCaller: true, decision: 'PENDING' }], callerMustRespond: true, callerCanWithdraw: false, liveWorkEffect: 'Nothing has started yet. Work that hasn’t started carries over to the new version unchanged unless this change names it.', ...o });
const past = (o = {}) => ({ amendmentId: 'am-1', outcome: 'APPLIED', proposedByName: 'Peter', sourceVersionNumber: 1, resultingVersionNumber: 2, closedAt: '2026-09-21T10:00:00Z', changes: [change()], ...o });
const ov = (o = {}) => ({ agreementId: 'agr-1', currentVersionId: 'v1', currentVersionNumber: 1, changeability: 'CHANGE_PENDING', callerCanPropose: false, open: open(), history: [], ...o });
const decision = (o = {}) => ({ amendmentId: 'am-1', status: 'APPLIED', resultingVersionId: 'v2', resultingVersionNumber: 2, replayed: false, ...o });

function setup(over = {}) {
  const calls = []; let n = 0; const changed = [];
  const gateway = {
    amendments: async id => { calls.push(['amendments', id]); return [am()]; },
    amendmentDiff: async (id, a) => { calls.push(['diff', a]); return { amendmentId: a, sourceVersionId: 'v1', changes: [] }; },
    amendmentOverview: async id => { calls.push(['overview', id]); return ov(); },
    acceptAmendment: async (id, a, body) => { calls.push(['accept', a, body]); return decision(); },
    rejectAmendment: async (id, a, body) => { calls.push(['reject', a, body]); return decision({ status: 'REJECTED', resultingVersionId: null, resultingVersionNumber: null }); },
    withdrawAmendment: async (id, a, body) => { calls.push(['withdraw', a, body]); return decision({ status: 'WITHDRAWN', resultingVersionId: null, resultingVersionNumber: null }); },
    ...over,
  };
  return { calls, changed, controller: api.createAmendmentsController(gateway, 'agr-1', () => { changed.push(1); }, () => `key-${++n}`) };
}
const names = calls => calls.map(c => c[0]);
const sent = (calls, what) => calls.filter(c => c[0] === what).map(c => c[2]);

// ------------------------------------------------------------ contract / session boundary
test('every amendment gateway method is authenticated and on the shared refresh list; the single-actor apply is gone', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  for (const m of ['amendments', 'amendmentDiff', 'amendmentOverview', 'acceptAmendment', 'rejectAmendment', 'withdrawAmendment']) {
    assert.ok(api.AUTHENTICATED_AGREEMENT_METHODS.includes(m), `${m} must be session-refreshed`);
    assert.match(src, new RegExp(`${m}: \\(.*?auth: 'required'`));
  }
  assert.doesNotMatch(src, /applyAmendment|\/apply`/);
  assert.equal(api.AUTHENTICATED_AGREEMENT_METHODS.includes('applyAmendment'), false);
  assert.doesNotMatch(src, /proposeAmendment/); // authoring is deliberately not built (UR registered): no unused mutation
});
test('gateway DTOs match the real backend shapes', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  assert.match(src, /interface AgreementAmendmentDto \{ id: string; sourceVersionId: string; proposedTerms: Record<string, unknown>; reason: string \| null; status: string; appliedVersionId: string \| null; createdAt: string; updatedAt: string \}/);
  assert.match(src, /interface AmendmentDiffDto \{ amendmentId: string; sourceVersionId: string; changes: AmendmentFieldChangeDto\[\] \}/);
  assert.match(src, /interface AmendmentDecisionDto \{ amendmentId: string; status: string; resultingVersionId: string \| null; resultingVersionNumber: number \| null; replayed: boolean \}/);
  assert.match(src, /interface AmendmentResponseBody \{ idempotencyKey: string; expectedAgreementVersionId: string \}/);
  assert.match(src, /interface AmendmentOverviewDto \{ agreementId: string; currentVersionId: string; currentVersionNumber: number; changeability: string; callerCanPropose: boolean; open: AmendmentProposalDto \| null; history: AmendmentPastDto\[\] \}/);
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
const panel = (snapshot, d = detail()) => html(api.ChangesPanel, { controller: { subscribe: () => () => {}, getSnapshot: () => ({ list: { status: 'idle' }, diffs: {}, overview: { status: 'idle' }, busy: null, notices: {}, applied: null, ...snapshot }), loadOverview() {}, accept() {}, reject() {}, withdraw() {}, check() {} }, detail: d });
const ready = o => ({ overview: { status: 'ready', overview: o } });
test('statuses use SecurePay words only; an unknown status is "unavailable"', () => {
  for (const [s, w] of [['PROPOSED', 'Proposed'], ['APPLIED', 'Applied'], ['REJECTED', 'Rejected'], ['WITHDRAWN', 'Withdrawn'], ['SUPERSEDED', 'Superseded'], ['WEIRD', 'Status unavailable']]) assert.equal(api.amendmentStatusWord(s), w);
  assert.equal(api.changeFieldWord('for'), 'Who the work is for'); assert.equal(api.changeFieldWord('obligation_terms'), 'Detail');
});
test('a responder sees who proposed, what changes (now vs proposed), who must agree, the live-work effect, and Agree / Reject -- never raw ids', () => {
  const out = text(panel(ready(ov())));
  assert.match(out, /Versions/); assert.match(out, /Proposed changes/); assert.match(out, /Version 1 · Current version/);
  assert.match(out, /Peter proposed this against version 1/); assert.match(out, /Reason: Say who the fence is for/);
  assert.match(out, /Build the fence · Who the work is for/); assert.match(out, /Now: No one yet/); assert.match(out, /Proposed: Wanjiru/);
  assert.match(out, /Who needs to agree/); assert.match(out, /You — hasn.t answered yet/);
  assert.match(out, /Work already set up: Nothing has started yet/);
  assert.match(out, /Agree to this change/); assert.match(out, /Reject this change/); assert.doesNotMatch(out, /Withdraw proposal/);
  assert.match(out, /Nothing changes until everyone above has agreed/); assert.match(out, /Agreeing to the change is not confirming the new version/);
  assert.doesNotMatch(out, /[0-9a-f]{8}-[0-9a-f]{4}|KS\d|OBLIGATION_BENEFICIARY|obligation_terms|am-1/);
  assert.doesNotMatch(out, /can.t safely apply|Apply change|Edit Agreement|Save changes/i);
});
test('the proposer sees "You proposed this", everyone else\'s answers, and only Withdraw', () => {
  const out = text(panel(ready(ov({ open: open({ proposedByCaller: true, proposedByName: 'Wanjiru', callerMustRespond: false, callerCanWithdraw: true, responders: [{ name: 'Peter', isCaller: false, decision: 'PENDING' }] }) }))));
  assert.match(out, /You proposed this against version 1/); assert.match(out, /Peter — hasn.t answered yet/); assert.match(out, /Withdraw proposal/);
  assert.doesNotMatch(out, /Agree to this change|Reject this change/);
});
test('a responder who already agreed (others still to answer) gets no controls; a stale proposal offers nothing', () => {
  const agreed = text(panel(ready(ov({ open: open({ callerMustRespond: false, responders: [{ name: 'Wanjiru', isCaller: true, decision: 'ACCEPTED' }, { name: 'Amina', isCaller: false, decision: 'PENDING' }] }) }))));
  assert.match(agreed, /You — agreed/); assert.match(agreed, /Amina — hasn.t answered yet/); assert.doesNotMatch(agreed, /Agree to this change|Reject this change|Withdraw proposal/);
  const stale = text(panel(ready(ov({ currentVersionNumber: 2, open: open() }))));
  assert.match(stale, /moved on since this was proposed, so SecurePay won.t apply it/); assert.doesNotMatch(stale, /Agree to this change|Reject this change/);
});
test('with nothing waiting, SecurePay\'s own changeability is explained; nothing to propose from here is said honestly', () => {
  for (const [c, re] of [['WORK_STARTED', /Work has started under the current version/], ['FUNDED', /Money has been paid in for this Agreement, so it can.t be changed/], ['CLOSED', /can.t be changed in its current state/], ['NO_COUNTERPARTY', /nobody else has joined yet/], ['WEIRD', /didn.t say whether this Agreement can be changed/]]) {
    assert.match(text(panel(ready(ov({ changeability: c, open: null })))), re, c);
  }
  const can = text(panel(ready(ov({ changeability: 'CAN_PROPOSE', callerCanPropose: true, open: null }))));
  assert.match(can, /No change is waiting/); assert.match(can, /takes effect only when everyone else on the Agreement agrees/); assert.match(can, /Proposing a change isn.t available from this screen yet/);
});
test('history shows each closed proposal with its outcome and the version it created; no actions', () => {
  const d = detail({ currentVersion: { versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'Say who the fence is for', materialChange: true }, versionHistory: [{ versionId: 'v2', versionNumber: 2, contentHash: 'h2', createdAt: 'x', amendmentReason: 'Say who the fence is for', materialChange: true }, { versionId: 'v1', versionNumber: 1, contentHash: 'h1', createdAt: 'x', amendmentReason: null, materialChange: false }] });
  const out = text(panel(ready(ov({ currentVersionId: 'v2', currentVersionNumber: 2, changeability: 'CAN_PROPOSE', open: null, history: [past(), past({ amendmentId: 'am-0', outcome: 'REJECTED', resultingVersionNumber: null })] })), d));
  assert.match(out, /Applied · proposed by Peter against version 1/); assert.match(out, /Everyone agreed; it created version 2/); assert.match(out, /Rejected · proposed by Peter/);
  assert.match(out, /Version 2 · Current version/); assert.match(out, /Version 1 · Earlier version/); assert.match(out, /SecurePay marked this a material change/);
  assert.doesNotMatch(out, /Agree to this change|Reject this change|Withdraw proposal/);
});
test('a failed overview read is "couldn\'t be loaded", never "no changes"; versions still shown', () => {
  const bad = text(panel({ overview: { status: 'error' } }));
  assert.match(bad, /Changes couldn.t be loaded right now/); assert.match(bad, /Nothing is being claimed about whether any exist/); assert.doesNotMatch(bad, /No change is waiting/); assert.match(bad, /Version 1/);
  assert.match(text(panel({ overview: { status: 'loading' } })), /Loading proposed changes/);
});
test('uncertain recovery is the uncertain action\'s own: Check what happened + the same action again', () => {
  for (const [action, re, not] of [['accept', /Try accepting again/, /Try rejecting again|Try withdrawing again/], ['reject', /Try rejecting again/, /Try accepting again|Try withdrawing again/], ['withdraw', /Try withdrawing again/, /Try accepting again|Try rejecting again/]]) {
    const out = text(panel({ ...ready(ov()), notices: { 'am-1': { kind: 'uncertain', action, text: 'SecurePay couldn’t confirm whether that went through.' } } }));
    assert.match(out, /Check what happened/); assert.match(out, re); assert.doesNotMatch(out, not);
  }
});


// ------------------------------------------------------------ amendments controller (Phase 7 Slice 5)
test('the raw list is not called for an Agreement that does not allow amendments; the overview is always readable', async () => {
  const { controller, calls } = setup();
  for (const s of ['DRAFT', 'PROPOSED', 'INVITATION_PENDING', 'CANCELLED', 'EXPIRED']) { await controller.load(s); assert.equal(controller.getSnapshot().list.status, 'unavailable'); }
  assert.equal(calls.length, 0);
  assert.equal(api.isAmendable('PARTICIPANTS_JOINING') && api.isAmendable('CONFIRMATION_PENDING'), true);
  await controller.loadOverview(); assert.equal(controller.getSnapshot().overview.status, 'ready');
});
test('a failed read is "error", not an empty answer', async () => {
  const { controller } = setup({ amendments: async () => { throw err('http', 500, 'x'); }, amendmentOverview: async () => { throw err('network', null); } });
  await controller.load('PARTICIPANTS_JOINING'); await controller.loadOverview();
  assert.equal(controller.getSnapshot().list.status, 'error'); assert.equal(controller.getSnapshot().overview.status, 'error');
});
test('desktop and mobile both mount the panel at once: they share one list read; a later mount reads fresh truth again', async () => {
  const { controller, calls } = setup(); await Promise.all([controller.load('PARTICIPANTS_JOINING'), controller.load('PARTICIPANTS_JOINING')]);
  assert.equal(names(calls).filter(n => n === 'amendments').length, 1);
  await controller.load('PARTICIPANTS_JOINING'); assert.equal(names(calls).filter(n => n === 'amendments').length, 2);
});
test('reading never responds: loading the overview, list or a diff sends no accept / reject / withdraw', async () => {
  const { controller, calls } = setup(); await controller.load('PARTICIPANTS_JOINING'); await controller.loadOverview(); await controller.loadDiff('am-1');
  assert.equal(calls.some(c => ['accept', 'reject', 'withdraw'].includes(c[0])), false);
});
test('nothing is sent before SecurePay\'s current version is known (the response must be version-bound)', async () => {
  const { controller, calls } = setup(); await controller.accept('am-1');
  assert.equal(calls.some(c => c[0] === 'accept'), false); assert.match(controller.getSnapshot().notices['am-1'].text, /current version isn.t loaded, so nothing was sent/);
});
test('accept is bound to the exact current version and one key; the LAST acceptance\'s new version comes from SecurePay and refreshes the Agreement', async () => {
  const { controller, calls, changed } = setup({ acceptAmendment: async (id, a, body) => { calls.push(['accept', a, body]); return decision({ resultingVersionNumber: 7 }); } });
  await controller.loadOverview(); await controller.accept('am-1');
  assert.deepEqual(sent(calls, 'accept')[0], { idempotencyKey: 'key-1', expectedAgreementVersionId: 'v1' });
  assert.deepEqual(controller.getSnapshot().applied, { amendmentId: 'am-1', versionNumber: 7 });
  assert.match(controller.getSnapshot().notices['am-1'].text, /Everyone has agreed\. The Agreement is now at version 7; the earlier version stays in its history/);
  assert.ok(changed.length >= 1); assert.ok(names(calls).filter(n => n === 'overview').length >= 2); // re-read after the decision
});
test('an acceptance while others still have to answer is recorded, not applied: no version is claimed and the Agreement is untouched', async () => {
  const { controller, changed } = setup({ acceptAmendment: async () => decision({ status: 'PROPOSED', resultingVersionId: null, resultingVersionNumber: null }) });
  await controller.loadOverview(); await controller.accept('am-1');
  assert.equal(controller.getSnapshot().applied, null); assert.equal(changed.length, 0);
  assert.match(controller.getSnapshot().notices['am-1'].text, /Your acceptance is recorded\. The change takes effect only when everyone else has agreed too/);
});
test('a replayed final acceptance (resultingVersionNumber null) takes the version number from SecurePay\'s own history', async () => {
  const { controller } = setup({
    acceptAmendment: async () => decision({ resultingVersionNumber: null, replayed: true }),
    amendmentOverview: async () => ov({ currentVersionId: 'v2', currentVersionNumber: 2, open: null, history: [past({ resultingVersionNumber: 2 })] }),
  });
  await controller.loadOverview(); await controller.accept('am-1');
  assert.deepEqual(controller.getSnapshot().applied, { amendmentId: 'am-1', versionNumber: 2 });
});
test('an uncertain accept keeps the SAME key AND the SAME expected version, and is never shown as agreed', async () => {
  let first = true, version = 'v1';
  const { controller, calls } = setup({
    acceptAmendment: async (id, a, body) => { calls.push(['accept', a, body]); if (first) { first = false; throw err('timeout', null, 't'); } return decision(); },
    amendmentOverview: async () => ov({ currentVersionId: version }),
  });
  await controller.loadOverview(); await controller.accept('am-1');
  const n = controller.getSnapshot().notices['am-1']; assert.equal(n.kind, 'uncertain'); assert.equal(n.action, 'accept');
  assert.match(n.text, /still shows this change as waiting, so your response isn.t recorded yet\. You can try accepting again/); assert.equal(controller.getSnapshot().applied, null);
  version = 'v9'; await controller.loadOverview(); // even if the screen's view moved, the retry is the same request
  await controller.accept('am-1');
  const [a, b] = sent(calls, 'accept'); assert.deepEqual(a, b); assert.equal(a.expectedAgreementVersionId, 'v1');
});
test('an uncertain accept is settled from the overview: the caller shown as ACCEPTED proves it was recorded; APPLIED in history proves the new version', async () => {
  const recorded = setup({ acceptAmendment: async () => { throw err('network', null); }, amendmentOverview: async () => ov({ open: open({ callerMustRespond: false, responders: [{ name: 'Wanjiru', isCaller: true, decision: 'ACCEPTED' }, { name: 'Amina', isCaller: false, decision: 'PENDING' }] }) }) });
  await recorded.controller.loadOverview(); await recorded.controller.accept('am-1');
  assert.equal(recorded.controller.getSnapshot().notices['am-1'].kind, 'done'); assert.match(recorded.controller.getSnapshot().notices['am-1'].text, /Your acceptance is recorded/);
  let lists = 0;
  const applied = setup({ acceptAmendment: async () => { throw err('timeout', null); }, amendmentOverview: async () => (++lists === 1 ? ov() : ov({ currentVersionId: 'v2', currentVersionNumber: 2, open: null, history: [past()] })) });
  await applied.controller.loadOverview(); await applied.controller.accept('am-1');
  assert.deepEqual(applied.controller.getSnapshot().applied, { amendmentId: 'am-1', versionNumber: 2 });
  let reads = 0; const darkGw = setup({ acceptAmendment: async () => { throw err('timeout', null); }, amendmentOverview: async () => { if (++reads > 1) throw err('network', null); return ov(); } });
  await darkGw.controller.loadOverview(); await darkGw.controller.accept('am-1');
  assert.equal(darkGw.controller.getSnapshot().notices['am-1'].kind, 'uncertain'); assert.match(darkGw.controller.getSnapshot().notices['am-1'].text, /couldn.t be reached to check/);
});
test('409 (the Agreement moved): re-reads the Agreement and the overview first, says nothing was changed, releases the key, never rebases', async () => {
  const { controller, calls, changed } = setup({ acceptAmendment: async (id, a, body) => { calls.push(['accept', a, body]); throw err('http', 409, 'the Agreement has changed since this was proposed'); } });
  await controller.loadOverview(); await controller.accept('am-1'); await controller.accept('am-1');
  const n = controller.getSnapshot().notices['am-1']; assert.equal(n.kind, 'error'); assert.match(n.text, /The Agreement changed since you last looked, so SecurePay didn.t record that\. Nothing was changed/);
  assert.ok(changed.length >= 1); const [a, b] = sent(calls, 'accept'); assert.notEqual(a.idempotencyKey, b.idempotencyKey);
  assert.equal(calls.some(c => ['propose', 'proposeAmendment'].includes(c[0])), false);
});
test('401 / 403 are definite, claim nothing changed, and release the key; a non-proposer withdraw is told plainly', async () => {
  for (const [action, status, re] of [['accept', 401, /session ended.*Nothing was changed/], ['accept', 403, /didn.t let this account respond to this change\. Nothing was changed/], ['withdraw', 403, /Only the person who proposed this change can withdraw it\. Nothing was changed/]]) {
    const { controller, calls } = setup({ [`${action}Amendment`]: async (id, a, body) => { calls.push([action, a, body]); throw err('http', status, 'x'); } });
    await controller.loadOverview(); await controller[action]('am-1'); await controller[action]('am-1');
    assert.match(controller.getSnapshot().notices['am-1'].text, re);
    const [a, b] = sent(calls, action); assert.notEqual(a.idempotencyKey, b.idempotencyKey);
  }
});
test('422 on a proposal that is already closed reports its real outcome; otherwise "couldn\'t do that", nothing changed', async () => {
  let lists = 0;
  const closed = setup({ rejectAmendment: async () => { throw err('http', 422, 'amendment is not open'); }, amendmentOverview: async () => (++lists === 1 ? ov() : ov({ open: null, history: [past({ outcome: 'WITHDRAWN', resultingVersionNumber: null })] })) });
  await closed.controller.loadOverview(); await closed.controller.reject('am-1');
  assert.equal(closed.controller.getSnapshot().notices['am-1'].kind, 'info'); assert.match(closed.controller.getSnapshot().notices['am-1'].text, /this proposal is withdrawn/);
  const plain = setup({ acceptAmendment: async () => { throw err('http', 422, 'a funded Agreement cannot be changed'); } });
  await plain.controller.loadOverview(); await plain.controller.accept('am-1');
  assert.match(plain.controller.getSnapshot().notices['am-1'].text, /SecurePay couldn.t do that\. Nothing was changed/);
  assert.doesNotMatch(plain.controller.getSnapshot().notices['am-1'].text, /funded Agreement cannot/); // backend wording is not echoed
});
test('reject / withdraw claim success only from the returned status; the Agreement is untouched', async () => {
  const r = setup(); await r.controller.loadOverview(); await r.controller.reject('am-1');
  assert.match(r.controller.getSnapshot().notices['am-1'].text, /You rejected this proposed change\. The current Agreement stays as it is/);
  assert.deepEqual(sent(r.calls, 'reject')[0], { idempotencyKey: 'key-1', expectedAgreementVersionId: 'v1' }); assert.equal(r.changed.length, 0);
  const w = setup(); await w.controller.loadOverview(); await w.controller.withdraw('am-1');
  assert.match(w.controller.getSnapshot().notices['am-1'].text, /This proposal was withdrawn\. The current Agreement stays as it is/);
  const other = setup({ rejectAmendment: async () => decision({ status: 'APPLIED' }) }); await other.controller.loadOverview(); await other.controller.reject('am-1');
  assert.equal(other.controller.getSnapshot().notices['am-1'].kind, 'info'); assert.match(other.controller.getSnapshot().notices['am-1'].text, /Nothing was changed: this proposal is already applied/);
});
test('check() re-reads and settles ONLY the uncertain action, and never sends anything', async () => {
  const { controller, calls } = setup({ amendmentOverview: async () => ov({ open: null, history: [past({ outcome: 'REJECTED', resultingVersionNumber: null })] }) });
  await controller.loadOverview(); await controller.check('am-1', 'reject');
  assert.equal(controller.getSnapshot().notices['am-1'].kind, 'done'); assert.match(controller.getSnapshot().notices['am-1'].text, /You rejected this proposed change/);
  assert.equal(calls.some(c => ['accept', 'reject', 'withdraw'].includes(c[0])), false);
});
test('the controller has no way to propose, edit or rebase a proposal, and no single-actor apply', async () => {
  const src = await readFile('src/features/amendments/controller.ts', 'utf8');
  assert.doesNotMatch(src, /proposeAmendment|proposedTerms\s*=|rebase|putAll|applyAmendment|checkApply/);
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
