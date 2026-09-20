import { useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { BusinessCurrencyCapabilityGateway, CurrencyCapability } from '../../api/securepay/business-currency-capability';
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
    <Surface>
      <SurfaceHeader title="Business currencies" description="A Business KS is not tied to one currency either. KES is its default; an authorized Business actor can activate others as the business needs them." />
      <SurfaceBody>
        {error && <StatusNotice tone="warning">{error}</StatusNotice>}
        <div className="flex flex-wrap gap-2">
          <input
            value={businessKsNumber}
            onChange={e => setBusinessKsNumber(e.target.value)}
            placeholder="Business KS Number"
            className="min-w-0 flex-1 basis-40 rounded-xl border border-cream-200 px-3 py-2 text-sm"
          />
          <Button variant="secondary" onClick={() => void load()} disabled={loading || !businessKsNumber.trim()}>
            {loading ? 'Loading…' : 'Show currencies'}
          </Button>
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
