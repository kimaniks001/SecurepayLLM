import { segment, type HttpClient } from '../http';

/** Gate 8: source-bound bills and planned deposits/milestones are NOT Money. */
export interface ConfirmedDispute {
  id:string;agreementId:string;reportId:string;versionId:string;
  versionHash:string;reportDigest:string;serviceInstanceId:string;
  confirmedQuantityId:string;openedByIdentityId:string;
  allegedHundredths:number|null;evidenceBindingId:string|null;
  reason:string;state:'OPEN_DISPUTED';replayed:boolean;
  originalPreserved:true;billingHeld:true;invoiceIssued:false;
  payable:false;paymentEnabled:false;
}
export interface ResolutionSummary {
  agreementId:string;reportId:string;disputeId:string;
  proposalId:string|null;proposerIdentityId:string|null;
  reviewDigest:string|null;proposedHundredths:number;
  requiredReviewers:number;accepted:number;rejected:number;outstanding:number;
  status:string;resolved:boolean;invoiceIssued:false;
  payable:false;paymentEnabled:false;
}
export interface ResolutionProposal {
  id:string;agreementId:string;disputeId:string;
  revisionNumber:number;confirmedQuantityId:string;reportId:string;versionId:string;
  versionHash:string;reportDigest:string;proposedHundredths:number;
  sourceEvidenceBindingId:string|null;reason:string;
  proposerIdentityId:string;reviewDigest:string;state:'RESOLUTION_PROPOSED';
  replayed:boolean;verifiedWork:false;payable:false;
}
export interface ResolutionDecision {
  id:string;proposalId:string;disputeId:string;versionId:string;
  reviewDigest:string;reviewerIdentityId:string;choice:'ACCEPT'|'REJECT';
  state:'REVIEW_ONLY';replayed:boolean;payable:false;
}
export interface ResolutionOutcome {
  id:string;agreementId:string;proposalId:string;disputeId:string;
  originalConfirmedId:string;reportId:string;versionId:string;
  reviewDigest:string;allPartyReviewDigest:string;
  resolvedHundredths:number;finalisedByIdentityId:string;
  state:'RESOLVED_NONPAYABLE';replayed:boolean;
  physicallyProven:false;invoiceIssued:false;payable:false;
  paymentEnabled:false;
}
export interface ReviewedBill {
  id:string;agreementId:string;versionId:string;versionHash:string;
  reportId:string;reportDigest:string;serviceInstanceId:string;
  confirmedQuantityId:string;resolutionOutcomeId:string|null;
  sourceKind:'ORIGINAL_CONFIRMED'|'RESOLVED_DISPUTE';
  sourceKey:string;evidenceReviewDigest:string;participantReviewDigest:string;
  tariffReviewDigest:string;rateBasis:'PER_HOUR'|'PER_KM'|'PER_KM_PLUS_FIXED';
  currency:string;rateMinorPerUnit:number;fixedMinor:number;
  effectiveHundredths:number;variableMinor:number;totalMinor:number;
  proposedByIdentityId:string;state:'BILL_REVIEW_ONLY';replayed:boolean;
  invoiceIssued:false;payable:false;paymentEnabled:false;
}
export interface BillReview {
  agreementId:string;billId:string;sourceKey:string;totalMinor:number;
  currency:string;state:string;beneficiaryAccepted:boolean;
  disputed:boolean;invoiceIssued:false;payable:false;paymentEnabled:false;
}
export interface PlanStage {
  sequenceNumber:number;title:string;amountMinor:number;
  requiredEvidence:string;dueAt:string|null;state:'PLANNED_NO_FUNDS';
}
export interface PlannedPayment {
  id:string;agreementId:string;billId:string;versionId:string;
  billSourceKey:string;revisionNumber:number;billTotalMinor:number;
  plannedDepositMinor:number;planDigest:string;
  proposedByIdentityId:string;state:'PLAN_PROPOSED_NONPAYABLE';
  milestones:PlanStage[];replayed:boolean;depositCollected:false;
  fundsHeld:false;milestoneReleased:false;paymentEnabled:false;
}
export interface PlannedReview {
  agreementId:string;billId:string;planId:string;revisionNumber:number;
  planDigest:string;billTotalMinor:number;depositMinor:number;
  milestoneRemainderMinor:number;state:string;beneficiaryAccepted:boolean;
  depositCollected:false;fundsHeld:false;payable:false;paymentEnabled:false;
}

export interface AgreementPlanAddendumStatus {
  agreementId:string;billId:string;planId:string;
  addendumId:string|null;planDigest:string;requiredParties:number;
  accepted:number;rejected:number;outstanding:number;state:string;
  nextActorIdentityId:string|null;viewerNeedsConsent:boolean;
  viewerMaySeal:boolean;latestPlan:boolean;
  canonicalAgreementVersionPreserved:boolean;
  annexCurrent:boolean;invoiceIssued:false;
  payable:false;paymentEnabled:false;
}
export interface AgreementPlanAddendum {
  id:string;agreementId:string;versionId:string;versionHash:string;
  billId:string;billSourceKey:string;planId:string;planDigest:string;
  proposerIdentityId:string;
}
export interface AgreementPlanAddendumDecision {
  id:string;participantId:string;identityId:string;
  choice:'ACCEPT'|'REJECT';note:string|null;planDigest:string;
}
export interface AgreementPlanAddendumSeal {
  id:string;agreementId:string;addendumId:string;versionId:string;
  versionHash:string;planId:string;planDigest:string;
  allPartyConsentDigest:string;sealedByIdentityId:string;
  state:'AGREEMENT_ADDENDUM_NONPAYABLE';replayed:boolean;
  payable:false;paymentEnabled:false;
}

export function createMeasuredBillingGateway(http:HttpClient) {
  const root=(a:string)=>`/api/v1/agreements/${segment(a)}/measured-service`;
  const usage=(a:string,r:string)=>`${root(a)}/usage-reports/${segment(r)}`;
  const dispute=(a:string,r:string)=>`${usage(a,r)}/confirmed-dispute`;
  const bill=(a:string,b:string)=>`${root(a)}/bill-drafts/${segment(b)}`;
  const plan=(a:string,b:string,p:string)=>
    `${bill(a,b)}/plans/${segment(p)}`;
  return {
    dispute:(a:string,r:string)=>http.request<ConfirmedDispute>(
      dispute(a,r),{auth:'required'}),
    openDispute:(a:string,r:string,body:{
      expectedConfirmedQuantityId:string;expectedVersionId:string;
      expectedVersionHash:string;expectedReportDigest:string;
      expectedConfirmedHundredths:number;allegedHundredths:number|null;
      evidenceBindingId:string|null;reason:string;idempotencyKey:string;
    })=>http.request<ConfirmedDispute>(dispute(a,r),
      {method:'POST',auth:'required',body}),
    resolution:(a:string,r:string)=>http.request<ResolutionSummary>(
      `${dispute(a,r)}/resolution-summary`,{auth:'required'}),
    resolutionHistory:(a:string,r:string)=>http.request<ResolutionProposal[]>(
      `${dispute(a,r)}/resolution/history`,{auth:'required'}),
    proposeResolution:(a:string,r:string,body:{
      expectedDisputeId:string;expectedConfirmedId:string;
      expectedVersionId:string;expectedVersionHash:string;
      expectedReportDigest:string;proposedHundredths:number;
      sourceEvidenceBindingId:string|null;reason:string;idempotencyKey:string;
    })=>http.request<ResolutionProposal>(
      `${dispute(a,r)}/resolution`,{method:'POST',auth:'required',body}),
    decideResolution:(a:string,r:string,proposalId:string,body:{
      expectedReviewDigest:string;choice:'ACCEPT'|'REJECT';
      reviewNote:string|null;idempotencyKey:string;
    })=>http.request<ResolutionDecision>(
      `${dispute(a,r)}/resolution/${segment(proposalId)}/decisions`,
      {method:'POST',auth:'required',body}),
    sealResolution:(a:string,r:string,proposalId:string,body:{
      expectedReviewDigest:string;idempotencyKey:string;
    })=>http.request<ResolutionOutcome>(
      `${dispute(a,r)}/resolution/${segment(proposalId)}/seal`,
      {method:'POST',auth:'required',body}),
    resolvedOutcome:(a:string,r:string)=>http.request<ResolutionOutcome>(
      `${dispute(a,r)}/resolved-outcome`,{auth:'required'}),
    latestBill:(a:string,r:string)=>http.request<ReviewedBill>(
      `${usage(a,r)}/bill-drafts/latest`,{auth:'required'}),
    prepareBill:(a:string,r:string,body:{
      expectedVersionId:string;expectedVersionHash:string;
      expectedReportDigest:string;expectedConfirmedId:string;
      expectedResolutionOutcomeId:string|null;idempotencyKey:string;
    })=>http.request<ReviewedBill>(
      `${usage(a,r)}/bill-drafts`,{method:'POST',auth:'required',body}),
    billReview:(a:string,b:string)=>http.request<BillReview>(
      `${bill(a,b)}/review`,{auth:'required'}),
    decideBill:(a:string,b:string,body:{
      expectedSourceKey:string;expectedTotalMinor:number;
      choice:'ACCEPT'|'REJECT';reason:string|null;idempotencyKey:string;
    })=>http.request<BillReviewDecision>(
      `${bill(a,b)}/decisions`,{method:'POST',auth:'required',body}),
    latestPlan:(a:string,b:string)=>http.request<PlannedPayment>(
      `${bill(a,b)}/plans/latest`,{auth:'required'}),
    proposePlan:(a:string,b:string,body:{
      expectedVersionId:string;expectedBillSourceKey:string;
      expectedBillTotalMinor:number;plannedDepositMinor:number;
      milestones:Array<{title:string;amountMinor:number;
        requiredEvidence:string;dueAt:string|null}>;
      idempotencyKey:string;
    })=>http.request<PlannedPayment>(
      `${bill(a,b)}/plans`,{method:'POST',auth:'required',body}),
    addendumStatus:(a:string,b:string,p:string)=>
      http.request<AgreementPlanAddendumStatus>(
        `${plan(a,b,p)}/agreement-addendum`,{auth:'required'}),
    openAddendum:(a:string,b:string,p:string,body:{
      expectedVersionId:string;expectedVersionHash:string;
      expectedBillSourceKey:string;expectedPlanDigest:string;
      idempotencyKey:string;
    })=>http.request<AgreementPlanAddendum>(
      `${plan(a,b,p)}/agreement-addendum`,
      {method:'POST',auth:'required',body}),
    decideAddendum:(a:string,b:string,p:string,annex:string,body:{
      expectedPlanDigest:string;choice:'ACCEPT'|'REJECT';
      note:string|null;idempotencyKey:string;
    })=>http.request<AgreementPlanAddendumDecision>(
      `${plan(a,b,p)}/agreement-addendum/${segment(annex)}/decisions`,
      {method:'POST',auth:'required',body}),
    sealAddendum:(a:string,b:string,p:string,annex:string,body:{
      expectedPlanDigest:string;idempotencyKey:string;
    })=>http.request<AgreementPlanAddendumSeal>(
      `${plan(a,b,p)}/agreement-addendum/${segment(annex)}/seal`,
      {method:'POST',auth:'required',body}),
    planReview:(a:string,b:string,p:string)=>http.request<PlannedReview>(
      `${plan(a,b,p)}/review`,{auth:'required'}),
    decidePlan:(a:string,b:string,p:string,body:{
      expectedPlanDigest:string;choice:'ACCEPT'|'REJECT';
      reason:string|null;idempotencyKey:string;
    })=>http.request<PlannedReviewDecision>(
      `${plan(a,b,p)}/decisions`,{method:'POST',auth:'required',body}),
  };
}
export interface BillReviewDecision {
  id:string;billId:string;sourceKey:string;totalMinor:number;
  reviewerIdentityId:string;choice:'ACCEPT'|'REJECT';
  state:'BILL_REVIEW_ONLY';invoiceIssued:false;payable:false;paymentEnabled:false;
}
export interface PlannedReviewDecision {
  id:string;planId:string;billId:string;planDigest:string;
  reviewerIdentityId:string;choice:'ACCEPT'|'REJECT';
  state:'REVIEW_ONLY';depositCollected:false;payable:false;
}
export type MeasuredBillingGateway=ReturnType<typeof createMeasuredBillingGateway>;
