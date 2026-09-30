import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// User-Ready Beta Gate 1 Phase 1.6 -- Blocker 5 (an excluded thing marked on the item itself) and Blocker 6 (a responsibility
// with no description), from real claude-sonnet-5 shapes captured in the funded run. Before this, both fell out of the
// panel: the exclusions appeared under "Also understood" / "What we're making happen", and the responsibility was dropped.
const bundle = await build({ stdin: { contents: `
export { tradeContextView } from './src/api/securepay/agent/adapters';
export { projectWorkbench, isExcludedEntity, excludedThingName } from './src/features/workbench/projection';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

const entity = (id, type, name, attributes = {}) => ({ id, type, name, state: 'CANDIDATE', confidence: 0.9, attributes, source: null });
const rel = (id, kind, subjectEntityId, objectEntityId, qualifiers = {}) =>
  ({ id, kind, subjectEntityId, objectEntityId, qualifiers, state: 'CANDIDATE', confidence: 0.9, source: null });
const project = (entities, relationships) => api.projectWorkbench(api.tradeContextView({
  conversationId: 'c', version: 1, entities, relationships, interactionState: { discoveryInvitedEntityIds: [] }, conflicts: [] }));
const bySection = (wb, section) => wb.items.filter(i => i.section === section).map(i => i.value);

test('Blocker 5 -- live large paste: CONCEPT "Drinks excluded" {excluded} reads as Not included, never "Also understood"', () => {
  const wb = project([entity('v', 'CONCEPT', 'Drinks excluded', { excluded: 'true' }), entity('t', 'CONCEPT', 'Tables, chairs, tent excluded', { excluded: 'true' }),
    entity('s', 'SERVICE', 'Buffet lunch for 80 guests')], []);
  assert.deepEqual(bySection(wb, 'responsibilities'), ['Not included: Drinks', 'Not included: Tables, chairs, tent']);
  assert.ok(!bySection(wb, 'other').some(v => /Drinks|Tables/.test(v)));
  assert.ok(wb.items.filter(i => i.excluded).length === 2);
});

test('Blocker 5 -- Q05: ITEM "Tiles" / SERVICE "Transport of rubble" marked excluded are not "what we are making"', () => {
  const wb = project([entity('r', 'SERVICE', 'Bathroom retiling'), entity('t', 'ITEM', 'Tiles', { excluded: 'true', note: 'customer to buy and deliver' }),
    entity('x', 'SERVICE', 'Transport of rubble', { excluded: 'true' }), entity('a', 'PERSON', 'Mrs Akinyi')],
    [rel('c1', 'CONDITION', 'a', 't'), rel('c2', 'CONDITION', 'r', 'x', { note: 'VAT excluded' })]);
  assert.deepEqual(bySection(wb, 'what'), ['Bathroom retiling']);
  const tiles = wb.items.find(i => i.value === 'Not included: Tiles');
  assert.ok(tiles && tiles.details.includes('customer to buy and deliver'));
  assert.ok(wb.items.some(i => i.value === 'Not included: Transport of rubble'));
});

test('Blocker 5 -- only the explicit marker counts: negative wording alone is never an exclusion', () => {
  assert.equal(api.isExcludedEntity({ note: 'VAT excluded' }), false);
  assert.equal(api.isExcludedEntity({ excluded: 'false' }), false);
  assert.equal(api.isExcludedEntity({ notIncluded: 'yes' }), true);
  assert.equal(api.excludedThingName('Drinks excluded'), 'Drinks');
  assert.equal(api.excludedThingName('Tiles (not included)'), 'Tiles');
  assert.equal(api.excludedThingName('Excluded costs list'), 'Excluded costs list');
});

test('Blocker 6 -- M01: Maji Bora --RESPONSIBILITY{}--> ITEM pump is shown, named by the work', () => {
  const wb = project([entity('m', 'ORGANIZATION', 'Maji Bora Drillers Ltd'), entity('p', 'ITEM', '1.5 HP submersible pump')],
    [rel('r', 'RESPONSIBILITY', 'm', 'p')]);
  assert.deepEqual(bySection(wb, 'responsibilities'), ['Maji Bora Drillers Ltd: 1.5 HP submersible pump']);
});

test('Blocker 6 -- no work and no description: nothing is invented', () => {
  const wb = project([entity('m', 'ORGANIZATION', 'Maji Bora Drillers Ltd'), entity('g', 'PERSON', 'Grace Achieng')], [rel('r', 'RESPONSIBILITY', 'm', 'g')]);
  assert.deepEqual(bySection(wb, 'responsibilities'), []);
});

test('Phase 1.6 (C) -- provenance markers are never shown as details; the evidenced task names the duty', () => {
  const wb = project([entity('m', 'ORGANIZATION', 'Maji Bora Drillers Ltd'), entity('p', 'ITEM', '1.5 HP submersible pump'),
    entity('t', 'MONEY', 'KES 75,000', { amount: '75000', currency: 'KES', amountText: 'KES 75,000', amountReadFrom: 'name' })],
    [rel('r', 'RESPONSIBILITY', 'm', 'p', { task: 'supply and install a new 1.5 HP submersible pump', taskFrom: 'excerpt' })]);
  assert.deepEqual(bySection(wb, 'responsibilities'), ['Maji Bora Drillers Ltd: supply and install a new 1.5 HP submersible pump']);
  assert.ok(!wb.items.some(i => (i.details ?? []).some(d => /read from|amountReadFrom|taskFrom/i.test(JSON.stringify(d)))));
});

test('Phase 1.8 (A02) -- every accepted explicit exclusion marker converges; wording alone never does', () => {
  for (const m of [{ negated: 'true' }, { excluded: 'y' }, { isExcluded: '1' }, { notIncluded: 'yes' }]) assert.equal(api.isExcludedEntity(m), true, JSON.stringify(m));
  assert.equal(api.isExcludedEntity({ note: "you'll buy the paint" }), false);
});

// Phase 1.8B -- the exclusion carried by a CONDITION relationship, exactly as captured live (claude-sonnet-5, Phase 1.8A). Before
// this the panel listed it as a completion condition ("paint not supplied by Brian"), never as "Not included".
test('Phase 1.8B -- A02 captured: ITEM Paint --CONDITION{excluded}--> (nothing) reads "Not included: Paint"', () => {
  const wb = project([entity('s', 'SERVICE', 'Interior painting of 3-bedroom house, two coats', { scope: 'walls and ceilings' }),
    entity('p', 'ITEM', 'Paint', { suppliedBy: 'customer' })],
    [rel('c', 'CONDITION', 'p', null, { note: 'paint not supplied by Brian', excluded: 'true' })]);
  const paint = wb.items.find(i => i.value === 'Not included: Paint');
  assert.ok(paint && paint.excluded && paint.details.includes('paint not supplied by Brian'));
  assert.ok(!wb.items.some(i => i.section === 'completion'));
});

test('Phase 1.8B -- C02 captured: ITEM Tiles --CONDITION{excluded}--> SERVICE names the tiles, never the work', () => {
  const wb = project([entity('s', 'SERVICE', "Tiling mum's bathroom"), entity('t', 'ITEM', 'Tiles')],
    [rel('c', 'CONDITION', 't', 's', { excluded: 'true', note: 'buyer purchases tiles', providedBy: 'buyer' })]);
  assert.ok(wb.items.some(i => i.value === 'Not included: Tiles' && i.excluded));
  assert.ok(!wb.items.some(i => /Not included: Tiling/.test(i.value)));
});

test('Phase 1.8B -- the Phase 1.4 direction (work --CONDITION{excluded}--> thing) and a plain condition are unchanged in kind', () => {
  const wb = project([entity('s', 'SERVICE', 'Bathroom tiling'), entity('t', 'ITEM', 'Tiles')],
    [rel('c', 'CONDITION', 's', 't', { suppliedBy: 'customer', excluded: 'true' }), rel('d', 'CONDITION', 's', null, { note: 'after inspection' })]);
  assert.ok(wb.items.some(i => i.value === 'Not included: Tiles'));
  assert.deepEqual(bySection(wb, 'completion'), ['after inspection']);
});
