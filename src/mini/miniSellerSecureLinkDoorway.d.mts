import type { AgreementGateway } from '../api/securepay/agreements';
export interface MiniSellerCanonicalAgreement {
  id:string;
  status:string;
}
export type MiniSellerDoorwayResult =
  | {ok:true;slug:string;publicUrl:string|null;sent:false;buyerAccepted:false;moneyAuthorized:false;agreementId:string}
  | {ok:false;reason:string;retryKey?:string};
export function miniSellerIssueAgreementDoorway(input:{
  gateway:Pick<AgreementGateway,'activeDoorway'|'issuePublicDoorway'>;
  agreement:MiniSellerCanonicalAgreement;
  idempotencyKey:string;
  confirmed:boolean;
}):Promise<MiniSellerDoorwayResult>;
