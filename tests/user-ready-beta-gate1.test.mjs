import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// User-Ready Beta Gate 1 -- UX & Product Convergence (docs/USER_READY_BETA_GATE1_DEFECT_REGISTER.md). One regression per
// confirmed defect where it is deterministically testable without a browser; component wiring inside AgentExperience (which
// this repo does not render in tests) is asserted against production source, the convention the existing suites use.
const bundle = await build({ stdin: { contents: `
export * from './src/features/entry/lifecycle';
export { StartFreshDialog } from './src/features/entry/StartFreshDialog';
export { ContinueCard } from './src/features/entry/ContinueCard';
export { createAgentController } from './src/features/agent/controller';
export { createSourceController } from './src/features/sources/controller';
export { SourceCard, SourcesList } from './src/features/sources/ui/SourceCard';
export { submitCorrection, retryPending, CORRECTION_UNKNOWN_TEXT, CORRECTION_BLOCKED_TEXT } from './src/features/formation/correction';
export { agreementFormationView } from './src/features/formation/view';
export { nextStep, pointLabel, pointQuestion, splitMoney } from './src/features/formation/nextStep';
export { MicroReview } from './src/features/formation/MicroReview';
export { AgreementShaping } from './src/features/formation/AgreementShaping';
export { AgreementReview } from './src/features/formation/AgreementReview';
export { MomentSheet } from './src/components/dna/MomentSheet';
export { FairTradePrinciplesPanel } from './src/components/FairTradePrinciples';
export { SecurePayHero, SignedOutHome, ExampleOutcome } from './src/components/SignedOutHome';
export { ConversationInput } from './src/components/ConversationInput';
export { ConversationSurface } from './src/features/conversation/ConversationSurface';
export { writeDraft, clearComposerDrafts } from './src/features/conversation/drafts';
export { shareText, MAX_SHARE_NOTE, joinUrl } from './src/features/join/share';
export { ShareThis } from './src/features/public/ShareThis';
export { projectWorkbench } from './src/features/workbench/projection';
export { tradeContextView } from './src/api/securepay/agent/adapters';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p = {}) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const src = path => readFile(path, 'utf8');
const agentSrc = await src('src/features/agent/AgentExperience.tsx');

// ================================================================== EP-CERT-001 -- large paste vs chat limit
test('EP-CERT-001: <= 1,200 characters is a turn, > 1,200 is automatically a pasted source (the real transport boundary)', () => {
  const of = n => 'x'.repeat(n);
  assert.equal(api.TURN_MAX_CHARS, 1200);
  for (const [n, route] of [[500, 'turn'], [1199, 'turn'], [1200, 'turn'], [1201, 'source'], [2000, 'source'], [10000, 'source'], [150000, 'source']]) {
    assert.equal(api.routeInput(of(n)), route, `${n} characters`);
  }
  assert.equal(api.routeInput(`   ${of(1200)}   `), 'turn', 'measured on the trimmed text, exactly what is sent');
});

test('EP-CERT-001: no composer silently truncates -- neither Home nor the conversation has a maxLength, and drafts keep long pastes whole', async () => {
  const long = 'Clause. '.repeat(1000); // 8,000 characters
  api.clearComposerDrafts();
  api.writeDraft('home', long);
  const home = html(api.ConversationInput, { onSend() {}, draftKey: 'home' });
  assert.doesNotMatch(home, /maxlength/i);
  assert.ok(home.includes(long.trim().slice(0, 200)), 'the whole draft is restored');
  assert.match(text(home), /longer than a message, so SecurePay will read all of it/);
  api.writeDraft('c1', long);
  const conversation = html(api.ConversationSurface, { tail: null, thinking: false, children: [], disabled: false, onSend() {}, draftKey: 'c1' });
  assert.doesNotMatch(conversation, /maxlength/i);
  assert.match(text(conversation), /longer than a message/);
  const drafts = await src('src/features/conversation/drafts.ts');
  assert.match(drafts, /MAX_DRAFT_CHARS = 200_000/);
  api.clearComposerDrafts();
});

test('EP-CERT-001: the one input door routes long text to the pasted-source path in the SAME workspace, keeps it on failure, never a turn', () => {
  assert.match(agentSrc, /const submitInput = \(text: string, set: WorkSet = currentSet\(\)\): SendResult => \{\s*if \(routeInput\(text\) === 'source'\) \{\s*return set\.sourceController\.addPastedText\(text\)/);
  assert.match(agentSrc, /if \(!outcome\.ok && !outcome\.source\) \{ setBringPlanDraft\(\{ text, label: '' \}\); setIntakeError\(outcome\.error\); setBringPlanOpen\(true\); \}/);
  assert.match(agentSrc, /return outcome\.ok \|\| !!outcome\.source;/, 'a stored (card-carried) source clears the composer; nothing else does');
  assert.match(agentSrc, /onSend=\{text => submitInput\(text\)\}/, 'the conversation composer uses the one door');
});

test('EP-CERT-001: a 10,000-character paste reaches the pasted-source endpoint whole (no truncation anywhere in between)', async () => {
  const bodies = [];
  const gateway = {
    createPastedTextSource: async (id, body) => { bodies.push(body); return { sourceArtifactId: 's1', conversationId: id, sourceKind: 'PASTED_TEXT', originalName: '', label: '', mediaType: 'text/plain', byteSize: 1, documentType: '', extractionStatus: 'READY', extractionGeneration: 1, summary: 'Minutes', uncertainties: [], failureReason: '', createdAt: '', updatedAt: '' }; },
    uploadSource: async () => {}, listSources: async () => ({ sources: [] }), getSource: async () => {}, retrySource: async () => {}, removeSource: async () => {},
  };
  const sources = api.createSourceController(gateway, async () => 'c', {}, { sleep: async () => {}, pollScheduleMs: [] });
  const long = 'A'.repeat(10000);
  const outcome = await sources.addPastedText(long);
  assert.equal(outcome.ok, true);
  assert.equal(bodies[0].text.length, 10000);
});

// ================================================================== EP-CERT-013 / EP-CERT-006 -- Home starts new; + New; Continue
test('EP-CERT-013: start-new decision -- nothing open, clean start, or ask first when meaningful unsaved work would be left behind', () => {
  assert.equal(api.startNewDecision({ conversationId: null, unsaved: false, meaningful: false }), 'none');
  assert.equal(api.startNewDecision({ conversationId: 'c', unsaved: true, meaningful: true }), 'confirm');
  assert.equal(api.startNewDecision({ conversationId: 'c', unsaved: false, meaningful: true }), 'proceed', 'saved work: start new cleanly');
  assert.equal(api.startNewDecision({ conversationId: 'c', unsaved: true, meaningful: false }), 'proceed', 'nothing to lose');
  assert.equal(api.isUnsaved('c', 'c'), true);
  assert.equal(api.isUnsaved('c', null), false, 'Save for later claims the possession record');
  assert.equal(api.hasMeaningfulWork({ turns: [{ sender: 'agent' }], sources: [{ extractionStatus: 'REMOVED' }], factCount: 0 }), false);
  assert.equal(api.hasMeaningfulWork({ turns: [{ sender: 'user' }], sources: [], factCount: 0 }), true);
  assert.equal(api.hasMeaningfulWork({ turns: [], sources: [{ extractionStatus: 'FAILED' }], factCount: 0 }), true);
  assert.equal(api.hasMeaningfulWork({ turns: [], sources: [], factCount: 2 }), true, 'a Store "Use this" seeds facts without a turn');
});

test('EP-CERT-013: every Home entry (type, paste, document, photo, link, place, a saved build) goes through fresh-work routing -- never into the old conversation', () => {
  assert.match(agentSrc, /const startFromHome = \(text: string\): SendResult => \{[\s\S]{0,320}requestFresh\(set =>/);
  assert.match(agentSrc, /const beginHomeUpload = \(kind: 'DOCUMENT' \| 'PHOTO', file: File\) => \{\s*requestFresh\(set =>/);
  assert.match(agentSrc, /const pickDocument = \(file: File\) => beginHomeUpload\('DOCUMENT', file\);/);
  assert.match(agentSrc, /const pickPhoto = \(file: File\) => beginHomeUpload\('PHOTO', file\);/);
  assert.match(agentSrc, /requestFresh\(set => \{ if \(signedIn\) setContinuityDismissed\(true\); setHome\(false\); submitPlan\(text, label, set\); \}\)/);
  assert.match(agentSrc, /if \(showHome\) requestFresh\(set => \{ if \(signedIn\) setContinuityDismissed\(true\); add\(set\); \}\); else add\(currentSet\(\)\);/);
  assert.match(agentSrc, /requestFresh\(set => \{ setHome\(false\); void set\.controller\.resumeConversation\(conversationId\); \}\)/);
  assert.match(agentSrc, /setHomePendingSource\(\{ file, kind, phase: 'reading' \}\)/, 'a Home file is visible before ingestion completes');
  assert.doesNotMatch(agentSrc, /Return to conversation/, 'the old implicit "return" link is replaced by an explicit Continue');
  assert.doesNotMatch(agentSrc, /onStart=\{text => void controller\.send/);
});

test('EP-CERT-013: startNewConversation returns the FRESH controllers and resets the whole active workspace (not saved work)', () => {
  const fn = agentSrc.slice(agentSrc.indexOf('const startNewConversation = ('), agentSrc.indexOf('// ---- User-Ready Beta Gate 1 -- START NEW / CONTINUE'));
  for (const reset of ['setController(freshController)', 'setSourceController(freshSourceController)', 'setFormationController(createFormationController(gateway))',
    'setHandoffController(createHandoffController(gateway))', 'setReviewOpen(false)', 'setMobileTab(\'build\')', 'setMicroReview(null)', 'setFreshIntent(null)',
    'setDirectAck(null)', 'clearComposerDrafts()', 'gateway.forgetResumableConversation?.()', 'instruments.cancel()', 'discovery.close()']) {
    assert.ok(fn.includes(reset), reset);
  }
  assert.match(fn, /return \{ controller: freshController, sourceController: freshSourceController \};/);
});

test('Journey G: bathroom job → + New → cyber café task: the new intention reaches ONLY a new conversation (zero bathroom leakage)', async () => {
  let conversations = 0;
  const sent = [];
  const gateway = {
    createConversation: async () => ({ conversationId: `c${++conversations}` }),
    submitTurn: async (id, body) => { sent.push([id, body.message]); return { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const bathroom = api.createAgentController(gateway, (() => { let i = 0; return () => `t${++i}`; })(), { sleep: async () => {} });
  await bathroom.send('Tile my bathroom for KES 95,000 with Kamau.');
  // + New: the component replaces the workspace with FRESH controllers (asserted above); this is what that fresh one does.
  const cafe = api.createAgentController(gateway, (() => { let i = 0; return () => `u${++i}`; })(), { sleep: async () => {} });
  await cafe.send('Set up five cyber cafés with three partners.');
  assert.deepEqual(sent, [['c1', 'Tile my bathroom for KES 95,000 with Kamau.'], ['c2', 'Set up five cyber cafés with three partners.']]);
  assert.equal(cafe.getSnapshot().conversationId, 'c2');
  assert.ok(cafe.getSnapshot().turns.every(t => t.sender !== 'user' || !/bathroom|Kamau/i.test(t.text)), 'no bathroom words in the new conversation');
});

test('EP-CERT-006: + New is persistent in the conversation identity (mobile and desktop), separate from Refresh, and never buried in utility links', () => {
  assert.equal((agentSrc.match(/<NewWorkButton onClick=\{startNewFromConversation\}/g) ?? []).length, 2);
  assert.doesNotMatch(agentSrc, />Start new conversation</);
  assert.match(agentSrc, /aria-label="Refresh what SecurePay understands"[^>]*>Refresh</);
  assert.match(agentSrc, /data-conversation-title/);
  const refresh = agentSrc.slice(agentSrc.indexOf('const reviewing = () =>'), agentSrc.indexOf('const reviewing = () =>') + 200);
  assert.doesNotMatch(refresh, /startNewConversation|requestFresh/, 'REFRESH never resets');
});

test('D1: "Start fresh?" -- Save for later / Start fresh / Stay here, Stay here is the safe default; Continue is explicit and separate', () => {
  const dialog = html(api.StartFreshDialog, { title: 'Bathroom tiling job', busy: false, onSave() {}, onStartFresh() {}, onStay() {} });
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(text(dialog), /Start fresh\? This work hasn’t been saved: Bathroom tiling job/);
  assert.match(text(dialog), /Stay here .*Start fresh .*Save for later/);
  assert.match(dialog, /<button[^>]*data-autofocus[^>]*>Stay here/);
  const cont = html(api.ContinueCard, { title: 'Bathroom tiling job', detail: 'Not saved yet', onContinue() {} });
  assert.match(cont, /aria-label="Continue: Bathroom tiling job"/);
  assert.match(text(html(api.SecurePayHero, { onStart() {}, continueSlot: api.createElement(api.ContinueCard, { title: 'Bathroom tiling job', onContinue() {} }) })), /Continue Bathroom tiling job Continue Or start something new/);
  assert.match(agentSrc, /onStartFresh=\{\(\) => \{ const run = freshIntent; run\(startNewConversation\(\)\); \}\}/);
});

test('conversation title: the agreement’s own "what", else the person’s first words, never an id', () => {
  assert.equal(api.conversationTitle('Bathroom tiling job', []), 'Bathroom tiling job');
  assert.equal(api.conversationTitle(null, [{ sender: 'agent' }, { sender: 'user', text: 'Set up five cyber cafés' }]), 'Set up five cyber cafés');
  assert.equal(api.conversationTitle(null, []), 'Your conversation');
  assert.ok(api.conversationTitle('x'.repeat(200), []).length <= 60);
});

// ================================================================== EP-CERT-014 / 015 -- source failure recovery
const artifact = over => ({ sourceArtifactId: 's1', conversationId: 'c', sourceKind: 'DOCUMENT', originalName: 'contract.docx', label: '', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', byteSize: 10, documentType: '', extractionStatus: 'FAILED', extractionGeneration: 1, summary: '', uncertainties: [], failureReason: 'SecurePay couldn’t read this document.', createdAt: '', updatedAt: '', ...over });

test('EP-CERT-014: a failed read is shown ONCE -- on its card, which the page-level notice then never repeats', async () => {
  const gateway = { uploadSource: async () => artifact(), listSources: async () => ({ sources: [] }), getSource: async () => artifact(), retrySource: async () => artifact(), removeSource: async () => artifact({ extractionStatus: 'REMOVED' }), createPastedTextSource: async () => {} };
  const sources = api.createSourceController(gateway, async () => 'c', {}, { sleep: async () => {}, pollScheduleMs: [] });
  const outcome = await sources.addUpload('DOCUMENT', {});
  assert.equal(outcome.ok, false);
  assert.equal(sources.getSnapshot().phase, 'error');
  assert.equal(sources.getSnapshot().errorSourceId, 's1', 'the card carries it');
  assert.match(agentSrc, /sourcesState\.phase === 'error' && !sourcesState\.errorSourceId && !bringPlanOpen && !declaredOpen/);
  const refused = api.createSourceController({ ...gateway, uploadSource: async () => { throw new api.ApiError('http', 'x', 415, 'AGENT_SOURCE_UNSUPPORTED_MEDIA_TYPE'); } }, async () => 'c', {}, { sleep: async () => {}, pollScheduleMs: [] });
  await refused.addUpload('DOCUMENT', {});
  assert.equal(refused.getSnapshot().errorSourceId, null, 'refused before reading: no card, so the page notice is the one place');
  refused.clearError();
  assert.equal(refused.getSnapshot().phase, 'list-ready');
  assert.match(agentSrc, /onClick=\{\(\) => sourceController\.clearError\(\)\}[^>]*>Dismiss</);
});

test('EP-CERT-015: a failed source offers Try again AND Remove (labelled), Start fresh only where it fits, and never blocks anything else', () => {
  const card = html(api.SourceCard, { source: artifact(), busy: false, onRetry() {}, onRemove() {} });
  assert.equal((card.match(/role="alert"/g) ?? []).length, 1, 'announced once');
  assert.match(text(card), /Try again/);
  assert.match(card, /aria-label="Remove contract\.docx"[^>]*>.*Remove/s);
  assert.match(text(card), /You can keep talking or add something else meanwhile/);
  assert.doesNotMatch(text(card), /Start fresh/);
  assert.match(text(html(api.SourceCard, { source: artifact(), busy: false, onRetry() {}, onRemove() {}, onStartFresh() {} })), /Start fresh/);
  for (const b of card.match(/<button[^>]*>/g)) assert.match(b, /min-h-11|h-11/, 'every recovery control is a 44px target');
  // Neither the composer nor adding another source is gated on a source error.
  assert.match(agentSrc, /disabled=\{state\.busy \|\| sourcesState\.phase === 'submitting' \|\| sourcesState\.phase === 'checking'\}/);
  assert.doesNotMatch(agentSrc, /disabled=\{[^}]*sourcesState\.phase === 'error'/);
});

// ================================================================== EP-CERT-002 -- never lose a correction
function fakeAgent({ outcome, unknown = false, pendingBefore = false }) {
  let state = { busy: false, pending: pendingBefore ? { kind: 'turn' } : null, outcomeUnknown: false, error: null, turns: [] };
  return {
    getSnapshot: () => state,
    async sendStatement() {
      if (outcome === 'ok') { state = { ...state, turns: [{ sender: 'agent', response: { message: { text: 'Got it — KES 185,000 total.' } } }] }; return { ok: true, context: null }; }
      state = { ...state, pending: { kind: 'turn' }, outcomeUnknown: unknown, error: 'That didn’t go through.' };
      return { ok: false, error: 'That didn’t go through. Your message is kept — please try again.' };
    },
    async retry() { state = { ...state, pending: null, outcomeUnknown: false, turns: [{ sender: 'agent', response: { message: { text: 'Got it — KES 185,000 total.' } } }] }; },
  };
}
test('EP-CERT-002: success clears with KS001’s acknowledgement; failure, an unknown outcome or an unsent earlier message all KEEP the correction', async () => {
  assert.deepEqual(await api.submitCorrection(fakeAgent({ outcome: 'ok' }), 'It’s 185,000'), { status: 'ok', acknowledgement: 'Got it — KES 185,000 total.' });
  assert.equal((await api.submitCorrection(fakeAgent({ outcome: 'fail' }), 'x')).status, 'failed');
  assert.deepEqual(await api.submitCorrection(fakeAgent({ outcome: 'fail', unknown: true }), 'x'), { status: 'unknown', message: api.CORRECTION_UNKNOWN_TEXT });
  assert.deepEqual(await api.submitCorrection(fakeAgent({ outcome: 'ok', pendingBefore: true }), 'x'), { status: 'blocked', message: api.CORRECTION_BLOCKED_TEXT });
  const agent = fakeAgent({ outcome: 'fail', unknown: true });
  await api.submitCorrection(agent, 'x');
  assert.equal((await api.retryPending(agent)).status, 'ok', 'a retry re-sends the SAME pending message (never a duplicate) and reconciles');
});

test('EP-CERT-002: Review only clears the box on a known success (never synchronously on Submit)', async () => {
  const review = await src('src/features/formation/AgreementReview.tsx');
  assert.doesNotMatch(review, /onCorrect\(correction\.trim\(\)\); setCorrection\(''\)/);
  assert.match(review, /if \(!outcome \|\| outcome\.status === 'ok'\) \{\s*setCorrection\(''\);/);
  assert.match(agentSrc, /onCorrect=\{text => submitCorrection\(controller, text\)\}/);
  assert.match(agentSrc, /onRetryCorrection=\{\(\) => retryPending\(controller\)\}/);
  for (const file of ['src/features/conversation/ConversationSurface.tsx', 'src/components/ConversationInput.tsx']) {
    assert.match(await src(file), /if \(accepted\) setText\(''\)/, `${file}: a composer clears only once its words are accepted`);
  }
});

// ================================================================== EP-CERT-003 / 007 -- micro-review, direct resolution, contextual CTA
const conflictDto = (sides, over = {}) => ({ conversationId: 'c', version: 5, digest: 'd', stage: 'UNDERSTOOD', reviewable: true, confirmable: false,
  what: [{ key: 'w', label: 'Work', value: 'Bathroom tiling', basis: 'STATED', needsChecking: false, evidence: [] }], who: [], money: [], when: [], responsibilities: [], conditions: [], notIncluded: [],
  openPoints: [{ id: 'conflict:abc', kind: 'CONFLICT', effect: 'BLOCKS_CONFIRMATION', text: 'The price needs checking: KES 95,000 appears in quotation.pdf; KES 105,000 appears in minutes.pdf.', sides, checkable: false, checked: false, topic: 'MONEY' }],
  question: { ask: true, id: 'q1', text: 'Which total should we use?', choices: ['KES 95,000', 'KES 105,000'], openPointIds: ['conflict:abc'], blocksSetUp: true }, ...over });
const choosableSides = [{ value: 'KES 95,000', from: 'quotation.pdf', factId: 'r1', choosable: true }, { value: 'KES 105,000', from: 'minutes.pdf', factId: 'r2', choosable: true }];

test('EP-CERT-003: sides name their facts; a side is choosable only when the server says so AND names the fact', () => {
  const f = api.agreementFormationView(conflictDto(choosableSides));
  assert.deepEqual(f.openPoints[0].sides[0], { value: 'KES 95,000', from: 'quotation.pdf', factId: 'r1', choosable: true });
  assert.equal(f.openPoints[0].topic, 'MONEY');
  const unnamed = api.agreementFormationView(conflictDto([{ value: 'KES 95,000', from: 'q', choosable: true }]));
  assert.equal(unnamed.openPoints[0].sides[0].choosable, false);
  assert.deepEqual(f.question.openPointIds, ['conflict:abc']);
});

test('EP-CERT-007: the call to action names the actual next step -- one point, several points, or the whole agreement', () => {
  const one = api.agreementFormationView(conflictDto(choosableSides));
  assert.equal(api.nextStep(one).kind, 'point');
  assert.equal(api.nextStep(one).label, 'Resolve price');
  const two = api.agreementFormationView(conflictDto(choosableSides, { openPoints: [...conflictDto(choosableSides).openPoints, { id: 'd', kind: 'CONFLICT', effect: 'BLOCKS_CONFIRMATION', text: 'The start date needs checking', sides: [], checkable: false, checked: false, topic: 'DATE' }] }));
  assert.equal(api.nextStep(two).label, 'Review 2 points');
  assert.deepEqual(api.nextStep(api.agreementFormationView(conflictDto([], { openPoints: [] }))), { kind: 'review', label: 'Review agreement' });
  assert.deepEqual(api.nextStep(api.agreementFormationView(conflictDto([], { stage: 'BUILD', reviewable: false }))), { kind: 'none' });
  assert.equal(api.pointLabel({ kind: 'CONFLICT', topic: 'DATE' }), 'Check date');
  assert.equal(api.pointLabel({ kind: 'CONFLICT', topic: 'PARTY' }), 'Choose person');
  assert.equal(api.pointLabel({ kind: 'SCHEDULE_MISMATCH', topic: 'MONEY' }), 'Check payments');
  assert.equal(api.pointQuestion({ kind: 'CONFLICT', topic: 'MONEY' }), 'Which price is right?');
  assert.deepEqual(api.splitMoney('KES 95,000'), { amount: '95000', currency: 'KES' });
});

test('EP-CERT-007: the micro-review is one decision -- Use this per side, Enter another amount, words as a fallback; a moment with a11y', () => {
  const f = api.agreementFormationView(conflictDto(choosableSides));
  const out = html(api.MicroReview, { point: f.openPoints[0], busy: false, onUse: async () => ({ ok: true }), onTell: async () => ({ ok: true }), onClose() {} });
  assert.match(out, /role="dialog"/); assert.match(out, /aria-modal="true"/); assert.match(out, /aria-labelledby=/);
  assert.match(text(out), /Which price is right\?/);
  assert.equal((out.match(/>Use this</g) ?? []).length, 2);
  assert.match(out, /aria-label="Use KES 95,000 from quotation\.pdf"/);
  assert.match(text(out), /Enter another amount/);
  assert.match(text(out), /Or tell KS001 in your own words/);
  const locked = api.agreementFormationView(conflictDto(choosableSides.map(s => ({ ...s, choosable: false }))));
  const lockedOut = html(api.MicroReview, { point: locked.openPoints[0], busy: false, onUse: async () => ({ ok: true }), onTell: async () => ({ ok: true }), onClose() {} });
  assert.doesNotMatch(lockedOut, />Use this</, 'a confirmed side is never settled from here');
  assert.match(text(lockedOut), /Tell KS001 what’s right/);
});

test('direct conflict resolution: a settleable planned question is answered with Choose (structured), not model-interpreted chips', () => {
  const f = api.agreementFormationView(conflictDto(choosableSides));
  const card = text(html(api.AgreementShaping, { formation: f, onReview() {}, onAnswer() {}, onResolvePoint() {} }));
  assert.match(card, /Resolve price/); assert.match(card, /Choose/);
  assert.doesNotMatch(card, /I don’t know yet/);
  const review = html(api.AgreementReview, { formation: f, changes: [], busy: false, checking: null, error: null, onBack() {}, onCheck() {}, onCorrect() {}, onSetUp() {}, onAcknowledgeChanges() {}, setUp: null, onResolve: async () => ({ ok: true }) });
  assert.match(review, /aria-label="Use KES 95,000 from quotation\.pdf"/);
  assert.doesNotMatch(text(review), /Tell KS001 which is right below/);
  assert.match(agentSrc, /type: 'RESOLVE_CONFLICT', conflictId: point\.id, expectedTradeContextVersion: formation\.version, clientActionId/);
  assert.match(agentSrc, /resolveActionIds\.current\.get\(intention\) \?\? crypto\.randomUUID\(\)/, 'one stable id per intention across retries');
});

// ================================================================== EP-CERT-005 -- direct structured editing
test('EP-CERT-005: a source-derived total is directly editable (canonical SET_AMOUNT), and the row says "Change"', async () => {
  const ctx = api.tradeContextView({ conversationId: 'c', version: 3, entities: [{ id: 'p', type: 'SERVICE', name: 'tiling', state: 'CANDIDATE', confidence: 1, attributes: {} }],
    relationships: [{ id: 'q', kind: 'PAYMENT_CONDITION', subjectEntityId: 'p', state: 'CANDIDATE', confidence: 1, qualifiers: { amount: '95000', currency: 'KES', moneyRole: 'total', currencyBasis: 'inferred', amountText: 'Ksh 95k' } }] });
  const row = api.projectWorkbench(ctx).items.find(i => i.section === 'money');
  assert.equal(row.spec.targetRelationshipId, 'q');
  assert.match(await src('src/features/workbench/UnderstoodWorkbench.tsx'), />\{open \? 'Editing' : 'Change'\}</);
});

// ================================================================== EP-CERT-009/010/011 -- Home, KS001 + Principles, depth
test('EP-CERT-009/010: ONE entry object -- KS001, one composer, one + menu and four approved quick starts', () => {
  const hero = html(api.SecurePayHero, { onStart() {}, onBringPlan() {}, onPickDocument() {}, onPickPhoto() {}, variant: 'public' });
  const t = text(hero);
  assert.ok(t.indexOf('KS001') < t.indexOf('Guided by the 12 Principles of Fair Trade'));
  assert.ok(hero.indexOf('data-ks001-lockup') < hero.indexOf('data-ks001-composer'), 'KS001 introduces the composer');
  assert.equal((hero.match(/data-source-menu/g) ?? []).length, 1);
  assert.ok(hero.indexOf('data-source-menu') < hero.indexOf('data-ks001-composer'), 'the + is inside the composer, before the text box');
  assert.doesNotMatch(t, /Add what you have/, 'no separate "Add" subsystem button');
  for (const label of ['Plan', 'Compare', 'Prepare Agreement', 'Find People']) assert.match(t, new RegExp(label));
  assert.doesNotMatch(t, /Start with KS001/, 'composer is the single Home start action');
});

test('EP-CERT-010: KS001 is introduced, not renamed -- the compass opens as a moment from KS001 itself, never navigating away', () => {
  const panel = html(api.FairTradePrinciplesPanel, { onClose() {}, withKs001: true });
  assert.match(text(panel), /KS001 is SecurePay’s guide — the first KS Number/);
  assert.match(panel, /class="text-wisdom[^"]*">It is guided by the 12 Principles of Fair Trade\./);
  assert.match(panel, /role="dialog"/);
  assert.match(agentSrc, /<FairTradePrinciplesPanel withKs001 onClose=\{\(\) => setCompassOpen\(false\)\} \/>/);
});

test('"prove the output": the example outcome is labelled as an illustration and is never interactive', () => {
  const out = html(api.ExampleOutcome);
  assert.match(text(out), /Example · illustration Bathroom tiling job James ↔ Kamau KES 95,000 total KES 30,000 before work starts Balance after inspection 1 thing still to decide Review agreement/);
  assert.doesNotMatch(out, /<button|<a /);
});

test('EP-CERT-011: one semantic surface hierarchy (canvas, region, information, decision, moment) and a wisdom voice -- from existing tokens', async () => {
  const css = await src('src/index.css');
  for (const level of ['.surface-canvas', '.surface-region', '.surface-info', '.surface-decision', '.surface-moment', '.text-wisdom']) assert.match(css, new RegExp(`\\${level} \\{`));
  assert.match(css, /family=Fraunces:ital,opsz,wght@/, 'the licensed Fraunces italic via Google Fonts -- no shipped font files');
  assert.match(agentSrc, /surface-region min-w-0[^`]*data-understood-plane|data-understood-plane/);
  const publicHome = await src('src/features/public/PublicHome.tsx');
  assert.match(publicHome, /<blockquote className="text-wisdom/);
  assert.match(publicHome, /data-process/);
});

// ================================================================== EP-CERT-012 -- contextual invitation (decision D3)
test('EP-CERT-012: the shared message carries the note, the reason and the destination; nothing is stored, no referral', async () => {
  const url = api.joinUrl('https://securepay.example', 'member');
  const message = api.shareText('member', url, 'I think this is what we were talking about.');
  assert.ok(message.startsWith('I think this is what we were talking about.\n\n'));
  assert.match(message, /The Trust Project useful/);
  assert.ok(message.endsWith('https://securepay.example/trust?interest=member'));
  assert.equal(api.shareText('member', url, 'x'.repeat(1000)).split('\n\n')[0].length, api.MAX_SHARE_NOTE);
  assert.equal(api.shareText('member', url), `${api.shareText('member', url, '')}`);
  const share = (await src('src/features/public/ShareThis.tsx')).replace(/\/\*[\s\S]*?\*\//g, ''); // code only, not its doctrine comment
  assert.doesNotMatch(share, /fetch\(|gateway|localStorage|sessionStorage|referral/i);
  assert.match(text(html(api.ShareThis, { section: 'trust-project' })), /Know someone who should be part of this\? .*It doesn’t sign them up\. Invite someone/);
});

// ================================================================== accessibility primitives
test('moment surfaces trap focus, return it, close on Escape, and are labelled (MomentSheet contract)', async () => {
  const sheet = await src('src/components/dna/MomentSheet.tsx');
  assert.match(sheet, /event\.key === 'Escape' && dismissible/);
  assert.match(sheet, /event\.key !== 'Tab'/);
  assert.match(sheet, /previous\.focus\(\)/);
  const out = html(api.MomentSheet, { title: 'T', description: 'D', onClose() {}, children: 'x' });
  assert.match(out, /aria-labelledby="[^"]+"/); assert.match(out, /aria-describedby="[^"]+"/);
  assert.match(out, /<button[^>]*aria-label="Close"[^>]*h-11 w-11/);
});
