import { ApiError } from '../../api/securepay/http';
import type { StoreGateway } from '../../api/securepay/store';
import type { AgentController } from '../agent/controller';
import { errorText as storeErrorText } from '../store/controller';
import { minorToDecimal } from './money';
import { resultsFromSearch, resultsFromStore, type ResultOffer, type StoreResults } from './result';

/**
 * "Find on SecurePay" -- the discovery instrument's state, ONE union (never scattered booleans), so later
 * Community/Opportunity discovery can add phases without touching the rest.
 *
 * What it searches is exactly what SecurePay can: `GET /api/v1/stores/search` -- a required kind
 * (PRODUCT | SERVICE), a text `what` matched against an offer's TITLE OR DESCRIPTION, a text `place`
 * matched against the STORE's place label, both ANDed, newest first, at most 10. There is no size, colour,
 * budget, brand, rating or distance filter, so none is ever claimed (see docs).
 *
 * Choosing a result is NOT buying, joining or confirming. "Use this" only asks the existing Agent
 * controller to select the real Store offer as this conversation's commercial source
 * (`selectCommercialSource`, STORE_LISTING) and returns to the conversation.
 */
export interface DiscoveryQuery { kind: 'PRODUCT' | 'SERVICE'; what: string; place: string }
export type Leaf = Exclude<DiscoveryState, { phase: 'closed' }>;
export type DiscoveryFailure = { retry: { type: 'search'; query: DiscoveryQuery } | { type: 'store'; ownerKs: string; ownerName: string } };
export type DiscoveryState =
  | { phase: 'closed' }
  | { phase: 'form'; query: DiscoveryQuery }
  | { phase: 'searching'; query: DiscoveryQuery }
  | { phase: 'results'; query: DiscoveryQuery; results: ResultOffer[]; compare: string[] }
  | { phase: 'empty'; query: DiscoveryQuery }
  | { phase: 'failed'; query: DiscoveryQuery; error: string; failure: DiscoveryFailure }
  | { phase: 'loading-store'; query: DiscoveryQuery; ownerKs: string; ownerName: string }
  | { phase: 'store'; query: DiscoveryQuery; store: StoreResults; compare: string[] }
  | { phase: 'detail'; query: DiscoveryQuery; offer: ResultOffer; back: Leaf }
  | { phase: 'comparing'; query: DiscoveryQuery; offers: ResultOffer[]; back: Leaf }
  | { phase: 'source-selecting'; query: DiscoveryQuery; offer: ResultOffer; back: Leaf }
  | { phase: 'source-failed'; query: DiscoveryQuery; offer: ResultOffer; back: Leaf; error: string };

export const MAX_COMPARE = 3;
export const emptyQuery = (kind: DiscoveryQuery['kind'] = 'SERVICE'): DiscoveryQuery => ({ kind, what: '', place: '' });
type Gateway = Pick<StoreGateway, 'search' | 'store'>;
type AgentSide = Pick<AgentController, 'useOffer' | 'retryOfferSelection' | 'continueOfferWithoutSource'>;
/** `selected` only ever means THIS attempt's `selectCommercialSource` succeeded (the Agent said so) -- never "a source is already there". */
export type UseResult = 'selected' | 'failed' | 'busy' | 'unavailable';

export function createDiscoveryController(gateway: Gateway, agent: AgentSide, trustedMediaOrigin: string | null = null) {
  let state: DiscoveryState = { phase: 'closed' };
  const listeners = new Set<() => void>();
  const set = (next: DiscoveryState) => { state = next; listeners.forEach(listener => listener()); };
  let request = 0;

  async function search(query: DiscoveryQuery) {
    const mine = ++request;
    const clean: DiscoveryQuery = { kind: query.kind, what: query.what.trim(), place: query.place.trim() };
    set({ phase: 'searching', query: clean });
    try {
      const pages = await gateway.search({ kind: clean.kind, category: clean.what || undefined, location: clean.place || undefined, limit: 10 });
      if (mine !== request) return;
      const results = resultsFromSearch(pages, trustedMediaOrigin);
      set(results.length === 0 ? { phase: 'empty', query: clean } : { phase: 'results', query: clean, results, compare: [] });
    } catch (error) {
      if (mine !== request) return;
      set({ phase: 'failed', query: clean, error: failureText(error), failure: { retry: { type: 'search', query: clean } } });
    }
  }
  async function openStore(ownerKs: string, ownerName: string, query: DiscoveryQuery = emptyQuery()) {
    const mine = ++request;
    set({ phase: 'loading-store', query, ownerKs, ownerName });
    try {
      const store = resultsFromStore(await gateway.store(ownerKs), trustedMediaOrigin);
      if (mine !== request) return;
      set({ phase: 'store', query, store, compare: [] });
    } catch (error) {
      if (mine !== request) return;
      set({ phase: 'failed', query, error: failureText(error), failure: { retry: { type: 'store', ownerKs, ownerName } } });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Opens the finder. With a non-empty `what` the search runs straight away (the person already said what they want). */
    open(query: DiscoveryQuery = emptyQuery(), runNow = false) {
      if (runNow && (query.what.trim() || query.place.trim())) void search(query); else set({ phase: 'form', query });
    },
    close() { request += 1; set({ phase: 'closed' }); },
    search,
    setQuery(query: DiscoveryQuery) { if (state.phase === 'form') set({ phase: 'form', query }); },
    editSearch() { if ('query' in state) set({ phase: 'form', query: state.query }); },
    openStore,
    openDetail(offer: ResultOffer) {
      if (state.phase === 'results' || state.phase === 'store' || state.phase === 'comparing') {
        const back: Leaf = state.phase === 'comparing' ? state.back : state;
        set({ phase: 'detail', query: state.query, offer, back });
      }
    },
    toggleCompare(key: string) {
      if (state.phase !== 'results' && state.phase !== 'store') return;
      const compare = state.compare.includes(key) ? state.compare.filter(k => k !== key) : state.compare.length < MAX_COMPARE ? [...state.compare, key] : state.compare;
      set({ ...state, compare });
    },
    openCompare() {
      if (state.phase !== 'results' && state.phase !== 'store') return;
      const pool = state.phase === 'results' ? state.results : state.store.offers;
      const offers = state.compare.map(key => pool.find(o => o.key === key)).filter((o): o is ResultOffer => !!o);
      if (offers.length >= 2) set({ phase: 'comparing', query: state.query, offers, back: state });
    },
    /** Back one step: detail/compare -> the list it came from; a list -> the form; the form closes. */
    back() {
      if (state.phase === 'detail' || state.phase === 'comparing' || state.phase === 'source-failed') set(state.back);
      else if (state.phase === 'results' || state.phase === 'empty' || state.phase === 'failed' || state.phase === 'store' || state.phase === 'loading-store') set({ phase: 'form', query: state.query });
      else set({ phase: 'closed' });
    },
    async retry() {
      if (state.phase !== 'failed') return;
      const { retry } = state.failure;
      if (retry.type === 'search') await search(retry.query); else await openStore(retry.ownerKs, retry.ownerName, state.query);
    },
    /** Real commercial-source selection. Never buys/joins/confirms; needs the REAL offer id and owner KS Number. */
    async use(offer: ResultOffer): Promise<UseResult> {
      if (!offer.offerId) return 'unavailable';
      const back: Leaf = state.phase === 'detail' ? state.back : (state.phase === 'results' || state.phase === 'store' ? state : { phase: 'form', query: emptyQuery() });
      const query = 'query' in state ? state.query : emptyQuery();
      set({ phase: 'source-selecting', query, offer, back });
      const decimal = offer.priceMinor === null ? null : minorToDecimal(offer.priceMinor);
      const result = await agent.useOffer({
        amount: decimal ?? undefined, currency: decimal ? offer.currency : undefined,
        sourceDescription: `Offer: ${offer.title} — ${offer.ownerName} — offer ${offer.offerId}`,
        sourceId: offer.offerId, sourceOwnerKsNumber: offer.ownerKs,
      });
      // The outcome comes from the operation itself; nothing is inferred from the Agent's current state.
      switch (result.status) {
        case 'selected': set({ phase: 'closed' }); return 'selected';
        case 'failed': set({ phase: 'source-failed', query, offer, back, error: result.error }); return 'failed';
        case 'busy': set({ phase: 'detail', query, offer, back }); return 'busy';   // nothing happened, nothing is claimed
        case 'no-source': set({ phase: 'detail', query, offer, back }); return 'unavailable';
      }
    },
    async retrySource(): Promise<UseResult> {
      if (state.phase !== 'source-failed') return 'unavailable';
      const { offer, back, query } = state;
      set({ phase: 'source-selecting', query, offer, back });
      const result = await agent.retryOfferSelection();
      switch (result.status) {
        case 'selected': set({ phase: 'closed' }); return 'selected';
        case 'failed': set({ phase: 'source-failed', query, offer, back, error: result.error }); return 'failed';
        case 'busy': set({ phase: 'source-failed', query, offer, back, error: 'SecurePay is still working on something. Try again in a moment.' }); return 'busy';
        case 'no-source': set({ phase: 'detail', query, offer, back }); return 'unavailable';
      }
    },
    /** The explicit, visible choice: proceed without attributing the conversation to this listing. */
    async continueWithoutSource() {
      if (state.phase !== 'source-failed') return;
      // Only close once the Agent actually carried on; if it was busy nothing happened and the choice stays open.
      if ((await agent.continueOfferWithoutSource()) === 'continued') set({ phase: 'closed' });
    },
  };
}
export type DiscoveryController = ReturnType<typeof createDiscoveryController>;

function failureText(error: unknown): string {
  return error instanceof ApiError && error.kind === 'invalid-response' ? 'SecurePay returned something unreadable for this search. Try again.' : storeErrorText(error);
}
