/**
 * Master Convergence Gate 2 — six independent human journeys on one matched
 * disposable SecurePay UI/API pair. This evaluator NEVER tests credentials,
 * runs a payment, impersonates a person, or treats self-reported JSON as proof.
 * It is deliberately stricter than the prior synthetic frontend test suite.
 *
 * Reviewer must open every cited CI run and independently verify API, source
 * identity, relevant screenshots and feature-flag isolation. A PASS here is
 * REVIEWABLE evidence only, not production-release authorisation.
 */
import { readFileSync } from 'node:fs';
import {pathToFileURL} from 'node:url';
const sha=/^[a-f0-9]{40}$/i;
const truth=(v)=>v===true;
export const gate2Journeys=Object.freeze([
 {id:'visitor_intention',name:'Unsigned visitor plans a new Nakuru trip',
  checks:['freshConversation','notCorrectionFallback','meaningfulKS001Question','contextBound','retrySafe']},
 {id:'photo_bill_agreement',name:'Disposable bill photo → source-backed KS001 → Fair Trade Agreement',
  checks:['explicitAddToKS001','realUploadAndRead','sellerAndAmountSourceBacked','ambiguityExplained','sameConversationAndVersion','noInferredFunding']},
 {id:'project_12_to_4',name:'One project, twelve interested people, four separately consented participants',
  checks:['realCommunityOpportunity','twelveDistinctInterests','fourExplicitSelections','fourOwnInvitationsAndJoins','eightNoContractAuthority','individualTermsAndFundingTruth']},
 {id:'circle_work_evidence',name:'Private Circle coordination → own Agreement → beneficiary evidence review',
  checks:['memberScopeProven','crossUserDenied','currentVersionDuties','privateEvidenceSubmission','beneficiaryReviewSeparate','noAutoCompletionOrMoney']},
 {id:'community_outcome',name:'Real project outcome returns to Community Live by author choice',
  checks:['realPublicProject','membershipAndConsent','privacyNoPrivateAgreementLeak','estimatedVsReportedCosts','visiblePublishedOutcome','idempotentRetry']},
 {id:'identity_activation_money',name:'Real KS Number and activation/fees, Money fail closed',
  checks:['realKSIdentity','actualBackendPricing','activationSplitTruth','collectionAndContractFees','paymentReadinessSeparateFromMovement','noMoneyExecution']},
]);
const url=(str,repo)=>typeof str==='string'&&
  new RegExp('^https://github\\.com/kimaniks001/'+repo+'/actions/runs/[0-9]+(?:/|$)').test(str);
export function evaluateGate2(data,{uiSha,apiSha}={}){
 const blockers=[];
 if(!sha.test(uiSha||'')||!sha.test(apiSha||''))blockers.push('Both exact candidate SHAs must be provided.');
 if(data?.environment!=='DISPOSABLE_LOCAL_API')blockers.push('An isolated disposable local API is required.');
 if(data?.financialExecutionDisabled!==true)blockers.push('All Money execution must remain disabled.');
 if(data?.productionChanged!==false)blockers.push('Production must remain unchanged.');
 if(data?.apiSha!==apiSha||data?.uiSha!==uiSha)blockers.push('Evidence records do not match both supplied candidate SHAs.');
 const outcomes=gate2Journeys.map(j=>{
  const e=data?.journeys?.[j.id];const reasons=[];
  if(e?.status!=='PASS')reasons.push('actual journey not passed');
  if(e?.execution!=='REAL_AUTHENTICATED_OR_ANONYMOUS_API')
    reasons.push('not executed against an actual isolated API');
  if(e?.apiSha!==apiSha||e?.uiSha!==uiSha)reasons.push('different tested candidate SHA');
  if(!url(e?.apiRunUrl,'SecurePayAPI'))reasons.push('real API CI run not linked');
  if(!url(e?.uiRunUrl,'SecurepayLLM'))reasons.push('real UI CI run not linked');
  if(!e?.reviewer||String(e.reviewer).trim().length<3)reasons.push('human reviewer not attributed');
  if(!e?.reviewNotes||String(e.reviewNotes).trim().length<20)reasons.push('meaningful evidence notes not supplied');
  if(!Number.isFinite(Date.parse(e?.reviewedAt||'')))reasons.push('review date missing');
  for(const check of j.checks)if(!truth(e?.assertions?.[check]))reasons.push('missing: '+check);
  if(e?.usesRealMoney===true)reasons.push('money was executed');
  return {id:j.id,name:j.name,state:reasons.length?'BLOCKED':'REVIEWABLE',reasons};
 });
 for(const r of outcomes)if(r.state==='BLOCKED')blockers.push(r.id+': '+r.reasons.join('; '));
 return {decision:blockers.length?'NO_GO':'READY_FOR_HUMAN_GATE3_REVIEW',
   reviewed:outcomes.filter(x=>x.state==='REVIEWABLE').length,total:gate2Journeys.length,
   blockers,journeys:outcomes,warning:'Self-asserted metadata and links do not constitute proof; independently inspect each real run. This tool never deploys.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const arg=k=>{const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1]};
 const evidence=arg('--evidence');
 if(!evidence)throw Error('Use --evidence <local JSON> --ui-sha <40hex> --api-sha <40hex>');
 const report=evaluateGate2(JSON.parse(readFileSync(evidence,'utf8')),
  {uiSha:arg('--ui-sha'),apiSha:arg('--api-sha')});
 console.log(JSON.stringify(report,null,2));
 if(report.decision!=='READY_FOR_HUMAN_GATE3_REVIEW')process.exitCode=1;
}
