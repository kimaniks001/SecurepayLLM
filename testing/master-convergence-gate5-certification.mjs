/**
 * Master Convergence Gate 5 — ONE integrated pre-release certification register.
 *
 * This is read-only evidence aggregation, not a deployer or an identity oracle.
 * It enforces evidence from the already-approved Gate 2, Gate 3, Gate 4 and
 * True North Gate 7 checks, plus release-operations prerequisites.
 * Links and human statements MUST be independently inspected; JSON is not
 * a cryptographic proof and cannot authorise production or enable Money.
 *
 * node testing/master-convergence-gate5-certification.mjs \
 *   --evidence testing/master-convergence-gate5-evidence.json \
 *   --ui-sha "$(git rev-parse HEAD)" --api-sha "<exact API SHA>"
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {evaluateGate2} from './master-convergence-gate2-evidence.mjs';
import {evaluateGate3} from './master-convergence-gate3-certification.mjs';
import {evaluateGate4} from './master-convergence-gate4-certification.mjs';
import {evaluateGate7Evidence} from './true-north-gate7-certification.mjs';

const hex40=/^[0-9a-f]{40}$/i;
export const gate5ReleaseChecks=Object.freeze([
 {id:'ui_exact_head_ci',repo:'SecurepayLLM',
  title:'Exact UI commit full tests, TypeScript, lint, build and signed-in desktop/mobile'},
 {id:'api_exact_head_ci',repo:'SecurePayAPI',
  title:'Exact API commit Java 21 full tests, Flyway, boot and PostgreSQL integration'},
 {id:'deployment_isolation',repo:'SecurePayAPI',
  title:'Disposable isolated environment with model and media providers separated from production'},
 {id:'sensitive_data_and_access',repo:'SecurePayAPI',
  title:'Cross-user denial, private media security, PII handling, secrets and retention review'},
 {id:'migration_and_rollback',repo:'SecurePayAPI',
  title:'Reversible cutover plan, compatible migrations, verified recovery and zero payments'},
 {id:'ops_observability',repo:'SecurePayAPI',
  title:'Health, audit trails, alerting, retries and idempotency under provider/rail failures'},
 {id:'commercial_terms_owner',repo:'SecurepayLLM',
  title:'Owner reviews exact progressive fees, activation-funding wording and public UX'},
 {id:'independent_final_review',repo:'SecurepayLLM',
  title:'Independently reviewed all matched evidence and owner explicitly permits only Gate 6 review'},
]);

const requiredKeys=['gate2','gate3','gate4','trueNorthGate7'];
const repoRun=(s,repo)=>typeof s==='string'&&
  new RegExp('^https://github\\.com/kimaniks001/'+repo+'/actions/runs/[0-9]+(?:/|$)').test(s);
const dateOk=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
export function evaluateMasterGate5(evidence,{uiSha,apiSha}={}){
 const blockers=[];
 const add=x=>{if(!blockers.includes(x))blockers.push(x);};
 if(!hex40.test(uiSha||''))add('Full 40-character UI commit required');
 if(!hex40.test(apiSha||''))add('Full 40-character API commit required');
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)){
  add('Gate 5 evidence register missing');
  return {decision:'NO_GO',blockers,completedSections:0,sections:[],reviewed:0,total:gate5ReleaseChecks.length};
 }
 if(evidence.environment!=='ISOLATED_DISPOSABLE')add('Must certify only disposable isolated backend');
 if(evidence.productionChanged!==false)add('Production must remain unchanged during Gate 5');
 if(evidence.financialExecutionDisabled!==true)add('Backend Money collection and release must remain disabled');
 if(evidence.uiSha!==uiSha||evidence.apiSha!==apiSha)add('Evidence must cite the EXACT tested UI/API pair');
 if(evidence.releaseApproved===true)add('Gate 5 cannot pre-authorise a Gate 6 production release');

 // Carry the original 4 authorities forward exactly. Do not translate their
 // statuses, override their decision, or treat a synthetic PASS as authentic.
 const evaluators=[
  ['gate2',evaluateGate2,'READY_FOR_HUMAN_GATE3_REVIEW'],
  ['gate3',evaluateGate3,'READY_FOR_MANUAL_GATE4_REVIEW'],
  ['gate4',evaluateGate4,'READY_FOR_MANUAL_GATE5_REVIEW'],
  ['trueNorthGate7',evaluateGate7Evidence,'READY_FOR_MANUAL_RELEASE_REVIEW'],
 ];
 const sections=evaluators.map(([id,evaluate,required])=>{
  const input=evidence.gates?.[id];
  if(!input||typeof input!=='object'){
   add(id+': missing prior-gate actual evidence');
   return {id,decision:'NO_GO',reviewed:0,total:0,blockers:['no evidence']};
  }
  let r;
  try{r=evaluate(input,{uiSha,apiSha});}catch(err){
   r={decision:'NO_GO',blockers:['Unable to evaluate '+id+': '+String(err)]};
  }
  if(r.decision!==required)add(id+': '+r.decision+' — '+(r.blockers||[]).slice(0,4).join(' | '));
  return {id,decision:r.decision,reviewed:r.reviewed??r.passed??0,total:r.total??0,
   blockers:(r.blockers||[]).slice(0,8)};
 });
 for(const id of requiredKeys)if(!sections.some(x=>x.id===id))add(id+': missing');

 const checks=gate5ReleaseChecks.map(rule=>{
  const x=evidence.checks?.[rule.id];
  const problems=[];
  if(x?.status!=='PASS')problems.push('actual result not passed');
  if(x?.execution!=='VERIFIED_ISOLATED_CI_OR_AUTHENTICATED_STAGING')
   problems.push('synthetic or source-only result is insufficient');
  if(x?.sha!==(rule.repo==='SecurepayLLM'?uiSha:apiSha))problems.push('test commit mismatch');
  if(!repoRun(x?.runUrl,rule.repo))problems.push('exact repository CI link missing');
  if(!dateOk(x?.reviewedAt))problems.push('review timestamp missing');
  if(typeof x?.reviewer!=='string'||x.reviewer.trim().length<3)
   problems.push('independent reviewer missing');
  if(typeof x?.evidenceNotes!=='string'||x.evidenceNotes.trim().length<25)
   problems.push('substantive evidence missing');
  if(x?.actualMoneyMoved!==false)problems.push('must attest no real money moved');
  if(x?.productionChanged!==false)problems.push('production isolation not attested');
  return {id:rule.id,name:rule.title,state:problems.length?'BLOCKED':'REVIEWABLE',reasons:problems};
 });
 for(const x of checks)if(x.state==='BLOCKED')add(x.id+': '+x.reasons.join('; '));
 const completedSections=sections.filter(x=>x.decision!=='NO_GO').length;
 const reviewed=checks.filter(x=>x.state==='REVIEWABLE').length;
 return {
  decision:blockers.length===0&&completedSections===4&&reviewed===checks.length
    ?'READY_FOR_OWNER_GATE6_DECISION':'NO_GO',
  uiSha,apiSha,completedSections,sections,reviewed,total:checks.length,checks,
  blockers,
  warning:'Ready means a documented human Gate 6 decision may be sought. It never merges, deploys, authorises funds, or overrides any missing real verification. JSON links are not independently verified by this evaluator.',
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const arg=flag=>{const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]};
 const file=arg('--evidence');
 if(!file)throw Error('Use --evidence <JSON> --ui-sha <40hex> --api-sha <40hex>');
 const r=evaluateMasterGate5(JSON.parse(readFileSync(file,'utf8')),
   {uiSha:arg('--ui-sha'),apiSha:arg('--api-sha')});
 console.log(JSON.stringify(r,null,2));
 if(r.decision!=='READY_FOR_OWNER_GATE6_DECISION')process.exitCode=1;
}
