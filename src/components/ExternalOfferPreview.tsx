import { ShieldCheck, ExternalLink } from 'lucide-react';
import type { StoreOffer } from '../types';

interface ExternalOfferPreviewProps {
  offer: StoreOffer;
}

export function ExternalOfferPreview({ offer }: ExternalOfferPreviewProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">External website preview</div>
      <p className="text-[0.78rem] text-sand-600 mb-3">
        This is how the offer might appear on an external website. The "Agree securely with SecurePay" button opens the SecurePay offer context.
      </p>

      {/* Simulated external card */}
      <div className="rounded-xl border border-cream-300 bg-cream-50 p-4">
        <div className="h-24 bg-cream-100 rounded-lg mb-3 flex items-center justify-center">
          <span className="text-[0.72rem] text-sand-400">Offer image</span>
        </div>
        <h3 className="font-display text-[0.95rem] text-forest-800 leading-tight">{offer.title}</h3>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">{offer.storeName}</div>
        <div className="font-display text-lg text-forest-700 font-medium mt-1.5">{offer.price}</div>
        <button className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Agree securely with SecurePay
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-start gap-2 text-[0.78rem] text-sand-600">
          <ExternalLink className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
          <span>External display is provenance/distribution source only. The actual seller and contracting party remain authoritative.</span>
        </div>
        <div className="flex items-start gap-2 text-[0.78rem] text-sand-600">
          <ShieldCheck className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
          <span>Settlement destination is managed by SecurePay Money. External display does not change who the seller is.</span>
        </div>
      </div>
    </div>
  );
}
