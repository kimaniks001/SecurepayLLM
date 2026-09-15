import { ArrowLeft, MapPin, Clock, Check, X, Link2, MessageCircle, FileText, ShieldCheck, AlertTriangle, Store, Edit3 } from 'lucide-react';
import type { StoreOffer } from '../types';

interface OfferDetailProps {
  offer: StoreOffer;
  onBack: () => void;
  onInterested: () => void;
  onUseThis: () => void;
  onAskSecurePay: () => void;
  onShare: () => void;
  onViewStore: (storeId: string) => void;
}

export function OfferDetail({ offer, onBack, onInterested, onUseThis, onAskSecurePay, onShare, onViewStore }: OfferDetailProps) {
  const isUnavailable = offer.lifecycle === 'unavailable';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Store
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{offer.title}</h1>
        <button onClick={() => onViewStore(offer.storeId)} className="flex items-center gap-1.5 text-[0.78rem] text-sand-500 hover:text-forest-600 mt-1">
          <Store className="w-3.5 h-3.5" />
          {offer.storeName}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Unavailable banner */}
        {isUnavailable && (
          <div className="rounded-xl border border-ember-200 bg-ember-50 px-4 py-3 animate-quiet-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-ember-600" />
              <span className="text-[0.825rem] font-medium text-ember-700">This offer is currently unavailable</span>
            </div>
            <p className="text-[0.78rem] text-sand-600 mt-1">You can still view the Store, ask a question, or tell SecurePay what you need.</p>
          </div>
        )}

        {/* Media */}
        <div className="rounded-2xl border border-cream-200 bg-cream-100 h-48 flex items-center justify-center overflow-hidden">
          {offer.media.length > 0 && offer.media[0].url ? (
            <img src={offer.media[0].url} alt={offer.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <Store className="w-8 h-8 text-sand-300 mx-auto mb-2" />
              <p className="text-[0.78rem] text-sand-400">No photos available</p>
              {offer.media.length > 0 && offer.media[0].isExample && (
                <p className="text-[0.68rem] text-sand-400 mt-1">Previous work example</p>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Price</div>
              <div className="font-display text-xl text-forest-800 font-medium mt-0.5">{offer.price}</div>
              {offer.priceUnit && <div className="text-[0.72rem] text-sand-500 mt-0.5">{offer.priceUnit}</div>}
            </div>
            <div className="text-right">
              <div className="text-[0.68rem] text-sand-400">{offer.priceType.replace(/_/g, ' ')}</div>
              <div className="text-[0.72rem] text-sand-500 mt-0.5">{offer.availability}</div>
            </div>
          </div>
        </div>

        {/* Seller of record */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Seller of record</div>
          {offer.isExternalReference && offer.externalSellerName ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-ember-500" />
                <span className="text-[0.825rem] font-medium text-forest-800">{offer.externalSellerName}</span>
              </div>
              <p className="text-[0.78rem] text-sand-600">{offer.externalSellerIdentity}</p>
              <p className="text-[0.72rem] text-ember-600 mt-1.5">{offer.provenanceLabel}</p>
              <p className="text-[0.72rem] text-sand-400 mt-1">The actual contracting party is {offer.externalSellerName}, not {offer.storeName}. Do not settle to {offer.storeName} merely because the offer was discovered here.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-forest-500" />
                <span className="text-[0.825rem] font-medium text-forest-800">{offer.storeName}</span>
              </div>
              <p className="text-[0.78rem] text-sand-600">Store-owned offer. {offer.storeName} is the actual seller and contracting counterparty.</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Description</div>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed">{offer.description}</p>
        </div>

        {/* Scope */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Scope</div>
          <div className="space-y-3">
            <div>
              <div className="text-[0.72rem] text-sand-500 mb-1">Included</div>
              <ul className="space-y-1">
                {offer.scope.included.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[0.825rem] text-forest-800">
                    <Check className="w-3.5 h-3.5 text-forest-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
                {offer.scope.included.length === 0 && <li className="text-[0.78rem] text-sand-400">No items listed</li>}
              </ul>
            </div>
            <div>
              <div className="text-[0.72rem] text-sand-500 mb-1">Not included</div>
              <ul className="space-y-1">
                {offer.scope.excluded.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[0.825rem] text-sand-600">
                    <X className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
                {offer.scope.excluded.length === 0 && <li className="text-[0.78rem] text-sand-400">None specified</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {offer.conditions.length > 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Important conditions</div>
            <ul className="space-y-1">
              {offer.conditions.map((cond, i) => (
                <li key={i} className="text-[0.825rem] text-forest-800 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
                  {cond}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Meta */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[0.825rem]">
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              <span className="text-sand-600">Service area:</span>
              <span className="text-forest-800">{offer.serviceArea}</span>
            </div>
            {offer.timing && (
              <div className="flex items-center gap-2 text-[0.825rem]">
                <Clock className="w-3.5 h-3.5 text-sand-400" />
                <span className="text-sand-600">Timing:</span>
                <span className="text-forest-800">{offer.timing}</span>
              </div>
            )}
            {offer.warrantyTerms && (
              <div className="flex items-start gap-2 text-[0.825rem]">
                <ShieldCheck className="w-3.5 h-3.5 text-sand-400 mt-0.5" />
                <div>
                  <span className="text-sand-600">Warranty: </span>
                  <span className="text-forest-800">{offer.warrantyTerms}</span>
                </div>
              </div>
            )}
            {offer.documents.length > 0 && (
              <div className="flex items-center gap-2 text-[0.825rem]">
                <FileText className="w-3.5 h-3.5 text-sand-400" />
                <span className="text-sand-600">Documents:</span>
                <span className="text-forest-800">{offer.documents.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone seeds */}
        {offer.milestoneSeeds.length > 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Proposed structure</div>
            <p className="text-[0.72rem] text-sand-400 mb-2">This is a proposed structure. Your agreement may differ after customization.</p>
            <div className="space-y-2">
              {offer.milestoneSeeds.map((ms, i) => (
                <div key={i} className="rounded-lg bg-cream-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.68rem] font-medium text-sand-400">{i + 1}.</span>
                    <span className="text-[0.825rem] font-medium text-forest-800">{ms.title}</span>
                  </div>
                  {ms.work.length > 0 && (
                    <ul className="mt-1 ml-5 space-y-0.5">
                      {ms.work.map((w, j) => (
                        <li key={j} className="text-[0.78rem] text-sand-600">· {w}</li>
                      ))}
                    </ul>
                  )}
                  {ms.completionCondition && (
                    <div className="text-[0.72rem] text-sand-400 mt-1 ml-5">Condition: {ms.completionCondition}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SecureLink */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Offer SecureLink</span>
          </div>
          <div className="rounded-lg bg-cream-50 px-3 py-2 text-[0.825rem] text-forest-700 font-mono">
            {offer.secureLink.url}
          </div>
          <button
            onClick={onShare}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Share SecureLink
          </button>
        </div>

        {/* Provenance */}
        <div className="text-[0.68rem] text-sand-400 italic px-2">
          {offer.isDemoState ? `Offer ${offer.version}` : `Updated ${offer.version}`} · {offer.storeName} · {offer.isDemoState ? 'Demo offer state' : 'Authoritative offer'}
        </div>

        {/* Actions */}
        {!isUnavailable && (
          <div className="space-y-2">
            <button
              onClick={onUseThis}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
            >
              Use this
            </button>
            <button
              onClick={onInterested}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              I'm interested
            </button>
            <button
              onClick={onAskSecurePay}
              className="w-full flex items-center justify-center gap-2 text-[0.78rem] text-sand-500 hover:text-forest-600 py-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Ask SecurePay about this offer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
