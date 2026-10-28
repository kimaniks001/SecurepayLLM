/**
 * Master Convergence Gate 4 — fail-closed identity and Money release evidence.
 *
 * Never runs payment, billing intent, signup, backend tests or production deploy.
 * Reviewers must independently inspect exact-SHA CI, actor identities and logs.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const sha=/^[0-9a-f]{40}$/i;
export const gate4Checks=Object.freeze([
 {id:'java_and_schema',repo:'SecurePayAPI',title:'Exact API Java tests, migrations, auth and settlement feature flags'},
 {id:'two_account_authority',repo:'SecurePayAPI',title:'Two independent KS identities, caller-scoped plans/funding and anonymous denial'},
 {id:'identity_issuance',repo:'SecurePayAPI',title:'KS Number issuance, MFA and activation distinct from identity, no enumeration'},
 {id:'activation_consent',repo:'SecurePayAPI',title:'Versioned activation Agreement, independent human consent, no billing intent before confirmation'},
 {id:'financial_components',repo:'SecurePayAPI',title:'First subscription, return verification and customer Review Reserve tracked separately'},
 {id:'progressive_fees',repo:'SecurePayAPI',title:'Live quote version and all fee boundaries, caps and above-ceiling refusal'},
 {id:'money_safeguards',repo:'SecurePayAPI',title:'PaymentReady separate from movement/release, retry idempotency and zero execution'},
 {id:'signed_in_responsive',repo:'SecurepayLLM',title:'Signed-in desktop/mobile session swap, stale responses, no private disclosure'},
]);
function validRun(s,repo){
 return typeof s==='string'&&new RegExp('^https://github\\.com/kimaniks001/'+repo+'/actions/runs/[0-9]+(?:/|$)').test(s);
}
export function evaluateGate4(e,{uiSha,apiSha}={}){
 const blockers=[];
 if(!sha.test(uiSha||'')||!sha.test(apiSha||''))blockers.push('Exact UI and API SHA missing');
 if(e?.environment!=='ISOLATED_DISPOSABLE')blockers.push('Only isolated disposable test environments qualify');
 if(e?.productionChanged!==false||e?.financialExecutionDisabled!==true)
   blockers.push('Production must stay unchanged and all payment/release execution disabled');
 if(e?.uiSha!==uiSha||e?.apiSha!==apiSha)
   blockers.push('Evidence must match both exact tested commits');
 const status=gate4Checks.map(c=>{
  const x=e?.checks?.[c.id],reasons=[];
  if(x?.status!=='PASS')reasons.push('no real pass');
  if(x?.execution!=='AUTHENTICATED_REAL_BACKEND_OR_BROWSER')
    reasons.push('synthetic or source-only test is insufficient');
  if(x?.sha!==(c.repo==='SecurePayAPI'?apiSha:uiSha))reasons.push('exact SHA mismatch');
  if(!validRun(x?.runUrl,c.repo))reasons.push('matching CI evidence link missing');
  if(typeof x?.reviewer!=='string'||x.reviewer.trim().length<3)reasons.push('human reviewer missing');
  if(typeof x?.reviewNotes!=='string'||x.reviewNotes.trim().length<20)reasons.push('meaningful findings missing');
  if(!Number.isFinite(Date.parse(x?.reviewedAt||'')))reasons.push('timestamp missing');
  if(x?.anyRealMoneyMoved===true)reasons.push('unsafe actual funds movement');
  return {id:c.id,title:c.title,state:reasons.length?'BLOCKED':'REVIEWABLE',reasons};
 });
 for(const x of status)if(x.state==='BLOCKED')blockers.push(x.id+': '+x.reasons.join(', '));
 return {decision:blockers.length?'NO_GO':'READY_FOR_MANUAL_GATE5_REVIEW',
  reviewed:status.filter(x=>x.state==='REVIEWABLE').length,total:status.length,blockers,checks:status,
  warning:'Linked CI and human notes require independent verification. This evaluator is never production deployment or Money authorisation.'};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const arg=flag=>{const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]};
 const file=arg('--evidence');
 if(!file)throw Error('Provide --evidence <JSON> --ui-sha <40hex> --api-sha <40hex>');
 const r=evaluateGate4(JSON.parse(readFileSync(file,'utf8')),
  {uiSha:arg('--ui-sha'),apiSha:arg('--api-sha')});
 console.log(JSON.stringify(r,null,2));
 if(r.decision!=='READY_FOR_MANUAL_GATE5_REVIEW')process.exitCode=1;
}
