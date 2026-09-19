import { useEffect, useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { CurrencyCapability, CurrencyCapabilityGateway } from '../../api/securepay/currency-capability';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Button } from '../../components/dna/Button';

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
    <StatusNotice tone="warning" icon={false}>
      {error && <p className="text-xs">{error}</p>}
      {capability.status === 'NOT_ACTIVATED' && (
        <>
          <p>This Agreement uses {currency}. Your KS identity does not yet have {currency} activated.</p>
          <Button onClick={() => void activate()} disabled={loading} className="mt-2">
            {loading ? 'Activating…' : `Activate ${currency}`}
          </Button>
        </>
      )}
      {capability.status === 'PENDING' && <p>{currency} activation is pending provider confirmation.</p>}
      {capability.status === 'FAILED' && <p>{currency} activation needs attention -- contact support.</p>}
    </StatusNotice>
  );
}
