export interface PartnerCapabilityResponse {
  capability: string;
  enabled: boolean;
  currency: string;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  feeDescription: string | null;
}

export interface RegulatedPartnerResponse {
  id: string;
  partnerCode: string;
  legalName: string;
  displayName: string;
  partnerType: string;
  environment: string;
  status: string;
  supportedCurrencies: string[];
  createdAt: string;
  updatedAt: string;
  capabilities: PartnerCapabilityResponse[];
}
