import { ApiError } from '../../api/securepay/http';
import type { SettlementDestinationGateway, SettlementDestinationResponse, ExternalDestinationAccountKind } from '../../api/securepay/settlement-destinations';
import { isUncertainFinancialError, type AttemptStore } from './attempt';

/**
 * Settlement destinations are CURRENCY-SCOPED on the backend (current/history take `?currency=`). One explicit currency therefore drives the read of current,
 * the read of history, the register request, the replace request and the post-success reload. Nothing here calls `current()` / `history()` without a currency.
 */
export const isCurrency = (value: string) => /^[A-Za-z]{3}$/.test(value);

export type ScopeRead = { current: SettlementDestinationResponse | null; history: SettlementDestinationResponse[]; notFound: boolean };
export async function readSettlementScope(gateway: SettlementDestinationGateway, currency: string): Promise<ScopeRead> {
  const scope = currency.toUpperCase();
  try {
    const [current, history] = await Promise.all([gateway.current(scope), gateway.history(scope)]);
    return { current, history, notFound: false };
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) return { current: null, history: [], notFound: true };
    throw cause;
  }
}

export interface DestinationForm { accountKind: ExternalDestinationAccountKind; bankCode: string; accountNumber: string; beneficiaryName: string; currency: string }
export type SubmitOutcome =
  | { kind: 'ok'; currency: string; scope: ScopeRead | null }
  | { kind: 'refused' }          // a different request while one is unresolved: nothing sent
  | { kind: 'uncertain' }        // same request + same keys must be retried
  | { kind: 'rejected'; error: unknown };

/** One logical register/replace: one key (two for replace) per exact request, released only on a definite outcome. The reload uses the SAME currency. */
export async function submitDestination(
  gateway: SettlementDestinationGateway,
  attempts: { main: AttemptStore; verification: AttemptStore },
  mode: 'register' | 'replace',
  form: DestinationForm,
): Promise<SubmitOutcome> {
  const request = { destinationType: 'PRIMARY_SETTLEMENT' as const, currency: form.currency.toUpperCase(), accountKind: form.accountKind, bankCode: form.accountKind === 'BANK' ? form.bankCode : null, accountNumber: form.accountNumber, beneficiaryName: form.beneficiaryName };
  const signature = `${mode}:${JSON.stringify(request)}`;
  const main = attempts.main.keyFor(signature);
  const verify = attempts.verification.keyFor(signature);
  if (!main.ok || !verify.ok) return { kind: 'refused' };
  try {
    if (mode === 'register') await gateway.register(request, main.key);
    else await gateway.replace(request, main.key, verify.key);
  } catch (cause) {
    if (isUncertainFinancialError(cause)) return { kind: 'uncertain' };
    attempts.main.settle(); attempts.verification.settle();
    return { kind: 'rejected', error: cause };
  }
  attempts.main.settle(); attempts.verification.settle();
  try { return { kind: 'ok', currency: request.currency, scope: await readSettlementScope(gateway, request.currency) }; }
  catch { return { kind: 'ok', currency: request.currency, scope: null }; } // the write succeeded; only the reload failed
}
