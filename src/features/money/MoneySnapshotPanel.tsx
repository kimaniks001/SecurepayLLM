import { useEffect, useState } from 'react';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Surface, SurfaceBody, SurfaceHeader } from '../../components/dna/Surface';
import type { MoneySnapshotGateway, AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot';
import type { AgreementFundingQuoteResponse, PaymentIntentGateway } from '../../api/securepay/payment-intent';
import { moneyText } from './amount';

function amount(minor: number | null, currency: string | null) {
  if (minor === null || !currency) return null;
  return moneyText(minor, currency);
}


function movementText(snapshot: AgreementMoneySnapshotResponse) {
  const movement = snapshot.movement;
  if (movement.state === 'READY') {
    return 'Ready now — SecurePay’s read-only preflight passed the current movement prerequisites.';
  }
  if (movement.state === 'UNAVAILABLE') {
    return 'SecurePay could not complete movement preflight, so no amount is being claimed as movable.';
  }
  const messages: Record<string, string> = {
    ENVIRONMENT_DISABLED: 'Money movement is disabled in this environment.',
    RELEASE_AUTHORITY_BLOCKED: 'Release is not currently authorised for this Agreement.',
    EVALUATION_STALE: 'The Payment Ready evaluation is no longer current.',
    UNSUPPORTED_PRODUCT: 'This Agreement Money flow is not supported for participant movement yet.',
    PRICING_OR_DESTINATION_UNRESOLVED: 'SecurePay cannot safely bind the current pricing and settlement destination.',
    FUNDING_NOT_FOUND: 'SecurePay cannot find authoritative participant funding for this evaluated amount.',
    FUNDING_AMBIGUOUS: 'SecurePay found more than one possible participant funding account.',
    INSUFFICIENT_FUNDS: 'The authoritative participant funding balance is below the evaluated release amount.',
    RECIPIENT_OR_PRICING_UNRESOLVED: 'The recipient, destination, or pricing no longer passes release checks.',
    RESERVE_LEDGER_UNAVAILABLE: 'The release reserve ledger is not currently available.',
    SETTLEMENT_KILL_SWITCH_TRIPPED: 'Settlement is temporarily disabled by SecurePay’s operational safety controls.',
    EXECUTION_LEDGER_UNAVAILABLE: 'A required settlement ledger is not currently available.',
    EXTERNAL_RAIL_UNAVAILABLE: 'The configured external settlement rail is not currently available.',
    EXTERNAL_ECONOMICS_UNRESOLVED: 'SecurePay has not yet confirmed the provider costs needed to make this external settlement economically safe.',
  };
  return messages[movement.reasonCode] ?? 'SecurePay does not currently say this money can move.';
}

function bearerText(value: string) {
  return value.replace(/_/g, ' ').toLowerCase();
}

function readinessText(snapshot: AgreementMoneySnapshotResponse) {
  const readiness = snapshot.paymentReady;
  if (readiness.state === 'NOT_EVALUATED') {
    return 'Payment Ready has not been evaluated for this Agreement version yet.';
  }
  if (readiness.state === 'AMBIGUOUS') {
    return 'SecurePay has more than one current Payment Ready scope, so no single readiness answer is shown.';
  }
  return readiness.ready
    ? 'Payment Ready — SecurePay says the evaluated conditions are satisfied.'
    : 'Not Payment Ready — one or more evaluated conditions are still outstanding.';
}

/**
 * Vision Money Gap V1 — the compact, single-read truth surface.
 *
 * Snapshot reads move nothing. Charge quotation is the one explicit financial-adjacent action
 * enabled here, and only when the backend itself says the current environment permits it. The
 * request carries the exact current Agreement version from this snapshot; the API row-locks and
 * rechecks that version before creating any provider quote evidence.
 */
export function MoneySnapshotPanel({ snapshotGateway, paymentIntentGateway, agreementId }: {
  snapshotGateway: MoneySnapshotGateway;
  paymentIntentGateway: PaymentIntentGateway;
  agreementId: string;
}) {
  const [snapshot, setSnapshot] = useState<AgreementMoneySnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quote, setQuote] = useState<AgreementFundingQuoteResponse | null>(null);
  const [quoteRail, setQuoteRail] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    setQuote(null);
    setQuoteRail(null);
    setQuoteError(false);
    snapshotGateway.read(agreementId)
      .then(setSnapshot)
      .catch(() => { setSnapshot(null); setLoadError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError(false);
    setSnapshot(null);
    setQuote(null);
    setQuoteRail(null);
    setQuoteError(false);
    snapshotGateway.read(agreementId)
      .then(value => { if (live) setSnapshot(value); })
      .catch(() => { if (live) setLoadError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [agreementId, snapshotGateway]);

  const showCharges = async (railCode: string) => {
    if (!snapshot || !snapshot.feeQuoteRequestsPermitted) return;
    setQuoteRail(railCode);
    setQuote(null);
    setQuoteError(false);
    try {
      setQuote(await paymentIntentGateway.createVersionBoundQuote(
        agreementId,
        railCode,
        snapshot.currentVersionId,
      ));
    } catch {
      setQuoteError(true);
    } finally {
      setQuoteRail(null);
    }
  };

  return (
    <Surface>
      <SurfaceHeader
        title="Money at a glance"
        description="One backend-owned snapshot of this Agreement’s money state. Nothing here is calculated by this screen."
      />
      <SurfaceBody>
        {loading && <p role="status" className="text-sm text-sand-500">Reading Agreement Money…</p>}
        {loadError && (
          <StatusNotice tone="warning">
            SecurePay couldn’t read the Agreement Money snapshot. That does not mean the Agreement has no money state.
          </StatusNotice>
        )}

        {snapshot && (
          <div className="space-y-5">
            <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-1">
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Payment Ready</p>
              <p className="text-sm text-forest-800">{readinessText(snapshot)}</p>
              {snapshot.paymentReady.state === 'EVALUATED' && snapshot.paymentReady.amountMinor !== null && snapshot.paymentReady.currency && (
                <p className="text-xs text-sand-600">
                  Evaluated amount: <MoneyValue amount={moneyText(snapshot.paymentReady.amountMinor, snapshot.paymentReady.currency)} size="sm" />
                </p>
              )}
            </div>

            <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-1">
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Release request authority</p>
              <p className="text-sm text-forest-800">
                {snapshot.releaseRequest.authorityGranted
                  ? 'You currently have backend authority to request release for the evaluated scope.'
                  : 'SecurePay does not currently grant release-request authority for this Agreement.'}
              </p>
              {!snapshot.releaseRequest.participantCommandsPermitted && (
                <p className="text-xs text-sand-500">Participant financial commands are disabled in this environment.</p>
              )}
              {!snapshot.releaseRequest.authorityGranted && (
                <p className="text-xs text-sand-500">Reason: {snapshot.releaseRequest.reasonCode.replace(/_/g, ' ').toLowerCase()}.</p>
              )}
              <p className="text-xs text-sand-500">
                Release-request authority is only one input. The separate movement preflight below checks the remaining read-only movement prerequisites.
              </p>
            </div>

            <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-1" data-testid="money-movement-preflight">
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Can money move now?</p>
              <p className="text-sm text-forest-800">{movementText(snapshot)}</p>
              {snapshot.movement.state === 'READY' && snapshot.movement.amountMinor !== null && snapshot.movement.currency && (
                <div className="pt-1">
                  <MoneyValue amount={moneyText(snapshot.movement.amountMinor, snapshot.movement.currency)} size="lg" />
                  <p className="text-xs text-sand-500 mt-0.5">
                    Exact amount that passed the current preflight
                    {snapshot.movement.destinationClassification ? ` · ${snapshot.movement.destinationClassification.toLowerCase()} destination` : ''}
                    {snapshot.movement.railCode ? ` · ${snapshot.movement.railCode}` : ''}
                  </p>
                </div>
              )}
              {snapshot.movement.state === 'READY' && snapshot.movement.economics && snapshot.movement.currency && (
                <div className="mt-3 rounded-lg border border-cream-200 bg-white/60 p-3 space-y-1" data-testid="money-movement-economics">
                  <p className="text-xs font-medium text-forest-800">Current commercial decomposition</p>
                  <div className="text-xs text-sand-600">Expected recipient principal: <MoneyValue amount={moneyText(snapshot.movement.economics.recipientPrincipalMinor, snapshot.movement.currency)} size="sm" /></div>
                  <div className="text-xs text-sand-600">SecurePay charge: <MoneyValue amount={moneyText(snapshot.movement.economics.securePayFeeMinor, snapshot.movement.currency)} size="sm" /></div>
                  <div className="text-xs text-sand-600">Provider/rail charge: <MoneyValue amount={moneyText(snapshot.movement.economics.providerRailChargeMinor, snapshot.movement.currency)} size="sm" /></div>
                  {snapshot.movement.economics.taxMinor > 0 && (
                    <div className="text-xs text-sand-600">Tax: <MoneyValue amount={moneyText(snapshot.movement.economics.taxMinor, snapshot.movement.currency)} size="sm" /></div>
                  )}
                  <div className="text-xs text-sand-600">Fee-inclusive movement amount: <MoneyValue amount={moneyText(snapshot.movement.economics.totalPayableMinor, snapshot.movement.currency)} size="sm" /></div>
                  <p className="text-xs text-sand-500">
                    Payer role: {bearerText(snapshot.movement.economics.payerRole)} · SecurePay fee bearer: {bearerText(snapshot.movement.economics.feeBearer)} · rail-charge bearer: {bearerText(snapshot.movement.economics.railChargeBearer)}
                  </p>
                  <p className="text-xs text-sand-500">Pricing version: {snapshot.movement.economics.pricingVersion}. This is backend pricing truth, not an instruction to move money.</p>
                </div>
              )}
              {snapshot.movement.state !== 'READY' && (
                <p className="text-xs text-sand-500">No movable amount is asserted while this preflight is {snapshot.movement.state.toLowerCase()}.</p>
              )}
              <p className="text-xs text-sand-500">This check moves no money. Every mutable condition is checked again when a future movement command is actually executed.</p>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Agreement Money positions</p>
                <p className="text-xs text-sand-500">Each position stays obligation- and currency-scoped. SecurePay does not invent a cross-currency total.</p>
              </div>
              {snapshot.positions.length === 0 ? (
                <p className="text-sm text-sand-600">No monetary position is available for this Agreement.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.positions.map(position => {
                    const currency = position.currency ?? position.proposedCurrency;
                    return (
                      <li key={position.obligationId ?? position.obligationTitle ?? 'position'} className="rounded-xl border border-cream-200 p-3">
                        <div className="font-medium text-forest-800">{position.obligationTitle ?? 'Agreement Money position'}</div>
                        {!position.established ? (
                          <div className="mt-1 text-sm text-sand-600">
                            {amount(position.proposedAmountMinor, currency) && <>Proposed: <MoneyValue amount={amount(position.proposedAmountMinor, currency)!} size="sm" /></>}
                            <div className="text-xs text-sand-500">Not established as funded authority.</div>
                          </div>
                        ) : (
                          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-sand-600">
                            <div><dt>Authorised maximum</dt><dd className="text-forest-800">{amount(position.authorisedMaxAmountMinor, currency) ? <MoneyValue amount={amount(position.authorisedMaxAmountMinor, currency)!} size="sm" /> : 'Unknown'}</dd></div>
                            <div><dt>Funded</dt><dd className="text-forest-800">{amount(position.fundedTotalMinor, currency) ? <MoneyValue amount={amount(position.fundedTotalMinor, currency)!} size="sm" /> : 'Unknown'}</dd></div>
                            <div><dt>Progressed</dt><dd className="text-forest-800">{amount(position.exercisedOrSettledMinor, currency) ? <MoneyValue amount={amount(position.exercisedOrSettledMinor, currency)!} size="sm" /> : 'Unknown'}</dd></div>
                            <div><dt>Returned</dt><dd className="text-forest-800">{amount(position.releasedTotalMinor, currency) ? <MoneyValue amount={amount(position.releasedTotalMinor, currency)!} size="sm" /> : 'Unknown'}</dd></div>
                            <div><dt>Remaining funded</dt><dd className="text-forest-800">{amount(position.remainingFundedMinor, currency) ? <MoneyValue amount={amount(position.remainingFundedMinor, currency)!} size="sm" /> : 'Unknown'}</dd></div>
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Funding routes and charges</p>
                <p className="text-xs text-sand-500">Only routes returned by SecurePay are shown. A charge quote does not create or initiate a payment.</p>
              </div>
              {snapshot.fundingOptions.length === 0 ? (
                <p className="text-sm text-sand-600">SecurePay lists no funding route for this Agreement right now.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.fundingOptions.map(option => (
                    <li key={option.railCode} className="rounded-xl border border-cream-200 p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-forest-800">{option.displayName}</div>
                        <div className="text-xs text-sand-500">{option.currency}</div>
                      </div>
                      {option.quoteAvailable && snapshot.feeQuoteRequestsPermitted ? (
                        <Button
                          variant="secondary"
                          onClick={() => void showCharges(option.railCode)}
                          disabled={quoteRail !== null}
                        >
                          {quoteRail === option.railCode ? 'Checking charges…' : 'See charges'}
                        </Button>
                      ) : (
                        <span className="text-xs text-sand-500">
                          {option.quoteAvailable
                            ? 'Charge quoting is not enabled in this environment.'
                            : 'No authoritative charge quote is available, so this route cannot create an executable payment yet.'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {quoteError && (
                <StatusNotice tone="warning">
                  SecurePay couldn’t produce that charge quote. The Agreement may have changed, the route may no longer be eligible, or quoting may no longer be available. No payment was created.
                </StatusNotice>
              )}
              {quote && (
                <div className="rounded-xl border border-forest-200 bg-cream-50 p-3 space-y-1 text-sm text-sand-700" data-testid="money-fee-quote">
                  <div className="font-medium text-forest-800">Charge quote</div>
                  <div>Recipient principal: <MoneyValue amount={moneyText(quote.amountMinor, quote.currency)} size="sm" /></div>
                  <div>SecurePay charge: <MoneyValue amount={moneyText(quote.platformChargeMinor, quote.currency)} size="sm" /></div>
                  <div>SecurePay must receive: <MoneyValue amount={moneyText(quote.securePayReceivableMinor, quote.currency)} size="sm" /></div>
                  <div>
                    Rail/provider charge: {quote.providerChargeMinor === null
                      ? <span className="text-sand-500">Unknown</span>
                      : <MoneyValue amount={moneyText(quote.providerChargeMinor, quote.currency)} size="sm" />}
                  </div>
                  <div>
                    Total payer out-of-pocket: {quote.totalChargeMinor === null
                      ? <span className="text-sand-500">Unknown</span>
                      : <MoneyValue amount={moneyText(quote.totalChargeMinor, quote.currency)} size="sm" />}
                  </div>
                  <div className="text-xs text-sand-500">
                    Payer role: {bearerText(quote.payerRole)} · SecurePay fee bearer: {bearerText(quote.feeBearer)} · rail-charge bearer: {bearerText(quote.railChargeBearer)}
                  </div>
                  <div className="mt-2 rounded-lg border border-cream-200 bg-white/60 p-2 space-y-1" data-testid="money-economic-safety">
                    <div className="text-xs font-medium text-forest-800">
                      Economic safety: {quote.economicState === 'READY' ? 'ready' : 'blocked'}
                    </div>
                    <div className="text-xs text-sand-500">Reason: {bearerText(quote.economicReasonCode)}.</div>
                    <div className="text-xs text-sand-500">
                      Provider cost to SecurePay: {quote.providerCostMinor === null
                        ? 'Unknown'
                        : moneyText(quote.providerCostMinor, quote.currency)}
                    </div>
                    {quote.expectedCostMinor !== null && (
                      <div className="text-xs text-sand-500">Expected allocated cost: {moneyText(quote.expectedCostMinor, quote.currency)}</div>
                    )}
                    {quote.expectedMarginMinor !== null && (
                      <div className="text-xs text-sand-500">Expected margin: {moneyText(quote.expectedMarginMinor, quote.currency)}</div>
                    )}
                    {quote.minimumMarginMinor !== null && (
                      <div className="text-xs text-sand-500">Minimum permitted margin: {moneyText(quote.minimumMarginMinor, quote.currency)}</div>
                    )}
                    <div className="text-xs text-sand-500">Economics policy: {quote.economicPolicyVersion ?? 'Not configured'}.</div>
                    {quote.economicState !== 'READY' && (
                      <div className="text-xs font-medium text-sand-700">This quote is not execution-eligible.</div>
                    )}
                  </div>
                  <div className="text-xs text-sand-500">Pricing version: {quote.pricingVersion}.</div>
                  <div className="text-xs text-sand-500">This quote expires {new Date(quote.expiresAt).toLocaleString()}. It has not created a payment.</div>
                </div>
              )}
            </div>

            <Button variant="ghost" onClick={load}>Refresh money snapshot</Button>
          </div>
        )}
      </SurfaceBody>
    </Surface>
  );
}
