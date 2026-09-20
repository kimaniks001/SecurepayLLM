import { ApiError } from '../../api/securepay/http';

/** A client timeout / network failure / 5xx is not proof a consequential command failed: it may have committed. */
export const isUncertainFinancialError = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN_MONEY = 'SecurePay is not yet sure whether that request was recorded.';

/**
 * One LOGICAL financial command = one idempotency key + one exact request. A retry of an unresolved attempt re-sends the SAME key and the
 * SAME request; a genuinely new request (different signature) gets a fresh key only once the previous attempt is settled. The key lives in
 * memory only.
 */
export function createAttemptStore(newKey: () => string = () => crypto.randomUUID()) {
  let current: { signature: string; key: string } | null = null;
  return {
    /** The key for this exact request: the pending attempt's key if the signature matches, else a fresh one. */
    keyFor(signature: string): string {
      if (current && current.signature === signature) return current.key;
      current = { signature, key: newKey() };
      return current.key;
    },
    /** Definite outcome (success or a definite rejection): the attempt is over. */
    settle() { current = null; },
    get pending() { return current; },
  };
}
export type AttemptStore = ReturnType<typeof createAttemptStore>;
