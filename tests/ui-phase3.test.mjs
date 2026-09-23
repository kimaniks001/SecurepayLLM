import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 3 -- Agreement Review, Source Continuity & Deliberate Handoff. Gateways are scripted from the
// HandoffResponse / ReviewedSourceSummary contracts read in SecurePayAPI; the API itself is not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/handoff/controller';
export * from './src/features/handoff/view';
export { HandoffPanel } from './src/features/handoff/HandoffPanel';
export { CanonicalAgreementCard } from './src/components/CanonicalAgreement';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const markup = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const candidate = { title: 'Leather shoes', purpose: null, description: null, agreementType: null, currency: 'KES', amountMinor: 400050, what: ['Leather shoes'], who: ['Wanjiru Traders'], when: ['Friday'] };
const source = (over = {}) => ({ sourceType: 'STORE_LISTING', sourceId: 'o-1', sourceTitle: 'Leather shoes', sourceOwnerKsNumber: 'KS003', capturedPriceMinor: 400000, capturedCurrency: 'KES', capturedAvailabilityState: 'AVAILABLE', capturedQuantityAvailable: 3, capturedDescription: null, contextReference: null, boundAt: '2026-01-01T00:00:00Z', sourceStatus: 'CURRENT', current: null, ...over });
const dto = (status, over = {}) => ({ handoffId: 'h1', conversationId: 'c1', status, agreementCandidateSummary: candidate, reviewedSource: null, mustResolve: [], stillToDecide: [], guidanceNotes: [], tradeContextVersion: 7, candidateDigest: 'd7', expiresAt: '2026-01-01T00:00:00Z', progressedAgreementId: null, ...over });
const network = () => new api.ApiError('network', 'offline');

function setup(overrides = {}) {
  const calls = [];
  let n = 0;
  const gateway = {
    createHandoff: async (c, k) => { calls.push(['create', c, k]); return dto('READY_FOR_REVIEW'); },
    readHandoff: async id => { calls.push(['read', id]); return dto('READY_TO_PROGRESS'); },
    adoptHandoff: async id => { calls.push(['adopt', id]); return dto('READY_FOR_REVIEW'); },
    reviewHandoff: async id => { calls.push(['review', id]); return { agreementCandidateSummary: candidate, reviewedSource: null }; },
    continueHandoff: async (id, body) => { calls.push(['continue', id, body]); return dto('PROGRESSED', { progressedAgreementId: 'a1' }); },
    useCurrentSource: async (id, k) => { calls.push(['useCurrent', id, k]); return dto('READY_FOR_REVIEW'); },
    ...overrides,
  };
  return { calls, controller: api.createHandoffController(gateway, () => `k${++n}`) };
}
const panel = snapshot => {
  const stub = s => ({ subscribe: () => () => {}, getSnapshot: () => s, reset() {}, refresh() {}, start() {}, createDraft() {}, checkOutcome() {}, useCurrentSource() {}, continueAfterIdentity() {}, acknowledgeChange() {} });
  const handoff = stub({ changedDuringSignIn: false, error: null, review: null, ...snapshot });
  const identity = stub({ phase: 'credentials', busy: false, ksNumber: '', password: '', otp: '', challengeToken: null, error: null });
  return text(markup(api.HandoffPanel, { handoff, identity, onDone() {} }));
};

// ---------------------------------------------------------------- consequence boundaries
test('the review CTA names what the backend really does: a DRAFT Agreement, never set/sent/accepted/paid', () => {
  const review = { candidate, who: [], responsibilities: [], money: [], when: [], conditions: [], authority: [], reviewedSource: null };
  const handoff = { id: 'h1', status: 'READY_TO_PROGRESS', mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const card = api.canonicalAgreementView(review, handoff);
  assert.equal(card.primaryLabel, 'Create the draft Agreement');
  assert.equal(card.primaryValue, 'create_draft');
  assert.match(card.consequence, /draft Agreement/); assert.match(card.consequence, /not sent, accepted, funded or paid/);
  assert.doesNotMatch(JSON.stringify(card), /Set securely|legally binding|100% secure/i);
  assert.equal(card.secondaryLabel, 'Change something'); // corrections go back to the conversation, not an editable form
  assert.equal(card.secondaryValue, 'back_to_conversation');
});
test('money on the review is integer-exact (no float division)', () => {
  assert.equal(api.formatHandoffMoney('KES', 400050), 'KES 4,000.50');
  assert.equal(api.formatHandoffMoney('KES', 9007199254740991 > 1 ? 1 : 0), 'KES 0.01');
  assert.equal(api.formatHandoffMoney('KES', null), 'Not yet specified');
});
test('the review card carries the backend sourceType through; an absent type is never shown as the Store', () => {
  const handoff = { id: 'h1', status: 'READY_TO_PROGRESS', mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const withType = api.canonicalAgreementView({ candidate, who: [], responsibilities: [], money: [], when: [], conditions: [], authority: [], reviewedSource: source() }, handoff);
  assert.equal(withType.source.sourceType, 'STORE_LISTING');
  assert.match(text(markup(api.CanonicalAgreementCard, { data: withType, onChoice() {} })), /SecurePay Store · Leather shoes/);
  const other = api.canonicalAgreementView({ candidate, who: [], responsibilities: [], money: [], when: [], conditions: [], authority: [], reviewedSource: source({ sourceType: 'COMMUNITY_POST' }) }, handoff);
  assert.doesNotMatch(text(markup(api.CanonicalAgreementCard, { data: other, onChoice() {} })), /SecurePay Store/);
});

// ---------------------------------------------------------------- handoff idempotency
test('a retry after an uncertain create reuses the SAME clientActionId; a later explicit action gets a fresh one', async () => {
  let fail = true;
  const { controller, calls } = setup({ createHandoff: async (c, k) => { calls.push(['create', c, k]); if (fail) { fail = false; throw network(); } return dto('READY_FOR_REVIEW'); } });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'error');
  await controller.start('c1');
  const keys = calls.filter(c => c[0] === 'create').map(c => c[2]);
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  controller.reset();
  await controller.start('c1');
  assert.notEqual(calls.filter(c => c[0] === 'create')[2][2], keys[0]);
});
test('"review with the current listing" retries with one stable id and never edits the stale handoff', async () => {
  let fail = true;
  const { controller, calls } = setup({
    createHandoff: async () => dto('REVIEW_STALE', { reviewedSource: source({ sourceStatus: 'CHANGED', current: { capturedPriceMinor: 450000, capturedCurrency: 'KES', capturedAvailabilityState: 'AVAILABLE' } }) }),
    useCurrentSource: async (id, k) => { calls.push(['useCurrent', id, k]); if (fail) { fail = false; throw network(); } return dto('READY_FOR_REVIEW'); },
  });
  await controller.start('c1');
  await controller.useCurrentSource();
  assert.equal(controller.getSnapshot().phase, 'review-stale'); // still the frozen stale review, retry possible
  await controller.useCurrentSource();
  const keys = calls.filter(c => c[0] === 'useCurrent').map(c => c[2]);
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  assert.equal(controller.getSnapshot().phase, 'review-ready');
});

// ---------------------------------------------------------------- uncertain draft creation
test('a timeout creating the draft is UNCERTAIN, not failed: retry re-sends the same snapshot, never a new one', async () => {
  let fail = true;
  const { controller, calls } = setup({ continueHandoff: async (id, body) => { calls.push(['continue', id, body]); if (fail) { fail = false; throw new api.ApiError('timeout', 'timed out'); } return dto('PROGRESSED', { progressedAgreementId: 'a1' }); } });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'review-ready');
  await controller.createDraft();
  assert.equal(controller.getSnapshot().phase, 'progress-uncertain');
  assert.match(controller.getSnapshot().error, /could not confirm whether/);
  await controller.createDraft();
  const sends = calls.filter(c => c[0] === 'continue');
  assert.equal(sends.length, 2);
  assert.deepEqual(sends[0], sends[1]); // same handoff, same version + digest
  assert.equal(controller.getSnapshot().phase, 'progressed');
  assert.equal(calls.filter(c => c[0] === 'create').length, 1); // no second handoff
});
test('"check what happened" asks SecurePay: PROGRESSED proves it, anything else does not pretend', async () => {
  let progressed = false;
  const { controller } = setup({
    continueHandoff: async () => { throw network(); },
    readHandoff: async () => progressed ? dto('PROGRESSED', { progressedAgreementId: 'a1' }) : dto('READY_TO_PROGRESS'),
  });
  await controller.start('c1'); await controller.createDraft();
  await controller.checkOutcome();
  assert.equal(controller.getSnapshot().phase, 'progress-uncertain');
  assert.match(controller.getSnapshot().error, /no draft Agreement for this yet/);
  progressed = true;
  await controller.checkOutcome();
  assert.equal(controller.getSnapshot().phase, 'progressed');
});
test('a definite 4xx is a failure, not uncertainty', async () => {
  const { controller } = setup({ continueHandoff: async () => { throw new api.ApiError('http', 'no', 422); } });
  await controller.start('c1'); await controller.createDraft();
  assert.equal(controller.getSnapshot().phase, 'error');
});

// ---------------------------------------------------------------- auth continuity
test('sign-in keeps the SAME handoff (no second create, no second conversation) and flags a changed version', async () => {
  const reads = [dto('READY_FOR_REVIEW', { tradeContextVersion: 8, candidateDigest: 'd8' })];
  const { controller, calls } = setup({ createHandoff: async () => dto('IDENTITY_REQUIRED'), readHandoff: async id => { calls.push(['read', id]); return reads[0]; } });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'identity-required');
  assert.equal(calls.some(c => c[0] === 'review'), false); // nothing canonical is asked for before sign-in
  await controller.continueAfterIdentity();
  assert.equal(calls.filter(c => c[0] === 'create').length, 0 + 0);
  assert.deepEqual(calls.filter(c => c[0] === 'adopt'), [['adopt', 'h1']]);
  assert.equal(controller.getSnapshot().changedDuringSignIn, true);
  assert.equal(controller.getSnapshot().phase, 'review-ready'); // re-review is required: a fresh canonical review was fetched
  assert.ok(calls.some(c => c[0] === 'review'));
});
test('an unchanged version across sign-in raises no change notice', async () => {
  const { controller } = setup({ createHandoff: async () => dto('IDENTITY_REQUIRED') });
  await controller.start('c1'); await controller.continueAfterIdentity();
  assert.equal(controller.getSnapshot().changedDuringSignIn, false);
});
test('the signed-out moment shows what would be reviewed BEFORE sign-in, read-only, and says sign-in commits nothing', () => {
  const view = { id: 'h1', status: 'IDENTITY_REQUIRED', candidate, reviewedSource: source(), mustResolve: [], stillToDecide: ['Delivery date'], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const out = panel({ phase: 'identity-required', handoff: view });
  assert.match(out, /What SecurePay understands so far/); assert.match(out, /Leather shoes/); assert.match(out, /KES 4,000\.50/);
  assert.match(out, /Delivery date/); assert.match(out, /SecurePay Store · Leather shoes/);
  assert.match(out, /Signing in doesn.t create anything or commit you/);
  assert.doesNotMatch(out, /<input[^>]*readonly/i);
});
test('a change during sign-in is stated plainly above the review', () => {
  const view = { id: 'h1', status: 'READY_TO_PROGRESS', candidate, reviewedSource: null, mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 8, expectedCandidateDigest: 'd8' }, progressedAgreementId: null };
  assert.match(panel({ phase: 'review-ready', handoff: view, review: { candidate, who: [], responsibilities: [], money: [], when: [], conditions: [], authority: [], reviewedSource: null }, changedDuringSignIn: true }), /changed while you signed in/);
  assert.doesNotMatch(panel({ phase: 'review-ready', handoff: view, review: { candidate, who: [], responsibilities: [], money: [], when: [], conditions: [], authority: [], reviewedSource: null } }), /changed while you signed in/);
});

// ---------------------------------------------------------------- source continuity
test('CHANGED: Selected earlier vs Current listing, one real action (current listing) plus the way back; nothing silently updated', () => {
  const view = { id: 'h1', status: 'REVIEW_STALE', candidate, reviewedSource: source({ sourceStatus: 'CHANGED', current: { capturedPriceMinor: 450000, capturedCurrency: 'KES', capturedAvailabilityState: 'LOW_AVAILABILITY' } }), mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const out = panel({ phase: 'review-stale', handoff: view });
  assert.match(out, /Selected earlier/); assert.match(out, /KES 4,000/); assert.match(out, /Current listing/); assert.match(out, /KES 4,500/);
  assert.match(out, /Review with the current listing/); assert.match(out, /Back to the conversation/);
  assert.match(out, /Nothing has been changed/);
  assert.doesNotMatch(out, /Create the draft Agreement/);
});
test('UNAVAILABLE keeps the historical provenance, offers only the way back, and never becomes DIRECT or another listing', () => {
  const view = { id: 'h1', status: 'REVIEW_STALE', candidate, reviewedSource: source({ sourceStatus: 'UNAVAILABLE' }), mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const out = panel({ phase: 'review-stale', handoff: view });
  assert.match(out, /SecurePay Store · Leather shoes/); assert.match(out, /Listed at KES 4,000 when chosen/);
  assert.match(out, /no longer available/); assert.match(out, /Back to the conversation/);
  assert.match(out, /Go back to the conversation to choose another listing/);
  assert.doesNotMatch(out, /Review with the current listing|Create the draft Agreement|without a listing|without this listing|carry on|continue without|directly/i);
});
test('an unavailable-current-source stale handoff cannot use useCurrentSource', async () => {
  const { controller, calls } = setup({ createHandoff: async () => dto('REVIEW_STALE', { reviewedSource: source({ sourceStatus: 'UNAVAILABLE' }) }) });
  await controller.start('c1');
  assert.equal(controller.getSnapshot().phase, 'review-stale');
  assert.equal(calls.some(c => c[0] === 'useCurrent'), false);
});
test('stale review is frozen: it is never re-read or reviewed as though it could recover', async () => {
  const { controller, calls } = setup({ createHandoff: async () => dto('REVIEW_STALE') });
  await controller.start('c1');
  assert.equal(calls.some(c => c[0] === 'review' || c[0] === 'read'), false);
});

// ---------------------------------------------------------------- correction + failure
test('corrections route back into the conversation: no editable field exists on the review', () => {
  const view = { id: 'h1', status: 'READY_TO_PROGRESS', candidate, reviewedSource: null, mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const out = markup(api.HandoffPanel, { handoff: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'review-ready', handoff: view, review: { candidate, who: [], responsibilities: [], money: [], when: [], conditions: [], authority: [], reviewedSource: null }, error: null, changedDuringSignIn: false }) }, identity: { subscribe: () => () => {}, getSnapshot: () => ({}) }, onDone() {} });
  assert.doesNotMatch(out, /<input|<textarea|<select/);
  assert.match(text(out), /Change something/);
});
test('the uncertain state offers Check what happened / Try again and promises no second draft', () => {
  const view = { id: 'h1', status: 'READY_TO_PROGRESS', candidate, reviewedSource: null, mustResolve: [], stillToDecide: [], guidanceNotes: [], reviewSnapshot: { expectedTradeContextVersion: 7, expectedCandidateDigest: 'd7' }, progressedAgreementId: null };
  const out = panel({ phase: 'progress-uncertain', handoff: view, error: 'SecurePay could not confirm whether this step completed.' });
  assert.match(out, /not sure that went through/); assert.match(out, /Check what happened/); assert.match(out, /Try again/); assert.match(out, /can.t create a second draft/);
});
test('the calm entry wording: Review this, and the old commitment wording is gone from the production path', async () => {
  const exp = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(exp, /Review this/); assert.doesNotMatch(exp, /Continue with this|Continue to agreement|Set securely/);
  const panelSrc = await readFile('src/features/handoff/HandoffPanel.tsx', 'utf8');
  assert.doesNotMatch(panelSrc, /Set securely|Setting this securely|canonical Agreement review/);
});

// ---------------------------------------------------------------- retry id lifecycle
const idsOf = (calls, name) => calls.filter(c => c[0] === name).map(c => c[2]);
test('retry ids: failed create -> retry without reset reuses the id', async () => {
  let n = 0;
  const { controller, calls } = setup({ createHandoff: async (c, k) => { calls.push(['create', c, k]); if (++n === 1) throw network(); return dto('READY_FOR_REVIEW'); } });
  await controller.start('c1'); await controller.start('c1');
  const [a, b] = idsOf(calls, 'create'); assert.equal(a, b);
});
test('retry ids: failed create -> reset -> new start gets a DIFFERENT id (reset ends the retry sequence)', async () => {
  const { controller, calls } = setup({ createHandoff: async (c, k) => { calls.push(['create', c, k]); throw network(); } });
  await controller.start('c1'); controller.reset(); await controller.start('c1');
  const [a, b] = idsOf(calls, 'create'); assert.notEqual(a, b);
});
test('retry ids: failed use-current-source -> retry reuses; after reset a distinct action does not inherit it', async () => {
  const changed = () => dto('REVIEW_STALE', { reviewedSource: source({ sourceStatus: 'CHANGED', current: { capturedPriceMinor: 450000, capturedCurrency: 'KES', capturedAvailabilityState: 'AVAILABLE' } }) });
  const { controller, calls } = setup({ createHandoff: async () => changed(), useCurrentSource: async (id, k) => { calls.push(['useCurrent', id, k]); throw network(); } });
  await controller.start('c1'); await controller.useCurrentSource(); await controller.useCurrentSource();
  const [a, b] = idsOf(calls, 'useCurrent'); assert.equal(a, b);
  controller.reset(); await controller.start('c1'); await controller.useCurrentSource();
  const ids = idsOf(calls, 'useCurrent'); assert.notEqual(ids[2], a);
});
test('retry ids: a successful create releases its key', async () => {
  const { controller, calls } = setup();
  await controller.start('c1'); controller.reset(); await controller.start('c1');
  const [a, b] = idsOf(calls, 'create'); assert.notEqual(a, b);
});
