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
