import type { AgreementGateway, HubDto } from '../../api/securepay/agreements';
import type {
  AgreementDetailResponse, AgreementConfirmationStatusResponse, AgreementMoneyRecordResponse,
  CurrentUserAgreementSummaryResponse,
} from '../../api/securepay/agreements/dto';
import type { MoneyGateway } from '../../api/securepay/money';
import { ApiError, type RemoteState } from '../../api/securepay/http';
import { readiness as normalizeReadiness } from '../../api/securepay/money/adapters';
import type { AgreementStatus, PaymentReadinessStatus } from '../../types';
import { boltAgreementStatus, findInHub, type DetailCompletion, type StatusOrigin } from './view';

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

export type WorkspaceView = 'home' | 'hub' | 'detail' | 'money';

export interface DetailData { dto: AgreementDetailResponse; confirmations: AgreementConfirmationStatusResponse[] }
export type MoneyLoad =
  | { kind: 'unavailable'; message: string }
  | {
      kind: 'ready';
      readiness: PaymentReadinessStatus;
      outstandingReasons: { gateCode: string; reasonCode: string }[];
      records: AgreementMoneyRecordResponse[];
      fundActionAvailable: boolean;
    };

export interface WorkspaceState {
  view: WorkspaceView;
  /**
   * The single source for both Signed-in Home and the Agreement Hub. Home is not a separate read —
   * it renders exactly the backend's own `needsMe`/`waitingOnOthers` buckets (see attentionItemsFromHub/
   * waitingItemsFromHub in view.ts), never a locally re-derived classification from action presence.
   */
  hub: RemoteState<HubDto>;
  selectedAgreementId: string | null;
  selectedStatus: AgreementStatus | null;
  selectedCompletion: DetailCompletion | null;
  detail: RemoteState<DetailData>;
  money: RemoteState<MoneyLoad>;
}

const initial: WorkspaceState = {
  view: 'home',
  hub: { status: 'idle' },
  selectedAgreementId: null, selectedStatus: null, selectedCompletion: null,
  detail: { status: 'idle' }, money: { status: 'idle' },
};

type Gateway = Pick<AgreementGateway, 'currentUserActions' | 'hub' | 'detail' | 'confirmationStatus'> & {
  money: Pick<MoneyGateway, 'status' | 'records'>;
};

/**
 * Owns only read state + which real backend field classified an Agreement (see boltAgreementStatus in
 * view.ts) — never a locally recomputed lifecycle, Payment Ready value, or financial permission. Every
 * navigation method fetches from the authoritative endpoint for that view; Money always refetches
 * `/me/actions` fresh so a stale cached action can never expose a financial affordance after a failed
 * refresh. Agreement Detail's confirmation-status read is not allowed to fail silently: a failure there
 * fails the whole Detail load closed rather than rendering participant confirmation state as if it were
 * known.
 */
export function createWorkspaceController(gateway: Gateway) {
  let state: WorkspaceState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<WorkspaceState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  async function loadHub(view: 'home' | 'hub') {
    update({ view, hub: { status: 'loading' } });
    try {
      const hub = await gateway.hub();
      update({ hub: { status: 'ready', data: hub } });
    } catch (error) {
      update({ hub: { status: 'error', error: asApiError(error) } });
    }
  }

  async function openDetail(summary: CurrentUserAgreementSummaryResponse, origin: StatusOrigin) {
    const status = boltAgreementStatus(summary, origin);
    const completion: DetailCompletion = { completed: !!summary.completion?.completed, completedAt: summary.completion?.completedAt ?? null };
    update({ view: 'detail', selectedAgreementId: summary.agreementId, selectedStatus: status, selectedCompletion: completion, detail: { status: 'loading' } });
    try {
      // Both reads are required: a confirmation-status failure must never be silently treated as "no
      // participant has confirmed anything" — that would render an apparently authoritative confirmation
      // state (Confirmed current version / Joined — Not yet confirmed / Not yet joined) from a read that
      // never actually succeeded. Detail fails closed instead.
      const [dto, confirmations] = await Promise.all([
        gateway.detail(summary.agreementId),
        gateway.confirmationStatus(summary.agreementId),
      ]);
      update({ detail: { status: 'ready', data: { dto, confirmations } } });
    } catch (error) {
      update({ detail: { status: 'error', error: asApiError(error) } });
    }
  }

  function openById(agreementId: string) {
    if (state.hub.status !== 'ready') return;
    const found = findInHub(state.hub.data, agreementId);
    if (!found) return;
    void openDetail(found.summary, found.origin);
  }

  return {
    getSnapshot: (): WorkspaceState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    enter() { if (state.hub.status === 'idle') void loadHub('home'); },
    goHome() { void loadHub('home'); },
    goHub() { void loadHub('hub'); },

    /** From Signed-in Home or the Agreement Hub: both render the same authoritative Hub buckets. */
    openFromHome(agreementId: string) { openById(agreementId); },
    openFromHub(agreementId: string) { openById(agreementId); },

    /** Re-reads the same selected Agreement's Detail projection fresh (e.g. after a changed-version notice). */
    async refreshDetail() {
      if (!state.selectedAgreementId) return;
      const id = state.selectedAgreementId;
      update({ detail: { status: 'loading' } });
      try {
        const [dto, confirmations] = await Promise.all([
          gateway.detail(id),
          gateway.confirmationStatus(id),
        ]);
        update({ detail: { status: 'ready', data: { dto, confirmations } } });
      } catch (error) {
        update({ detail: { status: 'error', error: asApiError(error) } });
      }
    },

    backToHome() { update({ view: 'home', selectedAgreementId: null, selectedStatus: null, selectedCompletion: null, detail: { status: 'idle' } }); },
    backToHub() { update({ view: 'hub', selectedAgreementId: null, selectedStatus: null, selectedCompletion: null, detail: { status: 'idle' } }); },

    /** Money is always entered for one selected Agreement and always re-reads status/records/actions fresh. */
    async openMoney(agreementId: string) {
      update({ view: 'money', selectedAgreementId: agreementId, money: { status: 'loading' } });
      try {
        let readiness: PaymentReadinessStatus | null = null;
        let outstandingReasons: { gateCode: string; reasonCode: string }[] = [];
        let unavailableMessage: string | null = null;
        try {
          const statusDto = await gateway.money.status(agreementId);
          const normalized = normalizeReadiness(statusDto.paymentReadyStatus);
          if (normalized === 'UNKNOWN') unavailableMessage = 'SecurePay Money returned an unrecognized status.';
          else { readiness = normalized; outstandingReasons = statusDto.outstandingReasons; }
        } catch (error) {
          if (error instanceof ApiError && error.status === 404 && error.code === 'PAYMENT_READY_EVALUATION_NOT_FOUND') readiness = 'NO_EVALUATION_YET';
          else unavailableMessage = errorText(error);
        }
        if (unavailableMessage) { update({ money: { status: 'ready', data: { kind: 'unavailable', message: unavailableMessage } } }); return; }
        const [records, actionsPage] = await Promise.all([gateway.money.records(agreementId), gateway.currentUserActions(0, 100)]);
        const fundActionAvailable = actionsPage.items.some(a => a.agreementId === agreementId && a.actionCode === 'FUND_AGREEMENT');
        update({ money: { status: 'ready', data: { kind: 'ready', readiness: readiness as PaymentReadinessStatus, outstandingReasons, records, fundActionAvailable } } });
      } catch (error) {
        update({ money: { status: 'error', error: asApiError(error) } });
      }
    },
    backFromMoney() { update({ view: state.selectedAgreementId && state.detail.status === 'ready' ? 'detail' : 'hub', money: { status: 'idle' } }); },

    reset() { update({ ...initial }); },
  };
}
export type WorkspaceController = ReturnType<typeof createWorkspaceController>;
