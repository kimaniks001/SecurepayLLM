import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
// Phase 7 Slice 6 -- participant Review, doctrine-neutral: durable evidence upload, the Review Reserve explained from SecurePay's own eligibility
// read, opening still withheld (awaiting the v1/v2 opening decision), and the recorded outcome never presented as SecurePay's verdict.
const bundle = await build({ stdin: { contents: `
export * from './src/features/review/display';
export * from './src/features/review/actions';
export { ReviewListView, CaseDetailView } from './src/features/review/ReviewPanel';
export { AddEvidence, OpeningStatus } from './src/features/review/ReviewEvidence';
export { createAgreementReviewGateway, REVIEW_EVIDENCE_MAX_BYTES } from './src/api/securepay/agreement-review';
export { REVIEW_AUTHENTICATED_METHODS } from './src/api/securepay/agreement-review/refresh';
export { createAttemptStore } from './src/features/money/attempt';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const m = mod.exports;
const html = (c, p) => m.renderToStaticMarkup(m.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const ready = data => ({ status: 'ready', data, refreshing: false });
const err = (status, code) => new m.ApiError('http', 'x', status, code);
const net = () => new m.ApiError('network', 'x', null, null);

const PDF = new TextEncoder().encode('%PDF-1.4 fence photos');
const DIGEST = createHash('sha256').update(PDF).digest('hex');
const file = (o = {}) => ({ name: 'fence.pdf', size: PDF.byteLength, type: 'application/pdf', bytes: async () => PDF.buffer.slice(0), blob: new Blob([PDF], { type: 'application/pdf' }), ...o });
const ctx = { reviewCaseId: 'rc-1', agreementId: 'agr-1' };
const item = (o = {}) => ({ evidenceId: 'ev-1', evidenceType: 'DOCUMENT', originalFilename: 'fence.pdf', mediaType: 'application/pdf', contentLength: PDF.byteLength, submittedAt: '2026-09-26T10:00:00Z', submittedByCaller: true, contentSha256Hex: DIGEST, ...o });
const eligibility = (o = {}) => ({ agreementId: 'agr-1', formalOpeningAvailable: false, formalOpeningUnavailableReason: 'FORMAL_OPENING_NOT_YET_AVAILABLE', reviewReserve: { currency: 'KES', minimumMinor: 20000, eligible: true, reasonCode: 'RESERVE_SUFFICIENT', ...o } });
const sum = (o = {}) => ({ reviewCaseId: 'rc-1', agreementId: 'agr-1', agreementVersionId: 'v2', subjectType: 'AGREEMENT', subjectId: 'agr-1', callerRole: 'RESPONDENT', state: 'AWAITING_RESPONSE', openedAt: '2026-09-20T10:00:00Z', responseDeadlineAt: '2026-09-27T10:00:00Z', evidenceDeadlineAt: null, terminalOutcome: null, version: 3, ...o });
const det = (o = {}) => ({ ...sum(), decisionReasonCode: null, callerAcknowledged: true, callerResponded: false, ...o });
const lookup = { versions: new Map([['v2', 2]]), obligations: new Map() };

// ------------------------------------------------------------ gateway
test('gateway: eligibility and multipart evidence, both authenticated and session-refreshed; the key is the caller\'s', async () => {
  const calls = []; const http = { request: async (path, o = {}) => { calls.push([path, o]); return {}; } };
  const g = m.createAgreementReviewGateway(http);
  await g.eligibility('agr 1');
  assert.equal(calls[0][0], '/api/v1/agreement-reviews/eligibility?agreementId=agr%201'); assert.equal(calls[0][1].auth, 'required');
  await g.submitEvidence('rc-1', { agreementId: 'agr-1', evidenceType: 'RECEIPT', narrativeDescription: 'Receipt for poles', contentSha256Hex: DIGEST, file: new Blob([PDF]), filename: 'fence.pdf' }, 'k-ev');
  const [path, o] = calls[1];
  assert.equal(path, '/api/v1/agreement-reviews/rc-1/evidence'); assert.equal(o.method, 'POST'); assert.equal(o.auth, 'required');
  assert.equal(o.headers['Idempotency-Key'], 'k-ev'); assert.ok(o.body instanceof FormData);
  assert.equal(o.body.get('agreementId'), 'agr-1'); assert.equal(o.body.get('evidenceType'), 'RECEIPT');
  assert.equal(o.body.get('narrativeDescription'), 'Receipt for poles'); assert.equal(o.body.get('contentSha256Hex'), DIGEST);
  assert.equal(o.body.get('file').name, 'fence.pdf');
  for (const method of ['eligibility', 'submitEvidence']) assert.ok(m.REVIEW_AUTHENTICATED_METHODS.includes(method), method);
});

// ------------------------------------------------------------ evidence command
test('evidence pre-checks mirror SecurePay\'s bounds (SecurePay stays authoritative)', () => {
  assert.equal(m.validateEvidence(null, ''), 'no-file');
  assert.equal(m.validateEvidence(file({ size: 0 }), ''), 'no-file');
  assert.equal(m.validateEvidence(file({ size: m.REVIEW_EVIDENCE_MAX_BYTES + 1 }), ''), 'too-large');
  for (const type of ['text/html', 'image/svg+xml', 'application/zip', 'video/mp4', '']) assert.equal(m.validateEvidence(file({ type }), ''), 'type', type);
  for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'text/plain']) assert.equal(m.validateEvidence(file({ type }), ''), null, type);
  assert.equal(m.validateEvidence(file(), 'x'.repeat(1025)), 'description-too-long');
});
test('the request is bound to the exact bytes: an uncertain upload retries the SAME key and digest; a different file while unresolved is refused', async () => {
  const sent = []; let first = true;
  const gateway = { submitEvidence: async (id, input, key) => { sent.push({ id, input, key }); if (first) { first = false; throw net(); } return item(); } };
  const attempts = m.createAttemptStore(() => `key-${sent.length}`);
  const o1 = await m.runSubmitEvidence(gateway, attempts, ctx, { evidenceType: 'DOCUMENT', description: ' Photos ', file: file() });
  assert.equal(o1.kind, 'uncertain');
  const refused = await m.runSubmitEvidence(gateway, attempts, ctx, { evidenceType: 'DOCUMENT', description: ' Photos ', file: file({ name: 'other.pdf' }) });
  assert.equal(refused.kind, 'refused'); assert.equal(sent.length, 1);
  const o2 = await m.runSubmitEvidence(gateway, attempts, ctx, { evidenceType: 'DOCUMENT', description: ' Photos ', file: file() });
  assert.equal(o2.kind, 'ok');
  assert.equal(sent[0].key, sent[1].key); assert.equal(sent[0].input.contentSha256Hex, DIGEST); assert.equal(sent[1].input.contentSha256Hex, DIGEST);
  assert.equal(sent[0].input.narrativeDescription, 'Photos');
  assert.equal(attempts.pending, null);
});
test('definite refusals end the attempt and say so in plain words; nothing claims the evidence decided anything', async () => {
  for (const [error, kind] of [[err(409, 'AGREEMENT_REVIEW_EVIDENCE_DEADLINE_PASSED'), 'deadline'], [err(404, 'AGREEMENT_REVIEW_NOT_FOUND'), 'not-found'], [err(403, null), 'forbidden'], [err(422, 'AGREEMENT_VALIDATION_ERROR'), 'rejected']]) {
    const attempts = m.createAttemptStore();
    const outcome = await m.runSubmitEvidence({ submitEvidence: async () => { throw error; } }, attempts, ctx, { evidenceType: 'DOCUMENT', description: '', file: file() });
    assert.equal(outcome.kind, kind); assert.equal(attempts.pending, null);
  }
  assert.match(m.EVIDENCE_WORDS.ok, /does not decide the review and moves no money/);
  assert.match(m.OUTCOME_WORDS.deadline, /deadline had passed/);
});

// ------------------------------------------------------------ when to offer "Add evidence"
test('"Add evidence" is offered only from a fresh read: evidence-capable role, an evidence-open state, deadline not passed', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  assert.equal(m.canAddEvidence(null, now), false);
  for (const state of ['AWAITING_RESPONSE', 'EVIDENCE_COLLECTION']) assert.equal(m.canAddEvidence(det({ state }), now), true, state);
  for (const state of ['OPENED', 'UNDER_REVIEW', 'DECISION_PENDING', 'DECIDED', 'CANCELLED', 'WEIRD']) assert.equal(m.canAddEvidence(det({ state }), now), false, state);
  for (const role of ['OPENER', 'RESPONDENT', 'AFFECTED_BENEFICIARY', 'AFFECTED_FUNDER']) assert.equal(m.canAddEvidence(det({ callerRole: role }), now), true, role);
  for (const role of ['REVIEWER', 'SENIOR_REVIEWER', 'OPERATIONS_OBSERVER', 'SYSTEM_ACTOR']) assert.equal(m.canAddEvidence(det({ callerRole: role }), now), false, role);
  assert.equal(m.canAddEvidence(det({ evidenceDeadlineAt: '2026-09-25T00:00:00Z' }), now), false);
  assert.equal(m.canAddEvidence(det({ evidenceDeadlineAt: '2026-09-28T00:00:00Z' }), now), true);
});
test('the case view shows the evidence control only when given one; otherwise an active review says evidence isn\'t open, never a dead button', () => {
  const base = { summary: sum(), detail: ready(det()), evidence: ready([item()]), lookup, currentVersionId: 'v2', onBack() {}, onRefresh() {}, yourPart: null };
  const without = text(html(m.CaseDetailView, base));
  assert.match(without, /Adding evidence isn’t open at this stage of the review/); assert.doesNotMatch(without, /Add evidence\b/);
  const control = html(m.AddEvidence, { gateway: { submitEvidence: async () => item(), evidence: async () => ({ items: [] }) }, reviewCaseId: 'rc-1', agreementId: 'agr-1', onRecorded() {} });
  const withIt = text(html(m.CaseDetailView, { ...base, addEvidence: m.createElement('div', { dangerouslySetInnerHTML: { __html: control } }) }));
  assert.match(withIt, /Add evidence/); assert.doesNotMatch(withIt, /isn’t open at this stage/);
  assert.match(withIt, /fence\.pdf/); assert.match(withIt, /Added by you/);
  assert.doesNotMatch(control, /<a |download|<img|blob:/i);
});
test('a recorded outcome is labelled as recorded, never as SecurePay\'s verdict, and never as money moving', () => {
  const t = text(html(m.CaseDetailView, { summary: sum({ state: 'DECIDED', terminalOutcome: 'CASE_DISMISSED' }), detail: ready(det({ state: 'DECIDED', terminalOutcome: 'CASE_DISMISSED' })), evidence: ready([]), lookup, currentVersionId: 'v2', onBack() {}, onRefresh() {}, onOpenMoney() {}, yourPart: null }));
  assert.match(t, /Recorded outcome/); assert.doesNotMatch(t, /What SecurePay decided|SecurePay decided/);
  assert.match(t, /does not move money by itself/); assert.match(t, /Open Money for the current financial effect/);
});

// ------------------------------------------------------------ opening + Review Reserve
test('opening is not offered; the Review Reserve is explained from SecurePay\'s own numbers, as a refundable deposit, never a balance', () => {
  const yes = text(html(m.OpeningStatus, { eligibility: ready(eligibility()) }));
  assert.match(yes, /Starting a formal review isn’t available in SecurePay yet/);
  assert.match(yes, /refundable Review Reserve of KES 200\.00 while it is open\. It is not a charge\. Your Review Reserve currently covers it\./);
  const no = text(html(m.OpeningStatus, { eligibility: ready(eligibility({ minimumMinor: 30050, eligible: false, reasonCode: 'RESERVE_INSUFFICIENT' })) }));
  assert.match(no, /KES 300\.50/); assert.match(no, /doesn’t currently cover it/);
  const failed = text(html(m.OpeningStatus, { eligibility: { status: 'error' } }));
  assert.match(failed, /couldn’t check the Review Reserve/); assert.doesNotMatch(failed, /covers it/);
  for (const t of [yes, no]) assert.doesNotMatch(t, /balance|frozen|escrow|fee is charged|will be charged/i);
  const list = html(m.ReviewListView, { cases: ready({ items: [], totalElements: 0 }), lookup, currentVersionId: 'v2', onOpen() {}, opening: m.createElement(m.OpeningStatus, { eligibility: ready(eligibility()) }) });
  assert.doesNotMatch(text(list), /Start a formal review/); assert.doesNotMatch(list, /<button[^>]*>\s*Start/);
});
test('no production path calls openCase or requestEscalation, and the UI hardcodes no Review Reserve figure', async () => {
  for (const f of ['src/features/review/ReviewPanel.tsx', 'src/features/review/ReviewEvidence.tsx', 'src/features/review/display.ts', 'src/features/review/actions.ts']) {
    const s = await readFile(f, 'utf8');
    assert.doesNotMatch(s, /\.openCase\(|\.requestEscalation\(/, f);
    assert.doesNotMatch(s, /\b20000\b|\b200\b.*KES|KES 200/, f);
  }
});

// ------------------------------------------------------------ Home Problems convergence
test('a Home Problem opens its Agreement on Support (Reviews & issues); ordinary opens clear that hint; no case id is invented', async () => {
  const ws = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  assert.match(ws, /onOpenProblem=\{id => \{ setTabHint\(\{ agreementId: id, tab: 'support' \}\); controller\.openFromHome\(id\); \}\}/);
  assert.match(ws, /onOpenAgreement=\{id => \{ setTabHint\(null\); controller\.openFromHome\(id\); \}\}/);
  assert.doesNotMatch(ws.slice(ws.indexOf('onOpenProblem')), /^[^\n]*reviewCaseId/);
  const home = await readFile('src/components/SignedInHome.tsx', 'utf8');
  assert.equal((home.match(/<ProblemsList items=\{problems\} onOpenAgreement=\{onOpenProblem \?\? onOpenAgreement\} \/>/g) ?? []).length, 2);
});
