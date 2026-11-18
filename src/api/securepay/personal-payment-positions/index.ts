import type {HttpClient} from '../http';
import type {
  PersonalPaymentResponsibilities,PersonalPaymentResponsibility
} from '../personal-payments';

/**
 * 2F. Only reads backend-verified, personally authorised positions. NO Money commands.
 * Strong validation means a provider-unknown, duplicated or incompatible response never
 * turns into a number on Mini. Amounts are integer minor units, never JS floats.
 */
export type BalanceState='VERIFIED_RECORD'|'DISPUTED_HOLD'|
  'REVERSED_REQUIRES_REVIEW'|'PENDING_PROVIDER_OUTCOME'|'UNVERIFIED_HISTORY';
export type EligibilityState='TERMS_UNVERIFIED'|'CONSENT_REQUIRED'|'OUTSTANDING_UNKNOWN'|
  'DISPUTED_OR_BLOCKED'|'EVIDENCE_REQUIRED'|'WAIT_UNTIL_DUE'|
  'REVIEW_EARLY_PAYMENT_TERMS'|'READY_FOR_SEPARATE_AUTHORIZATION'|'ALREADY_SETTLED';
export interface PositionVerification {
  balanceEvidenceState:BalanceState;
  settledMinor:number|null;
  refundsMinor:number|null;
  reversalsMinor:number|null;
  outstandingMinor:number|null;
  eligibilityState:EligibilityState;
  actingCapacity:string;
  canPrepare:boolean;
}
export type PersonalPaymentPosition=PersonalPaymentResponsibility & {
  paymentVerification?:PositionVerification;
};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=500;
const int=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
const optionalMinor=(v:unknown)=>v===null||int(v);
const states=new Set<BalanceState>(['VERIFIED_RECORD','DISPUTED_HOLD',
  'REVERSED_REQUIRES_REVIEW','PENDING_PROVIDER_OUTCOME','UNVERIFIED_HISTORY']);
const eligibility=new Set<EligibilityState>(['TERMS_UNVERIFIED','CONSENT_REQUIRED',
  'OUTSTANDING_UNKNOWN','DISPUTED_OR_BLOCKED','EVIDENCE_REQUIRED',
  'WAIT_UNTIL_DUE','REVIEW_EARLY_PAYMENT_TERMS','READY_FOR_SEPARATE_AUTHORIZATION',
  'ALREADY_SETTLED']);
const workflow=new Set(['NEEDS_YOUR_AGREEMENT','WAITING_FOR_OTHER_PERSON',
  'AGREED_PAYMENT_CHECK_PENDING','CLOSED_NO_PAYMENT_INFERENCE']);
const capacity=new Set(['PERSONAL_PREPARATION','BUSINESS_PREPARATION','DELEGATED_PREPARATION',
  'NOT_AUTHORIZED','SCOPE_CHANGED','DELEGATION_EXPIRED']);
const isComplete=(s:BalanceState)=>s==='VERIFIED_RECORD'||s==='DISPUTED_HOLD'||
  s==='REVERSED_REQUIRES_REVIEW';

export function verifyPersonalPaymentPositions(raw:unknown,page:number,size:number):
  (PersonalPaymentResponsibilities & {items:PersonalPaymentPosition[]})|null {
  if(!isObject(raw)||raw.page!==page||raw.size!==size||
    !int(raw.totalAgreementCandidates)||!Array.isArray(raw.items)||
    raw.items.length>size*50)return null;
  const ids=new Set<string>();
  const items:PersonalPaymentPosition[]=[];
  for(const value of raw.items){
    if(!isObject(value)||!uuid.test(String(value.agreementId||''))||
      !uuid.test(String(value.agreementVersionId||''))||
      !uuid.test(String(value.obligationId||''))||
      !text(value.agreementTitle)||!text(value.obligationTitle)||!text(value.purpose)||
      typeof value.currency!=='string'||!/^[A-Z]{3}$/.test(value.currency)||
      !int(value.statedAmountMinor)||value.statedAmountMinor===0||
      !(value.amountMeaning==='PROPOSED'||value.amountMeaning==='AGREED')||
      !workflow.has(String(value.agreementState))||!text(value.obligationState)||
      !text(value.nextStep)||value.payableNow!==false||
      value.canAuthorizeMoney!==false||typeof value.canPrepare!=='boolean'||
      !capacity.has(String(value.actingCapacity))||
      !states.has(value.balanceEvidenceState as BalanceState)||
      !eligibility.has(value.eligibilityState as EligibilityState)||
      !optionalMinor(value.settledMinor)||!optionalMinor(value.refundsMinor)||
      !optionalMinor(value.reversalsMinor)||!optionalMinor(value.outstandingMinor))return null;
    const id=`${value.agreementId}:${value.agreementVersionId}:${value.obligationId}`;
    if(ids.has(id))return null;
    ids.add(id);
    if(value.amountMeaning==='AGREED'&&value.agreementState!=='AGREED_PAYMENT_CHECK_PENDING'&&
      value.agreementState!=='CLOSED_NO_PAYMENT_INFERENCE')return null;
    const balanceState=value.balanceEvidenceState as BalanceState;
    if(isComplete(balanceState)){
      if(value.amountMeaning!=='AGREED'||value.settledMinor===null||
        value.refundsMinor===null||value.reversalsMinor===null||value.outstandingMinor===null)
        return null;
      const settled=Number(value.settledMinor),refunded=Number(value.refundsMinor),
        reversed=Number(value.reversalsMinor),remaining=Number(value.outstandingMinor);
      if(refunded+reversed>settled||!Number.isSafeInteger(refunded+reversed)||
        !Number.isSafeInteger(settled-refunded-reversed)||
        !Number.isSafeInteger(settled-refunded-reversed+remaining)||
        settled-refunded-reversed+remaining!==value.statedAmountMinor)return null;
    }else if(value.settledMinor!==null||value.refundsMinor!==null||
      value.reversalsMinor!==null||value.outstandingMinor!==null)return null;
    if(value.canPrepare&&value.actingCapacity!=='PERSONAL_PREPARATION')return null;
    // Never promote "due" or "ready" from a disconnected financial read.
    if(value.eligibilityState!=='TERMS_UNVERIFIED'&&
      value.eligibilityState!=='OUTSTANDING_UNKNOWN'&&
      value.eligibilityState!=='CONSENT_REQUIRED'&&
      value.eligibilityState!=='DISPUTED_OR_BLOCKED'&&
      !isComplete(balanceState))return null;
    items.push({
      agreementId:String(value.agreementId),
      agreementVersionId:String(value.agreementVersionId),
      obligationId:String(value.obligationId),
      agreementTitle:String(value.agreementTitle),
      obligationTitle:String(value.obligationTitle),
      purpose:String(value.purpose),
      currency:String(value.currency),
      statedAmountMinor:Number(value.statedAmountMinor),
      amountMeaning:value.amountMeaning as 'PROPOSED'|'AGREED',
      agreementState:value.agreementState as PersonalPaymentResponsibility['agreementState'],
      obligationState:String(value.obligationState),
      nextStep:String(value.nextStep),
      // Keep the old payment-domain boundary: no authorization based on this read.
      payableNow:false,
      outstandingAmountMinor:null,
      paymentVerification:{
        balanceEvidenceState:balanceState,
        settledMinor:value.settledMinor as number|null,
        refundsMinor:value.refundsMinor as number|null,
        reversalsMinor:value.reversalsMinor as number|null,
        outstandingMinor:value.outstandingMinor as number|null,
        eligibilityState:value.eligibilityState as EligibilityState,
        actingCapacity:String(value.actingCapacity),
        canPrepare:value.canPrepare as boolean
      }
    });
  }
  return {items,page,size,totalAgreementCandidates:Number(raw.totalAgreementCandidates)};
}
export function createPersonalPaymentPositionsGateway(http:HttpClient) {
  return {read:async(page=0,size=20)=>{
    if(!Number.isSafeInteger(page)||page<0||!Number.isSafeInteger(size)||size<1||size>20)
      throw new Error('Invalid personal payment position page');
    const raw=await http.request<unknown>(
      `/api/v1/me/payments/positions?page=${page}&size=${size}`,{auth:'required'});
    const view=verifyPersonalPaymentPositions(raw,page,size);
    if(!view)throw new Error('Cannot verify authenticated financial position');
    return view;
  }};
}
