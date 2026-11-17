import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const seller=readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
const mini=readFileSync(new URL('../src/mini/MiniExperience.tsx',import.meta.url),'utf8');
const live=readFileSync(new URL('../src/features/living-workspace/DateTimeTool.tsx',import.meta.url),'utf8');
test('native seller entry comes from Mini and uses preview host guard',()=>{
  assert.match(mini,/MiniSellSomething/);
  assert.match(mini,/sellPreview/);
  assert.match(mini,/isMiniExperiencePreviewHost/);
  assert.match(mini,/screen === 'sell-preview'/);
});
test('seller has Workspace-equivalent tool family and source-aware descriptions',()=>{
  for(const term of ['Describe & Present','Photos','Documents','Places','Date & Time','People & Invitations','buildTimingProposal','writeDescription'])
    assert.ok(seller.includes(term),term);
  assert.ok(live.includes('buildTimingProposal'));
});
test('seller cannot initiate Money or claim a real SecureLink, store publish or verified photo',()=>{
  assert.ok(!seller.includes('Connect to Money'));
  assert.ok(!seller.includes('fundAgreement'));
  assert.ok(!seller.includes('publishOffer('));
  assert.ok(!seller.includes('sendSecureLink('));
  assert.match(seller,/No real SecureLink or invitation has been created/);
  assert.match(seller,/No upload, ownership proof, duplicate-image scan/);
  assert.match(seller,/rightToOffer/);
  assert.match(seller,/imageNeedsSource/);
  assert.match(seller,/canOffer/);
});
test('sell actions remain share, store or save with local-only draft',()=>{
  assert.match(seller,/finish\('share'\)/);
  assert.match(seller,/finish\('store'\)/);
  assert.match(seller,/finish\('save'\)/);
  assert.match(seller,/sessionStorage/);
});

test('seller starts with one closed optional tool shelf and opens only as needed',()=>{
  assert.match(seller,/const \[toolsOpen,setToolsOpen\]=useState\(false\)/);
  assert.match(seller,/aria-expanded=\{toolsOpen\}/);
  assert.match(seller,/toolsOpen&&<div id="spm-sell-optional-tools">/);
  assert.match(seller,/Add to or improve your offer/);
  assert.match(seller,/openSuggestedTool/);
  for(const id of ["id:'describe'","id:'places'","id:'timing'","id:'people'","id:'documents'"])
    assert.ok(seller.includes(id),id);
});

test('Phase 1 provides a calm Store entrance without expanding the offer tool shelf',()=>{
  assert.match(seller,/data-seller-phase1="my-store"/);
  assert.match(seller,/data-seller-phase1="quick-contract-entry"/);
  assert.match(seller,/data-seller-phase1="relationships-entry"/);
  assert.match(seller,/Add to or improve your offer/);
  assert.match(seller,/useState\(false\).*?;/);
  assert.match(seller,/const \[sellerArea,setSellerArea\]=useState<'offer'\|'quick'\|'relationships'>\('offer'\)/);
  assert.match(seller,/onOpenSettings/);
});
test('Phase 1 Store and Settings return to the preserved Sell draft',()=>{
  assert.match(mini,/sellerSettingsReturn/);
  assert.match(mini,/onBack=\{\(\) => setScreen\(sellerSettingsReturn\?'sell-preview':'home'\)\}/);
  assert.match(mini,/playground && <div hidden=\{!\(screen === 'sell-preview'\)\}/);
  assert.match(mini,/setSettingsEntry\('store'\);setScreen\('business-settings'\)/);
  assert.match(mini,/onBrowseStores=\{\(\)=>\{setBuyPrefill\(''\);setScreen\('buy'\);\}\}/);
});
test('Phase 1 protects buyer and seller authority; favourite contacts and Quick Contracts are not invented',()=>{
  assert.match(seller,/Favourites are not yet stored in a verified SecurePay account/);
  assert.match(seller,/No SecureLink, Agreement or payment is created here/);
  assert.match(seller,/Previous acceptance is never reused automatically|each person's agreement must still be checked/);
  assert.match(seller,/not verified/);
  const existing = readFileSync(new URL('../src/mini/MiniFirstPartyKs001.tsx',import.meta.url),'utf8');
  assert.match(existing,/createStoreGateway\(http\)/);
  assert.match(existing,/MiniSellerStore storeGateway=\{stores\}/);
  assert.match(existing,/startInStore=\s*false/);
});
