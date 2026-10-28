import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateGate3,requiredGate3Evidence} from '../testing/master-convergence-gate3-certification.mjs';
const UI='a'.repeat(40),API='b'.repeat(40);
const base=JSON.parse(readFileSync(new URL('../testing/master-convergence-gate3-evidence.json',import.meta.url),'utf8'));
const complete=()=>{
 const checks={};
 for(const item of requiredGate3Evidence)checks[item.id]={
   status:'PASS',execution:'REAL_API_OR_AUTHENTICATED_BROWSER',
   sha:item.repo==='SecurePayAPI'?API:UI,
   runUrl:'https://github.com/kimaniks001/'+item.repo+'/actions/runs/12345',
   reviewer:'Named independent reviewer',reviewedAt:'2026-10-28T10:00:00Z',
   notes:'All linked real API execution logs need independent inspection and source binding.',
   fundsMoved:false,
 };
 return {...base,uiSha:UI,apiSha:API,checks};
};
test('Gate 3: zero source evidence is NO_GO for all seven domains',()=>{
 const r=evaluateGate3(base,{uiSha:UI,apiSha:API});
 assert.equal(r.decision,'NO_GO');assert.equal(r.reviewed,0);assert.equal(r.total,7);
});
test('Gate 3: a synthetic provider must never pass as live intelligence',()=>{
 const e=complete();e.checks.three_conversations.execution='SYNTHETIC_ADAPTER';
 assert.equal(evaluateGate3(e,{uiSha:UI,apiSha:API}).decision,'NO_GO');
});
test('Gate 3: any unverified API Java, provenance, consent or signed-in UI check blocks',()=>{
 for(const item of requiredGate3Evidence){
   const e=complete();e.checks[item.id].status='MISSING';
   assert.equal(evaluateGate3(e,{uiSha:UI,apiSha:API}).decision,'NO_GO',item.id);
 }
});
test('Gate 3: source SHA mismatch, production, actual payment and missing reviewer block',()=>{
 for(const override of [{apiSha:'wrong'},{productionChanged:true},{financialExecutionDisabled:false},
  {environment:'PRODUCTION'}]){
  assert.equal(evaluateGate3({...complete(),...override},{uiSha:UI,apiSha:API}).decision,'NO_GO');
 }
 const e=complete();e.checks.provider_live_identity.reviewer='';
 assert.equal(evaluateGate3(e,{uiSha:UI,apiSha:API}).decision,'NO_GO');
 const f=complete();f.checks.source_and_consent_boundary.fundsMoved=true;
 assert.equal(evaluateGate3(f,{uiSha:UI,apiSha:API}).decision,'NO_GO');
});
test('Gate 3: all documented evidence still requires a manual review, not deployment',()=>{
 const r=evaluateGate3(complete(),{uiSha:UI,apiSha:API});
 assert.equal(r.decision,'READY_FOR_MANUAL_GATE4_REVIEW');
 assert.equal(r.reviewed,7);
 assert.match(r.warning,/independent inspection/);
});
test('Gate 3: UI shows version-matched partial 12-lens advice, not certified green status',()=>{
 const s=readFileSync(new URL('../src/features/living-workspace/LiveWorkResultPanel.tsx',import.meta.url),'utf8');
 const shell=readFileSync(new URL('../src/features/living-workspace/Phase1LivingWorkspacePreview.tsx',import.meta.url),'utf8');
 assert.match(s,/examination\.data\.tradeContextVersion === formation\.version/);
 assert.match(s,/fairTrade\.principleCoverage\?\.length===12/);
 assert.match(s,/Unexamined principles are not approved/);
 assert.match(s,/A partial examination is never a clearance/);
 assert.match(shell,/reading\.status !== 'PARTIAL_ADVISORY'/);
});
