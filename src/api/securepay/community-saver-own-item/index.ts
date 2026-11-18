import {segment,type HttpClient} from '../http';

/**
 * Read-only, caller-authorized, canonical single-Agreement item verification.
 * This gateway NEVER sends an item price, platform claim, other trader identity,
 * Plug choice or Money instruction. Not a match discovery or offer endpoint.
 */
export interface CommunitySaverOwnItemEvidence {
  agreementId:string;
  agreementVersionId:string;
  itemId:string;
  itemTitle:string;
  currency:string;
  baselineMinor:number;
  agreementState:'CURRENT'|'CLOSED';
  confirmationState:'ALL_CURRENT'|'NOT_ALL_CURRENT';
  fundingState:'NOT_VERIFIED'|'INSUFFICIENT_OR_UNAVAILABLE'|'LEDGER_POSITION_REPORTED';
  platformState:'UNVERIFIED';
  matchingState:'BLOCKED';
  reasonCode:string;
  published:false;
  providerVerified:false;
  plugAssigned:false;
  agreementChanged:false;
  moneyAuthorized:false;
}
export function createCommunitySaverOwnItemGateway(http:HttpClient){
  return {
    read:(agreementId:string,itemId:string,expectedAgreementVersionId:string)=>
      http.request<CommunitySaverOwnItemEvidence>(
        '/api/v1/mini/me/community-saver/agreements/'+segment(agreementId)+
        '/items/'+segment(itemId)+'?expectedAgreementVersionId='+segment(expectedAgreementVersionId),
        {auth:'required'})
  };
}
export type CommunitySaverOwnItemGateway=ReturnType<typeof createCommunitySaverOwnItemGateway>;
