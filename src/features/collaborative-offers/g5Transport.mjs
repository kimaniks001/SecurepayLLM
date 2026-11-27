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
 if(method==='GET')return b===undefined&&(p.length===2&&kind==='readiness'||p.length===3&&((kind==='drafts'&&['readiness','readiness-review'].includes(op))||(kind==='inbox'&&op==='readiness')||(kind==='readiness'&&op==='coordination')||(kind==='coordination'&&op==='examination')));
 if(method!=='POST'||!b||!uid(b.id)||p.length!==3)return false;
 if(kind==='drafts'&&op==='readiness')return exact(b,['id','expectedDraftRevision','previousSnapshotId','reviewedContributionIds'])&&n(b.expectedDraftRevision,1,50)&&(b.previousSnapshotId===null||uid(b.previousSnapshotId))&&list(b.reviewedContributionIds,12,uid,1)&&new Set(b.reviewedContributionIds).size===b.reviewedContributionIds.length;
 if(kind==='readiness'&&op==='commitment')return exact(b,['id','contributionId','expectedSequence','decision','explicitlyConfirmed'])&&uid(b.contributionId)&&b.explicitlyConfirmed===true&&((b.decision==='COMMIT_OWN_PROPOSAL'&&b.expectedSequence===0)||(b.decision==='WITHDRAW'&&b.expectedSequence===1));
 if(kind==='readiness'&&op==='coordination')return exact(b,['id','previousPlanId','dependencies','contingencies'])&&(b.previousPlanId===null||uid(b.previousPlanId))&&list(b.dependencies,50,dependency)&&list(b.contingencies,50,contingency,1);
 if(kind==='coordination'&&op==='decision')return exact(b,['id','expectedSequence','decision','explicitlyConfirmed','resources'])&&b.explicitlyConfirmed===true&&list(b.resources,12,resource)&&((b.decision==='ACCEPT_PLAN'&&b.expectedSequence===0)||(b.decision==='WITHDRAW'&&b.expectedSequence===1&&b.resources.length===0));
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
