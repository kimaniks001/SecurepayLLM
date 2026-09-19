// Verified against kimaniks001/SecurePayAPI feat/securepay-phase10-community-circles @ b371a906660493ebc0f83554bfc79362f0c666f2
// (CircleController.java, CircleProfileResponse.java, CircleProfileService.java) and the OpenAPI
// `CircleProfile` schema in contracts/openapi/securepay-api-v1.yaml. This is the entire real Circle
// contract this phase exposes — a self-scoped read composed from identity + referral + Plug-attribution
// truth. No named-group/membership/feed authority exists (see
// docs/PRODUCTION_MIGRATION_LEDGER.md section 17).
//
// Final Phase 4 Economy correction (programme decision): the former `growthCreditTotal` weighted-points
// field is retired from this contract — it conflicted with the locked no-points/no-gamification
// doctrine. The backend no longer returns it (see CircleProfileResponse.java).

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
}
