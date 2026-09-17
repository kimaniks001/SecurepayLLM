import { ApiError } from '../http';
import type {
  MasterAvailabilityStatus, MasterDesignationStatus, MasterOpinionResponse, MasterProfileResponse,
  MasterRequestResponse, MasterRequestSourceContext, MasterRequestStatus,
} from './dto';

const DESIGNATION_STATUSES: readonly MasterDesignationStatus[] = ['ACTIVE', 'SUSPENDED', 'EXITED'];
const AVAILABILITY_STATUSES: readonly MasterAvailabilityStatus[] = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'];
const SOURCE_CONTEXTS: readonly MasterRequestSourceContext[] = ['PRE_TRADE_INSPECTION', 'AGREEMENT_MILESTONE_REVIEW', 'AGREEMENT_OBLIGATION_REVIEW', 'GENERAL_ADVICE'];
const REQUEST_STATUSES: readonly MasterRequestStatus[] = ['REQUESTED', 'COST_PROPOSED', 'ACCEPTED', 'DECLINED', 'OPINION_SUBMITTED', 'CANCELLED'];

function assertKnown<T extends string>(values: readonly T[], value: string, label: string): asserts value is T {
  if (!(values as readonly string[]).includes(value)) throw new ApiError('invalid-response', `SecurePay returned an unrecognized ${label}: ${value}`);
}

export interface MasterProfileView {
  identityId: string;
  designationStatus: MasterDesignationStatus;
  expertiseDomains: string[];
  serviceArea: string | null;
  availabilityStatus: MasterAvailabilityStatus;
  pricingBasis: string | null;
  qualificationRefs: string[];
  accreditationRefs: string[];
  inspectionCapable: boolean;
  businessIdentityId: string | null;
  designatedAt: string;
}

/**
 * The backend exposes only `identityId` (a UUID) — there is no verified authenticated display-name
 * projection for a Master (same gap Golden Spine F found for Store trader identity). Never fabricate a
 * person's name; the view carries `identityId` only, and the caller renders it as an opaque reference
 * ("Master reference: <identityId>"), not a name.
 */
export function masterProfileView(dto: MasterProfileResponse): MasterProfileView {
  assertKnown(DESIGNATION_STATUSES, dto.designationStatus, 'Master designation status');
  assertKnown(AVAILABILITY_STATUSES, dto.availabilityStatus, 'Master availability status');
  return {
    identityId: dto.identityId, designationStatus: dto.designationStatus, expertiseDomains: dto.expertiseDomains,
    serviceArea: dto.serviceArea, availabilityStatus: dto.availabilityStatus, pricingBasis: dto.pricingBasis,
    qualificationRefs: dto.qualificationRefs, accreditationRefs: dto.accreditationRefs,
    inspectionCapable: dto.inspectionCapable, businessIdentityId: dto.businessIdentityId, designatedAt: dto.designatedAt,
  };
}

export interface MasterRequestView {
  id: string;
  requestingIdentityId: string;
  masterIdentityId: string;
  sourceContext: MasterRequestSourceContext;
  agreementId: string | null;
  agreementVersionId: string | null;
  milestoneId: string | null;
  obligationId: string | null;
  question: string;
  scope: string;
  evidenceRefs: string[];
  siteVisitRequired: boolean;
  /** Decimal string, exactly as the backend supplied it — never reformatted into a JS number. */
  currency: string | null;
  quotedCostMinor: string | null;
  status: MasterRequestStatus;
  createdAt: string;
}

export function masterRequestView(dto: MasterRequestResponse): MasterRequestView {
  assertKnown(SOURCE_CONTEXTS, dto.sourceContext, 'Master request source context');
  assertKnown(REQUEST_STATUSES, dto.status, 'Master request status');
  return {
    id: dto.id, requestingIdentityId: dto.requestingIdentityId, masterIdentityId: dto.masterIdentityId,
    sourceContext: dto.sourceContext, agreementId: dto.agreementId, agreementVersionId: dto.agreementVersionId,
    milestoneId: dto.milestoneId, obligationId: dto.obligationId, question: dto.question, scope: dto.scope,
    evidenceRefs: dto.evidenceRefs, siteVisitRequired: dto.siteVisitRequired, currency: dto.currency,
    quotedCostMinor: dto.quotedCostMinor, status: dto.status, createdAt: dto.createdAt,
  };
}

export interface MasterOpinionView {
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

export function masterOpinionView(dto: MasterOpinionResponse): MasterOpinionView {
  return {
    id: dto.id, requestId: dto.requestId, masterIdentityId: dto.masterIdentityId, agreementId: dto.agreementId,
    agreementVersionId: dto.agreementVersionId, question: dto.question, scope: dto.scope,
    reviewedEvidenceRefs: dto.reviewedEvidenceRefs, siteVisitDetails: dto.siteVisitDetails,
    observations: dto.observations, opinionText: dto.opinionText, limitations: dto.limitations,
    previousOpinionId: dto.previousOpinionId, createdAt: dto.createdAt,
  };
}
