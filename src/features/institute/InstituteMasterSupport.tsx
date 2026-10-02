import { useEffect, useState } from 'react';
import { Search, ShieldCheck, Store } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstitutePublicMasterBackingOfferDto } from '../../api/securepay/institute/dto';
import type { AppView } from '../../types';

export function InstituteMasterSupport({
  gateway,
  onNavigate,
}: {
  gateway: InstituteGateway;
  onNavigate: (view: AppView) => void;
}) {
  const [capability, setCapability] = useState('');
  const [offers, setOffers] = useState<InstitutePublicMasterBackingOfferDto[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (q = capability) => {
    setBusy(true); setError(null);
    try { setOffers(await gateway.publicMasterBacking(q.trim(), 20)); }
    catch { setError('The Institute could not load Master support just now.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(''); }, [gateway]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-forest-600" /><h2 className="font-display text-2xl text-forest-900">Master Support</h2></div>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-sand-600">
          A verified Master may stand beside real work through a precisely stated form of supervision or review. The responsibility begins only through an Agreement; this is not insurance or blanket liability cover.
        </p>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-sand-400" />
            <input
              value={capability}
              onChange={e => setCapability(e.target.value)}
              placeholder="Capability key, e.g. domestic-plumbing"
              className="min-h-11 w-full rounded-xl border border-cream-200 pl-9 pr-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="min-h-11 rounded-xl bg-forest-700 px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Find Master support
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-ember-200 bg-white px-4 py-3 text-sm text-ember-800">{error}</div>}
      {busy ? (
        <p role="status" className="text-sm text-sand-500">Loading available support…</p>
      ) : offers.length === 0 ? (
        <section className="rounded-2xl border border-cream-200 bg-white p-6 text-sm text-sand-600">
          No currently available Master-backed offers matched this capability.
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map(offer => (
            <article key={offer.id} className="rounded-2xl border border-cream-200 bg-white p-5 shadow-soft">
              <p className="text-[0.68rem] uppercase tracking-wide text-forest-600">{offer.backingType.replaceAll('_', ' ').toLowerCase()}</p>
              <h3 className="mt-1 font-display text-lg text-forest-900">{offer.title}</h3>
              <p className="mt-1 text-xs text-sand-500">Verified capability: {offer.capabilityKey}</p>

              <div className="mt-4">
                <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">What the Master is offering to do</p>
                <p className="mt-1 text-sm leading-relaxed text-sand-700 whitespace-pre-line">{offer.scopeText}</p>
              </div>
              <div className="mt-3">
                <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">What is not covered</p>
                <p className="mt-1 text-sm leading-relaxed text-sand-600 whitespace-pre-line">{offer.exclusionsText}</p>
              </div>

              <div className="mt-4 border-t border-cream-200 pt-4">
                <p className="text-sm font-medium text-forest-900">
                  {offer.feeMinor != null && offer.currency
                    ? `${offer.currency} ${(offer.feeMinor / 100).toLocaleString()}`
                    : 'No Institute fee stated'}
                </p>
                <p className="mt-1 text-xs text-sand-500">An Agreement must state the exact responsibility before the Master is responsible for anything.</p>
                {offer.storeOfferReference && (
                  <button
                    type="button"
                    onClick={() => onNavigate('store')}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800"
                  >
                    <Store className="w-4 h-4" />Open Store to take this forward
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
