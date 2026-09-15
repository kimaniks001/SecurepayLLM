import { ApiError, type RemoteState } from '../../api/securepay/http';
import { searchResultsView, type StoreSearchResult } from '../../api/securepay/store/adapters';
import { searchRequests, mergeSearchResults } from '../store/view';
import type { StoreReadGateway } from '../store/view';

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

export type CommunityView = 'home' | 'object';
export interface CommunityState {
  view: CommunityView;
  query: string;
  search: RemoteState<StoreSearchResult[]>;
  selectedObjectId: string | null;
  notice: string | null;
}
const initial: CommunityState = { view: 'home', query: '', search: { status: 'idle' }, selectedObjectId: null, notice: null };

type Gateway = Pick<StoreReadGateway, 'search'>;

/**
 * Owns only the real "Offers from stores" composition (task section 7/9) — no Question/Need/
 * Opportunity/Work Story/Discussion authority exists on the backend (Phase 10 convergence audit,
 * docs/PRODUCTION_MIGRATION_LEDGER.md section 17: "FRONTEND-ONLY COMPOSITION... no backend code was
 * added for Community content objects"), so this controller never invents them. Reuses the exact same
 * public, unauthenticated Store search the Store feature already uses — never a second search engine.
 */
export function createCommunityController(gateway: Gateway, trustedMediaOrigin: string | null = null) {
  let state: CommunityState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<CommunityState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  async function runSearch(query: string) {
    update({ query, search: { status: 'loading' } });
    try {
      const requests = searchRequests(query);
      const pages = await Promise.all(requests.map(params => gateway.search(params)));
      const results = mergeSearchResults(pages.map(page => searchResultsView(page, trustedMediaOrigin)));
      update({ search: { status: 'ready', data: results } });
    } catch (error) {
      update({ search: { status: 'error', error: asApiError(error) } });
    }
  }

  return {
    getSnapshot: (): CommunityState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async enter() { if (state.search.status === 'idle') await runSearch(''); },
    setQuery(query: string) { update({ query }); },
    async submitSearch() { await runSearch(state.query); },

    /** Opening a real Community object never creates Agreement/handoff authority — pure local view switch. */
    openObject(id: string) { update({ view: 'object', selectedObjectId: id }); },
    backToHome() { update({ view: 'home', selectedObjectId: null }); },

    showNotice(text: string) { update({ notice: text }); },
    dismissNotice() { update({ notice: null }); },

    reset() { update({ ...initial }); },
  };
}
export type CommunityController = ReturnType<typeof createCommunityController>;
