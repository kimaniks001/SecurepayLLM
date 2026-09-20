import { ApiError } from '../../api/securepay/http';

/** A client timeout / network failure / 5xx is not proof a consequential command failed: it may have committed. */
export const isUncertainFinancialError = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN_MONEY = 'SecurePay is not yet sure whether that request was recorded.';

/**
 * One LOGICAL financial command = one idempotency key + one exact request. The invariant lives HERE, below every UI:
 * while an attempt is unresolved (a key was issued and `settle()` has not been called), `keyFor` returns that attempt's key ONLY for the
 * identical signature. A different signature is REFUSED -- it never replaces the pending attempt and never receives another key.
 * Only `settle()` (a definite outcome: success or a definite rejection) releases the attempt. The key lives in memory only.
 */
export type AttemptKey = { ok: true; key: string } | { ok: false; reason: 'different-request-while-unresolved' };
export const UNRESOLVED_ATTEMPT = 'An earlier request is still unresolved. Try that exact request again before making a different one.';

export function createAttemptStore(newKey: () => string = () => crypto.randomUUID()) {
  let current: { signature: string; key: string } | null = null;
  return {
    keyFor(signature: string): AttemptKey {
      if (current) return current.signature === signature ? { ok: true, key: current.key } : { ok: false, reason: 'different-request-while-unresolved' };
      current = { signature, key: newKey() };
      return { ok: true, key: current.key };
    },
    /** Definite outcome (success or a definite rejection): the attempt is over. */
    settle() { current = null; },
    get pending() { return current; },
  };
}
export type AttemptStore = ReturnType<typeof createAttemptStore>;
