/**
 * Bounded customer language for Payment Release exceptions (`PaymentReleaseExceptionProjectionResponse`, the backend's CUSTOMER-SAFE projection: no provider
 * payloads or stack traces). Exception, settlement and compensation are three separate facts and are never merged into one status.
 *  - exception recorded  != payment failed != payment reversed != resolved
 *  - compensation recorded != money restored to the Agreement's original spending authority
 * Absence of an exception proves nothing about settlement.
 */
export interface ReleaseExceptionView { exceptionType: string; customerSafeReason: string | null; requiredAction: string | null; recordedAt: string; compensatedOutcome: boolean }

const KNOWN_TYPES = new Set(['COMPENSATED', 'HELD_EXCEPTION']);
export const UNKNOWN_EXCEPTION = 'SecurePay has recorded an exception this screen cannot describe yet.';

const REQUIRED_ACTION: Readonly<Record<string, string>> = {
  NO_ACTION_REQUIRED: 'SecurePay says no action is needed from you.',
  OPERATIONS_REVIEW: 'SecurePay records that this needs a review by SecurePay operations. SecurePay doesn’t show that anyone has started that review.',
};
export const UNKNOWN_REQUIRED_ACTION = 'SecurePay has recorded a required step this screen cannot describe yet.';
export const requiredActionWords = (code: string | null | undefined): string | null => code ? (REQUIRED_ACTION[code] ?? UNKNOWN_REQUIRED_ACTION) : null;

/** The customer-safe reason is shown only for an exception type this screen knows; an unknown type gets bounded copy, never a guess. */
export function exceptionReason(e: Pick<ReleaseExceptionView, 'exceptionType' | 'customerSafeReason'>): string {
  return KNOWN_TYPES.has(e.exceptionType) && e.customerSafeReason ? e.customerSafeReason : UNKNOWN_EXCEPTION;
}
export function exceptionHeading(e: Pick<ReleaseExceptionView, 'exceptionType' | 'requiredAction'>): string {
  return e.requiredAction === 'NO_ACTION_REQUIRED' && KNOWN_TYPES.has(e.exceptionType)
    ? 'SecurePay recorded an exception on this payment'
    : 'SecurePay needs attention on this payment';
}
export const COMPENSATION_WORDS = 'SecurePay records a compensating outcome for this exception.';
export const COMPENSATION_NOT_RESTORED = 'That describes the exception. It does not say money was restored to the Agreement’s original spending authority; the settlement state is shown separately.';
export const EXCEPTION_MEANING = 'This is a SecurePay record of a customer-safe exception fact. It doesn’t by itself mean the payment failed, was reversed or was resolved.';
export const NO_EXCEPTION_RETURNED = 'SecurePay did not return a customer-safe exception for this settlement read.';
export const SETTLEMENT_UNCONFIRMED = 'SecurePay couldn’t confirm the current settlement state.';
export function recordedOn(iso: string): string | null {
  const at = new Date(iso); return Number.isNaN(at.getTime()) ? null : at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Agreement Money recovery (exercise reversal) wording. A recovery never rewrites the original Progressed entry, and a completed ledger recovery does not by
 *  itself restore the position's spending headroom (backend doctrine) -- so nothing here says money is available again. */
export const RECOVERY_LABEL: Readonly<Record<string, string>> = {
  REQUESTED: 'Recovery requested for',
  RECOVERY_PENDING: 'Recovery is being worked for',
  RECOVERY_COMPLETED: 'SecurePay records the ledger recovery as completed for',
  RECOVERY_FAILED: 'Recovery could not be completed for',
};
export const RECOVERY_HEADROOM_NOTE = 'A completed recovery does not by itself restore this position’s spending headroom. The position above shows the current state.';
