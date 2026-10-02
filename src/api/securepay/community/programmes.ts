import { segment, type HttpClient } from '../http';

export type PlugCapability =
  | 'FULFILMENT' | 'VERIFICATION' | 'DISCOVERY' | 'POOLING' | 'ASSEMBLY';

export type PlugCapabilityStatus =
  | 'NOT_STARTED' | 'LEARNING' | 'ASSESSMENT_PENDING' | 'QUALIFIED' | 'SUSPENDED';

export interface PlugQualificationDto {
  identityId: string;
  foundationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  assessmentStatus: 'NOT_ATTEMPTED' | 'PASSED' | 'FAILED';
  basicQualified: boolean;
  qualifiedAt: string | null;
  updatedAt: string;
}

export interface PlugCapabilityQualificationDto {
  identityId: string;
  capability: PlugCapability;
  status: PlugCapabilityStatus;
  evidenceReference: string | null;
  qualifiedAt: string | null;
  updatedAt: string;
}

export interface MasterFoundationDto {
  identityId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: string | null;
  updatedAt: string;
}

export type MasterClaimStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'MORE_INFORMATION_REQUIRED'
  | 'VERIFIED' | 'NOT_VERIFIED' | 'EXPIRED' | 'REVOKED';

export interface MasterCapabilityClaimDto {
  id: string;
  identityId: string;
  capabilityKey: string;
  capabilityLabel: string;
  claimStatus: MasterClaimStatus;
  evidenceReference: string;
  reviewerScope: string | null;
  reviewReference: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MasterReviewOutcome = 'VERIFIED' | 'MORE_INFORMATION_REQUIRED' | 'NOT_VERIFIED';

export type ApprenticeshipStage =
  | 'OBSERVE' | 'ASSIST' | 'PRACTISE' | 'SUPERVISED_PERFORMANCE'
  | 'REVIEWED_PERFORMANCE' | 'DEMONSTRATE_COMPETENCE';

export type ApprenticeshipStageResult = 'PENDING' | 'PASS' | 'MORE_PRACTICE';

export function createTrustProjectProgrammesGateway(http: HttpClient) {
  return {
    plug: {
      startFoundation: () =>
        http.request<PlugQualificationDto>('/api/v1/trust-project/plug/foundation/start', {
          method: 'POST', auth: 'required',
        }),
      completeFoundation: () =>
        http.request<PlugQualificationDto>('/api/v1/trust-project/plug/foundation/complete', {
          method: 'POST', auth: 'required',
        }),
      recordAssessment: (passed: boolean) =>
        http.request<PlugQualificationDto>('/api/v1/trust-project/plug/assessment', {
          method: 'POST', body: { passed }, auth: 'required',
        }),
      setCapability: (capability: PlugCapability, status: PlugCapabilityStatus, evidenceReference: string | null) =>
        http.request<PlugCapabilityQualificationDto>('/api/v1/trust-project/plug/capability', {
          method: 'POST', body: { capability, status, evidenceReference }, auth: 'required',
        }),
    },

    master: {
      startFoundation: () =>
        http.request<MasterFoundationDto>('/api/v1/trust-project/master/foundation/start', {
          method: 'POST', auth: 'required',
        }),
      completeFoundation: () =>
        http.request<MasterFoundationDto>('/api/v1/trust-project/master/foundation/complete', {
          method: 'POST', auth: 'required',
        }),
      submitClaim: (capabilityKey: string, capabilityLabel: string, evidenceReference: string) =>
        http.request<MasterCapabilityClaimDto>('/api/v1/trust-project/master/claims', {
          method: 'POST', body: { capabilityKey, capabilityLabel, evidenceReference }, auth: 'required',
        }),
      claim: (capabilityKey: string) =>
        http.request<MasterCapabilityClaimDto>(
          '/api/v1/trust-project/master/claims/' + segment(capabilityKey),
          { auth: 'required' },
        ),
      requestReview: (
        capabilityKey: string,
        reviewerKsNumber: string,
        agreementId: string | null,
        reviewFeeReference: string | null,
      ) =>
        http.request<{ reviewId: string }>(
          '/api/v1/trust-project/master/claims/' + segment(capabilityKey) + '/reviews',
          {
            method: 'POST',
            body: { reviewerKsNumber, agreementId, reviewFeeReference },
            auth: 'required',
          },
        ),
      recordReviewOutcome: (
        reviewId: string,
        outcome: MasterReviewOutcome,
        outcomeNote: string | null,
        expiresAt: string | null,
      ) =>
        http.request<void>('/api/v1/trust-project/master/reviews/' + segment(reviewId) + '/outcome', {
          method: 'POST', body: { outcome, outcomeNote, expiresAt }, auth: 'required',
        }),
    },

    apprenticeships: {
      recordProgression: (
        projectId: string,
        ordinal: number,
        stage: ApprenticeshipStage,
        evidenceReference: string | null,
        result: ApprenticeshipStageResult,
      ) =>
        http.request<void>(
          '/api/v1/community/apprenticeship-projects/' + segment(projectId) + '/progression',
          { method: 'POST', body: { ordinal, stage, evidenceReference, result }, auth: 'required' },
        ),
      competence: (projectId: string) =>
        http.request<{ demonstrated: boolean }>(
          '/api/v1/community/apprenticeship-projects/' + segment(projectId) + '/progression/competence',
          { auth: 'required' },
        ),
    },
  };
}

export type TrustProjectProgrammesGateway = ReturnType<typeof createTrustProjectProgrammesGateway>;
