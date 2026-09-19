import { ArrowLeft, MapPin, Store, MessageCircle, ArrowRight } from 'lucide-react';
import type { CommunityBusiness } from '../types';

interface CommunityBusinessProfileProps {
  business: CommunityBusiness;
  onBack: () => void;
  onViewStore: (storeId: string) => void;
  onMessage: () => void;
}

export function CommunityBusinessProfile({ business, onBack, onViewStore, onMessage }: CommunityBusinessProfileProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <h1 className="font-display text-lg text-forest-800 font-medium">{business.name}</h1>
          <p className="text-[0.825rem] text-sand-600 mt-1">{business.whatTheyDo}</p>

          <div className="mt-3 flex items-center gap-1.5 text-[0.78rem] text-sand-600">
            <MapPin className="w-3.5 h-3.5 text-sand-400" />
            {business.serviceAreas.join(' · ')}
          </div>

          <div className="mt-3 pt-3 border-t border-cream-100 flex gap-4 text-[0.72rem] text-sand-500">
            <span>{business.publicWorkStories} work stories</span>
            <span>{business.communityContributions} contributions</span>
          </div>
        </div>

        {business.storeId && (
          <button
            onClick={() => onViewStore(business.storeId!)}
            className="w-full flex items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
          >
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-forest-500" />
              <span className="text-[0.825rem] font-medium text-forest-800">View Store</span>
            </div>
            <ArrowRight className="w-4 h-4 text-sand-400" />
          </button>
        )}

        <button
          onClick={onMessage}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Ask SecurePay about this business
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Community business profile does not duplicate Store truth. Store remains canonical Offer authority.
        </p>
      </div>
    </div>
  );
}
