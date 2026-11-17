import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync(new URL('../src/mini/MiniSellSecureLinkWalkthrough.tsx',import.meta.url),'utf8');
const seller=fs.readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/mini/MiniExperience.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/mini/mini.css',import.meta.url),'utf8');

test('owner walkthrough shows complete offer to Agreement to SecureLink formation',()=>{
  for(const name of ['Check terms','Draft Agreement','Ready for buyer','SecureLink',
    "These are the terms I'll share",'Set up draft Agreement',
    'Propose Agreement for buyer review','Show SecureLink step',
    'See what the buyer would see']) assert.ok(flow.includes(name),name);
  assert.ok(flow.includes('data-mini-securelink-buyer-view="sample"'));
});
test('sample walkthrough cannot issue a URL, QR, payment, invite, or accept as buyer',()=>{
  assert.ok(flow.includes('nothing is sent or created'));
  assert.ok(flow.includes('walkthrough has not issued a URL or QR code'));
  assert.ok(flow.includes('No buyer action is enabled'));
  for(const dangerous of ['issuePublicDoorway(','createOffer(','navigator.share(',
    'navigator.clipboard.writeText(','fetch(','http.request(','createHandoff('])
    assert.equal(flow.includes(dangerous),false,dangerous);
});
test('real issuance remains on authenticated gateway only',()=>{
  assert.ok(seller.includes('previewSecureLinkJourney&&!agreementGateway&&!handoffGateway'));
  assert.ok(seller.includes('gateway:agreementGateway,agreement:proposedAgreement'));
  assert.ok(seller.includes('miniSellerIssueAgreementDoorway'));
  assert.ok(seller.includes('current.currentVersion?.contentHash!==proposedAgreement.version.contentHash'));
});
test('walkthrough mounted only from isolated owner trade demo, never first-party real Store',()=>{
  const start=shell.indexOf('<MiniSellSomething');
  const mount=shell.slice(start,shell.indexOf('/>',start)+2);
  assert.ok(shell.includes('{playground && <div hidden={!(screen === \'sell-preview\')}'));
  assert.ok(mount.includes('previewSecureLinkJourney'));
  assert.equal(mount.includes('handoffGateway='),false);
  assert.equal(mount.includes('agreementGateway='),false);
  assert.equal(mount.includes('storeGateway='),false);
  assert.ok(seller.includes("result==='share'&&previewSecureLinkJourney"));
});
test('visual treatment is mobile-friendly and local to Mini',()=>{
  assert.ok(css.includes('.spm-sell-link-walkthrough'));
  assert.ok(css.includes('@media(max-width:420px)'));
});
