import { useEffect, useState } from 'react';
import { Check, Copy, MapPin, Navigation, ShieldCheck, Store, Globe, Save } from 'lucide-react';
import { ApiError } from '../../api/securepay/http';
import type { StoreGateway } from '../../api/securepay/store';
import type { DigitalStoreAddress, SaveDigitalStoreAddress, UpdateStoreProfileRequest, StorefrontPreset, StorefrontTheme } from '../../api/securepay/store/dto';

type Gateway = Pick<StoreGateway,
  'myProfile' | 'businessProfile' | 'updateMyProfile' | 'updateBusinessProfile' |
  'myDigitalAddress' | 'businessDigitalAddress' | 'saveMyDigitalAddress' | 'saveBusinessDigitalAddress'>;

const emptyAddress: SaveDigitalStoreAddress = {
  slug: '', storeName: '', serviceArea: '', latitude: null, longitude: null,
  accuracyMeters: null, capturedAt: null, locationProvenance: null, publicPin: false,
};

const slugFrom = (value: string) => value.toLowerCase().trim().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 48);

const presets: StorefrontPreset[] = ['SIGNATURE','MERCHANT','SERVICE_PRO','BOUTIQUE','BUILDER','COMMUNITY','CREATOR'];
const themes: StorefrontTheme[] = ['FOREST','SUNSET','MIDNIGHT','EARTH','OCEAN','MONOCHROME'];

export function DigitalStoreSetup({ gateway, businessKsNumber, publishedCount, onProfileSaved }: {
  gateway: Gateway;
  businessKsNumber: string | null;
  publishedCount: number;
  onProfileSaved?: () => void;
}) {
  const [address, setAddress] = useState<SaveDigitalStoreAddress>(emptyAddress);
  const [savedAddress, setSavedAddress] = useState<DigitalStoreAddress | null>(null);
  const [profile, setProfile] = useState<UpdateStoreProfileRequest>({
    tagline: '', about: '', locationLabel: '', heroHeadline: '',
    storefrontPreset: 'SIGNATURE', storefrontTheme: 'FOREST',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setNotice(''); setSavedAddress(null); setAddress(emptyAddress);
    async function load() {
      const profileRead = businessKsNumber
        ? gateway.businessProfile(businessKsNumber)
        : gateway.myProfile();
      const addressRead = businessKsNumber
        ? gateway.businessDigitalAddress(businessKsNumber)
        : gateway.myDigitalAddress();
      const [p, a] = await Promise.allSettled([profileRead, addressRead]);
      if (!active) return;
      if (p.status === 'fulfilled') {
        const found = p.value;
        setProfile({
          tagline: found.tagline ?? '', about: found.about ?? '',
          locationLabel: found.locationLabel ?? '',
          heroHeadline: found.heroHeadline ?? '',
          storefrontPreset: found.storefrontPreset,
          storefrontTheme: found.storefrontTheme,
        });
      } else setError('Store appearance could not be loaded. Please retry later.');
      if (a.status === 'fulfilled') {
        setSavedAddress(a.value);
        setAddress({
          slug: a.value.slug, storeName: a.value.storeName, serviceArea: a.value.serviceArea,
          latitude: a.value.latitude, longitude: a.value.longitude,
          accuracyMeters: a.value.accuracyMeters, capturedAt: a.value.capturedAt,
          locationProvenance: a.value.locationProvenance, publicPin: a.value.publicPin,
        });
      } else if (!(a.reason instanceof ApiError && a.reason.status === 404)) {
        setError('Your Store address could not be checked. Do not assume it was saved.');
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [gateway, businessKsNumber]);

  function captureLocation() {
    setNotice(''); setError('');
    if (!navigator.geolocation) { setError('Location is unavailable on this device. You may enter coordinates manually.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      point => {
        setAddress(a => ({
          ...a, latitude: point.coords.latitude, longitude: point.coords.longitude,
          accuracyMeters: point.coords.accuracy, capturedAt: new Date(point.timestamp).toISOString(),
          locationProvenance: 'DEVICE', publicPin: false,
        }));
        setNotice('Location captured. Check that this is your Store premises, not simply where your phone is. Exact coordinates remain private.');
        setLocating(false);
      },
      () => { setError('Location permission was declined or unavailable. Your Store can still be saved without GPS.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  const updateCoordinate = (key: 'latitude' | 'longitude', raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw);
    setAddress(a => ({
      ...a, [key]: value,
      locationProvenance: 'MANUAL', accuracyMeters: null, capturedAt: null,
      publicPin: false,
    }));
  };

  async function saveAddress() {
    setError(''); setNotice('');
    const slug = slugFrom(address.slug);
    if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) { setError('Use a Store address of 3–48 letters, numbers or hyphens.'); return; }
    if (!address.storeName.trim() || address.storeName.length > 120) { setError('Give your Store a name (up to 120 characters).'); return; }
    if ((address.latitude === null) !== (address.longitude === null)) {
      setError('Provide both latitude and longitude, or leave both blank.'); return;
    }
    if (address.latitude !== null && (!Number.isFinite(address.latitude) || address.latitude < -90 || address.latitude > 90 ||
      address.longitude === null || !Number.isFinite(address.longitude) || address.longitude < -180 || address.longitude > 180)) {
      setError('Enter valid GPS coordinates.'); return;
    }
    if (address.publicPin && address.latitude === null) { setError('Capture or enter a pin before making it public.'); return; }
    setBusy(true);
    try {
      const request = { ...address, slug, storeName: address.storeName.trim(), serviceArea: address.serviceArea?.trim() || null,
        locationProvenance: address.latitude === null ? null : address.locationProvenance ?? 'MANUAL' };
      const response = businessKsNumber
        ? await gateway.saveBusinessDigitalAddress(businessKsNumber, request)
        : await gateway.saveMyDigitalAddress(request);
      setSavedAddress(response);
      setAddress({ ...request });
      setNotice('Digital address saved under your existing KS Store. Publishing an offer is a separate action.');
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409
        ? 'This address is already in use or reserved. Choose another.'
        : 'SecurePay did not confirm the address save. Check your connection and try again.');
    } finally { setBusy(false); }
  }

  async function saveAppearance() {
    setBusy(true); setError(''); setNotice('');
    try {
      if (businessKsNumber) await gateway.updateBusinessProfile(businessKsNumber, profile);
      else await gateway.updateMyProfile(profile);
      setNotice('Store appearance saved. Your public Store shows these details when you publish an offer.');
      onProfileSaved?.();
    } catch { setError('SecurePay could not confirm the Store appearance update.'); }
    finally { setBusy(false); }
  }

  const shareUrl = savedAddress && typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname + '#/shop/' + encodeURIComponent(savedAddress.slug)
    : '';
  const shareReady = Boolean(savedAddress && publishedCount > 0);
  async function copyStore() {
    if (!shareReady) return;
    try {
      const announcement = `I'm here now! Visit ${savedAddress?.storeName ?? 'my business'} at my digital Store: ${shareUrl}\nBrowse my offers and contact me directly through my Store.`;
      await navigator.clipboard.writeText(announcement);
      setNotice('Your Store announcement is copied. You decide who receives it; no message has been sent.');
    } catch {
      setNotice('Copy the address shown below. Your browser did not allow automatic copying.');
    }
  }

  if (loading) return <p role="status" className="rounded-xl bg-white p-4 text-sm text-sand-600">Checking your Store address and appearance…</p>;
  return (
    <section aria-label="Digital Store setup" className="rounded-2xl border border-forest-200 bg-white p-4 sm:p-6 space-y-5">
      <header>
        <div className="flex items-center gap-2 text-forest-800"><Store size={20}/><h2 className="font-display text-xl">Your Digital Store</h2></div>
        <p className="text-sm text-sand-600 mt-1">Give your business an address. Customers visit your Store directly, not your SecurePay Home.</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-forest-50 p-3 text-sm text-forest-800">{notice}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium text-forest-800 flex items-center gap-2"><Globe size={16}/> Digital address</h3>
          <label className="block text-sm">Store name
            <input value={address.storeName} maxLength={120}
              onChange={e => setAddress(a => ({ ...a, storeName: e.target.value }))}
              placeholder="Kamaki Builders Mart" className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm" />
          </label>
          <label className="block text-sm">Store address
            <div className="mt-1 flex items-center rounded-lg border border-cream-200 overflow-hidden">
              <span className="px-2 py-3 bg-cream-100 text-xs text-sand-600 whitespace-nowrap">securepay.ke/s/</span>
              <input value={address.slug} maxLength={48}
                onChange={e => setAddress(a => ({ ...a, slug: slugFrom(e.target.value) }))}
                placeholder="kamaki-builders-mart" className="min-w-0 flex-1 px-3 py-3 text-sm outline-none" />
            </div>
          </label>
          <p className="text-xs text-sand-500">Illustrative format shown above. The actual shared link is generated from the current SecurePay host. Old address aliases continue to work after a rename.</p>
          <label className="block text-sm">Areas you serve
            <input value={address.serviceArea ?? ''} maxLength={160}
              onChange={e => setAddress(a => ({ ...a, serviceArea: e.target.value }))}
              placeholder="Ruiru, Kamaki, Varsityville" className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm" />
          </label>
          <button type="button" onClick={() => void saveAddress()} disabled={busy}
            className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white font-medium disabled:opacity-50 flex items-center gap-2"><Save size={16}/> Save digital address</button>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium text-forest-800 flex items-center gap-2"><MapPin size={16}/> Store geography</h3>
          <p className="text-sm text-sand-600">Capture the location of the business, not automatically the position of its owner. GPS is optional for an offer draft.</p>
          <button type="button" disabled={locating || busy} onClick={captureLocation}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 px-4 text-sm text-forest-800 disabled:opacity-50">
            <Navigation size={16}/>{locating ? 'Asking for location…' : 'Use my device location'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">Latitude
              <input aria-label="Store latitude" inputMode="decimal" type="number" step="any"
                value={address.latitude ?? ''} onChange={e => updateCoordinate('latitude',e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-2 text-sm"/>
            </label>
            <label className="text-xs">Longitude
              <input aria-label="Store longitude" inputMode="decimal" type="number" step="any"
                value={address.longitude ?? ''} onChange={e => updateCoordinate('longitude',e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-2 text-sm"/>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-forest-800">
            <input type="checkbox" checked={address.publicPin} disabled={address.latitude === null || address.longitude === null}
              onChange={e => setAddress(a => ({ ...a, publicPin: e.target.checked }))}/>
            Allow customers to see my exact Store pin
          </label>
          <p className="flex items-center gap-2 text-xs text-sand-600"><ShieldCheck size={15}/>
            Exact GPS is private by default. A manual pin is not verified premises evidence.</p>
        </div>
      </div>
      <div className="border-t border-cream-200 pt-4 space-y-3">
        <h3 className="font-medium text-forest-800">Make this Store yours</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Store headline
            <input value={profile.heroHeadline ?? ''} maxLength={180}
              onChange={e => setProfile(p=>({...p,heroHeadline:e.target.value}))}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm" placeholder="Reliable building supplies, nearby"/>
          </label>
          <label className="text-xs">Business location label
            <input value={profile.locationLabel ?? ''} maxLength={160}
              onChange={e => setProfile(p=>({...p,locationLabel:e.target.value}))}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm" placeholder="Kamaki, Ruiru"/>
          </label>
          <label className="text-xs">Store style
            <select value={profile.storefrontPreset ?? 'SIGNATURE'} onChange={e => setProfile(p=>({...p,storefrontPreset:e.target.value as StorefrontPreset}))}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm">{presets.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select>
          </label>
          <label className="text-xs">Store colours
            <select value={profile.storefrontTheme ?? 'FOREST'} onChange={e => setProfile(p=>({...p,storefrontTheme:e.target.value as StorefrontTheme}))}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm">{themes.map(v=><option key={v} value={v}>{v}</option>)}</select>
          </label>
        </div>
        <label className="block text-xs">About your Store
          <textarea value={profile.about ?? ''} maxLength={2000}
            onChange={e=>setProfile(p=>({...p,about:e.target.value}))}
            rows={2} className="mt-1 w-full rounded-lg border border-cream-200 p-3 text-sm" placeholder="What do you sell, supply or do?"/>
        </label>
        <button type="button" disabled={busy} onClick={() => void saveAppearance()}
          className="min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50">
          Save Store appearance
        </button>
      </div>
      <section aria-label="Store subscription" className="rounded-xl border border-cream-200 p-4 space-y-2">
        <h3 className="font-medium text-forest-800">Your trading relationship</h3>
        <p className="text-sm text-sand-700">For You — KES 100/month · For Business — KES 200/month.</p>
        <p className="text-xs text-sand-600">Choose the relationship that matches your KS authority. Store creation, KS registration, subscription selection and confirmed activation are separate steps. No fee is charged on this screen.</p>
        <a href="#/activate" className="inline-flex min-h-11 items-center rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800">
          Review SecurePay subscription and activation
        </a>
      </section>
      <div className="rounded-xl bg-cream-50 p-4 space-y-2">
        <h3 className="font-medium text-forest-800 flex items-center gap-2"><Check size={17}/> Your Store link</h3>
        {savedAddress && <p className="break-all font-mono text-xs text-forest-700">{shareUrl}</p>}
        <p className="text-xs text-sand-600">{!savedAddress
          ? 'Choose and save an address first.'
          : publishedCount === 0
            ? 'Address saved privately. Publish a real offer before sharing; your public address is not live yet.'
            : 'A published offer exists. Customers can now visit your Store using this link.'}</p>
        <button type="button" disabled={!shareReady} onClick={() => void copyStore()}
          className="min-h-11 flex items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">
          <Copy size={16}/> I'm here now — copy my Store link
        </button>
      </div>
    </section>
  );
}
