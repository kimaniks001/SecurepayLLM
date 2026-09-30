import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// User-Ready Beta Gate 1 closure -- panel parity with the API's Review for the Phase 1.11 exclusion shapes (claude-sonnet-5):
// C02 "I buy the tiles" as PERSON "Client (you)" [ROLE buyer] --CONDITION{note}--> ITEM "Tiles"; Q06 a work's {excludes: "..."}.
const bundle = await build({ stdin: { contents: `
export { tradeContextView } from './src/api/securepay/agent/adapters';
export { projectWorkbench } from './src/features/workbench/projection';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const entity = (id, type, name, attributes = {}) => ({ id, type, name, state: 'CANDIDATE', confidence: 0.9, attributes, source: null });
const rel = (id, kind, subjectEntityId, objectEntityId, qualifiers = {}) =>
  ({ id, kind, subjectEntityId, objectEntityId, qualifiers, state: 'CANDIDATE', confidence: 0.9, source: null });
const project = (entities, relationships) => api.projectWorkbench(api.tradeContextView({
  conversationId: 'c', version: 1, entities, relationships, interactionState: { discoveryInvitedEntityIds: [] }, conflicts: [] }));

test('C02 -- the buyer supplies the tiles: "Not included: Tiles", you provide them', () => {
  const wb = project([entity('k', 'PERSON', 'Kamau'), entity('y', 'PERSON', 'Client (you)'), entity('w', 'SERVICE', "Tiling of mum's bathroom"),
    entity('t', 'ITEM', 'Tiles')],
  [rel('r1', 'ROLE', 'k', 'w', { role: 'provider' }), rel('r2', 'ROLE', 'y', 'w', { role: 'buyer' }), rel('c', 'CONDITION', 'y', 't', { note: 'client supplies tiles' })]);
  const tiles = wb.items.find(i => i.value === 'Not included: Tiles');
  assert.ok(tiles && tiles.excluded && tiles.details.includes("you'll provide this yourself"));
});

test('guards -- a plain purchase of goods, or the provider supplying an item, is never "Not included"', () => {
  const goods = project([entity('y', 'PERSON', 'You'), entity('f', 'ITEM', 'Used fridge')],
    [rel('r', 'ROLE', 'y', 'f', { role: 'buyer' }), rel('x', 'RESPONSIBILITY', 'y', 'f', { task: 'collect the fridge' })]);
  const provider = project([entity('b', 'PERSON', 'Brian'), entity('w', 'SERVICE', 'Painting'), entity('r', 'ITEM', 'Brushes and rollers')],
    [rel('r1', 'ROLE', 'b', 'w', { role: 'provider' }), rel('x', 'RESPONSIBILITY', 'b', 'r', { task: 'supplies brushes and rollers' })]);
  assert.ok(!goods.items.some(i => i.excluded));
  assert.ok(!provider.items.some(i => i.excluded));
});

test('Q06 -- a work\'s structured excludes-list reads "Not included: sink, taps, plumbing"', () => {
  const wb = project([entity('o', 'ORGANIZATION', 'Mbao Craft Kitchens'),
    entity('w', 'SERVICE', 'Kitchen cabinets, 3.2m run with island, supply and fit', { excludes: 'sink, taps, plumbing', includes: 'fitting' })],
  [rel('r', 'RESPONSIBILITY', 'o', 'w', { task: 'Does not include: sink, taps, plumbing', taskFrom: 'excerpt' })]);
  assert.ok(wb.items.some(i => i.value === 'Not included: sink, taps, plumbing' && i.excluded));
  assert.ok(!wb.items.some(i => !i.excluded && i.details.some(d => /sink, taps, plumbing/.test(d)) && i.section === 'what'),
    'the excludes-list is not shown as an ordinary detail of the work');
});
