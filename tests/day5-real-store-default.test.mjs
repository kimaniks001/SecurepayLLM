import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const tool = read('src/features/living-workspace/StoresTool.tsx');
const shell = read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const store = read('src/features/store/StoreExperience.tsx');
const runtime = read('src/RuntimeApp.tsx');

test('Day 5: live workspace defaults to real Store offers; demos must be explicitly selected', () => {
  assert.match(tool, /const \[showSamples,setShowSamples\]=useState\(Boolean\(onLocalProposal\)\);/);
  assert.doesNotMatch(tool, /Boolean\(onLocalProposal\)\|\|!initialServiceQuery/);
  assert.match(tool, /onClick=\{\(\)=>setShowSamples\(true\)\}/);
  assert.match(tool, /onClick=\{\(\)=>setShowSamples\(false\)\}/);
  assert.match(tool, /showSamples\?<StoreDemoExperience/);
  assert.match(tool, /Find real offers/);
});

test('Day 5: local-only preview can use examples but a live gateway can read actual Stores', () => {
  assert.match(shell, /onLocalProposal=\{uiOnlyPreview&&mode==='work'\?/);
  assert.match(shell, /gateways=\{workspaceGateways\} signedIn=\{signedIn&&!mockSignedIn\}/);
  assert.match(tool, /gateways\.stores\.search\(/);
  assert.match(tool, /gateways\.stores\.myOffers\(\)/);
  assert.match(tool, /gateways\.stores\.createOffer\(/);
});

test('Day 5: canonical Store source selection must remain available for next convergence slice', () => {
  assert.match(runtime, /const storeOfferRoute = useStoreOfferRoute\(\);/);
  assert.match(store, /sourceId: load\.offer\.id/);
  assert.match(store, /sourceOwnerKsNumber: load\.store\.id/);
  assert.match(tool, /gateways\.stores\.offer\(ownerKs,offerId\)/);
  // Source-only selection is NOT a purchase or payment and needs an E2E test in the next slice.
  assert.match(tool, /Do not order, reserve, contact the seller/);
});
