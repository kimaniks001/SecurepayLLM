import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 5 -- Understanding & Evidence (UI half). The person should be able to see what SecurePay
// understood from their material, which parts are SecurePay's reading rather than something stated, what is NOT included,
// what is materially uncertain, and where their details disagree -- without raw confidence scores, extraction JSON or
// internal ids.
const bundle = await build({ stdin: { contents: `
export { tradeContextView, sourceArtifactView, conflictsView } from './src/api/securepay/agent/adapters';
export { projectWorkbench } from './src/features/workbench/projection';
export { UnderstoodWorkbench } from './src/features/workbench/UnderstoodWorkbench';
export { sourceOutcome } from './src/features/sources/presentation';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const src = (name, locator, basis) => ({ sourceArtifactId: `s-${name}`, displayName: name, sourceKind: 'DOCUMENT', locator, removed: false, basis });
const pump = { id: 'p', type: 'SERVICE', name: 'Pump installation', state: 'CANDIDATE', confidence: 0.9, attributes: {}, source: src('minutes.pdf', 'p1', 'EXPLICIT') };
const fundi = { id: 'f', type: 'ORGANIZATION', name: 'Maji Bora', state: 'CANDIDATE', confidence: 0.9, attributes: {}, source: src('minutes.pdf', 'p1', 'EXPLICIT') };
const money = (id, q, source) => ({ id, kind: 'PAYMENT_CONDITION', subjectEntityId: 'p', qualifiers: q, state: 'CANDIDATE', confidence: 0.9, source });
const dto = {
  conversationId: 'c', version: 3, entities: [pump, fundi],
  relationships: [
    money('t1', { amount: '180000', currency: 'KES', moneyRole: 'total' }, src('minutes.pdf', 'p1', 'EXPLICIT')),
    money('t2', { amount: '175000', currency: 'KES', moneyRole: 'total' }, src('quotation.pdf', 'p1', 'EXPLICIT')),
    money('d', { amount: '60000', amountText: '60k', currency: 'KES', currencyBasis: 'inferred', moneyRole: 'deposit', when: 'on signing' }, src('minutes.pdf', 'p2', 'INFERRED')),
    { id: 'x', kind: 'RESPONSIBILITY', subjectEntityId: 'f', qualifiers: { task: 'transport of the pump', excluded: 'true' }, state: 'CANDIDATE', confidence: 0.9, source: src('minutes.pdf', 'p3', 'EXPLICIT') },
  ],
  interactionState: { discoveryInvitedEntityIds: [] },
  conflicts: [{ concept: 'the price', sides: [
    { value: 'KES 180,000', factId: 't1', state: 'CANDIDATE', source: src('minutes.pdf', 'p1', 'EXPLICIT') },
    { value: 'KES 175,000', factId: 't2', state: 'CANDIDATE', source: src('quotation.pdf', 'p1', 'EXPLICIT') }] }],
};

test('money reads as what it is -- role in words, an assumed currency said plainly, no raw bookkeeping', () => {
  const wb = api.projectWorkbench(api.tradeContextView(dto));
  const deposit = wb.items.find(i => i.key === 'money:d');
  assert.equal(deposit.value, 'KES 60,000');
  assert.deepEqual(deposit.details.slice(0, 1), ['Deposit']);
  assert.ok(deposit.details.includes('on signing'));
  assert.ok(deposit.details.includes('Currency assumed'));
  assert.ok(!deposit.details.some(d => /inferred|60k|deposit$/.test(d) && d !== 'Deposit'));
  assert.equal(wb.items.find(i => i.key === 'money:t1').details[0], 'Total price');
});

test("SecurePay's reading is marked as such, never as something the person said", () => {
  const wb = api.projectWorkbench(api.tradeContextView(dto));
  assert.equal(wb.items.find(i => i.key === 'money:d').inferred, true);
  assert.equal(wb.items.find(i => i.key === 'money:t1').inferred, undefined);
  const out = text(html(api.UnderstoodWorkbench, { state: stateWith(api.tradeContextView(dto)), controller: {}, activeSpec: null, onOpen() {}, onFind() {} }));
  assert.match(out, /SecurePay’s reading/);
});

test('a negation stays a negation: "not included" is never shown as an obligation', () => {
  const wb = api.projectWorkbench(api.tradeContextView(dto));
  const transport = wb.items.find(i => i.key === 'responsibility:x');
  assert.equal(transport.excluded, true);
  assert.match(transport.value, /^Not included for Maji Bora: transport of the pump$/);
  assert.doesNotMatch(transport.value, /true/);
});

test('disagreeing evidence shows both sides with where each came from, and asks the person to say which is right', () => {
  const out = text(html(api.UnderstoodWorkbench, { state: stateWith(api.tradeContextView(dto)), controller: {}, activeSpec: null, onOpen() {}, onFind() {} }));
  assert.match(out, /Your details disagree on the price: KES 180,000 \(minutes\.pdf\) and KES 175,000 \(quotation\.pdf\) ?\. Tell KS001 which is right\./);
  assert.doesNotMatch(out, /s-minutes|factId|t1|CANDIDATE|0\.9/);
});

test('an older server with no conflicts or basis still renders, with none shown', () => {
  const legacy = { ...dto, conflicts: undefined, relationships: dto.relationships.map(r => ({ ...r, source: { ...r.source, basis: undefined } })) };
  const wb = api.projectWorkbench(api.tradeContextView(legacy));
  assert.deepEqual(wb.conflicts, []);
  assert.ok(wb.items.every(i => !i.inferred));
  assert.deepEqual(api.conflictsView([{ concept: 'x', sides: [{ value: 'only one' }] }, 'junk', null]), []);
});

test('only MATERIAL uncertainty asks for the person, when the server says which is which', () => {
  const base = { sourceArtifactId: 's', conversationId: 'c', sourceKind: 'DOCUMENT', originalName: 'minutes.pdf', label: '', mediaType: 'application/pdf',
    byteSize: 1, documentType: 'Minutes', extractionStatus: 'READY', extractionGeneration: 1, summary: '', failureReason: '', createdAt: '', updatedAt: '' };
  const structured = api.sourceArtifactView({ ...base, uncertainties: ['Secretary surname unclear', 'Who pays transport?'],
    uncertaintyDetails: [{ kind: 'UNREADABLE', material: false, description: 'Secretary surname unclear', locator: 'p4' },
      { kind: 'CONFLICTING', material: true, description: 'Who pays transport?', locator: 'p3' }] });
  assert.deepEqual(structured.uncertainties, ['Who pays transport?']);
  assert.deepEqual(structured.materialUncertainties, [{ kind: 'CONFLICTING', description: 'Who pays transport?' }]);
  const onlyMinor = api.sourceArtifactView({ ...base, uncertainties: ['Secretary surname unclear'],
    uncertaintyDetails: [{ kind: 'UNREADABLE', material: false, description: 'Secretary surname unclear', locator: 'p4' }] });
  assert.equal(api.sourceOutcome(onlyMinor), 'progressed');
  const legacy = api.sourceArtifactView({ ...base, uncertainties: ['Quantity unclear'] });
  assert.deepEqual(legacy.uncertainties, ['Quantity unclear']);
});

function stateWith(data) {
  return { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data, error: null }, source: null, offerSelectionFailure: null, offeredDiscoveryEntityIds: [] };
}
