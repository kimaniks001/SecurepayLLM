import type { AgreementGateway, AgreementAmendmentDto, AmendmentDiffDto, AmendmentDecisionDto, AmendmentOverviewDto } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/** Statuses in which SecurePay lets an Agreement's amendments be read or acted on (`AgreementStatus.allowsAmendments`). */
export const AMENDABLE_STATUSES = ['PARTICIPANTS_JOINING', 'CONFIRMATION_PENDING'] as const;
export const isAmendable = (status: string) => (AMENDABLE_STATUSES as readonly string[]).includes(status);

export type AmendmentAction = 'accept' | 'reject' | 'withdraw';
export type ListState = { status: 'idle' } | { status: 'loading' } | { status: 'unavailable'; agreementStatus: string } | { status: 'error' } | { status: 'ready'; items: AgreementAmendmentDto[] };
export type DiffState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; diff: AmendmentDiffDto };
export type OverviewState = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; overview: AmendmentOverviewDto };
/** `action` records WHICH operation a notice is about, so recovery is always that operation's own (never another's). */
export interface Notice { kind: 'done' | 'info' | 'uncertain' | 'error'; text: string; action?: AmendmentAction }
export interface AmendmentsState {
  /** The raw amendment list + structured diffs: used by the reconfirmation panel to explain the version it asks about. */
  list: ListState;
  diffs: Record<string, DiffState>;
  /** Phase 7 Slice 5: SecurePay's participant-safe overview (who proposed, who must respond, before/after, live-work effect). */
  overview: OverviewState;
  busy: { id: string; action: AmendmentAction } | null;
  notices: Record<string, Notice>;
  /** Set only from a version SecurePay created (the final acceptance's response) or its own history. */
  applied: { amendmentId: string; versionNumber: number } | null;
}
const initial: AmendmentsState = { list: { status: 'idle' }, diffs: {}, overview: { status: 'idle' }, busy: null, notices: {}, applied: null };

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may already have recorded it. */
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';
const OUTCOME: Record<AmendmentAction, string> = { accept: 'APPLIED', reject: 'REJECTED', withdraw: 'WITHDRAWN' };
const VERB: Record<AmendmentAction, string> = { accept: 'accepting', reject: 'rejecting', withdraw: 'withdrawing' };

type Gateway = Pick<AgreementGateway, 'amendments' | 'amendmentDiff' | 'amendmentOverview' | 'acceptAmendment' | 'rejectAmendment' | 'withdrawAmendment'>;

/**
 * Phase 7 Slice 5 -- a proposed change is decided by people, never by this screen:
 *   accept   = this participant agrees; when every other participant has agreed, SecurePay creates a NEW current version
 *              (the earlier one stays as history) and asks everyone to confirm it again when the change is material;
 *   reject   = this participant declines; the proposal closes and the Agreement is untouched;
 *   withdraw = the proposer takes it back; the Agreement is untouched.
 * Each response is bound to the exact current version it was made against and to one idempotency key; the key and the
 * version stay pinned until SecurePay gives a definite answer, so an uncertain retry can never become a second response.
 * Outcomes are claimed only from what SecurePay returns or, when a call is uncertain, from re-reading its overview.
 */
export function createAmendmentsController(gateway: Gateway, agreementId: string, onAgreementChanged: () => void | Promise<void> = () => {}, id = () => crypto.randomUUID()) {
  let state: AmendmentsState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<AmendmentsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const notice = (amendmentId: string, n: Notice | null) => { const next = { ...state.notices }; if (n) next[amendmentId] = n; else delete next[amendmentId]; update({ notices: next }); };
  /** One (key, expected version) per amendment+action until SecurePay settles it. */
  const pinned = new Map<string, { key: string; expected: string }>();
  const pinOf = (amendmentId: string, action: AmendmentAction) => `${amendmentId}:${action}`;
  let inflight: Promise<void> | null = null;

  async function readList(): Promise<AgreementAmendmentDto[] | null> {
    try { const items = await gateway.amendments(agreementId); update({ list: { status: 'ready', items } }); return items; }
    catch { update({ list: { status: 'error' } }); return null; }
  }
  async function readOverview(): Promise<AmendmentOverviewDto | null> {
    try { const overview = await gateway.amendmentOverview(agreementId); update({ overview: { status: 'ready', overview } }); return overview; }
    catch { update({ overview: { status: 'error' } }); return null; }
  }

  const doneText = (action: AmendmentAction, versionNumber: number | null) =>
    action === 'accept' ? (versionNumber != null ? `Everyone has agreed. The Agreement is now at version ${versionNumber}; the earlier version stays in its history.` : 'Everyone has agreed. SecurePay created a new version; the earlier version stays in its history.')
      : action === 'reject' ? 'You rejected this proposed change. The current Agreement stays as it is.'
        : 'This proposal was withdrawn. The current Agreement stays as it is.';

  /** A definite answer from SecurePay: release the pin and say exactly what the returned status proves. */
  function settleDecision(amendmentId: string, action: AmendmentAction, result: AmendmentDecisionDto, overview: AmendmentOverviewDto | null) {
    pinned.delete(pinOf(amendmentId, action));
    if (result.status === OUTCOME[action]) {
      const versionNumber = result.resultingVersionNumber ?? overview?.history.find(h => h.amendmentId === amendmentId)?.resultingVersionNumber ?? null;
      if (action === 'accept' && versionNumber != null) update({ applied: { amendmentId, versionNumber } });
      notice(amendmentId, { kind: 'done', text: doneText(action, versionNumber) });
    } else if (action === 'accept' && result.status === 'PROPOSED') {
      notice(amendmentId, { kind: 'done', text: 'Your acceptance is recorded. The change takes effect only when everyone else has agreed too; until then the current Agreement stays as it is.' });
    } else {
      notice(amendmentId, { kind: 'info', text: `Nothing was changed: this proposal is already ${result.status.toLowerCase()}.` });
    }
  }

  /** After an uncertain call: settle ONLY from SecurePay's overview. Still open and undecided = it did not happen (yet). */
  function settleFromOverview(amendmentId: string, action: AmendmentAction, overview: AmendmentOverviewDto | null) {
    if (!overview) { notice(amendmentId, { kind: 'uncertain', action, text: `${UNCERTAIN} SecurePay couldn’t be reached to check.` }); return; }
    const open = overview.open?.amendmentId === amendmentId ? overview.open : null;
    const past = overview.history.find(h => h.amendmentId === amendmentId);
    if (open && action === 'accept' && open.responders.some(r => r.isCaller && r.decision === 'ACCEPTED')) {
      settleDecision(amendmentId, action, { amendmentId, status: 'PROPOSED', resultingVersionId: null, resultingVersionNumber: null, replayed: true }, overview);
    } else if (past) {
      settleDecision(amendmentId, action, { amendmentId, status: past.outcome, resultingVersionId: null, resultingVersionNumber: past.resultingVersionNumber, replayed: true }, overview);
    } else if (open) {
      notice(amendmentId, { kind: 'uncertain', action, text: `${UNCERTAIN} SecurePay still shows this change as waiting, so your response isn’t recorded yet. You can try ${VERB[action]} again — it sends the same request, so it can’t count twice.` });
    } else {
      notice(amendmentId, { kind: 'uncertain', action, text: `${UNCERTAIN} SecurePay doesn’t show this proposal any more.` });
    }
  }

  async function respond(amendmentId: string, action: AmendmentAction) {
    if (state.busy) return;
    const current = state.overview.status === 'ready' ? state.overview.overview.currentVersionId : null;
    const pin = pinned.get(pinOf(amendmentId, action)) ?? (current ? { key: id(), expected: current } : null);
    if (!pin) { notice(amendmentId, { kind: 'error', text: 'SecurePay’s current version isn’t loaded, so nothing was sent. Try again in a moment.' }); return; }
    pinned.set(pinOf(amendmentId, action), pin);
    update({ busy: { id: amendmentId, action } }); notice(amendmentId, null);
    const body = { idempotencyKey: pin.key, expectedAgreementVersionId: pin.expected };
    try {
      const result = await (action === 'accept' ? gateway.acceptAmendment(agreementId, amendmentId, body)
        : action === 'reject' ? gateway.rejectAmendment(agreementId, amendmentId, body) : gateway.withdrawAmendment(agreementId, amendmentId, body));
      update({ busy: null });
      const overview = await readOverview();
      settleDecision(amendmentId, action, result, overview);
      if (result.status === 'APPLIED') await onAgreementChanged();
    } catch (error) {
      update({ busy: null });
      if (isUncertain(error)) { settleFromOverview(amendmentId, action, await readOverview()); return; }
      pinned.delete(pinOf(amendmentId, action));
      if (error instanceof ApiError && error.status === 401) notice(amendmentId, { kind: 'error', text: 'Your session ended before SecurePay could act on this. Nothing was changed. Sign in again, then try again.' });
      else if (error instanceof ApiError && error.status === 403) notice(amendmentId, { kind: 'error', text: action === 'withdraw' ? 'Only the person who proposed this change can withdraw it. Nothing was changed.' : 'SecurePay didn’t let this account respond to this change. Nothing was changed.' });
      else if (error instanceof ApiError && error.status === 409) {
        // The Agreement (or this proposal) moved: re-read everything so the person sees SecurePay's current truth first.
        await onAgreementChanged(); await readOverview();
        notice(amendmentId, { kind: 'error', text: 'The Agreement changed since you last looked, so SecurePay didn’t record that. Nothing was changed. Look at the current version and the change again before responding.' });
      } else {
        const overview = await readOverview();
        const past = overview?.history.find(h => h.amendmentId === amendmentId);
        if (past) notice(amendmentId, { kind: 'info', text: `Nothing was changed by that attempt: this proposal is ${past.outcome.toLowerCase()}.` });
        else notice(amendmentId, { kind: 'error', text: 'SecurePay couldn’t do that. Nothing was changed.' });
      }
    }
  }

  return {
    getSnapshot: (): AmendmentsState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** The raw list can only be read while the Agreement allows amendments; otherwise nothing is called and nothing is claimed. */
    load(agreementStatus: string, options: { force?: boolean } = {}): Promise<void> {
      // Desktop and mobile both mount the panel at once: share one in-flight read. A later mount reads again (fresh truth).
      if (inflight && !options.force) return inflight;
      inflight = (async () => {
        if (!isAmendable(agreementStatus)) { update({ list: { status: 'unavailable', agreementStatus } }); return; }
        update({ list: { status: 'loading' } });
        await readList();
      })().finally(() => { inflight = null; });
      return inflight;
    },

    /** The overview is readable whatever the Agreement's status (it says itself whether a change can be proposed). */
    async loadOverview() {
      if (state.overview.status !== 'ready') update({ overview: { status: 'loading' } });
      await readOverview();
    },

    async loadDiff(amendmentId: string) {
      if (state.diffs[amendmentId]) return;
      update({ diffs: { ...state.diffs, [amendmentId]: { status: 'loading' } } });
      try { update({ diffs: { ...state.diffs, [amendmentId]: { status: 'ready', diff: await gateway.amendmentDiff(agreementId, amendmentId) } } }); }
      catch { update({ diffs: { ...state.diffs, [amendmentId]: { status: 'error' } } }); }
    },

    accept: (amendmentId: string) => respond(amendmentId, 'accept'),
    reject: (amendmentId: string) => respond(amendmentId, 'reject'),
    withdraw: (amendmentId: string) => respond(amendmentId, 'withdraw'),
    /** After an uncertain response: re-read and settle from SecurePay's own overview, for THAT action only. */
    async check(amendmentId: string, action: AmendmentAction) {
      if (state.busy) return;
      settleFromOverview(amendmentId, action, await readOverview());
    },
    reset() { pinned.clear(); inflight = null; update({ ...initial }); },
  };
}
export type AmendmentsController = ReturnType<typeof createAmendmentsController>;
