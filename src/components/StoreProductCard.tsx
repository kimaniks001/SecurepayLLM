import { MapPin, BadgeCheck, Clock } from 'lucide-react';
import type { StoreProduct } from '../types';

interface StoreProductCardProps {
  product: StoreProduct;
  compact?: boolean;
}

export function StoreProductCard({ product, compact }: StoreProductCardProps) {
  return (
    <div className="group rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden transition-card hover:shadow-lifted hover:border-forest-200">
      <div className="relative h-36 overflow-hidden bg-cream-100">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.verified && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-forest-500/90 backdrop-blur-sm text-cream-50 text-[0.65rem] font-medium shadow-soft">
            <BadgeCheck className="w-3 h-3" />
            Verified seller
          </div>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="font-display text-base text-forest-800 leading-tight truncate">{product.title}</h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-lg text-forest-700 font-medium">{product.price}</span>
          <span className="text-[0.7rem] text-sand-500 px-1.5 py-0.5 rounded bg-cream-100">{product.condition}</span>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <img
            src={product.sellerAvatar}
            alt={product.seller}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-cream-200"
          />
          <span className="text-[0.78rem] text-sand-600">{product.seller}</span>
        </div>

        {!compact && (
          <div className="mt-2.5 flex items-center gap-3 text-[0.75rem] text-sand-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-forest-400" />
              {product.location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-forest-400" />
              {product.posted}
            </div>
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-cream-100 flex gap-2">
          <button className="flex-1 text-[0.78rem] font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-lg px-3 py-2 transition-colors">
            View listing
          </button>
          <button className="flex-1 text-[0.78rem] font-medium text-cream-50 bg-forest-600 hover:bg-forest-700 rounded-lg px-3 py-2 transition-colors">
            Contact seller
          </button>
        </div>
      </div>
    </div>
  );
}
