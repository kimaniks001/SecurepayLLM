import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ApiError } from '../../api/securepay/http';
import type { BusinessCurrencyCapabilityGateway, CurrencyCapability } from '../../api/securepay/business-currency-capability';

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
 * Currency/FX convergence, the "Kamau Hardware" scenario -- a Business KS is one identity, not one
 * currency, exactly like an individual KS. The authorized Business actor identifies which Business
 * they administer by its own public KS Number (the same way they'd identify their own KS Number to
 * sign in); the organization/authority mapping behind it is always resolved server-side. An
 * organization member without REGULATED_ACCOUNT_MANAGE for this Business is rejected by the
 * gateway's own 403 -- this component never fabricates activation client-side.
 */
export function BusinessCurrencyCapabilitySection({ gateway, onChanged }: { gateway: BusinessCurrencyCapabilityGateway; onChanged?: () => void }) {
  const [businessKsNumber, setBusinessKsNumber] = useState('');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CurrencyCapability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  const load = async () => {
    if (!businessKsNumber.trim()) return;
    setLoading(true); setError(null);
    try {
      setCapabilities((await gateway.list(businessKsNumber)).items);
      setLoadedFor(businessKsNumber);
    } catch (cause) { setError(errorText(cause)); setCapabilities(null); setLoadedFor(null); }
    finally { setLoading(false); }
  };

  const activate = async (currency: string) => {
    if (!loadedFor) return;
    setActivating(currency); setError(null);
    try {
      await gateway.activate(loadedFor, currency);
      setCapabilities((await gateway.list(loadedFor)).items);
      onChanged?.();
    } catch (cause) { setError(errorText(cause)); }
    finally { setActivating(null); }
  };

  return (
    <section className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50">
        <h2 className="font-display text-lg text-forest-800">Business currencies</h2>
        <p className="mt-1 text-xs text-sand-600">A Business KS is not tied to one currency either. KES is its default; an authorized Business actor can activate others as the business needs them.</p>
      </div>
      <div className="p-5 space-y-4">
        {error && <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-sand-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}
        <div className="flex gap-2">
          <input
            value={businessKsNumber}
            onChange={e => setBusinessKsNumber(e.target.value)}
            placeholder="Business KS Number"
            className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm"
          />
          <button onClick={() => void load()} disabled={loading || !businessKsNumber.trim()} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">
            {loading ? 'Loading…' : 'Show currencies'}
          </button>
        </div>
        {capabilities && (
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
