import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

// User-Ready Beta Gate 1 Phase 1.10 -- the panel half of the Phase 1.9 P1 blockers, from captured claude-sonnet-5 shapes
// (tests/fixtures/phase110-*.json are the persisted Trade Contexts, trimmed to the fields the panel reads).
const bundle = await build({ stdin: { contents: `
export { tradeContextView } from './src/api/securepay/agent/adapters';
export { projectWorkbench } from './src/features/workbench/projection';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const project = dto => api.projectWorkbench(api.tradeContextView(dto));

const entity = (id, type, name, attributes = {}) => ({ id, type, name, state: 'CANDIDATE', confidence: 0.9, attributes, source: null });
const rel = (id, kind, subjectEntityId, objectEntityId, qualifiers = {}) =>
  ({ id, kind, subjectEntityId, objectEntityId, qualifiers, state: 'CANDIDATE', confidence: 0.9, source: null });
const dto = (entities, relationships) => ({ conversationId: 'c', version: 1, entities, relationships, interactionState: { discoveryInvitedEntityIds: [] }, conflicts: [] });

test('no-subject -- the captured long-paste understanding (a CONDITION with no subject) is readable; every valid fact survives', () => {
  const wb = project(fixture('phase110-no-subject-context.json'));
  const values = wb.items.map(i => i.value);
  assert.ok(values.some(v => /95,000/.test(v)), 'the price is shown');
  assert.ok(values.some(v => /tiling finished, area cleaned/i.test(v)), 'the subject-less condition is shown text-only, no invented subject');
});

test('no-subject -- one malformed relationship is omitted; the rest of the understanding stays usable', () => {
  const wb = project(dto([entity('w', 'SERVICE', 'Tiling'), entity('m', 'MONEY', 'KES 95,000', { amount: '95000', currency: 'KES' })], [
    rel('p', 'PAYMENT_CONDITION', 'w', 'm', { moneyRole: 'total', amount: '95000', currency: 'KES' }),
    { id: 'bad', kind: 'CONDITION', subjectEntityId: 42, objectEntityId: null, qualifiers: { note: 7 }, state: 'CANDIDATE', confidence: 0.9, source: null },
  ]));
  assert.ok(wb.items.some(i => i.value === 'Tiling'));
  assert.ok(wb.items.some(i => /95,000/.test(i.value)));
});

test('role-link -- live A: ITEM Tiles --ROLE{excluded}--> SERVICE reads "Not included: Tiles"', () => {
  const wb = project(fixture('phase110-live-a-role-exclusion-context.json'));
  assert.ok(wb.items.some(i => i.value === 'Not included: Tiles' && i.excluded));
  assert.ok(!wb.items.some(i => /Not included: Bathroom tiling/.test(i.value)));
});

test('role-link -- a role link without the explicit marker is not an exclusion', () => {
  const wb = project(dto([entity('w', 'SERVICE', 'Tiling'), entity('t', 'ITEM', 'Tiles')], [rel('r', 'ROLE', 't', 'w', { suppliedBy: 'buyer' })]));
  assert.ok(!wb.items.some(i => i.excluded));
});

test('M05 -- the main ordered item is never "Not included"; the thing the source excludes is named', () => {
  const wb = project(dto([
    entity('n', 'PERSON', 'Mama Neema (Neema Tailors)'),
    entity('s', 'ITEM', 'Full uniform set', { unit: 'set', quantity: '120', unitPrice: 'KES 1,850' }),
    entity('d', 'DATE_RANGE', 'by Friday 30 October 2026', { isoDate: '2026-10-30' }),
  ], [
    rel('o', 'RESPONSIBILITY', 'n', 's', { taskFrom: 'excerpt', task: 'Order: 120 full uniform sets' }),
    rel('del', 'DELIVERY', 'n', 'd', { location: 'school', taskFrom: 'excerpt', excluded_item: 'name labels', task: 'Delivery: by Friday 30 October 2026' }),
    rel('x', 'CONDITION', 's', null, { excluded: 'true' }),
  ]));
  assert.ok(!wb.items.some(i => i.value === 'Not included: Full uniform set'));
  assert.ok(wb.items.some(i => /^Not included: name labels$/i.test(i.value)));
  assert.ok(!wb.items.some(i => !i.excluded && i.details.some(d => /name labels/.test(d))), 'the named exclusion is not shown as an ordinary detail');
});

test('M05 -- both legitimate directions still name the thing; a non-primary subject-only exclusion (A02 Paint) still reads', () => {
  const a = project(dto([entity('w', 'SERVICE', 'Tiling'), entity('t', 'ITEM', 'Tiles')], [rel('c', 'CONDITION', 't', 'w', { excluded: 'true' })]));
  const b = project(dto([entity('w', 'SERVICE', 'Tiling'), entity('t', 'ITEM', 'Tiles')], [rel('c', 'CONDITION', 'w', 't', { excluded: 'true' })]));
  const p = project(dto([entity('w', 'SERVICE', 'Painting'), entity('p', 'ITEM', 'Paint', { suppliedBy: 'customer' })],
    [rel('c', 'CONDITION', 'p', null, { excluded: 'true', note: 'paint not supplied by Brian' })]));
  assert.ok(a.items.some(i => i.value === 'Not included: Tiles'));
  assert.ok(b.items.some(i => i.value === 'Not included: Tiles'));
  assert.ok(p.items.some(i => i.value === 'Not included: Paint'));
});
