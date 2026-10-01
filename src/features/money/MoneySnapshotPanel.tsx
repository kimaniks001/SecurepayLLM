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
                <p className="text-xs text-sand-500">Reason: {snapshot.releaseRequest.reasonCode.replaceAll('_', ' ').toLowerCase()}.</p>
              )}
              <p className="text-xs text-sand-500">
                Release-request authority is not the same as movement readiness; recipient, destination and pricing bindings have not been dry-run preflighted here.
              </p>
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
                          {option.quoteAvailable ? 'Charge quoting is not enabled in this environment.' : 'No charge quote is available for this route.'}
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
                  <div>Amount to fund: <MoneyValue amount={moneyText(quote.amountMinor, quote.currency)} size="sm" /></div>
                  <div>SecurePay charge: <MoneyValue amount={moneyText(quote.platformChargeMinor, quote.currency)} size="sm" /></div>
                  <div>Rail/provider charge: <MoneyValue amount={moneyText(quote.providerChargeMinor, quote.currency)} size="sm" /></div>
                  <div>Total payable: <MoneyValue amount={moneyText(quote.totalChargeMinor, quote.currency)} size="sm" /></div>
                  <div className="text-xs text-sand-500">This quote expires {new Date(quote.expiresAt).toLocaleString()}. It has not created a payment.</div>
                </div>
              )}
            </div>

            <StatusNotice tone="info">
              SecurePay has not yet assessed whether money can move now. Remaining funded money and Payment Ready do not, by themselves, prove movement authority.
            </StatusNotice>

            <Button variant="ghost" onClick={load}>Refresh money snapshot</Button>
          </div>
        )}
      </SurfaceBody>
    </Surface>
  );
}
