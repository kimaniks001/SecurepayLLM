import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const gateway=fs.readFileSync(new URL('../src/api/securepay/agreements/index.ts',import.meta.url),'utf8');
const helper=fs.readFileSync(new URL('../src/mini/miniSellerAgreementHandoff.mjs',import.meta.url),'utf8');
const seller=fs.readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/mini/MiniFirstPartyKs001.tsx',import.meta.url),'utf8');

test('seller proposal hits the separate version-fenced backend endpoint',()=>{
  assert.ok(gateway.includes('/propose-reviewed'));
  assert.ok(gateway.includes('expectedVersionId:expected.versionId'));
  assert.ok(gateway.includes('expectedVersionNumber:expected.versionNumber'));
  assert.ok(gateway.includes('expectedContentHash:expected.contentHash'));
  assert.ok(helper.includes('agreements.proposeReviewed(agreementId,expectedAgreementVersion)'));
  assert.equal(helper.includes('await agreements.propose(agreementId)'),false);
});
test('seller checks exact Agreement version before issuing public doorway',()=>{
  assert.ok(seller.includes('current.currentVersion?.versionId!==proposedAgreement.version.versionId'));
  assert.ok(seller.includes('current.currentVersion?.versionNumber!==proposedAgreement.version.versionNumber'));
  assert.ok(seller.includes('current.currentVersion?.contentHash!==proposedAgreement.version.contentHash'));
});
test('Business Store selector cannot inject personal Agent or Agreement gateways',()=>{
  assert.ok(shell.includes("agreementGateway={sellerOfferContext.type==='personal'?agreements:undefined}"));
  assert.ok(shell.includes("handoffGateway={sellerOfferContext.type==='personal'?pair.gateway:undefined}"));
  assert.ok(shell.includes("onPrepareInKs001={sellerOfferContext.type==='personal'"));
});
