import {segment,type HttpClient} from '../http';

/**
 * Phase 7D. The server can only read an existing privately staged proposal
 * and record its named participant's own fixed-version decision.
 * There is NO client proposal-creation method, job acceptance, Money,
 * cross-trader browse, provider dispatch or Agreement amendment.
 */
export type CommunitySaverPrivateAction='ACCEPT'|'DECLINE'|'WITHDRAW';
export type CommunitySaverPrivateRole='PAYER'|'PROVIDER'|'PLUG';
export interface CommunitySaverPrivateReview {
  proposalId:string;
  platformCode:'SHORTSTAYS'|'MY_RIDE'|'STORAGE';
  activityCode:string;
  currentTermsHash:string;
  proposalRevision:number;
  reviewState:'AWAITING_CONSENTS'|'ALL_CONSENTED_REVIEW_REQUIRED'|
    'DECLINED'|'EXPIRED'|'SOURCE_CHANGED';
  expiresAt:string;
  myRole:CommunitySaverPrivateRole;
  myAgreementId:string|null;
  myAgreementVersionId:string|null;
  myItemId:string|null;
  myAgreedItemMinor:number|null;
  myProjectedItemMinor:number|null;
  myProjectedNetSavingMinor:number|null;
  providerProposedCompensationMinor:number|null;
  plugProposedRewardMinor:number;
  myDecision:'PENDING'|'ACCEPT'|'DECLINE';
  totalParties:number;
  consentsRemaining:number;
  readyForFormalReview:boolean;
  agreementChanged:false;
  contactExchangeAllowed:false;
  plugAssigned:false;
  moneyAuthorized:false;
}
export function createCommunitySaverPrivateConsentGateway(http:HttpClient){
  const base='/api/v1/mini/me/community-saver/private-proposals/';
  return {
    read:(proposalId:string)=>http.request<CommunitySaverPrivateReview>(
      base+segment(proposalId),{auth:'required'}),
    decide:(proposalId:string,expectedRevision:number,expectedTermsHash:string,
        action:CommunitySaverPrivateAction)=>
      http.request<CommunitySaverPrivateReview>(
        base+segment(proposalId)+'/decision',{
          auth:'required',method:'POST',
          body:{expectedRevision,expectedTermsHash,action}
        })
  };
}
export type CommunitySaverPrivateConsentGateway=
  ReturnType<typeof createCommunitySaverPrivateConsentGateway>;
