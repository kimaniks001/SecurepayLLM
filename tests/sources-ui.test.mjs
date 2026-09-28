import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// KS001 Upgrade Phase 3 (Bring what you already have) -- UI-level proof for the new source-ingestion
// surfaces: real production components, never a provider-JSON debug screen, never confidence decimals or
// provider/model names (Section 41/78).
const bundle = await build({ stdin: { contents: `
export { SourceCard, SourcesList } from './src/features/sources/ui/SourceCard';
export { AI_HANDOFF_PROMPT, BringPlanPanel } from './src/features/sources/ui/BringPlanPanel';
export { SourceMenu } from './src/features/sources/ui/SourceMenu';
export { DeclaredSourcePanel } from './src/features/sources/ui/DeclaredSourcePanel';
export { SignedOutHome, SecurePayHero } from './src/components/SignedOutHome';
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

// ---------------------------------------------------------------- KS001 Upgrade Phase 3 completion correction (item 9)
test('SourceCard: shows a bounded "N details found to check / N things need clarification" summary, never a debug screen', () => {
  const out = text(html(api.SourceCard, {
    source: source({ uncertainties: ['Quantity of tile adhesive is unclear.'] }), onRetry() {}, onRemove() {}, busy: false, factCount: 3,
  }));
  assert.match(out, /3 details found to check/);
  // Public Experience Convergence Phase 2 -- customer copy never names the internal BUILD workspace.
  assert.doesNotMatch(out, /BUILD/);
  assert.match(out, /1 thing needs clarification/);
});
test('SourceCard: a singular fact/uncertainty count uses singular wording', () => {
  const out = text(html(api.SourceCard, { source: source({ uncertainties: [] }), onRetry() {}, onRemove() {}, busy: false, factCount: 1 }));
  assert.match(out, /1 detail found to check/);
});
test('SourceCard: zero facts found is stated plainly, never silently omitted', () => {
  const out = text(html(api.SourceCard, { source: source({ uncertainties: [] }), onRetry() {}, onRemove() {}, busy: false, factCount: 0 }));
  assert.match(out, /Nothing useful found in this yet/);
  assert.doesNotMatch(out, /BUILD/);
});
test('SourceCard: an unknown factCount (caller has not computed it yet) shows no fabricated 0', () => {
  const out = text(html(api.SourceCard, { source: source({ uncertainties: [] }), onRetry() {}, onRemove() {}, busy: false }));
  assert.doesNotMatch(out, /found to check|Nothing useful found/);
});

test('SourceCard: a PROCESSING source shows a calm "reading" state, never a fake success', () => {
  const out = text(html(api.SourceCard, { source: source({ extractionStatus: 'PROCESSING', summary: '' }), onRetry() {}, onRemove() {}, busy: false }));
  assert.match(out, /Reading this…/);
  assert.doesNotMatch(out, /BUILD/);
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

// ---------------------------------------------------------------- SourceMenu (Public Experience Convergence Phase 3)
test('SourceMenu: one quiet "+" control, collapsed by default, with the real pickers already present', () => {
  // Collapsed by default -- the menu itself is one button until opened; the hidden file inputs exist
  // (real upload capability) even before the menu is opened.
  const raw = html(api.SourceMenu, { onPickDocument() {}, onPickPhoto() {}, onBringPlan() {} });
  assert.match(raw, /aria-label="Add a source"/);
  assert.match(raw, /aria-haspopup="menu"/);
  assert.match(raw, /aria-expanded="false"/);
  assert.doesNotMatch(raw, /role="menu"/);
  assert.match(raw, /type="file"/);
  assert.match(raw, /accept="[^"]*application\/pdf/);
  assert.match(raw, /accept="\.xlsx,application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet"/);
  assert.match(raw, /accept="image\/jpeg,image\/png"/);
  assert.match(raw, /accept="image\/jpeg,image\/png" capture="environment"/);
});

// ---------------------------------------------------------------- SignedOutHome (Section 36/37/39)
test('SignedOutHome: carries the exact Trust Community Phase 5 headline, supporting text, and trust line', () => {
  const out = text(html(api.SignedOutHome, { onStart() {} }));
  assert.ok(out.includes('Tell SecurePay what you’re trying to make happen.'));
  assert.ok(out.includes('It helps you bring the people, plans and agreements together so everyone knows what happens next — and money can follow what was agreed.'));
  assert.match(out, /Nothing becomes an agreement until you review and confirm it\./);
  assert.doesNotMatch(out, /Bring the plan\. Leave with an agreement\./);
});
test('SignedOutHome: intake-mode entries only render when their callback is actually wired -- never a dead control', () => {
  // Public Experience Convergence Phase 3 -- the intake is now the ONE shared "+" SourceMenu.
  const withoutIntake = html(api.SignedOutHome, { onStart() {} });
  assert.doesNotMatch(withoutIntake, /data-source-menu/);
  assert.doesNotMatch(withoutIntake, /Add what you have/);
  assert.doesNotMatch(withoutIntake, /type="file"/);
  const withIntake = html(api.SignedOutHome, { onStart() {}, onBringPlan() {}, onPickDocument() {}, onPickPhoto() {} });
  assert.match(withIntake, /data-source-menu/);
  assert.match(text(withIntake), /Add what you have/);
  assert.match(withIntake, /type="file"/);
});
test('the public hero says a KS Number is not required to start; the signed-in app hero does not repeat it (Trust Community Phase 5)', () => {
  const out = text(html(api.SecurePayHero, { onStart() {}, onBringPlan() {}, onPickDocument() {}, onPickPhoto() {}, variant: 'public' }));
  assert.match(out, /Start without a KS Number/);
  assert.doesNotMatch(text(html(api.SignedOutHome, { onStart() {} })), /Start without a KS Number/);
  assert.doesNotMatch(out, /sign in|log in/i, 'Home itself must never put a sign-in requirement in front of intake');
});

test('SourceMenu: nothing unwired renders -- no dead controls, no pickers without a handler', () => {
  assert.equal(html(api.SourceMenu, {}), '');
  const planOnly = html(api.SourceMenu, { onBringPlan() {} });
  assert.doesNotMatch(planOnly, /type="file"/);
});
test('SourceMenu: Voice note never renders without an approved transcriber (none exists), and no audio picker exists', () => {
  const raw = html(api.SourceMenu, { onPickDocument() {}, onPickPhoto() {}, onBringPlan() {}, onAddLink() {}, onAddPlace() {} });
  assert.doesNotMatch(raw, /audio\//);
  assert.doesNotMatch(raw, /Voice/);
});
test('DeclaredSourcePanel: a link is kept as typed and never opened; a place is words, never device location', () => {
  const link = text(html(api.DeclaredSourcePanel, { kind: 'link', busy: false, error: null, onSubmit() {}, onClose() {} }));
  assert.match(link, /Share a link/);
  assert.match(link, /never opens the page/);
  const place = text(html(api.DeclaredSourcePanel, { kind: 'place', busy: false, error: null, onSubmit() {}, onClose() {} }));
  assert.match(place, /in your own words/);
  assert.match(place, /doesn.t use your device location/);
  const raw = html(api.DeclaredSourcePanel, { kind: 'link', busy: false, error: null, onSubmit() {}, onClose() {} });
  assert.match(raw, /type="url"/);
  assert.match(raw, /min-h-11/);
});
test('SourceCard: a LINK shows the declared address as plain text (never a clickable anchor) with the honest note', () => {
  const raw = html(api.SourceCard, { source: source({ sourceKind: 'LINK', originalName: '', label: '', mediaType: 'text/plain', documentType: '', declaredText: 'https://supplier.example/quote', extractionStatus: 'FAILED', summary: '', failureReason: 'SecurePay received this, but couldn’t read it right now. Nothing from it has been added to this conversation.' }), onRetry() {}, onRemove() {}, busy: false });
  assert.doesNotMatch(raw, /<a /);
  assert.match(raw, /data-declared-link[^>]*>https:\/\/supplier\.example\/quote/);
  assert.match(text(raw), /Link you shared/);
  assert.match(text(raw), /SecurePay doesn.t open links/);
  assert.match(text(raw), /Try again/);
});
test('SourceCard: a PLACE is titled by the words typed and says SecurePay does not look it up', () => {
  const out = text(html(api.SourceCard, { source: source({ sourceKind: 'PLACE', originalName: '', label: '', mediaType: 'text/plain', documentType: '', declaredText: 'Westlands, Nairobi', extractionStatus: 'RECEIVED', summary: '' }), onRetry() {}, onRemove() {}, busy: false }));
  assert.match(out, /Westlands, Nairobi/);
  assert.match(out, /doesn.t look up locations/);
  assert.match(out, /Received/);
});
test('SourceCard: a spreadsheet is named as one and says values only; states are human words, never raw statuses', () => {
  const out = text(html(api.SourceCard, { source: source({ originalName: 'prices.xlsx', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extractionStatus: 'PARTIAL' }), onRetry() {}, onRemove() {}, busy: false }));
  assert.match(out, /Values only/);
  assert.match(out, /Partly read — suggestions to check/);
  assert.doesNotMatch(out, /\bPARTIAL\b|\bREADY\b|\bRECEIVED\b/);
});
test('SourceCard: the remove control is a real 44px touch target', () => {
  const raw = html(api.SourceCard, { source: source(), onRetry() {}, onRemove() {}, busy: false });
  assert.match(raw, /aria-label="Remove quotation\.pdf"[^>]*class="[^"]*w-11 h-11/);
});
