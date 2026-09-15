import { MapPin, Link2, ChevronRight } from 'lucide-react';
import type { StoreOffer } from '../types';

interface OfferCardProps {
  offer: StoreOffer;
  onOpen: (id: string) => void;
}

export function OfferCard({ offer, onOpen }: OfferCardProps) {
  return (
    <button
      onClick={() => onOpen(offer.id)}
      className="w-full text-left rounded-2xl border border-cream-200 bg-white overflow-hidden hover:border-forest-300 hover:shadow-soft transition-all"
    >
      <div className="h-32 bg-cream-100 relative">
        {offer.media.length > 0 && offer.media[0].url ? (
          <img src={offer.media[0].url} alt={offer.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[0.7rem] text-sand-400">{offer.offerType.replace(/_/g, ' ')}</span>
          </div>
        )}
        {offer.lifecycle === 'unavailable' && (
          <div className="absolute inset-0 bg-cream-100/80 flex items-center justify-center">
            <span className="text-[0.72rem] font-medium text-sand-500">Unavailable</span>
          </div>
        )}
        {offer.isExternalReference && (
          <div className="absolute top-2 right-2 text-[0.6rem] font-medium text-sand-600 bg-cream-50/90 rounded-full px-2 py-0.5">
            External
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="font-display text-[0.95rem] text-forest-800 leading-tight">{offer.title}</h3>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">{offer.storeName}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-[1rem] font-medium text-forest-700">{offer.price}</span>
          {offer.priceUnit && <span className="text-[0.68rem] text-sand-400">{offer.priceUnit}</span>}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[0.72rem] text-sand-500">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sand-400" />
            {offer.serviceArea}
          </div>
          <div className="flex items-center gap-1">
            <Link2 className="w-3 h-3 text-sand-400" />
            SecureLink
          </div>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-cream-100 flex items-center justify-between">
          <span className="text-[0.72rem] text-sand-400">{offer.availability}</span>
          <span className="flex items-center gap-1 text-[0.72rem] font-medium text-forest-600">
            View offer
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </button>
  );
}
