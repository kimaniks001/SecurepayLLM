import type { AgentGateway } from '../api/securepay/agent';
import type { AgreementGateway } from '../api/securepay/agreements';
import type { AgreementReviewResponseDto, CandidateDto, ReviewedSourceDto, HandoffOpenMatterDto } from '../api/securepay/agent/dto';
import type { AgreementVersionSummaryResponse } from '../api/securepay/agreements/dto';

export type MiniSellerHandoffGateway = Pick<AgentGateway,
  'createHandoff'|'reviewHandoff'|'readHandoff'|'continueHandoff'>;
export type MiniSellerAgreementGateway = Pick<AgreementGateway,
  'detail'|'propose'>;
export interface MiniSellerReviewedHandoff {
  ok:true;
  canProgress:boolean;
  handoffId:string;
  status:string;
  conversationId:string;
  review:AgreementReviewResponseDto;
  reviewedSource:ReviewedSourceDto|null;
  mustResolve:HandoffOpenMatterDto[];
  stillToDecide:HandoffOpenMatterDto[];
  snapshot:{expectedTradeContextVersion:number;expectedCandidateDigest:string};
  candidate:CandidateDto;
  agreementCreated:false;
}
export interface MiniSellerError {
  ok:false;
  reason:string;
  retryKey?:string;
  handoffId?:string;
}
export function miniSellerBeginAgreementHandoff(input:{
  gateway:MiniSellerHandoffGateway;
  conversationId:string;
  reviewedTradeContextVersion:number;
  clientActionId:string;
  confirmed:boolean;
}):Promise<MiniSellerError|{ok:true;handoffId:string;status:string;conversationId:string;reviewRequired:true;agreementCreated:false;moneyAuthorized:false}>;
export function miniSellerReviewAgreementHandoff(input:{
  gateway:MiniSellerHandoffGateway;
  handoffId:string;
}):Promise<MiniSellerError|MiniSellerReviewedHandoff>;
export function miniSellerCreateReviewedAgreement(input:{
  gateway:MiniSellerHandoffGateway;
  agreements:MiniSellerAgreementGateway;
  reviewed:MiniSellerReviewedHandoff;
  sellerConfirmed:boolean;
}):Promise<MiniSellerError|{
  ok:true;agreementId:string;status:'DRAFT';
  agreementVersion:AgreementVersionSummaryResponse;
  shared:false;proposed:false;secureLinkIssued:false;moneyAuthorized:false;
}>;
export function miniSellerProposeAgreement(input:{
  agreements:MiniSellerAgreementGateway;
  agreementId:string;
  expectedAgreementVersion:AgreementVersionSummaryResponse;
  confirmed:boolean;
}):Promise<MiniSellerError|{
  ok:true;agreementId:string;status:'PROPOSED';
  agreementVersion:AgreementVersionSummaryResponse;
  secureLinkIssued:false;buyerAccepted:false;moneyAuthorized:false;
}>;
