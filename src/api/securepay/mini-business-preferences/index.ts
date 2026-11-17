import {segment, type HttpClient} from '../http';

/** Requests only. NOT a directory registration, KRA integration or invoice. */
export interface MiniBusinessOptInStatus {
  directoryListingRequested:boolean;
  etimsSetupRequested:boolean;
  version:number;
  updatedAt:string|null;
  directoryState:'NOT_REQUESTED'|'REQUESTED_NOT_PUBLISHED';
  etimsState:'NOT_REQUESTED'|'REQUESTED_NOT_CONNECTED';
}
export interface MiniBusinessOptInChange {
  requested:boolean;
  expectedVersion:number;
  sellerConfirmsChoice:true;
}
export function createMiniBusinessPreferencesGateway(http:HttpClient){
  const path=(businessKsNumber:string)=>`/api/v1/business/${segment(businessKsNumber)}/mini-preferences`;
  return {
    read:(businessKsNumber:string)=>http.request<MiniBusinessOptInStatus>(path(businessKsNumber),{auth:'required'}),
    choose:(businessKsNumber:string,choice:'DIRECTORY'|'ETIMS',body:MiniBusinessOptInChange)=>
      http.request<MiniBusinessOptInStatus>(`${path(businessKsNumber)}/${choice}`,{
        method:'POST',body,auth:'required'
      })
  };
}
export type MiniBusinessPreferencesGateway=ReturnType<typeof createMiniBusinessPreferencesGateway>;
