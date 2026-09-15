import type { AvailabilityState } from './api/securepay/store/dto';

/**
 * Plain label vocabulary for the real backend AvailabilityState enum (StoreService.AvailabilityState,
 * verified against feat/securepay-phase9-store-platform) — not demo data. Kept out of storeData.ts
 * (fixture Offer/Store records) so production Store components can import these labels without pulling
 * any fixture data into the production bundle.
 */
export const availabilityStateLabel: Record<AvailabilityState, string> = {
  AVAILABLE: 'Available',
  LOW_AVAILABILITY: 'Limited availability',
  NEEDS_CONFIRMATION: 'Needs confirmation',
  UNAVAILABLE: 'Unavailable',
  PAUSED: 'Paused',
  TAKING_WORK: 'Taking work',
  LIMITED: 'Limited',
  FULLY_BOOKED: 'Fully booked',
  RESTING: 'Not currently taking work',
};
