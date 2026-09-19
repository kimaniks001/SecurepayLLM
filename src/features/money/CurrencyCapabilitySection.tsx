import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ApiError } from '../../api/securepay/http';
import type { CurrencyCapability, CurrencyCapabilityGateway } from '../../api/securepay/currency-capability';

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

function statusLabel(status: CurrencyCapability['status']): string {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'PENDING': return 'Activation pending';
    case 'FAILED': return 'Needs attention';
    case 'NOT_ACTIVATED': return 'Not activated';
  }
}

/**
 * Currency/FX convergence -- "Every KSNumber begins with KES. A KSNumber is one identity, not one
 * currency" (locked doctrine). Lists every currency this environment currently supports and lets
 * the customer activate one under their same KS identity, just in time. Never fabricates an
 * account in the browser -- every activation goes through the real backend/provider flow.
 */
export function CurrencyCapabilitySection({ gateway, onChanged }: { gateway: CurrencyCapabilityGateway; onChanged?: () => void }) {
  const [capabilities, setCapabilities] = useState<CurrencyCapability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setCapabilities((await gateway.list()).items); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const activate = async (currency: string) => {
    setActivating(currency); setError(null);
    try {
      await gateway.activate(currency);
      await load();
      onChanged?.();
    } catch (cause) { setError(errorText(cause)); }
    finally { setActivating(null); }
  };

  return (
    <section className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50">
        <h2 className="font-display text-lg text-forest-800">Currencies</h2>
        <p className="mt-1 text-xs text-sand-600">Your KS identity is not tied to one currency. KES is your default; activate others as you need them.</p>
      </div>
      <div className="p-5 space-y-4">
        {error && <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-sand-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}
        {!capabilities ? (
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Show my currencies</button>
        ) : (
          <ul className="space-y-2">
            {capabilities.map(capability => (
              <li key={capability.currency} className="flex items-center justify-between rounded-xl border border-cream-200 p-3">
                <div>
                  <div className="font-medium text-forest-800">{capability.currency}</div>
                  <div className="text-xs text-sand-600">{statusLabel(capability.status)}</div>
                </div>
                {capability.status === 'NOT_ACTIVATED' && (
                  <button
                    onClick={() => void activate(capability.currency)}
                    disabled={activating === capability.currency}
                    className="rounded-xl bg-forest-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {activating === capability.currency ? 'Activating…' : `Activate ${capability.currency}`}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
