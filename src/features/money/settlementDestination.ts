import { ApiError } from '../../api/securepay/http';
import type { SettlementDestinationGateway, SettlementDestinationResponse, ExternalDestinationAccountKind } from '../../api/securepay/settlement-destinations';
import { isUncertainFinancialError, type AttemptStore } from './attempt';

/**
 * Settlement destinations are CURRENCY-SCOPED on the backend (current/history take `?currency=`). One explicit currency therefore drives the read of current,
 * the read of history, the register request, the replace request and the post-success reload. Nothing here calls `current()` / `history()` without a currency.
 */
export const isCurrency = (value: string) => /^[A-Za-z]{3}$/.test(value);

/**
 * `current` and `history` are INDEPENDENT reads (SettlementDestinationSelfServiceOrchestrationService): no current destination (404) does NOT mean no history
 * (a replaced/closed destination stays in history), and a failure of one never fabricates or erases the other.
 */
export type CurrentRead = { state: 'found'; value: SettlementDestinationResponse } | { state: 'absent' } | { state: 'unavailable' };
export type HistoryRead = { state: 'loaded'; items: SettlementDestinationResponse[] } | { state: 'unavailable' };
export interface ScopeRead { current: CurrentRead; history: HistoryRead }
export const NO_CURRENT: CurrentRead = { state: 'absent' };

export async function readSettlementScope(gateway: SettlementDestinationGateway, currency: string): Promise<ScopeRead> {
  const scope = currency.toUpperCase();
  const [current, history] = await Promise.all([
    gateway.current(scope).then((value): CurrentRead => ({ state: 'found', value }), (cause): CurrentRead => (cause instanceof ApiError && cause.status === 404 ? { state: 'absent' } : { state: 'unavailable' })),
    gateway.history(scope).then((items): HistoryRead => ({ state: 'loaded', items }), (): HistoryRead => ({ state: 'unavailable' })),
  ]);
  return { current, history };
}

export interface DestinationForm { accountKind: ExternalDestinationAccountKind; bankCode: string; accountNumber: string; beneficiaryName: string; currency: string }
export type SubmitOutcome =
  | { kind: 'ok'; currency: string; scope: ScopeRead }
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
  // The write is proven. The reload keeps independent-read semantics, so a failed reload (either side) can never turn it into a failure.
  return { kind: 'ok', currency: request.currency, scope: await readSettlementScope(gateway, request.currency) };
}
