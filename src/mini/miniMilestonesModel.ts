/**
 * Phase 4 Gate 5: browser-only, intentionally NON-AUTHORITATIVE sample lifecycle.
 * No Agreement API, provider, notification sender, storage of funds or acceptance.
 * Consumers MUST NOT treat any simulated step as real-world payment evidence.
 */
export type SampleActor = 'BUYER' | 'BUILDER';
export type SamplePhase =
  | 'REVIEW_SCHEDULE' | 'DEPOSIT_DUE' | 'WORK_IN_PROGRESS'
  | 'BUYER_REVIEW' | 'CONCERN_OPEN' | 'MILESTONE_APPROVED' | 'COMPLETE_SAMPLE';
export type SampleAction =
  | 'REVIEW' | 'ACK_DEPOSIT' | 'SUBMIT_EVIDENCE' | 'RAISE_CONCERN'
  | 'APPROVE_MILESTONE' | 'ACK_MILESTONE';
export interface SampleEvent { revision:number; by:SampleActor; action:SampleAction; text:string }
export interface SampleJourney {
  version:1; createdAt:number; revision:number;
  reviewedBy:{BUYER:boolean;BUILDER:boolean};
  phase:SamplePhase; milestoneIndex:0|1;
  evidence:string; concern:string; history:SampleEvent[];
}
export interface SampleNotification {
  id:string; recipient:SampleActor; title:string; body:string;
  nextAction:SampleAction | null; dueAt:number|null; overdue:boolean;
  simulatedOnly:true; delivery:'IN_APP_PREVIEW_ONLY';
}
export const SAMPLE_TOTAL_MINOR=15_000_000;
export const SAMPLE_DEPOSIT_MINOR=3_000_000;
export const SAMPLE_MILESTONES=Object.freeze([
  {id:'CABINETS',title:'Cabinets installed',amountMinor:6_000_000,dayOffset:7},
  {id:'HANDOVER',title:'Final handover',amountMinor:6_000_000,dayOffset:14}
]);
export const SAMPLE_MONEY_AUTHORITY=Object.freeze({
  simulationOnly:true,agreementAccepted:false,depositReceived:false,
  realPaymentVerified:false,moneyMoved:false,escrowFunded:false,
  releaseAuthorised:false,mayFulfil:false,notificationsSent:false
});
if(SAMPLE_DEPOSIT_MINOR+SAMPLE_MILESTONES.reduce((sum,s)=>sum+s.amountMinor,0)!==SAMPLE_TOTAL_MINOR){
  throw Error('BAD_SAMPLE_TOTAL');
}
export function newSampleJourney(now=Date.now()):SampleJourney{
  return {version:1,createdAt:now,revision:0,
    reviewedBy:{BUYER:false,BUILDER:false},
    phase:'REVIEW_SCHEDULE',milestoneIndex:0,evidence:'',concern:'',history:[]};
}
const isActor=(v:unknown):v is SampleActor=>v==='BUYER'||v==='BUILDER';
const textValue=(v:unknown,length:number)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=length;
export function transitionSample(state:SampleJourney,actor:SampleActor,action:SampleAction,
  rawText=''):SampleJourney|null{
  if(!isActor(actor)||!Number.isSafeInteger(state.revision))return null;
  const note=rawText.trim();
  let next:SampleJourney|null=null;
  switch(action){
    case 'REVIEW':
      if(state.phase!=='REVIEW_SCHEDULE'||state.reviewedBy[actor])return null;
      next={...state,reviewedBy:{...state.reviewedBy,[actor]:true}};
      if(next.reviewedBy.BUYER&&next.reviewedBy.BUILDER)next.phase='DEPOSIT_DUE';
      break;
    case 'ACK_DEPOSIT':
      if(actor!=='BUYER'||state.phase!=='DEPOSIT_DUE')return null;
      next={...state,phase:'WORK_IN_PROGRESS'};break;
    case 'SUBMIT_EVIDENCE':
      if(actor!=='BUILDER'||!['WORK_IN_PROGRESS','CONCERN_OPEN'].includes(state.phase)
          ||!textValue(note,200))return null;
      next={...state,phase:'BUYER_REVIEW',evidence:note,concern:''};break;
    case 'RAISE_CONCERN':
      if(actor!=='BUYER'||state.phase!=='BUYER_REVIEW'||!textValue(note,200))return null;
      next={...state,phase:'CONCERN_OPEN',concern:note};break;
    case 'APPROVE_MILESTONE':
      if(actor!=='BUYER'||state.phase!=='BUYER_REVIEW'||!state.evidence)return null;
      next={...state,phase:'MILESTONE_APPROVED'};break;
    case 'ACK_MILESTONE':
      if(actor!=='BUYER'||state.phase!=='MILESTONE_APPROVED')return null;
      next=state.milestoneIndex===0
        ?{...state,milestoneIndex:1,phase:'WORK_IN_PROGRESS',evidence:'',concern:''}
        :{...state,phase:'COMPLETE_SAMPLE'};break;
    default:return null;
  }
  const evt:SampleEvent={revision:state.revision+1,by:actor,action,text:note.slice(0,200)};
  return {...next,revision:evt.revision,history:[...state.history.slice(-18),evt]};
}
export function sampleNextAction(state:SampleJourney,asOf=Date.now()):SampleNotification{
  const due=(offset:number)=>state.createdAt+offset*86400000;
  const current=SAMPLE_MILESTONES[state.milestoneIndex];
  const specs:Record<SamplePhase,{recipient:SampleActor;title:string;body:string;
    action:SampleAction|null;deadline:number|null}>={
    REVIEW_SCHEDULE:{recipient:state.reviewedBy.BUYER?'BUILDER':'BUYER',
      title:'Review the proposed schedule',
      body:'Both people need to check the deposit, milestones and due dates before proceeding.',
      action:'REVIEW',deadline:null},
    DEPOSIT_DUE:{recipient:'BUYER',title:'Deposit step is ready for review',
      body:'Preview the KSh 30,000 deposit commitment. This does not collect or hold funds.',
      action:'ACK_DEPOSIT',deadline:due(3)},
    WORK_IN_PROGRESS:{recipient:'BUILDER',title:'Submit completion evidence',
      body:'Add a caption describing the finished work for '+current.title+'.',
      action:'SUBMIT_EVIDENCE',deadline:due(current.dayOffset)},
    BUYER_REVIEW:{recipient:'BUYER',title:'Inspect '+current.title,
      body:'Review the builder’s evidence. Approve it or raise a concern before the next scheduled amount.',
      action:'APPROVE_MILESTONE',deadline:due(current.dayOffset)},
    CONCERN_OPEN:{recipient:'BUILDER',title:'Resolve the buyer’s concern',
      body:'Respond with corrected completion evidence before the buyer can approve.',
      action:'SUBMIT_EVIDENCE',deadline:due(current.dayOffset)},
    MILESTONE_APPROVED:{recipient:'BUYER',title:'Review the next payment obligation',
      body:'The KSh 60,000 milestone is approved IN THIS DEMO only. No payment was sent or released.',
      action:'ACK_MILESTONE',deadline:due(current.dayOffset)},
    COMPLETE_SAMPLE:{recipient:'BUYER',title:'Sample workflow complete',
      body:'All sample steps were explored. No real Agreement, payments or notifications occurred.',
      action:null,deadline:null}
  };
  const spec=specs[state.phase];
  return {id:'SIM-NEXT-'+state.revision+'-'+state.phase,
    recipient:spec.recipient,title:spec.title,body:spec.body,nextAction:spec.action,
    dueAt:spec.deadline,overdue:spec.deadline!==null&&asOf>spec.deadline,
    simulatedOnly:true,delivery:'IN_APP_PREVIEW_ONLY'};
}
export function sampleActionOptions(state:SampleJourney,actor:SampleActor):SampleAction[]{
  if(state.phase==='REVIEW_SCHEDULE')return !state.reviewedBy[actor]?['REVIEW']:[];
  const action=sampleNextAction(state).nextAction;
  if(!action||sampleNextAction(state).recipient!==actor)return [];
  if(state.phase==='BUYER_REVIEW')return ['APPROVE_MILESTONE','RAISE_CONCERN'];
  return [action];
}
export function restoreSampleJourney(raw:unknown):SampleJourney|null{
  if(!raw||typeof raw!=='object')return null;
  const s=raw as Partial<SampleJourney>;
  const stages:SamplePhase[]=['REVIEW_SCHEDULE','DEPOSIT_DUE','WORK_IN_PROGRESS',
    'BUYER_REVIEW','CONCERN_OPEN','MILESTONE_APPROVED','COMPLETE_SAMPLE'];
  if(s.version!==1||!Number.isSafeInteger(s.createdAt)||!Number.isSafeInteger(s.revision)||
    (s.revision??-1)<0||(s.revision??Infinity)>100||
    !stages.includes(s.phase as SamplePhase)||![0,1].includes(s.milestoneIndex as number)||
    typeof s.reviewedBy?.BUYER!=='boolean'||typeof s.reviewedBy?.BUILDER!=='boolean'||
    typeof s.evidence!=='string'||s.evidence.length>200||
    typeof s.concern!=='string'||s.concern.length>200||!Array.isArray(s.history)||
    s.history.length>19||s.history.some(e=>!e||!Number.isSafeInteger(e.revision)||
      !isActor(e.by)||typeof e.action!=='string'||typeof e.text!=='string'||e.text.length>200))
    return null;
  return {...s,version:1,reviewedBy:{...s.reviewedBy},history:s.history.slice()} as SampleJourney;
}
