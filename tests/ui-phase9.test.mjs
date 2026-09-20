import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 9 -- Agreement Review (participant surface). Contracts read from SecurePayAPI @ 75a490b (read-only); the API was not run. Rendering is SSR (no effects):
// the presentational views take their read states as props, so every state in the matrix is rendered directly.
const bundle = await build({ stdin: { contents: `
export * from './src/features/review/display';
export * from './src/features/review/actions';
export { ReviewListView, CaseDetailView, YourPart, REVIEW_OPEN_WITHHELD, EVIDENCE_UPLOAD_WITHHELD } from './src/features/review/ReviewPanel';
export { createAgreementReviewGateway, REVIEW_MAX_PAGE_SIZE } from './src/api/securepay/agreement-review';
export { REVIEW_AUTHENTICATED_METHODS } from './src/api/securepay/agreement-review/refresh';
export { createAttemptStore } from './src/features/money/attempt';
export { AgreementSupport } from './src/components/AgreementSupport';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const m = mod.exports;
const src = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const html = (c, p) => m.renderToStaticMarkup(m.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const ready = data => ({ status: 'ready', data, refreshing: false });
const err = (status, code) => new m.ApiError('http', 'x', status, code);
const net = () => new m.ApiError('network', 'x', null, null);

const sum = (o = {}) => ({ reviewCaseId: 'rc-secret-1', agreementId: 'agr-secret', agreementVersionId: 'ver-2-secret', subjectType: 'OBLIGATION', subjectId: 'ob-secret', callerRole: 'RESPONDENT', state: 'AWAITING_RESPONSE', openedAt: '2026-09-20T10:00:00Z', responseDeadlineAt: '2026-09-24T10:00:00Z', evidenceDeadlineAt: null, terminalOutcome: null, version: 7, ...o });
const det = (o = {}) => ({ ...sum(), decisionReasonCode: null, callerAcknowledged: false, callerResponded: false, ...o });
const lookup = { versions: new Map([['ver-1-secret', 1], ['ver-2-secret', 2]]), obligations: new Map([['ob-secret', 'Tiling labour']]) };
const noLookup = { versions: null, obligations: null };
const noSecrets = h => assert.doesNotMatch(h, /rc-secret|agr-secret|ver-\d-secret|ob-secret|inst-secret/);

// ---- gateway contract
test('gateway: participant paths, query, bodies and caller-supplied keys; no method mints a key', async () => {
  const calls = []; const http = { request: async (path, o = {}) => { calls.push([path, o]); return {}; } };
  const g = m.createAgreementReviewGateway(http);
  await g.list({ agreementId: 'a', state: 'UNDER_REVIEW', activeOnly: true, page: 2, size: 50 });
  await g.detail('rc', 'a'); await g.evidence('rc', 'a');
  await g.acknowledge('rc', { agreementId: 'a', expectedVersion: 7 }, 'k1');
  await g.respond('rc', { agreementId: 'a', expectedVersion: 7, responseType: 'DISPUTE_POSITION', narrative: 'n' }, 'k2');
  assert.equal(calls[0][0], '/api/v1/agreement-reviews?page=2&size=50&agreementId=a&state=UNDER_REVIEW&activeOnly=true');
  assert.equal(calls[1][0], '/api/v1/agreement-reviews/rc?agreementId=a');
  assert.equal(calls[2][0], '/api/v1/agreement-reviews/rc/evidence?agreementId=a');
  assert.equal(calls[3][0], '/api/v1/agreement-reviews/rc/acknowledgements'); assert.equal(calls[3][1].headers['Idempotency-Key'], 'k1'); assert.deepEqual(calls[3][1].body, { agreementId: 'a', expectedVersion: 7 });
  assert.equal(calls[4][0], '/api/v1/agreement-reviews/rc/responses'); assert.equal(calls[4][1].headers['Idempotency-Key'], 'k2');
  assert.throws(() => g.list({ size: 51 }), /Invalid pagination/); assert.throws(() => g.list({ page: -1 }), /Invalid pagination/);
  const s = await src('src/api/securepay/agreement-review/index.ts');
  assert.doesNotMatch(s, /randomUUID|freshIdempotencyKey|any\b/); assert.doesNotMatch(s, /\/operations|reviewer-queue|\/assignments|\/decisions/);
});

test('drift guard: every authenticated Agreement Review gateway method is in REVIEW_AUTHENTICATED_METHODS, and RuntimeApp wraps from the table', async () => {
  const s = await src('src/api/securepay/agreement-review/index.ts');
  const body = s.slice(s.indexOf('return {'));
  const declared = [...new Set([...body.matchAll(/^\s{4}(\w+): /gm)].map(x => x[1]))];
  assert.deepEqual([...declared].sort(), [...m.REVIEW_AUTHENTICATED_METHODS].sort());
  assert.doesNotMatch(s, /auth: 'none'|auth: 'optional'/);
  assert.match(await src('src/RuntimeApp.tsx'), /withSessionRefresh\(api\.agreementReview, REVIEW_AUTHENTICATED_METHODS/);
});

// ---- production boundary
test('no production path opens a review, requests escalation or uploads evidence; fixture dispute data is not imported by the Review path', async () => {
  const files = [];
  const walk = async dir => { for (const e of await readdir(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) await walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p); } };
  await walk('src/features'); await walk('src/components'); await walk('src/api');
  for (const f of files) {
    if (f.startsWith('src/api/securepay/agreement-review/')) continue;
    const s = await src(f);
    assert.doesNotMatch(s, /\.openCase\(|\.requestEscalation\(|reviewGateway\.open|agreementReview\.openCase/, f);
  }
  for (const f of files.filter(f => f.startsWith('src/features/review/'))) {
    const s = await src(f);
    assert.doesNotMatch(s, /type="file"|type='file'|FormData|multipart|createObjectURL|href=\{|<img|download/i, f);
    assert.doesNotMatch(s, /disputeData|DisputeWorkspace|DisputeMatching|DisputeMaster|localStorage|sessionStorage/, f);
    assert.doesNotMatch(s, /reviewer-queue|\/operations|submitDecision|approveDecision/, f);
  }
  assert.doesNotMatch(await src('src/features/workspace/WorkspaceExperience.tsx'), /disputeData|DisputeWorkspace/);
});

// ---- list
test('no Review cases: "No formal reviews" (not a read failure); read failure: unavailable, never zero', () => {
  const none = text(html(m.ReviewListView, { cases: ready({ items: [], totalElements: 0 }), lookup, currentVersionId: 'ver-2-secret', onOpen() {} }));
  assert.match(none, /No formal reviews on this Agreement/); assert.doesNotMatch(none, /couldn’t be loaded/);
  const failed = text(html(m.ReviewListView, { cases: { status: 'error' }, lookup, currentVersionId: null, onOpen() {} }));
  assert.match(failed, /Reviews couldn’t be loaded\. That doesn’t mean there are none\./); assert.doesNotMatch(failed, /No formal reviews/);
  assert.match(none, /temporarily unavailable while SecurePay completes the participant handoff into the review/);
  assert.match(failed, /temporarily unavailable while SecurePay completes the participant handoff/);
});
test('list separates Active reviews from Review history and labels current / earlier / unknown Agreement version without ids', () => {
  const items = [sum({ reviewCaseId: 'a', state: 'UNDER_REVIEW' }), sum({ reviewCaseId: 'b', state: 'DECIDED', agreementVersionId: 'ver-1-secret', terminalOutcome: 'CASE_DISMISSED' }), sum({ reviewCaseId: 'c', state: 'WEIRD_STATE' })];
  const h = html(m.ReviewListView, { cases: ready({ items, totalElements: 3 }), lookup, currentVersionId: 'ver-2-secret', onOpen() {} });
  const t = text(h);
  assert.match(t, /Active reviews[\s\S]*Under review · Current Agreement version/);
  assert.match(t, /Review history[\s\S]*Review decided · Earlier Agreement version/);
  assert.match(t, /Other reviews[\s\S]*SecurePay has a review state this screen cannot describe yet\./);
  assert.match(t, /Tiling labour/); noSecrets(h);
  const unknownVersion = text(html(m.ReviewListView, { cases: ready({ items: [items[0]], totalElements: 1 }), lookup, currentVersionId: null, onOpen() {} }));
  assert.match(unknownVersion, /Agreement version context unavailable/); assert.doesNotMatch(unknownVersion, /Current Agreement version|Earlier Agreement version/);
});
test('pagination is honest: "Showing N of M" with a real next-page control, never a fabricated total', () => {
  const t = text(html(m.ReviewListView, { cases: ready({ items: [sum()], totalElements: 120 }), lookup, currentVersionId: null, onOpen() {}, onMore() {} }));
  assert.match(t, /Showing 1 of 120 reviews/); assert.match(t, /Show more reviews/);
});

// ---- bounded vocabularies
test('states and outcomes: bounded copy, unknown fails closed', () => {
  const states = { OPENED: 'Formal review opened', AWAITING_RESPONSE: 'Waiting for response', EVIDENCE_COLLECTION: 'Evidence being gathered', UNDER_REVIEW: 'Under review', DECISION_PENDING: 'Decision pending', DECIDED: 'Review decided', CANCELLED: 'Review cancelled', EXPIRED: 'Review expired', SUPERSEDED: 'Replaced by a later review' };
  for (const [k, v] of Object.entries(states)) assert.equal(m.stateWords(k), v);
  assert.equal(m.stateWords('NEW'), 'SecurePay has a review state this screen cannot describe yet.');
  assert.equal(m.outcomeWords('NEW'), m.UNKNOWN_OUTCOME); assert.doesNotMatch(m.outcomeWords('NEW'), /NEW/);
  assert.match(m.reasonWords('X'), /cannot describe yet/);
  assert.equal(m.evidenceTypeWords('SOMETHING'), 'Evidence'); assert.equal(m.evidenceTypeWords('RECEIPT'), 'Receipt');
});
test('outcomes never say money moved, was released, frozen or settled', () => {
  assert.equal(m.outcomeWords('RELEASE_ALLOWED'), 'The Review allows downstream release qualification.');
  assert.equal(m.outcomeWords('RELEASE_BLOCKED'), 'The Review blocks downstream release qualification.');
  for (const o of ['RELEASE_ALLOWED', 'RELEASE_BLOCKED', 'OBLIGATION_SATISFIED', 'OBLIGATION_NOT_SATISFIED', 'CASE_DISMISSED', 'NO_DECISION', 'MORE_EVIDENCE_REQUIRED', 'ESCALATED']) {
    assert.doesNotMatch(m.outcomeWords(o), /money|paid|payment (made|sent)|released\b|frozen|settled|refund|transferred/i, o);
  }
  assert.match(m.OUTCOME_NOT_MONEY, /does not move money by itself/);
  for (const outcome of ['RELEASE_ALLOWED', 'RELEASE_BLOCKED']) {
    const h = html(m.CaseDetailView, { summary: sum({ state: 'DECIDED', terminalOutcome: outcome }), detail: ready(det({ state: 'DECIDED', terminalOutcome: outcome, decisionReasonCode: 'OBLIGATION_MET' })), evidence: ready([]), lookup, currentVersionId: 'ver-2-secret', onBack() {}, onRefresh() {}, onOpenMoney() {}, yourPart: null });
    const t = text(h);
    assert.match(t, /What SecurePay decided/); assert.match(t, /does not move money by itself/);
    assert.doesNotMatch(t, /money (was |has been )?(released|frozen|paid|settled)|KES|frozen|has been released/i);
    assert.match(t, /Open Money for the current financial effect/);
  }
});

// ---- detail
test('case detail: subject, exact version context (no ids), state, deadline as a fact, role, evidence metadata only', () => {
  const evidence = ready([{ evidenceId: 'ev-secret', evidenceType: 'RECEIPT', originalFilename: 'receipt.pdf', mediaType: 'application/pdf', contentLength: 2048, submittedAt: '2026-09-21T10:00:00Z', submittedByCaller: true }]);
  const h = html(m.CaseDetailView, { summary: sum(), detail: ready(det()), evidence, lookup, currentVersionId: 'ver-2-secret', onBack() {}, onRefresh() {}, yourPart: null, now: new Date('2026-09-20T12:00:00Z') });
  const t = text(h);
  assert.match(t, /What is under review[\s\S]*Tiling labour/); assert.match(t, /Current Agreement version · Agreement version 2/);
  assert.match(t, /Waiting for response/); assert.match(t, /Response deadline: 24 Sept? 2026|Response deadline: 24 Sep 2026/);
  assert.match(t, /You are asked to respond/);
  assert.match(t, /receipt\.pdf/); assert.match(t, /Receipt · application\/pdf · 2 KB/); assert.match(t, /Added by you/);
  assert.match(t, /SecurePay hasn’t recorded a decision/);
  noSecrets(h);
  assert.doesNotMatch(h, /<input[^>]*type="file"|<a |download|<img|blob:/i);
  assert.match(t, /Adding new evidence from this screen is temporarily unavailable until formal review evidence has durable storage and retrieval/);
});
test('earlier-version case is history, not "stale"; unknown version context is neutral', () => {
  const earlier = text(html(m.CaseDetailView, { summary: sum({ agreementVersionId: 'ver-1-secret' }), detail: ready(det({ agreementVersionId: 'ver-1-secret' })), evidence: ready([]), lookup, currentVersionId: 'ver-2-secret', onBack() {}, onRefresh() {}, yourPart: null }));
  assert.match(earlier, /Earlier Agreement version · Agreement version 1/); assert.match(earlier, /remains part of the record/); assert.doesNotMatch(earlier, /stale|invalid|outdated/i);
  const unknown = text(html(m.CaseDetailView, { summary: sum(), detail: ready(det()), evidence: ready([]), lookup: noLookup, currentVersionId: null, onBack() {}, onRefresh() {}, yourPart: null }));
  assert.match(unknown, /Agreement version context unavailable/); assert.doesNotMatch(unknown, /Agreement version \d/);
  assert.match(unknown, /A part of this Agreement/);
});
test('a passed deadline is a fact; the browser clock never changes the case state', () => {
  const t = text(html(m.CaseDetailView, { summary: sum(), detail: ready(det()), evidence: ready([]), lookup, currentVersionId: null, onBack() {}, onRefresh() {}, yourPart: null, now: new Date('2026-10-01T00:00:00Z') }));
  assert.match(t, /The listed response deadline has passed\. SecurePay still shows this review as Waiting for response\./);
  assert.doesNotMatch(t, /Review expired/);
});
test('partial failure: detail loads but evidence fails; detail fails but the case and evidence remain', () => {
  const a = text(html(m.CaseDetailView, { summary: sum(), detail: ready(det()), evidence: { status: 'error' }, lookup, currentVersionId: null, onBack() {}, onRefresh() {}, yourPart: null }));
  assert.match(a, /Evidence list couldn’t be loaded\./); assert.match(a, /Waiting for response/); assert.doesNotMatch(a, /no evidence recorded/);
  const b = text(html(m.CaseDetailView, { summary: sum(), detail: { status: 'error' }, evidence: ready([]), lookup, currentVersionId: null, onBack() {}, onRefresh() {}, yourPart: null }));
  assert.match(b, /Your part in this review couldn’t be loaded\./); assert.match(b, /Waiting for response/); assert.match(b, /SecurePay shows no evidence recorded/);
});
test('OPENED case: accurate state, no fake respondent journey (no respond control before AWAITING_RESPONSE/EVIDENCE_COLLECTION)', () => {
  const d = det({ state: 'OPENED', callerRole: 'OPENER' });
  const t = text(html(m.YourPart, { gateway: {}, summary: sum({ state: 'OPENED', callerRole: 'OPENER' }), d, refreshing: false, refresh() {} }));
  assert.doesNotMatch(t, /Your response|Acknowledge this review|Submit/);
  assert.equal(m.stateWords('OPENED'), 'Formal review opened');
});

// ---- participant actions
test('action availability mirrors the backend role/state rules and the caller facts', () => {
  const A = o => m.participantActions({ callerRole: 'RESPONDENT', state: 'AWAITING_RESPONSE', callerAcknowledged: false, callerResponded: false, ...o });
  assert.deepEqual(A({}), { canAcknowledge: true, canRespond: true });
  assert.equal(A({ callerAcknowledged: true }).canAcknowledge, false);                 // no duplicate acknowledgement CTA
  assert.equal(A({ callerResponded: true }).canRespond, false);                        // no edit/duplicate response after refresh
  assert.equal(A({ state: 'OPENED' }).canAcknowledge, true); assert.equal(A({ state: 'OPENED' }).canRespond, false);
  assert.equal(A({ state: 'EVIDENCE_COLLECTION' }).canAcknowledge, false); assert.equal(A({ state: 'EVIDENCE_COLLECTION' }).canRespond, true);
  for (const state of ['UNDER_REVIEW', 'DECISION_PENDING', 'DECIDED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED', 'NEW']) assert.deepEqual(A({ state }), { canAcknowledge: false, canRespond: false }, state);
  for (const role of ['OPENER', 'REVIEWER', 'SENIOR_REVIEWER', 'SYSTEM_ACTOR', 'OPERATIONS_OBSERVER', 'NEW']) assert.deepEqual(A({ callerRole: role }), { canAcknowledge: false, canRespond: false }, role);
  assert.equal(A({ callerRole: 'AFFECTED_FUNDER' }).canRespond, true); assert.equal(A({ callerRole: 'AFFECTED_FUNDER' }).canAcknowledge, false);
});
test('AWAITING_RESPONSE respondent sees only the correct participant actions, each with its exact consequence', () => {
  const t = text(html(m.YourPart, { gateway: {}, summary: sum(), d: det(), refreshing: false, refresh() {} }));
  assert.match(t, /When you press this, SecurePay will record that you have seen this review — nothing more/);
  assert.match(t, /Acknowledge this review/); assert.match(t, /Your response/); assert.match(t, /Review your response/);
  assert.doesNotMatch(t, /Escalat|Open a review|Upload|Add evidence/i);
  assert.doesNotMatch(t, /Make your claim/);
});
test('already acknowledged / already responded: facts shown, no duplicate CTA, no reconstructed narrative', () => {
  const t = text(html(m.YourPart, { gateway: {}, summary: sum(), d: det({ callerAcknowledged: true, callerResponded: true }), refreshing: false, refresh() {} }));
  assert.match(t, /SecurePay shows that you have acknowledged this review\./); assert.match(t, /SecurePay shows that you have responded\./);
  assert.doesNotMatch(t, /Acknowledge this review|Your response|Submit response|Edit response/);
  assert.doesNotMatch(t, /James says|Peter says|Match reached|counterparty/i);
});
test('while the case is being re-read (or unavailable) no new action can be started', () => {
  assert.doesNotMatch(text(html(m.YourPart, { gateway: {}, summary: sum(), d: det(), refreshing: true, refresh() {} })), /Acknowledge this review|Review your response/);
  assert.doesNotMatch(text(html(m.YourPart, { gateway: {}, summary: sum(), d: null, refreshing: false, refresh() {} })), /Acknowledge this review|Review your response/);
});

// ---- command discipline
const ctx = (v = 7) => ({ reviewCaseId: 'rc', agreementId: 'a', expectedVersion: v });
const gw = script => { const calls = []; return { calls, acknowledge: async (id, body, key) => { calls.push(['ack', id, body, key]); return script.next('ack'); }, respond: async (id, body, key) => { calls.push(['respond', id, body, key]); return script.next('respond'); } }; };
const seq = (...items) => ({ next: () => { const i = items.shift(); if (i instanceof Error) throw i; return i; } });
const OK = { reviewCaseId: 'rc', state: 'AWAITING_RESPONSE', version: 7, idempotentReplay: false };

test('acknowledge sends the fresh REVIEW CASE version (expectedVersion), one key per logical attempt', async () => {
  const g = gw(seq(OK)); const s = m.createAttemptStore(() => 'k1');
  const o = await m.runAcknowledge(g, s, ctx(7));
  assert.equal(o.kind, 'ok'); assert.deepEqual(g.calls[0], ['ack', 'rc', { agreementId: 'a', expectedVersion: 7 }, 'k1']);
});
test('uncertain acknowledgement: same request retried with the SAME key; a different request is refused', async () => {
  let n = 0; const g = gw(seq(net(), net(), OK)); const s = m.createAttemptStore(() => `k${++n}`);
  assert.equal((await m.runAcknowledge(g, s, ctx(7))).kind, 'uncertain');
  assert.equal((await m.runAcknowledge(g, s, ctx(7))).kind, 'uncertain');
  assert.equal((await m.runAcknowledge(g, s, ctx(8))).kind, 'refused');          // a different case version while unresolved: nothing sent
  assert.equal(g.calls.length, 2); assert.equal(n, 1);
  assert.equal((await m.runAcknowledge(g, s, ctx(7))).kind, 'ok');
  assert.deepEqual(new Set(g.calls.map(c => c[3])), new Set(['k1']));
});
test('uncertain response: exact case/version/type/narrative retried with the same key; a changed narrative is refused', async () => {
  let n = 0; const g = gw(seq(net(), OK)); const s = m.createAttemptStore(() => `k${++n}`);
  const r = { responseType: 'DISPUTE_POSITION', narrative: 'The tiles were delivered late.' };
  assert.equal((await m.runRespond(g, s, ctx(7), r)).kind, 'uncertain');
  assert.equal((await m.runRespond(g, s, ctx(7), { ...r, narrative: 'A different story.' })).kind, 'refused');
  assert.equal((await m.runRespond(g, s, ctx(7), { ...r, responseType: 'CLARIFICATION' })).kind, 'refused');
  assert.equal(g.calls.length, 1);
  assert.equal((await m.runRespond(g, s, ctx(7), r)).kind, 'ok');
  assert.deepEqual(g.calls.map(c => [c[2].expectedVersion, c[2].responseType, c[2].narrative, c[3]]), [[7, 'DISPUTE_POSITION', r.narrative, 'k1'], [7, 'DISPUTE_POSITION', r.narrative, 'k1']]);
});
test('version conflict: definite, never silently retried against the new version; the next attempt is a NEW logical request', async () => {
  let n = 0; const g = gw(seq(err(409, 'AGREEMENT_REVIEW_STALE_VERSION'), OK)); const s = m.createAttemptStore(() => `k${++n}`);
  assert.equal((await m.runAcknowledge(g, s, ctx(7))).kind, 'stale');
  assert.equal(g.calls.length, 1);                                                   // no automatic retry
  assert.equal((await m.runAcknowledge(g, s, ctx(9))).kind, 'ok');                   // only after a fresh read, bound to the fresh version, with a new key
  assert.deepEqual([g.calls[0][3], g.calls[1][3], g.calls[1][2].expectedVersion], ['k1', 'k2', 9]);
  assert.match(m.OUTCOME_WORDS.stale, /This review changed while you were looking at it\. SecurePay refreshed the current review before you continue\./);
});
test('definite outcomes are classified and worded honestly', async () => {
  const s = () => m.createAttemptStore(() => 'k');
  assert.equal((await m.runRespond(gw(seq(err(409, 'AGREEMENT_REVIEW_RESPONSE_DEADLINE_PASSED'))), s(), ctx(), { responseType: 'DISPUTE_POSITION', narrative: 'x' })).kind, 'deadline');
  assert.equal((await m.runAcknowledge(gw(seq(err(404, 'AGREEMENT_REVIEW_NOT_FOUND'))), s(), ctx())).kind, 'not-found');
  assert.equal((await m.runAcknowledge(gw(seq(err(403, null))), s(), ctx())).kind, 'forbidden');
  assert.equal((await m.runAcknowledge(gw(seq(err(422, null))), s(), ctx())).kind, 'rejected');
  assert.equal((await m.runAcknowledge(gw(seq(err(503, null))), s(), ctx())).kind, 'uncertain');
  assert.equal((await m.runAcknowledge(gw(seq(new m.ApiError('timeout', 'x', null, null))), s(), ctx())).kind, 'uncertain');
  assert.match(m.ACK_WORDS.ok, /does not mean you agree/); assert.match(m.RESPOND_WORDS.ok, /does not decide the review/);
  assert.equal(m.RESPOND_WORDS.already, 'SecurePay shows that you have responded.');
  for (const w of [...Object.values(m.ACK_WORDS), ...Object.values(m.RESPOND_WORDS), ...Object.values(m.OUTCOME_WORDS)]) assert.doesNotMatch(w, /has been decided|is settled|money|matched|winner/i);
});
test('response validation: blank and over-long narratives are never sent', async () => {
  const g = gw(seq(OK)); const s = m.createAttemptStore(() => 'k');
  assert.deepEqual(await m.runRespond(g, s, ctx(), { responseType: 'DISPUTE_POSITION', narrative: '   ' }), { kind: 'invalid', problem: 'empty' });
  assert.deepEqual(await m.runRespond(g, s, ctx(), { responseType: 'DISPUTE_POSITION', narrative: 'x'.repeat(4097) }), { kind: 'invalid', problem: 'too-long' });
  assert.equal(g.calls.length, 0); assert.equal(s.pending, null);
});
test('the case `version` and the Agreement version are never confused', async () => {
  const s = await src('src/features/review/ReviewPanel.tsx');
  assert.match(s, /expectedVersion: d!\.version/);
  assert.doesNotMatch(s, /expectedVersion:[^}]*(versionNumber|currentVersion|agreementVersion)/);
  assert.match(await src('src/api/securepay/agreement-review/dto.ts'), /NOT an Agreement version number/);
});

// ---- Money separation + surface wiring
test('the Review UI computes no financial state and imports no Money authority', async () => {
  for (const f of ['ReviewPanel.tsx', 'display.ts', 'actions.ts']) {
    const s = await src(`src/features/review/${f}`);
    assert.doesNotMatch(s, /money-authority|payment-release|paymentRelease|fundedTotal|remainingFunded|settlementStatus|releaseAuthority|amountMinor|KES|formatMinor/, f);
  }
  assert.match(m.MONEY_MAY_BE_AFFECTED, /may affect whether related money can progress\. Open Money for the current financial state\./);
  assert.doesNotMatch(m.MONEY_MAY_BE_AFFECTED, /blocked|frozen|held/i);
});
test('Agreement Support: "Reviews & issues" opens the Review surface and never implies it starts a review; fixture row unchanged without a panel', () => {
  const real = text(html(m.AgreementSupport, { onAskAgent() {}, reviewPanel: m.createElement('div', null, 'PANEL') }));
  assert.match(real, /Reviews &amp; issues/); assert.match(real, /See formal reviews on this agreement/); assert.doesNotMatch(real, /Raise an issue|Start dispute resolution|Open a review/);
  const fixture = text(html(m.AgreementSupport, { onAskAgent() {} }));
  assert.match(fixture, /Raise an issue/);
});
test('subject labels resolve only from authoritative reads; raw ids are never displayed', () => {
  assert.equal(m.subjectLabel('AGREEMENT', 'x', noLookup), 'The Agreement');
  assert.equal(m.subjectLabel('AGREEMENT_VERSION', 'ver-2-secret', lookup), 'Agreement version 2');
  assert.equal(m.subjectLabel('AGREEMENT_VERSION', 'ver-9', lookup), 'A part of this Agreement');
  assert.equal(m.subjectLabel('OBLIGATION', 'ob-secret', lookup), 'Tiling labour');
  assert.equal(m.subjectLabel('OBLIGATION', 'ob-secret', noLookup), 'A part of this Agreement');
  assert.equal(m.subjectLabel('RELEASE_INSTRUCTION', 'inst-secret', noLookup), 'A payment release instruction');
  for (const t of ['DISTRIBUTION_OBLIGATION', 'ALLOCATION', 'EVIDENCE_ITEM', 'SECUREPROMPT_DECISION', 'BRAND_NEW']) assert.equal(m.subjectLabel(t, 'id', lookup), 'A part of this Agreement');
});
test('notifications: a REVIEWS notification can only open the Agreement (no review id is invented)', async () => {
  const n = await src('src/features/notifications/NotificationsExperience.tsx');
  assert.doesNotMatch(n, /reviewCaseId|agreement-reviews/);
});
