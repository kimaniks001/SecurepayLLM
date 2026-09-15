import type {
  AgreementConfirmationStatusResponse, AgreementDetailResponse, AgreementMoneyRecordResponse,
  CurrentUserActionResponse, CurrentUserAgreementSummaryResponse,
} from '../../api/securepay/agreements/dto';
import type { HubDto } from '../../api/securepay/agreements';
import { moneyHandoffView } from '../../api/securepay/money/adapters';
import type {
  AgreementAction, AgreementChangeEntry, AgreementDetail as AgreementDetailType, AgreementDocument,
  AgreementPerson, AgreementStatus, AgreementSummary, AgreementVersion, AttentionItem, Milestone,
  MilestoneStatus, MoneyDetail, ParticipantNextAction, PaymentReadinessStatus, WaitingItem,
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
/** Turns a real backend code (actionCode, status, gateCode…) into readable text — never invents a code. */
function humanizeCode(code: string): string {
  return code.toLowerCase().split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Hub bucket / Home-list → locked Bolt AgreementStatus ───────────────────

export type HubBucketKey = 'needsMe' | 'waitingOnOthers' | 'takingShape' | 'active' | 'changedReviewRequired' | 'completed' | 'cancelled' | 'expired';

const hubBucketOrder: HubBucketKey[] = ['needsMe', 'waitingOnOthers', 'changedReviewRequired', 'takingShape', 'active', 'completed', 'cancelled', 'expired'];

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

/** Where a known-status classification for this Agreement came from — always a real backend signal, never a locally recomputed lifecycle. */
export type StatusOrigin = { kind: 'hub'; bucket: HubBucketKey } | { kind: 'home-attention' } | { kind: 'home-waiting' };

/**
 * The only status-classification logic on the frontend. It never reclassifies bucket membership —
 * `CANCELLED`/`EXPIRED`/`completion.completed` are read straight off the real summary (the same fields
 * the backend's own AgreementHubBucketClassifier checks first); everything else is exactly the bucket
 * the backend already put this Agreement in (or, from Home's plainer two-list contract, exactly which
 * of those two lists surfaced it).
 */
export function boltAgreementStatus(summary: CurrentUserAgreementSummaryResponse, origin: StatusOrigin): AgreementStatus {
  if (summary.status === 'CANCELLED') return 'cancelled';
  if (summary.status === 'EXPIRED') return 'expired';
  if (summary.completion?.completed) return 'completed';
  if (origin.kind === 'hub') return hubBucketStatus[origin.bucket];
  return origin.kind === 'home-attention' ? 'waiting_for_me' : 'waiting_for_other';
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
  for (const bucket of hubBucketOrder) {
    const match = hub[bucket].find(item => item.agreementId === agreementId);
    if (match) return { summary: match, origin: { kind: 'hub', bucket } };
  }
  return null;
}

// ─── Signed-in Home: real /me/actions + /me/agreements only ─────────────────

/** One attention item per real current-user next action. No dispute-specific kind is invented for codes this slice never reads. */
export function attentionItemsView(actions: CurrentUserActionResponse[]): AttentionItem[] {
  return actions.map(action => ({
    id: `${action.agreementId}:${action.actionCode}`,
    kind: 'agreement_action' as const,
    title: action.agreementTitle,
    detail: action.reason || humanizeCode(action.actionCode),
    actionLabel: humanizeCode(action.actionCode),
    actionValue: action.actionCode,
    agreementId: action.agreementId,
  }));
}

/** An agreement is "waiting on others" only by real absence of any current-user action — never a re-derived lifecycle guess. */
export function waitingItemsView(agreements: CurrentUserAgreementSummaryResponse[], actions: CurrentUserActionResponse[]): WaitingItem[] {
  const withAction = new Set(actions.map(action => action.agreementId));
  return agreements
    .filter(a => !withAction.has(a.agreementId) && !a.completion?.completed && a.status !== 'CANCELLED' && a.status !== 'EXPIRED')
    .map(a => ({
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
  COMPLETED: 'complete', OVERDUE: 'overdue', CANCELLED: 'blocked',
};
function boltMilestoneStatus(status: string): MilestoneStatus { return milestoneStatusMap[status] ?? 'not_started'; }

function obligationsFor(termIds: string[], terms: AgreementDetailResponse['terms']) {
  return terms.filter(t => termIds.includes(t.obligationId)).map(t => ({
    id: t.obligationId,
    // No responsible-party identity exists on AgreementTermResponse; left blank rather than guessed.
    responsibleParty: '',
    action: t.title,
    status: 'upcoming' as const,
  }));
}

export function agreementProgressView(dto: AgreementDetailResponse): { milestones: Milestone[]; isSimple: boolean; rootMilestone: Milestone; actions: AgreementAction[] } {
  const isSimple = dto.milestones.length === 0;
  const milestones: Milestone[] = dto.milestones.map(m => ({
    id: m.milestoneId,
    title: m.title,
    status: boltMilestoneStatus(m.status),
    work: m.description ? [m.description] : [],
    obligations: obligationsFor(m.obligationIds, dto.terms),
    target: m.dueAt ? formatShortDate(m.dueAt) : undefined,
  }));
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
