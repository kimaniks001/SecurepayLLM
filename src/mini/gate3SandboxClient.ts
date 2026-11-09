/**
 * Phase 3 Gate 3: read-only frontend for SERVER-CALCULATED fictional statuses.
 * No real provider event, payment intent, account debit or funds.
 */
import type {MiniTestRailId} from './miniFundingSimulator';
export type Gate3Scenario = 'SUCCESS' | 'FAILURE' | 'UNKNOWN' | 'SLOW';
export type Gate3Status = 'SIMULATED_PENDING' | 'SIMULATED_CONFIRMED' |
  'SIMULATED_FAILED' | 'SIMULATED_UNKNOWN';
export interface Gate3Result {
  attemptId:string;
  orderId:string;
  fixtureId:'STORE-DEMO-01'|'STAY-DEMO-01';
  rail:MiniTestRailId;
  status:Gate3Status;
  expiresAt:number;
  simulatedAt:number;
  amountMinor:number;
  currency:'KES';
  source:'SIGNED_PREVIEW_PROVIDER_SIMULATOR';
  simulationOnly:true;
  realProviderEvent:false;
  paymentInitiated:false;
  paymentEnabled:false;
  agreementAccepted:false;
  orderCreated:false;
  inventoryReserved:false;
  accommodationHeld:false;
  financialAuthority:false;
  paymentReference:null;
}
const tokenPattern=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export const validGate3Token=(v:unknown):v is string=>typeof v==='string' &&
  v.length>=95 && v.length<=1500 && tokenPattern.test(v);

export function parseGate3Result(value:unknown, expected:{
  orderId:string;fixtureId:string;amountMinor:number
}):Gate3Result|null{
  if(!value||typeof value!=='object')return null;
  const a=value as Record<string,unknown>;
  if(a.source!=='SIGNED_PREVIEW_PROVIDER_SIMULATOR'||
    a.simulationOnly!==true||a.realProviderEvent!==false||
    a.paymentInitiated!==false||a.paymentEnabled!==false||
    a.agreementAccepted!==false||a.orderCreated!==false||
    a.inventoryReserved!==false||a.accommodationHeld!==false||
    a.financialAuthority!==false||a.paymentReference!==null||
    a.orderId!==expected.orderId||a.fixtureId!==expected.fixtureId||
    a.amountMinor!==expected.amountMinor||a.currency!=='KES'||
    typeof a.attemptId!=='string'||!/^SIM-PAY-[A-F0-9]{24}$/.test(a.attemptId)||
    !['CHOICE_BANK','MPESA','PESALINK'].includes(String(a.rail))||
    !['SIMULATED_PENDING','SIMULATED_UNKNOWN','SIMULATED_CONFIRMED','SIMULATED_FAILED'].includes(String(a.status))||
    typeof a.expiresAt!=='number'||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=Date.now()||
    typeof a.simulatedAt!=='number'||!Number.isSafeInteger(a.simulatedAt))return null;
  return value as Gate3Result;
}
export async function startGate3Simulation(reviewSession:string,rail:MiniTestRailId,
  scenario:Gate3Scenario):Promise<{kind:'ready';attempt:string;expiresAt:number}|
  {kind:'unavailable'|'ineligible'}>{
  if(!validGate3Token(reviewSession))return {kind:'ineligible'};
  try{
    const response=await fetch('/api/mini-gate3-sandbox',{
      method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({action:'START_SIMULATED_ATTEMPT',reviewSession,rail,scenario}),
    });
    if(!response.ok)return {kind:response.status===409?'ineligible':'unavailable'};
    const data=await response.json() as Record<string,unknown>;
    if(!data||data.simulationOnly!==true||data.paymentEnabled!==false||
      data.paymentInitiated!==false||data.realProviderEvent!==false||
      !validGate3Token(data.attempt)||!Number.isSafeInteger(data.attemptExpiresAt)||
      (data.attemptExpiresAt as number)<=Date.now())
      return {kind:'unavailable'};
    return {kind:'ready',attempt:data.attempt,expiresAt:data.attemptExpiresAt as number};
  }catch{return {kind:'unavailable'};}
}
export async function getGate3Simulation(attempt:string,expected:{
  orderId:string;fixtureId:string;amountMinor:number
},signal?:AbortSignal):Promise<{kind:'ready';data:Gate3Result}|
  {kind:'expired'|'unavailable'}>{
  if(!validGate3Token(attempt))return {kind:'expired'};
  try{
    const response=await fetch('/api/mini-gate3-sandbox?attempt='+encodeURIComponent(attempt),{
      method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',
      headers:{Accept:'application/json'},signal
    });
    if(!response.ok)return {kind:response.status===410?'expired':'unavailable'};
    const data=parseGate3Result(await response.json(),expected);
    return data?{kind:'ready',data}:{kind:'unavailable'};
  }catch{return {kind:'unavailable'};}
}
