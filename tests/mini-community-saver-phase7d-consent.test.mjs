import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('7D Mini shows four separate fictional decisions, never a combined consent',()=>{
  const ui=read('src/mini/MiniCommunitySaverConsentPreview.tsx');
  for(const label of ['Trader A','Trader B','Transport provider','Qualified Plug'])
    assert.ok(ui.includes(label),label);
  assert.ok(ui.includes('Agree for review'));
  assert.ok(ui.includes('Withdraw my agreement'));
  assert.ok(ui.includes('Simulate changed terms'));
  assert.ok(ui.includes('Reset fictional journey'));
  assert.ok(ui.includes('no Plug commission becomes payable'));
  assert.ok(ui.includes('Everyone has agreed to REVIEW'));
});
test('7D private gateway never accepts client-side quote baselines, other identities or Money',()=>{
  const source=read('src/api/securepay/community-saver-private-consent/index.ts');
  assert.ok(source.includes("auth:'required'"));
  assert.ok(source.includes('expectedRevision,expectedTermsHash,action'));
  assert.ok(source.includes("'ACCEPT'|'DECLINE'|'WITHDRAW'"));
  assert.ok(source.includes("canReceiveLiveAssignment")===false);
  assert.equal(source.includes('createProposal:'),false);
  assert.equal(source.includes('merchantKsNumber'),false);
  assert.equal(source.includes('otherTraderIdentityId:'),false);
  assert.equal(source.includes('amountMinor:')||source.includes('baselineMinor:'),false);
  assert.equal(source.includes('initiatePayment('),false);
  assert.equal(source.includes('amendAgreement('),false);
});
test('7D no real participant consent UI or service is enabled by fictional demo',()=>{
  const owner=read('src/mini/MiniCommunitySaverPreview.tsx');
  const fictional=read('src/mini/MiniCommunitySaverConsentPreview.tsx');
  assert.ok(owner.includes('selected===0&&<MiniCommunitySaverConsentPreview/>'));
  assert.ok(fictional.includes('No identity, Agreement, notification, provider booking or payment'));
  assert.ok(fictional.includes('setVotes(blank())'));
  assert.equal(fictional.includes('createCommunitySaverPrivateConsentGateway'),false);
  assert.equal(fictional.includes('gateway.decide('),false);
});
test('7D existing qualification and 25% / 10% rules remain separate',()=>{
  const financial=read('src/mini/communitySaverPreScreen.mjs');
  assert.ok(financial.includes('minNetSavingPercent:25'));
  assert.ok(financial.includes('plugPercentOfMinimumSaving:10'));
  const preview=read('src/mini/MiniCommunitySaverConsentPreview.tsx');
  assert.ok(preview.includes('communitySaverPreScreen({'));
  assert.ok(preview.includes("platformCode:'MY_RIDE'"));
  assert.equal(preview.includes("platformCode:'REAL_ESTATE'"),false);
});
