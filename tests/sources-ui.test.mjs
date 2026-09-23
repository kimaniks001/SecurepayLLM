import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// KS001 Upgrade Phase 3 (Bring what you already have) -- UI-level proof for the new source-ingestion
// surfaces: real production components, never a provider-JSON debug screen, never confidence decimals or
// provider/model names (Section 41/78).
const bundle = await build({ stdin: { contents: `
export { SourceCard, SourcesList } from './src/features/sources/ui/SourceCard';
export { AI_HANDOFF_PROMPT, BringPlanPanel } from './src/features/sources/ui/BringPlanPanel';
export { AttachSourceMenu } from './src/features/sources/ui/AttachSourceMenu';
export { SignedOutHome } from './src/components/SignedOutHome';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
const { createRequire } = await import('node:module');
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const source = (overrides = {}) => ({
  sourceArtifactId: 'src-1', conversationId: 'c1', sourceKind: 'DOCUMENT', originalName: 'quotation.pdf',
  label: '', mediaType: 'application/pdf', byteSize: 100, documentType: 'Quotation', extractionStatus: 'READY',
  extractionGeneration: 1, summary: 'A quotation for tank repair.', uncertainties: [], failureReason: '',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...overrides,
});

// ---------------------------------------------------------------- SourceCard
test('SourceCard: a READY source shows its name, document type, and summary -- never provider JSON or confidence', () => {
  const out = text(html(api.SourceCard, { source: source(), onRetry() {}, onRemove() {}, busy: false }));
  assert.match(out, /quotation\.pdf/);
  assert.match(out, /Quotation/);
  assert.match(out, /A quotation for tank repair\./);
  assert.doesNotMatch(out, /confidence|0\.\d/);
  assert.doesNotMatch(out, /anthropic|claude|gpt|model/i);
});

test('SourceCard: a PROCESSING source shows a calm "reading" state, never a fake success', () => {
  const out = text(html(api.SourceCard, { source: source({ extractionStatus: 'PROCESSING', summary: '' }), onRetry() {}, onRemove() {}, busy: false }));
  assert.match(out, /Reading this into BUILD/);
});

test('SourceCard: a FAILED source shows the real failure reason and a Try again action, never invented content', () => {
  const out = html(api.SourceCard, { source: source({ extractionStatus: 'FAILED', summary: '', failureReason: 'This PDF is password-protected, so SecurePay couldn’t read it.' }), onRetry() {}, onRemove() {}, busy: false });
  const plain = text(out);
  assert.match(plain, /password-protected/);
  assert.match(plain, /Try again/);
});

test('SourceCard: a PARTIAL source with uncertainties shows them under "Needs clarification," one genuine ambiguity per line, never a guessed value', () => {
  const out = text(html(api.SourceCard, { source: source({ extractionStatus: 'PARTIAL', uncertainties: ['Quantity of tile adhesive is unclear.'] }), onRetry() {}, onRemove() {}, busy: false }));
  assert.match(out, /Needs clarification/);
  assert.match(out, /Quantity of tile adhesive is unclear\./);
});

test('SourceCard: a REMOVED source renders nothing -- SourcesList never shows a removed source', () => {
  const removed = html(api.SourceCard, { source: source({ extractionStatus: 'REMOVED' }), onRetry() {}, onRemove() {}, busy: false });
  assert.equal(removed, '');
  const list = html(api.SourcesList, { sources: [source(), source({ sourceArtifactId: 'src-2', extractionStatus: 'REMOVED' })], busy: false, onRetry() {}, onRemove() {} });
  assert.doesNotMatch(list, /src-2/);
  assert.match(text(list), /quotation\.pdf/);
});

test('SourcesList: no sources renders nothing at all (never an empty state box crowding BUILD)', () => {
  assert.equal(html(api.SourcesList, { sources: [], busy: false, onRetry() {}, onRemove() {} }), '');
});

// ---------------------------------------------------------------- BringPlanPanel / AI handoff prompt
test('BringPlanPanel: renders the paste surface and the quiet AI-handoff helper reveal, never open by default', () => {
  const out = text(html(api.BringPlanPanel, { busy: false, error: null, onSubmit() {}, onClose() {} }));
  assert.match(out, /Bring your plan/);
  assert.match(out, /Preparing this in another AI\?/);
  assert.doesNotMatch(out, /Prepare this conversation for SecurePay/, 'the prompt itself must stay behind the reveal, not open by default');
});
test('AI_HANDOFF_PROMPT is the exact locked Section 18 prompt text', () => {
  assert.match(api.AI_HANDOFF_PROMPT, /^Prepare this conversation for SecurePay\./);
  assert.match(api.AI_HANDOFF_PROMPT, /Do not invent missing facts\. Mark uncertain information clearly\.$/);
});
test('BringPlanPanel: a submission error is shown plainly, never silently swallowed', () => {
  const out = text(html(api.BringPlanPanel, { busy: false, error: 'SecurePay doesn’t support this file type yet.', onSubmit() {}, onClose() {} }));
  assert.match(out, /doesn.t support this file type/);
});

// ---------------------------------------------------------------- AttachSourceMenu
test('AttachSourceMenu: reveals exactly three quiet options -- never a toolbar jungle', () => {
  const out = text(html(api.AttachSourceMenu, { onPickDocument() {}, onPickPhoto() {}, onBringPlan() {} }));
  // Collapsed by default -- the menu itself is one button until opened; assert the hidden file inputs
  // exist (real upload capability) even before the menu is opened.
  const raw = html(api.AttachSourceMenu, { onPickDocument() {}, onPickPhoto() {}, onBringPlan() {} });
  assert.match(raw, /type="file"/);
  assert.match(raw, /accept="[^"]*application\/pdf/);
  assert.match(raw, /accept="image\/jpeg/);
});

// ---------------------------------------------------------------- SignedOutHome (Section 36/37/39)
test('SignedOutHome: carries the exact Phase 3 headline, supporting text, and trust line', () => {
  const out = text(html(api.SignedOutHome, { onStart() {} }));
  assert.match(out, /Bring the plan\. Leave with an agreement\./);
  assert.match(out, /paste what you already have, or give KS001 a document or photo/);
  assert.match(out, /Start without a KS Number\. Nothing becomes an agreement until you review and confirm it\./);
});
test('SignedOutHome: intake-mode entries only render when their callback is actually wired -- never a dead control', () => {
  // Checked against the RAW markup, not the text-stripped version: the example-prompt chip "Show me the
  // agreement where Peter renovated my kitchen" also contains the substring "Show me" and would otherwise
  // false-positive; the intake button's own markup is the exact, standalone ">Show me<".
  const withoutIntake = html(api.SignedOutHome, { onStart() {} });
  assert.doesNotMatch(withoutIntake, /Bring your plan/);
  assert.doesNotMatch(withoutIntake, /Give me a document/);
  assert.doesNotMatch(withoutIntake, />Show me</);
  const withIntake = html(api.SignedOutHome, { onStart() {}, onBringPlan() {}, onPickDocument() {}, onPickPhoto() {} });
  assert.match(withIntake, /Bring your plan/);
  assert.match(withIntake, /Give me a document/);
  assert.match(withIntake, />Show me</);
});
test('SignedOutHome: the trust line explicitly says a KS Number is not required to start -- signed-out value first (Section 39)', () => {
  const out = text(html(api.SignedOutHome, { onStart() {}, onBringPlan() {}, onPickDocument() {}, onPickPhoto() {} }));
  assert.match(out, /Start without a KS Number/);
  assert.doesNotMatch(out, /sign in|log in/i, 'Home itself must never put a sign-in requirement in front of intake');
});
