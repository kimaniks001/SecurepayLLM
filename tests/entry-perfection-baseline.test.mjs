import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 1 -- the UI half of the Golden Entry baseline, against the REAL source controller, agent
// controller and HTTP client with scripted gateways (the backend contracts are read from SecurePayAPI:
// AgentSourceController answers 201 with the artifact whatever its extractionStatus; AgentSourceIngestionService
// runs extract -> understand -> apply synchronously inside the request; SecurePayAgentOrchestrator replays a known
// clientTurnId as "This has already been processed.").
//
// Classification: measurement harness. Phase 1 pinned the defects as evidence; Entry Perfection Phase 2 fixed H1, H2,
// H4, H5 and the UI half of H6, and restated each pin deliberately (the journeys are kept). Every run writes
// build/entry-perfection/ui-baseline.json.
const bundle = await build({ stdin: { contents: `
export { createSourceController, sourceIngestionErrorText } from './src/features/sources/controller';
export { sourceStatusText, sourceOutcome } from './src/features/sources/presentation';
export { createAgentController, errorText, retryLabel } from './src/features/agent/controller';
export { createHttpClient, ApiError } from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

const results = [];
const record = (journey, title, observed) => { results.push({ journey, title, ...observed }); };
process.on('beforeExit', async () => {
  if (results.length === 0) return;
  const out = results.splice(0);
  await mkdir('build/entry-perfection', { recursive: true });
  await writeFile('build/entry-perfection/ui-baseline.json', JSON.stringify(out.sort((a, b) => a.journey.localeCompare(b.journey)), null, 2) + '\n');
});

const artifact = (over = {}) => ({
  sourceArtifactId: 'src-1', conversationId: 'conv-1', sourceKind: 'DOCUMENT', originalName: 'minutes.pdf', label: '',
  mediaType: 'application/pdf', byteSize: 1000, documentType: '', extractionStatus: 'READY', extractionGeneration: 1,
  summary: '', uncertainties: [], failureReason: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over,
});
const context = (version = 1) => ({ conversationId: 'conv-1', version, entities: [], relationships: [] });
const file = () => ({ name: 'minutes.pdf', size: 1000, type: 'application/pdf' });

// ------------------------------------------------------------------ H1 -- FAILED artifact reported as success
test('H1 resolved: a FAILED artifact (HTTP 201) is a failure -- never ok, never "ingested", never closes the intake', async () => {
  let ingested = 0;
  const failed = artifact({ extractionStatus: 'FAILED', failureReason: 'SecurePay received this, but couldn’t read it right now. Nothing from it has been added to this conversation.' });
  const controller = api.createSourceController({ uploadSource: async () => failed, createPastedTextSource: async () => failed }, async () => 'conv-1', { onSourceIngested: () => { ingested += 1; } });
  const upload = await controller.addUpload('DOCUMENT', file());
  const paste = await controller.addPastedText('minutes text');
  record('U-H1', 'FAILED source artifact returned with HTTP 201', {
    uploadOutcome: upload.ok ? 'ok' : upload.outcome, pasteOutcome: paste.ok ? 'ok' : paste.outcome, onSourceIngestedCalls: ingested,
    controllerPhase: controller.getSnapshot().phase, errorShown: controller.getSnapshot().error,
  });
  // Entry Perfection Phase 2 -- DELIBERATELY RESTATED. Was: ok:true, "ingested" twice, Bring-plan closed. The card still shows the reason + Try again.
  assert.equal(upload.ok, false); assert.equal(upload.outcome, 'failed');
  assert.equal(paste.ok, false);
  assert.equal(ingested, 0);
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.match(controller.getSnapshot().error, /couldn’t read it right now/);
});

// ------------------------------------------------------------------ H2 -- refresh discarded while busy
test('H2 resolved: a source completing while KS001 is busy has its canonical refresh DEFERRED, not dropped', async () => {
  const calls = [];
  let releaseTurn;
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: () => new Promise(resolve => { releaseTurn = () => resolve({ message: 'Who is doing the work?', replyId: 'reply-turn' }); }),
    readContext: async () => { calls.push('readContext'); return context(); },
    conversationHistory: async () => { calls.push('history'); return { entries: [] }; },
  };
  const agent = api.createAgentController(gateway, (() => { let n = 0; return () => `local-${++n}`; })(), { sleep: async () => {} });
  const sending = agent.send('I need the borehole pump replaced');
  await new Promise(r => setTimeout(r, 0));
  assert.equal(agent.getSnapshot().busy, true);
  await agent.refreshAfterSourceIngestion({ acknowledgement: { replyId: 'ack-1', text: 'I’ve pulled 11 details from minutes.pdf.' } });
  const shownWhileBusy = agent.getSnapshot().turns.some(t => t.id === 'ack-1');
  releaseTurn();
  await sending;
  await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  const readsAfterTurn = calls.filter(c => c === 'readContext').length;
  record('U-H2', 'Source completes while a turn is in flight', { acknowledgementShownWhileBusy: shownWhileBusy, contextReadsAfterTurn: readsAfterTurn });
  // Entry Perfection Phase 2 -- DELIBERATELY RESTATED. Was: zero calls and the continuation never shown. Now the acknowledgement shows at once and the canonical
  // re-read runs once the turn finishes (the turn's own read + the deferred reconcile).
  assert.equal(shownWhileBusy, true);
  assert.ok(readsAfterTurn >= 2, `expected the deferred reconcile to run, saw ${readsAfterTurn} reads`);
});

// ------------------------------------------------------------------ H5 -- transcript duplication
test('H5 resolved: live KS001 replies carry the canonical reply id, so reconciliation never duplicates them', async () => {
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: async () => ({ message: 'Who is doing the work?', replyId: 'server-reply-1' }),
    readContext: async () => context(),
    conversationHistory: async () => ({ entries: [] }),
  };
  const agent = api.createAgentController(gateway, (() => { let n = 0; return () => `local-${++n}`; })(), { sleep: async () => {} });
  await agent.send('I need the borehole pump replaced');
  await agent.refreshAfterSourceIngestion({ acknowledgement: { replyId: 'server-reply-2', text: 'I’ve pulled 11 details from minutes.pdf.' } });
  await agent.refreshAfterSourceIngestion({ acknowledgement: { replyId: 'server-reply-2', text: 'I’ve pulled 11 details from minutes.pdf.' } });
  const agentTurns = agent.getSnapshot().turns.filter(t => t.sender === 'agent');
  record('U-H5', 'Source acknowledgement after a live KS001 turn', { ks001TurnsShown: agentTurns.map(t => t.response.message.text) });
  // Entry Perfection Phase 2 -- DELIBERATELY RESTATED. Was: the earlier reply appeared twice. Ids are canonical now; no text comparison anywhere.
  assert.deepEqual(agentTurns.map(t => t.id), ['server-reply-1', 'server-reply-2']);
});

// ------------------------------------------------------------------ H6 -- client timeout shorter than the backend budget
test('H6 resolved at the UI boundary: long operations wait longer, and a timeout is an UNKNOWN outcome, never "nothing was added"', async () => {
  const source = await readFile('src/api/securepay/http/index.ts', 'utf8');
  assert.match(source, /options\.timeoutMs \?\? timeoutMs/);
  const agentGateway = await readFile('src/api/securepay/agent/index.ts', 'utf8');
  assert.match(agentGateway, /LONG_OPERATION_TIMEOUT_MS = 45_000/);
  const http = api.createHttpClient('https://api.example', async () => null, (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }), 60_000);
  await assert.rejects(http.request('/api/agent/conversations', { method: 'POST', body: {}, auth: 'optional', timeoutMs: 20 }), error => error.kind === 'timeout');
  const shown = api.sourceIngestionErrorText(new api.ApiError('timeout', 'SecurePay request timed out'));
  record('U-H6', 'Client timeout vs backend processing budget', { defaultTimeoutMs: 15000, longOperationTimeoutMs: 45000, textShownOnSourceTimeout: shown });
  // Entry Perfection Phase 2 -- DELIBERATELY RESTATED. Was: "Nothing from it has been added" -- false when the server finished. Phase 9 owns the real budget (UR-241).
  assert.doesNotMatch(shown, /Nothing from it has been added/);
  assert.match(shown, /couldn’t confirm whether it read this/);
});

// ------------------------------------------------------------------ H4 -- stuck pending turn
test('H4 resolved: a lost turn response is reconciled with the SAME clientTurnId and shows the real reply', async () => {
  let attempt = 0;
  const bodies = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: async (_id, body) => {
      attempt += 1; bodies.push(body);
      if (attempt === 1) throw new api.ApiError('timeout', 'SecurePay request timed out'); // the backend DID process it
      if (attempt === 2) throw new api.ApiError('http', 'still working', 409, 'AGENT_TURN_IN_PROGRESS');
      return { message: 'Who is doing the tiling?', replyId: 'reply-1' }; // the backend returns the ORIGINAL reply
    },
    readContext: async () => context(),
    conversationHistory: async () => ({ entries: [] }),
  };
  const agent = api.createAgentController(gateway, (() => { let n = 0; return () => `local-${++n}`; })(), { sleep: async () => {} });
  await agent.send('I need my bathroom tiled for 45,000');
  const agentTexts = agent.getSnapshot().turns.filter(t => t.sender === 'agent').map(t => t.response.message.text);
  record('U-H4', 'Turn response lost after the backend committed it', { submitAttempts: attempt, sameClientTurnId: new Set(bodies.map(b => b.clientTurnId)).size === 1, ks001TextAfterReconcile: agentTexts, error: agent.getSnapshot().error });
  // Entry Perfection Phase 2 -- DELIBERATELY RESTATED. Was: pending forever until a manual Retry that showed "This has already been processed."
  assert.equal(new Set(bodies.map(b => b.clientTurnId)).size, 1);
  assert.deepEqual(agentTexts, ['Who is doing the tiling?']);
  assert.equal(agent.getSnapshot().pending, null);
  assert.equal(agent.getSnapshot().error, null);
});

test('H4: if SecurePay is still working after every check, the message stays pending and the action is "Check again", never "failed"', async () => {
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: async () => { throw new api.ApiError('http', 'still working', 409, 'AGENT_TURN_IN_PROGRESS'); },
    readContext: async () => context(), conversationHistory: async () => ({ entries: [] }),
  };
  const agent = api.createAgentController(gateway, () => 'id', { sleep: async () => {}, turnReconcileScheduleMs: [1, 1] });
  await agent.send('hello');
  const snap = agent.getSnapshot();
  assert.ok(snap.pending);
  assert.equal(snap.outcomeUnknown, true);
  assert.equal(api.retryLabel(snap.pending, snap.outcomeUnknown), 'Check again');
  assert.match(snap.error, /still working on your message/);
});

// ------------------------------------------------------------------ status vocabulary
test('every backend source status has one shared UI meaning (Phase 2 contract)', () => {
  const outcomes = Object.fromEntries(['RECEIVED', 'PROCESSING', 'READY', 'PARTIAL', 'FAILED', 'REMOVED'].map(status => [status, api.sourceOutcome({ extractionStatus: status, uncertainties: [] })]));
  record('U-STATUS', 'Source status contract', { outcomes });
  assert.deepEqual(outcomes, { RECEIVED: 'working', PROCESSING: 'working', READY: 'progressed', PARTIAL: 'attention', FAILED: 'failed', REMOVED: 'inactive' });
  assert.equal(api.sourceOutcome({ extractionStatus: 'READY', uncertainties: ['x'] }), 'attention');
  assert.equal(api.sourceOutcome({ extractionStatus: 'SOMETHING_NEW', uncertainties: [] }), 'failed', 'an unknown status is never success');
});
