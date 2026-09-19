import type { PaymentReadinessStatus, ParticipantNextAction } from './types';

/**
 * Plain label vocabulary for the real backend Payment Ready/next-action codes — not demo data. Kept
 * out of moneyData.ts (which also holds fabricated MoneyDetail fixtures) so production components can
 * import these labels without pulling any demo/fixture record into the production bundle.
 */
export const paymentReadinessLabel: Record<PaymentReadinessStatus, string> = {
  NO_EVALUATION_YET: 'Money not yet evaluated',
  READY: 'Ready for payment',
  NOT_READY: 'Not ready for payment',
  PARTIALLY_READY: 'Partially ready for payment',
  BLOCKED: 'Blocked',
};

export const nextActionLabel: Record<ParticipantNextAction, string> = {
  FUND_AGREEMENT: 'Fund agreement',
  CHOOSE_METHOD: 'Choose payment method',
  CHECK_STATUS: 'Check status',
  REVIEW_PAYMENT: 'Review payment',
  REFRESH: 'Refresh Money status',
  TRY_AGAIN: 'Try again',
  CHOOSE_ANOTHER: 'Choose another method',
  VIEW_AGREEMENT: 'View agreement',
  none: 'No action available',
};
