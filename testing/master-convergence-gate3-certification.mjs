/**
 * Master Convergence Gate 3 — independent evidence gate.
 * This does NOT execute Java, network, provider or Money operations.
 * Status REVIEWABLE means independently inspect all cited CI and redacted
 * provider logs; it is not production or payment approval.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const sha=/^[a-f0-9]{40}$/i;
export const requiredGate3Evidence=Object.freeze([
 {id:'api_java_fair_trade',repo:'SecurePayAPI',
  description:'Exact combined API Java test, 12-lens projector and migrations'},
 {id:'provider_live_identity',repo:'SecurePayAPI',
  description:'Provider configuration and actual native model request/reply attested without leaking credentials'},
 {id:'three_conversations',repo:'SecurePayAPI',
  description:'New Nakuru intention, unpriced goods and paid project; each continues after a material answer'},
 {id:'missing_material_truth',repo:'SecurePayAPI',
  description:'One next material question inside KS001 chat; no repeated answered questions, fabricated goods price or worker acceptance'},
 {id:'versioned_twelve_lenses',repo:'SecurePayAPI',
  description:'Exactly 12 independently truthful lens states, current Trade Context version and no invented certificate'},
 {id:'source_and_consent_boundary',repo:'SecurePayAPI',
  description:'No receipt-as-reading; source lineage, privacy, draft-versus-acceptance and no Money action'},
 {id:'signed_in_living_workspace',repo:'SecurepayLLM',
  description:'Same KS001, conversation and version displayed on authenticated desktop/mobile including recovery'},
]);
function linkOk(link,repo){
 return typeof link==='string'&&new RegExp('^https://github\\.com/kimaniks001/'+repo+'/actions/runs/[0-9]+(?:/|$)').test(link);
}
export function evaluateGate3(e,{uiSha,apiSha}={}){
 const blockers=[];
 if(!sha.test(uiSha||'')||!sha.test(apiSha||''))blockers.push('Both exact source SHAs required.');
 if(!e||e.environment!=='ISOLATED_DISPOSABLE')blockers.push('Only disposable isolated staging accepted.');
 if(e?.financialExecutionDisabled!==true||e?.productionChanged!==false)
  blockers.push('Production must remain unchanged and Money execution disabled.');
 if(e?.uiSha!==uiSha||e?.apiSha!==apiSha)blockers.push('Evidence not bound to exact tested commit pair.');
 const checks=requiredGate3Evidence.map(k=>{
  const v=e?.checks?.[k.id];const errs=[];
  if(v?.status!=='PASS')errs.push('no observed pass');
  if(v?.execution!=='REAL_API_OR_AUTHENTICATED_BROWSER')errs.push('synthetic results excluded');
  if(v?.sha!==(k.repo==='SecurepayLLM'?uiSha:apiSha))errs.push('SHA mismatch');
  if(!linkOk(v?.runUrl,k.repo))errs.push('matching CI run not cited');
  if(typeof v?.reviewer!=='string'||v.reviewer.trim().length<3)errs.push('reviewer missing');
  if(typeof v?.notes!=='string'||v.notes.trim().length<20)errs.push('substantive evidence missing');
  if(!Number.isFinite(Date.parse(v?.reviewedAt||'')))errs.push('review timestamp missing');
  if(v?.fundsMoved===true)errs.push('actual money moved');
  return {id:k.id,description:k.description,state:errs.length?'BLOCKED':'REVIEWABLE',reasons:errs};
 });
 for(const x of checks)if(x.state==='BLOCKED')blockers.push(x.id+': '+x.reasons.join('; '));
 return {decision:blockers.length?'NO_GO':'READY_FOR_MANUAL_GATE4_REVIEW',
  reviewed:checks.filter(x=>x.state==='REVIEWABLE').length,total:checks.length,
  blockers,checks,warning:'Self-attested JSON and GitHub links require independent inspection. Never deploy from this evaluator.'};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const arg=flag=>{const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]};
 const file=arg('--evidence');
 if(!file)throw Error('Use --evidence <JSON> --ui-sha <40hex> --api-sha <40hex>');
 const r=evaluateGate3(JSON.parse(readFileSync(file,'utf8')),
    {uiSha:arg('--ui-sha'),apiSha:arg('--api-sha')});
 console.log(JSON.stringify(r,null,2));
 if(r.decision!=='READY_FOR_MANUAL_GATE4_REVIEW')process.exitCode=1;
}
