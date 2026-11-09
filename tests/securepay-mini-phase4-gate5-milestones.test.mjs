import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(read('src/mini/miniMilestonesModel.ts'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const {newSampleJourney,transitionSample,sampleNextAction,sampleActionOptions,
  restoreSampleJourney,SAMPLE_TOTAL_MINOR,SAMPLE_DEPOSIT_MINOR,
  SAMPLE_MILESTONES,SAMPLE_MONEY_AUTHORITY}=model;
const t=Date.UTC(2026,10,9);

function startReviews(){
  let s=newSampleJourney(t);
  s=transitionSample(s,'BUILDER','REVIEW');
  s=transitionSample(s,'BUYER','REVIEW');
  assert.equal(s.phase,'DEPOSIT_DUE');
  return s;
}
function submitDeposit(){
  let s=startReviews();
  s=transitionSample(s,'BUYER','ACK_DEPOSIT');
  assert.equal(s.phase,'WORK_IN_PROGRESS');
  return s;
}
function inspect(s,caption='Cabinets fixed, work photographed locally'){
  s=transitionSample(s,'BUILDER','SUBMIT_EVIDENCE',caption);
  assert.equal(s.phase,'BUYER_REVIEW');
  return s;
}

test('exact illustrative KSh150,000 split and no real money or legal authority',()=>{
  assert.equal(SAMPLE_DEPOSIT_MINOR,3_000_000);
  assert.equal(SAMPLE_MILESTONES.length,2);
  assert.deepEqual(SAMPLE_MILESTONES.map(m=>m.amountMinor),[6_000_000,6_000_000]);
  assert.equal(SAMPLE_DEPOSIT_MINOR+SAMPLE_MILESTONES.reduce((a,m)=>a+m.amountMinor,0),
    SAMPLE_TOTAL_MINOR);
  for(const [k,v] of Object.entries(SAMPLE_MONEY_AUTHORITY)){
    if(k==='simulationOnly')assert.equal(v,true);
    else assert.equal(v,false,'must never set real authority: '+k);
  }
});

test('two distinct sample reviews required; no unilateral deposit or legal acceptance',()=>{
  let s=newSampleJourney(t);
  assert.equal(s.phase,'REVIEW_SCHEDULE');
  assert.equal(sampleNextAction(s).recipient,'BUYER');
  assert.equal(transitionSample(s,'BUYER','ACK_DEPOSIT'),null);
  assert.equal(transitionSample(s,'BUILDER','SUBMIT_EVIDENCE','done'),null);
  s=transitionSample(s,'BUYER','REVIEW');
  assert.equal(s.phase,'REVIEW_SCHEDULE');
  assert.equal(sampleNextAction(s).recipient,'BUILDER');
  assert.equal(transitionSample(s,'BUYER','REVIEW'),null);
  s=transitionSample(s,'BUILDER','REVIEW');
  assert.equal(s.phase,'DEPOSIT_DUE');
  assert.equal(sampleNextAction(s).recipient,'BUYER');
  assert.equal(transitionSample(s,'BUILDER','ACK_DEPOSIT'),null);
  assert.equal(sampleActionOptions(s,'BUILDER').length,0);
  assert.deepEqual(sampleActionOptions(s,'BUYER'),['ACK_DEPOSIT']);
});

test('deposit marker creates builder next action but NEVER records actual funds',()=>{
  let s=submitDeposit();
  const prompt=sampleNextAction(s,t);
  assert.equal(prompt.recipient,'BUILDER');
  assert.equal(prompt.nextAction,'SUBMIT_EVIDENCE');
  assert.equal(prompt.delivery,'IN_APP_PREVIEW_ONLY');
  assert.equal(prompt.simulatedOnly,true);
  assert.equal(transitionSample(s,'BUYER','APPROVE_MILESTONE'),null);
  assert.equal(transitionSample(s,'BUILDER','SUBMIT_EVIDENCE',''),null);
  assert.equal(transitionSample(s,'BUILDER','SUBMIT_EVIDENCE','x'.repeat(201)),null);
  assert.equal(s.history.at(-1).action,'ACK_DEPOSIT');
  assert.equal(SAMPLE_MONEY_AUTHORITY.depositReceived,false);
});

test('builder evidence → buyer concern → builder correction → buyer approval and staged obligations',()=>{
  let s=inspect(submitDeposit());
  assert.equal(sampleNextAction(s).recipient,'BUYER');
  assert.deepEqual(sampleActionOptions(s,'BUYER'),
    ['APPROVE_MILESTONE','RAISE_CONCERN']);
  assert.equal(transitionSample(s,'BUILDER','RAISE_CONCERN','Not level'),null);
  s=transitionSample(s,'BUYER','RAISE_CONCERN','A cabinet is crooked');
  assert.equal(s.phase,'CONCERN_OPEN');
  assert.equal(s.concern,'A cabinet is crooked');
  assert.equal(transitionSample(s,'BUYER','APPROVE_MILESTONE'),null);
  assert.equal(sampleNextAction(s).recipient,'BUILDER');
  s=transitionSample(s,'BUILDER','SUBMIT_EVIDENCE','Cabinet alignment corrected');
  assert.equal(s.phase,'BUYER_REVIEW');
  assert.equal(s.concern,'');
  s=transitionSample(s,'BUYER','APPROVE_MILESTONE');
  assert.equal(s.phase,'MILESTONE_APPROVED');
  assert.equal(transitionSample(s,'BUILDER','ACK_MILESTONE'),null);
  s=transitionSample(s,'BUYER','ACK_MILESTONE');
  assert.equal(s.phase,'WORK_IN_PROGRESS');
  assert.equal(s.milestoneIndex,1);
  assert.equal(s.evidence,'','first milestone evidence cannot approve second');
  s=inspect(s,'Handover photographs and snag list reviewed');
  s=transitionSample(s,'BUYER','APPROVE_MILESTONE');
  s=transitionSample(s,'BUYER','ACK_MILESTONE');
  assert.equal(s.phase,'COMPLETE_SAMPLE');
  assert.equal(sampleNextAction(s).nextAction,null);
  assert.equal(transitionSample(s,'BUYER','ACK_MILESTONE'),null);
  assert.equal(SAMPLE_MONEY_AUTHORITY.releaseAuthorised,false);
  assert.equal(SAMPLE_MONEY_AUTHORITY.mayFulfil,false);
});

test('next-action notification has recipient, due date, overdue preview and NO delivery',()=>{
  let s=submitDeposit();
  const current=sampleNextAction(s,t);
  assert.equal(current.overdue,false);
  assert.equal(current.dueAt,t+7*86400000);
  const late=sampleNextAction(s,t+25*86400000);
  assert.equal(late.overdue,true);
  assert.equal(late.recipient,'BUILDER');
  assert.equal(late.delivery,'IN_APP_PREVIEW_ONLY');
  assert.equal(late.id,'SIM-NEXT-'+s.revision+'-'+s.phase);
});

test('tab-local restore refuses malformed state; state remains explicitly sample-only',()=>{
  const source=submitDeposit();
  assert.equal(restoreSampleJourney(source).phase,source.phase);
  assert.equal(restoreSampleJourney({...source,version:99}),null);
  assert.equal(restoreSampleJourney({...source,phase:'PAID'}),null);
  assert.equal(restoreSampleJourney({...source,evidence:'z'.repeat(300)}),null);
  assert.equal(restoreSampleJourney({...source,history:[{by:'HACKER'}]}),null);
  assert.equal(restoreSampleJourney(null),null);
});

test('Gate 5 uses the original Mini shell and cannot initiate provider or external notification actions',()=>{
  const ui=read('src/mini/MiniMilestonesSandbox.tsx');
  const root=read('src/mini/MiniExperience.tsx');
  const modelSource=read('src/mini/miniMilestonesModel.ts');
  assert.match(root,/milestoneSandbox.*=== '1'/);
  assert.match(root,/<MiniMilestonesSandbox\/>/);
  assert.match(ui,/NOT FUNDED/);
  assert.match(ui,/no message sent/i);
  assert.match(ui,/View as/);
  assert.match(ui,/Restart this sample/);
  assert.match(ui,/NO REAL PAYMENT/);
  assert.match(modelSource,/agreementAccepted:false/);
  for(const source of [ui,modelSource]){
    assert.doesNotMatch(source,/fetch\(|WebSocket|PaymentIntent|sendWhatsApp|sendEmail|providerWebhook|escrowRelease|bankTransfer/);
  }
});
