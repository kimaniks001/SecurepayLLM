import { ArrowLeft, Store, MapPin, BadgeCheck } from 'lucide-react';
import type { StoreIdentity, StoreOffer } from '../types';
import type { PublicDigitalStoreAddress, PublicStoreProfileView } from '../api/securepay/store/dto';
import { ResultCard } from '../features/discovery/ui/ResultCard';
import { resultFromStoreOffer } from '../features/discovery/result';

interface StoreProfileViewProps {
  store: StoreIdentity;
  offers: StoreOffer[];
  onBack: () => void;
  onOpenOffer: (id: string) => void;
  digitalAddress?: PublicDigitalStoreAddress | null;
  presentation?: PublicStoreProfileView | null;
}

export function StoreProfileView({ store, offers, onBack, onOpenOffer, digitalAddress, presentation }: StoreProfileViewProps) {
  // Presentation choices come from the public Store profile; they grant no identity or trade authority.
  const themes: Record<string, { backgroundColor: string; borderColor: string }> = {
    FOREST: { backgroundColor: '#f2f6f0', borderColor: '#446744' },
    SUNSET: { backgroundColor: '#fff2e5', borderColor: '#ac532b' },
    MIDNIGHT: { backgroundColor: '#f0f1f6', borderColor: '#35415e' },
    EARTH: { backgroundColor: '#faf5ef', borderColor: '#7c5b37' },
    OCEAN: { backgroundColor: '#eff8fc', borderColor: '#246780' },
    MONOCHROME: { backgroundColor: '#f4f4f4', borderColor: '#444444' },
  };
  const presets: Record<string, string> = {
    SIGNATURE: 'rounded-2xl', MERCHANT: 'rounded-xl border-t-4', SERVICE_PRO: 'rounded-2xl border-l-4',
    BOUTIQUE: 'rounded-3xl text-center', BUILDER: 'rounded-lg border-t-4',
    COMMUNITY: 'rounded-3xl border-l-4', CREATOR: 'rounded-none border-b-4',
  };
  const theme = presentation ? themes[presentation.storefrontTheme] : undefined;
  const preset = presentation ? presets[presentation.storefrontPreset] ?? 'rounded-2xl' : 'rounded-2xl';
  const publishedOffers = offers.filter((o) => o.lifecycle === 'published' || o.lifecycle === 'unavailable');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Store
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
        {/* Store header */}
        <div className={`${preset} border border-cream-200 bg-white px-5 py-4 mb-4 animate-quiet-in`}
          style={theme} data-store-theme={presentation?.storefrontTheme} data-store-style={presentation?.storefrontPreset}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-cream-100 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg text-forest-800 font-medium">{digitalAddress?.storeName ?? store.name}</h1>
                {store.verified && <BadgeCheck className="w-4 h-4 text-forest-500" />}
              </div>
              <div className="text-[0.78rem] text-sand-500 mt-0.5">Operated by {store.operator}</div>
              <div className="text-[0.72rem] text-sand-400 mt-0.5">{store.businessIdentity}</div>
            </div>
          </div>
          {presentation?.heroHeadline && <h2 className="mt-4 font-display text-xl text-forest-800">{presentation.heroHeadline}</h2>}
          {store.description && (
            <p className="text-[0.825rem] text-sand-600 mt-3 leading-relaxed">{store.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-[0.78rem] text-sand-500">
            <MapPin className="w-3.5 h-3.5 text-sand-400" />
            {store.serviceAreas.join(' · ')}
          </div>
          {digitalAddress && (
            <div className="mt-3 space-y-1 rounded-xl bg-cream-50 p-3 text-xs text-sand-700">
              <p className="font-medium text-forest-800">Digital Store · {digitalAddress.slug}</p>
              {digitalAddress.serviceArea && <p>Serves {digitalAddress.serviceArea}</p>}
              {digitalAddress.publicPin && digitalAddress.latitude !== null && digitalAddress.longitude !== null
                ? <a className="inline-flex min-h-10 items-center gap-1 text-forest-700 underline"
                    target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${digitalAddress.latitude}%2C${digitalAddress.longitude}`}>
                    <MapPin size={14}/> View owner's public Store pin
                  </a>
                : <p>Exact location not published by this Store.</p>}
            </div>
          )}
        </div>

        {/* Offers */}
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Offers from this store</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {publishedOffers.map((offer) => (
            <ResultCard key={offer.id} offer={resultFromStoreOffer(offer)} onOpen={() => onOpenOffer(offer.id)} />
          ))}
        </div>

        {publishedOffers.length === 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-8 text-center">
            <p className="text-[0.875rem] text-sand-500">This store has no published offers yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
