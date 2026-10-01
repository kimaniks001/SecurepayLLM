import { useEffect, useState } from 'react';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Surface, SurfaceBody, SurfaceHeader } from '../../components/dna/Surface';
import type { MoneySnapshotGateway, AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot';
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
 * The snapshot itself is a GET and moves nothing. Existing provider quote creation remains
 * deliberately withheld from this UI until the backend can prove environment capability and
 * atomic binding to the Agreement version being viewed.
 */
export function MoneySnapshotPanel({ snapshotGateway, agreementId }: {
  snapshotGateway: MoneySnapshotGateway;
  agreementId: string;
}) {
  const [snapshot, setSnapshot] = useState<AgreementMoneySnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
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
    snapshotGateway.read(agreementId)
      .then(value => { if (live) setSnapshot(value); })
      .catch(() => { if (live) setLoadError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [agreementId, snapshotGateway]);


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
                <p className="text-xs text-sand-500">Only routes returned by SecurePay are shown. Exact charges stay withheld here until quote creation is both environment-readable and atomically bound to the Agreement version being viewed.</p>
              </div>
              {snapshot.fundingOptions.length === 0 ? (
                <p className="text-sm text-sand-600">SecurePay lists no funding route for this Agreement right now.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.fundingOptions.map(option => (
                    <li key={option.railCode} className="rounded-xl border border-cream-200 p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-forest-800">{option.displayName}</div>
                        <div className="text-xs text-sand-500">{option.currency}</div>
                      </div>                      <span className="text-xs text-sand-500">{option.quoteAvailable ? 'Charge quote available from the backend' : 'No quote available'}</span>
                    </li>
                  ))}
                </ul>
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
