import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 2 -- Input Perfection: no input lost, no false success, no silence. Against the REAL source
// controller, agent controller, adapters and components, with scripted gateways that follow the SecurePayAPI contract
// (201 + extractionStatus; acknowledgement/acknowledgementReplyId; replyId/understandingChanged; 409
// AGENT_TURN_IN_PROGRESS for a turn still being processed).
const bundle = await build({ stdin: { contents: `
export * from './src/features/sources/controller';
export { sourceOutcome, sourceStatusText } from './src/features/sources/presentation';
export { createAgentController, errorText } from './src/features/agent/controller';
export { agentResponseView, sourceArtifactView } from './src/api/securepay/agent/adapters';
export { SourceCard } from './src/features/sources/ui/SourceCard';
export { BringPlanPanel } from './src/features/sources/ui/BringPlanPanel';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const artifact = (over = {}) => ({
  sourceArtifactId: 'src-1', conversationId: 'conv-1', sourceKind: 'PASTED_TEXT', originalName: '', label: '',
  mediaType: 'text/plain', byteSize: 100, documentType: '', extractionStatus: 'READY', extractionGeneration: 1,
  summary: '', uncertainties: [], failureReason: '', createdAt: 't', updatedAt: 't', declaredText: '', ...over,
});
const noWait = { sleep: async () => {} };
const sources = (gateway, callbacks, options = noWait) => api.createSourceController({
  createPastedTextSource: async () => artifact(), uploadSource: async () => artifact(), listSources: async () => ({ sources: [] }),
  getSource: async () => artifact(), retrySource: async () => artifact(), removeSource: async () => artifact({ extractionStatus: 'REMOVED' }), ...gateway,
}, async () => 'conv-1', callbacks, options);

// ------------------------------------------------------------------ 2/3. READY and PARTIAL
test('READY: success only after the canonical reconcile has run, with KS001’s canonical acknowledgement', async () => {
  const order = [];
  const controller = sources({ createPastedTextSource: async () => { order.push('POST'); return artifact({ acknowledgement: 'I’ve pulled 11 details. You can review it now.', acknowledgementReplyId: 'ack-1' }); } },
    { onSourceIngested: async source => { order.push('reconcile-start'); await new Promise(r => setTimeout(r, 5)); order.push(`reconciled:${source.acknowledgement?.replyId}`); } });
  const result = await controller.addPastedText('minutes');
  order.push('resolved');
  assert.equal(result.ok, true); assert.equal(result.attention, false);
  assert.deepEqual(order, ['POST', 'reconcile-start', 'reconciled:ack-1', 'resolved']);
});
test('PARTIAL keeps its usable work and is success-with-attention; READY with uncertainties is attention too', async () => {
  const partial = await sources({ createPastedTextSource: async () => artifact({ extractionStatus: 'PARTIAL', uncertainties: ['Venue unclear.'] }) }, {}).addPastedText('x');
  assert.equal(partial.ok, true); assert.equal(partial.attention, true);
  const readyUnsure = await sources({ createPastedTextSource: async () => artifact({ uncertainties: ['Adhesive: 2 or 3 bags?'] }) }, {}).addPastedText('x');
  assert.equal(readyUnsure.ok, true); assert.equal(readyUnsure.attention, true);
});

// ------------------------------------------------------------------ 19/20. unknown outcomes and reconciliation
test('an interrupted request is re-sent once with the SAME content and reconciles to the real result (no duplicate)', async () => {
  const posts = [];
  const controller = sources({ createPastedTextSource: async (id, body) => {
    posts.push(body);
    if (posts.length === 1) throw new api.ApiError('timeout', 'timed out'); // the server did read it
    return artifact({ acknowledgement: 'Read.', acknowledgementReplyId: 'ack-1' });   // same digest -> the existing artifact
  } }, {});
  const result = await controller.addPastedText('minutes');
  assert.equal(result.ok, true);
  assert.equal(posts.length, 2); assert.deepEqual(posts[0], posts[1]);
  assert.equal(controller.getSnapshot().sources.length, 1);
});
test('an attempt still being read is polled by id until it finishes -- "checking", never "failed"', async () => {
  const phases = [];
  let reads = 0;
  const controller = sources({
    createPastedTextSource: async () => artifact({ extractionStatus: 'PROCESSING' }),
    getSource: async () => (++reads < 3 ? artifact({ extractionStatus: 'PROCESSING' }) : artifact()),
  }, {});
  controller.subscribe(() => phases.push(controller.getSnapshot().phase));
  const result = await controller.addPastedText('minutes');
  assert.equal(result.ok, true);
  assert.ok(phases.includes('checking'));
  assert.ok(!phases.includes('error'));
});
test('still unknown after reconciling: an honest unknown outcome, safe to try again -- never a definite failure', async () => {
  const stillReading = await sources({ createPastedTextSource: async () => artifact({ extractionStatus: 'PROCESSING' }), getSource: async () => artifact({ extractionStatus: 'PROCESSING' }) }, {}, { sleep: async () => {}, pollScheduleMs: [1, 1] }).addPastedText('x');
  assert.equal(stillReading.ok, false); assert.equal(stillReading.outcome, 'unknown');
  assert.match(stillReading.error, /still reading this/);
  const offline = await sources({ createPastedTextSource: async () => { throw new api.ApiError('network', 'offline'); } }, {}).addPastedText('x');
  assert.equal(offline.outcome, 'unknown');
  assert.match(offline.error, /couldn’t confirm whether it read this\. Trying again is safe — it won’t be added twice\./);
});
test('explicit retry re-reads the SAME source and never creates a conversation', async () => {
  let ensured = 0;
  const controller = api.createSourceController({ retrySource: async (c, id) => artifact({ sourceArtifactId: id, extractionGeneration: 2 }), getSource: async () => artifact() },
    async () => { ensured += 1; return 'conv-1'; }, {}, noWait);
  const result = await controller.retry('conv-1', 'src-1');
  assert.equal(result.ok, true); assert.equal(result.source.extractionGeneration, 2); assert.equal(ensured, 0);
});

// ------------------------------------------------------------------ 17/18. human error language
test('every input refusal is human SecurePay language -- never server, MIME, Java or HTTP text', () => {
  const cases = {
    // Entry Perfection Phase 4 -- DELIBERATELY RESTATED: the next action is now "the original file, or paste the text".
    AGENT_SOURCE_CONTENT_MISMATCH: /doesn’t look like the kind of file it says it is, or it may be damaged\. Try the original file, or paste the text here\./,
    AGENT_SOURCE_IMAGE_TOO_LARGE: /photo is too large/,
    AGENT_SOURCE_UNSUPPORTED_MEDIA_TYPE: /doesn’t support this file type/,
    AGENT_SOURCE_TOO_LARGE: /too large for SecurePay to read/,
    AGENT_CONFLICT: /conversation changed while SecurePay was working on this\. Trying again is safe/,
    AGENT_INVALID_INPUT: /couldn’t use this as it is/,
  };
  for (const [code, expected] of Object.entries(cases)) {
    const shown = api.sourceIngestionErrorText(new api.ApiError('http', 'uploaded content does not match its declared type (application/pdf)', 415, code));
    assert.match(shown, expected, code);
    assert.doesNotMatch(shown, /application\/|declared type|exception|HTTP|\b4\d\d\b/i, code);
  }
  const unknownCode = api.sourceIngestionErrorText(new api.ApiError('http', 'java.lang.IllegalStateException: boom', 400, 'SOMETHING_NEW'));
  assert.doesNotMatch(unknownCode, /java|Exception|boom/);
  assert.doesNotMatch(api.errorText(new api.ApiError('http', 'java.lang.IllegalStateException: boom', 400, 'SOMETHING_NEW')), /java|Exception|boom/);
});

// ------------------------------------------------------------------ 21. labels
test('source labels are truthful and neutral: pasted text is "Pasted text", never "Pasted plan"', () => {
  const view = api.sourceArtifactView(artifact());
  const out = text(html(api.SourceCard, { source: view, onRetry() {}, onRemove() {} }));
  assert.match(out, /Pasted text/);
  assert.doesNotMatch(out, /Pasted plan/);
});

// ------------------------------------------------------------------ 5/23. the intake keeps the input and is accessible
test('Bring your plan keeps what was pasted and announces a failure (role=alert), keyboard-reachable', () => {
  const out = html(api.BringPlanPanel, { busy: false, error: 'SecurePay couldn’t read this.', onSubmit() {}, onClose() {}, initialText: 'Borehole minutes…', initialLabel: 'Committee notes' });
  assert.match(out, /Borehole minutes…/);
  assert.match(out, /Committee notes/);
  assert.match(out, /role="alert"/);
  assert.doesNotMatch(out, /tabindex="-1"[^>]*>Add to this conversation/);
});
test('AgentExperience closes the intake only on real success, keeps the draft, and shows "checking" as a status', async () => {
  const src = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.equal((src.match(/if \(outcome\.ok\) \{ setBringPlanOpen\(false\); setBringPlanDraft/g) ?? []).length, 2);
  assert.match(src, /initialText=\{bringPlanDraft\.text\}/);
  assert.match(src, /sourcesState\.phase === 'checking' && <p role="status"/);
  assert.match(src, /onSourceIngested: source => controller\.refreshAfterSourceIngestion\(source\)/);
});

// ------------------------------------------------------------------ turn response fields
test('the adapter carries the canonical replyId and understandingChanged (null when unknown)', () => {
  const view = api.agentResponseView({ message: 'Hi', replyId: 'reply-9', understandingChanged: false });
  assert.equal(view.replyId, 'reply-9'); assert.equal(view.understandingChanged, false);
  const legacy = api.agentResponseView({ message: 'Hi' });
  assert.equal(legacy.replyId, null); assert.equal(legacy.understandingChanged, null);
});
test('a definite turn failure is never reconciled by re-sending (only unknown outcomes are)', async () => {
  let posts = 0;
  const agent = api.createAgentController({
    createConversation: async () => ({ conversationId: 'c' }),
    submitTurn: async () => { posts += 1; throw new api.ApiError('http', 'bad', 400, 'AGENT_INVALID_INPUT'); },
    readContext: async () => ({ conversationId: 'c', version: 0, entities: [], relationships: [] }), conversationHistory: async () => ({ entries: [] }),
  }, () => 'id', noWait);
  await agent.send('hello');
  assert.equal(posts, 1);
  assert.equal(agent.getSnapshot().outcomeUnknown, false);
  assert.ok(agent.getSnapshot().pending, 'the message is kept for an explicit retry');
});
