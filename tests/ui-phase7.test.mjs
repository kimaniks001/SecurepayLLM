import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 7 -- execution, evidence, milestones and completion truth. Gateways are scripted from the contracts read in SecurePayAPI
// (AgreementObligationController, ObligationService, EvidenceService, ParticipantNextActionService, MilestoneService,
// AgreementCompletionProjectionService); the API is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/execution/display';
export { createExecutionController } from './src/features/execution/controller';
export { ProgressPanel } from './src/features/execution/ProgressPanel';
export { AUTHENTICATED_AGREEMENT_METHODS } from './src/api/securepay/agreements/refresh';
export { createWorkspaceController } from './src/features/workspace/controller';
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

const V1 = 'v1', V2 = 'v2', ME = 'p-me', OTHER = 'p-other';
const ob = (o = {}) => ({ id: 'o1', publicReference: 'OBL-1', agreementId: 'agr-1', agreementVersionId: V2, obligationType: 'SERVICE', title: 'Install the cabinets', description: null, responsibleParticipantId: ME, beneficiaryParticipantId: OTHER, currency: null, amountMinor: null, status: 'AVAILABLE', createdAt: 'x', stateVersion: 3, ...o });
const act = (o = {}) => ({ participantId: ME, agreementId: 'agr-1', currentAgreementVersionId: V2, actionType: 'START_OBLIGATION', targetObligationId: 'o1', targetMilestoneId: null, actionReason: 'obligation available to start', prerequisiteStatus: 'AVAILABLE', deadline: null, urgency: 'NORMAL', requiredEvidenceTypes: [], blockedByObligationIds: [], supportingEvidenceIds: [], ...o });
const comp = (o = {}) => ({ eligible: false, currentStatus: 'IN_PROGRESS', unmetRequirements: ['evidence_required'], satisfiedRequirements: ['no_dependencies'], evidenceIds: [], explanationCodes: [], ...o });
const ev = (o = {}) => ({ id: 'e1', obligationId: 'o1', evidenceType: 'PHOTO', description: 'Fitted cabinets', contentType: 'image/jpeg', status: 'SUBMITTED', submittedAt: '2026-09-20T10:00:00Z', ...o });

function setup(over = {}, world = {}) {
  const w = { obligations: [ob()], actions: [act()], completion: comp(), evidence: [], current: V2, me: ME, ...world };
  const calls = []; let n = 0; const changed = [];
  const gateway = {
    detail: async () => { calls.push(['detail']); return { currentVersion: w.current ? { versionId: w.current } : null }; },
    obligations: async () => { calls.push(['obligations']); return w.obligations; },
    myNextActions: async () => { calls.push(['next']); return { actions: w.actions }; },
    obligationCompletionStatus: async (id, oid) => { calls.push(['completion', oid]); return w.completion; },
    obligationEvidence: async (id, oid) => { calls.push(['evidence', oid]); return w.evidence; },
    startObligation: async (id, oid, { idempotencyKey: key, ...expected }) => { calls.push(['start', oid, key, expected]); return ob({ status: 'IN_PROGRESS' }); },
    completeObligation: async (id, oid, key) => { calls.push(['complete', oid, key]); return ob({ status: 'COMPLETED' }); },
    reviewEvidence: async (id, eid, body) => { calls.push(['review', eid, body]); return ev(); },
    submitEvidence: async (id, oid, body) => { calls.push(['submitEvidence', oid, body.idempotencyKey, body]); return ev({ evidenceType: 'TEXT_STATEMENT', kind: 'STATEMENT', description: body.description }); },
    ...over,
  };
  // The workspace hands the controller its CACHED detail: it only moves when onChanged reloads it (as the real workspace does).
  let cached = w.current;
  const controller = api.createExecutionController(gateway, 'agr-1', () => cached, () => w.me, () => { cached = w.current; changed.push(1); }, () => `k${++n}`);
  return { controller, calls, world: w, changed };
}
const names = calls => calls.map(c => c[0]);

// ------------------------------------------------------------ current-version scoping
test('only obligations whose agreementVersionId equals the current version id are current work; no highest-version guessing', async () => {
  const { controller } = setup({}, { obligations: [ob({ id: 'old', agreementVersionId: V1, title: 'Old work' }), ob({ id: 'new', agreementVersionId: V2, title: 'New work' }), ob({ id: 'zzz', agreementVersionId: 'v9-not-current', title: 'Later id' })] });
  await controller.load();
  assert.deepEqual(controller.current().map(o => o.id), ['new']);
  assert.deepEqual(api.currentVersionObligations([ob()], null), []); // no known current version = nothing is current
});
test('an old-version obligation can never be started, reviewed or completed, even if SecurePay lists an action for it', async () => {
  const { controller, calls } = setup({}, { obligations: [ob({ id: 'old', agreementVersionId: V1 })], actions: [act({ targetObligationId: 'old' })] });
  await controller.load();
  assert.equal(controller.canStart('old'), false); await controller.start('old'); assert.equal(names(calls).includes('start'), false);
  assert.equal(controller.canComplete('old'), false); assert.equal(controller.reviewTarget('old'), null);
});
test('the panel says earlier-version obligations are not current work', async () => {
  const { controller } = setup({}, { obligations: [ob({ id: 'old', agreementVersionId: V1 }), ob({ id: 'new' })], actions: [] });
  await controller.load();
  assert.match(text(panel(controller)), /1 obligation belongs to earlier versions and isn.t shown as current work/);
});

// ------------------------------------------------------------ Start
test('Start appears ONLY from SecurePay\'s own START_OBLIGATION next action for that obligation', async () => {
  const yes = setup(); await yes.controller.load(); assert.equal(yes.controller.canStart('o1'), true);
  const noAction = setup({}, { actions: [] }); await noAction.controller.load(); assert.equal(noAction.controller.canStart('o1'), false); // status alone is not enough
  const wait = setup({}, { actions: [act({ actionType: 'WAIT_FOR_DEPENDENCY', prerequisiteStatus: 'BLOCKED' })] }); await wait.controller.load(); assert.equal(wait.controller.canStart('o1'), false);
  const other = setup({}, { actions: [act({ targetObligationId: 'someone-elses' })] }); await other.controller.load(); assert.equal(other.controller.canStart('o1'), false);
  const failed = setup({ myNextActions: async () => { throw err('http', 500) } }); await failed.controller.load(); assert.equal(failed.controller.canStart('o1'), false); // next actions unavailable -> read-only
});
test('Start is an explicit press; success is claimed from the returned status, then everything is re-read (nothing advanced locally)', async () => {
  let wref;
  const { controller, calls, changed, world } = setup({ startObligation: async (id, oid, { idempotencyKey: key, ...expected }) => { calls.push(['start', oid, key, expected]); wref.obligations = [ob({ status: 'IN_PROGRESS' })]; wref.actions = [act({ actionType: 'SUBMIT_EVIDENCE', prerequisiteStatus: 'IN_PROGRESS' })]; return ob({ status: 'IN_PROGRESS' }); } });
  wref = world; await controller.load(); assert.equal(names(calls).includes('start'), false);
  const before = calls.length;
  await controller.start('o1');
  assert.equal(controller.getSnapshot().notices.o1.text, 'SecurePay recorded that this work is in progress.');
  assert.ok(names(calls.slice(before)).includes('obligations') && names(calls.slice(before)).includes('next')); assert.ok(changed.length >= 1);
  assert.equal(controller.getSnapshot().obligations.data[0].status, 'IN_PROGRESS'); // from the re-read, not set locally
  assert.equal(names(calls).some(n => n === 'complete' || n === 'review'), false); // no completion / evidence side effect
});
test('an uncertain Start keeps the SAME key, is not shown as started, and Check re-reads the obligation', async () => {
  let first = true; const w = {};
  const { controller, calls, world } = setup({ startObligation: async (id, oid, { idempotencyKey: key, ...expected }) => { calls.push(['start', oid, key, expected]); if (first) { first = false; throw err('timeout', null); } return ob({ status: 'IN_PROGRESS' }); } });
  await controller.load(); await controller.start('o1');
  const n = controller.getSnapshot().notices.o1; assert.equal(n.kind, 'uncertain'); assert.match(n.text, /We.re not sure whether SecurePay recorded the start/);
  await controller.checkStart('o1'); assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain'); // still AVAILABLE per the re-read
  await controller.start('o1');
  const keys = calls.filter(c => c[0] === 'start').map(c => c[2]); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  world.obligations = [ob({ status: 'IN_PROGRESS' })];
});
test('Check proves a start only from the re-read status', async () => {
  const { controller, world } = setup({ startObligation: async () => { throw err('network', null); } });
  await controller.load(); await controller.start('o1'); world.obligations = [ob({ status: 'IN_PROGRESS' })];
  await controller.checkStart('o1'); assert.equal(controller.getSnapshot().notices.o1.kind, 'done');
});
test('Start 403 / 401 are definite and release the key; an already-started 422 is reported from the re-read', async () => {
  for (const [status, re] of [[403, /can.t start this work\. Nothing was started/], [401, /session ended.*Nothing was started/]]) {
    const { controller, calls } = setup({ startObligation: async (id, oid, { idempotencyKey: key, ...expected }) => { calls.push(['start', oid, key, expected]); throw err('http', status); } });
    await controller.load(); await controller.start('o1'); await controller.start('o1');
    assert.match(controller.getSnapshot().notices.o1.text, re);
    const keys = calls.filter(c => c[0] === 'start').map(c => c[2]); assert.notEqual(keys[0], keys[1]);
  }
  let wr2; const r2 = setup({ startObligation: async () => { wr2.obligations = [ob({ status: 'IN_PROGRESS' })]; wr2.actions = []; throw err('http', 422, 'invalid transition'); } }); wr2 = r2.world; const controller = r2.controller; await controller.load();
  // the preflight passes (still startable), the 422 lands, and it is settled by a re-read
  await controller.start('o1'); assert.match(controller.getSnapshot().notices.o1.text, /already in progress/);
});

// ------------------------------------------------------------ Evidence (record only; no upload)
test('evidence is a WRITTEN STATEMENT only: no upload, file, storage, object reference, digest or download anywhere in the execution code', async () => {
  const gw = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  assert.doesNotMatch(gw, /uploadEvidence|presign|objectReference|\bcontentHash\b/i);
  assert.match(gw, /evidenceType: 'TEXT_STATEMENT'/); // the only type this app can send
  for (const f of ['src/features/execution/controller.ts', 'src/features/execution/ProgressPanel.tsx', 'src/features/execution/display.ts']) {
    const src = (await readFile(f, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /<input[^>]*type="file"|URL\.createObjectURL|FileReader|localStorage|sessionStorage|indexedDB|btoa\(|base64|objectReference|contentHash|href=/i, f);
  }
});
const inProgress = { obligations: [ob({ status: 'IN_PROGRESS', stateVersion: 4 })], actions: [act({ actionType: 'SUBMIT_EVIDENCE', prerequisiteStatus: 'IN_PROGRESS', requiredEvidenceTypes: ['PHOTO'] })] };
test('SUBMIT_EVIDENCE offers a written-statement form with the honest storage limitation; it is never offered without SecurePay\'s signal', async () => {
  const { controller } = setup({}, inProgress);
  await controller.load(); const markup = panel(controller); const out = text(markup);
  assert.match(out, /SecurePay is waiting for evidence from you/); assert.match(out, /Evidence asked for: Photo/);
  assert.match(markup, /<textarea/); assert.match(markup, /<button[^>]*>Submit evidence<\/button>/);
  assert.match(out, /Uploading files isn.t available in SecurePay yet, so your written statement is your evidence/);
  assert.match(out, /doesn.t approve it or complete the work/);
  assert.doesNotMatch(out, /Upload file|Choose file|Approve|Complete this obligation/);
  for (const world of [{ ...inProgress, actions: [] }, { obligations: [ob({ status: 'IN_PROGRESS', responsibleParticipantId: OTHER })], actions: [act({ actionType: 'WAIT_FOR_DEPENDENCY' })] }, reviewWorld, { obligations: [ob({ status: 'EVIDENCE_SUBMITTED' })], actions: [act({ actionType: 'WAIT_FOR_DEPENDENCY', prerequisiteStatus: 'EVIDENCE_SUBMITTED' })] }]) {
    const s = setup({}, world); await s.controller.load(); const m = panel(s.controller);
    assert.doesNotMatch(m, /<textarea|>Submit evidence</);
  }
});
test('Submit evidence sends only the statement, the key and the versions SecurePay just returned -- never a participant, source or file', async () => {
  const { controller, calls, world } = setup({}, inProgress); await controller.load();
  controller.setDraft('o1', '  Fitted all six cabinets  ');
  world.obligations = [ob({ status: 'IN_PROGRESS', stateVersion: 7 })];
  await controller.submitStatement('o1');
  const [, oid, key, body] = calls.find(c => c[0] === 'submitEvidence');
  assert.equal(oid, 'o1'); assert.ok(key);
  assert.deepEqual(body, { idempotencyKey: key, expectedAgreementVersionId: V2, expectedObligationVersion: 7, evidenceType: 'TEXT_STATEMENT', description: 'Fitted all six cabinets' });
  const n = controller.getSnapshot().notices.o1; assert.equal(n.kind, 'done'); assert.match(n.text, /waits for review/); assert.match(n.text, /doesn.t approve it or complete the work/); assert.doesNotMatch(n.text, /\bapproved\b|work is complete|completed/i);
  assert.equal(controller.getSnapshot().drafts.o1, undefined);
  assert.equal(names(calls).some(x => x === 'review' || x === 'complete'), false);
});
test('an empty statement sends nothing; a missing SUBMIT_EVIDENCE signal at press time sends nothing', async () => {
  const a = setup({}, inProgress); await a.controller.load(); a.controller.setDraft('o1', '   '); await a.controller.submitStatement('o1'); assert.equal(sent(a.calls).length, 0);
  const b = setup({}, inProgress); await b.controller.load(); b.controller.setDraft('o1', 'Done'); b.world.actions = []; await b.controller.submitStatement('o1'); assert.equal(sent(b.calls).length, 0);
  assert.match(b.controller.getSnapshot().notices.o1.text, /no longer lists this as something for you to do, so nothing was submitted/);
});
test('an uncertain submission pins the statement: the retry resends the IDENTICAL request and the draft can\'t change it', async () => {
  let first = true;
  const { controller, calls, world } = setup({ submitEvidence: async (id, oid, body) => { calls.push(['submitEvidence', oid, body.idempotencyKey, body]); if (first) { first = false; throw err('timeout', null); } return ev(); } }, inProgress);
  await controller.load(); controller.setDraft('o1', 'Original statement'); await controller.submitStatement('o1');
  assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain');
  const markup = panel(controller); assert.match(markup, /Check with SecurePay/); assert.match(markup, /Try submitting again/); assert.match(text(markup), /Your statement: “Original statement”/); assert.doesNotMatch(markup, /<textarea/);
  controller.setDraft('o1', 'Edited afterwards'); world.obligations = [ob({ status: 'EVIDENCE_SUBMITTED', stateVersion: 9 })]; world.actions = [];
  await controller.submitStatement('o1');
  const sends = calls.filter(c => c[0] === 'submitEvidence'); assert.equal(sends.length, 2); assert.deepEqual(sends[0][3], sends[1][3]);
});
test('Check proves an uncertain submission only from a re-read record with exactly the pinned statement', async () => {
  const { controller, world } = setup({ submitEvidence: async () => { throw err('network', null); } }, inProgress);
  await controller.load(); controller.setDraft('o1', 'Pinned words'); await controller.submitStatement('o1');
  world.evidence = [ev({ description: 'Other words' })]; await controller.checkEvidence('o1'); assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain');
  world.evidence = [ev({ description: 'Pinned words' })]; await controller.checkEvidence('o1'); assert.equal(controller.getSnapshot().notices.o1.kind, 'done');
});
test('submission 403 / 409 / 422 are definite: nothing submitted, key released, 409 reloads and explains the change', async () => {
  for (const [status, re] of [[403, /Only the person responsible for this work can submit evidence/], [409, /changed while you were looking at it, so no evidence was submitted/], [422, /couldn.t accept that evidence/]]) {
    const { controller, calls, changed } = setup({ submitEvidence: async (id, oid, body) => { calls.push(['submitEvidence', oid, body.idempotencyKey, body]); throw err('http', status); } }, inProgress);
    await controller.load(); controller.setDraft('o1', 'x'); const before = changed.length; await controller.submitStatement('o1');
    assert.match(controller.getSnapshot().notices.o1.text, re);
    if (status === 409) assert.ok(changed.length > before);
    controller.setDraft('o1', 'x'); await controller.submitStatement('o1');
    const keys = calls.filter(c => c[0] === 'submitEvidence').map(c => c[2]); assert.notEqual(keys[0], keys[1]);
  }
});
test('submitted statements render as "Written statement" and stay "Not yet approved in review" until completion-status says otherwise', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'EVIDENCE_SUBMITTED' })], actions: [act({ actionType: 'WAIT_FOR_DEPENDENCY', prerequisiteStatus: 'EVIDENCE_SUBMITTED' })], evidence: [ev({ evidenceType: 'TEXT_STATEMENT', kind: 'STATEMENT', description: 'Fitted all six cabinets' })], completion: comp({ unmetRequirements: ['evidence_review_pending_e1'] }) });
  await controller.load(); const out = text(panel(controller));
  assert.match(out, /Written statement — Fitted all six cabinets/); assert.match(out, /Not yet approved in review/); assert.match(out, /waiting for the evidence to be reviewed/);
  assert.doesNotMatch(out, /Approved in review/);
});
test('existing evidence renders from SecurePay with only the fields it returns; a failed read is not "no evidence"', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'EVIDENCE_SUBMITTED' })], actions: [], evidence: [ev()] });
  await controller.load(); const out = text(panel(controller));
  assert.match(out, /Photo — Fitted cabinets/); assert.match(out, /Submitted [A-Za-z0-9 ,.]*2026/); assert.doesNotMatch(out, /filename|\.jpg|\.png|Download|KB|MB|uploaded by/i);
  const bad = setup({ obligationEvidence: async () => { throw err('http', 500) } }, { obligations: [ob({ status: 'EVIDENCE_SUBMITTED' })], actions: [] }); await bad.controller.load();
  const badOut = text(panel(bad.controller)); assert.match(badOut, /Evidence couldn.t be loaded right now/); assert.doesNotMatch(badOut, /No evidence has been submitted/);
  const none = setup({}, { obligations: [ob({ status: 'IN_PROGRESS' })], actions: [], evidence: [] }); await none.controller.load(); assert.match(text(panel(none.controller)), /No evidence has been submitted/);
});
test('evidence approval is shown only from SecurePay\'s completion-status (the evidence status itself never leaves SUBMITTED)', async () => {
  const yes = setup({}, { obligations: [ob({ status: 'EVIDENCE_SUBMITTED' })], actions: [], evidence: [ev()], completion: comp({ satisfiedRequirements: ['evidence_approved_e1'], unmetRequirements: [], eligible: true }) });
  await yes.controller.load(); assert.match(text(panel(yes.controller)), /Approved in review/);
  const no = setup({}, { obligations: [ob({ status: 'EVIDENCE_SUBMITTED' })], actions: [], evidence: [ev({ status: 'APPROVED' })], completion: comp({ unmetRequirements: ['evidence_review_pending_e1'] }) });
  await no.controller.load(); const out = text(panel(no.controller)); assert.match(out, /Not yet approved in review/); assert.doesNotMatch(out, /Approved in review/); // a raw status field is not trusted either way
});

// ------------------------------------------------------------ Review
const reviewWorld = { obligations: [ob({ status: 'EVIDENCE_SUBMITTED', responsibleParticipantId: OTHER, beneficiaryParticipantId: ME })], actions: [act({ actionType: 'REVIEW_EVIDENCE', prerequisiteStatus: 'REVIEW_PENDING', supportingEvidenceIds: ['e1'] })], evidence: [ev()], completion: comp({ unmetRequirements: ['evidence_review_pending_e1'] }) };
test('review controls come only from SecurePay\'s REVIEW_EVIDENCE next action; Approve and Reject only -- no "more information"', async () => {
  const yes = setup({}, reviewWorld); await yes.controller.load(); assert.deepEqual(yes.controller.reviewTarget('o1'), { evidenceId: 'e1', participantId: ME });
  // WITHHELD in production: the review is shown as a read-only fact with the limitation, never as Approve/Reject controls.
  const out = text(panel(yes.controller)); assert.match(out, /SecurePay says this evidence needs review\./); assert.match(out, /Recording the review from this screen is temporarily unavailable until SecurePay can bind it safely to the current Agreement version\./);
  assert.doesNotMatch(out, /Approve evidence|Reject evidence|more information|Ask for more|NEEDS_MORE/i); assert.match(out, /Photo — Fitted cabinets/); // the evidence stays visible
  const no = setup({}, { ...reviewWorld, actions: [] }); await no.controller.load(); assert.equal(no.controller.reviewTarget('o1'), null); assert.doesNotMatch(text(panel(no.controller)), /needs review|Recording the review/);
});
test('Approve and Reject send distinct decisions bound to the exact evidence and the caller\'s participant id; 200 is claimed as "recorded", never as a status change', async () => {
  const a = setup({}, reviewWorld); await a.controller.load(); await a.controller.review('o1', 'APPROVED');
  const call = a.calls.find(c => c[0] === 'review'); assert.equal(call[1], 'e1'); assert.deepEqual({ decision: call[2].decision, reviewerParticipantId: call[2].reviewerParticipantId }, { decision: 'APPROVED', reviewerParticipantId: ME }); assert.ok(call[2].idempotencyKey);
  assert.equal(a.controller.getSnapshot().notices.o1.text, 'SecurePay recorded your review: approved.');
  const r = setup({}, reviewWorld); await r.controller.load(); await r.controller.review('o1', 'REJECTED');
  assert.equal(r.calls.find(c => c[0] === 'review')[2].decision, 'REJECTED'); assert.equal(r.controller.getSnapshot().notices.o1.text, 'SecurePay recorded your review: not accepted.');
  assert.equal(names(a.calls).includes('complete'), false); // review is not completion
});
test('an uncertain review pins its decision: the opposite decision is never offered or sent until settled; retry is the SAME request', async () => {
  let first = true;
  const { controller, calls } = setup({ reviewEvidence: async (id, eid, body) => { calls.push(['review', eid, body]); if (first) { first = false; throw err('timeout', null); } return ev(); } }, reviewWorld);
  await controller.load(); await controller.review('o1', 'APPROVED');
  assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain'); assert.match(controller.getSnapshot().notices.o1.text, /We.re not sure whether that review was recorded/);
  const out = text(panel(controller)); assert.doesNotMatch(out, /Try approving again|Reject evidence|not accepting|Check what happened/); // controller archaeology only: no production control drives it
  await controller.review('o1', 'REJECTED'); assert.equal(calls.filter(c => c[0] === 'review').length, 1); // contradiction refused
  await controller.review('o1', 'APPROVED');
  const sends = calls.filter(c => c[0] === 'review'); assert.equal(sends.length, 2); assert.equal(sends[0][2].idempotencyKey, sends[1][2].idempotencyKey); assert.equal(sends[1][2].decision, 'APPROVED');
});
test('an approval is provable from the re-read; a rejection is NOT readable and stays unresolved', async () => {
  const boom = { reviewEvidence: async () => { throw err('network', null); } };
  const ap = setup(boom, reviewWorld); await ap.controller.load(); await ap.controller.review('o1', 'APPROVED');
  ap.world.completion = comp({ eligible: true, unmetRequirements: [], satisfiedRequirements: ['evidence_approved_e1'] }); ap.world.actions = [];
  await ap.controller.checkReview('o1'); assert.equal(ap.controller.getSnapshot().notices.o1.kind, 'done'); assert.deepEqual(ap.controller.getSnapshot().pendingReview, {});
  const rj = setup(boom, reviewWorld); await rj.controller.load(); await rj.controller.review('o1', 'REJECTED'); rj.world.actions = [];
  await rj.controller.checkReview('o1'); assert.equal(rj.controller.getSnapshot().notices.o1.kind, 'uncertain'); assert.match(rj.controller.getSnapshot().notices.o1.text, /a rejection can.t be read back/);
});
test('review refusals are plain: conflicting decision (409), self-review, 401, 403', async () => {
  for (const [status, msg, re] of [[409, 'evidence already reviewed with conflicting decision', /already has a different review recorded/], [422, 'self-review prohibited', /You submitted this evidence, so you can.t review it/], [403, 'x', /can.t review this evidence/], [401, 'x', /session ended.*No review was recorded/]]) {
    const { controller } = setup({ reviewEvidence: async () => { throw err('http', status, msg); } }, reviewWorld); await controller.load(); await controller.review('o1', 'APPROVED');
    assert.match(controller.getSnapshot().notices.o1.text, re);
  }
});

// ------------------------------------------------------------ completion status + Complete
const active = { obligations: [ob({ status: 'IN_PROGRESS' })], actions: [act({ actionType: 'SUBMIT_EVIDENCE', prerequisiteStatus: 'IN_PROGRESS' })] };
test('eligible=false: unmet requirements are shown in plain words (no ids), and there is no Complete', async () => {
  const { controller } = setup({}, { ...active, completion: comp({ unmetRequirements: ['evidence_required', 'dependency_obligation_11111111-2222-3333-4444-555555555555', 'condition_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'mystery_code_7'] }), obligations: [ob({ status: 'IN_PROGRESS' }), ob({ id: '11111111-2222-3333-4444-555555555555', title: 'Site inspection', status: 'AVAILABLE' })] });
  await controller.load(); assert.equal(controller.canComplete('o1'), false);
  const raw = panel(controller), out = text(raw);
  assert.match(out, /Evidence has to be submitted/); assert.match(out, /“Site inspection” has to be completed first/); assert.match(out, /A required condition isn.t satisfied yet/); assert.match(out, /SecurePay lists a requirement this screen can.t describe yet/);
  assert.doesNotMatch(out, /Complete this obligation/); assert.doesNotMatch(raw, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|mystery_code/);
});
test('eligible=true does NOT auto-complete; the controller Complete gate (archaeology) is unchanged, but nothing in the UI presses it', async () => {
  const elig = comp({ eligible: true, unmetRequirements: [], satisfiedRequirements: ['evidence_approved_e1'] });
  const mine = setup({}, { ...active, completion: elig }); await mine.controller.load();
  assert.equal(mine.controller.canComplete('o1'), true); assert.equal(names(mine.calls).includes('complete'), false);
  const out = text(panel(mine.controller)); assert.match(out, /SecurePay says the completion requirements for this obligation are satisfied/); assert.match(out, /Completing it from this screen is temporarily unavailable until SecurePay can bind the action safely to the current Agreement version\./); assert.doesNotMatch(out, /Complete this obligation/);
  const notMine = setup({}, { ...active, completion: elig, me: OTHER }); await notMine.controller.load(); assert.equal(notMine.controller.canComplete('o1'), false);
  const noMe = setup({}, { ...active, completion: elig, me: null }); await noMe.controller.load(); assert.equal(noMe.controller.canComplete('o1'), false); // own participant unknown -> no control
  const wrongState = setup({}, { obligations: [ob({ status: 'AVAILABLE' })], actions: [], completion: elig }); await wrongState.controller.load(); await wrongState.controller.loadDetails('o1'); assert.equal(wrongState.controller.canComplete('o1'), false);
});
test('the completion-status read failing removes Complete rather than guessing', async () => {
  const { controller } = setup({ obligationCompletionStatus: async () => { throw err('http', 500) } }, active); await controller.load();
  assert.equal(controller.canComplete('o1'), false); assert.match(text(panel(controller)), /completion requirements couldn.t be loaded right now, so nothing can be completed from here/);
});
test('Complete: same key on an uncertain retry; obligation-only; dependents and completion are re-read, never advanced locally', async () => {
  let first = true;
  let wc; const r = setup({ completeObligation: async (id, oid, key) => { calls.push(['complete', oid, key]); if (first) { first = false; throw err('timeout', null); } wc.obligations = [ob({ status: 'COMPLETED' })]; wc.actions = []; return ob({ status: 'COMPLETED' }); } },
    { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) });
  const { controller, calls, world, changed } = r; wc = world;
  await controller.load(); await controller.complete('o1');
  assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain'); assert.match(controller.getSnapshot().notices.o1.text, /We.re not sure whether SecurePay recorded the completion/);
  await controller.checkComplete('o1'); assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain'); // re-read still IN_PROGRESS
  await controller.complete('o1'); // still IN_PROGRESS and eligible on the fresh read: the SAME request is re-sent
  const keys = calls.filter(c => c[0] === 'complete').map(c => c[2]); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  world.obligations = [ob({ status: 'COMPLETED' })]; world.actions = [];
  assert.match(controller.getSnapshot().notices.o1.text, /doesn.t by itself mean the whole Agreement is complete or that Money is released/);
  assert.ok(changed.length >= 1);
  assert.equal(controller.getSnapshot().obligations.data[0].status, 'COMPLETED');
});
test('Complete 422 (requirements unmet) is settled by re-reading and claims nothing was completed', async () => {
  const { controller } = setup({ completeObligation: async () => { throw err('http', 422, 'completion requirements unmet: [evidence_required]'); } }, { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) });
  await controller.load(); await controller.complete('o1'); assert.match(controller.getSnapshot().notices.o1.text, /completion requirements aren.t met yet\. Nothing was completed/);
});
test('a dependent obligation becomes available only when SecurePay\'s re-read says so', async () => {
  const w = { obligations: [ob({ id: 'A', title: 'Site prep', status: 'IN_PROGRESS' }), ob({ id: 'B', title: 'Painting', status: 'BLOCKED' })], actions: [act({ targetObligationId: 'B', actionType: 'WAIT_FOR_DEPENDENCY', prerequisiteStatus: 'BLOCKED', blockedByObligationIds: ['A'] })], completion: comp({ eligible: true, unmetRequirements: [] }) };
  const { controller, world } = setup({}, w); await controller.load();
  assert.match(text(panel(controller)), /Waiting for “Site prep” to be completed/); assert.equal(controller.canStart('B'), false);
  await controller.complete('A'); // backend (scripted) reconciles B only if the world says so
  assert.equal(controller.getSnapshot().obligations.data.find(o => o.id === 'B').status, 'BLOCKED'); // not advanced locally
  world.obligations = [ob({ id: 'A', status: 'COMPLETED' }), ob({ id: 'B', title: 'Painting', status: 'AVAILABLE' })]; world.actions = [act({ targetObligationId: 'B' })];
  await controller.load(); assert.equal(controller.getSnapshot().obligations.data.find(o => o.id === 'B').status, 'AVAILABLE'); assert.equal(controller.canStart('B'), true);
});

// ------------------------------------------------------------ actions that are NOT buttons
test('WAIT_FOR_DEPENDENCY and FUND_AGREEMENT produce no mutation button; FUND routes only to the existing Money surface', async () => {
  const w = setup({}, { obligations: [ob({ id: 'm1', obligationType: 'MONETARY', title: 'Deposit', status: 'AVAILABLE' })], actions: [act({ targetObligationId: 'm1', actionType: 'FUND_AGREEMENT', actionReason: 'monetary obligation available to fund' })] });
  await w.controller.load(); assert.equal(w.controller.canStart('m1'), false);
  const out = text(panel(w.controller, { onOpenMoney: () => {} })); assert.match(out, /payment obligation\. Money is handled in the Money area/); assert.match(out, /Open Money/); assert.doesNotMatch(out, /Pay now|Fund now|Start work|Mark funded/i);
  assert.doesNotMatch(text(panel(w.controller)), /Open Money/); // no Money route means none is invented
});
test('unproduced/unknown action codes are shown as "can\'t show yet", never as a control', async () => {
  const { controller } = setup({}, { actions: [act({ actionType: 'PROVIDE_LOCATION' })] }); await controller.load();
  assert.equal(controller.canStart('o1'), false); assert.match(text(panel(controller)), /an action for this work that this screen can.t show yet/); assert.doesNotMatch(text(panel(controller)), /location|attendance|delivery/i);
});

// ------------------------------------------------------------ milestones
const dtl = (o = {}) => ({ overview: { agreementId: 'agr-1', title: 'T', status: 'CONFIRMATION_PENDING', currency: 'KES', proposedAmountMinor: null }, currentVersion: { versionId: V2, versionNumber: 2 }, participants: [{ participantId: ME, roleCode: 'X', participantStatus: 'CONFIRMED', ksNumber: 'KS001', displayName: 'Kamau' }], milestones: [], terms: [], documents: [], activity: [], versionHistory: [], money: {}, ...o });
const mile = (id, title, seq, ids) => ({ milestoneId: id, title, description: '', sequenceOrder: seq, availableFrom: null, dueAt: null, status: 'PENDING', obligationIds: ids });
function panel(controller, extra = {}) {
  const { detail, effective, completion, me, onOpenMoney } = { detail: dtl(), effective: [], completion: null, me: ME, ...extra };
  return html(api.ProgressPanel, { controller, detail, effectiveStates: effective, completion, ownParticipantId: me, onOpenMoney });
}
test('sequence order never creates a dependency: milestone 2 READY while milestone 1 is not complete; states come only from SecurePay', async () => {
  const { controller } = setup({}, { obligations: [ob({ id: 'a', title: 'Groundwork', status: 'IN_PROGRESS' }), ob({ id: 'b', title: 'Fittings', status: 'AVAILABLE' })], actions: [] }); await controller.load();
  const d = dtl({ milestones: [mile('m1', 'Milestone One', 1, ['a']), mile('m2', 'Milestone Two', 2, ['b'])] });
  const out = text(panel(controller, { detail: d, effective: [{ milestoneId: 'm1', state: 'IN_PROGRESS', reason: null }, { milestoneId: 'm2', state: 'READY', reason: null }] }));
  assert.match(out, /Milestone One In progress/); assert.match(out, /Milestone Two Ready/); assert.doesNotMatch(out, /Step \d|of \d|\d+%|waiting for .*Milestone One/i);
  const src = (await readFile('src/features/execution/ProgressPanel.tsx', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(src + (await readFile('src/features/execution/controller.ts', 'utf8')), /sequenceOrder/);
});
test('WAITING uses SecurePay\'s reason with milestone TITLES, never ids; an unknown id is "another milestone"', async () => {
  const { controller } = setup({}, { obligations: [ob({ id: 'b', status: 'BLOCKED' })], actions: [] }); await controller.load();
  const M1 = '11111111-2222-3333-4444-555555555555', M2 = '66666666-7777-8888-9999-000000000000';
  const d = dtl({ milestones: [mile(M1, 'Site preparation', 1, []), mile(M2, 'Painting', 2, ['b'])] });
  const raw = panel(controller, { detail: d, effective: [{ milestoneId: M2, state: 'WAITING', reason: `waiting on milestone(s): ${M1}` }] });
  assert.match(text(raw), /Waiting for “Site preparation” to be completed/);
  assert.equal(api.milestoneReasonWords('waiting on milestone(s): 11111111-2222-3333-4444-555555555555', () => null), 'Waiting on another milestone to be completed.');
});
test('effective states failing: milestone titles show but NO state is inferred; empty states are not the same as a failed read', async () => {
  const { controller } = setup({}, { obligations: [ob({ id: 'a', status: 'AVAILABLE' })], actions: [] }); await controller.load();
  const d = dtl({ milestones: [mile('m1', 'Milestone One', 1, ['a'])] });
  const failed = text(panel(controller, { detail: d, effective: null })); assert.match(failed, /Milestone One/); assert.match(failed, /Milestone One Milestone status couldn.t be loaded/); assert.doesNotMatch(failed, /Milestone One (Ready|Waiting|Completed|In progress)/);
  assert.match(text(panel(controller, { detail: d, effective: [] })), /Status unavailable/);
});
test('a simple Agreement (no milestones) shows the obligations directly and invents no milestone', async () => {
  const { controller } = setup({}, { obligations: [ob({ id: 'a', title: 'Do the work' })], actions: [] }); await controller.load();
  const out = text(panel(controller, { detail: dtl({ milestones: [], overview: { ...dtl().overview, title: 'Entire Agreement title' } }) }));
  assert.match(out, /Do the work/); assert.doesNotMatch(out, /Other work|Entire Agreement|root/i);
  const src = await readFile('src/features/execution/ProgressPanel.tsx', 'utf8'); assert.doesNotMatch(src, /rootMilestone|isSimple/);
});
test('the obligation card: title, who is responsible (by participant id), status, what SecurePay says next; no percentages', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'AVAILABLE' })] }); await controller.load();
  const out = text(panel(controller)); assert.match(out, /Install the cabinets/); assert.match(out, /Responsible: Kamau \(you\)/); assert.match(out, /Ready to start/); assert.match(out, /SecurePay says this work is ready for you to start\./); assert.match(panel(controller), /<button[^>]*>Start work<\/button>/);
  assert.doesNotMatch(out, /will record that this obligation has started/); assert.doesNotMatch(out, /%|\d+ of \d+/);
  const anon = setup({}, { obligations: [ob({ responsibleParticipantId: 'unknown-id' })], actions: [] }); await anon.controller.load(); assert.match(text(panel(anon.controller, { me: null })), /Responsible: Responsible participant/);
});
test('overdue is factual and calm; unknown statuses are "unavailable"', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'OVERDUE' }), ob({ id: 'x', status: 'WEIRD' })], actions: [] }); await controller.load();
  const out = text(panel(controller)); assert.match(out, /Overdue/); assert.match(out, /past its expected time and still needs attention/); assert.match(out, /Status unavailable/); assert.doesNotMatch(out, /late|default|unreliable/i);
});

// ------------------------------------------------------------ whole-Agreement completion (read model)
const C = (o = {}) => ({ completed: false, status: 'NOT_COMPLETED', reasonCodes: ['OBLIGATION_INCOMPLETE'], agreementVersionId: V2, completedAt: null, ...o });
test('completed=false stays incomplete even when every visible obligation is done', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'COMPLETED' })], actions: [] }); await controller.load();
  const out = text(panel(controller, { completion: C({ reasonCodes: ['REQUIRED_SETTLEMENT_SCOPE_UNSETTLED'] }) }));
  assert.match(out, /Not complete yet/); assert.match(out, /Settlement activity for this Agreement is still outstanding/); assert.doesNotMatch(out, /Agreement completed/);
});
test('completed=true shows a calm completed state with completedAt, and never claims paid/settled/released', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'COMPLETED' })], actions: [] }); await controller.load();
  const out = text(panel(controller, { completion: C({ completed: true, status: 'COMPLETED', reasonCodes: [], completedAt: '2026-09-21T09:00:00Z' }) }));
  assert.match(out, /Agreement completed/); assert.match(out, /SecurePay records the current Agreement version as completed/); assert.match(out, /Completed [A-Za-z0-9 ,.]*2026/); assert.doesNotMatch(out, /Paid|Settled|Released|funds/i);
});
test('UNSUPPORTED is "not available for this Agreement type", never "unfinished"; unknown/missing are "can\'t be determined"', () => {
  const u = api.completionFacts(C({ status: 'UNSUPPORTED', reasonCodes: ['AMBIGUOUS_SETTLEMENT_SCOPES'] }));
  assert.match(u.headline, /Completion isn.t available for this Agreement/); assert.doesNotMatch(u.headline + u.text, /not complete|unfinished|incomplete/i); assert.equal(u.tone, 'neutral');
  assert.match(api.completionFacts(C({ status: 'NOT_COMPLETED', reasonCodes: ['SOME_FUTURE_CODE'] })).text, /can.t determine completion from this Agreement yet/);
  assert.doesNotMatch(JSON.stringify(api.completionFacts(C({ status: 'NOT_COMPLETED', reasonCodes: ['SOME_FUTURE_CODE'] }))), /SOME_FUTURE_CODE/);
  assert.match(api.completionFacts(null).headline, /Completion status unavailable/);
  assert.match(api.completionFacts(C({ status: 'INELIGIBLE', reasonCodes: ['AGREEMENT_CANCELLED'] })).text, /cancelled/);
});
test('there is no client "complete Agreement" command anywhere', async () => {
  for (const f of ['src/api/securepay/agreements/index.ts', 'src/features/execution/controller.ts', 'src/features/execution/ProgressPanel.tsx', 'src/features/workspace/controller.ts']) {
    const src = (await readFile(f, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /completeAgreement|Mark Agreement complete|Complete Agreement|markComplete/i, f);
  }
});

// ------------------------------------------------------------ partial failure
test('obligations failing: the Agreement stays, with "couldn\'t be loaded" (never "no work")', async () => {
  const { controller } = setup({ obligations: async () => { throw err('http', 500) } }); await controller.load();
  const out = text(panel(controller)); assert.match(out, /The work in this Agreement couldn.t be loaded right now/); assert.doesNotMatch(out, /doesn.t list any work/);
  assert.equal(controller.getSnapshot().obligations.status, 'error');
});
test('next actions failing: read-only view, no invented buttons, and the failure is stated', async () => {
  const { controller } = setup({ myNextActions: async () => { throw err('http', 500) } }); await controller.load();
  const out = text(panel(controller)); assert.match(out, /next steps couldn.t be loaded, so no actions are shown here/); assert.doesNotMatch(out, /Start work|Approve evidence|Complete this obligation/);
});
test('completion unknown does not change anything else; the Agreement lifecycle is not touched', () => {
  assert.equal(api.completionFacts(undefined).tone, 'neutral');
});
test('an empty version renders "doesn\'t list any work", distinct from a failed read', async () => {
  const { controller } = setup({}, { obligations: [], actions: [] }); await controller.load(); assert.match(text(panel(controller)), /This version of the Agreement doesn.t list any work/);
});

// ------------------------------------------------------------ session refresh + workspace summary
test('every new execution gateway method is authenticated and on the shared refresh list', async () => {
  const src = await readFile('src/api/securepay/agreements/index.ts', 'utf8');
  for (const m of ['obligations', 'obligationCompletionStatus', 'startObligation', 'completeObligation', 'obligationEvidence', 'reviewEvidence', 'myNextActions']) {
    assert.ok(api.AUTHENTICATED_AGREEMENT_METHODS.includes(m), `${m} must be session-refreshed`); assert.match(src, new RegExp(`${m}: \\(.*?auth: 'required'`));
  }
});
test('workspace: milestone effective states failing are UNKNOWN (null), not an empty list; whole-Agreement completion facts are carried from the Hub and refreshable', async () => {
  const detailDto = { overview: { agreementId: 'agr-1', publicReference: 'A', title: 'T', purpose: '', description: '', agreementType: 'SERVICE', status: 'CONFIRMATION_PENDING', currency: 'KES', proposedAmountMinor: null, createdAt: 'x', updatedAt: 'x', expiresAt: null }, currentVersion: { versionId: V2, versionNumber: 2, contentHash: 'h', createdAt: 'x', amendmentReason: null, materialChange: false }, participants: [], milestones: [], terms: [], documents: [], activity: [], versionHistory: [], money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 } };
  let completed = false;
  const summary = () => ({ agreementId: 'agr-1', publicReference: 'A', title: 'T', purpose: '', status: 'CONFIRMATION_PENDING', agreementType: 'SERVICE', proposedAmountMinor: null, currency: 'KES', createdAt: 'x', updatedAt: 'x', currentActor: { roleCode: 'X', participantStatus: 'CONFIRMED' }, counterparty: null, nextDeadline: null, attentionRequired: false, nextActions: [], currentAgreementVersionId: V2, completion: completed ? C({ completed: true, status: 'COMPLETED', reasonCodes: [], completedAt: '2026-09-21T09:00:00Z' }) : C() });
  const hub = () => ({ needsMe: [summary()], waitingOnOthers: [], takingShape: [], active: [], changedReviewRequired: [], completed: [], cancelled: [], expired: [] });
  const gateway = { currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }), hub: async () => hub(), detail: async () => detailDto, confirmations: async () => [], confirmationStatus: async () => [], milestoneEffectiveStates: async () => { throw err('http', 500) }, money: { status: async () => { throw err('http', 404) }, records: async () => [] } };
  const c = api.createWorkspaceController(gateway); c.enter(); await tick(); c.openFromHome('agr-1'); await tick();
  assert.equal(c.getSnapshot().detail.data.milestoneStates, null);
  assert.equal(c.getSnapshot().selectedCompletionFacts.completed, false);
  completed = true; await c.refreshSummary();
  assert.equal(c.getSnapshot().selectedCompletionFacts.completed, true); assert.equal(c.getSnapshot().selectedCompletion.completed, true);
});

test('reopening the panel drops settled outcomes but keeps an unsettled (uncertain) one', async () => {
  let first = true;
  const { controller } = setup({ startObligation: async () => { if (first) { first = false; throw err('timeout', null); } return ob({ status: 'IN_PROGRESS' }); } });
  await controller.load(); await controller.start('o1'); await controller.load();
  assert.equal(controller.getSnapshot().notices.o1.kind, 'uncertain'); // unsettled: kept
  const done = setup(); await done.controller.load(); await done.controller.start('o1'); assert.ok(done.controller.getSnapshot().notices.o1); await done.controller.load();
  assert.equal(done.controller.getSnapshot().notices.o1, undefined); // settled: dropped on a fresh look
});

// ------------------------------------------------------------ Phase 7 correction: action-time authority, honest settlement, fail-closed refresh
const sent = calls => calls.filter(c => ['start', 'complete', 'review', 'submitEvidence'].includes(c[0]));
test('RACE Start: v1 rendered, v2 becomes current before the press -> ZERO start call; refreshed; old action not transplanted', async () => {
  const { controller, calls, world, changed } = setup(); await controller.load(); assert.equal(controller.canStart('o1'), true);
  world.current = 'v3'; // another client made v3 current; the obligation still belongs to V2 and SecurePay still lists the (stale) action
  await controller.start('o1');
  assert.equal(sent(calls).length, 0);
  assert.match(controller.getSnapshot().notices.o1.text, /The Agreement changed while you were looking at it\. This work belongs to an earlier version, so nothing was started\. Review the current Agreement\./);
  assert.ok(changed.length >= 1); assert.equal(controller.canStart('o1'), false); assert.deepEqual(controller.current(), []); // refreshed: nothing from the old version is current work
});
test('RACE Start: an obligation that exists in the new version under a NEW id is never pressed on the old one\'s behalf', async () => {
  const { controller, calls, world } = setup(); await controller.load();
  world.current = 'v3'; world.obligations = [ob({ id: 'o1', agreementVersionId: V2 }), ob({ id: 'n1', agreementVersionId: 'v3', title: 'Install the cabinets' })]; world.actions = [act({ targetObligationId: 'n1' })];
  await controller.start('o1'); assert.equal(sent(calls).length, 0);
  assert.equal(controller.canStart('n1'), true); // the NEW work is offered only as its own fresh action, never auto-started
  assert.equal(sent(calls).length, 0);
});
test('RACE Review: v-old evidence shown, new version current before the press -> ZERO review call', async () => {
  const { controller, calls, world } = setup({}, reviewWorld); await controller.load(); assert.ok(controller.reviewTarget('o1'));
  world.current = 'v3'; await controller.review('o1', 'APPROVED');
  assert.equal(sent(calls).length, 0); assert.match(controller.getSnapshot().notices.o1.text, /nothing was reviewed/);
});
test('RACE Complete: eligible on v-old, new version current before the press -> ZERO complete call', async () => {
  const { controller, calls, world } = setup({}, { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) }); await controller.load(); assert.equal(controller.canComplete('o1'), true);
  world.current = 'v3'; await controller.complete('o1');
  assert.equal(sent(calls).length, 0); assert.match(controller.getSnapshot().notices.o1.text, /nothing was completed/);
});
test('an uncertain review RETRY still fails closed when the Agreement moved: a cached pendingReview is no bypass', async () => {
  let first = true;
  const { controller, calls, world } = setup({ reviewEvidence: async (id, eid, body) => { calls.push(['review', eid, body]); if (first) { first = false; throw err('timeout', null); } return ev(); } }, reviewWorld);
  await controller.load(); await controller.review('o1', 'APPROVED'); assert.equal(Object.keys(controller.getSnapshot().pendingReview).length, 1);
  world.current = 'v3'; await controller.review('o1', 'APPROVED');
  assert.equal(calls.filter(c => c[0] === 'review').length, 1); // only the original uncertain attempt
});
test('an uncertain review RETRY on the SAME version proceeds with the same key even if the review action is already gone', async () => {
  let first = true;
  const { controller, calls, world } = setup({ reviewEvidence: async (id, eid, body) => { calls.push(['review', eid, body]); if (first) { first = false; throw err('timeout', null); } return ev(); } }, reviewWorld);
  await controller.load(); await controller.review('o1', 'APPROVED'); world.actions = []; // the first attempt landed, so SecurePay no longer asks
  await controller.review('o1', 'APPROVED');
  const s2 = calls.filter(c => c[0] === 'review'); assert.equal(s2.length, 2); assert.equal(s2[0][2].idempotencyKey, s2[1][2].idempotencyKey);
});
test('any failed preflight read means nothing is sent (the version cannot be established)', async () => {
  const good = { obligations: [ob()], myNextActions: { actions: [act()] }, detail: { currentVersion: { versionId: V2 } } };
  for (const key of ['detail', 'obligations', 'myNextActions']) {
    let armed = false;
    const r = setup({ [key]: async () => { if (armed) throw err('http', 500); return good[key]; } });
    await r.controller.load(); armed = true; // the render-time read worked; only the fresh preflight fails
    await r.controller.start('o1');
    assert.equal(sent(r.calls).length, 0, key);
    assert.match(r.controller.getSnapshot().notices.o1.text, /couldn.t confirm the current version of the Agreement, so nothing was started/);
  }
});
test('the fresh next actions must still hold the action: START gone -> no start; REVIEW gone (first attempt) -> no review; eligible gone -> no complete', async () => {
  const a = setup(); await a.controller.load(); a.world.actions = []; await a.controller.start('o1'); assert.equal(sent(a.calls).length, 0);
  const b = setup({}, reviewWorld); await b.controller.load(); b.world.actions = []; await b.controller.review('o1', 'APPROVED'); assert.equal(sent(b.calls).length, 0);
  const c = setup({}, { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) }); await c.controller.load(); c.world.completion = comp({ eligible: false }); await c.controller.complete('o1'); assert.equal(sent(c.calls).length, 0);
  const d = setup({}, { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) }); await d.controller.load(); d.world.obligations = [ob({ status: 'IN_PROGRESS', responsibleParticipantId: OTHER })]; await d.controller.complete('o1'); assert.equal(sent(d.calls).length, 0);
});
test('a normal press with a current, authorised target still sends exactly once (the preflight does not block valid work)', async () => {
  const s = setup(); await s.controller.load(); await s.controller.start('o1'); assert.equal(s.calls.filter(c => c[0] === 'start').length, 1);
  const c = setup({}, { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) }); await c.controller.load(); await c.controller.complete('o1'); assert.equal(c.calls.filter(c2 => c2[0] === 'complete').length, 1);
});
test('preflight uses SecurePay reads (detail, obligations, next actions) immediately before each consequential call', async () => {
  const { controller, calls } = setup(); await controller.load(); const n = calls.length; await controller.start('o1');
  const seq = names(calls.slice(n)); const startAt = seq.indexOf('start');
  assert.ok(seq.slice(0, startAt).includes('detail') && seq.slice(0, startAt).includes('obligations') && seq.slice(0, startAt).includes('next'));
});

// --- Start uncertainty: only justified conclusions
const uncertainStart = async status => {
  const w = {}; let wr;
  const r = setup({ startObligation: async () => { throw err('timeout', null); } }); wr = r.world;
  await r.controller.load(); await r.controller.start('o1'); assert.equal(r.controller.getSnapshot().notices.o1.kind, 'uncertain');
  wr.obligations = [ob({ status })]; wr.actions = status === 'AVAILABLE' ? [act()] : [];
  await r.controller.checkStart('o1'); return r;
};
test('Start uncertainty: IN_PROGRESS / EVIDENCE_SUBMITTED / COMPLETED / REJECTED prove progression, worded as what SecurePay NOW shows (never "your start succeeded")', async () => {
  for (const [st, word] of [['IN_PROGRESS', 'in progress'], ['EVIDENCE_SUBMITTED', 'evidence submitted'], ['COMPLETED', 'completed'], ['REJECTED', 'rejected']]) {
    const r = await uncertainStart(st); const n = r.controller.getSnapshot().notices.o1;
    assert.equal(n.text, `SecurePay now shows this work as ${word}.`); assert.equal(n.kind, 'done'); assert.doesNotMatch(n.text, /your start|start succeeded|you started|recorded your/i);
  }
});
test('Start uncertainty: BLOCKED / OVERDUE / CANCELLED do NOT prove the start; neutral message, no success tone, no retry', async () => {
  for (const st of ['BLOCKED', 'OVERDUE', 'CANCELLED']) {
    const r = await uncertainStart(st); const n = r.controller.getSnapshot().notices.o1;
    assert.equal(n.kind, 'info'); assert.match(n.text, new RegExp(`SecurePay now shows this work as ${st.toLowerCase()}\\. SecurePay can.t establish from this read whether the earlier start request was recorded\\. Start isn.t available from this state\\.`));
    assert.doesNotMatch(n.text, /recorded that|succeeded|in progress/i);
    const out = text(panel(r.controller)); assert.doesNotMatch(out, /Try again|Check what happened|Start work/);
    assert.equal(r.controller.canStart('o1'), false);
    const before = r.calls.length; await r.controller.start('o1'); assert.equal(r.calls.length, before); // no retry: not even a preflight read
  }
});
test('Start uncertainty: still AVAILABLE stays unresolved with the same-request retry', async () => {
  const r = await uncertainStart('AVAILABLE'); assert.equal(r.controller.getSnapshot().notices.o1.kind, 'uncertain');
});

// --- Approval outcome vs reviewer attribution
test('uncertain approval settled from completion-status says the evidence IS approved -- never that YOU approved it', async () => {
  const r = setup({ reviewEvidence: async () => { throw err('network', null); } }, reviewWorld); await r.controller.load(); await r.controller.review('o1', 'APPROVED');
  r.world.completion = comp({ eligible: true, unmetRequirements: [], satisfiedRequirements: ['evidence_approved_e1'] }); r.world.actions = [];
  await r.controller.checkReview('o1');
  const n = r.controller.getSnapshot().notices.o1; assert.equal(n.text, 'SecurePay now shows this evidence as approved in review.');
  assert.doesNotMatch(n.text, /your approval|you approved|your review|reviewed by|approved by/i); assert.deepEqual(r.controller.getSnapshot().pendingReview, {});
  const src = await readFile('src/features/execution/controller.ts', 'utf8'); assert.match(src, /proves the review OUTCOME, not who made it/);
});
test('a direct 200 from the caller\'s own review request may still say SecurePay recorded YOUR review', async () => {
  const r = setup({}, reviewWorld); await r.controller.load(); await r.controller.review('o1', 'APPROVED'); assert.equal(r.controller.getSnapshot().notices.o1.text, 'SecurePay recorded your review: approved.');
});

// --- Fail-closed post-mutation summary refresh
test('after a successful mutation, a FAILED Hub refresh makes completion UNKNOWN and clears stale next actions; Detail and the mutation fact stay', async () => {
  const detailDto = { overview: { agreementId: 'agr-1', publicReference: 'A', title: 'T', purpose: '', description: '', agreementType: 'SERVICE', status: 'CONFIRMATION_PENDING', currency: 'KES', proposedAmountMinor: null, createdAt: 'x', updatedAt: 'x', expiresAt: null }, currentVersion: { versionId: V2, versionNumber: 2, contentHash: 'h', createdAt: 'x', amendmentReason: null, materialChange: false }, participants: [{ participantId: ME, roleCode: 'X', participantStatus: 'CONFIRMED', ksNumber: 'KS001', displayName: 'Kamau' }], milestones: [], terms: [], documents: [], activity: [], versionHistory: [], money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 } };
  let hubOk = true;
  const summary = () => ({ agreementId: 'agr-1', publicReference: 'A', title: 'T', purpose: '', status: 'CONFIRMATION_PENDING', agreementType: 'SERVICE', proposedAmountMinor: null, currency: 'KES', createdAt: 'x', updatedAt: 'x', currentActor: { roleCode: 'X', participantStatus: 'CONFIRMED' }, counterparty: null, nextDeadline: null, attentionRequired: true, nextActions: [{ actionCode: 'START_OBLIGATION', category: 'AGREEMENT', reason: 'obligation available to start', deadline: null, attentionClass: 'NEEDS_YOU' }], currentAgreementVersionId: V2, completion: C() });
  const hub = () => { if (!hubOk) throw err('http', 500); return { needsMe: [summary()], waitingOnOthers: [], takingShape: [], active: [], changedReviewRequired: [], completed: [], cancelled: [], expired: [] }; };
  const wsGateway = { currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }), hub: async () => hub(), detail: async () => detailDto, confirmations: async () => [], confirmationStatus: async () => [{ participantId: ME }], milestoneEffectiveStates: async () => [], money: { status: async () => { throw err('http', 404) }, records: async () => [] } };
  const ws = api.createWorkspaceController(wsGateway); ws.enter(); await tick(); ws.openFromHome('agr-1'); await tick();
  assert.equal(ws.getSnapshot().selectedCompletionFacts.completed, false); assert.equal(ws.getSnapshot().selectedAgreementNextActions.length, 1);
  const world = { obligations: [ob({ status: 'IN_PROGRESS' })], actions: [], completion: comp({ eligible: true, unmetRequirements: [] }), current: V2, me: ME };
  const gw = { detail: async () => ({ currentVersion: { versionId: V2 } }), obligations: async () => world.obligations, myNextActions: async () => ({ actions: world.actions }), obligationCompletionStatus: async () => world.completion, obligationEvidence: async () => [], completeObligation: async () => { world.obligations = [ob({ status: 'COMPLETED' })]; return ob({ status: 'COMPLETED' }); } };
  const exec = api.createExecutionController(gw, 'agr-1', () => V2, () => ME, async () => { await Promise.all([ws.reloadDetailQuietly(), ws.refreshSummary()]); });
  await exec.load(); hubOk = false; await exec.complete('o1');
  assert.equal(exec.getSnapshot().obligations.data[0].status, 'COMPLETED'); // the mutation fact survives
  assert.equal(exec.getSnapshot().notices.o1.kind, 'done');
  assert.equal(ws.getSnapshot().selectedCompletionFacts, null); assert.equal(ws.getSnapshot().selectedAgreementNextActions.length, 0); // no stale "Not complete yet" / old action
  assert.equal(ws.getSnapshot().detail.status, 'ready'); // Detail is not torn down
  assert.match(text(panel(exec, { completion: ws.getSnapshot().selectedCompletionFacts })), /Completion status unavailable/);
  hubOk = true; await ws.refreshSummary(); assert.equal(ws.getSnapshot().selectedCompletionFacts.completed, false); // a later good read restores it
});

test('after the Agreement moves on, the explanation survives even though the old obligation card is gone', async () => {
  const { controller, world } = setup(); await controller.load(); world.current = 'v3'; await controller.start('o1');
  const out = text(panel(controller, { detail: dtl({ currentVersion: { versionId: 'v3', versionNumber: 3 } }) }));
  assert.match(out, /The Agreement changed while you were looking at it\. This work belongs to an earlier version, so nothing was started\. Review the current Agreement\./);
  assert.doesNotMatch(out, /Install the cabinets/); // the old work is not shown as current
});

test('the version-moved explanation survives the reload it triggers, then is dropped on a later fresh look', async () => {
  const { controller, world } = setup(); await controller.load(); world.current = 'v3'; await controller.start('o1');
  await controller.load(); assert.match(controller.getSnapshot().notices.o1.text, /The Agreement changed while you were looking at it/); // the workspace reload re-mounts the panel
  await controller.load(); assert.equal(controller.getSnapshot().notices.o1, undefined);
});

// ------------------------------------------------------------ FINAL BOUNDARY: Review / Complete stay withheld in production; Start is wired (Slice 1)
// Phase 7 Slice 1 made START atomic server-side (expected Agreement version + obligation state version, responsible participant enforced),
// so the Progress panel offers Start. The complete and review endpoints still don't require the target to belong to the CURRENT Agreement
// version at commit time, so a fresh preflight (kept, tested, unwired) can reduce stale exposure but cannot make those mutations atomic.
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
test('PRODUCTION GUARD: only the Progress panel wires Start; nothing outside the controller calls review / complete (or their recovery)', async () => {
  const { readdir } = await import('node:fs/promises');
  const walk = async dir => (await readdir(dir, { withFileTypes: true })).flatMap(e => e.isDirectory() ? [] : [`${dir}/${e.name}`]);
  const dirs = ['src/features/execution', 'src/features/workspace', 'src/components', 'src/features/agent', 'src/features/handoff', 'src/features/recipient', 'src/features/amendments', 'src/features/invitations'];
  const files = (await Promise.all(dirs.map(walk))).flat().filter(f => /\.(ts|tsx)$/.test(f) && f !== 'src/features/execution/controller.ts');
  assert.ok(files.length > 20);
  for (const f of files) {
    const src = stripComments(await readFile(f, 'utf8'));
    // Only files that touch the EXECUTION controller are in scope (other controllers legitimately have their own start()/review()).
    if (/execution\/controller|ExecutionController|executionFor|createExecutionController/.test(src)) {
      assert.doesNotMatch(src, /\.(review|complete|checkReview|checkComplete)\(/, f);
      if (f !== 'src/features/execution/ProgressPanel.tsx') assert.doesNotMatch(src, /\.(start|checkStart)\(/, f);
    }
    assert.doesNotMatch(src, /\.(startObligation|completeObligation|reviewEvidence|submitEvidence)\(/, f);
  }
});
test('PRODUCTION GUARD: the Progress panel has no Approve / Reject / Complete control, whatever the state', async () => {
  const src = stripComments(await readFile('src/features/execution/ProgressPanel.tsx', 'utf8'));
  assert.doesNotMatch(src, />\s*(Approve evidence|Reject evidence|Complete this obligation|Try again: not accepting|Try approving again)\b/);
  assert.doesNotMatch(src, /onClick=\{[^}]*controller\.(review|complete|checkReview|checkComplete)\(/);
  for (const [world, kind] of [[reviewWorld, 'review'], [{ ...active, completion: comp({ eligible: true, unmetRequirements: [] }) }, 'complete']]) {
    const { controller } = setup({}, world); await controller.load(); await controller.loadDetails('o1');
    const markup = panel(controller);
    assert.doesNotMatch(markup, /<button[^>]*>\s*(Start work|Approve evidence|Reject evidence|Complete this obligation)/, kind);
  }
});
test('Start work is offered ONLY on SecurePay\'s own START_OBLIGATION signal for the caller, never for someone else\'s or unavailable work', async () => {
  const yes = setup(); await yes.controller.load(); assert.match(panel(yes.controller), /<button[^>]*>Start work<\/button>/);
  for (const world of [{ actions: [] }, { obligations: [ob({ status: 'PENDING' })], actions: [act({ actionType: 'WAIT_UNTIL_AVAILABLE' })] }, { obligations: [ob({ status: 'IN_PROGRESS' })], actions: [act({ actionType: 'SUBMIT_EVIDENCE' })] }, { obligations: [ob({ responsibleParticipantId: OTHER })], actions: [act({ actionType: 'WAIT_FOR_COUNTERPARTY' })] }]) {
    const s = setup({}, world); await s.controller.load(); assert.doesNotMatch(panel(s.controller), /Start work/);
  }
});
test('Start sends the expected CURRENT Agreement version and the obligation state version SecurePay just returned', async () => {
  const { controller, calls, world } = setup(); await controller.load();
  world.obligations = [ob({ stateVersion: 5 })]; // the fresh preflight read is what binds the request
  await controller.start('o1');
  const [, , key, expected] = calls.find(c => c[0] === 'start');
  assert.ok(key); assert.deepEqual(expected, { expectedAgreementVersionId: V2, expectedObligationVersion: 5 });
});
test('an uncertain Start retry resends the IDENTICAL request (same key and same expected versions), even if the read has moved', async () => {
  let first = true;
  const { controller, calls, world } = setup({ startObligation: async (id, oid, { idempotencyKey, ...expected }) => { calls.push(['start', oid, idempotencyKey, expected]); if (first) { first = false; throw err('timeout', null); } return ob({ status: 'IN_PROGRESS' }); } });
  await controller.load(); await controller.start('o1');
  world.obligations = [ob({ stateVersion: 9 })]; await controller.start('o1');
  const sentStarts = calls.filter(c => c[0] === 'start'); assert.equal(sentStarts.length, 2);
  assert.equal(sentStarts[0][2], sentStarts[1][2]); assert.deepEqual(sentStarts[0][3], sentStarts[1][3]); assert.equal(sentStarts[1][3].expectedObligationVersion, 3);
});
test('a stale-view 409 starts nothing, reloads the Agreement, re-reads the work and says the Agreement changed', async () => {
  const { controller, changed } = setup({ startObligation: async () => { throw err('http', 409, 'stale'); } });
  await controller.load(); const before = changed.length; await controller.start('o1');
  const n = controller.getSnapshot().notices.o1; assert.equal(n.kind, 'error'); assert.match(n.text, /changed while you were looking at it, so nothing was started/);
  assert.ok(changed.length > before);
});
test('an uncertain Start offers Check and a same-request retry in the panel; no success tone', async () => {
  const { controller } = setup({ startObligation: async () => { throw err('timeout', null); } });
  await controller.load(); await controller.start('o1'); const markup = panel(controller);
  assert.match(markup, /Check with SecurePay/); assert.match(markup, /Try starting again/); assert.doesNotMatch(markup, />Start work</);
  assert.doesNotMatch(text(markup), /recorded that this work is in progress/);
});
test('the two remaining read-only facts stay visible: REVIEW / eligible completion, each with its limitation', async () => {
  const s = setup(); await s.controller.load(); const a = text(panel(s.controller)); assert.match(a, /SecurePay says this work is ready for you to start\./); assert.doesNotMatch(a, /temporarily unavailable/);
  const r = setup({}, reviewWorld); await r.controller.load(); const b = text(panel(r.controller)); assert.match(b, /SecurePay says this evidence needs review\./); assert.match(b, /Recording the review from this screen is temporarily unavailable/);
  const c = setup({}, { ...active, completion: comp({ eligible: true, unmetRequirements: [] }) }); await c.controller.load(); const d = text(panel(c.controller)); assert.match(d, /SecurePay says the completion requirements for this obligation are satisfied\./); assert.match(d, /Completing it from this screen is temporarily unavailable/);
  assert.doesNotMatch(a + b + d, /backend|endpoint|race|TOCTOU|version guard/i); // no jargon
});
test('externally progressed work renders normally: AVAILABLE -> IN_PROGRESS -> EVIDENCE_SUBMITTED -> COMPLETED from SecurePay\'s reads', async () => {
  const { controller, world } = setup({}, { actions: [], obligations: [ob({ status: 'AVAILABLE' })] });
  for (const [st, word] of [['AVAILABLE', 'Ready to start'], ['IN_PROGRESS', 'In progress'], ['EVIDENCE_SUBMITTED', 'Evidence submitted'], ['COMPLETED', 'Completed']]) {
    world.obligations = [ob({ status: st })]; await controller.load(); const out = text(panel(controller)); assert.match(out, new RegExp(word));
    assert.doesNotMatch(out, /<button|Start work|Complete this obligation/);
  }
});
test('the completion projection stays read-only in every state: completed, not complete, unsupported, unavailable', async () => {
  const { controller } = setup({}, { obligations: [], actions: [] }); await controller.load();
  for (const [c, re] of [[C({ completed: true, status: 'COMPLETED', reasonCodes: [], completedAt: '2026-09-21T09:00:00Z' }), /Agreement completed/], [C(), /Not complete yet/], [C({ status: 'UNSUPPORTED' }), /Completion isn.t available/], [null, /Completion status unavailable/]]) {
    const markup = panel(controller, { completion: c }); assert.match(text(markup), re); assert.doesNotMatch(markup, /<button[^>]*>[^<]*(Complete|complete)/);
  }
});
test('the preflight archaeology is kept: the controller still refuses stale work (unwired), documenting why frontend validation alone is not atomic', async () => {
  const src = await readFile('src/features/execution/controller.ts', 'utf8');
  assert.match(src, /ACTION-TIME AUTHORITY/); assert.match(src, /freshAuthority/);
  assert.match(src, /cannot eliminate the race|can shrink but never close|not atomic/i);
});
test('SecurePay\'s WAIT_UNTIL_AVAILABLE (not-yet-available work) is worded plainly and is never a control', async () => {
  const { controller } = setup({}, { obligations: [ob({ status: 'PENDING' })], actions: [act({ actionType: 'WAIT_UNTIL_AVAILABLE', prerequisiteStatus: 'PENDING' })] });
  await controller.load(); const markup = panel(controller);
  assert.match(text(markup), /isn.t available to start yet/); assert.doesNotMatch(markup, /<button[^>]*>(Start work|Try starting again)/);
});
