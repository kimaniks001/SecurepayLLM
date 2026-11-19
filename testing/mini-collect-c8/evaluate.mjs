/**
 * Mini Collect C8 — read-only twenty-person acceptance evidence evaluator.
 * A register is not proof of people's identities or their independent review.
 * It NEVER permits a production release, Money, a bank integration or refunds.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const REQUIRED_COUNT=20;
const CASE_IDS=Object.freeze(Array.from({length:REQUIRED_COUNT},
  (_,i)=>'C8-UAT-'+String(i+1).padStart(2,'0')));

export function evaluateMiniCollectC8Acceptance(register) {
  const blockers=[];
  const add=x=>{if(!blockers.includes(x))blockers.push(x);};
  if(!register||typeof register!=='object'||Array.isArray(register))
    return {decision:'NO_GO',blockers:['Real-person acceptance register is missing'],
      completed:0,passed:0,required:REQUIRED_COUNT,
      financialExecutionAuthorized:false,releaseApproved:false};
  if(register.schemaVersion!=='mini-collect-c8-20-person-acceptance-v1')
    add('Unknown C8 UAT evidence format');
  if(register.environment!=='ISOLATED_PREVIEW_SANDBOX_NO_LIVE_MONEY')
    add('No live customer money in acceptance');
  if(register.independentRealPeopleRequired!==REQUIRED_COUNT)
    add('Exactly 20 distinct real people are required');
  if(register.summary?.releaseApproved!==false)
    add('UAT cannot pre-approve a release');
  const cases=Array.isArray(register.cases)?register.cases:[];
  if(cases.length!==REQUIRED_COUNT)add('All 20 acceptance cases are mandatory');
  const seen=new Set();
  let completed=0,passed=0;
  for(let i=0;i<cases.length;i++){
    const c=cases[i];
    if(!c||typeof c!=='object') { add('Malformed UAT case '+i);continue; }
    if(c.caseId!==CASE_IDS[i])add('Missing, duplicate or out-of-order UAT case '+i);
    if(typeof c.role!=='string'||c.role.length<5
      ||typeof c.scenario!=='string'||c.scenario.length<25
      ||typeof c.expectedOutcome!=='string'||c.expectedOutcome.length<25)
        add(c.caseId+': substantive scenario and expectation required');
    if(c.status!=='NOT_TESTED')completed++;
    if(c.status==='PASS')passed++;
    if(c.status!=='PASS')add(c.caseId+': actual acceptance not passed');
    if(c.distinctTesterConfirmed!==true||c.participantConsent!==true)
      add(c.caseId+': independent tester and consent not confirmed');
    const pseudonym=c.testerPseudonym;
    if(typeof pseudonym!=='string'||pseudonym.trim().length<3)
      add(c.caseId+': pseudonym missing');
    else if(seen.has(pseudonym.trim().toLowerCase()))
      add(c.caseId+': duplicate person');
    else seen.add(pseudonym.trim().toLowerCase());
    if(typeof c.deviceAndBrowser!=='string'||c.deviceAndBrowser.length<6)
      add(c.caseId+': real device and browser missing');
    if(typeof c.testEvidenceRef!=='string'
      ||!c.testEvidenceRef.startsWith('https://')||c.testEvidenceRef.length<24)
      add(c.caseId+': secure test evidence reference missing');
    if(typeof c.observedResult!=='string'||c.observedResult.length<30)
      add(c.caseId+': observed journey not recorded');
    if(!Number.isInteger(c.usabilityScore)||c.usabilityScore<1||c.usabilityScore>5)
      add(c.caseId+': actual usability rating missing');
    if(!Array.isArray(c.defects)||c.defects.length!==0)
      add(c.caseId+': unresolved defects not cleared');
    if(typeof c.facilitator!=='string'||c.facilitator.length<3)
      add(c.caseId+': facilitator or independent reviewer missing');
    if(typeof c.verifiedAt!=='string'||!Number.isFinite(Date.parse(c.verifiedAt)))
      add(c.caseId+': timestamp missing');
  }
  if(register.summary?.completed!==completed || register.summary?.passed!==passed)
    add('Reported acceptance totals do not match actual cases');
  if(register.summary?.failed!==cases.filter(x=>x?.status==='FAIL').length)
    add('Reported failed cases do not match actual cases');
  return {
    decision:blockers.length===0?'READY_FOR_INDEPENDENT_HUMAN_REVIEW':'NO_GO',
    completed,passed,required:REQUIRED_COUNT,blockers,
    financialExecutionAuthorized:false,releaseApproved:false,
    warning:'Register values are untrusted self-reported evidence. Independent human verification, genuine provider certification and owner release authority remain separate.'
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const file=process.argv[2]||new URL('./acceptance-20-persons.json',import.meta.url);
  let data;
  try{data=JSON.parse(readFileSync(file,'utf8'));}catch {data=null;}
  const result=evaluateMiniCollectC8Acceptance(data);
  console.log(JSON.stringify(result,null,2));
  if(process.argv.includes('--expect-no-go'))
    process.exitCode=result.decision==='NO_GO'?0:1;
  else process.exitCode=result.decision==='NO_GO'?1:0;
}
