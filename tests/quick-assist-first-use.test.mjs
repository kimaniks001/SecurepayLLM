import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const assist = source('src/features/living-workspace/QuickSupportPanel.tsx');
const unified = source('src/features/ks001-assist/assistContract.mjs');
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
  assert.match(unified, /Do not access my location, unrelated Agreements/);
  assert.match(unified, /If authorised, source-verified listings or quotes are unavailable/);
});

test('Quick Assist uses the Store service discovery gateway, not another marketplace', () => {
  assert.match(assist, /Find published offers in Stores/);
  assert.match(workspace, /onFindStoreOffers=\{\(service,requestedTask\)=>/);
  assert.match(workspace, /setActiveTool\('Stores'\)/);
  assert.match(stores, /initialServiceQuery \? 'SERVICE' : 'PRODUCT'/);
  assert.match(stores, /const \[showSamples,setShowSamples\]=useState\(Boolean\(onLocalProposal\)\|\|!initialServiceQuery\)/);
  assert.match(stores, /await gateways\.stores\.search\(/, 'Real service discovery remains on the original gateway when not in preview');
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
  assert.match(assist, /cannot yet verify live ShortStays, My Ride or physical Storage availability/);
  assert.ok(!assist.includes('fetch('));
  assert.ok(!assist.includes('localStorage'));
});

test('Storage is a separate physical space service door, not a Digital Store search alias', () => {
  assert.match(assist, /id: 'storage'/);
  assert.match(assist, /Find space for belongings or vehicles/);
  assert.match(assist, /selected === 'storage'/);
  assert.match(assist, /selected === 'stays' \|\| selected === 'ride'/);
  assert.match(unified, /Digital Stores are a different product from physical Storage/);
});
