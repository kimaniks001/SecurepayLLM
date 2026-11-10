/**
 * Phase 4: ONE OFFLINE AGREEMENT JOURNEY for both Store and ShortStays.
 * Fictitious sources, participant reviews, obligations, evidence, next-action
 * prompts and payment-method previews. Absolutely NO actual authority.
 * This model must never be exposed as a production Agreement/payment API.
 */
export type OfflineParticipant='CUSTOMER'|'PROVIDER';
export type OfflinePlan='FULL'|'STAGED';
export type OfflineStage='SOURCE_REVIEW'|'TERMS_REVIEW'|'FUNDING_PREVIEW'|
  'EVIDENCE_DUE'|'BUYER_REVIEW'|'CONCERN_OPEN'|'DONE';
export type OfflineSimResult='NOT_STARTED'|'SELECT_METHOD'|'AWAITING_FAKE_PROVIDER'|
  'SIMULATED_UNKNOWN'|'SIMULATED_CONFIRMED'|'SIMULATED_FAILED';
export type OfflineAction='REVIEW_SOURCE'|'REVIEW_TERMS'|'CONTINUE_SIMULATION'|
  'SOURCE_CHANGED'|'SELECT_PLAN'|'RECORD_SIMULATION'|'ACK_FICTIONAL_RESULT'|
  'SUBMIT_EVIDENCE'|'RAISE_CONCERN'|'APPROVE_STAGE';
export interface OfflineJourney {
  sourceVersion:string;revision:number;stage:OfflineStage;
  sourceReviewed:boolean;reviewed:{CUSTOMER:boolean;PROVIDER:boolean};
  plan:OfflinePlan;obligationIndex:number;
  simulatedResult:OfflineSimResult;evidence:string;concern:string;
  createdAt:number;
  history:{step:number;by:OfflineParticipant;action:OfflineAction;detail:string}[];
}
export interface OfflineObligation {
  index:number;id:string;label:string;amountMinor:number;dueDay:number;
  kind:'FULL'|'DEPOSIT'|'MILESTONE';
}
export interface OfflineNextAction {
  participant:OfflineParticipant;title:string;description:string;
  dueAt:number|null;overdue:boolean;delivery:'IN_APP_PREVIEW_ONLY';
  simulatedOnly:true;notificationSent:false;agreementAccepted:false;paymentEnabled:false;
}
export const OFFLINE_AUTHORITY = Object.freeze({
  simulationOnly:true,sourceAuthenticated:false,orderAccepted:false,
  inventoryReserved:false,accommodationHeld:false,agreementAccepted:false,
  paymentEnabled:false,paymentVerified:false,depositFunded:false,
  obligationsFunded:false,moneyMoved:false,notificationsSent:false,
  mayFulfil:false
});
const DAY=86400000;
const allowedResults:ReadonlyArray<OfflineSimResult>=[
  'SELECT_METHOD','AWAITING_FAKE_PROVIDER','SIMULATED_UNKNOWN',
  'SIMULATED_CONFIRMED','SIMULATED_FAILED'
];
const noteValid=(s:string)=>typeof s==='string'&&s.trim().length>=3&&s.trim().length<=200;
const keepNote=(s:string)=>s.trim().slice(0,200);
const freshReview=()=>({CUSTOMER:false,PROVIDER:false});
const evt=(state:OfflineJourney,by:OfflineParticipant,action:OfflineAction,detail='')=>
  [...state.history.slice(-18),{step:state.history.length+1,by,action,detail:detail.slice(0,200)}];

export function offlineObligations(
  totalMinor:number,source:'STORE'|'SHORTSTAYS',plan:OfflinePlan
):OfflineObligation[] {
  if(!Number.isSafeInteger(totalMinor)||totalMinor<=0||
    (source!=='STORE'&&source!=='SHORTSTAYS')||
    (plan!=='FULL'&&plan!=='STAGED'))throw Error('Invalid sample schedule');
  if(plan==='FULL')return [{
    index:0,id:'FULL',label:'Full amount · single payment',
    amountMinor:totalMinor,dueDay:1,kind:'FULL'
  }];
  if(totalMinor<4)throw Error('Amount too small to split');
  const first=Number(BigInt(totalMinor)*30n/100n);
  const second=Number(BigInt(totalMinor)*40n/100n);
  const third=totalMinor-first-second;
  if(first<=0||second<=0||third<=0)throw Error('Invalid split');
  return [
    {index:0,id:'DEPOSIT',label:'Deposit · before work begins',amountMinor:first,dueDay:1,kind:'DEPOSIT'},
    {index:1,id:'STAGE_1',label:source==='STORE'?'Goods ready':'Check-in milestone',
      amountMinor:second,dueDay:7,kind:'MILESTONE'},
    {index:2,id:'STAGE_2',label:source==='STORE'?'Goods handed over':'Stay handover',
      amountMinor:third,dueDay:14,kind:'MILESTONE'}
  ];
}

export function createOfflineJourney(sourceVersion:string,now=Date.now()):OfflineJourney {
  if(!sourceVersion||sourceVersion.length>80||!Number.isSafeInteger(now))throw Error('Invalid source');
  return {sourceVersion,revision:0,stage:'SOURCE_REVIEW',
    sourceReviewed:false,reviewed:freshReview(),plan:'FULL',obligationIndex:0,
    simulatedResult:'NOT_STARTED',evidence:'',concern:'',createdAt:now,history:[]};
}

export function nextOfflineAction(
  state:OfflineJourney,source:'STORE'|'SHORTSTAYS',asOf=Date.now()
):OfflineNextAction {
  let participant:OfflineParticipant='CUSTOMER';
  let title='Review sample Agreement terms';
  let description='Each person checks the same version. No legal signature or acceptance.';
  if(state.stage==='SOURCE_REVIEW'){
    participant='PROVIDER';
    title=source==='STORE'?'Seller reviews sample order':'Host reviews sample stay';
    description=source==='STORE'
      ?'Check the goods and collection terms. No inventory is reserved.'
      :'Check the sample dates and conditions. No room is reserved.';
  }else if(state.stage==='TERMS_REVIEW'){
    if(state.reviewed.CUSTOMER&&state.reviewed.PROVIDER){
      title='Explore the scheduled payment simulation';
      description='Both participants reviewed this fictional version. No Agreement was accepted.';
    }else{
      participant=state.reviewed.CUSTOMER?'PROVIDER':'CUSTOMER';
      title='Review sample Agreement and payment schedule';
      description='Check the proposed deposit, milestones and terms. This is not a signature.';
    }
  }else if(state.stage==='FUNDING_PREVIEW'){
    title=state.simulatedResult==='SIMULATED_CONFIRMED'
      ?'Continue after fictional payment result':'Explore the original simulated payment attempt';
    description=state.simulatedResult==='SIMULATED_UNKNOWN'
      ?'Result unknown: do not retry or proceed; check the original simulated attempt.'
      :state.simulatedResult==='SIMULATED_CONFIRMED'
      ?'A simulated result is ready to acknowledge. No deposit or milestone was actually funded.'
      :'Only simulated Choice Bank, M-Pesa or PesaLink is available here. No actual money moves.';
  }else if(state.stage==='EVIDENCE_DUE'||state.stage==='CONCERN_OPEN'){
    participant='PROVIDER';
    title=state.stage==='CONCERN_OPEN'?'Respond to the buyer’s concern':'Submit sample completion evidence';
    description=state.stage==='CONCERN_OPEN'
      ?'Describe a correction. The buyer must review again before this stage can progress.'
      :'Add a short sample evidence caption for this stage. No documents are uploaded.';
  }else if(state.stage==='BUYER_REVIEW'){
    title='Inspect stage and decide next action';
    description='Review the sample evidence. Approve or raise a concern before advancing.';
  }else{
    title='Sample journey completed — NOT PAID';
    description='The fictional obligations were explored. No actual payment, booking or fulfilment occurred.';
  }
  const stageDue=state.stage==='FUNDING_PREVIEW'||state.stage==='EVIDENCE_DUE'||
    state.stage==='CONCERN_OPEN'||state.stage==='BUYER_REVIEW';
  const dueAt=stageDue?state.createdAt+([1,7,14][state.obligationIndex]??14)*DAY:null;
  return {
    participant,title,description,dueAt,overdue:dueAt!==null&&asOf>dueAt,
    delivery:'IN_APP_PREVIEW_ONLY',simulatedOnly:true,
    notificationSent:false,agreementAccepted:false,paymentEnabled:false
  };
}

export function moveOfflineJourney(
  state:OfflineJourney,participant:OfflineParticipant,action:OfflineAction,
  detail='',totalObligations=1
):OfflineJourney|null {
  if(participant!=='CUSTOMER'&&participant!=='PROVIDER')return null;
  if(action==='SOURCE_CHANGED')return {
    ...state,revision:state.revision+1,stage:'SOURCE_REVIEW',
    sourceReviewed:false,reviewed:freshReview(),plan:'FULL',obligationIndex:0,
    simulatedResult:'NOT_STARTED',evidence:'',concern:'',
    history:evt(state,participant,action)
  };
  if(action==='REVIEW_SOURCE'){
    if(state.stage!=='SOURCE_REVIEW'||participant!=='PROVIDER')return null;
    return {...state,stage:'TERMS_REVIEW',sourceReviewed:true,
      history:evt(state,participant,action)};
  }
  if(action==='SELECT_PLAN'){
    if(state.stage!=='TERMS_REVIEW'||participant!=='CUSTOMER'||
      (detail!=='FULL'&&detail!=='STAGED')||detail===state.plan)return null;
    return {...state,plan:detail,reviewed:freshReview(),revision:state.revision+1,
      history:evt(state,participant,action,detail)};
  }
  if(action==='REVIEW_TERMS'){
    if(state.stage!=='TERMS_REVIEW'||!state.sourceReviewed||state.reviewed[participant])return null;
    return {...state,reviewed:{...state.reviewed,[participant]:true},
      history:evt(state,participant,action)};
  }
  if(action==='CONTINUE_SIMULATION'){
    if(state.stage!=='TERMS_REVIEW'||participant!=='CUSTOMER'||
      !state.reviewed.CUSTOMER||!state.reviewed.PROVIDER)return null;
    return {...state,stage:'FUNDING_PREVIEW',simulatedResult:'NOT_STARTED',
      history:evt(state,participant,action)};
  }
  if(action==='RECORD_SIMULATION'){
    if(state.stage!=='FUNDING_PREVIEW'||participant!=='CUSTOMER'||
      !allowedResults.includes(detail as OfflineSimResult))return null;
    if(state.simulatedResult===detail)return state;
    return {...state,simulatedResult:detail as OfflineSimResult};
  }
  if(action==='ACK_FICTIONAL_RESULT'){
    if(state.stage!=='FUNDING_PREVIEW'||participant!=='CUSTOMER'||
      state.simulatedResult!=='SIMULATED_CONFIRMED')return null;
    return {...state,stage:'EVIDENCE_DUE',simulatedResult:'NOT_STARTED',
      history:evt(state,participant,action)};
  }
  if(action==='SUBMIT_EVIDENCE'){
    if((state.stage!=='EVIDENCE_DUE'&&state.stage!=='CONCERN_OPEN')||
      participant!=='PROVIDER'||!noteValid(detail))return null;
    return {...state,stage:'BUYER_REVIEW',evidence:keepNote(detail),concern:'',
      history:evt(state,participant,action,keepNote(detail))};
  }
  if(action==='RAISE_CONCERN'){
    if(state.stage!=='BUYER_REVIEW'||participant!=='CUSTOMER'||!noteValid(detail))return null;
    return {...state,stage:'CONCERN_OPEN',concern:keepNote(detail),
      history:evt(state,participant,action,keepNote(detail))};
  }
  if(action==='APPROVE_STAGE'){
    if(state.stage!=='BUYER_REVIEW'||participant!=='CUSTOMER'||!state.evidence||
      !Number.isSafeInteger(totalObligations)||totalObligations<1||
      totalObligations>3||state.obligationIndex>=totalObligations)return null;
    const complete=state.obligationIndex+1>=totalObligations;
    return {...state,stage:complete?'DONE':'FUNDING_PREVIEW',
      obligationIndex:complete?state.obligationIndex:state.obligationIndex+1,
      simulatedResult:'NOT_STARTED',evidence:'',concern:'',
      history:evt(state,participant,action)};
  }
  return null;
}
