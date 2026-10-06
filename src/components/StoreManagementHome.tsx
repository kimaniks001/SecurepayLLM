import { ArrowLeft, Plus, FileText, ShoppingBag, Link2 } from 'lucide-react';
import type { PlugAvailabilityResponse, PlugMissionDto } from '../api/securepay/marketnetwork/dto';
import type { BusinessStoreOpportunityResponse } from '../api/securepay/store/dto';
import type { FulfilmentNeedMatchDto, SupplyRouteDto } from '../api/securepay/fulfilment-needs';
import type { StoreIdentity, StoreOffer, StoreActivityItem, StoreEnquiry } from '../types';

interface StoreManagementHomeProps {
  store: StoreIdentity;
  offers: StoreOffer[];
  activity: StoreActivityItem[];
  enquiries: StoreEnquiry[];
  onBack: () => void;
  onCreateOffer: () => void;
  onEditOffer?: (offerId: string) => void;
  onConfirmAvailability?: (offerId: string) => void;
  businessMode?: boolean;
  opportunities?: BusinessStoreOpportunityResponse[];
  onOpenGrow?: () => void;
  onOpenMoney?: () => void;
  plugAvailability?: PlugAvailabilityResponse | null;
  plugAvailabilityBusy?: boolean;
  plugAvailabilityError?: string | null;
  plugMissions?: PlugMissionDto[];
  onTogglePlugAvailability?: () => void;
  onInspectOpportunity?: (needId: string) => void;
  onOpenRouteOffer?: (providerKsNumber: string, offerId: string) => void;
  onReviewRoute?: (needId: string, route: SupplyRouteDto) => void;
  opportunityInspection?: {
    needId: string;
    loading: boolean;
    error: string | null;
    matches: FulfilmentNeedMatchDto[];
    routes: SupplyRouteDto[];
  } | null;
}

export function StoreManagementHome({ store, offers, activity, enquiries, onBack, onCreateOffer, onEditOffer, onConfirmAvailability, businessMode = false, opportunities = [], onOpenGrow, onOpenMoney, plugAvailability, plugAvailabilityBusy = false, plugAvailabilityError, plugMissions = [], onTogglePlugAvailability, onInspectOpportunity, onOpenRouteOffer, onReviewRoute, opportunityInspection }: StoreManagementHomeProps) {
  const published = offers.filter((o) => o.lifecycle === 'published');
  const drafts = offers.filter((o) => o.lifecycle === 'draft');
  const unavailable = offers.filter((o) => o.lifecycle === 'unavailable');
  const needsAvailabilityCheck = offers.filter((o) =>
    o.lifecycle === 'published' && /needs confirmation/i.test(o.availability)
  );
  const todayCount = needsAvailabilityCheck.length + opportunities.length + plugMissions.length;

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
        <section aria-label="What needs you today" className="rounded-2xl border border-forest-200 bg-forest-50/50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-sand-500">Today</div>
              <h2 className="mt-1 font-display text-lg text-forest-800">What needs you?</h2>
              <p className="mt-1 text-[0.76rem] text-sand-600">
                SecurePay only puts real Store facts here — availability that needs confirming, matching demand and Plug work already visible to you.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white border border-forest-200 px-2.5 py-1 text-[0.72rem] font-medium text-forest-700">
              {todayCount}
            </span>
          </div>

          {todayCount === 0 ? (
            <div className="mt-3 rounded-xl border border-forest-100 bg-white/70 px-3 py-3">
              <div className="text-[0.8rem] font-medium text-forest-800">Nothing needs action right now.</div>
              <p className="mt-0.5 text-[0.7rem] text-sand-500">Your published offers can keep working. You can create something new or review your Store below.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {needsAvailabilityCheck.map(offer => (
                <div key={offer.id} className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                  <div className="text-[0.78rem] font-medium text-forest-800">{offer.title}</div>
                  <div className="mt-0.5 text-[0.68rem] text-sand-500">Availability needs confirmation before customers rely on it.</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {onConfirmAvailability && (
                      <button onClick={() => onConfirmAvailability(offer.id)} className="rounded-lg bg-forest-600 px-3 py-1.5 text-[0.7rem] font-medium text-white">
                        Confirm availability
                      </button>
                    )}
                    {onEditOffer && (
                      <button onClick={() => onEditOffer(offer.id)} className="rounded-lg border border-cream-200 px-3 py-1.5 text-[0.7rem] font-medium text-forest-700">
                        Review offer
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {businessMode && opportunities.length > 0 && (
                <div className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                  <div className="text-[0.78rem] font-medium text-forest-800">{opportunities.length} demand match{opportunities.length === 1 ? '' : 'es'} worth reviewing</div>
                  <div className="mt-0.5 text-[0.68rem] text-sand-500">These come from MATCHABLE fulfilment needs that already match this Business Store's published offers.</div>
                </div>
              )}
              {plugMissions.length > 0 && (
                <div className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                  <div className="text-[0.78rem] font-medium text-forest-800">{plugMissions.length} Plug mission{plugMissions.length === 1 ? '' : 's'} visible</div>
                  <div className="mt-0.5 text-[0.68rem] text-sand-500">Only bounded work already permitted for your qualified Plug identity appears here.</div>
                </div>
              )}
            </div>
          )}
        </section>

        {businessMode && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Store Vision</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                <div className="text-[0.72rem] font-medium text-forest-800">Today</div>
                <div className="text-[0.68rem] text-sand-500 mt-1">Current offers and availability below.</div>
              </div>
              <div className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                <div className="text-[0.72rem] font-medium text-forest-800">Opportunities</div>
                <div className="text-[0.68rem] text-sand-500 mt-1">Demand matching appears only when SecurePay has real fulfilment needs. Only MATCHABLE demand is shown. {opportunities.length} current match{opportunities.length === 1 ? '' : 'es'}.</div>
              </div>
              <button disabled={!onOpenGrow} onClick={onOpenGrow} className="text-left rounded-xl border border-cream-200 bg-white px-3 py-3 disabled:opacity-50">
                <div className="text-[0.72rem] font-medium text-forest-800">Grow</div>
                <div className="text-[0.68rem] text-sand-500 mt-1">Plans, ideas and operating guidance from this Business Vision.</div>
              </button>
              <button disabled={!onOpenMoney} onClick={onOpenMoney} className="text-left rounded-xl border border-cream-200 bg-white px-3 py-3 disabled:opacity-50">
                <div className="text-[0.72rem] font-medium text-forest-800">Money</div>
                <div className="text-[0.68rem] text-sand-500 mt-1">Open SecurePay Money for authoritative financial truth.</div>
              </button>
            </div>
          </div>
        )}

        {/* Authoritative offer-state counts only. */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Published', published.length],
            ['Drafts', drafts.length],
            ['Unavailable', unavailable.length],
          ].map(([label, count]) => (
            <div key={String(label)} className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
              <FileText className="w-4 h-4 text-sand-400 mx-auto mb-1" />
              <div className="text-[0.875rem] font-medium text-forest-800">{count}</div>
              <div className="text-[0.65rem] text-sand-500">{label}</div>
            </div>
          ))}
        </div>

        {businessMode && opportunities.length > 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4">
            <div className="text-[0.72rem] font-medium text-forest-800">Store opportunities</div>
            <p className="text-[0.68rem] text-sand-500 mt-1">Only privacy-safe demand that matches one of this Business Store's published offers appears here.</p>
            <div className="mt-3 space-y-2">
              {opportunities.slice(0, 10).map(opportunity => (
                <div key={opportunity.fulfilmentNeedId} className="rounded-xl border border-cream-200 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[0.78rem] font-medium text-forest-800">{opportunity.needType.replace(/_/g, ' ')}</div>
                    {opportunity.poolable && <span className="text-[0.62rem] rounded-full bg-cream-100 px-2 py-0.5 text-sand-600">Poolable</span>}
                  </div>
                  <div className="text-[0.68rem] text-sand-500 mt-1">
                    {opportunity.quantity !== null ? `${opportunity.quantity}${opportunity.unit ? ` ${opportunity.unit}` : ''}` : 'Quantity not yet stated'}
                    {opportunity.requiredBy ? ` · needed by ${opportunity.requiredBy}` : ''}
                  </div>
                  <div className="text-[0.65rem] text-sand-400 mt-2">
                    Matches: {opportunity.matchedOffers.map(match => match.title).join(', ')}
                  </div>
                  {onInspectOpportunity && (
                    <button
                      type="button"
                      onClick={() => onInspectOpportunity(opportunity.fulfilmentNeedId)}
                      className="mt-2 rounded-lg border border-cream-200 px-3 py-1.5 text-[0.7rem] font-medium text-forest-700 hover:border-forest-300"
                    >
                      Compare supply routes
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {opportunityInspection && (
          <section aria-label="Supply routes" className="rounded-2xl border border-forest-200 bg-forest-50/40 px-4 py-4">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-sand-500">Supply routes</div>
            <h2 className="mt-1 font-display text-lg text-forest-800">Compare before you commit</h2>
            <p className="mt-1 text-[0.72rem] text-sand-600">These are backend-matched routes for this fulfilment need. SecurePay is not selecting a supplier or calculating a landed cost that the backend does not know.</p>

            {opportunityInspection.loading && <p role="status" className="mt-3 text-[0.76rem] text-sand-500">Checking routes…</p>}
            {opportunityInspection.error && <p role="alert" className="mt-3 text-[0.76rem] text-ember-600">{opportunityInspection.error}</p>}

            {!opportunityInspection.loading && !opportunityInspection.error && opportunityInspection.routes.length === 0 && (
              <p className="mt-3 text-[0.76rem] text-sand-500">No supply route is available for this need yet.</p>
            )}

            <div className="mt-3 space-y-2">
              {opportunityInspection.routes.map(route => (
                <div key={route.routeId} className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[0.8rem] font-medium text-forest-800">{route.routeLabel}</div>
                      <div className="mt-0.5 text-[0.68rem] text-sand-500">
                        {route.providerDisplayName ?? route.providerKsNumber}
                        {route.leadTimeHours !== null ? ` · ${route.leadTimeHours}h lead time` : ''}
                        {route.minimumOrderQuantity !== null ? ` · MOQ ${route.minimumOrderQuantity}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.72rem] font-medium text-forest-800">
                        {route.headlinePriceMinor !== null ? `${route.currency} ${(route.headlinePriceMinor / 100).toLocaleString()}` : 'Price not listed'}
                      </div>
                      <div className="text-[0.62rem] text-sand-400">{route.landedCostKnown ? 'Landed cost known' : 'Landed cost not established'}</div>
                    </div>
                  </div>

                  {route.tradeOffs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {route.tradeOffs.slice(0, 3).map((tradeOff, index) => (
                        <li key={index} className="text-[0.68rem] text-sand-600">• {tradeOff}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.64rem] text-sand-500">
                    <span>{route.deliveryAvailable === null ? 'Delivery not stated' : route.deliveryAvailable ? 'Delivery available' : 'No delivery declared'}</span>
                    <span>{route.warrantyDeclared ? 'Warranty declared' : 'Warranty not declared'}</span>
                    <span>{route.returnTermsDeclared ? 'Return terms declared' : 'Return terms not declared'}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {onReviewRoute && (
                      <button
                        type="button"
                        onClick={() => onReviewRoute(opportunityInspection.needId, route)}
                        className="rounded-lg bg-forest-600 px-3 py-1.5 text-[0.7rem] font-medium text-white"
                      >
                        Review for Agreement
                      </button>
                    )}
                    {onOpenRouteOffer && (
                      <button
                        type="button"
                        onClick={() => onOpenRouteOffer(route.providerKsNumber, route.offerId)}
                        className="rounded-lg border border-forest-200 px-3 py-1.5 text-[0.7rem] font-medium text-forest-700"
                      >
                        Open offer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {opportunityInspection.matches.length > opportunityInspection.routes.length && (
              <p className="mt-3 text-[0.68rem] text-sand-500">{opportunityInspection.matches.length} provider match{opportunityInspection.matches.length === 1 ? '' : 'es'} found; routes above are the backend-composed supply options currently available.</p>
            )}
          </section>
        )}

        {plugAvailability && (
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[0.72rem] font-medium text-forest-800">Extra Plug work</div>
                <p className="text-[0.72rem] text-sand-500 mt-1">
                  Your Store stays active either way. This only controls whether your qualified human KS is available for bounded Plug tasks.
                </p>
              </div>
              <button
                disabled={plugAvailabilityBusy || !onTogglePlugAvailability}
                onClick={onTogglePlugAvailability}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[0.72rem] font-medium disabled:opacity-50 ${plugAvailability.available ? 'bg-forest-600 text-white' : 'bg-cream-100 text-sand-600'}`}
              >
                {plugAvailabilityBusy ? 'Saving…' : plugAvailability.available ? 'ON' : 'OFF'}
              </button>
            </div>
            {plugAvailability.availableUntil && <div className="text-[0.68rem] text-sand-500 mt-2">Available until {plugAvailability.availableUntil}</div>}
            {plugAvailabilityError && <div role="alert" className="text-[0.72rem] text-ember-600 mt-2">{plugAvailabilityError}</div>}
          </div>
        )}

        {plugAvailability?.qualified && (
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4">
            <div className="text-[0.72rem] font-medium text-forest-800">Plug missions</div>
            <p className="text-[0.68rem] text-sand-500 mt-1">Only missions already visible to your qualified Plug identity appear here.</p>
            {plugMissions.length === 0 ? (
              <p className="text-[0.72rem] text-sand-400 mt-3">No fulfilment, pooling or assembly missions available right now.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {plugMissions.slice(0, 5).map(mission => (
                  <div key={mission.opportunityOfferId} className="rounded-xl border border-cream-200 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[0.78rem] font-medium text-forest-800">{mission.title}</div>
                      <span className="text-[0.62rem] rounded-full bg-cream-100 px-2 py-0.5 text-sand-600">{mission.missionType}</span>
                    </div>
                    <div className="text-[0.7rem] text-sand-500 mt-1">{mission.summary}</div>
                    <div className="text-[0.65rem] text-sand-400 mt-1">Authority: {mission.authorityRequirement.replace(/_/g, ' ')}</div>
                    {mission.permittedActions.length > 0 && (
                      <div className="text-[0.65rem] text-sand-400 mt-2">Allowed: {mission.permittedActions.join(', ')}</div>
                    )}
                    {mission.rewardBasis && (
                      <div className="text-[0.65rem] text-sand-400 mt-1">Reward basis: {mission.rewardBasis}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                    <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">{offer.isDemoState ? offer.version : `Updated ${offer.version}`}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {onEditOffer && (
                      <button onClick={() => onEditOffer(offer.id)} className="rounded-lg border border-cream-200 px-2.5 py-1.5 text-[0.68rem] font-medium text-forest-700">
                        Review
                      </button>
                    )}
                    {/needs confirmation/i.test(offer.availability) && onConfirmAvailability && (
                      <button onClick={() => onConfirmAvailability(offer.id)} className="rounded-lg bg-forest-600 px-2.5 py-1.5 text-[0.68rem] font-medium text-white">
                        Confirm availability
                      </button>
                    )}
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
