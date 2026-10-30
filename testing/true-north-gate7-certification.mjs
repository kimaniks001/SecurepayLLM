/**
 * True North Gate 7 — release-evidence evaluator (NO production operations).
 *
 * This is an EVIDENCE REGISTER, not a cryptographic verifier or an API runner.
 * A reviewer must independently validate every linked CI run, actor permission,
 * exact tested SHAs and screenshots/logs. Self-asserted JSON alone is not proof.
 *
 * Example:
 * node testing/true-north-gate7-certification.mjs \
 *   --evidence testing/true-north-gate7-evidence.json \
 *   --ui-sha "$(git rev-parse HEAD)" \
 *   --api-sha "<exact combined API commit SHA>"
 *
 * Prints a concise JSON report and exits non-zero on any blocker.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const hex40=/^[0-9a-f]{40}$/i;
const checks=[
  {id:'ui_full_convergence',name:'Combined UI build, typecheck, lint and all regression tests',repo:'SecurepayLLM'},
  {id:'ui_responsive_browser',name:'Authenticated responsive 1440/390/320 browser and KS001 handoffs',repo:'SecurepayLLM'},
  {id:'api_java_and_migration',name:'Combined API Java full test suite and disposable PostgreSQL migration',repo:'SecurePayAPI'},
  {id:'gate11_media_safety',name:'Two-account Community media upload, private Circle scope, EXIF removal, malware and retention',repo:'SecurePayAPI'},
  {id:'gate2_discovery_scope',name:'Private Circle exclusion, consented interests and membership revocation',repo:'SecurePayAPI'},
  {id:'gate3_twelve_to_four',name:'12 interested / 4 selected / 4 independent Join and confirm / 8 unselected denied',repo:'SecurePayAPI'},
  {id:'gate4_real_ks001',name:'Provider-equipped KS001 examines 12 lenses and continues with one missing-material question',repo:'SecurePayAPI'},
  {id:'gate5_agreement_evidence',name:'Two participants, versioned evidence, beneficiary review, completion and cross-user denial',repo:'SecurePayAPI'},
  {id:'gate5_money_authority',name:'Money state and authorisation read with payment/release execution disabled',repo:'SecurePayAPI'},
  {id:'gate6_public_consent',name:'Project-source/publication consent, privacy, cost truth, retry and no Agreement leakage',repo:'SecurePayAPI'},
  {id:'integrated_live_journey',name:'Single isolated end-to-end Circle→KS001→Agreement→evidence→Community story',repo:'SecurePayAPI'},
  {id:'rollback_and_release',name:'Staging isolation, preview visual approval, production rollback and owner release approval',repo:'SecurepayLLM'},
];
const allowedOrigin=repo=>new RegExp('^https://github\\.com/kimaniks001/'+repo+'/actions/runs/[0-9]+(?:/|$)');
export const requiredGate7Checks=Object.freeze(checks.map(x=>({...x})));

export function evaluateGate7Evidence(evidence,{uiSha,apiSha}={}) {
  const reasons=[];
  const add=x=>{if(!reasons.includes(x))reasons.push(x)};
  if(!hex40.test(uiSha||''))add('Exact combined UI commit SHA is required.');
  if(!hex40.test(apiSha||''))add('Exact combined API commit SHA is required.');
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)) {
    add('Gate 7 evidence register is missing.');
    return {decision:'NO_GO',passed:0,total:checks.length,blockers:reasons,checks:[]};
  }
  if(evidence.financialExecutionDisabled!==true)add('Financial execution must remain explicitly disabled in the isolated certification environment.');
  if(evidence.environment!=='ISOLATED_DISPOSABLE')add('Testing must be isolated and disposable, never production.');
  if(evidence.productionDeploymentApproved===true)add('This Gate 7 register must not authorise a production deployment.');
  const status=checks.map(rule=>{
    const item=evidence.checks?.[rule.id];
    const failures=[];
    if(!item||item.status!=='PASS')failures.push('not passed');
    if(item?.sha!==(rule.repo==='SecurepayLLM'?uiSha:apiSha))failures.push('exact commit mismatch');
    if(!item?.runUrl || !allowedOrigin(rule.repo).test(item.runUrl))failures.push('matching repository CI run link missing');
    if(!item?.evidenceNotes || typeof item.evidenceNotes!=='string' || item.evidenceNotes.trim().length<15)
      failures.push('substantive evidence notes missing');
    if(!item?.reviewedBy || typeof item.reviewedBy!=='string'||item.reviewedBy.trim().length<3)
      failures.push('human review attribution missing');
    if(!Number.isFinite(Date.parse(item?.reviewedAt||'')))failures.push('review date missing');
    return {id:rule.id,name:rule.name,state:failures.length?'BLOCKED':'REVIEWABLE',reasons:failures};
  });
  const passed=status.filter(x=>x.state==='REVIEWABLE').length;
  for(const item of status.filter(x=>x.state==='BLOCKED'))add(item.id+': '+item.reasons.join(', '));
  return {
    decision:reasons.length===0&&passed===checks.length?'READY_FOR_MANUAL_RELEASE_REVIEW':'NO_GO',
    passed,total:checks.length,blockers:reasons,checks:status,
    warning:'Linked evidence and attestation require independent human verification. This evaluator never executes API, browser, Money or deployment actions.',
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const value=flag=>{const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]??null};
  const file=value('--evidence');
  if(!file)throw new Error('Use --evidence <JSON file> (NO live tokens or secrets).');
  const data=JSON.parse(readFileSync(file,'utf8'));
  const report=evaluateGate7Evidence(data,{uiSha:value('--ui-sha'),apiSha:value('--api-sha')});
  console.log(JSON.stringify(report,null,2));
  if(report.decision!=='READY_FOR_MANUAL_RELEASE_REVIEW')process.exitCode=1;
}
