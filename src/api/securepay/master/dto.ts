// Verified against kimaniks001/SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @
// 978437f300244119302607ba3e656a76253190bb (MasterController.java, the api/master/request|response DTOs,
// MasterDesignationStatus.java, MasterAvailabilityStatus.java, MasterRequestStatus.java,
// MasterRequestSourceContext.java). The entire `ke.securepay.core.master` package is now live on
// `SecurePayAPI main` (PR #207 has since merged; re-confirmed by directly reading the package on
// current main during the Phase 4 final correction pass, 2026-09-20 -- see
// docs/PHASE4_TRADE_COMMUNITY.md and docs/PRODUCTION_MIGRATION_LEDGER.md section 18 for the original
// archaeology, which predates the merge).
//
// This is the narrow NON-DISPUTE Master domain only. A dispute-scoped Master engagement is a different,
// already-existing lifecycle (`DisputeMasterEscalation`, Phase 9B) and is never reached from here.

/** Only `ACTIVE` is ever produced by `designate()` in this SHA; no endpoint transitions to the others. */
export type MasterDesignationStatus = 'ACTIVE' | 'SUSPENDED' | 'EXITED';
/** No endpoint updates this after designation in this SHA — an opaque server field, never client-settable. */
export type MasterAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
/** Deliberately has no `DISPUTE` value — the dispute Master lifecycle is a separate, untouched system. */
export type MasterRequestSourceContext = 'PRE_TRADE_INSPECTION' | 'AGREEMENT_MILESTONE_REVIEW' | 'AGREEMENT_OBLIGATION_REVIEW' | 'GENERAL_ADVICE';
/** No status means "resolved/adjudicated" — `OPINION_SUBMITTED` is the terminal successful state. */
export type MasterRequestStatus = 'REQUESTED' | 'COST_PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'OPINION_SUBMITTED' | 'CANCELLED';

export interface DesignateMasterRequest {
  expertiseDomains: string[];
  serviceArea?: string | null;
  pricingBasis?: string | null;
  qualificationRefs?: string[] | null;
  accreditationRefs?: string[] | null;
  inspectionCapable: boolean;
  businessIdentityId?: string | null;
}

export interface CreateMasterRequestRequest {
  masterIdentityId: string;
  sourceContext: MasterRequestSourceContext;
  agreementId?: string | null;
  agreementVersionId?: string | null;
  milestoneId?: string | null;
  obligationId?: string | null;
  question: string;
  scope: string;
  evidenceRefs?: string[] | null;
  siteVisitRequired: boolean;
}

export interface ProposeMasterRequestCostRequest {
  currency: string;
  quotedCostMinor: number;
}

export interface SubmitMasterOpinionRequest {
  reviewedEvidenceRefs?: string[] | null;
  siteVisitDetails?: string | null;
  observations?: string | null;
  opinionText: string;
  limitations?: string | null;
}

export interface MasterProfileResponse {
  identityId: string;
  designationStatus: string;
  expertiseDomains: string[];
  serviceArea: string | null;
  availabilityStatus: string;
  pricingBasis: string | null;
  qualificationRefs: string[];
  accreditationRefs: string[];
  inspectionCapable: boolean;
  businessIdentityId: string | null;
  designatedAt: string;
}

export interface MasterRequestResponse {
  id: string;
  requestingIdentityId: string;
  masterIdentityId: string;
  sourceContext: string;
  agreementId: string | null;
  agreementVersionId: string | null;
  milestoneId: string | null;
  obligationId: string | null;
  question: string;
  scope: string;
  evidenceRefs: string[];
  siteVisitRequired: boolean;
  currency: string | null;
  /** Decimal string, nullable — never coerced to a JS number. */
  quotedCostMinor: string | null;
  status: string;
  createdAt: string;
}

export interface MasterOpinionResponse {
  id: string;
  requestId: string;
  masterIdentityId: string;
  agreementId: string | null;
  agreementVersionId: string | null;
  question: string;
  scope: string;
  reviewedEvidenceRefs: string[];
  siteVisitDetails: string | null;
  observations: string | null;
  opinionText: string;
  limitations: string | null;
  previousOpinionId: string | null;
  createdAt: string;
}
