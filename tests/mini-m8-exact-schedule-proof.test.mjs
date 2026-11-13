import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniExactScheduleSplitProof} from '../src/mini/miniScheduleProof.mjs';

const scenarios=[
  ['shop goods full',120000,'FULL_ON_COMPLETION',null,null],
  ['small shop order',100,'FULL_ON_COMPLETION',null,null],
  ['school fee full',1500000,'FULL_ON_COMPLETION',null,null],
  ['shop 30 deposit',120000,'DEPOSIT_AND_BALANCE',30,null],
  ['materials deposit',450550,'DEPOSIT_AND_BALANCE',20,null],
  ['large stock delivery',1234567,'DEPOSIT_AND_BALANCE',50,null],
  ['small order deposit',101,'DEPOSIT_AND_BALANCE',33,null],
  ['contract 1 percent',10000,'DEPOSIT_AND_BALANCE',1,null],
  ['contract 99 percent',10000,'DEPOSIT_AND_BALANCE',99,null],
  ['school installment 25',900000,'DEPOSIT_AND_BALANCE',25,null],
  ['shop 30 30 40',120000,'DEPOSIT_PROGRESS_COMPLETION',30,30],
  ['construction 20 40 40',10000000,'DEPOSIT_PROGRESS_COMPLETION',20,40],
  ['painting stages',200001,'DEPOSIT_PROGRESS_COMPLETION',10,50],
  ['garden service stages',550005,'DEPOSIT_PROGRESS_COMPLETION',25,25],
  ['equipment hire stages',123456,'DEPOSIT_PROGRESS_COMPLETION',33,33],
  ['delivery stages',99000,'DEPOSIT_PROGRESS_COMPLETION',10,60],
  ['small multi milestone',301,'DEPOSIT_PROGRESS_COMPLETION',10,20],
  ['large precise split',9007199254740991,'DEPOSIT_PROGRESS_COMPLETION',20,30],
  ['materials 1 1 98',100000,'DEPOSIT_PROGRESS_COMPLETION',1,1],
  ['transport 45 50 5',290000,'DEPOSIT_PROGRESS_COMPLETION',45,50],
];
const fixture=(principal,type,d,p)=>{
  const share=percentage=>Number(BigInt(principal)*BigInt(percentage)/100n);
  const amounts=type==='FULL_ON_COMPLETION'?[principal]:
    type==='DEPOSIT_AND_BALANCE'?[share(d),principal-share(d)]:
    [share(d),share(p),principal-share(d)-share(p)];
  return {principalMinor:principal,scheduleType:type,depositPercent:d,progressPercent:p,
    proposedSteps:amounts.map((amountMinor,i)=>({
      sequence:i+1,label:['Deposit','Progress','Completion'][i],
      checkpoint:'Independently evidenced and approved',amountMinor,payable:false}))};
};

for(const [name,total,type,deposit,progress] of scenarios){
  test('M8 proposal only: '+name,()=>{
    const reply=fixture(total,type,deposit,progress);
    assert.equal(miniExactScheduleSplitProof(reply),true);
    // A changed allocation with the SAME total is not the same schedule.
    if(reply.proposedSteps.length>1 && reply.proposedSteps[1].amountMinor>1){
      const forged=structuredClone(reply);
      forged.proposedSteps[0].amountMinor++;
      forged.proposedSteps[1].amountMinor--;
      assert.equal(miniExactScheduleSplitProof(forged),false);
    }
    assert.equal(miniExactScheduleSplitProof({
      ...reply,proposedSteps:reply.proposedSteps.map(s=>({...s,payable:true}))
    }),false);
  });
}
test('invalid percentages, missing stages, fake payability and tiny shares fail',()=>{
  for(const input of [
    fixture(100,'DEPOSIT_AND_BALANCE',0,null),
    fixture(100,'DEPOSIT_AND_BALANCE',100,null),
    fixture(100,'DEPOSIT_PROGRESS_COMPLETION',50,50),
    {...fixture(100,'DEPOSIT_PROGRESS_COMPLETION',20,30),depositPercent:null},
    fixture(1,'DEPOSIT_AND_BALANCE',1,null),
    fixture(2,'DEPOSIT_PROGRESS_COMPLETION',30,30),
    {...fixture(100,'FULL_ON_COMPLETION',null,null),proposedSteps:[]},
    {...fixture(100,'FULL_ON_COMPLETION',null,null),principalMinor:-1},
    {...fixture(100,'FULL_ON_COMPLETION',null,null),scheduleType:'PAY_NOW'},
  ]) assert.equal(miniExactScheduleSplitProof(input),false);
});
test('Mini only displays independently verified nonpayable API result',()=>{
  const gateway=readFileSync('src/api/securepay/store-quotations/index.ts','utf8');
  const ui=readFileSync('src/mini/MiniQuoteSchedulePreview.tsx','utf8');
  assert.match(gateway,/miniExactScheduleSplitProof\(result\)/);
  assert.match(gateway,/result\.paymentEnabled !== false/);
  assert.match(gateway,/result\.sellerScheduleApproved !== false/);
  assert.match(ui,/quoteSchedulePreviewProof\(proposed,plan\)/);
  assert.doesNotMatch(ui,/\.initiate\(|\.release\(/);
});
