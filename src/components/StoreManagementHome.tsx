import { ArrowLeft, Plus, FileText, Link2, MessageCircle, ShoppingBag } from 'lucide-react';
import type { StoreIdentity, StoreOffer, StoreActivityItem, StoreEnquiry } from '../types';

interface StoreManagementHomeProps {
  store: StoreIdentity;
  offers: StoreOffer[];
  activity: StoreActivityItem[];
  enquiries: StoreEnquiry[];
  onBack: () => void;
  onCreateOffer: () => void;
}

export function StoreManagementHome({ store, offers, activity, enquiries, onBack, onCreateOffer }: StoreManagementHomeProps) {
  const published = offers.filter((o) => o.lifecycle === 'published');
  const drafts = offers.filter((o) => o.lifecycle === 'draft');
  const unavailable = offers.filter((o) => o.lifecycle === 'unavailable');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Store
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">My Store</h1>
        <div className="text-[0.78rem] text-sand-500 mt-0.5">{store.name}{store.operator ? ` · Acting as ${store.operator}` : ''}</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
            <FileText className="w-4 h-4 text-sand-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{published.length}</div>
            <div className="text-[0.65rem] text-sand-500">Published</div>
          </div>
          <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
            <Link2 className="w-4 h-4 text-sand-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{published.length}</div>
            <div className="text-[0.65rem] text-sand-500">SecureLinks</div>
          </div>
          <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
            <MessageCircle className="w-4 h-4 text-sand-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{enquiries.length}</div>
            <div className="text-[0.65rem] text-sand-500">Enquiries</div>
          </div>
        </div>

        {/* Create offer */}
        <button
          onClick={onCreateOffer}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create new offer
        </button>

        {/* Published offers */}
        {published.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Published offers</div>
            <div className="space-y-2">
              {published.map((offer) => (
                <div key={offer.id} className="rounded-xl border border-cream-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-[0.875rem] font-medium text-forest-800">{offer.title}</div>
                      <div className="text-[0.72rem] text-sand-500">{offer.price} · {offer.availability}</div>
                    </div>
                    <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">{offer.version}</span>
                  </div>
                  {offer.secureLink.url && (
                    <div className="mt-2 flex items-center gap-2 text-[0.68rem] text-sand-400">
                      <Link2 className="w-3 h-3" />
                      {offer.secureLink.url}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drafts */}
        {drafts.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Drafts</div>
            <div className="space-y-2">
              {drafts.map((offer) => (
                <div key={offer.id} className="rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3">
                  <div className="text-[0.875rem] font-medium text-sand-600">{offer.title}</div>
                  <div className="text-[0.72rem] text-sand-400">Draft · not published</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable */}
        {unavailable.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Unavailable</div>
            <div className="space-y-2">
              {unavailable.map((offer) => (
                <div key={offer.id} className="rounded-xl border border-cream-200 bg-white px-4 py-3 opacity-60">
                  <div className="text-[0.875rem] font-medium text-sand-600">{offer.title}</div>
                  <div className="text-[0.72rem] text-sand-400">{offer.availability}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Recent activity</div>
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 space-y-2.5">
            {activity.length === 0 && <p className="text-[0.78rem] text-sand-500">No recent activity to show yet.</p>}
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-[0.68rem] text-sand-400 w-16 shrink-0 mt-0.5">{item.date}</span>
                <div className="flex-1">
                  <div className="text-[0.825rem] text-forest-800">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enquiries */}
        {enquiries.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Enquiries</div>
            <div className="space-y-2">
              {enquiries.map((eq) => (
                <div key={eq.id} className="rounded-xl border border-cream-200 bg-white px-4 py-3">
                  <div className="text-[0.825rem] text-forest-800 font-medium">{eq.question}</div>
                  <div className="text-[0.68rem] text-sand-400 mt-0.5">{eq.asker} · {eq.date}</div>
                  {eq.answered && eq.answer && (
                    <div className="mt-2 rounded-lg bg-forest-50 px-3 py-2 text-[0.78rem] text-forest-800">
                      {eq.answer}
                    </div>
                  )}
                  {!eq.answered && (
                    <div className="mt-1.5 text-[0.72rem] text-ember-600">Awaiting response</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settlement note */}
        <div className="rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-3.5 h-3.5 text-sand-400" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Settlement</span>
          </div>
          <p className="text-[0.78rem] text-sand-600">
            Settlement destination is managed by SecurePay Money. Store offers do not create settlement authority. Agreement + Money authority control financial truth.
          </p>
        </div>
      </div>
    </div>
  );
}
