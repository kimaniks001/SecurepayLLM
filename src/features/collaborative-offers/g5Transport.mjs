const uid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const txt=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const exact=(b,keys)=>!!b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).length===keys.length&&keys.every(k=>Object.hasOwn(b,k));
const n=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const ts=v=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));
const list=(v,max,fn,min=0)=>Array.isArray(v)&&v.length>=min&&v.length<=max&&v.every(fn);
const review=d=>['CONFIRM','CHALLENGE'].includes(d);
const dependency=d=>exact(d,['providerInvite','dependentInvite','condition'])&&uid(d.providerInvite)&&uid(d.dependentInvite)&&d.providerInvite!==d.dependentInvite&&txt(d.condition,800);
const contingency=c=>exact(c,['responsibleInvite','trigger','response'])&&uid(c.responsibleInvite)&&txt(c.trigger,400)&&txt(c.response,1200);
const resource=r=>exact(r,['offerId','resourceId','windowId','startsAt','endsAt'])&&uid(r.offerId)&&uid(r.resourceId)&&uid(r.windowId)&&ts(r.startsAt)&&ts(r.endsAt)&&Date.parse(r.startsAt)<Date.parse(r.endsAt);
export function g5Route(method,path,b){
 const m=typeof path==='string'&&/^\/api\/v1\/g4\/(?:me|business\/KS[0-9]{3,12})\/studio\/(.*)$/.exec(path);if(!m)return false;
 const p=m[1].split('/');if(p.length<2||!uid(p[1]))return false;
 const [kind,,op]=p;if(p.length>3)return false;
 if(method==='GET')return b===undefined&&(p.length===2&&kind==='readiness'||p.length===3&&((kind==='drafts'&&['readiness','readiness-review'].includes(op))||(kind==='inbox'&&op==='readiness')||(kind==='readiness'&&['coordination','resource-choices'].includes(op))||(kind==='coordination'&&['examination','final-review'].includes(op))));
 if(method!=='POST'||!b||!uid(b.id)||p.length!==3)return false;
 if(kind==='drafts'&&op==='readiness')return exact(b,['id','expectedDraftRevision','previousSnapshotId','reviewedContributionIds'])&&n(b.expectedDraftRevision,1,50)&&(b.previousSnapshotId===null||uid(b.previousSnapshotId))&&list(b.reviewedContributionIds,12,uid,1)&&new Set(b.reviewedContributionIds).size===b.reviewedContributionIds.length;
 if(kind==='readiness'&&op==='commitment')return exact(b,['id','contributionId','expectedSequence','decision','explicitlyConfirmed'])&&uid(b.contributionId)&&b.explicitlyConfirmed===true&&((b.decision==='COMMIT_OWN_PROPOSAL'&&b.expectedSequence===0)||(b.decision==='WITHDRAW'&&b.expectedSequence===1));
 if(kind==='readiness'&&op==='coordination')return exact(b,['id','previousPlanId','dependencies','contingencies'])&&(b.previousPlanId===null||uid(b.previousPlanId))&&list(b.dependencies,50,dependency)&&list(b.contingencies,50,contingency,1);
 if(kind==='coordination'&&op==='decision')return exact(b,['id','expectedSequence','decision','explicitlyConfirmed','resources'])&&b.explicitlyConfirmed===true&&list(b.resources,12,resource)&&((b.decision==='ACCEPT_PLAN'&&b.expectedSequence===0)||(b.decision==='WITHDRAW'&&b.expectedSequence===1&&b.resources.length===0));
 if(kind==='coordination'&&op==='final-review'){
  if(b.kind==='DECLARE_CAPABILITY')return exact(b,['kind','id','invitationId','expectedSequence','capabilityKind','deliverable','place','purpose','method','basis','startsAt','endsAt','explicitlyConfirmed'])&&uid(b.invitationId)&&n(b.expectedSequence,0,49)&&['RESOURCE','SERVICE'].includes(b.capabilityKind)&&txt(b.deliverable,800)&&txt(b.place,400)&&txt(b.purpose,400)&&txt(b.method,800)&&txt(b.basis,800)&&ts(b.startsAt)&&ts(b.endsAt)&&Date.parse(b.startsAt)<Date.parse(b.endsAt)&&b.explicitlyConfirmed===true;
  if(b.kind==='REVIEW_CAPABILITY')return exact(b,['kind','id','invitationId','declarationId','decision','explicitlyConfirmed'])&&uid(b.invitationId)&&uid(b.declarationId)&&review(b.decision)&&b.explicitlyConfirmed===true;
  return false;
 }
 if(kind!=='coordination'||op!=='examination')return false;
 switch(b.kind){
 case 'REPORT_DEPENDENCY':return exact(b,['kind','id','ordinal','expectedSequence','evidence'])&&n(b.ordinal,1,50)&&n(b.expectedSequence,0,49)&&txt(b.evidence,1600);
 case 'REVIEW_DEPENDENCY':return exact(b,['kind','id','ordinal','reportId','decision'])&&n(b.ordinal,1,50)&&uid(b.reportId)&&review(b.decision);
 case 'SPECIFY_RESOURCE':return exact(b,['kind','id','invitationId','expectedSequence','requirement','minimumResources','startsAt','endsAt'])&&uid(b.invitationId)&&n(b.expectedSequence,0,49)&&txt(b.requirement,800)&&n(b.minimumResources,1,12)&&ts(b.startsAt)&&ts(b.endsAt)&&Date.parse(b.startsAt)<Date.parse(b.endsAt);
 case 'REVIEW_RESOURCE':return exact(b,['kind','id','invitationId','requirementId','decision'])&&uid(b.invitationId)&&uid(b.requirementId)&&review(b.decision);
 default:return false;
 }
}
const safe=v=>v&&v.publicationAuthorized===false&&v.agreementAuthorized===false&&v.paymentAuthorized===false;
const ks=v=>typeof v==='string'&&/^KS[0-9]{3,12}$/.test(v);
const draft=v=>v&&uid(v.id)&&ks(v.organizerKsNumber)&&txt(v.title,160)&&txt(v.purpose,800)&&n(v.revision,1,50)&&v.agreementAuthorized===false&&v.paymentAuthorized===false;
const event=v=>v&&uid(v.id)&&n(v.sequence,1,2)&&['COMMIT_OWN_PROPOSAL','WITHDRAW'].includes(v.decision)&&ts(v.recordedAt);
const member=v=>v&&uid(v.invitationId)&&ks(v.recipientKsNumber)&&uid(v.contributionId)&&n(v.contributionRevision,1,50)&&txt(v.scope,400)&&txt(v.terms,1600)&&v.decisionSequence===1&&['PENDING','OWN_PROPOSAL_COMMITTED','WITHDRAWN'].includes(v.commitmentStatus)&&list(v.decisions,2,event);
export function isReadinessReview(v){return !!safe(v)&&draft(v.draft)&&(v.previousSnapshotId===null||uid(v.previousSnapshotId))&&list(v.members,12,member,1)&&new Set(v.members.map(x=>x.invitationId)).size===v.members.length;}
export function isSnapshot(v){return !!safe(v)&&v.collectiveReady===false&&uid(v.id)&&draft(v.draft)&&n(v.sequence,1,50)&&(v.predecessorId===null||uid(v.predecessorId))&&typeof v.current==='boolean'&&typeof v.allOwnProposalsCommitted==='boolean'&&n(v.requiredContributors,1,12)&&list(v.members,12,member,1)&&v.members.length<=v.requiredContributors;}
const coordinationMember=m=>m&&uid(m.invitationId)&&ks(m.recipientKsNumber)&&['PENDING','ACCEPTED','WITHDRAWN','COMMITMENT_NO_LONGER_CURRENT'].includes(m.status)&&typeof m.declaredWindowsCurrent==='boolean'&&list(m.ownResources,12,resource);
export function isPlan(v){return !!safe(v)&&v.collectiveReady===false&&v.dependenciesFulfilled===false&&uid(v.id)&&uid(v.snapshotId)&&n(v.sequence,1,50)&&(v.predecessorId===null||uid(v.predecessorId))&&typeof v.current==='boolean'&&typeof v.allPlanAccepted==='boolean'&&typeof v.allDeclaredWindowsCurrent==='boolean'&&list(v.dependencies,50,dependency)&&list(v.contingencies,50,contingency,1)&&list(v.members,12,coordinationMember,1)&&new Set(v.members.map(x=>x.invitationId)).size===v.members.length&&v.dependencies.every(d=>v.members.some(m=>m.invitationId===d.providerInvite)&&v.members.some(m=>m.invitationId===d.dependentInvite))&&v.contingencies.every(c=>v.members.some(m=>m.invitationId===c.responsibleInvite));}
const reviewValue=v=>v===null||!!v&&uid(v.id)&&review(v.decision)&&ts(v.recordedAt);
export function isExamination(v){return !!v&&uid(v.planId)&&uid(v.snapshotId)&&ts(v.assessedAt)&&safe(v.result)&&v.result.collectiveReady===false&&typeof v.result.coordinationEvidenceComplete==='boolean'&&list(v.result.blockers,20,x=>typeof x==='string'&&/^[A-Z_]{1,100}$/.test(x),1)&&list(v.dependencyReports,50,r=>r&&uid(r.id)&&n(r.ordinal,1,50)&&n(r.sequence,1,50)&&txt(r.evidenceText,1600)&&reviewValue(r.review))&&list(v.resourceRequirements,12,r=>r&&uid(r.id)&&uid(r.invitationId)&&n(r.sequence,1,50)&&txt(r.requirementText,800)&&n(r.minimumResources,1,12)&&ts(r.startsAt)&&ts(r.endsAt)&&reviewValue(r.review)&&typeof r.sufficient==='boolean');}

export function isWindowChoice(v){return !!v&&exact(v,['offerId','resourceId','windowId','resourceReference','startsAt','endsAt'])&&uid(v.offerId)&&uid(v.resourceId)&&uid(v.windowId)&&txt(v.resourceReference,80)&&ts(v.startsAt)&&ts(v.endsAt)&&Date.parse(v.startsAt)<Date.parse(v.endsAt);}
const lens=v=>!!v&&n(v.number,1,12)&&txt(v.title,120)&&['NOT_ASSESSED','NOT_APPLICABLE','NO_MATERIAL_CONCERN_OBSERVED','NEEDS_CLARIFICATION','MATERIAL_CONCERN'].includes(v.state)&&typeof v.explanation==='string'&&v.explanation.length<=400;
const question=v=>!!v&&txt(v.name,40)&&txt(v.evidence,2000)&&['IDENTITY_SCOPED','DECLARED','DECLARED_NOT_STRUCTURED'].includes(v.state);
const reading=(v,c)=>!!v&&v.declarationId===c.id&&uid(v.proposalId)&&v.version===c.sequence&&txt(v.principleSetVersion,100)&&list(v.lenses,12,lens,12)&&new Set(v.lenses.map(l=>l.number)).size===12&&list(v.questions,7,question,7)&&new Set(v.questions.map(q=>q.name)).size===7&&typeof v.fullyExamined==='boolean'&&typeof v.hasMaterialConcern==='boolean'&&v.fullyExamined===v.lenses.every(l=>l.state!=='NOT_ASSESSED')&&v.hasMaterialConcern===v.lenses.some(l=>l.state==='MATERIAL_CONCERN');
const capability=v=>!!v&&uid(v.id)&&uid(v.invitationId)&&ks(v.recipientKsNumber)&&n(v.sequence,1,50)&&['RESOURCE','SERVICE'].includes(v.kind)&&txt(v.deliverable,800)&&txt(v.place,400)&&txt(v.purpose,400)&&txt(v.method,800)&&txt(v.basis,800)&&ts(v.startsAt)&&ts(v.endsAt)&&Date.parse(v.startsAt)<Date.parse(v.endsAt)&&reviewValue(v.review)&&typeof v.reviewedSuitability==='boolean'&&typeof v.declaredCoverageCurrent==='boolean'&&reading(v.fairTrade,v);
export function isFinalReview(v){return !!safe(v)&&v.collectiveReady===false&&uid(v.planId)&&uid(v.snapshotId)&&list(v.capabilities,12,capability)&&new Set(v.capabilities.map(c=>c.invitationId)).size===v.capabilities.length&&list(v.blockers,30,b=>typeof b==='string'&&/^[A-Z_]{1,100}$/.test(b),1)&&v.blockers.includes('SUBSTANTIVE_FAIR_TRADE_EXAMINATION_REQUIRED');}
