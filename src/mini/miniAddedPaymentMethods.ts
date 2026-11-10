/**
 * Mini Phase 4: saved *fictional* method labels, never bank/payment credentials.
 *
 * An alias can point to one of the THREE preexisting test rail simulators.
 * "OTHER" never becomes a transaction/PSP rail and must fail closed.
 * No accounts, bank details, phone numbers, tokens, beneficiary identifiers,
 * KYC or actual provider connectivity are stored or accepted here.
 */
import type { MiniTestRailId } from './miniFundingSimulator';

export type MiniAddedRoute=MiniTestRailId|'OTHER';
export interface MiniAddedMethod {
  id:string; alias:string; route:MiniAddedRoute;
  simulationOnly:true; providerConnected:false; accountVerified:false;
  paymentEnabled:false;
}
export const MINI_ADDED_METHOD_STORAGE='spm-mini-fake-method-labels-v1';
export const MINI_ADDED_METHOD_LIMIT=5;
export const MINI_ADDED_ROUTES=Object.freeze([
  {id:'CHOICE_BANK',name:'Bank route (Choice Bank simulation)'},
  {id:'MPESA',name:'Mobile money (M-Pesa simulation)'},
  {id:'PESALINK',name:'Transfer (PesaLink simulation)'},
  {id:'OTHER',name:'Other financial provider · not connected'}
] as const);
const routeValid=(value:unknown):value is MiniAddedRoute=>
  MINI_ADDED_ROUTES.some(route=>route.id===value);
export function miniMethodAlias(raw:unknown):string|null {
  if(typeof raw!=='string')return null;
  const value=raw.replace(/\s+/g,' ').trim();
  if(value.length<2||value.length>36||!/[A-Za-z]/.test(value)||
      !/^[A-Za-z0-9 ._'&()-]+$/.test(value)||
      /\d{4,}/.test(value)||/\b(?:pin|password|secret|cvv|iban|account\s*number|phone\s*number)\b/i.test(value))
    return null;
  return value;
}
export function miniAddedMethodRoute(method:MiniAddedMethod):MiniTestRailId|null {
  return method.route==='OTHER'?null:method.route;
}
export function miniMethodList(raw:unknown):MiniAddedMethod[] {
  if(!Array.isArray(raw)||raw.length>MINI_ADDED_METHOD_LIMIT)return [];
  const ids=new Set<string>(),aliases=new Set<string>();
  const valid:MiniAddedMethod[]=[];
  for(const entry of raw){
    if(!entry||typeof entry!=='object')return [];
    const v=entry as Partial<MiniAddedMethod>;
    const alias=miniMethodAlias(v.alias);
    if(!alias||!routeValid(v.route)||typeof v.id!=='string'||
      !/^SAMPLE-[1-5]$/.test(v.id)||ids.has(v.id)||
      aliases.has(alias.toLowerCase())||v.simulationOnly!==true||
      v.providerConnected!==false||v.accountVerified!==false||
      v.paymentEnabled!==false)return [];
    ids.add(v.id);aliases.add(alias.toLowerCase());
    valid.push({id:v.id,alias,route:v.route,simulationOnly:true,
      providerConnected:false,accountVerified:false,paymentEnabled:false});
  }
  return valid;
}
export function miniMethodAdd(
  list:MiniAddedMethod[],rawAlias:unknown,route:unknown
):{items:MiniAddedMethod[];method:MiniAddedMethod}|null {
  const existing=miniMethodList(list);
  const alias=miniMethodAlias(rawAlias);
  if(existing.length!==list.length||!alias||!routeValid(route)||
    existing.length>=MINI_ADDED_METHOD_LIMIT||
    existing.some(item=>item.alias.toLowerCase()===alias.toLowerCase()))return null;
  const slot=[1,2,3,4,5].find(id=>!existing.some(item=>item.id==='SAMPLE-'+id));
  if(!slot)return null;
  const method:MiniAddedMethod={
    id:'SAMPLE-'+slot,alias,route,simulationOnly:true,
    providerConnected:false,accountVerified:false,paymentEnabled:false
  };
  return {items:[...existing,method],method};
}
export function miniMethodRemove(list:MiniAddedMethod[],id:string):MiniAddedMethod[] {
  return miniMethodList(list).filter(method=>method.id!==id);
}
export function miniReadAddedMethods(storage?:Pick<Storage,'getItem'>):MiniAddedMethod[] {
  try {
    if(!storage)return [];
    const raw=storage.getItem(MINI_ADDED_METHOD_STORAGE);
    return raw?miniMethodList(JSON.parse(raw)):[];
  }catch{return [];}
}
export function miniWriteAddedMethods(
  list:MiniAddedMethod[],storage?:Pick<Storage,'setItem'>
):boolean {
  try{
    if(!storage)return false;
    const safe=miniMethodList(list);
    if(safe.length!==list.length)return false;
    storage.setItem(MINI_ADDED_METHOD_STORAGE,JSON.stringify(safe));
    return true;
  }catch{return false;}
}
