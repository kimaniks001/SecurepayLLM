/**
 * Gate 4 — identity isolation, activation truth and fees, READ-ONLY API check.
 * Requires TWO disposable, separately authenticated accounts with existing
 * seeded subscription + activation Agreement. NEVER use customer tokens.
 *
 * GATE4_DISPOSABLE_ACK=YES GATE4_FIXTURE=/private/disposable-gate4.json \
 * node testing/master-convergence-gate4-authority-live.mjs
 *
 * Fixture: { "baseUrl":"http://127.0.0.1:8080",
 *  "uiSha":"<full SHA>","apiSha":"<full SHA>",
 *  "firstToken":"<disposable access token>","secondToken":"<other token>" }
 * Never commit this fixture. Only GET requests, no Money mutations.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {runFeeProbe,ensureLoopback} from './master-convergence-gate2-fee-probe.mjs';

const sha=/^[a-f0-9]{40}$/i;
const requireTrue=(ok,msg)=>{if(!ok)throw Error(msg);};
export function validateGate4Fixture(f){
 requireTrue(f&&typeof f==='object'&&!Array.isArray(f),'Local fixture required');
 const baseUrl=ensureLoopback(f.baseUrl);
 requireTrue(sha.test(f.uiSha)&&sha.test(f.apiSha),'Exact candidate SHAs required');
 requireTrue(typeof f.firstToken==='string'&&f.firstToken.length>=20,
   'Disposable actor one token missing');
 requireTrue(typeof f.secondToken==='string'&&f.secondToken.length>=20
   &&f.firstToken!==f.secondToken,'Second DIFFERENT disposable actor required');
 return {...f,baseUrl};
}
function requireMoneyTruth(f){
 requireTrue(typeof f.financiallyEnabled==='boolean','Financial enablement authority missing');
 requireTrue(Array.isArray(f.components)&&f.components.length===3,
   'Exactly three canonical funding buckets required');
 const types=f.components.map(x=>x.componentType);
 requireTrue(new Set(types).size===3,'Duplicate component types in activation');
 requireTrue(types.includes('SECUREPAY_SUBSCRIPTION_FEE')
   &&types.includes('ACTIVATION_VERIFICATION_RETURN')
   &&types.includes('ACTIVATION_REVIEW_RESERVE'),'Incomplete or unrecognised funding buckets');
 for(const x of f.components){
  requireTrue(x.currency==='KES'&&Number.isInteger(x.amountMinor)&&x.amountMinor>=0,
    'Untrusted funding component amount or currency');
  requireTrue(['NOT_STARTED','INTENDED','CONFIRMED','TRANSFERRED','RESERVED','EARNED','FAILED']
    .includes(x.state),'Unknown funding state');
 }
 if(f.financiallyEnabled){
  const by=Object.fromEntries(f.components.map(x=>[x.componentType,x.state]));
  requireTrue(f.agreementConfirmed===true,'Money enabled without confirmed activation Agreement');
  requireTrue(by.SECUREPAY_SUBSCRIPTION_FEE==='EARNED'
    &&by.ACTIVATION_VERIFICATION_RETURN==='TRANSFERRED'
    &&by.ACTIVATION_REVIEW_RESERVE==='RESERVED',
    'Money enabled despite unfinished revenue, verification or reserve component');
 }
}
async function request(f,endpoint,token,fetchImpl=fetch){
 const response=await fetchImpl(f.baseUrl+endpoint,{
  method:'GET',headers:{"Accept":"application/json",
    ...(token?{"Authorization":"Bearer "+token}:{})},
  signal:AbortSignal.timeout(25_000),redirect:'error',
 });
 if(response.status!==200)throw Error('Read '+endpoint+' returned HTTP '+response.status);
 const x=await response.json();
 requireTrue(x&&typeof x==='object','Expected canonical JSON for '+endpoint);
 return x;
}
export async function runGate4Authority(fixture,{fetchImpl=fetch}={}){
 const f=validateGate4Fixture(fixture);
 const denied=await fetchImpl(f.baseUrl+'/api/v1/subscriptions/me',{
  method:'GET',headers:{Accept:'application/json'},redirect:'error',
  signal:AbortSignal.timeout(25_000),
 });
 requireTrue([401,403].includes(denied.status),'Unauthenticated subscription data was available');
 const distinct=new Set(),accounts=[];
 for(const token of [f.firstToken,f.secondToken]){
  const subscription=await request(f,'/api/v1/subscriptions/me',token,fetchImpl);
  const agreement=await request(f,'/api/v1/subscriptions/me/activation-agreement',token,fetchImpl);
  const funding=await request(f,'/api/v1/subscriptions/me/activation-funding',token,fetchImpl);
  requireTrue(typeof subscription.subscriptionId==='string'&&subscription.subscriptionId.length>5,
    'Subscription ID missing');
  requireTrue(!distinct.has(subscription.subscriptionId),'Two identities returned the same private subscription');
  distinct.add(subscription.subscriptionId);
  requireTrue(funding.subscriptionId===subscription.subscriptionId,
    'Funding belongs to another subscription');
  requireTrue(typeof agreement.agreementId==='string'&&agreement.agreementId.length>5
    &&typeof agreement.contentHash==='string'&&agreement.contentHash.length>=5,
    'Canonical activation Agreement/version proof missing');
  requireTrue(agreement.confirmed===funding.agreementConfirmed,
    'Funding/Agreement confirmation contradictory');
  requireTrue(['FOR_YOU','BUSINESS'].includes(subscription.plan)
    &&subscription.currency==='KES','Unknown plan/currency');
  requireTrue(subscription.monthlyFeeMinor===(subscription.plan==='FOR_YOU'?10000:20000),
    'Subscription monthly amount differs from current backend-approved pricing policy');
  requireMoneyTruth(funding);
  const actualAmounts=Object.fromEntries(funding.components.map(x=>[x.componentType,x.amountMinor]));
  requireTrue(actualAmounts.SECUREPAY_SUBSCRIPTION_FEE===subscription.monthlyFeeMinor
    &&actualAmounts.ACTIVATION_VERIFICATION_RETURN===10000
    &&actualAmounts.ACTIVATION_REVIEW_RESERVE===20000,
    'Funding split not the authorised subscription/return/reserve policy');
  accounts.push({plan:subscription.plan,privateRecordsIsolated:true,
    activationAgreementChecked:true,fundingStatusChecked:true,
    noFundingActionTriggered:true});
 }
 const pricing=await runFeeProbe(f.baseUrl,{fetchImpl});
 return {result:fetchImpl===fetch?'NATIVE_READ_ONLY_API_PASS':'SYNTHETIC_PROTOCOL_PASS',
   uiSha:f.uiSha,apiSha:f.apiSha,accounts,pricingBands:pricing.checked.length,
   aboveCeilingRefused:pricing.aboveScheduleRefused,
   moneyExecution:'NOT_ATTEMPTED',
   warning:'Read-only results are not a payment/activation certification. Check actual underlying actor identity, provider logs and Money feature flags independently.'};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 if(process.env.GATE4_DISPOSABLE_ACK!=='YES')throw Error('GATE4_DISPOSABLE_ACK=YES required for isolated use');
 if(!process.env.GATE4_FIXTURE)throw Error('GATE4_FIXTURE path required');
 const f=JSON.parse(readFileSync(process.env.GATE4_FIXTURE,'utf8'));
 console.log(JSON.stringify(await runGate4Authority(f),null,2));
}
