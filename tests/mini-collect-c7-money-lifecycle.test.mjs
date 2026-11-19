import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  C7_MONEY_STAGES, summarizeC7Money, canCollectMoneyFromC7Preview,
} from '../src/features/mini-collect/c7MoneyLifecycle.mjs';

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('C7: source stages describe original Agreement before Money',()=>{
  assert.deepEqual(C7_MONEY_STAGES.map(x=>x.id),['item','review','money','outcome']);
  assert.equal(canCollectMoneyFromC7Preview(),false);
});
test('C7: no provider data does not pretend any money has been collected',()=>{
  const s=summarizeC7Money();
  assert.equal(s.hasAuthoritativeRecords,false);
  assert.equal(s.verifiedFundedMinor,null);
  assert.equal(s.proposedReturnMinor,null);
  assert.equal(s.refundSettled,false);
  assert.equal(s.recurringDebitAuthorized,false);
  assert.equal(s.noticesDelivered,false);
});
test('C7: accepted draft is never a bank payment',()=>{
  const s=summarizeC7Money({
    agreementId:'test',
    originalItems:[{proposalId:'id',state:'REVIEW_ONLY_NO_MONEY_AUTHORITY'}],
    contributionRecords:[],
    totalIsComplete:true,
    returnStatus:{status:'NOT_DETERMINED',proposedReturnMinor:null,currency:'KES'},
  });
  assert.equal(s.verifiedFundedMinor,null);
  assert.equal(s.noSourceProof,true);
  assert.equal(s.refundSettled,false);
});
test('C7: only complete provider-certified original funding is displayed as verified',()=>{
  const rows=[
    {contributionId:'verified',state:'VERIFIED_PROVIDER_FUNDING',
      providerCertified:true,verifiedFundedAmountMinor:10500},
    {contributionId:'posted',state:'AWAITING_PROVIDER_CERTIFICATION',
      providerCertified:false,verifiedFundedAmountMinor:null},
  ];
  for(const fullyLoaded of [false,true]){
    const s=summarizeC7Money({
      agreementId:'test',originalItems:[],
      contributionRecords:rows,totalIsComplete:fullyLoaded,
      returnStatus:{status:'NOT_DETERMINED',proposedReturnMinor:null},
    });
    assert.equal(s.verifiedFundedMinor,null);
  }
  const single=summarizeC7Money({
    agreementId:'test',originalItems:[],
    contributionRecords:[rows[0]],totalIsComplete:true,
    returnStatus:{status:'NOT_DETERMINED',proposedReturnMinor:null},
  });
  assert.equal(single.verifiedFundedMinor,10500);
  assert.equal(single.refundSettled,false);
});
test('C7: no refund can be reported as settled from a C4 proposed calculation',()=>{
  const s=summarizeC7Money({
    agreementId:'test',originalItems:[],contributionRecords:[],
    totalIsComplete:true,
    returnStatus:{
      status:'CALCULATED_NOT_AUTHORIZED',proposedReturnMinor:1000,
      currency:'KES',instructed:false,providerSettled:false,
    },
  });
  assert.equal(s.proposedReturnMinor,1000);
  assert.equal(s.refundSettled,false);
  assert.equal(s.noticesDelivered,false);
});
test('C7: C4 private contribution view links to C7 without fetching fabricated accounts',()=>{
  const c4=source('src/features/mini-collect/C4MyContributionStatus.tsx');
  const c7=source('src/features/mini-collect/C7MyMoneyLifecycle.tsx');
  assert.match(c4,/C7MyMoneyLifecycle/);
  assert.match(c4,/See how my Money is protected/);
  assert.match(c7,/No personal Money records are connected yet/);
  assert.match(c7,/Only an authenticated, independently verified backend response/);
  assert.doesNotMatch(c7,/fetch\s*\(|executePayment\s*\(|markAsPaid\s*\(|sendRefund\s*\(/);
});
