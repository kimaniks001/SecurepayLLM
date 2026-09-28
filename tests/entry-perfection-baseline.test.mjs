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
// Classification: measurement harness. Tests named `baseline ...` pin what the UI does TODAY, as evidence. A later
// Entry Perfection phase that fixes a finding is expected to change that pin deliberately, with the reason -- never
// to delete the journey. Every run writes build/entry-perfection/ui-baseline.json.
const bundle = await build({ stdin: { contents: `
export { createSourceController, sourceIngestionErrorText } from './src/features/sources/controller';
export { sourceStatusText } from './src/features/sources/presentation';
export { createAgentController, errorText } from './src/features/agent/controller';
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
test('baseline H1: a FAILED artifact (HTTP 201) is reported to callers as ok:true and triggers the "ingested" continuation', async () => {
  let ingested = 0;
  const failed = artifact({ extractionStatus: 'FAILED', failureReason: 'SecurePay received this, but couldn’t read it right now. Nothing from it has been added to this conversation.' });
  const controller = api.createSourceController({ uploadSource: async () => failed, createPastedTextSource: async () => failed }, async () => 'conv-1', { onSourceIngested: () => { ingested += 1; } });
  const upload = await controller.addUpload('DOCUMENT', file());
  const paste = await controller.addPastedText('minutes text');
  record('U-H1', 'FAILED source artifact returned with HTTP 201', {
    uploadOutcomeOk: upload.ok, pasteOutcomeOk: paste.ok, onSourceIngestedCalls: ingested,
    controllerPhase: controller.getSnapshot().phase, cardStatusText: api.sourceStatusText(controller.getSnapshot().sources[0]),
    bringPlanPanelClosesOnOk: true,
  });
  // H1 (confirmed): callers see success -- the Bring-plan panel closes (AgentExperience: `if (outcome.ok) setBringPlanOpen(false)`),
  // and the "a source produced facts" continuation runs even though nothing was added. The FAILED card itself does
  // render its reason + Try again (SourceCard), so the failure is visible only where the source list is visible.
  assert.equal(upload.ok, true);
  assert.equal(paste.ok, true);
  assert.equal(ingested, 2);
  assert.equal(api.sourceStatusText(controller.getSnapshot().sources[0]), null, 'no status line for FAILED; the card shows failureReason instead');
});

// ------------------------------------------------------------------ H2 -- refresh discarded while busy
test('baseline H2: a source completing while the agent controller is busy has its refresh silently discarded', async () => {
  const calls = [];
  let releaseTurn;
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: () => new Promise(resolve => { releaseTurn = () => resolve({ message: 'Who is doing the work?' }); }),
    readContext: async () => { calls.push('readContext'); return context(); },
    conversationHistory: async () => { calls.push('history'); return { entries: [{ id: 'reply-src', sender: 'KS001', text: 'I’ve pulled 11 details from minutes.pdf into BUILD.', occurredAt: '2026-10-01T00:00:01Z' }] }; },
  };
  const agent = api.createAgentController(gateway, (() => { let n = 0; return () => `local-${++n}`; })());
  const sending = agent.send('I need the borehole pump replaced');
  await new Promise(r => setTimeout(r, 0));
  assert.equal(agent.getSnapshot().busy, true);
  await agent.refreshAfterSourceIngestion(); // what onSourceIngested calls, while the turn is in flight
  const callsDuringBusy = [...calls];
  releaseTurn();
  await sending;
  const continuationShown = agent.getSnapshot().turns.some(turn => turn.sender === 'agent' && turn.response.message.text.startsWith('I’ve pulled'));
  record('U-H2', 'Source continuation refresh requested while a turn is in flight', {
    gatewayCallsMadeByRefresh: callsDuringBusy, continuationShownAfterTurn: continuationShown,
  });
  // H2 (confirmed): nothing is queued; the source's KS001 continuation stays invisible until some unrelated later refresh.
  assert.deepEqual(callsDuringBusy, []);
  assert.equal(continuationShown, false);
});

// ------------------------------------------------------------------ H5 -- transcript duplication
test('baseline H5 (new): after a live turn, a source refresh re-appends every earlier KS001 reply (local ids never match server ids)', async () => {
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: async () => ({ message: 'Who is doing the work?' }),
    readContext: async () => context(),
    conversationHistory: async () => ({ entries: [
      { id: 'server-human-1', sender: 'HUMAN', text: 'I need the borehole pump replaced', occurredAt: '2026-10-01T00:00:00Z' },
      { id: 'server-reply-1', sender: 'KS001', text: 'Who is doing the work?', occurredAt: '2026-10-01T00:00:01Z' },
      { id: 'server-reply-2', sender: 'KS001', text: 'I’ve pulled 11 details from minutes.pdf into BUILD.', occurredAt: '2026-10-01T00:00:02Z' },
    ] }),
  };
  const agent = api.createAgentController(gateway, (() => { let n = 0; return () => `local-${++n}`; })());
  await agent.send('I need the borehole pump replaced');
  await agent.refreshAfterSourceIngestion();
  const agentTexts = agent.getSnapshot().turns.filter(t => t.sender === 'agent').map(t => t.response.message.text);
  record('U-H5', 'Source refresh after a live KS001 turn', { ks001TurnsShown: agentTexts });
  assert.deepEqual(agentTexts, ['Who is doing the work?', 'Who is doing the work?', 'I’ve pulled 11 details from minutes.pdf into BUILD.']);
});

// ------------------------------------------------------------------ H6 -- client timeout shorter than the backend budget
test('baseline H6 (new): every request aborts at 15s, shorter than one source-understanding call (30s read) or one turn (up to 4 model calls x 20s)', async () => {
  const source = await readFile('src/api/securepay/http/index.ts', 'utf8');
  assert.match(source, /timeoutMs = 15000/);
  const index = await readFile('src/api/securepay/index.ts', 'utf8');
  assert.match(index, /createHttpClient\(validatedBaseUrl, getAccessToken, fetcher\)/, 'no per-call override exists for sources or turns');
  // Prove the client really aborts, with a fake fetch that honours the abort signal and a short timeout.
  const http = api.createHttpClient('https://api.example', async () => null, (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }), 20);
  await assert.rejects(http.request('/api/agent/conversations', { method: 'POST', body: {}, auth: 'optional' }), error => error.kind === 'timeout');
  const shown = api.sourceIngestionErrorText(new api.ApiError('timeout', 'SecurePay request timed out'));
  record('U-H6', 'Client timeout vs backend processing budget', {
    clientTimeoutMs: 15000, sourceUnderstandingReadTimeoutMs: 30000, sourceUnderstandingConnectTimeoutMs: 5000,
    turnModelReadTimeoutMs: 20000, maxModelCallsPerTurn: 4, textShownOnSourceTimeout: shown,
  });
  // The backend keeps going after the client gives up, so this copy can be FALSE: the source may finish, apply facts
  // and record KS001's continuation -- while the person was told "Nothing from it has been added".
  assert.equal(shown, 'SecurePay received this, but couldn’t read it right now. Nothing from it has been added to this conversation.');
});

// ------------------------------------------------------------------ H4 -- stuck pending turn
test('baseline H4: a lost turn response keeps the message pending, blocks new messages, and Retry shows the replay text, not the reply', async () => {
  let attempt = 0;
  const gateway = {
    createConversation: async () => ({ conversationId: 'conv-1' }),
    submitTurn: async () => {
      attempt += 1;
      if (attempt === 1) throw new api.ApiError('timeout', 'SecurePay request timed out'); // backend DID process it
      return { message: 'This has already been processed.' };
    },
    readContext: async () => context(),
    conversationHistory: async () => ({ entries: [] }),
  };
  const agent = api.createAgentController(gateway, (() => { let n = 0; return () => `local-${++n}`; })());
  await agent.send('I need my bathroom tiled for 45,000');
  const afterFailure = agent.getSnapshot();
  await agent.send('It is in Kileleshwa'); // the person keeps typing
  const secondAccepted = agent.getSnapshot().turns.some(t => t.sender === 'user' && t.text === 'It is in Kileleshwa');
  await agent.retry();
  const agentTexts = agent.getSnapshot().turns.filter(t => t.sender === 'agent').map(t => t.response.message.text);
  record('U-H4', 'Turn response lost after the backend committed it', {
    errorShown: afterFailure.error, pendingRetained: afterFailure.pending !== null, laterMessageAccepted: secondAccepted,
    submitAttempts: attempt, ks001TextAfterRetry: agentTexts,
  });
  assert.equal(afterFailure.pending !== null, true);
  assert.equal(secondAccepted, false, 'send() silently ignores new text while a pending turn exists');
  assert.deepEqual(agentTexts, ['This has already been processed.']);
});

// ------------------------------------------------------------------ status vocabulary
test('baseline: every backend source status has one UI meaning (FAILED/REMOVED have no status line; the card handles them)', () => {
  const texts = Object.fromEntries(['RECEIVED', 'PROCESSING', 'READY', 'PARTIAL', 'FAILED', 'REMOVED'].map(status => [status, api.sourceStatusText({ extractionStatus: status })]));
  record('U-STATUS', 'Source status vocabulary as shown', { texts });
  // RECEIVED/PROCESSING can never actually be observed by the UI today: the pipeline is synchronous, so the create
  // call returns only after READY/PARTIAL/FAILED. The only in-flight signal is the controller's 'submitting' phase.
  assert.deepEqual(texts, { RECEIVED: 'Received', PROCESSING: 'Reading this…', READY: 'Read — suggestions to check', PARTIAL: 'Partly read — suggestions to check', FAILED: null, REMOVED: null });
});
