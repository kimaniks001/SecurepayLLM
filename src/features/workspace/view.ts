import type {
  AgreementConfirmationStatusResponse, AgreementDetailResponse, AgreementMoneyByCurrencyResponse,
  AgreementMoneyRecordResponse, AgreementProblemSummaryResponse, CurrentUserAgreementSummaryResponse,
  MilestoneEffectiveStateResponse, RecentActivityEntryResponse,
} from '../../api/securepay/agreements/dto';
import type { HubDto } from '../../api/securepay/agreements';
import { moneyHandoffView } from '../../api/securepay/money/adapters';
import type {
  ActivityEntry, AgreementAction, AgreementChangeEntry, AgreementDetail as AgreementDetailType,
  AgreementDocument, AgreementPerson, AgreementStatus, AgreementSummary, AgreementVersion,
  AttentionItem, Milestone, MilestoneStatus, MoneyByCurrencyItem, MoneyDetail, ParticipantNextAction,
  PaymentReadinessStatus, ProblemItem, WaitingItem,
} from '../../types';

// ─── Shared formatting — real data only, never fabricated ───────────────────

function formatMoney(currency: string | null | undefined, amountMinor: string | number | null | undefined): string {
  if (amountMinor == null || currency == null) return 'Not yet specified';
  const minor = typeof amountMinor === 'string' ? Number(amountMinor) : amountMinor;
  if (!Number.isFinite(minor)) return 'Not yet specified';
  const major = (minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${major}`;
}
function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
/** Real elapsed time since a real backend timestamp — never a fabricated/placeholder value. */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso).getTime();
  if (Number.isNaN(parsed)) return '';
  const diffMs = Date.now() - parsed;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(iso);
}
/** Turns a real backend code (actionCode, status, gateCode…) into readable text — never invents a code. */
function humanizeCode(code: string): string {
  return code.toLowerCase().split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Hub bucket / Home-list → locked Bolt AgreementStatus ───────────────────

export type HubBucketKey = 'needsMe' | 'waitingOnOthers' | 'takingShape' | 'active' | 'changedReviewRequired' | 'completed' | 'cancelled' | 'expired';

const hubBucketOrder: HubBucketKey[] = ['needsMe', 'waitingOnOthers', 'changedReviewRequired', 'takingShape', 'active', 'completed', 'cancelled', 'expired'];

/**
 * Lookup priority for `findInHub` only, when the same Agreement id is unexpectedly present in more
 * than one bucket (malformed backend data — buckets are meant to be mutually exclusive).
 * `changedReviewRequired` must win over `needsMe`, matching the same priority
 * `attentionItemsFromHub` already applies on Home; this keeps that priority consistent between what
 * Home displays and what opening the item actually resolves to. Unrelated to `hubBucketOrder`'s Hub
 * page display order, which this does not change.
 */
const hubLookupOrder: HubBucketKey[] = ['changedReviewRequired', 'needsMe', 'waitingOnOthers', 'takingShape', 'active', 'completed', 'cancelled', 'expired'];

const hubBucketStatus: Record<HubBucketKey, AgreementStatus> = {
  needsMe: 'waiting_for_me', waitingOnOthers: 'waiting_for_other', takingShape: 'taking_shape',
  active: 'active', changedReviewRequired: 'change_requested', completed: 'completed',
  cancelled: 'cancelled', expired: 'expired',
};

const statusLabelText: Record<AgreementStatus, string> = {
  taking_shape: 'Taking shape', ready_for_review: 'Ready for review', waiting_for_me: 'Waiting for you',
  waiting_for_other: 'Waiting on others', active: 'Active', change_requested: 'Change requested',
  completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired',
};

/** Where a known-status classification for this Agreement came from — always a real backend signal, never a locally recomputed lifecycle. Signed-in Home and the Agreement Hub share the same Hub-bucket origin: Home is not a separate classification. */
export type StatusOrigin = { kind: 'hub'; bucket: HubBucketKey };

/**
 * The only status-classification logic on the frontend. It never reclassifies bucket membership —
 * `CANCELLED`/`EXPIRED`/`completion.completed` are read straight off the real summary (the same fields
 * the backend's own AgreementHubBucketClassifier checks first); everything else is exactly the bucket
 * the backend already put this Agreement in.
 */
export function boltAgreementStatus(summary: CurrentUserAgreementSummaryResponse, origin: StatusOrigin): AgreementStatus {
  if (summary.status === 'CANCELLED') return 'cancelled';
  if (summary.status === 'EXPIRED') return 'expired';
  if (summary.completion?.completed) return 'completed';
  return hubBucketStatus[origin.bucket];
}

export function agreementSummaryView(dto: CurrentUserAgreementSummaryResponse, origin: StatusOrigin): AgreementSummary {
  const status = boltAgreementStatus(dto, origin);
  const primaryAction = dto.nextActions[0];
  return {
    id: dto.agreementId,
    title: dto.title,
    counterparty: dto.counterparty?.displayName ?? 'Not yet joined',
    // Backend's SafeCounterpartyResponse carries no role for the counterparty (only this caller's own
    // currentActor.roleCode) — left unavailable rather than mislabeling the caller's own role.
    counterpartyRole: '—',
    amount: formatMoney(dto.currency, dto.proposedAmountMinor),
    completion: '—',
    status,
    statusLabel: statusLabelText[status],
    nextAction: primaryAction ? (primaryAction.reason || humanizeCode(primaryAction.actionCode)) : '—',
    lastActivity: formatShortDate(dto.updatedAt),
    lastActivityTime: formatTime(dto.updatedAt),
    version: '—',
  };
}

/** Flattens the backend's own 8 Hub buckets into one list, tagging each item's real bucket of origin. */
export function hubAgreementSummaries(hub: HubDto): AgreementSummary[] {
  return hubBucketOrder.flatMap(bucket => hub[bucket].map(item => agreementSummaryView(item, { kind: 'hub', bucket })));
}

/** Finds the exact CurrentUserAgreementSummaryResponse + real bucket an id came from, for Detail's carried-forward status. */
export function findInHub(hub: HubDto, agreementId: string): { summary: CurrentUserAgreementSummaryResponse; origin: StatusOrigin } | null {
  for (const bucket of hubLookupOrder) {
    const match = hub[bucket].find(item => item.agreementId === agreementId);
    if (match) return { summary: match, origin: { kind: 'hub', bucket } };
  }
  return null;
}

// ─── Signed-in Home: sourced only from the backend's own Hub buckets ────────
//
// Home renders the SAME authoritative classification as the Agreement Hub — never a local
// re-derivation from whether an action happens to be present. In particular, a real Agreement can
// carry a next action that is purely a passive wait (`NO_ACTION_REQUIRED`, `WAIT_FOR_DEPENDENCY`,
// `WAIT_UNTIL_AVAILABLE`); the backend's own AgreementHubBucketClassifier excludes those from NEEDS_ME,
// so this file must too.

const passiveActionCodes = new Set(['NO_ACTION_REQUIRED', 'WAIT_FOR_DEPENDENCY', 'WAIT_UNTIL_AVAILABLE']);
const RECONFIRM_ACTION_CODE = 'RECONFIRM_AGREEMENT_VERSION';

/**
 * Home's "Needs you" surface is composed from TWO distinct, mutually exclusive backend buckets —
 * `changedReviewRequired` and `needsMe` — because the backend's own AgreementHubBucketClassifier
 * checks `RECONFIRM_AGREEMENT_VERSION` (→ CHANGED_REVIEW_REQUIRED) *before* general NEEDS_ME, so an
 * Agreement needing this person's reconfirmation is never in `needsMe` at all. Each Agreement stays
 * tagged with its own real bucket — a changed-review item never becomes a generic `agreement_action`
 * item, and is never duplicated if malformed backend data placed the same Agreement in both buckets
 * (the `changedReviewRequired` classification wins; `needsMe` is skipped for that Agreement).
 */
export function attentionItemsFromHub(changedReviewRequired: CurrentUserAgreementSummaryResponse[], needsMe: CurrentUserAgreementSummaryResponse[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  const seenAgreementIds = new Set<string>();

  for (const agreement of changedReviewRequired) {
    if (seenAgreementIds.has(agreement.agreementId)) continue;
    seenAgreementIds.add(agreement.agreementId);
    // The bucket's own real backend classification is the authority for WHICH Agreement needs review;
    // the item's action/reason text still comes only from that Agreement's own real
    // RECONFIRM_AGREEMENT_VERSION next action. If bucket membership and the summary's own nextActions
    // ever drift (a malformed/inconsistent backend response), never synthesize a fabricated
    // actionCode/reason to paper over it — there is no existing non-actionable presentation for a
    // single Home attention item to fall back to without inventing one, so this Agreement is simply
    // omitted from Home's "Needs you" list rather than shown with invented text. It remains visible,
    // correctly bucketed, on the Agreement Hub page, and still resolves to `change_requested` if opened.
    const reconfirm = agreement.nextActions.find(a => a.actionCode === RECONFIRM_ACTION_CODE);
    if (!reconfirm) continue;
    items.push({
      id: `${agreement.agreementId}:${reconfirm.actionCode}`,
      kind: 'agreement_changed' as const,
      title: agreement.title,
      detail: reconfirm.reason || humanizeCode(reconfirm.actionCode),
      actionLabel: humanizeCode(reconfirm.actionCode),
      actionValue: reconfirm.actionCode,
      agreementId: agreement.agreementId,
    });
  }

  for (const agreement of needsMe) {
    // This Agreement's real bucket is changedReviewRequired, not needsMe — skip rather than duplicate.
    if (seenAgreementIds.has(agreement.agreementId)) continue;
    seenAgreementIds.add(agreement.agreementId);
    for (const action of agreement.nextActions) {
      if (passiveActionCodes.has(action.actionCode)) continue;
      items.push({
        id: `${agreement.agreementId}:${action.actionCode}`,
        kind: 'agreement_action' as const,
        title: agreement.title,
        detail: action.reason || humanizeCode(action.actionCode),
        actionLabel: humanizeCode(action.actionCode),
        actionValue: action.actionCode,
        agreementId: agreement.agreementId,
      });
    }
  }

  return items;
}

/** Sourced only from the backend's own WAITING_ON_OTHERS bucket — never re-derived from action absence. */
export function waitingItemsFromHub(waitingOnOthers: CurrentUserAgreementSummaryResponse[]): WaitingItem[] {
  return waitingOnOthers.map(a => ({
    id: a.agreementId,
    title: a.title,
    detail: a.counterparty?.displayName ? `With ${a.counterparty.displayName}` : a.purpose,
    statusText: humanizeCode(a.status),
    agreementId: a.agreementId,
  }));
}

// ─── Agreement Detail ─────────────────────────────────────────────────────

function displayNameForParticipant(participantId: string, participants: AgreementDetailResponse['participants']): string {
  const match = participants.find(p => p.participantId === participantId);
  return match?.displayName || match?.ksNumber || 'A participant';
}

function participantConfirmationStatus(
  p: AgreementDetailResponse['participants'][number],
  confirmations: AgreementConfirmationStatusResponse[],
): AgreementPerson['confirmationStatus'] {
  const match = confirmations.find(c => c.participantId === p.participantId);
  if (match) {
    if (match.confirmationCurrent) return 'confirmed_current';
    return match.confirmedVersionId ? 'joined_not_confirmed' : 'not_joined';
  }
  if (p.participantStatus === 'CONFIRMED') return 'confirmed_current';
  if (p.participantStatus === 'JOINED_UNCONFIRMED' || p.participantStatus === 'CREATOR') return 'joined_not_confirmed';
  return 'not_joined';
}

export interface DetailCompletion { completed: boolean; completedAt: string | null }

/**
 * Composes the locked AgreementDetail fixture shape from the real Detail projection. `status` and
 * `completion` are carried forward from the Hub/Home summary the caller navigated from — the Detail
 * projection itself does not repeat completion truth, and status here is never recomputed, only
 * relayed (see boltAgreementStatus).
 */
export function agreementDetailView(
  dto: AgreementDetailResponse,
  confirmations: AgreementConfirmationStatusResponse[],
  status: AgreementStatus,
  completion: DetailCompletion,
): AgreementDetailType {
  const people: AgreementPerson[] = dto.participants.map(p => ({
    name: p.displayName || p.ksNumber || 'Participant',
    role: p.roleCode,
    confirmationStatus: participantConfirmationStatus(p, confirmations),
  }));
  const documents: AgreementDocument[] = dto.documents.map(d => ({
    id: d.evidenceId,
    filename: d.originalFilename || d.description || 'Document',
    type: d.contentType || 'File',
    source: humanizeCode(d.status),
    date: formatShortDate(d.submittedAt),
  }));
  const activity = dto.activity.map(a => ({ date: formatShortDate(a.occurredAt), text: humanizeCode(a.activityType) }));
  const versions: AgreementVersion[] = dto.versionHistory.map(v => {
    const isCurrent = dto.currentVersion?.versionId === v.versionId;
    return {
      version: `v${v.versionNumber}`,
      // Confirmation-status only tracks each participant's standing against the CURRENT version, so a
      // superseded version's confirmers are not knowable from this projection — left empty, not guessed.
      confirmedBy: isCurrent ? confirmations.filter(c => c.confirmationCurrent).map(c => displayNameForParticipant(c.participantId, dto.participants)) : [],
      isCurrent,
    };
  });
  const dueDates = dto.milestones.map(m => m.dueAt).filter((d): d is string => !!d);
  const latestDue = dueDates.length ? dueDates.reduce((a, b) => (a > b ? a : b)) : null;
  const changes: AgreementChangeEntry[] = []; // Amendment diff (PR #202) is not a verified contract in this slice.

  return {
    id: dto.overview.agreementId,
    title: dto.overview.title,
    status,
    statusLabel: statusLabelText[status],
    version: dto.currentVersion ? `v${dto.currentVersion.versionNumber}` : '—',
    people,
    work: dto.terms.map(t => t.title),
    price: formatMoney(dto.overview.currency, dto.overview.proposedAmountMinor),
    materials: '—',
    completion: latestDue ? formatShortDate(latestDue) : '—',
    conditions: [],
    documents,
    activity,
    changes,
    versions,
    amount: formatMoney(dto.overview.currency, dto.overview.proposedAmountMinor),
    cancelledReason: undefined,
    cancelledBy: status === 'cancelled' ? '—' : undefined,
    cancelledDate: status === 'cancelled' ? formatShortDate(dto.overview.updatedAt) : undefined,
    expiredReason: undefined,
    completedDate: completion.completed ? formatShortDate(completion.completedAt) : undefined,
  };
}

// ─── Progress tab (milestones/obligations) ───────────────────────────────

const milestoneStatusMap: Record<string, MilestoneStatus> = {
  PENDING: 'not_started', AVAILABLE: 'not_started', IN_PROGRESS: 'in_progress',
  COMPLETED: 'complete', OVERDUE: 'overdue', CANCELLED: 'cancelled',
};
function boltMilestoneStatus(status: string): MilestoneStatus { return milestoneStatusMap[status] ?? 'not_started'; }

/**
 * Phase 3 doctrine: milestones are independent unless the Agreement explicitly declares a
 * dependency. The stored `status` above never distinguishes "waiting on an explicit dependency"
 * from "not yet started" -- only the backend's live MilestoneEffectiveStateResponse can, so it
 * always wins over the stored-status guess when present, and is the ONLY source of `waitingReason`.
 */
const effectiveStateMap: Record<MilestoneEffectiveStateResponse['state'], MilestoneStatus | null> = {
  READY: null, // defer to stored status (not_started/in_progress) -- READY does not itself imply "not started".
  IN_PROGRESS: 'in_progress',
  WAITING: 'blocked',
  BLOCKED: 'blocked',
  COMPLETED: 'complete',
  CANCELLED: 'cancelled',
};

function obligationsFor(termIds: string[], terms: AgreementDetailResponse['terms']) {
  return terms.filter(t => termIds.includes(t.obligationId)).map(t => ({
    id: t.obligationId,
    // No responsible-party identity exists on AgreementTermResponse; left blank rather than guessed.
    responsibleParty: '',
    action: t.title,
    status: 'upcoming' as const,
  }));
}

export function agreementProgressView(
  dto: AgreementDetailResponse,
  effectiveStates: MilestoneEffectiveStateResponse[] = [],
): { milestones: Milestone[]; isSimple: boolean; rootMilestone: Milestone; actions: AgreementAction[] } {
  const isSimple = dto.milestones.length === 0;
  const effectiveById = new Map(effectiveStates.map(s => [s.milestoneId, s]));
  const milestones: Milestone[] = dto.milestones.map(m => {
    const effective = effectiveById.get(m.milestoneId);
    const overrideStatus = effective ? effectiveStateMap[effective.state] : null;
    return {
      id: m.milestoneId,
      title: m.title,
      status: overrideStatus ?? boltMilestoneStatus(m.status),
      work: m.description ? [m.description] : [],
      obligations: obligationsFor(m.obligationIds, dto.terms),
      target: m.dueAt ? formatShortDate(m.dueAt) : undefined,
      waitingReason: effective?.state === 'WAITING' ? (effective.reason ?? undefined) : undefined,
    };
  });
  const rootStatus: MilestoneStatus = dto.terms.length === 0 ? 'not_started'
    : dto.terms.every(t => t.status === 'COMPLETED') ? 'complete'
    : dto.terms.some(t => t.status === 'OVERDUE') ? 'overdue'
    : dto.terms.some(t => t.status === 'IN_PROGRESS' || t.status === 'EVIDENCE_SUBMITTED') ? 'in_progress'
    : 'not_started';
  const rootMilestone: Milestone = milestones[0] ?? {
    id: 'root',
    title: dto.overview.title,
    status: rootStatus,
    work: dto.overview.description ? [dto.overview.description] : [],
    obligations: dto.terms.map(t => ({ id: t.obligationId, responsibleParty: '', action: t.title, status: 'upcoming' as const })),
  };
  // Real ActionType (respond_to_dispute_scope, contribute_funds, meet_in_person…) has no honest
  // one-to-one backend equivalent this slice; the authoritative next-action projection is already
  // surfaced via Needs-attention (Home) and Money's next-actions — this list stays truthfully empty.
  return { milestones, isSimple, rootMilestone, actions: [] };
}

// ─── Money ────────────────────────────────────────────────────────────────

export interface MoneyViewInput {
  agreementId: string;
  agreementTitle: string;
  agreementVersion: string;
  currency: string;
  amountMinor: string | number | null;
  counterpartyName?: string;
  /**
   * Exactly one of the 5 real backend readiness values — never the adapter's broader `Readiness` type,
   * which also carries `'UNKNOWN'` for a genuine backend/network failure. A real failure is rendered
   * entirely through `MoneyUnavailableState` by the caller instead of being threaded through this
   * fixture-shaped view, because the locked `PaymentReadinessStatus` union has no honest 6th value for
   * "backend error" and every one of its 5 real values would misrepresent one as evaluated fact.
   */
  readiness: PaymentReadinessStatus;
  outstandingReasons: { gateCode: string; reasonCode: string }[];
  moneyRecordCount: number;
  records: AgreementMoneyRecordResponse[];
  fundActionAvailable: boolean;
}

const readinessState = { READY: 'ready', NOT_READY: 'not_ready', PARTIALLY_READY: 'not_ready', BLOCKED: 'not_ready', NO_EVALUATION_YET: 'unknown' } as const;
const readinessStateLabel: Record<PaymentReadinessStatus, string> = {
  READY: 'Ready for payment', NOT_READY: 'Not ready for payment', PARTIALLY_READY: 'Partially ready for payment',
  BLOCKED: 'Blocked for payment', NO_EVALUATION_YET: 'No Payment Ready evaluation yet',
};

export function moneyDetailView(input: MoneyViewInput): MoneyDetail {
  const nextActions: ParticipantNextAction[] = input.fundActionAvailable ? ['FUND_AGREEMENT'] : [];
  return {
    id: input.agreementId,
    state: readinessState[input.readiness],
    stateLabel: readinessStateLabel[input.readiness],
    agreementLink: {
      agreementId: input.agreementId, agreementTitle: input.agreementTitle,
      agreementVersion: input.agreementVersion, amount: formatMoney(input.currency, input.amountMinor),
    },
    amount: formatMoney(input.currency, input.amountMinor),
    currency: input.currency,
    paymentReadiness: input.readiness,
    outstandingReasons: input.outstandingReasons.map(r => `${humanizeCode(r.gateCode)}: ${humanizeCode(r.reasonCode)}`),
    moneyRecordCount: input.moneyRecordCount,
    nextActions,
    availableRails: [],
    activity: input.records.map((r, i) => ({
      id: `${r.recordType}-${r.occurredAt}-${i}`,
      date: formatShortDate(r.occurredAt),
      text: `${humanizeCode(r.recordType)} — ${humanizeCode(r.status)}`,
      amount: formatMoney(r.currency, r.amountMinor),
      statusLabel: humanizeCode(r.status),
    })),
    capacity: 'personal',
    capacityLabel: 'Your SecurePay account',
    counterpartyName: input.counterpartyName,
    isDemoState: false,
  };
}

/** Detail's inline Money summary (Phase 8 AgreementMoneyHandoffResponse) reuses the same shared adapter Money's own read views already use. */
export const detailMoneyHandoffView = moneyHandoffView;

// ─── Phase 3 Living Agreements: KSCalendar ───────────────────────────────

export interface CalendarEventView {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  eventTypeLabel: string;
  isDerived: boolean;
  cancelled: boolean;
  sourceReference: string | null;
}

/**
 * Only ever-forward-looking, never-cancelled events — a cancelled or past event is not something to
 * warn about or act on here (the Activity trail is where history belongs, not the calendar).
 */
export function agreementCalendarView(events: import('../../api/securepay/agreements/dto').AgreementCalendarEventResponse[]): CalendarEventView[] {
  const now = Date.now();
  return events
    .filter(e => !e.cancelled && new Date(e.occursAt).getTime() >= now)
    .sort((a, b) => new Date(a.occursAt).getTime() - new Date(b.occursAt).getTime())
    .map(e => ({
      id: e.id,
      title: e.title,
      dateLabel: formatShortDate(e.occursAt),
      timeLabel: formatTime(e.occursAt),
      eventTypeLabel: humanizeCode(e.eventType),
      isDerived: e.source === 'DERIVED',
      cancelled: e.cancelled,
      sourceReference: e.sourceReference,
    }));
}

/**
 * Locked doctrine (section 8): warn scheduling conflicts clearly, never automatically block them,
 * unless an event is explicitly exclusive. UI language must distinguish a "possible conflict" from
 * an "Agreement condition cannot be satisfied."
 */
export function conflictSeverityLabel(severity: string): string {
  if (severity === 'EXPLICIT_EXCLUSIVITY_VIOLATION') return 'Agreement condition cannot be satisfied';
  if (severity === 'AGREEMENT_CONFLICT') return 'Possible conflict within this Agreement';
  return 'Possible conflict';
}

/** Home-scoped KSCalendar: each event resolved back to the exact Agreement it came from via the Hub. */
export function upcomingHomeEventsView(
  hub: HubDto,
  events: import('../../api/securepay/agreements/dto').AgreementCalendarEventResponse[],
): (CalendarEventView & { agreementId: string; agreementTitle: string })[] {
  return agreementCalendarView(events)
    .map(event => {
      const raw = events.find(e => e.id === event.id);
      const found = raw ? findInHub(hub, raw.agreementId) : null;
      return found ? { ...event, agreementId: raw!.agreementId, agreementTitle: found.summary.title } : null;
    })
    .filter((e): e is CalendarEventView & { agreementId: string; agreementTitle: string } => e !== null);
}

// ─── Agreements Home real data (Section 9) ──────────────────────────────────

/** Real cross-Agreement activity trail from GET /api/v1/me/agreements/home -- never fabricated. */
export function recentActivityView(entries: RecentActivityEntryResponse[]): ActivityEntry[] {
  return entries.map((entry, index) => ({
    id: `${entry.agreementId}-${index}`,
    text: `${humanizeCode(entry.activityType)} — ${entry.agreementTitle}`,
    time: formatRelativeTime(entry.occurredAt),
    agreementId: entry.agreementId,
  }));
}

/** Real, backend-authoritative open review/dispute state -- never inferred from Agreement age. */
export function problemsView(problems: AgreementProblemSummaryResponse[]): ProblemItem[] {
  return problems.map(problem => ({
    id: problem.reviewCaseId,
    title: problem.agreementTitle ?? 'An Agreement',
    detail: problem.responseDeadlineAt
      ? `Response due ${formatShortDate(problem.responseDeadlineAt)}`
      : problem.evidenceDeadlineAt
        ? `Evidence due ${formatShortDate(problem.evidenceDeadlineAt)}`
        : '',
    stateLabel: humanizeCode(problem.state),
    agreementId: problem.agreementId,
  }));
}

/** Locked doctrine: Money is always shown per currency, never summed across currencies. */
export function moneyByCurrencyView(entries: AgreementMoneyByCurrencyResponse[]): MoneyByCurrencyItem[] {
  return entries.map(entry => ({
    currency: entry.currency,
    remainingFundedLabel: formatMoney(entry.currency, entry.remainingFundedMinor),
    positionCount: entry.positionCount,
  }));
}
