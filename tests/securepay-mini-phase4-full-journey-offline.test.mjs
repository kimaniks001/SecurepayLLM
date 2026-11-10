import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/mini/offlineAgreementJourney.ts');
const js=ts.transpileModule(source,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const {createOfflineJourney,moveOfflineJourney,nextOfflineAction,OFFLINE_AUTHORITY}=model;

for(const kind of ['STORE','SHORTSTAYS']){
  test(kind+' starts at provider source review, never an authenticated reservation',()=>{
    const s=createOfflineJourney('fixture-v1');
    const nxt=nextOfflineAction(s,kind);
    assert.equal(s.stage,'SOURCE_REVIEW');
    assert.equal(nxt.participant,'PROVIDER');
    assert.match(nxt.title,kind==='STORE'?/Seller/:/Host/);
    assert.equal(nxt.simulatedOnly,true);
    assert.equal(nxt.agreementAccepted,false);
    assert.equal(nxt.paymentEnabled,false);
    assert.equal(nxt.notificationSent,false);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','REVIEW_SOURCE'),null);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS'),null);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION'),null);
  });

  test(kind+' needs both distinct reviews of the same fixture version before simulated payment',()=>{
    let s=createOfflineJourney(kind+'-source-v1');
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_SOURCE');
    assert.equal(s.stage,'TERMS_REVIEW');
    assert.equal(moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION'),null);
    s=moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS');
    assert.equal(s.reviewed.CUSTOMER,true);
    assert.equal(s.reviewed.PROVIDER,false);
    assert.equal(nextOfflineAction(s,kind).participant,'PROVIDER');
    assert.equal(moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS'),null);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION'),null);
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_TERMS');
    assert.equal(s.reviewed.PROVIDER,true);
    assert.equal(nextOfflineAction(s,kind).participant,'CUSTOMER');
    assert.equal(moveOfflineJourney(s,'PROVIDER','CONTINUE_SIMULATION'),null);
    s=moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION');
    assert.equal(s.stage,'FUNDING_PREVIEW');
    assert.equal(s.sourceVersion,kind+'-source-v1');
    assert.equal(s.revision,0);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS'),null);
  });

  test(kind+' source revision resets all approvals and payment preview eligibility',()=>{
    let s=createOfflineJourney(kind+'-v1');
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_SOURCE');
    s=moveOfflineJourney(s,'PROVIDER','REVIEW_TERMS');
    s=moveOfflineJourney(s,'CUSTOMER','REVIEW_TERMS');
    s=moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION');
    assert.equal(s.stage,'FUNDING_PREVIEW');
    s=moveOfflineJourney(s,'CUSTOMER','SOURCE_CHANGED');
    assert.equal(s.stage,'SOURCE_REVIEW');
    assert.equal(s.revision,1);
    assert.equal(s.reviewed.CUSTOMER,false);
    assert.equal(s.reviewed.PROVIDER,false);
    assert.equal(s.sourceReviewed,false);
    assert.equal(moveOfflineJourney(s,'CUSTOMER','CONTINUE_SIMULATION'),null);
    assert.equal(moveOfflineJourney(s,'HACKER','REVIEW_SOURCE'),null);
  });
}
test('all financial/notification authority remains FALSE for the entire offline rehearsal',()=>{
  assert.equal(OFFLINE_AUTHORITY.simulationOnly,true);
  for(const [k,v] of Object.entries(OFFLINE_AUTHORITY)){
    if(k==='simulationOnly')continue;
    assert.equal(v,false,k+' must be false');
  }
});
test('full-journey mode reuses existing Mini and funding simulator; default checkout is intact',()=>{
  const mini=read('src/mini/MiniExperience.tsx');
  const checkout=read('src/mini/MiniHostedCheckoutDemo.tsx');
  const funding=read('src/mini/MiniFundingPreview.tsx');
  assert.match(mini,/journeyMode = urlParams\?\.get\('journey'\) === '1'/);
  assert.match(mini,/<MiniHostedCheckoutDemo record=\{demoRecord\} language=\{lang\} journeyMode=\{journeyMode\}/);
  assert.match(checkout,/journeyMode = false/);
  assert.match(checkout,/guidedDemo=\{!journeyMode\}/);
  assert.match(checkout,/reviewed\.CUSTOMER/);
  assert.match(checkout,/reviewed\.PROVIDER/);
  assert.match(checkout,/Test changed source \/ revised terms/);
  assert.match(checkout,/key=\{journeyMode \? 'offline-'/);
  assert.match(checkout,/MiniFundingPreview/);
  assert.match(funding,/SIMULATION ONLY/);
  assert.doesNotMatch(source+checkout,/\.initiate\(|PaymentIntent|fundFromSelf|sendWhatsApp|sendEmail|providerCallback|createCheckoutSession/);
});
