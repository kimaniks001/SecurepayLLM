import { ArrowLeft, MapPin, Clock, HandHelping, MessageCircle, Store, ArrowRight } from 'lucide-react';
import type { CommunityObject, CommunityObjectType } from '../types';
import { getOfferById } from '../storeData';

const typeLabel: Record<CommunityObjectType, string> = {
  question: 'Question',
  need: 'Need',
  opportunity: 'Opportunity',
  work_story: 'Work Story',
  discussion: 'Discussion',
  experience: 'Learning',
  store_offer_reference: 'Store Offer',
};

interface CommunityObjectDetailProps {
  object: CommunityObject;
  onBack: () => void;
  onICanHelp: () => void;
  onDiscuss: () => void;
  onViewOffer: (offerId: string) => void;
  onToTrade: () => void;
}

export function CommunityObjectDetail({ object, onBack, onICanHelp, onDiscuss, onViewOffer, onToTrade }: CommunityObjectDetailProps) {
  const offer = object.relatedOfferId ? getOfferById(object.relatedOfferId) : null;
  const isStoreRef = object.objectType === 'store_offer_reference';
  const isNeedOrOpp = object.objectType === 'need' || object.objectType === 'opportunity';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-medium text-sand-500 bg-cream-100 rounded-full px-2 py-0.5">{typeLabel[object.objectType]}</span>
          {object.status !== 'active' && (
            <span className="text-[0.65rem] font-medium text-sand-400 bg-cream-50 rounded-full px-2 py-0.5 capitalize">{object.status}</span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Title and body */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <h1 className="font-display text-lg text-forest-800 font-medium leading-tight mb-2">{object.title}</h1>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed">{object.body}</p>

          {/* Meta */}
          <div className="mt-3 pt-3 border-t border-cream-100 space-y-1.5">
            <div className="text-[0.72rem] text-sand-500">Posted by {object.author} · {object.createdAt}</div>
            {object.generalLocation && (
              <div className="flex items-center gap-1.5 text-[0.78rem] text-sand-600">
                <MapPin className="w-3.5 h-3.5 text-sand-400" />
                {object.generalLocation}
              </div>
            )}
            {object.timing && (
              <div className="flex items-center gap-1.5 text-[0.78rem] text-sand-600">
                <Clock className="w-3.5 h-3.5 text-sand-400" />
                {object.timing}
              </div>
            )}
            {object.budget && (
              <div className="text-[0.78rem] text-sand-600">Budget: {object.budget}</div>
            )}
            {object.capabilities && object.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {object.capabilities.map((cap, i) => (
                  <span key={i} className="text-[0.7rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">
                    {cap}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 text-[0.68rem] text-sand-400 italic">{object.provenance}</div>
        </div>

        {/* Store offer reference */}
        {isStoreRef && offer && (
          <div className="rounded-2xl border border-forest-200 bg-forest-50/20 px-5 py-4 animate-quiet-in">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-forest-600" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Store offer reference</span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="text-[0.875rem] font-medium text-forest-800">{offer.title}</div>
              <div className="text-[0.825rem] text-sand-600">{offer.storeName} · {offer.price}</div>
            </div>
            <p className="text-[0.72rem] text-sand-400 mb-3">
              This is a reference to the canonical Store offer. Community does not copy or recreate the offer. Opening it takes you to the Store.
            </p>
            <button
              onClick={() => onViewOffer(offer.id)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors"
            >
              View offer
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Responses */}
        {object.responses.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Responses</div>
            <div className="space-y-2">
              {object.responses.map((resp) => (
                <div key={resp.id} className="rounded-xl border border-cream-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    {resp.kind === 'i_can_help' && <HandHelping className="w-3.5 h-3.5 text-forest-500" />}
                    <span className="text-[0.825rem] font-medium text-forest-800">{resp.author}</span>
                    <span className="text-[0.65rem] text-sand-400">{resp.date}</span>
                    {resp.authorCapacity === 'business' && <span className="text-[0.6rem] font-medium text-forest-600 bg-forest-50 rounded-full px-1.5 py-0.5">Business</span>}
                  </div>
                  {resp.kind === 'i_can_help' && (
                    <span className="text-[0.65rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5 mb-1.5 inline-block">I can help</span>
                  )}
                  <p className="text-[0.825rem] text-forest-800 leading-relaxed">{resp.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {isNeedOrOpp && (
            <>
              <button
                onClick={onICanHelp}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
              >
                <HandHelping className="w-4 h-4" />
                I can help
              </button>
              <button
                onClick={onDiscuss}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Discuss this
              </button>
              {object.responses.some((r) => r.kind === 'i_can_help') && (
                <button
                  onClick={onToTrade}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-forest-300 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-forest-50 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  Start trade with helper
                </button>
              )}
            </>
          )}
          {object.objectType === 'question' && (
            <button
              onClick={onDiscuss}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Reply or share experience
            </button>
          )}
        </div>

        {/* Doctrine */}
        <div className="text-[0.68rem] text-sand-400 italic px-2 space-y-0.5">
          {isNeedOrOpp && <p>Need ≠ Agreement. "I can help" ≠ Agreement. Only explicit adoption into Trade Taking Shape begins that journey.</p>}
          {isStoreRef && <p>Community Store reference ≠ copy of Store Offer. Store remains canonical Offer authority.</p>}
          {object.objectType === 'work_story' && <p>Work Story ≠ review score. This is shared experience, not a rating.</p>}
        </div>
      </div>
    </div>
  );
}
