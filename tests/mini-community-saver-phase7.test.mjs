import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {communitySaverPreScreen,communitySaverRules} from '../src/mini/communitySaverPreScreen.mjs';
const source=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const items=[
  {agreementId:'accepted-mabati',agreementVersionId:'v7',itemId:'transport-1',baselineMinor:1000000,currency:'KES'},
  {agreementId:'accepted-boards',agreementVersionId:'v3',itemId:'transport-2',baselineMinor:400000,currency:'KES'}
];
const scenario=(extra=10000,changes={})=>({platformCode:'MY_RIDE',items,
  carrierOrHostCostMinor:1000000,otherIncrementalCostMinor:extra,
  additionalProviderRewardMinor:0,...changes});
test('7A illustrative Nyeri items save 25% each after the Plug fee',()=>{
  const q=communitySaverPreScreen(scenario());
  assert.equal(q.ok,true);
  assert.equal(q.originalMinor,1400000);
  assert.equal(q.minimumSavingsMinor,350000);
  assert.equal(q.plugFeeMinor,35000);
  assert.equal(q.allInMinor,1045000);
  assert.equal(q.netSavingMinor,355000);
  assert.equal(q.qualifies,true);
  assert.equal(q.allocations.length,2);
  assert.equal(q.allocations.reduce((a,b)=>a+b.projectedSavingMinor,0),355000);
  assert.ok(q.allocations.every(a=>a.projectedSavingMinor*100>=a.baselineMinor*25));
  assert.equal(q.capacityVerified,false);
  assert.equal(q.plugQualified,false);
  assert.equal(q.participantsConsented,false);
  assert.equal(q.moneyAuthorized,false);
});
test('7A 25% net minimum fails if extra costs consume the available headroom',()=>{
  const q=communitySaverPreScreen(scenario(20000));
  assert.equal(q.ok,false);
  assert.equal(q.reason,'BELOW_MINIMUM_NET_SAVING');
  assert.equal(q.requiredImprovementMinor,5000);
});
test('7A no general Store, land sale or unapproved platform can enter',()=>{
  for(const platformCode of ['STORE','REAL_ESTATE','LAND','GENERAL_TRADE','',null,undefined]){
    assert.equal(communitySaverPreScreen(scenario(0,{platformCode})).reason,'PLATFORM_NOT_APPROVED');
  }
  assert.deepEqual([...communitySaverRules.approvedPlatformCodes],['SHORTSTAYS','MY_RIDE','STORAGE']);
});
test('7A must bind each item to separate source Agreement and accepted version reference',()=>{
  assert.equal(communitySaverPreScreen(scenario(0,{items:[items[0]]})).reason,'NEEDS_MULTIPLE_INDEPENDENT_ITEMS');
  assert.equal(communitySaverPreScreen(scenario(0,{items:[items[0],{...items[0],itemId:'other'}]})).reason,'NEEDS_INDEPENDENT_COMMITMENTS');
  assert.equal(communitySaverPreScreen(scenario(0,{items:[items[0],items[0]]})).reason,'DUPLICATE_AGREEMENT_ITEM');
  assert.equal(communitySaverPreScreen(scenario(0,{items:[items[0],{...items[1],agreementVersionId:''}]})).reason,'ITEM_MISSING_CANONICAL_REFERENCE_OR_KES_PRICE');
});
test('7A currency, amount and cost boundaries fail closed',()=>{
  assert.equal(communitySaverPreScreen(scenario(0,{items:[items[0],{...items[1],currency:'USD'}]})).ok,false);
  assert.equal(communitySaverPreScreen(scenario(-1)).reason,'SHARED_COSTS_NOT_ITEMIZED');
  assert.equal(communitySaverPreScreen(scenario(0,{carrierOrHostCostMinor:0})).ok,false);
  assert.equal(communitySaverPreScreen(scenario(0,{additionalProviderRewardMinor:NaN})).ok,false);
});
test('7A fee is 10% of the 25% combined-item benchmark, NOT gross or the full Agreement',()=>{
  assert.equal(communitySaverPreScreen(scenario()).plugFeeMinor,35000);
  assert.equal(communitySaverRules.plugPercentOfMinimumSaving,10);
  assert.equal(communitySaverRules.minNetSavingPercent,25);
});
test('7A prevents operations or false production messaging in the owner experience',()=>{
  const ui=source('src/mini/MiniCommunitySaverPreview.tsx');
  const experience=source('src/mini/MiniExperience.tsx');
  assert.ok(ui.includes('Fictional owner walkthrough'));
  assert.ok(ui.includes('qualified Plug'));
  assert.ok(ui.includes('capacity'));
  assert.ok(ui.includes('money moves'));
  assert.ok(experience.includes("qs.get('communitySaverPreview')==='1'"));
  assert.ok(experience.includes('playground && screen === \'community-saver-preview\''));
  for(const forbidden of ['issuePublicDoorway(', 'initiatePayment(', 'makeMoneyPayment(', 'acceptAgreement('])
    assert.equal(ui.includes(forbidden),false);
});
