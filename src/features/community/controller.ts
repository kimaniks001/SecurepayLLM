import { ApiError, type RemoteState } from '../../api/securepay/http';
import type { CommunityGateway } from '../../api/securepay/community';
import type { CommunityObjectResponse } from '../../api/securepay/community/dto';
import { searchResultsView, type StoreSearchResult } from '../../api/securepay/store/adapters';
import { searchRequests, mergeSearchResults } from '../store/view';
import type { StoreReadGateway } from '../store/view';
import type { CommunityObjectType } from '../../types';

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

export type CommunityView = 'home' | 'object' | 'compose';
const REAL_COMPOSE_TYPES: { value: CommunityObjectType; label: string }[] = [
  { value: 'question', label: 'Ask a question' },
  { value: 'need', label: 'Post a need' },
  { value: 'opportunity', label: 'Share an opportunity' },
  { value: 'work_story', label: 'Share a work story' },
  { value: 'discussion', label: 'Start a discussion' },
];
export { REAL_COMPOSE_TYPES };

export interface ComposeDraft {
  objectType: CommunityObjectType | null;
  title: string;
  body: string;
  locationLabel: string;
  submitting: boolean;
  error: string | null;
}
const emptyDraft: ComposeDraft = { objectType: null, title: '', body: '', locationLabel: '', submitting: false, error: null };

export interface CommunityState {
  view: CommunityView;
  query: string;
  search: RemoteState<StoreSearchResult[]>;
  feed: RemoteState<CommunityObjectResponse[]>;
  selectedObjectId: string | null;
  selectedRealObject: CommunityObjectResponse | null;
  /** IDs of the signed-in caller's own objects (from `community.mine()`) -- empty and harmless when
   * signed out. Used only to decide whether to offer the author-only Close action; the backend
   * remains the real authority and independently enforces ownership regardless of this set. */
  ownObjectIds: ReadonlySet<string>;
  draft: ComposeDraft;
  notice: string | null;
}
const initial: CommunityState = {
  view: 'home', query: '', search: { status: 'idle' }, feed: { status: 'idle' },
  selectedObjectId: null, selectedRealObject: null, ownObjectIds: new Set(), draft: { ...emptyDraft }, notice: null,
};

type Gateway = Pick<StoreReadGateway, 'search'>;

/**
 * Phase 6 (Community Life) Slice 1 -- real Question/Need/Opportunity/Work Story/Discussion authority,
 * against `CommunityObjectController` (`createCommunityGateway`). Store-offer search (Phase 10) is
 * preserved unchanged and merged alongside the real feed -- Community continues to reference Store
 * rather than duplicate it (Section 4/27). Creating, listing one's own objects and closing an object
 * still never create Agreement/handoff authority -- see `CommunityObjectService`'s own doctrine.
 */
export function createCommunityController(
  gateway: Gateway,
  community: CommunityGateway,
  trustedMediaOrigin: string | null = null,
) {
  let state: CommunityState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<CommunityState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  let searchSequence = 0;
  async function runSearch(query: string) {
    const sequence = ++searchSequence;
    update({ query, search: { status: 'loading' } });
    try {
      const requests = searchRequests(query);
      const pages = await Promise.all(requests.map(params => gateway.search(params)));
      const results = mergeSearchResults(pages.map(page => searchResultsView(page, trustedMediaOrigin)));
      if (sequence !== searchSequence) return;
      update({ search: { status: 'ready', data: results } });
    } catch (error) {
      if (sequence !== searchSequence) return;
      update({ search: { status: 'error', error: asApiError(error) } });
    }
  }

  async function loadFeed() {
    update({ feed: { status: 'loading' } });
    try {
      const objects = await community.feed();
      update({ feed: { status: 'ready', data: objects } });
    } catch (error) {
      update({ feed: { status: 'error', error: asApiError(error) } });
    }
  }

  function upsertFeedObject(object: CommunityObjectResponse) {
    if (state.feed.status !== 'ready') {
      update({ feed: { status: 'ready', data: [object] } });
      return;
    }
    const withoutExisting = state.feed.data.filter(o => o.id !== object.id);
    update({ feed: { status: 'ready', data: [object, ...withoutExisting] } });
  }

  return {
    getSnapshot: (): CommunityState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async enter() {
      if (state.search.status === 'idle') void runSearch('');
      if (state.feed.status === 'idle') await loadFeed();
      // Signed-out browsing is first-class (Section 19) -- a 401 here just means no own objects to flag.
      try {
        const mine = await community.mine();
        update({ ownObjectIds: new Set(mine.map(o => o.id)) });
      } catch { /* signed out, or transiently unavailable -- Close affordance simply stays hidden */ }
    },
    setQuery(query: string) { update({ query }); },
    async submitSearch() { await runSearch(state.query); },

    /** Opening a real Community object never creates Agreement/handoff authority -- pure local view switch. */
    openObject(id: string) {
      const real = state.feed.status === 'ready' ? state.feed.data.find(o => o.id === id) ?? null : null;
      update({ view: 'object', selectedObjectId: id, selectedRealObject: real });
    },
    backToHome() { update({ view: 'home', selectedObjectId: null, selectedRealObject: null }); },

    openComposer() { update({ view: 'compose', draft: { ...emptyDraft } }); },
    cancelComposer() { update({ view: 'home', draft: { ...emptyDraft } }); },
    setComposeType(objectType: CommunityObjectType) { update({ draft: { ...state.draft, objectType, error: null } }); },
    setComposeField(field: 'title' | 'body' | 'locationLabel', value: string) {
      update({ draft: { ...state.draft, [field]: value, error: null } });
    },
    async submitCompose() {
      const { objectType, title, body, locationLabel } = state.draft;
      if (!objectType) { update({ draft: { ...state.draft, error: 'Choose what you would like to share.' } }); return; }
      if (!title.trim()) { update({ draft: { ...state.draft, error: 'Give it a short title.' } }); return; }
      if (!body.trim()) { update({ draft: { ...state.draft, error: 'Say a little more about it.' } }); return; }
      const backendType = objectType.toUpperCase();
      update({ draft: { ...state.draft, submitting: true, error: null } });
      try {
        const created = await community.create(
          backendType, title.trim(), body.trim(), locationLabel.trim() || null,
          `community-create-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        upsertFeedObject(created);
        update({
          view: 'home', draft: { ...emptyDraft }, notice: 'Shared with the community.',
          ownObjectIds: new Set([...state.ownObjectIds, created.id]),
        });
      } catch (error) {
        update({ draft: { ...state.draft, submitting: false, error: errorText(error) } });
      }
    },

    /** Closing is the author's own action only -- the backend independently enforces ownership. */
    async closeObject(id: string) {
      try {
        const closed = await community.close(id);
        upsertFeedObject(closed);
        update({ selectedRealObject: closed, notice: 'Closed. It no longer appears in the open feed.' });
      } catch (error) {
        update({ notice: errorText(error) });
      }
    },

    showNotice(text: string) { update({ notice: text }); },
    dismissNotice() { update({ notice: null }); },

    reset() { update({ ...initial, draft: { ...emptyDraft } }); },
  };
}
export type CommunityController = ReturnType<typeof createCommunityController>;
