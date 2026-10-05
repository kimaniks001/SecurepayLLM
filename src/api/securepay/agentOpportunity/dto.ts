export type AgentNeedMode = 'ANSWER' | 'SUPPORT' | 'QUICK_CONTRACT' | 'COMMUNITY_SAVER' | 'OUTREACH';

export interface AgentHumanChoiceDto {
  reference: string;
  displayName: string;
  role: 'PLUG' | 'MASTER' | 'STORE' | 'PARTICIPANT' | string;
  capability: string;
  availability: string;
  rateMinor: number | '' | null;
  currency: string;
  status: string;
}

export interface SupportResultDto {
  requestId: string;
  status: string;
  offers: Array<{ offerId: string; helperIdentityId: string; displayName: string; helperRole: 'PLUG' | 'MASTER'; capabilityKey: string; availabilityLabel: string; rateMinor: number; currency: string; billingBasis: 'FIXED' | 'HOURLY' | 'PER_SESSION' }>;
}

export interface QuickContractResultDto {
  opportunityId: string;
  status: string;
  candidates: Array<{ candidateId: string; identityId: string; displayName: string; candidateKind: string; capabilityKey: string; availabilityLabel: string; currentLoad?: number | null; riskFit: 'ELIGIBLE' | 'REVIEW_REQUIRED'; rateMinor?: number | null; currency?: string | null; status: string }>;
}
