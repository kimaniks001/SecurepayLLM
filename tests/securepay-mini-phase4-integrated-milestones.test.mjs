import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=ts.transpileModule(read('src/mini/offlineAgreementJourney.ts'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const {createOfflineJourney,moveOfflineJourney,nextOfflineAction,
  offlineObligations,OFFLINE_AUTHORITY}=m;
const NOW=Date.UTC(2026,10,10,9,0,0);
const DAY=86400000;

function review(source,plan='STAGED'){
  let s=createOfflineJourney('source-v1',NOW);
  s=moveOfflineJourney(s,'PROVIDER','REVIEW_SOURCE');
  if(plan!=='FULL')s=moveOfflineJourney(s,'CUSTOMER','SELECT_PLAN',plan);
  s=moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS');
  s=moveOfflineJourney(s,'PROVIDER','REVIEW_TERMS');
  s=moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION');
  assert.equal(s.stage,'FUNDING_PREVIEW');
  return s;
}
function simulateConfirmed(s){
  s=moveOfflineJourney(s,'CUSTOMER','RECORD_SIMULATION','AWAITING_FAKE_PROVIDER');
  s=moveOfflineJourney(s,'CUSTOMER','RECORD_SIMULATION','SIMULATED_CONFIRMED');
  assert.equal(s.simulatedResult,'SIMULATED_CONFIRMED');
  return s;
}

for(const source of ['STORE','SHORTSTAYS']){
  const total=source==='STORE'?180000:900000;
  test(source+' supports either a full obligation or the same optional deposit + two stages',()=>{
    const full=offlineObligations(total,source,'FULL');
    assert.equal(full.length,1);
    assert.equal(full[0].amountMinor,total);
    const steps=offlineObligations(total,source,'STAGED');
    assert.equal(steps.length,3);
    assert.deepEqual(steps.map(x=>x.amountMinor),source==='STORE'?
      [54000,72000,54000]:[270000,360000,270000]);
    assert.deepEqual(steps.map(x=>x.kind),['DEPOSIT','MILESTONE','MILESTONE']);
    assert.equal(steps.reduce((sum,x)=>sum+x.amountMinor,0),total);
    assert.deepEqual(steps.map(x=>x.dueDay),[1,7,14]);
    assert.throws(()=>offlineObligations(0,source,'STAGED'));
    assert.throws(()=>offlineObligations(2,source,'STAGED'));
  });

  test(source+' rejects fake funding and out-of-order actors before any next step',()=>{
    let s=review(source);
    assert.equal(s.plan,'STAGED');
    const prompt=nextOfflineAction(s,source,NOW);
    assert.equal(prompt.participant,'CUSTOMER');
    assert.equal(prompt.dueAt,NOW+DAY);
    assert.equal(prompt.overdue,false);
    assert.equal(nextOfflineAction(s,source,NOW+25*DAY).overdue,true);
    assert.equal(prompt.notificationSent,false);
    assert.equal(prompt.delivery,'IN_APP_PREVIEW_ONLY');
    assert.equal(moveOfflineJourney(s,'PROVIDER','ACK_FICTIONAL_RESULT'),null);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','ACK_FICTIONAL_RESULT'),null);
    assert.equal(moveOfflineJourney(s,'PROVIDER','RECORD_SIMULATION','SIMULATED_CONFIRMED'),null);
    s=moveOfflineJourney(s,'CUSTOMER','RECORD_SIMULATION','SIMULATED_UNKNOWN');
    assert.match(nextOfflineAction(s,source).description,/do not retry/);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','ACK_FICTIONAL_RESULT'),null);
    s=moveOfflineJourney(s,'CUSTOMER','RECORD_SIMULATION','SIMULATED_FAILED');
    assert.equal(moveOfflineJourney(s,'CUSTOMER','ACK_FICTIONAL_RESULT'),null);
    assert.equal(OFFLINE_AUTHORITY.paymentVerified,false);
    assert.equal(OFFLINE_AUTHORITY.depositFunded,false);
  });

  test(source+' rehearses fictional deposit, evidence, concern, correction, approval and later stages',()=>{
    let s=review(source);
    const plan=offlineObligations(total,source,'STAGED');
    for(let i=0;i<plan.length;i++){
      s=simulateConfirmed(s);
      assert.equal(moveOfflineJourney(s,'PROVIDER','ACK_FICTIONAL_RESULT'),null);
      s=moveOfflineJourney(s,'CUSTOMER','ACK_FICTIONAL_RESULT');
      assert.equal(s.stage,'EVIDENCE_DUE');
      assert.equal(nextOfflineAction(s,source).participant,'PROVIDER');
      assert.equal(moveOfflineJourney(s,'CUSTOMER','SUBMIT_EVIDENCE','done'),null);
      assert.equal(moveOfflineJourney(s,'PROVIDER','SUBMIT_EVIDENCE',''),null);
      s=moveOfflineJourney(s,'PROVIDER','SUBMIT_EVIDENCE','Sample photos ready');
      assert.equal(s.stage,'BUYER_REVIEW');
      assert.equal(nextOfflineAction(s,source).participant,'CUSTOMER');
      assert.equal(moveOfflineJourney(s,'PROVIDER','APPROVE_STAGE','',plan.length),null);
      if(i===0){
        s=moveOfflineJourney(s,'CUSTOMER','RAISE_CONCERN','Please fix the alignment');
        assert.equal(s.stage,'CONCERN_OPEN');
        assert.equal(moveOfflineJourney(s,'CUSTOMER','APPROVE_STAGE','',plan.length),null);
        assert.equal(nextOfflineAction(s,source).participant,'PROVIDER');
        s=moveOfflineJourney(s,'PROVIDER','SUBMIT_EVIDENCE','Alignment corrected');
        assert.equal(s.stage,'BUYER_REVIEW');
        assert.equal(s.concern,'');
      }
      s=moveOfflineJourney(s,'CUSTOMER','APPROVE_STAGE','',plan.length);
      assert.equal(s.stage,i===plan.length-1?'DONE':'FUNDING_PREVIEW');
      assert.equal(s.obligationIndex,i===plan.length-1?i:i+1);
      assert.equal(s.simulatedResult,'NOT_STARTED');
      assert.equal(s.evidence,'');
      assert.equal(moveOfflineJourney(s,'CUSTOMER','ACK_FICTIONAL_RESULT'),null);
    }
    assert.equal(nextOfflineAction(s,source).title,'Sample journey completed — NOT PAID');
    assert.equal(moveOfflineJourney(s,'CUSTOMER','APPROVE_STAGE','',plan.length),null);
    assert.equal(OFFLINE_AUTHORITY.mayFulfil,false);
    assert.equal(OFFLINE_AUTHORITY.notificationsSent,false);
    assert.equal(OFFLINE_AUTHORITY.moneyMoved,false);
  });

  test(source+' changing schedule or source invalidates BOTH sample reviews and pending stages',()=>{
    let s=createOfflineJourney('s1',NOW);
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_SOURCE');
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_TERMS');
    s=moveOfflineJourney(s,'CUSTOMER','SELECT_PLAN','STAGED');
    assert.equal(s.reviewed.PROVIDER,false);
    assert.equal(s.reviewed.CUSTOMER,false);
    assert.equal(s.revision,1);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION'),null);
    s=moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS');
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_TERMS');
    s=moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION');
    s=simulateConfirmed(s);
    s=moveOfflineJourney(s,'CUSTOMER','SOURCE_CHANGED');
    assert.equal(s.plan,'FULL');
    assert.equal(s.stage,'SOURCE_REVIEW');
    assert.equal(s.reviewed.CUSTOMER,false);
    assert.equal(s.reviewed.PROVIDER,false);
    assert.equal(s.simulatedResult,'NOT_STARTED');
    assert.equal(s.obligationIndex,0);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','ACK_FICTIONAL_RESULT'),null);
  });
}

test('splits are exact in minor units, never invent fractions or excess obligations',()=>{
  for(const amount of [3,19,101,10101,125501,900001,999999999999]){
    const items=offlineObligations(amount,'STORE','STAGED');
    assert.ok(items.every(x=>x.amountMinor>0&&Number.isSafeInteger(x.amountMinor)));
    assert.equal(items.reduce((n,x)=>n+x.amountMinor,0),amount);
  }
});

test('all transaction and notification authority remains false, including at completion',()=>{
  assert.equal(OFFLINE_AUTHORITY.simulationOnly,true);
  for(const [k,v] of Object.entries(OFFLINE_AUTHORITY)){
    if(k!=='simulationOnly')assert.equal(v,false,k);
  }
});

test('the existing Mini owns schedule, evidence and next-action UI without a separate checkout',()=>{
  const mini=read('src/mini/MiniExperience.tsx');
  const view=read('src/mini/MiniHostedCheckoutDemo.tsx');
  const finance=read('src/mini/MiniFundingPreview.tsx');
  assert.match(mini,/journeyMode=\{journeyMode\}/);
  assert.match(view,/offlineObligations\(record.amountMinor,record.source,journey.plan\)/);
  assert.match(view,/Deposit \+ stages/);
  assert.match(view,/Submit sample evidence/);
  assert.match(view,/Raise a sample concern/);
  assert.match(view,/Show overdue action reminder/);
  assert.match(view,/Continue sample work step/);
  assert.match(view,/key=\{journeyMode \? 'offline-'/);
  assert.match(view,/guidedDemo=\{!journeyMode\}/);
  assert.match(view,/onDemoStateChange=\{onStatusChange\}/);
  assert.match(view,/NOT PAID/);
  assert.match(finance,/SIMULATION ONLY/);
  assert.doesNotMatch(view+read('src/mini/offlineAgreementJourney.ts'),
    /fetch\(|sendWhatsApp\(|sendEmail\(|\.initiate\(|fundFromSelf\(|createPaymentIntent/);
});
