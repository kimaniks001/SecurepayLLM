import type { AgreementGateway, HubDto } from '../../api/securepay/agreements';
import type {
  AgreementCalendarEventResponse, AgreementDetailResponse, AgreementConfirmationResponse, AgreementCompletionResponse, AgreementConfirmationStatusResponse,
  AgreementMoneyByCurrencyResponse, AgreementMoneyRecordResponse, AgreementProblemSummaryResponse,
  CurrentUserAgreementSummaryResponse, MilestoneEffectiveStateResponse,
  PersonalTagResponse, RecentActivityEntryResponse, SchedulingConflictResponse, WorkspaceNextActionResponse,
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

export interface DetailData {
  dto: AgreementDetailResponse;
  /** null = the confirmations read FAILED (unknown), never an empty list, so a failure can't render as "nobody confirmed". */
  confirmations: AgreementConfirmationResponse[] | null;
  /** The caller's OWN standing (`confirmation-status` returns only the caller's row). null = the read failed (unknown). */
  myConfirmation: AgreementConfirmationStatusResponse[] | null;
  /**
   * Best-effort Phase 3 enrichments -- a failure to load these must never fail the whole Detail
   * view (they are additive; core Agreement truth above is what fails closed). Default to empty.
   */
  /** null = the read FAILED (unknown); an empty array means SecurePay returned no effective states. */
  milestoneStates: MilestoneEffectiveStateResponse[] | null;
  events: AgreementCalendarEventResponse[];
  conflicts: SchedulingConflictResponse[];
  tags: PersonalTagResponse[];
}
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
  /** Best-effort KSCalendar for Home -- a failure here never fails Home closed; defaults to empty. */
  myCalendarEvents: AgreementCalendarEventResponse[];
  /**
   * Final Phase 3 correction (Section 9) -- best-effort enrichment from the real
   * `/api/v1/me/agreements/home` composition: problems, recent activity, and Agreement Money by
   * currency. A failure here never fails Home closed (attention/waiting/upcoming already render
   * from `hub`/`myCalendarEvents` above); it defaults to empty, never a fabricated feed.
   */
  homeExtras: {
    problems: AgreementProblemSummaryResponse[];
    recentActivity: RecentActivityEntryResponse[];
    moneyByCurrency: AgreementMoneyByCurrencyResponse[];
  };
  selectedAgreementId: string | null;
  selectedStatus: AgreementStatus | null;
  selectedCompletion: DetailCompletion | null;
  /** SecurePay's whole-Agreement completion projection for the selected Agreement, exactly as the Hub returned it (a READ MODEL; there is no command). */
  selectedCompletionFacts: AgreementCompletionResponse | null;
  /**
   * Deep-review correction: the authoritative per-participant next actions from the same Hub/Home
   * summary used to open this Agreement (already backend-sorted by ParticipantNextActionService),
   * carried alongside selectedStatus/selectedCompletion so AgreementOverview's "Next" block reads
   * real truth instead of the always-empty agreementProgressView(...).actions. Not re-fetched on
   * refreshDetail(), matching the existing selectedStatus/selectedCompletion behaviour.
   */
  selectedAgreementNextActions: WorkspaceNextActionResponse[];
  /** The caller's OWN participant status on the selected Agreement, from the Hub summary (`CREATOR` = they created it). */
  selectedActorStatus: string | null;
  detail: RemoteState<DetailData>;
  money: RemoteState<MoneyLoad>;
}

const initial: WorkspaceState = {
  view: 'home',
  hub: { status: 'idle' },
  myCalendarEvents: [],
  homeExtras: { problems: [], recentActivity: [], moneyByCurrency: [] },
  selectedAgreementId: null, selectedStatus: null, selectedCompletion: null, selectedCompletionFacts: null, selectedAgreementNextActions: [], selectedActorStatus: null,
  detail: { status: 'idle' }, money: { status: 'idle' },
};

type Gateway = Pick<AgreementGateway,
  'currentUserActions' | 'hub' | 'home' | 'detail' | 'confirmations' | 'confirmationStatus' | 'milestoneEffectiveStates'
  | 'calendarEvents' | 'calendarConflicts' | 'tagsForAgreement' | 'tagAgreement' | 'untagAgreement' | 'myCalendar'
> & {
  money: Pick<MoneyGateway, 'status' | 'records'>;
};

/** Best-effort enrichment read -- never fails the caller closed, always resolves to a default. */
async function bestEffort<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try { return await read(); } catch { return fallback; }
}

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
      const myCalendarEvents = await bestEffort(() => gateway.myCalendar(), []);
      const homeExtras = view === 'home'
        ? await bestEffort(
            async () => {
              const home = await gateway.home();
              return { problems: home.problems, recentActivity: home.recentActivity, moneyByCurrency: home.moneyByCurrency };
            },
            initial.homeExtras,
          )
        : state.homeExtras;
      update({ hub: { status: 'ready', data: hub }, myCalendarEvents, homeExtras });
    } catch (error) {
      update({ hub: { status: 'error', error: asApiError(error) } });
    }
  }

  async function loadDetailData(agreementId: string): Promise<DetailData> {
    // Detail is the core Agreement truth and fails closed. Confirmations are read separately: if that read fails the
    // participants still render and their confirmation state is UNKNOWN (null) -- never "nobody confirmed".
    const [dto, confirmations, myConfirmation] = await Promise.all([
      gateway.detail(agreementId),
      bestEffort<AgreementConfirmationResponse[] | null>(() => gateway.confirmations(agreementId), null),
      bestEffort<AgreementConfirmationStatusResponse[] | null>(() => gateway.confirmationStatus(agreementId), null),
    ]);
    // Phase 3 enrichments: additive only, never allowed to fail Detail closed.
    const [milestoneStates, events, conflicts, tags] = await Promise.all([
      bestEffort<MilestoneEffectiveStateResponse[] | null>(() => gateway.milestoneEffectiveStates(agreementId), null),
      bestEffort(() => gateway.calendarEvents(agreementId), []),
      bestEffort(() => gateway.calendarConflicts(agreementId), []),
      bestEffort(() => gateway.tagsForAgreement(agreementId), []),
    ]);
    return { dto, confirmations, myConfirmation, milestoneStates, events, conflicts, tags };
  }

  async function openDetail(summary: CurrentUserAgreementSummaryResponse, origin: StatusOrigin) {
    const status = boltAgreementStatus(summary, origin);
    const completion: DetailCompletion = { completed: !!summary.completion?.completed, completedAt: summary.completion?.completedAt ?? null };
    update({
      view: 'detail', selectedAgreementId: summary.agreementId, selectedStatus: status, selectedCompletion: completion, selectedCompletionFacts: summary.completion ?? null,
      selectedAgreementNextActions: summary.nextActions, selectedActorStatus: summary.currentActor?.participantStatus ?? null, detail: { status: 'loading' },
    });
    try {
      const data = await loadDetailData(summary.agreementId);
      update({ detail: { status: 'ready', data } });
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

    /**
     * Re-reads the Hub summary of the selected Agreement (status, next actions, whole-Agreement completion) WITHOUT tearing the view down.
     * Used after an execution action so completion is SecurePay's fresh answer, never a local conclusion. A failure keeps what is shown.
     */
    async refreshSummary() {
      const agreementId = state.selectedAgreementId;
      if (!agreementId) return;
      try {
        const found = findInHub(await gateway.hub(), agreementId);
        if (found && state.selectedAgreementId === agreementId) update({
          selectedStatus: boltAgreementStatus(found.summary, found.origin),
          selectedCompletion: { completed: !!found.summary.completion?.completed, completedAt: found.summary.completion?.completedAt ?? null },
          selectedCompletionFacts: found.summary.completion ?? null, selectedAgreementNextActions: found.summary.nextActions,
        });
      } catch { /* the previous summary stays on screen */ }
    },

    /** Re-reads Detail WITHOUT the loading state (so an open Invite panel isn't torn down) -- used after invite/propose. */
    async reloadDetailQuietly() {
      if (!state.selectedAgreementId) return;
      try { update({ detail: { status: 'ready', data: await loadDetailData(state.selectedAgreementId) } }); } catch { /* the current view stays; a refresh can be requested */ }
    },

    /** Re-reads the same selected Agreement's Detail projection fresh (e.g. after a changed-version notice). */
    async refreshDetail() {
      if (!state.selectedAgreementId) return;
      const id = state.selectedAgreementId;
      update({ detail: { status: 'loading' } });
      try {
        const data = await loadDetailData(id);
        update({ detail: { status: 'ready', data } });
      } catch (error) {
        update({ detail: { status: 'error', error: asApiError(error) } });
      }
    },

    /**
     * Personal, organizational-only tags -- never alters Agreement authority/state. Re-reads the
     * caller's own tags for this Agreement fresh after a mutation rather than optimistically
     * appending, since the backend (not this client) owns tag identity/dedupe.
     */
    async addTag(label: string) {
      if (state.detail.status !== 'ready' || !state.selectedAgreementId) return;
      const agreementId = state.selectedAgreementId;
      try {
        await gateway.tagAgreement(agreementId, label);
        const tags = await bestEffort(() => gateway.tagsForAgreement(agreementId), state.detail.data.tags);
        if (state.detail.status === 'ready') update({ detail: { status: 'ready', data: { ...state.detail.data, tags } } });
      } catch { /* Tags are organizational only -- a failed tag write never blocks or corrupts Agreement state. */ }
    },
    async removeTag(tagId: string) {
      if (state.detail.status !== 'ready' || !state.selectedAgreementId) return;
      const agreementId = state.selectedAgreementId;
      try {
        await gateway.untagAgreement(agreementId, tagId);
        const tags = await bestEffort(() => gateway.tagsForAgreement(agreementId), state.detail.data.tags);
        if (state.detail.status === 'ready') update({ detail: { status: 'ready', data: { ...state.detail.data, tags } } });
      } catch { /* same as addTag -- organizational only, never blocks Agreement state. */ }
    },

    backToHome() { update({ view: 'home', selectedAgreementId: null, selectedStatus: null, selectedCompletion: null, selectedCompletionFacts: null, selectedAgreementNextActions: [], selectedActorStatus: null, detail: { status: 'idle' } }); },
    backToHub() { update({ view: 'hub', selectedAgreementId: null, selectedStatus: null, selectedCompletion: null, selectedCompletionFacts: null, selectedAgreementNextActions: [], selectedActorStatus: null, detail: { status: 'idle' } }); },

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
