import { useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { CurrencyCapability, CurrencyCapabilityGateway } from '../../api/securepay/currency-capability';
import { Surface, SurfaceHeader, SurfaceBody } from '../../components/dna/Surface';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Button } from '../../components/dna/Button';

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
    <Surface>
      <SurfaceHeader title="Currencies" description="Your KS identity is not tied to one currency. KES is your default; activate others as you need them." />
      <SurfaceBody>
        {error && <StatusNotice tone="warning">{error}</StatusNotice>}
        {!capabilities ? (
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>Show my currencies</Button>
        ) : (
          <ul className="space-y-2">
            {capabilities.map(capability => (
              <li key={capability.currency} className="flex items-center justify-between rounded-xl border border-cream-200 p-3">
                <div>
                  <div className="font-medium text-forest-800">{capability.currency}</div>
                  <div className="text-xs text-sand-600">{statusLabel(capability.status)}</div>
                </div>
                {capability.status === 'NOT_ACTIVATED' && (
                  <Button onClick={() => void activate(capability.currency)} disabled={activating === capability.currency} className="px-3 py-1.5">
                    {activating === capability.currency ? 'Activating…' : `Activate ${capability.currency}`}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SurfaceBody>
    </Surface>
  );
}
