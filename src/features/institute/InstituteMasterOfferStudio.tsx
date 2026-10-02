import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstituteMasterBackingOfferDto, InstituteMasterBackingType } from '../../api/securepay/institute/dto';

const TYPES: Array<{ value: InstituteMasterBackingType; label: string }> = [
  { value: 'SUPERVISION', label: 'Supervision' },
  { value: 'REVIEW_BEFORE_DELIVERY', label: 'Review before delivery' },
  { value: 'MILESTONE_REVIEW', label: 'Milestone review' },
  { value: 'FINAL_SIGN_OFF', label: 'Final sign-off within capability' },
  { value: 'MENTOR_ON_CALL', label: 'Mentor on call' },
];

export function InstituteMasterOfferStudio({
  gateway,
  enabled,
}: {
  gateway: InstituteGateway;
  enabled: boolean;
}) {
  const [capabilityKey, setCapabilityKey] = useState('');
  const [type, setType] = useState<InstituteMasterBackingType>('SUPERVISION');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [priceKes, setPriceKes] = useState('');
  const [offer, setOffer] = useState<InstituteMasterBackingOfferDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!enabled) return null;

  const create = async () => {
    if (busy || !capabilityKey.trim() || !title.trim() || !scope.trim() || !exclusions.trim()) return;
    const price = priceKes.trim() ? Number(priceKes) : null;
    if (price != null && (!Number.isFinite(price) || price < 0)) {
      setNotice('Enter a valid KES price, or leave it blank if no Institute fee is stated.');
      return;
    }
    setBusy(true); setNotice(null);
    try {
      const next = await gateway.createMasterBacking({
        capabilityKey: capabilityKey.trim(),
        backingType: type,
        title: title.trim(),
        scopeText: scope.trim(),
        exclusionsText: exclusions.trim(),
        feeMinor: price != null && price > 0 ? Math.round(price * 100) : null,
      });
      setOffer(next);
      setNotice('Draft created. SecurePay checked that this capability is currently VERIFIED before allowing the offer.');
    } catch {
      setNotice('This offer could not be created. The capability key must match one of your current VERIFIED Master capabilities.');
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!offer || busy) return;
    setBusy(true); setNotice(null);
    try {
      const next = await gateway.publishMasterBacking(offer.id);
      setOffer(next);
      setNotice('Master support is now available. Responsibility still begins only if a real Agreement states the scope.');
    } catch {
      setNotice('The offer could not be published. SecurePay rechecks the Master capability at publication.');
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-forest-100 bg-white p-5 md:p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-forest-600" />
        <h2 className="font-display text-xl text-forest-900">Stand beside someone's first real work</h2>
      </div>
      <p className="mt-2 text-[0.82rem] leading-relaxed text-sand-600">
        A verified Master can offer a bounded form of supervision or review. State exactly what you will do and what you will not do. This is not insurance or blanket liability cover.
      </p>

      {!offer && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={capabilityKey} onChange={e => setCapabilityKey(e.target.value)} placeholder="Verified capability key" className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            <select value={type} onChange={e => setType(e.target.value as InstituteMasterBackingType)} className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
              {TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Offer title" className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
          <textarea value={scope} onChange={e => setScope(e.target.value)} rows={4} placeholder="What responsibility will you actually take?" className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
          <textarea value={exclusions} onChange={e => setExclusions(e.target.value)} rows={3} placeholder="What is explicitly outside your responsibility?" className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
          <input value={priceKes} onChange={e => setPriceKes(e.target.value)} inputMode="decimal" placeholder="Optional fee in KES" className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
          <button type="button" onClick={() => void create()} disabled={busy} className="min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50">
            Create Master support offer
          </button>
        </div>
      )}

      {offer && (
        <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50 p-4">
          <p className="text-sm font-medium text-forest-900">{offer.title}</p>
          <p className="mt-1 text-xs text-sand-600">{offer.capabilityKey} · {offer.backingType.replaceAll('_', ' ').toLowerCase()}</p>
          <p className="mt-2 text-xs text-sand-600">Status: {offer.status.toLowerCase()}. Agreement required: yes.</p>
          {offer.status !== 'AVAILABLE' && (
            <button type="button" onClick={() => void publish()} disabled={busy} className="mt-3 min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50">
              Make this support available
            </button>
          )}
        </div>
      )}

      {notice && <p className="mt-3 text-xs text-sand-600">{notice}</p>}
    </section>
  );
}
