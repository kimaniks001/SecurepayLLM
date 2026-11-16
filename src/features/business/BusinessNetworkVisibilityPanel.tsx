import { useEffect, useState } from 'react';
import type { createBusinessConnectGateway, MerchantNetworkPublication } from '../../api/securepay/business-connect';
import type { BusinessConnectSurface } from '../../integrations/business-connect';

type Gateway = Pick<ReturnType<typeof createBusinessConnectGateway>, 'myPublication' | 'replaceMyPublication'>;

/** Business-owned distribution choices. No auto-opt-in, no client-created eligibility. */
const OPTIONS: readonly { surface: BusinessConnectSurface; label: string; description: string }[] = [
  { surface: 'SHORTSTAYS', label: 'Shortstays', description: 'Help guests find relevant products and services' },
  { surface: 'ESTATE', label: 'Estate communities', description: 'Appear when residents need your offerings' },
  { surface: 'MY_RIDE', label: 'My Ride', description: 'Show relevant transport-related offerings' },
  { surface: 'STORAGE', label: 'Storage', description: 'Appear when storage customers need supplies or services' },
  { surface: 'MINI', label: 'SecurePay Mini', description: 'Be found through individual shopping searches' },
  { surface: 'LIVING_WORKSPACE', label: 'Living Workspace', description: 'Be found during project procurement and work' },
  { surface: 'EXTERNAL_SITE', label: 'Connected websites', description: 'Permit discovery through approved outside sites' },
];

export function BusinessNetworkVisibilityPanel({
  businessKsNumber, gateway,
}: {
  businessKsNumber: string;
  gateway: Gateway;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saved, setSaved] = useState<MerchantNetworkPublication | null>(null);
  const [selected, setSelected] = useState<BusinessConnectSurface[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let valid = true;
    setStatus('loading'); setSelected([]); setSaved(null); setError(null); setNotice(null);
    void gateway.myPublication(businessKsNumber).then(result => {
      if (!valid) return;
      if (result.businessKsNumber !== businessKsNumber) throw new Error('Unexpected business publication identity');
      setSaved(result); setSelected(result.enabledSurfaces); setStatus('ready');
    }).catch(() => {
      if (valid) setStatus('error');
    });
    return () => { valid = false; };
  }, [businessKsNumber, gateway]);

  function toggle(surface: BusinessConnectSurface) {
    if (busy || status !== 'ready') return;
    setNotice(null);
    setSelected(old => old.includes(surface) ? old.filter(x => x !== surface) : [...old, surface]);
  }

  async function save() {
    if (busy || status !== 'ready' || !saved) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await gateway.replaceMyPublication(businessKsNumber, selected, saved.publicationVersion);
      if (result.businessKsNumber !== businessKsNumber) throw new Error('Unexpected publication identity');
      setSaved(result); setSelected(result.enabledSurfaces);
      setNotice('Your store visibility preferences were saved.');
    } catch {
      // A timeout can mean the write succeeded. Re-read; never blindly retry
      // a non-idempotent optimistic-version change on an uncertain response.
      try {
        const fresh = await gateway.myPublication(businessKsNumber);
        if (fresh.businessKsNumber === businessKsNumber) {
          setSaved(fresh); setSelected(fresh.enabledSurfaces);
          setError('SecurePay refreshed your latest settings. Review them before saving again.');
        } else {
          setError('SecurePay could not confirm these settings. No changes are shown as saved.');
        }
      } catch {
        setError('SecurePay could not confirm the change. Refresh and review before trying again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return <p className="text-sm text-sand-600" role="status">Checking where your store can appear…</p>;
  }
  if (status === 'error') {
    return <p className="text-sm text-sand-600" role="alert">Store sharing controls are not available just now. Your store has not been newly enrolled.</p>;
  }

  const unchanged = !!saved && selected.length === saved.enabledSurfaces.length
    && selected.every(surface => saved.enabledSurfaces.includes(surface));

  return (
    <section aria-labelledby="business-network-title" className="space-y-3">
      <div>
        <h2 id="business-network-title" className="text-[0.95rem] font-medium text-forest-800">
          Where your store can appear
        </h2>
        <p className="text-[0.78rem] text-sand-600 mt-1">
          Choose where customers may discover your published products. Your private documents, customer records and
          assistant instructions are never shared by this setting. You can change your choices.
        </p>
      </div>
      <div className="space-y-2" role="group" aria-label="SecurePay application choices">
        {OPTIONS.map(option => (
          <label key={option.surface} className="flex gap-3 items-start rounded-xl border border-cream-200 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(option.surface)}
              disabled={busy}
              onChange={() => toggle(option.surface)}
              className="mt-1 h-5 w-5 accent-forest-700"
            />
            <span className="min-w-0">
              <span className="block text-[0.84rem] text-forest-800">{option.label}</span>
              <span className="block text-[0.72rem] text-sand-500">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-[0.73rem] text-sand-600">
        Selecting an application does not guarantee placement, stock, delivery, verification or paid subscription eligibility.
        Actual publication is checked by SecurePay.
      </p>
      {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
      {notice && <p role="status" className="text-sm text-forest-700">{notice}</p>}
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || unchanged}
        className="min-h-11 px-4 rounded-xl bg-forest-700 text-white text-sm font-medium disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-forest-300"
      >{busy ? 'Checking…' : 'Save my choices'}</button>
    </section>
  );
}
