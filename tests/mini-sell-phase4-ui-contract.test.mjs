import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mini=fs.readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
const experience=fs.readFileSync(new URL('../src/mini/MiniExperience.tsx',import.meta.url),'utf8');

test('seller still has three independent clear exits and no seller Connect to Money',()=>{
  for(const a of ["Share with buyer","Add to my store","Save for later"])
    assert.ok(mini.includes(a),a);
  assert.equal(mini.includes('Connect to Money'),false);
});
test('local owner demo never silently receives signed-in Store or Agreement mutation gateways',()=>{
  const start=experience.indexOf('<MiniSellSomething');
  const mount=experience.slice(start,experience.indexOf('/>',start)+2);
  assert.ok(mount.includes('language={lang}'));
  assert.equal(mount.includes('handoffGateway='),false);
  assert.equal(mount.includes('agreementGateway='),false);
  assert.equal(mount.includes('storeGateway='),false);
});
test('real SecureLink requires server-reviewed created and proposed Agreement, not Store ID',()=>{
  assert.ok(mini.includes('miniSellerBeginAgreementHandoff'));
  assert.ok(mini.includes('miniSellerReviewAgreementHandoff'));
  assert.ok(mini.includes('miniSellerCreateReviewedAgreement'));
  assert.ok(mini.includes('miniSellerProposeAgreement'));
  assert.ok(mini.includes('setProposedAgreement({id:proposed.agreementId,status:'));
  assert.ok(mini.includes('gateway:agreementGateway,agreement:proposedAgreement'));
  assert.ok(mini.includes('reviewedOfferSignature'));
  assert.equal(mini.includes('canonicalAgreement='),false);
});
test('buyer-facing SecureLink still requires explicit seller review pill',()=>{
  assert.ok(mini.includes("These are the terms I'll share"));
  assert.ok(mini.includes('setReviewAcknowledged(true)'));
  assert.ok(mini.includes('disabled={!reviewAcknowledged||handoffBusy}'));
  assert.ok(mini.includes('The Agreement changed. Please review the current terms again.'));
});
