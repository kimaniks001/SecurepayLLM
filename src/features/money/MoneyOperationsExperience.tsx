import { useState } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { ApiError } from '../../api/securepay/http';
import type { MoneyOperationsGateway, MoneyOperationsSummaryResponse } from '../../api/securepay/money-operations';

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/**
 * Final Completion Phase 2 completion pass, Section 6 -- the Money-operations read surface for
 * support/ops roles. Read-only: this page has no mutation action anywhere on it, because
 * inspection never grants financial mutation authority (see MoneyOperationsService's javadoc).
 * Only summary fields are shown -- never a raw provider-adjacent payload.
 */
export function MoneyOperationsExperience({ gateway, onLeave }: { gateway: MoneyOperationsGateway; onLeave: () => void }) {
  const [summary, setSummary] = useState<MoneyOperationsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setSummary(await gateway.summary()); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-cream-100 flex flex-col pb-8">
      <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between">
        <button onClick={onLeave} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back</button>
        <img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" />
      </header>
      <div className="flex-1 px-4 md:px-8 py-6 space-y-6 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="font-display text-2xl text-forest-800">Money operations</h1>
          <p className="mt-1 text-sm text-sand-600">Read-only. Inspecting this never grants any financial mutation authority.</p>
        </div>
        {error && <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-sand-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}
        {!summary ? (
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Load summary</button>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-cream-200 bg-white shadow-card p-5 space-y-2">
              <h2 className="font-display text-lg text-forest-800">Choice connector</h2>
              <p className="text-sm text-sand-700">Connector active: <strong>{String(summary.choiceConnectorActive)}</strong></p>
              <p className="text-sm text-sand-700">Outbound transfer allowed: <strong>{String(summary.choiceOutboundTransferAllowed)}</strong></p>
              <p className="text-sm text-sand-700">Internal transfer certified: <strong>{String(summary.choiceInternalTransferCertified)}</strong></p>
              <p className="text-sm text-sand-700">FX enabled: <strong>{String(summary.fxEnabled)}</strong></p>
            </section>

            <section className="rounded-2xl border border-cream-200 bg-white shadow-card p-5 space-y-2">
              <h2 className="font-display text-lg text-forest-800">Regulated partners ({summary.partners.length})</h2>
              <ul className="space-y-2">
                {summary.partners.map(partner => (
                  <li key={partner.partnerCode} className="text-sm text-sand-700">{partner.displayName} — {partner.partnerType} · {partner.environment} · {partner.status}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-cream-200 bg-white shadow-card p-5 space-y-2">
              <h2 className="font-display text-lg text-forest-800">Open exceptions ({summary.openExceptions.length})</h2>
              {summary.openExceptions.length === 0 ? <p className="text-sm text-sand-600">None open.</p> : (
                <ul className="space-y-2">
                  {summary.openExceptions.map(exception => (
                    <li key={exception.id} className="text-sm text-sand-700 rounded-xl bg-cream-50 p-3">
                      <div className="font-medium text-forest-800">{exception.exceptionType} · {exception.severity}</div>
                      <div className="text-xs text-sand-600">{exception.summary}</div>
                      <div className="text-xs text-sand-500">{exception.status} since {new Date(exception.openedAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-cream-200 bg-white shadow-card p-5 space-y-2">
              <h2 className="font-display text-lg text-forest-800">Pending reconciliation ({summary.pendingReconciliation.length})</h2>
              {summary.pendingReconciliation.length === 0 ? <p className="text-sm text-sand-600">Nothing pending.</p> : (
                <ul className="space-y-2">
                  {summary.pendingReconciliation.map(item => (
                    <li key={item.id} className="text-sm text-sand-700">{item.verificationStatus} · initiated {new Date(item.initiatedAt).toLocaleString()}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-cream-200 bg-white shadow-card p-5 space-y-2">
              <h2 className="font-display text-lg text-forest-800">Pending recovery ({summary.pendingRecovery.length})</h2>
              {summary.pendingRecovery.length === 0 ? <p className="text-sm text-sand-600">Nothing pending.</p> : (
                <ul className="space-y-2">
                  {summary.pendingRecovery.map(item => (
                    <li key={item.id} className="text-sm text-sand-700">{item.status} · requested {new Date(item.requestedAt).toLocaleString()}</li>
                  ))}
                </ul>
              )}
            </section>

            <button onClick={() => void load()} disabled={loading} className="text-xs text-sand-600 underline">Refresh</button>
          </div>
        )}
      </div>
    </div>
  );
}
