/**
 * Read-only owner rehearsal for *both* Store and ShortStays.
 * Nothing here signs an Agreement, holds stock/rooms, creates funds or talks to
 * SecurePayAPI. It only tests the human journey before the real API is ready.
 */
export type OfflineParticipant='CUSTOMER'|'PROVIDER';
export type OfflineStage='SOURCE_REVIEW'|'TERMS_REVIEW'|'FUNDING_PREVIEW';
export type OfflineAction='REVIEW_SOURCE'|'REVIEW_TERMS'|'CONTINUE_SIMULATION'|'SOURCE_CHANGED';
export interface OfflineJourney {
  sourceVersion:string;revision:number;stage:OfflineStage;
  sourceReviewed:false|true;
  reviewed:{CUSTOMER:boolean;PROVIDER:boolean};
}
export interface OfflineNextAction {
  participant:OfflineParticipant;
  title:string;
  description:string;
  simulatedOnly:true;
  notificationSent:false;
  agreementAccepted:false;
  paymentEnabled:false;
}
export const OFFLINE_AUTHORITY = Object.freeze({
  simulationOnly:true,sourceAuthenticated:false,orderAccepted:false,
  inventoryReserved:false,accommodationHeld:false,agreementAccepted:false,
  paymentEnabled:false,paymentVerified:false,depositFunded:false,
  obligationsFunded:false,moneyMoved:false,notificationsSent:false,
  mayFulfil:false
});

export function createOfflineJourney(sourceVersion:string):OfflineJourney {
  if(!sourceVersion||sourceVersion.length>80)throw Error('Invalid source');
  return {sourceVersion,revision:0,stage:'SOURCE_REVIEW',
    sourceReviewed:false,reviewed:{CUSTOMER:false,PROVIDER:false}};
}

export function nextOfflineAction(state:OfflineJourney,source:'STORE'|'SHORTSTAYS'):OfflineNextAction {
  if(state.stage==='SOURCE_REVIEW')return {
    participant:'PROVIDER',title:source==='STORE'?'Seller reviews sample order':'Host reviews sample stay',
    description:source==='STORE'?
      'Check the displayed goods and collection terms. No inventory is reserved.':
      'Check the illustrated dates and conditions. No room is reserved.',
    simulatedOnly:true,notificationSent:false,agreementAccepted:false,paymentEnabled:false
  };
  if(state.stage==='TERMS_REVIEW'){
    const participant:OfflineParticipant=state.reviewed.CUSTOMER?'PROVIDER':'CUSTOMER';
    return {participant,title:'Review sample Agreement terms',
      description:'Each person checks the same version in this rehearsal. This is NOT a legal signature or acceptance.',
      simulatedOnly:true,notificationSent:false,agreementAccepted:false,paymentEnabled:false};
  }
  return {
    participant:'CUSTOMER',title:'Explore a simulated payment method',
    description:'The source and both reviews were explored. No Agreement was legally accepted; provider choices are fictional.',
    simulatedOnly:true,notificationSent:false,agreementAccepted:false,paymentEnabled:false
  };
}

export function moveOfflineJourney(
  state:OfflineJourney,participant:OfflineParticipant,action:OfflineAction
):OfflineJourney|null {
  if(participant!=='CUSTOMER'&&participant!=='PROVIDER')return null;
  if(action==='SOURCE_CHANGED')return {
    ...state,revision:state.revision+1,stage:'SOURCE_REVIEW',sourceReviewed:false,
    reviewed:{CUSTOMER:false,PROVIDER:false}
  };
  if(action==='REVIEW_SOURCE'){
    if(state.stage!=='SOURCE_REVIEW'||participant!=='PROVIDER')return null;
    return {...state,stage:'TERMS_REVIEW',sourceReviewed:true};
  }
  if(action==='REVIEW_TERMS'){
    if(state.stage!=='TERMS_REVIEW'||!state.sourceReviewed||state.reviewed[participant])return null;
    const reviewed={...state.reviewed,[participant]:true};
    return {...state,reviewed};
  }
  if(action==='CONTINUE_SIMULATION'){
    if(state.stage!=='TERMS_REVIEW'||participant!=='CUSTOMER'||
      !state.reviewed.CUSTOMER||!state.reviewed.PROVIDER)return null;
    return {...state,stage:'FUNDING_PREVIEW'};
  }
  return null;
}
