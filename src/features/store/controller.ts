import { ApiError, type RemoteState } from '../../api/securepay/http';
import { businessOfferView, businessStoreIdentityView, publicOfferDetailView, myOfferView, myStoreIdentityView, searchResultsView, storeIdentityView, storeOffersView, type StoreSearchResult } from '../../api/securepay/store/adapters';
import type { BusinessStoreOpportunityResponse, StoreOfferResponse, UpsertStoreOfferRequest } from '../../api/securepay/store/dto';
import type { StoreIdentity, StoreOffer } from '../../types';
import type { OfferDraftFields } from '../../components/OfferBuilderView';
import { emptyOfferDraft, mergeSearchResults, searchRequests, type StoreManageGateway, type StoreReadGateway } from './view';
import {storeTextPublicationReview, storeTextPublicationFresh, storePublishedTextEditReview, storePublishedTextEditFresh} from './storeTextPublicationPolicy.mjs';

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'SecurePay could not read this request.';
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.status === 404) return 'This Store or offer could not be found. It may be unpublished or no longer exist.';
    if (error.status === 422) return 'That combination is not allowed (offer kind and availability must match).';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

export type StoreView = 'home' | 'profile' | 'offer' | 'toAgreement' | 'manage' | 'builder';
export interface StoreLoad { store: StoreIdentity; offers: StoreOffer[] }
// priceMinor is carried alongside the Bolt-facing `offer` view model (which only has the formatted
// display string) because "Use this" needs the raw numeric amount to seed a real external fact.
export interface OfferLoad { store: StoreIdentity; offer: StoreOffer; priceMinor: number | null }
export interface MyStoreLoad { profile: StoreIdentity; offers: StoreOffer[]; raw: StoreOfferResponse[]; opportunities: BusinessStoreOpportunityResponse[] }
function draftFromOffer(dto: StoreOfferResponse): OfferDraftFields {
  return {
    kind: dto.kind, title: dto.title, description: dto.description ?? '',
    priceMinor: dto.priceMinor, quantityAvailable: dto.quantityAvailable,
    availabilityState: dto.availabilityState, published: dto.published, mediaRefs: dto.mediaRefs,
  };
}

export interface StoreState {
  view: StoreView;
  query: string;
  search: RemoteState<StoreSearchResult[]>;
  selectedStore: RemoteState<StoreLoad>;
  selectedOffer: RemoteState<OfferLoad>;
  mine: RemoteState<MyStoreLoad>;
  managedBusiness: { ksNumber: string; displayName: string } | null;
  editingOfferId: string | null;
  draft: OfferDraftFields;
  draftBusy: boolean;
  draftError: string | null;
}
const initial: StoreState = {
  view: 'home', query: '',
  search: { status: 'idle' }, selectedStore: { status: 'idle' }, selectedOffer: { status: 'idle' }, mine: { status: 'idle' },
  managedBusiness: null, editingOfferId: null, draft: emptyOfferDraft, draftBusy: false, draftError: null,
};

type Gateway = StoreReadGateway & StoreManageGateway;

/**
 * Owns only Store read/write state — never Agreement/Trade Context/identity authority. "Use this"
 * only switches to the `toAgreement` view (Trade Taking Shape, showing the real fetched Offer as
 * informational, non-authoritative provenance); the actual seed-into-conversation call belongs to the
 * Agent controller (see features/agent/controller.ts `useOffer`) and is invoked by the caller, not here.
 */
export function createStoreController(gateway: Gateway, trustedMediaOrigin: string | null = null) {
  let state: StoreState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<StoreState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  async function runSearch(query: string) {
    update({ query, view: 'home', search: { status: 'loading' } });
    try {
      const requests = searchRequests(query);
      const pages = await Promise.all(requests.map(params => gateway.search(params)));
      const results = mergeSearchResults(pages.map(page => searchResultsView(page, trustedMediaOrigin)));
      update({ search: { status: 'ready', data: results } });
    } catch (error) {
      update({ search: { status: 'error', error: asApiError(error) } });
    }
  }

  async function loadMine() {
    try {
      if (state.managedBusiness) {
        const business = state.managedBusiness;
        const [profile, offers, opportunities] = await Promise.all([
          gateway.businessProfile(business.ksNumber),
          gateway.businessOffers(business.ksNumber),
          gateway.businessOpportunities(business.ksNumber),
        ]);
        update({ mine: { status: 'ready', data: {
          profile: businessStoreIdentityView(profile),
          offers: offers.map(offer => businessOfferView(offer, business.ksNumber, business.displayName, trustedMediaOrigin)),
          raw: offers,
          opportunities,
        } } });
        return;
      }
      const [profile, offers] = await Promise.all([gateway.myProfile(), gateway.myOffers()]);
      update({ mine: { status: 'ready', data: { profile: myStoreIdentityView(profile), offers: offers.map(offer => myOfferView(offer, trustedMediaOrigin)), raw: offers, opportunities: [] } } });
    } catch (error) {
      update({ mine: { status: 'error', error: asApiError(error) } });
    }
  }

  return {
    getSnapshot: (): StoreState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async enter() { if (state.search.status === 'idle') await runSearch(''); },
    setQuery(query: string) { update({ query }); },
    async submitSearch() { await runSearch(state.query); },

    async openStore(canonicalKsNumber: string) {
      update({ view: 'profile', selectedStore: { status: 'loading' } });
      try {
        const dto = await gateway.store(canonicalKsNumber);
        update({ selectedStore: { status: 'ready', data: { store: storeIdentityView(dto), offers: storeOffersView(dto, trustedMediaOrigin) } } });
      } catch (error) {
        update({ selectedStore: { status: 'error', error: asApiError(error) } });
      }
    },

    async openOffer(canonicalKsNumber: string, offerId: string) {
      update({ view: 'offer', selectedOffer: { status: 'loading' } });
      try {
        const dto = await gateway.offer(canonicalKsNumber, offerId);
        const { store, offer } = publicOfferDetailView(dto, trustedMediaOrigin);
        update({ selectedOffer: { status: 'ready', data: { store, offer, priceMinor: dto.offer.priceMinor } } });
      } catch (error) {
        update({ selectedOffer: { status: 'error', error: asApiError(error) } });
      }
    },

    /** Explicit "Use this": local view switch only, no backend call and no Agreement/Trade authority created. */
    useThis() { if (state.selectedOffer.status === 'ready') update({ view: 'toAgreement' }); },

    backToHome() { update({ view: 'home' }); },
    backToStore() { update({ view: state.selectedStore.status === 'ready' ? 'profile' : 'home' }); },
    backToOffer() { update({ view: state.selectedOffer.status === 'ready' ? 'offer' : 'home' }); },

    async enterManagement() {
      update({ managedBusiness: null, view: 'manage', mine: { status: 'loading' } });
      await loadMine();
    },
    async enterBusinessManagement(ksNumber: string, displayName: string) {
      update({ managedBusiness: { ksNumber, displayName }, view: 'manage', mine: { status: 'loading' } });
      await loadMine();
    },
    async refreshMine() { await loadMine(); },

    openBuilder(editingOfferId: string | null = null) {
      const existing = editingOfferId && state.mine.status === 'ready' ? state.mine.data.raw.find(o => o.id === editingOfferId) : undefined;
      update({ view: 'builder', editingOfferId, draft: existing ? draftFromOffer(existing) : emptyOfferDraft, draftError: null });
    },
    /** From the builder: back to Manage if it's already loaded, otherwise Home (reached via "Create an offer" before any Manage load). */
    backFromBuilder() { update({ view: state.mine.status === 'ready' ? 'manage' : 'home' }); },
    setDraft(patch: Partial<OfferDraftFields>) { if (!state.draftBusy) update({ draft: { ...state.draft, ...patch } }); },

    async submitDraft() {
      if (state.draftBusy || !state.draft.title.trim()) return;
      const existing = state.editingOfferId && state.mine.status === 'ready'
        ? state.mine.data.raw.find(o => o.id === state.editingOfferId) : null;
      // New offers and edits to private drafts stay private. Publication is
      // an independent, owner-confirmed, current-version action below.
      // Older already-published listing edits retain their legacy route until
      // the separate version-safe editing migration is certified.
      if (!existing?.published && state.draft.published) {
        update({ draftError: 'Save the private draft first. Review it again to publish its written details.' });
        return;
      }
      update({ draftBusy: true, draftError: null });
      const body: UpsertStoreOfferRequest = {
        kind: state.draft.kind, title: state.draft.title.trim(), description: state.draft.description.trim() || undefined,
        priceMinor: state.draft.priceMinor, quantityAvailable: state.draft.kind === 'PRODUCT' ? state.draft.quantityAvailable : undefined,
        availabilityState: state.draft.availabilityState,
        published: existing?.published === true ? state.draft.published : false,
        mediaRefs: state.draft.mediaRefs,
      };
      try {
        const reviewedEdit = storePublishedTextEditReview(existing, state.draft);
        if (existing?.published && reviewedEdit.ok) {
          // Only safe public text updates use the version-fenced endpoint.
          // Existing media/quantity-bearing listings keep the older path
          // until their separate versioned editing migration is certified.
          const business = state.managedBusiness;
          const latest = business
            ? await gateway.businessOffers(business.ksNumber)
            : await gateway.myOffers();
          const candidates = latest.filter(o => o.id === existing.id);
          if (candidates.length !== 1 ||
              !storePublishedTextEditFresh(existing, candidates[0]).ok) {
            update({ draftBusy: false, draftError:
              'This published offer changed. Review the latest listing before saving.' });
            return;
          }
          const changed = {
            expectedUpdatedAt: reviewedEdit.expectedUpdatedAt,
            sellerConfirmsCurrentListing: true as const,
            title: state.draft.title.trim(),
            description: state.draft.description.trim() || null,
            priceMinor: state.draft.priceMinor
          };
          const updated = business
            ? await gateway.updateBusinessPublishedTextOffer(business.ksNumber, existing.id, changed)
            : await gateway.updateMyPublishedTextOffer(existing.id, changed);
          if (updated.id !== existing.id || !updated.published ||
              updated.availabilityState !== 'NEEDS_CONFIRMATION' ||
              updated.availabilityConfirmedAt !== null ||
              updated.title !== changed.title ||
              (updated.description ?? null) !== changed.description ||
              updated.priceMinor !== changed.priceMinor ||
              updated.mediaRefs.length !== 0)
            throw new Error('Unexpected published text revision');
        } else if (state.managedBusiness) {
          if (state.editingOfferId) await gateway.updateBusinessOffer(state.managedBusiness.ksNumber, state.editingOfferId, body);
          else await gateway.createBusinessOffer(state.managedBusiness.ksNumber, body);
        } else {
          if (state.editingOfferId) await gateway.updateOffer(state.editingOfferId, body);
          else await gateway.createOffer(body);
        }
        update({ draftBusy: false, view: 'manage', editingOfferId: null, draft: emptyOfferDraft });
        await loadMine();
      } catch (error) {
        update({ draftBusy: false, draftError: errorText(error) });
      }
    },

    /**
     * Publish only an unchanged, already-saved text-only private offer.
     * User chooses this AFTER reviewing a canonical private Store draft.
     * The backend performs the decisive version-fenced CAS; the extra reads
     * prevent the client from presenting old or edited local terms as current.
     */
    async publishReviewedTextOffer() {
      const id = state.editingOfferId;
      if (state.draftBusy || !id || state.mine.status !== 'ready') return;
      const selected = state.mine.data.raw.find(o => o.id === id);
      const review = storeTextPublicationReview(selected, state.draft);
      if (!review.ok) {
        update({ draftError: review.reason === 'TEXT_ONLY_UNVERIFIED_AVAILABILITY_REQUIRED'
          ? 'Remove unverified photographs and stock quantities, and mark availability as needing confirmation before publication.'
          : 'Save your private draft and review the current Store details before publishing.' });
        return;
      }
      const business = state.managedBusiness;
      update({ draftBusy: true, draftError: null });
      try {
        // Re-read the exact owner and revision immediately before publication.
        const list = business ? await gateway.businessOffers(business.ksNumber) : await gateway.myOffers();
        const matches = list.filter(o => o.id === id);
        if (matches.length !== 1) throw new Error('The latest Store offer is not available.');
        const fresh = matches[0];
        if (!storeTextPublicationFresh(selected, fresh).ok) {
          update({ draftBusy: false, draftError: 'This Store offer changed. Review the latest draft before publishing.' });
          return;
        }
        const payload = { expectedUpdatedAt: fresh.updatedAt, sellerConfirmsCurrentListing: true as const };
        const published = business
          ? await gateway.publishBusinessTextOffer(business.ksNumber, id, payload)
          : await gateway.publishMyTextOffer(id, payload);
        if (published.id !== id || published.published !== true ||
            published.availabilityState !== 'NEEDS_CONFIRMATION' ||
            published.mediaRefs.length !== 0 || published.availabilityConfirmedAt !== null)
          throw new Error('The server did not confirm a safe text-only publication.');
        update({ view: 'manage', editingOfferId: null, draft: emptyOfferDraft, draftBusy: false });
        await loadMine();
      } catch {
        // A timeout may have committed publication. Never submit again without
        // a fresh Store read and explicit seller action.
        update({ draftBusy: false,
          draftError: 'SecurePay could not confirm publication. Check My Store before trying again.' });
      }
    },

    async confirmAvailability(offerId: string) {
      try {
        if (state.managedBusiness) await gateway.confirmBusinessOfferAvailability(state.managedBusiness.ksNumber, offerId);
        else await gateway.confirmAvailability(offerId);
        await loadMine();
      } catch (error) {
        update({ mine: { status: 'error', error: asApiError(error) } });
      }
    },

    reset() { update({ ...initial }); },
  };
}
export type StoreController = ReturnType<typeof createStoreController>;
