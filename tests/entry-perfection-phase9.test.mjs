import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 9 -- Speed, Resilience & Recovery (UI half): a read interrupted by a restart is a recoverable failure,
// never "reading" forever; a reload follows a still-reading source to its true end without re-submitting; Review says what is
// still being read; "Not this person" is version-pinned; unsent words survive in-app navigation and die with sign-out; offline
// never submits; signing in never silently takes over a tab's anonymous conversation.
const bundle = await build({ stdin: { contents: `
export { sourceArtifactView, STALLED_TEXT } from './src/api/securepay/agent/adapters';
export { sourceOutcome, sourceStatusText } from './src/features/sources/presentation';
export { createSourceController } from './src/features/sources/controller';
export { agreementFormationView } from './src/features/formation/view';
export { createFormationController } from './src/features/formation/controller';
export { AgreementReview } from './src/features/formation/AgreementReview';
export { ContinuityChoice } from './src/features/agent/ContinuityChoice';
export { readDraft, writeDraft, clearComposerDrafts } from './src/features/conversation/drafts';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const source = (over = {}) => ({ sourceArtifactId: 's1', conversationId: 'c', sourceKind: 'PASTED_TEXT', originalName: 'quotation.pdf', label: 'quotation.pdf',
  mediaType: 'text/plain', byteSize: 10, documentType: '', extractionStatus: 'PROCESSING', extractionGeneration: 1, summary: '', uncertainties: [],
  failureReason: '', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over });

test('a stalled read (e.g. a restart) is a recoverable failure with the file kept -- never "reading" forever', () => {
  const stalled = api.sourceArtifactView(source({ stalled: true }));
  assert.equal(api.sourceOutcome(stalled), 'failed');
  assert.equal(stalled.failureReason, api.STALLED_TEXT);
  assert.match(api.STALLED_TEXT, /Your file is still here — try again\./);
  assert.equal(api.sourceStatusText(stalled), null);
  assert.equal(api.sourceOutcome(api.sourceArtifactView(source())), 'working');
});

test('after a reload a still-reading source is followed to its true end -- never re-submitted, reconciled once', async () => {
  const calls = [];
  let reads = 0;
  const gateway = {
    async listSources() { return { sources: [source()] }; },
    async getSource() { reads++; return reads < 2 ? source() : source({ extractionStatus: 'READY' }); },
    async createPastedTextSource() { calls.push('create'); }, async uploadSource() { calls.push('upload'); }, async retrySource() { calls.push('retry'); },
    async removeSource() {},
  };
  const ingested = [];
  const c = api.createSourceController(gateway, async () => 'c', { onSourceIngested: s => ingested.push(s.sourceArtifactId) },
    { sleep: async () => {}, pollScheduleMs: [1, 1, 1] });
  await c.list('c');
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(calls, [], 'nothing is re-submitted');
  assert.equal(c.getSnapshot().sources[0].extractionStatus, 'READY');
  assert.deepEqual(ingested, ['s1']);
});

const formation = (over = {}) => ({ conversationId: 'c', version: 5, digest: 'd5', stage: 'UNDERSTOOD', reviewable: true, confirmable: false,
  confirmationBlockedReason: 'Still reading quotation.pdf — you can review what I have so far, and set it up once I’ve finished.',
  summary: 'Supply and install a pump.', what: [], money: [], when: [], responsibilities: [], conditions: [], notIncluded: [], origin: null, openPoints: [],
  who: [{ key: 'who:kamau', name: 'Kamau Njoroge', role: null, identity: 'VERIFIED', ksNumber: 'KS000123', evidence: [] },
    { key: 'who:wanjiru', name: 'Wanjiru', role: null, identity: 'DESCRIBED', describedAs: 'as you described', evidence: [] }],
  question: { ask: false, reason: 'STILL_READING' }, readingSources: ['quotation.pdf'], ...over });

test('Review says what is still being read, and offers "Not this person" only for a linked party', () => {
  const out = text(api.renderToStaticMarkup(api.createElement(api.AgreementReview, { formation: api.agreementFormationView(formation()), changes: [],
    busy: false, checking: null, error: null, onBack() {}, onCheck() {}, onCorrect() {}, onSetUp() {}, onAcknowledgeChanges() {}, setUp: null, onUnlink() {} })));
  assert.match(out, /Still reading quotation\.pdf — you can review what I have so far\./);
  assert.equal((out.match(/Not this person/g) || []).length, 1);
  assert.match(out, /Set this up securely Still reading quotation\.pdf/);
});

test('"Not this person" is pinned to the version on screen', async () => {
  const sent = [];
  const c = api.createFormationController({ async readAgreementFormation() { return formation(); }, async checkOpenPoint() { return formation(); },
    async unlinkParty(id, key, version) { sent.push([id, key, version]); return formation({ version: 6, who: [] }); } });
  await c.load('c');
  await c.unlink('c', 'who:kamau');
  assert.deepEqual(sent, [['c', 'who:kamau', 5]]);
  assert.equal(c.getSnapshot().data.version, 6);
});

test('unsent words survive in-app navigation (in memory only) and are forgotten on sign-out / start fresh', () => {
  api.writeDraft('c1', 'Kamau will tile');
  assert.equal(api.readDraft('c1'), 'Kamau will tile');
  assert.equal(api.readDraft('c2'), '');
  api.clearComposerDrafts();
  assert.equal(api.readDraft('c1'), '');
});

test('signing in never silently takes over the tab: an explicit continue-or-start-fresh choice, offline never submits', async () => {
  const card = text(api.renderToStaticMarkup(api.createElement(api.ContinuityChoice, { busy: false, onContinue() {}, onStartFresh() {} })));
  assert.match(card, /Continue with the agreement you started in this tab\? .* Continue with it Start fresh/);
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /const continueConversationAfterJoin = async \(\): Promise<ContinuationOutcome> => \(\{ kind: 'none' \}\);/);
  assert.match(agent, /await gateway\.saveBuild\(resumableAnonymous\); \/\/ the ONE claim/);
  assert.match(agent, /clearComposerDrafts\(\);/);
  const surface = await readFile('src/features/conversation/ConversationSurface.tsx', 'utf8');
  assert.match(surface, /if \(isOffline\(\)\) \{ setOffline\(true\); return; \}/);
  assert.match(surface, /You’re offline\. Your message is kept here — send it when you’re back online\./);
});
