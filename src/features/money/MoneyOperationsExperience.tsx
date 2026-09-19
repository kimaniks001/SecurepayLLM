import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { ApiError } from '../../api/securepay/http';
import type { MoneyOperationsGateway, MoneyOperationsSummaryResponse } from '../../api/securepay/money-operations';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import { Surface, SurfaceHeader, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';

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
        <PageHeader title="Money operations" description="Read-only. Inspecting this never grants any financial mutation authority." />
        {error && <StatusNotice tone="warning">{error}</StatusNotice>}
        {!summary ? (
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>Load summary</Button>
        ) : (
          <div className="space-y-6">
            <Surface><SurfaceHeader title="Choice connector" /><SurfaceBody>
              <p className="text-sm text-sand-700">Connector active: <strong>{String(summary.choiceConnectorActive)}</strong></p>
              <p className="text-sm text-sand-700">Outbound transfer allowed: <strong>{String(summary.choiceOutboundTransferAllowed)}</strong></p>
              <p className="text-sm text-sand-700">Internal transfer certified: <strong>{String(summary.choiceInternalTransferCertified)}</strong></p>
              <p className="text-sm text-sand-700">FX enabled: <strong>{String(summary.fxEnabled)}</strong></p>
            </SurfaceBody></Surface>

            <Surface><SurfaceHeader title={`Regulated partners (${summary.partners.length})`} /><SurfaceBody>
              <ul className="space-y-2">
                {summary.partners.map(partner => (
                  <li key={partner.partnerCode} className="text-sm text-sand-700">{partner.displayName} — {partner.partnerType} · {partner.environment} · {partner.status}</li>
                ))}
              </ul>
            </SurfaceBody></Surface>

            <Surface><SurfaceHeader title={`Open exceptions (${summary.openExceptions.length})`} /><SurfaceBody>
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
            </SurfaceBody></Surface>

            <Surface><SurfaceHeader title={`Pending reconciliation (${summary.pendingReconciliation.length})`} /><SurfaceBody>
              {summary.pendingReconciliation.length === 0 ? <p className="text-sm text-sand-600">Nothing pending.</p> : (
                <ul className="space-y-2">
                  {summary.pendingReconciliation.map(item => (
                    <li key={item.id} className="text-sm text-sand-700">{item.verificationStatus} · initiated {new Date(item.initiatedAt).toLocaleString()}</li>
                  ))}
                </ul>
              )}
            </SurfaceBody></Surface>

            <Surface><SurfaceHeader title={`Pending recovery (${summary.pendingRecovery.length})`} /><SurfaceBody>
              {summary.pendingRecovery.length === 0 ? <p className="text-sm text-sand-600">Nothing pending.</p> : (
                <ul className="space-y-2">
                  {summary.pendingRecovery.map(item => (
                    <li key={item.id} className="text-sm text-sand-700">{item.status} · requested {new Date(item.requestedAt).toLocaleString()}</li>
                  ))}
                </ul>
              )}
            </SurfaceBody></Surface>

            <Button variant="ghost" onClick={() => void load()} disabled={loading} className="text-xs">Refresh</Button>
          </div>
        )}
      </div>
    </div>
  );
}
