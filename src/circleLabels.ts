import type { CircleVerificationStatus } from './api/securepay/circle/dto';

/**
 * Plain label vocabulary for the real backend `verificationStatus` enum (this is
 * `ke.securepay.platform.identity.model.IdentityStatus` echoed by CircleProfileResponse — identity
 * lifecycle, not a professional/qualification claim; see task section 4 and docs/PRODUCTION_MIGRATION_LEDGER.md
 * section 17). Deliberately avoids the word "Verified" as a badge, since that would misread as endorsed
 * professional qualification, which this field does not mean. Kept out of circleData.ts (fixture Circle
 * records) so the real production Circle surface never pulls fixture data into its bundle merely to read
 * a label.
 */
export const circleVerificationStatusLabel: Record<CircleVerificationStatus, string> = {
  PENDING: 'Identity pending',
  ACTIVE: 'Identity active',
  SUSPENDED: 'Identity suspended',
  CLOSED: 'Identity closed',
};
