import type { AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot/dto';

export type MoneyReviewTruth =
  | { kind: 'unavailable'; reason: string }
  | { kind: 'ready'; snapshot: AgreementMoneySnapshotResponse; canQuote: boolean; canMove: boolean };

/** Read-only UI gating is deliberately less permissive than financial execution.
 * It cannot grant Money authority; those decisions belong to the backend. */
export function verifyMoneyReviewSnapshot(
  agreementId: string, expectedVersion: string | null,
  snapshot: AgreementMoneySnapshotResponse,
): MoneyReviewTruth {
  if (!agreementId || snapshot.agreementId !== agreementId) {
    return { kind: 'unavailable', reason: 'This Money result belongs to a different Agreement. No amounts are displayed.' };
  }
  if (!snapshot.currentVersionId || (expectedVersion && expectedVersion !== snapshot.currentVersionId)) {
    return { kind: 'unavailable', reason: 'The Agreement version changed. Review the latest Agreement before using Money.' };
  }
  const keys = new Set<string>();
  for (const position of snapshot.positions) {
    const scopeKey = position.obligationId ?? 'agreement-level';
    if (position.agreementId !== agreementId ||
        keys.has(scopeKey) ||
        [
          position.authorisedMaxAmountMinor, position.fundedTotalMinor, position.exercisedOrSettledMinor,
          position.releasedTotalMinor, position.remainingFundedMinor,
        ].some(amount => amount !== null && (!Number.isSafeInteger(amount) || amount < 0))) {
      return { kind: 'unavailable', reason: 'The financial records cannot be shown consistently. Refresh the Agreement Money.' };
    }
    keys.add(scopeKey);
  }
  const move = snapshot.movement;
  const canMove = move.state === 'READY' && move.amountMinor !== null &&
    Number.isSafeInteger(move.amountMinor) && move.amountMinor > 0 &&
    !!move.currency && !!move.evaluationId &&
    !!move.economics && !!move.economics.pricingVersion;
  return {
    kind: 'ready', snapshot, canMove,
    // Quote permission is a separate current-version API gate, never computed
    // from a suggested Agreement price, rail card, or front-end acceptance.
    canQuote: snapshot.feeQuoteRequestsPermitted === true,
  };
}

export function readableMoneyReason(reason: string): string {
  const known: Record<string,string> = {
    ENVIRONMENT_DISABLED: 'Money movement is disabled in this environment.',
    RELEASE_AUTHORITY_BLOCKED: 'Release has not been authorised for this Agreement.',
    INSUFFICIENT_FUNDS: 'The authorised available funding is insufficient.',
    EVALUATION_STALE: 'The financial assessment needs to be refreshed.',
    EXTERNAL_RAIL_UNAVAILABLE: 'The required external financial rail is unavailable.',
    PRICING_OR_DESTINATION_UNRESOLVED: 'The pricing or receiving institution has not been confirmed.',
    EXTERNAL_ECONOMICS_UNRESOLVED: 'The provider costs are not yet established.',
    FUNDING_NOT_FOUND: 'SecurePay cannot confirm the required funding.',
  };
  return known[reason] ?? 'SecurePay has not confirmed permission to move this money.';
}
