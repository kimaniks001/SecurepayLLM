// Verified against kimaniks001/SecurePayAPI feat/securepay-phase10-community-circles @ b371a906660493ebc0f83554bfc79362f0c666f2
// (CircleController.java, CircleProfileResponse.java, CircleProfileService.java) and the OpenAPI
// `CircleProfile` schema in contracts/openapi/securepay-api-v1.yaml. This is the entire real Circle
// contract this phase exposes — a self-scoped read composed from identity + referral + Plug-attribution
// + Growth Credit truth. No named-group/membership/feed authority exists (see
// docs/PRODUCTION_MIGRATION_LEDGER.md section 17).

/** Exactly `ke.securepay.platform.identity.model.IdentityStatus` — identity lifecycle, not a
 * professional/qualification claim. An unrecognized value must fail closed (see adapters.ts). */
export type CircleVerificationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface CircleProfileResponse {
  canonicalKsNumber: string;
  displayName: string | null;
  verificationStatus: string;
  memberSince: string; // ISO date-time
  referredTraderCount: number;
  activatedReferredTraderCount: number;
  agreementsBroughtInCount: number;
  /** A factual economic-activity count. NEVER money — no currency, not spendable, not redeemable. */
  growthCreditTotal: number;
}
