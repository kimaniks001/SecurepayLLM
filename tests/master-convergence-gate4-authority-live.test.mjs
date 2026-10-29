import test from 'node:test';
import assert from 'node:assert/strict';
import {runGate4Authority,validateGate4Fixture} from '../testing/master-convergence-gate4-authority-live.mjs';
import {examples,CURRENT_VERSION} from '../testing/master-convergence-gate2-fee-probe.mjs';
const tokenOne='A'.repeat(40),tokenTwo='B'.repeat(40);
const fixture=()=>({
 baseUrl:'http://127.0.0.1:8080',uiSha:'a'.repeat(40),apiSha:'b'.repeat(40),
 firstToken:tokenOne,secondToken:tokenTwo,
});
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
function apiMock({sameSubscription=false,leakWithoutAuth=false,wrongBucket=false,
                   enabledWithoutCompletion=false,stalePlan=false}={}){
 const calls=[];
 const handler=async(url,request)=>{
  calls.push({path:new URL(url).pathname,method:request.method});
  assert.equal(request.method,'GET');
  assert.equal(request.body,undefined);
  const path=new URL(url).pathname;
  const token=request.headers.Authorization;
  if(path==='/api/v1/pricing/platform-fee'){
   const amount=Number(new URL(url).searchParams.get('qualifyingAmountMinor'));
   if(amount===500000100)return json({error:'schedule undefined'},422);
   const e=examples.find(x=>x.minor===amount);
   assert.ok(e);
   return json({qualifyingAmountMinor:e.minor,currency:'KES',
     platformFeeMinor:e.feeMinor,band:e.band,pricingVersion:CURRENT_VERSION});
  }
  if(!token)return json(leakWithoutAuth?{subscriptionId:'leak'}:{message:'unauthenticated'},leakWithoutAuth?200:401);
  assert.ok(['Bearer '+tokenOne,'Bearer '+tokenTwo].includes(token));
  const second=token==='Bearer '+tokenTwo;
  const id=sameSubscription?'subscription-one':(second?'subscription-two':'subscription-one');
  const plan=second?'BUSINESS':'FOR_YOU';
  if(path==='/api/v1/subscriptions/me')return json({
   subscriptionId:id,plan,monthlyFeeMinor:stalePlan?777:second?20000:10000,currency:'KES',
 });
  if(path==='/api/v1/subscriptions/me/activation-agreement')return json({
   agreementId:second?'agreement-two':'agreement-one',contentHash:'content-hash-one',
   confirmed:true,
 });
  if(path==='/api/v1/subscriptions/me/activation-funding')return json({
   subscriptionId:id,agreementConfirmed:true,
   financiallyEnabled:enabledWithoutCompletion,
   nextAction:'AWAIT_VERIFICATION_RECONCILIATION',
   components:[
    {componentType:'SECUREPAY_SUBSCRIPTION_FEE',amountMinor:wrongBucket?1234:second?20000:10000,currency:'KES',state:'EARNED'},
    {componentType:'ACTIVATION_VERIFICATION_RETURN',amountMinor:10000,currency:'KES',state:'CONFIRMED'},
    {componentType:'ACTIVATION_REVIEW_RESERVE',amountMinor:20000,currency:'KES',state:'RESERVED'},
   ],
  });
  throw Error('Unexpected private read '+path);
 };
 return {handler,calls};
}
test('Gate 4 live probe refuses production/staging and identical identity tokens',()=>{
 for(const url of ['https://securepay.ke','http://192.168.1.9:8080','https://localhost:8080']){
  assert.throws(()=>validateGate4Fixture({...fixture(),baseUrl:url}),/loopback/);
 }
 assert.throws(()=>validateGate4Fixture({...fixture(),secondToken:tokenOne}),/DIFFERENT/);
 assert.throws(()=>validateGate4Fixture({...fixture(),apiSha:'latest'}),/SHAs/);
});
test('Gate 4 read-only synthetic protocol isolates two identities and checks actual pricing rules',async()=>{
 const mock=apiMock();
 const result=await runGate4Authority(fixture(),{fetchImpl:mock.handler});
 assert.equal(result.result,'SYNTHETIC_PROTOCOL_PASS');
 assert.equal(result.accounts.length,2);
 assert.equal(result.pricingBands,8);
 assert.equal(result.aboveCeilingRefused,true);
 assert.equal(result.moneyExecution,'NOT_ATTEMPTED');
 assert.equal(mock.calls.every(c=>c.method==='GET'),true);
 assert.equal(mock.calls.length,14); // 1 anonymous + 3 reads per actor + 7 public quotes
});
test('Gate 4 isolation fails when authenticated identity reads return the same subscription',async()=>{
 await assert.rejects(()=>runGate4Authority(fixture(),{
  fetchImpl:apiMock({sameSubscription:true}).handler}),/same private subscription/);
});
test('Gate 4 fails closed on anonymous access, wrong fee, or premature financial enablement',async()=>{
 for(const [opts,re] of [
  [{leakWithoutAuth:true},/Unauthenticated subscription/],
  [{wrongBucket:true},/Funding split/],
  [{enabledWithoutCompletion:true},/Money enabled despite/],
  [{stalePlan:true},/Subscription monthly amount/],
 ]){
  await assert.rejects(()=>runGate4Authority(fixture(),{fetchImpl:apiMock(opts).handler}),re,
   JSON.stringify(opts));
 }
});
