import test from 'node:test';
import assert from 'node:assert/strict';
import {g5Route,isReadinessReview,isSnapshot,isPlan,isExamination} from '../src/features/collaborative-offers/g5Transport.mjs';
import {studioRoute} from '../src/features/collaborative-offers/studioTransport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddeeff',p='aabbccdd-1234-1234-1234-aabbccddeeaa',i='aabbccdd-1234-1234-1234-aabbccddeeab',j='aabbccdd-1234-1234-1234-aabbccddeeac';
const base='/api/v1/g4/me/studio/',biz='/api/v1/g4/business/KS001/studio/';
const no={publicationAuthorized:false,agreementAuthorized:false,paymentAuthorized:false},ready={...no,collectiveReady:false};
const draft={id,organizerKsNumber:'KS001',title:'Wedding',purpose:'Prepare',revision:1,agreementAuthorized:false,paymentAuthorized:false};
const member={invitationId:i,recipientKsNumber:'KS002',contributionId:p,contributionRevision:1,scope:'Catering',terms:'Terms',decisionSequence:1,commitmentStatus:'PENDING',decisions:[]};
const rr={draft,previousSnapshotId:null,members:[member],...no};
const snap={id:p,draft,sequence:1,predecessorId:null,current:true,allOwnProposalsCommitted:false,requiredContributors:1,members:[member],...ready};
const plan={id:j,snapshotId:p,sequence:1,predecessorId:null,current:true,allPlanAccepted:false,allDeclaredWindowsCurrent:false,dependencies:[],contingencies:[{responsibleInvite:i,trigger:'Rain',response:'Move inside'}],members:[{invitationId:i,recipientKsNumber:'KS002',status:'PENDING',declaredWindowsCurrent:false,ownResources:[]}],dependenciesFulfilled:false,...ready};
const exam={planId:j,snapshotId:p,assessedAt:'2026-11-27T10:00:00Z',result:{blockers:['SUBSTANTIVE_FAIR_TRADE_EXAMINATION_REQUIRED'],coordinationEvidenceComplete:true,...ready},dependencyReports:[],resourceRequirements:[]};
const create={id,expectedDraftRevision:1,previousSnapshotId:null,reviewedContributionIds:[p]};
const commit={id,contributionId:p,expectedSequence:0,decision:'COMMIT_OWN_PROPOSAL',explicitlyConfirmed:true};
const command={kind:'REPORT_DEPENDENCY',id,ordinal:1,expectedSequence:0,evidence:'Ready at noon'};
const req={kind:'SPECIFY_RESOURCE',id,invitationId:i,expectedSequence:0,requirement:'Two vans',minimumResources:2,startsAt:'2026-12-05T08:00:00Z',endsAt:'2026-12-05T10:00:00Z'};
const cases=[
 ['G5 default-off',()=>!studioRoute('GET',base+'drafts/'+id+'/readiness')],
 ['G5 explicit opt-in',()=>studioRoute('GET',base+'drafts/'+id+'/readiness',undefined,true)],
 ['G4 unaffected',()=>studioRoute('GET',base+'drafts')],
 ['personal inbox',()=>g5Route('GET',base+'inbox/'+i+'/readiness')],
 ['represented examination',()=>g5Route('GET',biz+'coordination/'+j+'/examination')],
 ['invalid identifier',()=>!g5Route('GET',base+'coordination/other/examination')],
 ['no GET body',()=>!g5Route('GET',base+'coordination/'+j+'/examination',{})],
 ['no query injection',()=>!g5Route('GET',base+'coordination/'+j+'/examination?x=1')],
 ['create exact snapshot',()=>g5Route('POST',base+'drafts/'+id+'/readiness',create)],
 ['reject duplicate proposal',()=>!g5Route('POST',base+'drafts/'+id+'/readiness',{...create,reviewedContributionIds:[p,p]})],
 ['reject implicit commitment',()=>!g5Route('POST',base+'readiness/'+p+'/commitment',{...commit,explicitlyConfirmed:false})],
 ['own proposal commitment',()=>g5Route('POST',biz+'readiness/'+p+'/commitment',commit)],
 ['no commercial acceptance',()=>!g5Route('POST',base+'readiness/'+p+'/commitment',{...commit,decision:'ACCEPT_AGREEMENT'})],
 ['no actor override',()=>!g5Route('POST',base+'readiness/'+p+'/commitment',{...commit,actorId:id})],
 ['plan with contingency',()=>g5Route('POST',base+'readiness/'+p+'/coordination',{id,previousPlanId:null,dependencies:[],contingencies:plan.contingencies})],
 ['plan without contingency blocked',()=>!g5Route('POST',base+'readiness/'+p+'/coordination',{id,previousPlanId:null,dependencies:[],contingencies:[]})],
 ['withdrawal cannot attach resource',()=>!g5Route('POST',base+'coordination/'+j+'/decision',{id,expectedSequence:1,decision:'WITHDRAW',explicitlyConfirmed:true,resources:[{offerId:id,resourceId:p,windowId:i,startsAt:req.startsAt,endsAt:req.endsAt}]})],
 ['plan acceptance',()=>g5Route('POST',base+'coordination/'+j+'/decision',{id,expectedSequence:0,decision:'ACCEPT_PLAN',explicitlyConfirmed:true,resources:[]})],
 ['exact report',()=>g5Route('POST',base+'coordination/'+j+'/examination',command)],
 ['no evidence forged readiness',()=>!g5Route('POST',base+'coordination/'+j+'/examination',{...command,collectiveReady:true})],
 ['report sequence bound',()=>!g5Route('POST',base+'coordination/'+j+'/examination',{...command,expectedSequence:50})],
 ['dependent confirms exact report',()=>g5Route('POST',base+'coordination/'+j+'/examination',{kind:'REVIEW_DEPENDENCY',id,ordinal:1,reportId:p,decision:'CONFIRM'})],
 ['invalid review decision',()=>!g5Route('POST',base+'coordination/'+j+'/examination',{kind:'REVIEW_DEPENDENCY',id,ordinal:1,reportId:p,decision:'READY'})],
 ['structured requirement',()=>g5Route('POST',base+'coordination/'+j+'/examination',req)],
 ['minimum bounded',()=>!g5Route('POST',base+'coordination/'+j+'/examination',{...req,minimumResources:0})],
 ['time order',()=>!g5Route('POST',base+'coordination/'+j+'/examination',{...req,endsAt:req.startsAt})],
 ['review exact resource',()=>g5Route('POST',biz+'coordination/'+j+'/examination',{kind:'REVIEW_RESOURCE',id,invitationId:i,requirementId:p,decision:'CHALLENGE'})],
 ['no publish route',()=>!g5Route('POST',base+'readiness/'+p+'/publish',create)],
 ['no money route',()=>!g5Route('POST',base+'readiness/'+p+'/pay',create)],
 ['review readback',()=>isReadinessReview(rr)],
 ['snapshot readback',()=>isSnapshot(snap)],
 ['reject ready snapshot',()=>!isSnapshot({...snap,collectiveReady:true})],
 ['plan readback',()=>isPlan(plan)],
 ['reject unknown contingency contributor',()=>!isPlan({...plan,contingencies:[{...plan.contingencies[0],responsibleInvite:j}]})],
 ['examination readback',()=>isExamination(exam)],
 ['reject false readiness grant',()=>!isExamination({...exam,result:{...exam.result,collectiveReady:true}})],
 ['reject payment grant',()=>!isExamination({...exam,result:{...exam.result,paymentAuthorized:true}})],
 ['reject missing blockers',()=>!isExamination({...exam,result:{...exam.result,blockers:[]}})]
];
for(const [name,fn] of cases)test(name,()=>assert.equal(fn(),true));
