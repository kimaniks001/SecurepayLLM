import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');

const landing=src('src/components/StoreHome.tsx');
const preview=src('src/features/store/StoreMasterpieceLayoutReview.tsx');
const workspace=src('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const live=src('src/features/store/StoreExperience.tsx');

test('the real Store starts with a visible buy, sell, manage choice and search (not tool jargon)',()=>{
  assert.match(landing,/Good things\. Good people\. Clear agreements\./);
  assert.match(landing,/Shop<\/span>/);
  assert.match(landing,/Sell something<\/span>/);
  assert.match(landing,/My Store<\/span>/);
  assert.match(landing,/onCreateOffer/);
  assert.match(landing,/onManageStore/);
  assert.match(landing,/id="store-search"/);
  assert.match(landing,/Search Digital Stores/);
  assert.match(landing,/Published Store offers/);
  assert.doesNotMatch(landing,/window\.location\.hash|href="#store-search"/);
});

test('store shopfront preview shows the existing StoreHome with genuinely visible sample offers and shops',()=>{
  assert.match(preview,/import \{ StoreHome \}/);
  assert.match(preview,/import \{ demoStores, getOfferById, getOffersByStore, getStoreById, searchOffers \}/);
  assert.match(preview,/offers=\{visible\}/);
  assert.match(preview,/stores=\{demoStores\.map/);
  assert.match(preview,/searchStatus="ready"/);
  assert.doesNotMatch(preview,/offers=\{\[\]\}|stores=\{\[\]\}|searchStatus="error"/);
  assert.match(preview,/Not live trader listings/);
  assert.match(preview,/verified:false/);
});

test('example shop and offer details, sample offer drafting, and KS001 guidance have a meaningful next action',()=>{
  assert.match(preview,/page==='offer'/);
  assert.match(preview,/page==='store'/);
  assert.match(preview,/page==='create'/);
  assert.match(preview,/page==='manage'/);
  assert.match(preview,/page==='ask'/);
  assert.match(preview,/onClick=\{\(\)=>startEnquiry\(selectedOffer\)\}/);
  assert.match(preview,/setDrafts\(current=>\[draft,\.\.\.current\]\)/);
  assert.match(preview,/no message is sent/);
  assert.match(preview,/not published/i);
});

test('the signed-in real Store still mounts its real StoreExperience, preserved parent KS001 controller and consent step',()=>{
  assert.match(workspace,/storeIntegration && <StoreExperience/);
  assert.match(workspace,/StoreMasterpieceLayoutReview/);
  assert.match(workspace,/data-masterpiece-digital-store/);
  assert.match(workspace,/Digital Store · Shop & Sell/);
  assert.match(workspace,/<LiveKs001Session/);
  assert.match(live,/onCommunityProviderContinue/);
  assert.match(live,/StoreConnectionsHome/);
  assert.match(live,/StoreEnquiryInbox/);
  assert.match(live,/StoreManagementHome/);
  assert.match(live,/onUseOffer\(/);
});
