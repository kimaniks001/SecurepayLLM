import { useEffect, useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { CurrencyCapability, CurrencyCapabilityGateway } from '../../api/securepay/currency-capability';

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/**
 * Currency/FX convergence -- "If a participant joins a USD Agreement but currently has only KES
 * capability, SecurePay should not reject the Agreement merely for that reason. It should produce:
 * Currency activation required" (locked doctrine). Just-in-time prompt shown against this
 * Agreement's own currency, not a generic settings page.
 */
export function AgreementCurrencyActivationPrompt({ currency, gateway }: { currency: string; gateway: CurrencyCapabilityGateway }) {
  const [capability, setCapability] = useState<CurrencyCapability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCapability(null); setError(null);
    gateway.list()
      .then(response => { if (!cancelled) setCapability(response.items.find(item => item.currency === currency) ?? null); })
      .catch(cause => { if (!cancelled) setError(errorText(cause)); });
    return () => { cancelled = true; };
  }, [currency, gateway]);

  const activate = async () => {
    setLoading(true); setError(null);
    try {
      await gateway.activate(currency);
      const response = await gateway.list();
      setCapability(response.items.find(item => item.currency === currency) ?? null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  if (!capability || capability.status === 'ACTIVE') return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
      {error && <p className="text-xs text-orange-800">{error}</p>}
      {capability.status === 'NOT_ACTIVATED' && (
        <>
          <p className="text-sm text-sand-800">This Agreement uses {currency}. Your KS identity does not yet have {currency} activated.</p>
          <button onClick={() => void activate()} disabled={loading} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Activating…' : `Activate ${currency}`}
          </button>
        </>
      )}
      {capability.status === 'PENDING' && <p className="text-sm text-sand-800">{currency} activation is pending provider confirmation.</p>}
      {capability.status === 'FAILED' && <p className="text-sm text-sand-800">{currency} activation needs attention -- contact support.</p>}
    </div>
  );
}
