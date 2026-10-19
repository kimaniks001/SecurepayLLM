import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const assist = source('src/features/living-workspace/QuickSupportPanel.tsx');
const workspace = source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const stores = source('src/features/living-workspace/StoresTool.tsx');
const personas = source('src/features/living-workspace/personas.ts');

test('Quick Assist shows Short Stays and My Ride with Add a tool, not a giant app directory', () => {
  for (const label of ['Short Stays', 'My Ride', 'Add a tool']) assert.ok(assist.includes(label));
  assert.match(workspace, /useState<QuickAssistId\[\]>\(\['stays', 'ride'\]\)/);
  assert.match(assist, /services\.filter\(service => collection\.includes\(service\.id\)\)/);
});

test('Adding a tool is distinct from use-once and removing it', () => {
  assert.match(assist, /Use once/);
  assert.match(assist, /Add to my tools/);
  assert.match(assist, /Keep this tool/);
  assert.match(assist, /onCollectionChange\(collection\.filter\(value => value !== id\)\)/);
  assert.match(assist, /does not grant it any authority/);
});

test('A stay or ride requires explicit preparation, with no booking authority', () => {
  assert.match(assist, /request\.trim\(\)/);
  assert.match(assist, /Continue with KS001/);
  assert.match(assist, /Prepare this request/);
  assert.match(assist, /No booking or payment is made/);
  assert.match(assist, /Do not share my device location, read unrelated Agreements/);
  assert.match(assist, /Do not invent availability, verified providers, prices or bookings/);
});

test('Quick Assist uses the Store service discovery gateway, not another marketplace', () => {
  assert.match(assist, /Find published offers in Stores/);
  assert.match(workspace, /onFindStoreOffers=\{\(service,requestedTask\)=>/);
  assert.match(workspace, /setActiveTool\('Stores'\)/);
  assert.match(stores, /initialServiceQuery \? 'SERVICE' : 'PRODUCT'/);
  assert.match(stores, /const \[showSamples,setShowSamples\]=useState\(!initialServiceQuery\)/);
  assert.match(stores, /await gateways\.stores\.search\(/);
  assert.match(stores, /Store offers/);
});

test('Store Quick Contract remains a seller-side draft aid; not a completed booking', () => {
  assert.match(stores, /id:'contract',label:'Quick Contract'/);
  assert.match(stores, /Do not claim that a quote, contract, savings arrangement or booking has been created/);
  assert.match(stores, /A listing is not a booking/);
});

test('KS001 suggestions identify service intent before generic Places/Documents', () => {
  const support = personas.indexOf("tool:'Quick Assist'");
  const places = personas.indexOf("tool:'Places'");
  const documents = personas.indexOf("tool:'Documents'");
  assert.ok(support >= 0 && support < places && support < documents);
  assert.match(workspace, /openToolPicker/);
  assert.match(workspace, /activeTool==='Quick Assist'\?<QuickSupportPanel/);
  assert.doesNotMatch(workspace, /setMessages\(/, 'No locally invented KS001 turns');
});

test('Preview isolation remains; Store baseline does not acquire any payment or booking action', () => {
  assert.match(workspace, /Agreements, invitations and Money require your review and authorisation/);
  assert.match(assist, /cannot search live provider availability, dispatch transport, reserve accommodation or make payment/);
  assert.ok(!assist.includes('fetch('));
  assert.ok(!assist.includes('localStorage'));
});
