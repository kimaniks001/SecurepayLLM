import type { HttpClient } from '../http';

/** Narrow read-only Phase 2B contract. These amounts are proposals/agreed principals, NOT debts. */
export type PersonalResponsibilityState =
  'NEEDS_YOUR_AGREEMENT'|'WAITING_FOR_OTHER_PERSON'|
  'AGREED_PAYMENT_CHECK_PENDING'|'CLOSED_NO_PAYMENT_INFERENCE';
export interface PersonalPaymentResponsibility {
  agreementId:string;
  agreementVersionId:string;
  obligationId:string;
  agreementTitle:string;
  obligationTitle:string;
  purpose:string;
  currency:string;
  statedAmountMinor:number;
  amountMeaning:'PROPOSED'|'AGREED';
  agreementState:PersonalResponsibilityState;
  obligationState:string;
  nextStep:string;
  payableNow:false;
  outstandingAmountMinor:null;
}
export interface PersonalPaymentResponsibilities {
  items:PersonalPaymentResponsibility[];
  page:number;
  size:number;
  totalAgreementCandidates:number;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedStates=new Set<PersonalResponsibilityState>([
  'NEEDS_YOUR_AGREEMENT','WAITING_FOR_OTHER_PERSON',
  'AGREED_PAYMENT_CHECK_PENDING','CLOSED_NO_PAYMENT_INFERENCE'
]);
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const safe=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=500;
const integer=(n:unknown):n is number=>Number.isSafeInteger(n);
const validItem=(v:unknown):v is PersonalPaymentResponsibility=>{
  if(!object(v))return false;
  return uuid.test(String(v.agreementId||''))&&
    uuid.test(String(v.agreementVersionId||''))&&
    uuid.test(String(v.obligationId||''))&&
    safe(v.agreementTitle)&&safe(v.obligationTitle)&&safe(v.purpose)&&
    typeof v.currency==='string'&&/^[A-Z]{3}$/.test(v.currency)&&
    integer(v.statedAmountMinor)&&v.statedAmountMinor>0&&
    (v.amountMeaning==='AGREED'||v.amountMeaning==='PROPOSED')&&
    allowedStates.has(v.agreementState as PersonalResponsibilityState)&&
    safe(v.obligationState)&&safe(v.nextStep)&&
    v.payableNow===false&&v.outstandingAmountMinor===null;
};
export function verifyPersonalResponsibilities(raw:unknown,page:number,size:number):PersonalPaymentResponsibilities|null{
  if(!object(raw)||raw.page!==page||raw.size!==size||
    !integer(raw.totalAgreementCandidates)||raw.totalAgreementCandidates<0||
    !Array.isArray(raw.items)||raw.items.length>size*50||
    !raw.items.every(validItem))return null;
  const ids=new Set<string>();
  for(const row of raw.items as PersonalPaymentResponsibility[]){
    const id=row.agreementId+':'+row.agreementVersionId+':'+row.obligationId;
    if(ids.has(id))return null;
    ids.add(id);
    // A "needs agreement" or "waiting" row cannot claim both have agreed.
    if(row.amountMeaning==='AGREED'&&row.agreementState!=='AGREED_PAYMENT_CHECK_PENDING'&&
      row.agreementState!=='CLOSED_NO_PAYMENT_INFERENCE')return null;
  }
  return raw as unknown as PersonalPaymentResponsibilities;
}
export function createPersonalPaymentResponsibilitiesGateway(http:HttpClient){
  return {read:async(page=0,size=20)=>{
    if(!Number.isSafeInteger(page)||page<0||!Number.isSafeInteger(size)||size<1||size>20)
      throw new Error('Invalid payment responsibilities page');
    const result=await http.request<unknown>(
      `/api/v1/me/payments/responsibilities?page=${page}&size=${size}`,{auth:'required'});
    const verified=verifyPersonalResponsibilities(result,page,size);
    if(!verified)throw new Error('Payment responsibilities response cannot be verified');
    return verified;
  }};
}
export type PersonalPaymentResponsibilitiesGateway=ReturnType<typeof createPersonalPaymentResponsibilitiesGateway>;
