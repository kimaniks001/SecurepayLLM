// Verified against kimaniks001/SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @
// 978437f300244119302607ba3e656a76253190bb (ReferralController.java, the api/referral/request|response
// DTOs, ReferralRelationshipStatus.java). Byte-identical to `origin/main` — real, live backend authority
// today, distinct from the KeyContract per-Agreement Plug attribution domain (see
// api/securepay/agreements/dto.ts and docs/PRODUCTION_MIGRATION_LEDGER.md section 18 §"two referral
// domains"). This is the R11A generic shareable-code referral system.

export type ReferralRelationshipStatus = 'PENDING' | 'ACTIVATED' | 'QUALIFIED';

export interface ReferralCodeResponse { code: string; issuedAt: string }
export interface RedeemReferralCodeRequest { code: string }
export interface RedeemReferralCodeResponse { relationshipId: string; status: string; createdAt: string }

export interface ReferralRelationshipResponse {
  relationshipId: string;
  referredKsNumber: string;
  status: string;
  createdAt: string;
  activatedAt: string | null;
  qualifiedAt: string | null;
  /** Nullable Long — null until `ReferralQualificationService.recordQualification` runs off a real,
   * durable payment-release execution. Never client- or Agent-derived. */
  rewardAmountMinor: number | null;
  rewardCurrency: string | null;
  pricingVersion: string | null;
  referralRuleVersion: string | null;
  qualificationExplanation: string | null;
  settlementEvidenceReference: string | null;
}

export interface ReferralHistoryResponse {
  referralCode: string;
  totalReferred: number;
  activatedOrLaterCount: number;
  relationships: ReferralRelationshipResponse[];
}

export interface LifetimeShareTotalResponse { currency: string; grossShareMinor: string; qualifiedEntitlementCount: number }
export interface LifetimeShareEntryResponse {
  entitlementRef: string;
  agreementId: string;
  platformFeeBasisMinor: string;
  grossShareMinor: string;
  currency: string;
  shareRuleVersion: string;
  taxTreatment: string;
  entitlementStatus: string;
  qualifiedAt: string;
}
/** Plug-facing aggregate earnings read. Deliberately carries no available/withdrawable/net/payout field
 * (backend Javadoc, verbatim). No Bolt Plug-dashboard surface exists to attach this to this slice — the
 * gateway method is wired and tested, not forced onto an invented UI (same pattern as Store's
 * `updateMyProfile`, docs/PRODUCTION_MIGRATION_LEDGER.md section 16.1). */
export interface LifetimeShareResponse { totals: LifetimeShareTotalResponse[]; entries: LifetimeShareEntryResponse[]; limit: number; offset: number }
