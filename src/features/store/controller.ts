import { ApiError, type RemoteState } from '../../api/securepay/http';
import { publicOfferDetailView, myOfferView, myStoreIdentityView, searchResultsView, storeIdentityView, storeOffersView, type StoreSearchResult } from '../../api/securepay/store/adapters';
import type { StoreOfferResponse, UpsertStoreOfferRequest } from '../../api/securepay/store/dto';
import type { StoreIdentity, StoreOffer } from '../../types';
import type { OfferDraftFields } from '../../components/OfferBuilderView';
import { emptyOfferDraft, mergeSearchResults, searchRequests, type StoreManageGateway, type StoreReadGateway } from './view';

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
export interface MyStoreLoad { profile: StoreIdentity; offers: StoreOffer[]; raw: StoreOfferResponse[] }
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
  editingOfferId: string | null;
  draft: OfferDraftFields;
  draftBusy: boolean;
  draftError: string | null;
}
const initial: StoreState = {
  view: 'home', query: '',
  search: { status: 'idle' }, selectedStore: { status: 'idle' }, selectedOffer: { status: 'idle' }, mine: { status: 'idle' },
  editingOfferId: null, draft: emptyOfferDraft, draftBusy: false, draftError: null,
};

type Gateway = StoreReadGateway & StoreManageGateway;

/**
 * Owns only Store read/write state — never Agreement/Trade Context/identity authority. "Use this"
 * only switches to the `toAgreement` view (Trade Taking Shape, showing the real fetched Offer as
 * informational, non-authoritative provenance); the actual seed-into-conversation call belongs to the
 * Agent controller (see features/agent/controller.ts `useOffer`) and is invoked by the caller, not here.
 */
export function createStoreController(gateway: Gateway) {
  let state: StoreState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<StoreState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  async function runSearch(query: string) {
    update({ query, view: 'home', search: { status: 'loading' } });
    try {
      const requests = searchRequests(query);
      const pages = await Promise.all(requests.map(params => gateway.search(params)));
      const results = mergeSearchResults(pages.map(searchResultsView));
      update({ search: { status: 'ready', data: results } });
    } catch (error) {
      update({ search: { status: 'error', error: asApiError(error) } });
    }
  }

  async function loadMine() {
    try {
      const [profile, offers] = await Promise.all([gateway.myProfile(), gateway.myOffers()]);
      update({ mine: { status: 'ready', data: { profile: myStoreIdentityView(profile), offers: offers.map(myOfferView), raw: offers } } });
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
        update({ selectedStore: { status: 'ready', data: { store: storeIdentityView(dto), offers: storeOffersView(dto) } } });
      } catch (error) {
        update({ selectedStore: { status: 'error', error: asApiError(error) } });
      }
    },

    async openOffer(canonicalKsNumber: string, offerId: string) {
      update({ view: 'offer', selectedOffer: { status: 'loading' } });
      try {
        const dto = await gateway.offer(canonicalKsNumber, offerId);
        const { store, offer } = publicOfferDetailView(dto);
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

    async enterManagement() { update({ view: 'manage', mine: { status: 'loading' } }); await loadMine(); },
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
      update({ draftBusy: true, draftError: null });
      const body: UpsertStoreOfferRequest = {
        kind: state.draft.kind, title: state.draft.title.trim(), description: state.draft.description.trim() || undefined,
        priceMinor: state.draft.priceMinor, quantityAvailable: state.draft.kind === 'PRODUCT' ? state.draft.quantityAvailable : undefined,
        availabilityState: state.draft.availabilityState, published: state.draft.published, mediaRefs: state.draft.mediaRefs,
      };
      try {
        if (state.editingOfferId) await gateway.updateOffer(state.editingOfferId, body);
        else await gateway.createOffer(body);
        update({ draftBusy: false, view: 'manage', editingOfferId: null, draft: emptyOfferDraft });
        await loadMine();
      } catch (error) {
        update({ draftBusy: false, draftError: errorText(error) });
      }
    },

    async confirmAvailability(offerId: string) {
      try {
        await gateway.confirmAvailability(offerId);
        await loadMine();
      } catch (error) {
        update({ mine: { status: 'error', error: asApiError(error) } });
      }
    },

    reset() { update({ ...initial }); },
  };
}
export type StoreController = ReturnType<typeof createStoreController>;
