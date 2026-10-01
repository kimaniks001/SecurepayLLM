import type { HttpClient } from '../http';

export type FinancialInstitutionClass =
  | 'BANK'
  | 'SACCO'
  | 'ASSET_MANAGER'
  | 'INSURER'
  | 'INSURANCE_INTERMEDIARY'
  | 'PAYMENT_PROVIDER'
  | 'OTHER_APPROVED_FINANCIAL_ENTITY';

export type InstitutionOnboardingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IDENTITY_REVIEW'
  | 'NEEDS_INFORMATION'
  | 'VERIFIED_INSTITUTION'
  | 'CAPABILITY_APPLICATION'
  | 'CAPABILITY_REVIEW'
  | 'SANDBOX_TECHNICAL_CERTIFICATION'
  | 'CAPABILITY_APPROVED'
  | 'LIVE'
  | 'PAUSED'
  | 'UNDER_REVIEW'
  | 'INSTITUTION_SUSPENDED'
  | 'LICENCE_EXPIRED'
  | 'WITHDRAWN';

export interface SubmitFinancialInstitutionRequest {
  institutionKsNumber: string;
  institutionClass: FinancialInstitutionClass;
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  country: string;
  officialWebsite?: string;
  officialDomain?: string;
  representativeName: string;
  representativeRole: string;
  representativeEmail: string;
  representativeTelephone?: string;
  authorityEvidenceReference: string;
  institutionalRelationship: string;
}

export interface FinancialInstitutionDto {
  institutionId: string;
  institutionKsNumber: string;
  institutionClass: FinancialInstitutionClass;
  legalName: string;
  tradingName: string | null;
  registrationNumber: string;
  country: string;
  status: InstitutionOnboardingStatus;
  createdAt: string;
}

/**
 * FS1 institution gateway.
 *
 * Supplying institutionKsNumber never proves authority. The API requires the signed-in human to
 * currently represent that BUSINESS/ORGANIZATION KS. A SUBMITTED or VERIFIED_INSTITUTION response
 * never means any finance, rail, MMF or insurance capability is live.
 */
export function createFinancialInstitutionsGateway(http: HttpClient) {
  return {
    submit: (request: SubmitFinancialInstitutionRequest) =>
      http.request<FinancialInstitutionDto>('/api/v1/financial-services/institutions', {
        method: 'POST',
        body: request,
        auth: 'required',
      }),
  };
}

export type FinancialInstitutionsGateway = ReturnType<typeof createFinancialInstitutionsGateway>;
