import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// Phase 7 Slice 6B (UR-194) -- "Start a formal review" on the canonical v2 model. The UI offers only what SecurePay's preflight offers, sends only
// WHAT (a subject) and WHY (a bounded reason) plus the exact current version, and never chooses scope, amount or who takes part.
const bundle = await build({ stdin: { contents: `
export * from './src/features/review/display';
export * from './src/features/review/actions';
export { StartFormalReview, OpeningAvailability, V2CaseList } from './src/features/review/ReviewOpening';
export { createAgreementReviewGateway } from './src/api/securepay/agreement-review';
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
const ready = data => ({ status: 'ready', data });
const err = (status, code) => new m.ApiError('http', 'x', status, code);
const net = () => new m.ApiError('network', 'x', null, null);

const payment = (o = {}) => ({ subjectType: 'OBLIGATION', subjectId: 'ob-pay', workTitle: 'Pay for the fence', wholeAgreementRestricted: false, affectedAmountMinor: 600000,
  people: [{ name: 'Wanjiru', role: 'RESPONDENT' }], yourReserveReady: true, allReserveReady: true, interruptsReleaseCountdown: true, available: true, unavailableReason: null, ...o });
const whole = (o = {}) => ({ subjectType: 'AGREEMENT', subjectId: 'agr-1', workTitle: null, wholeAgreementRestricted: true, affectedAmountMinor: 1000000,
  people: [{ name: 'Wanjiru', role: 'RESPONDENT' }, { name: 'Amina', role: 'RESPONDENT' }], yourReserveReady: true, allReserveReady: false, interruptsReleaseCountdown: false,
  available: false, unavailableReason: 'REVIEW_RESERVE_NOT_READY', ...o });
const preflight = (o = {}) => ({ agreementId: 'agr-1', currentVersionId: 'v3', openingAvailable: true, unavailableReason: null,
  reasonCodes: ['PARTICIPANT_DISPUTE_OBLIGATION', 'PARTICIPANT_DISPUTE_EVIDENCE', 'NOT_A_REAL_CODE'], currency: 'KES', reviewReserveMinimumMinor: 20000,
  subjects: [whole(), payment()], ...o });
const request = (o = {}) => ({ agreementId: 'agr-1', expectedAgreementVersionId: 'v3', subjectType: 'OBLIGATION', subjectId: 'ob-pay', reasonCode: 'PARTICIPANT_DISPUTE_OBLIGATION', ...o });

// ------------------------------------------------------------ gateway
test('gateway: v2 preflight / open / list are the participant path, authenticated and session-refreshed; the legacy v1 openCase is gone', async () => {
  const calls = []; const http = { request: async (path, o = {}) => { calls.push([path, o]); return { items: [] }; } };
  const g = m.createAgreementReviewGateway(http);
  await g.v2Preflight('agr 1'); await g.v2Open(request(), 'k-open'); await g.v2Cases('agr-1');
  assert.equal(calls[0][0], '/api/v1/agreement-reviews/v2/preflight?agreementId=agr%201');
  assert.equal(calls[1][0], '/api/v1/agreement-reviews/v2/open'); assert.equal(calls[1][1].method, 'POST'); assert.equal(calls[1][1].headers['Idempotency-Key'], 'k-open');
  assert.deepEqual(Object.keys(calls[1][1].body).sort(), ['agreementId', 'expectedAgreementVersionId', 'reasonCode', 'subjectId', 'subjectType']);
  assert.equal(calls[2][0], '/api/v1/agreement-reviews/v2?agreementId=agr-1');
  for (const c of calls) assert.equal(c[1].auth, 'required');
  for (const method of ['v2Preflight', 'v2Open', 'v2Cases']) assert.ok(m.REVIEW_AUTHENTICATED_METHODS.includes(method), method);
  assert.equal('openCase' in g, false); assert.equal(m.REVIEW_AUTHENTICATED_METHODS.includes('openCase'), false);
  const src = await readFile('src/api/securepay/agreement-review/index.ts', 'utf8');
  assert.doesNotMatch(src, /\/agreement-reviews\/open`/);
});

// ------------------------------------------------------------ the command
test('one opening = one exact request = one key: an uncertain opening retries the SAME request; a different one is refused meanwhile', async () => {
  const sent = []; let first = true;
  const gateway = { v2Open: async (body, key) => { sent.push({ body, key }); if (first) { first = false; throw net(); } return { reviewCaseId: 'rc', state: 'OPENED', releaseRestriction: 'RELEASE_RESTRICTED', idempotentReplay: true }; } };
  const attempts = m.createAttemptStore(() => `key-${sent.length}`);
  assert.equal((await m.runOpenV2(gateway, attempts, request())).kind, 'uncertain');
  assert.equal((await m.runOpenV2(gateway, attempts, request({ reasonCode: 'PARTICIPANT_DISPUTE_EVIDENCE' }))).kind, 'refused');
  assert.equal(sent.length, 1);
  assert.equal((await m.runOpenV2(gateway, attempts, request())).kind, 'ok');
  assert.equal(sent[0].key, sent[1].key); assert.deepEqual(sent[0].body, sent[1].body); assert.equal(attempts.pending, null);
});
test('definite refusals end the attempt with plain words; none of them claims anything was opened, decided or moved', async () => {
  for (const [error, kind] of [[err(409, 'AGREEMENT_CONFLICT'), 'changed'], [err(409, 'AGREEMENT_REVIEW_V2_CONFLICT'), 'already-open'], [err(422, 'AGREEMENT_STATE_TRANSITION_ERROR'), 'not-possible'],
      [err(404, 'AGREEMENT_REVIEW_NOT_FOUND'), 'not-found'], [err(403, null), 'forbidden'], [err(400, null), 'rejected']]) {
    const attempts = m.createAttemptStore();
    assert.equal((await m.runOpenV2({ v2Open: async () => { throw error; } }, attempts, request())).kind, kind);
    assert.equal(attempts.pending, null);
  }
  assert.match(m.OPEN_WORDS.ok, /Nobody has decided anything, and no money moved\./);
  for (const k of ['changed', 'already-open', 'not-possible', 'rejected']) assert.match(m.OPEN_WORDS[k], /Nothing (new )?was opened/);
});

// ------------------------------------------------------------ the journey
test('only offered subjects can be chosen; unavailable ones say why; unknown reason codes are never offered', () => {
  const t = text(html(m.StartFormalReview, { gateway: {}, preflight: preflight(), onOpened() {}, onCancel() {} }));
  assert.match(t, /1 · What is the problem about\?/); assert.match(t, /The whole Agreement/); assert.match(t, /Work: Pay for the fence/);
  assert.match(t, /One or more of the people involved don’t have the Review Reserve this needs yet\./);
  const h = html(m.StartFormalReview, { gateway: {}, preflight: preflight(), onOpened() {}, onCancel() {} });
  assert.match(h, /<input type="radio" name="review-subject" disabled=""/); // the unavailable whole-Agreement option is disabled
  assert.match(h, /Open formal review<\/button>/); assert.match(h, /disabled=""[^>]*>Open formal review|<button[^>]*disabled=""[^>]*class="rounded-xl bg-forest-700/);
  assert.doesNotMatch(t, /NOT_A_REAL_CODE|OBLIGATION|AGREEMENT_REVIEW|ob-pay|agr-1|v3/);
});
test('the review step explains restriction, amount, who takes part, the countdown, the refundable reserve and the no-adjudication boundary -- all from SecurePay', async () => {
  const src = await readFile('src/features/review/ReviewOpening.tsx', 'utf8');
  assert.match(src, /3 · What will happen/); assert.match(src, /I understand what opening this formal review will do\./);
  assert.match(src, /disabled=\{busy \|\| !subject \|\| !reason \|\| !understood \|\| !subject\.available\}/); // explicit confirmation required
  assert.match(m.v2RestrictedWords(payment()), /^Only this work: “Pay for the fence”$/);
  assert.match(m.v2RestrictedWords(whole()), /^The whole Agreement$/);
  assert.match(m.v2RestrictedWords({ subjectType: 'OBLIGATION', workTitle: 'Build the fence', wholeAgreementRestricted: true }), /no separate amount, so it can’t be reviewed on its own/);
  assert.match(m.V2_BOUNDARY, /does not decide who is right, and opening a review does not move any money/);
  assert.match(m.V2_BOUNDARY, /confirms the same settlement, or by a verified legal direction/);
  assert.match(src, /refundable Review Reserve of \{money\(preflight\.reviewReserveMinimumMinor, preflight\.currency\)\}/);
  assert.match(src, /It is not a charge\./);
  assert.doesNotMatch(src, /balance|Balance|20000|KES 200/);
  // the request carries only what SecurePay offered plus the reason and version -- never people, amounts or scope
  assert.match(src, /agreementId: preflight\.agreementId, expectedAgreementVersionId: preflight\.currentVersionId, subjectType: subject!\.subjectType, subjectId: subject!\.subjectId, reasonCode: reason!/);
});
test('availability comes from SecurePay; the start button exists only when it says a review can open', () => {
  assert.match(text(html(m.OpeningAvailability, { preflight: ready(preflight()), onStart() {} })), /Start a formal review/);
  const no = text(html(m.OpeningAvailability, { preflight: ready(preflight({ openingAvailable: false, unavailableReason: 'CONFIRM_THE_AGREEMENT_FIRST' })), onStart() {} }));
  assert.match(no, /Confirm the Agreement first/); assert.doesNotMatch(no, /Start a formal review/);
  assert.match(text(html(m.OpeningAvailability, { preflight: { status: 'error' }, onStart() {} })), /couldn’t check whether a formal review can be started/);
  // "each option below says why" is backed by a real list: every subject with SecurePay's own reason, and no control (found in the browser)
  const none = html(m.OpeningAvailability, { preflight: ready(preflight({ openingAvailable: false, unavailableReason: 'NO_SUBJECT_AVAILABLE', subjects: [whole(), payment({ available: false, unavailableReason: 'REVIEW_ALREADY_OPEN' })] })), onStart() {} });
  assert.match(text(none), /Each option below says why\. The whole Agreement One or more of the people involved don’t have the Review Reserve this needs yet\. Work: Pay for the fence A formal review already covers this\./);
  assert.doesNotMatch(none, /<button|<input/);
  assert.match(m.openingUnavailableWords('WEIRD'), /can’t be started here right now/);
});
test('the v2 list shows state, what is restricted, the amount and who takes part in words; unread is never "none"', () => {
  const t = text(html(m.V2CaseList, { cases: ready([{ reviewCaseId: 'rc', state: 'OPENED', reasonCode: 'PARTICIPANT_DISPUTE_OBLIGATION', subject: 'Work: Pay for the fence', wholeAgreement: false,
    affectedAmountMinor: 600000, currency: 'KES', releaseRestricted: true, openedAt: '2026-09-26T10:00:00Z', openedByYou: true, yourRole: 'OPENER',
    people: [{ name: 'You', role: 'OPENER', isYou: true }, { name: 'Wanjiru', role: 'RESPONDENT', isYou: false }] }]) }));
  assert.match(t, /Work: Pay for the fence/); assert.match(t, /Opened — waiting for the participants/); assert.match(t, /KES 6,000\.00 under review/);
  assert.match(t, /release of this is restricted while it is open/); assert.match(t, /You: Opened it · Taking part: Wanjiru/);
  assert.doesNotMatch(t, /rc|RELEASE_RESTRICTED|won|lost|verdict|decided/i);
  assert.match(text(html(m.V2CaseList, { cases: { status: 'error' } })), /couldn’t be loaded\. That doesn’t mean there are none\./);
  assert.match(m.v2StateWords('RESOLVED_BY_MATCHING'), /everyone confirmed the same settlement/);
  assert.match(m.v2StateWords('SOMETHING_NEW'), /cannot describe yet/);
});
test('no production path calls the legacy v1 opening; the Review UI never proposes, confirms or resolves a settlement', async () => {
  for (const f of ['src/features/review/ReviewOpening.tsx', 'src/features/review/ReviewPanel.tsx', 'src/features/review/actions.ts']) {
    const s = await readFile(f, 'utf8');
    assert.doesNotMatch(s, /\.openCase\(|\/agreement-reviews\/open|proposal|confirmSettlement|otp/i, f);
  }
});
