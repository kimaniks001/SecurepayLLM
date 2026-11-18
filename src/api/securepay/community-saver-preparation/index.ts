import {segment,type HttpClient} from '../http';

/**
 * Explicit non-Money preparation. The phone submits only its own Agreement /
 * version / item IDs and desired approved platform. It NEVER submits a
 * claimed price, funding status, other trader or Plug identity.
 *
 * This API cannot create opportunities, collect legally binding final
 * approvals, send SecureLinks, amend Agreements or authorize Money.
 */
export type CommunitySaverPreparationPlatform='SHORTSTAYS'|'MY_RIDE'|'STORAGE';

export interface CommunitySaverPreparationView {
  agreementId:string;
  currentAgreementVersionId:string;
  itemId:string;
  platformCode:CommunitySaverPreparationPlatform;
  phase:'PREPARATION_ONLY_MONEY_DEFERRED';
  status:'BLOCKED'|'WAITING_FOR_PROVIDER'|
    'PROVIDER_CHECKED_AWAITING_PRIVATE_MATCH'|
    'HYPOTHETICAL_SAVING_FOR_REVIEW'|'WAITING_FOR_SOURCE';
  reasonCode:string;
  currency:'KES';
  originalItemMinor:number;
  itemVersionAndConsentCurrent:boolean;
  providerSourceVerified:boolean;
  hypotheticalNewItemCostMinor:number|null;
  hypotheticalSavingMinor:number|null;
  hypotheticalSavingPercent:number|null;
  moneyDeferred:true;
  realizedSavingVerified:false;
  otherTraderDetailsReleased:false;
  realPlugInvitationSent:false;
  agreementAmended:false;
  anyMoneyAuthorized:false;
}
export function createCommunitySaverPreparationGateway(http:HttpClient){
  return {
    inspect:(agreementId:string,itemId:string,expectedAgreementVersionId:string,
      platformCode:CommunitySaverPreparationPlatform)=>
      http.request<CommunitySaverPreparationView>(
        '/api/v1/mini/me/community-saver/preparation/agreements/'+segment(agreementId)+
        '/items/'+segment(itemId)+
        '?expectedAgreementVersionId='+segment(expectedAgreementVersionId)+
        '&platformCode='+segment(platformCode),{auth:'required'})
  };
}
export type CommunitySaverPreparationGateway=
  ReturnType<typeof createCommunitySaverPreparationGateway>;
