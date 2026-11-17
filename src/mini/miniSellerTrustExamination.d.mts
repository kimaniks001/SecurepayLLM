export type TrustCheckStatus =
  'NEEDS_SPECIALIST_REVIEW'|'NOT_INDEPENDENTLY_CHECKED'|
  'SELLER_DECLARED'|'NEEDS_SELLER_ANSWER'|
  'PERMISSION_DECLARED_UNVERIFIED'|'NOT_APPLICABLE'|
  'SELLER_REVIEWED'|'OPTIONAL_IMPROVEMENT'|'LOCAL_REFERENCE_ONLY';
export type TrustCheck = {key:string;title:string;status:TrustCheckStatus;detail:string};
export type MiniSellerTrustExamination = {
  checks:TrustCheck[];blockers:string[];localReady:boolean;canShowPreview:boolean;
  canPublish:false;canIssueSecureLink:false;serverImageUseRegistered:false;
  sellerIdentityVerified:false;stockVerified:false;independentLegalityVerified:false;
  imageExactDigestVerified:false;imagePerceptualMatchChecked:false;
  totalImageIssues:number;summary:string;
  publicationState:'AWAITING_AUTHORITATIVE_SERVER_VERIFICATION';
};
export function miniSellerTrustExamination(input:Record<string,unknown>):MiniSellerTrustExamination;
