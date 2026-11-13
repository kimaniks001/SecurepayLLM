import { segment, type HttpClient } from '../http';
import type { MeasuredMethod, MeasuredRateBasis } from '../measured-services';

/**
 * Gate 8 E7. Real server-owned measured work, canonical evidence, and human
 * decisions. Every response remains nonpayable. No local uploads, demo
 * records, inferred identities, invoices, escrow or Money commands.
 */
export interface MeasuredReport {
  reportId:string;
  agreementId:string;
  versionId:string;
  versionHash:string;
  serviceInstanceId:string;
  reporterIdentityId:string;
  tariffReviewDigest:string;
  reportedHundredths:number;
  evidenceMethod:MeasuredMethod;
  evidenceNote:string;
  evidenceReference:string|null;
  reportDigest:string;
  versionCurrent:boolean;
  state:'REPORTED_UNVERIFIED';
  evidenceVerified:false;
  payable:false;
}
export interface MeasuredDirectory {
  agreementId:string;
  viewerIdentityId:string;
  currentVersionId:string;
  versionHash:string;
  currency:string;
  rateBasis:MeasuredRateBasis;
  evidenceMethod:MeasuredMethod;
  reports:MeasuredReport[];
  state:'NO_WORK_REPORTED'|'REPORTS_UNVERIFIED';
  paymentEnabled:false;
}
export interface ReportedUsage {
  id:string;
  agreementId:string;
  versionId:string;
  versionHash:string;
  serviceInstanceId:string;
  tariffReviewDigest:string;
  reporterIdentityId:string;
  reportedHundredths:number;
  evidenceMethod:MeasuredMethod;
  state:'REPORTED_UNVERIFIED';
  usageVerified:false;
  counterpartyConfirmed:false;
  executable:false;
  paymentEnabled:false;
  replayed:boolean;
}
export interface EvidenceWork {
  agreementId:string;
  versionId:string;
  versionHash:string;
  reportId:string;
  reportDigest:string;
  serviceInstanceId:string;
  obligationId:string;
  responsibleIdentityId:string;
  beneficiaryIdentityId:string;
  state:'EVIDENCE_WORK_ONLY';
  nextAction:string;
  replayed:boolean;
  monetary:false;
  evidenceApproved:false;
  payable:false;
  paymentEnabled:false;
}
export interface EvidenceBinding {
  id:string;
  agreementId:string;
  versionId:string;
  versionHash:string;
  reportId:string;
  reportDigest:string;
  serviceInstanceId:string;
  evidenceId:string;
  evidenceContentHash:string;
  evidenceType:string;
  state:'PROVENANCE_LINKED';
  replayed:boolean;
  evidenceApproved:false;
  workVerified:false;
  paymentEnabled:false;
}
export interface EvidenceAssessment {
  agreementId:string;
  reportId:string;
  versionId:string;
  versionHash:string;
  reportDigest:string;
  serviceInstanceId:string;
  boundEvidenceCount:number;
  activeEvidenceCount:number;
  approvedEvidenceCount:number;
  state:string;
  evidence:Array<{
    bindingId:string;
    evidenceId:string;
    evidenceType:string;
    evidenceReviewState:string;
    independentCanonicalApproval:boolean;
    superseded:boolean;
  }>;
  canonicalEvidenceApproved:boolean;
  quantityIndependentlyConfirmed:false;
  actualWorkVerified:false;
  invoiceIssued:false;
  paymentEnabled:false;
}
export interface UsageDecision {
  id:string;
  reportId:string;
  agreementId:string;
  versionId:string;
  versionHash:string;
  reportDigest:string;
  reviewerIdentityId:string;
  choice:'ACCEPT'|'REJECT';
  state:'REVIEW_ONLY';
  replayed:boolean;
  evidenceVerified:false;
  payable:false;
  paymentEnabled:false;
}
export interface Correction {
  id:string;
  agreementId:string;
  versionId:string;
  versionHash:string;
  reportId:string;
  reportDigest:string;
  revisionNumber:number;
  proposedHundredths:number;
  evidenceBindingId:string;
  state:'PROPOSED_UNAGREED';
  payable:false;
}
export interface ConfirmedQuantity {
  id:string;
  agreementId:string;
  versionId:string;
  versionHash:string;
  reportId:string;
  reportDigest:string;
  serviceInstanceId:string;
  evidenceWorkObligationId:string;
  reporterIdentityId:string;
  confirmedByIdentityId:string;
  effectiveHundredths:number;
  sourceKind:'ORIGINAL'|'CORRECTION';
  correctionId:string|null;
  state:'PARTY_CONFIRMED_NONPAYABLE';
  replayed:boolean;
  physicalMeasurementIndependentlyProven:false;
  invoiceIssued:false;
  payable:false;
  paymentEnabled:false;
}

export function createMeasuredEvidenceGateway(http:HttpClient) {
  const root=(a:string)=>`/api/v1/agreements/${segment(a)}/measured-service`;
  const report=(a:string,r:string)=>`${root(a)}/usage-reports/${segment(r)}`;
  return {
    list: (agreementId:string)=>http.request<MeasuredDirectory>(
      `${root(agreementId)}/usage-reports`,{auth:'required'}),
    declare: (agreementId:string,body:{
      expectedVersionId:string;expectedVersionHash:string;serviceInstanceId:string;
      reportedHundredths:number;evidenceMethod:MeasuredMethod;
      evidenceNote:string;evidenceReference:null;idempotencyKey:string;
    })=>http.request<ReportedUsage>(
      `${root(agreementId)}/usage-reports`,
      {method:'POST',auth:'required',body}),
    evidenceWork: (agreementId:string,reportId:string)=>http.request<EvidenceWork>(
      `${report(agreementId,reportId)}/canonical-evidence-work`,{auth:'required'}),
    openEvidenceWork: (agreementId:string,reportId:string,body:{
      expectedVersionId:string;expectedVersionHash:string;
      expectedReportDigest:string;beneficiaryParticipantId:string;idempotencyKey:string;
    })=>http.request<EvidenceWork>(
      `${report(agreementId,reportId)}/canonical-evidence-work`,
      {method:'POST',auth:'required',body}),
    bindEvidence: (agreementId:string,reportId:string,body:{
      expectedVersionId:string;expectedVersionHash:string;expectedReportDigest:string;
      evidenceId:string;idempotencyKey:string;
    })=>http.request<EvidenceBinding>(`${report(agreementId,reportId)}/evidence`,
      {method:'POST',auth:'required',body}),
    assessment: (agreementId:string,reportId:string)=>http.request<EvidenceAssessment>(
      `${report(agreementId,reportId)}/evidence-assessment`,{auth:'required'}),
    decideUsage: (agreementId:string,reportId:string,body:{
      expectedVersionId:string;expectedVersionHash:string;expectedReportDigest:string;
      choice:'ACCEPT'|'REJECT';reviewNote:string|null;idempotencyKey:string;
    })=>http.request<UsageDecision>(`${report(agreementId,reportId)}/decisions`,
      {method:'POST',auth:'required',body}),
    corrections: (agreementId:string,reportId:string)=>http.request<Correction[]>(
      `${report(agreementId,reportId)}/corrections`,{auth:'required'}),
    confirm: (agreementId:string,reportId:string,body:{
      expectedVersionId:string;expectedVersionHash:string;expectedReportDigest:string;
      expectedCorrectionId:string|null;expectedEffectiveHundredths:number;
      idempotencyKey:string;
    })=>http.request<ConfirmedQuantity>(`${report(agreementId,reportId)}/effective-quantity`,
      {method:'POST',auth:'required',body}),
    confirmed: (agreementId:string,reportId:string)=>http.request<ConfirmedQuantity>(
      `${report(agreementId,reportId)}/effective-quantity`,{auth:'required'}),
  };
}
export type MeasuredEvidenceGateway=ReturnType<typeof createMeasuredEvidenceGateway>;
