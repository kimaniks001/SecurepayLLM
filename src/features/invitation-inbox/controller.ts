import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AgreementInvitationInboxItemResponse } from '../../api/securepay/agreements/dto';
import { ApiError } from '../../api/securepay/http';

/**
 * KS001 Upgrade Phase 4 final convergence (Section 3/4) — the lightweight first-party Invitations
 * surface. This is NOT another Join state machine: it only ever reads the same self-scoped inbox Home
 * already reads (`GET /agreement-invitations/me`), and its rows route into the SAME existing
 * `RecipientExperience(invitationId)` → Join core (Section 3's own "it is simply: self-scoped list →
 * select item → existing RecipientExperience → existing Join core" instruction).
 */
export type InvitationInboxViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      items: AgreementInvitationInboxItemResponse[];
      page: number;
      size: number;
      total: number;
      loadingMore: boolean;
      loadMoreError: string | null;
    };

export const INVITATION_INBOX_PAGE_SIZE = 20;

type Gateway = Pick<AgreementGateway, 'myInvitations'>;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay is unavailable. Please try again.';
    }
    return error.message;
  }
  return 'SecurePay could not load your invitations. Please try again.';
}

export function createInvitationInboxController(gateway: Gateway) {
  let state: InvitationInboxViewState = { status: 'loading' };
  const listeners = new Set<() => void>();
  const update = (next: InvitationInboxViewState) => { state = next; listeners.forEach(listener => listener()); };

  async function load() {
    update({ status: 'loading' });
    try {
      const page = await gateway.myInvitations(0, INVITATION_INBOX_PAGE_SIZE);
      update({
        status: 'ready',
        items: page.items,
        page: 0,
        size: INVITATION_INBOX_PAGE_SIZE,
        total: page.totalElements,
        loadingMore: false,
        loadMoreError: null,
      });
    } catch (error) {
      update({ status: 'error', message: errorMessage(error) });
    }
  }

  async function loadMore() {
    const current = state;
    if (current.status !== 'ready' || current.loadingMore || current.items.length >= current.total) return;
    const nextPage = current.page + 1;
    update({ ...current, loadingMore: true, loadMoreError: null });
    try {
      const page = await gateway.myInvitations(nextPage, current.size);
      update({
        status: 'ready',
        items: [...current.items, ...page.items],
        page: nextPage,
        size: current.size,
        total: page.totalElements,
        loadingMore: false,
        loadMoreError: null,
      });
    } catch (error) {
      update({ ...current, loadingMore: false, loadMoreError: errorMessage(error) });
    }
  }

  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: (): InvitationInboxViewState => state,
    load,
    loadMore,
  };
}

export type InvitationInboxController = ReturnType<typeof createInvitationInboxController>;
