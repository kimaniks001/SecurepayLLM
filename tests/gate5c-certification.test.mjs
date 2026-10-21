import test from 'node:test';
import assert from 'node:assert/strict';
import { certify, JOURNEY_IDS } from '../scripts/gate5c-certify.mjs';
const sha = '3'.repeat(40);
const one = i => ({
  id:'anonymous-'+i, priorSecurePayExperience:false, coached:false, consent:true,
  device:i%2 ? 'mobile Android':'desktop Mac', candidateSha:sha,
  startedAt:'2026-10-21T12:00:00+03:00', evidenceRef:'private://review/session-'+i,
  journeys:JOURNEY_IDS.map(id => ({
    id, result:'pass', observation:'Observed uncoached independent completion.',
    evidenceRef:'private://review/session-'+i+'/'+id, defects:[],
  })),
});
const valid = () => ({
  candidate:{repo:'kimaniks001/SecurepayLLM',sha,deploymentSha:sha,previewUrl:'https://isolated-preview.vercel.app'},
  environment:{
    isolated:true,noRealMoney:true,noProductionWrites:true,noProductionReads:true,
    syntheticIdentitiesOnly:true,noExternalProviderWrites:true,connectedStagingReady:true,
    isolationEvidenceRef:'private://review/isolation',
    stagingDeploymentEvidenceRef:'private://review/deployment',
    gate4cEvidenceRef:'private://review/gate4c',
    verifiedAt:'2026-10-21T11:30:00+03:00',
  },
  sessions:[1,2,3,4,5].map(one),
});
const rejected = (reason, mutate) => test(reason, () => {
  const report=valid(); mutate(report);
  assert.equal(certify(report).status,'NOT_CERTIFIED');
});
test('only a complete claimed cohort reaches owner evidence review, never automatic certification', () => {
  const result=certify(valid());
  assert.equal(result.status,'ELIGIBLE_FOR_OWNER_REVIEW');
  assert.equal(result.passed,40);
  assert.match(result.note,/human reviewer/);
});
rejected('no participant evidence is never green',r => {r.sessions=[]});
rejected('coached participant is never green',r => {r.sessions[0].coached=true});
rejected('lack of consent is never green',r => {r.sessions[0].consent=false});
rejected('duplicate participant IDs cannot inflate cohort',r => {r.sessions[1].id=r.sessions[0].id});
rejected('missing journey fails',r => {r.sessions[0].journeys.pop()});
rejected('unrecognised extra journey fails',r => {r.sessions[0].journeys.push({id:'other',result:'pass'})});
rejected('journey without observation fails',r => {r.sessions[0].journeys[1].observation=''});
rejected('journey without evidence fails',r => {r.sessions[0].journeys[1].evidenceRef=''});
rejected('missing explicit defects array fails',r => {delete r.sessions[0].journeys[1].defects});
rejected('false-acceptance defect blocks even when journey is labelled pass',r => {
  r.sessions[0].journeys[6].defects.push({code:'false-acceptance',description:'Draft appears accepted'});
});
rejected('money misrepresentation blocks even when marked pass',r => {
  r.sessions[0].journeys[5].defects.push({code:'money-misrepresentation',description:'Misleading authorisation'});
});
rejected('failed journey fails',r => {r.sessions[0].journeys[2].result='fail'});
rejected('blocked journey fails',r => {r.sessions[0].journeys[2].result='blocked'});
rejected('no verified isolated staging fails',r => {r.environment.isolated=false});
rejected('no connected staging fails',r => {r.environment.connectedStagingReady=false});
rejected('no staging evidence fails',r => {r.environment.stagingDeploymentEvidenceRef=''});
rejected('provider write exposure fails',r => {r.environment.noExternalProviderWrites=false});
rejected('production read exposure fails',r => {r.environment.noProductionReads=false});
rejected('no mobile participant fails',r => {r.sessions.forEach(s=>s.device='desktop Mac')});
rejected('no desktop participant fails',r => {r.sessions.forEach(s=>s.device='mobile Android')});
rejected('invalid abbreviated candidate SHA fails',r => {r.candidate.sha='abc';r.candidate.deploymentSha='abc';r.sessions.forEach(s=>s.candidateSha='abc')});
rejected('wrong deployment SHA fails',r => {r.candidate.deploymentSha='4'.repeat(40)});
rejected('session on different commit fails',r => {r.sessions[0].candidateSha='4'.repeat(40)});
rejected('production URL is never a staging candidate',r => {r.candidate.previewUrl='https://securepay.ke'});
rejected('http URL is never an isolated preview',r => {r.candidate.previewUrl='http://isolated-preview.vercel.app'});
rejected('staging review without timestamp is insufficient',r => {r.environment.verifiedAt=''});
test('noncritical observation is retained for explicit owner review', () => {
  const report=valid();
  report.sessions[0].journeys[0].defects=[{code:'wording-confusion',description:'Did not recognise what Vision meant'}];
  const result=certify(report);
  assert.equal(result.status,'ELIGIBLE_FOR_OWNER_REVIEW');
  assert.equal(result.reviewItems.length,1);
});
test('null and primitive reports fail closed', () => {
  for(const value of [null,undefined,0,false,[], 'text'])
    assert.equal(certify(value).status,'NOT_CERTIFIED');
});
