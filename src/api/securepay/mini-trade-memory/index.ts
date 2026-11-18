import {segment,type HttpClient} from '../http';

export type MiniTradeMemoryKind='PERSON'|'STORE'|'TEMPLATE';
export type MiniRepeatCadence='ONE_TIME'|'WEEKLY'|'MONTHLY'|'ON_REQUEST';
export type MiniStopRule='EACH_CYCLE_CONFIRM'|'UNTIL_DATE';
export interface MiniTradeMemoryEntry {
  id:string;kind:MiniTradeMemoryKind;referenceKey:string;label:string;
  termsHint:string|null;cadence:MiniRepeatCadence;stopRule:MiniStopRule;
  untilDate:string|null;version:number;createdAt:string;
}
export interface MiniTradeMemorySave {
  kind:MiniTradeMemoryKind;referenceKey:string;label:string;
  termsHint:string|null;cadence:MiniRepeatCadence;stopRule:MiniStopRule;
  untilDate:string|null;ownerConfirms:true;
}

/** Authenticated personal notes only, never social graph / automatic renewal. */
export function createMiniTradeMemoryGateway(http:HttpClient){
  const path='/api/v1/mini/me/trade-memory';
  return {
    mine:()=>http.request<MiniTradeMemoryEntry[]>(path,{auth:'required'}),
    save:(body:MiniTradeMemorySave)=>http.request<MiniTradeMemoryEntry>(path,{
      method:'POST',body,auth:'required'}),
    remove:(id:string,expectedVersion:number)=>http.request<void>(
      path+'/'+segment(id)+'/remove',{
        method:'POST',body:{expectedVersion,ownerConfirms:true},auth:'required'})
  };
}
export type MiniTradeMemoryGateway=ReturnType<typeof createMiniTradeMemoryGateway>;
