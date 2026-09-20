import type { AgreementGateway, AgreementAmendmentDto, AmendmentDiffDto } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/** Statuses in which SecurePay lets an Agreement's amendments be read or acted on (`AgreementStatus.allowsAmendments`). */
export const AMENDABLE_STATUSES = ['PARTICIPANTS_JOINING', 'CONFIRMATION_PENDING'] as const;
export const isAmendable = (status: string) => (AMENDABLE_STATUSES as readonly string[]).includes(status);

export type AmendmentAction = 'apply' | 'reject' | 'withdraw';
export type ListState = { status: 'idle' } | { status: 'loading' } | { status: 'unavailable'; agreementStatus: string } | { status: 'error' } | { status: 'ready'; items: AgreementAmendmentDto[] };
export type DiffState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; diff: AmendmentDiffDto };
export interface Notice { kind: 'done' | 'info' | 'uncertain' | 'error'; text: string }
export interface AmendmentsState {
  list: ListState;
  diffs: Record<string, DiffState>;
  busy: { id: string; action: AmendmentAction } | null;
  notices: Record<string, Notice>;
  /** Set only from a version SecurePay created (apply response) or an APPLIED amendment's own appliedVersionId. */
  applied: { amendmentId: string; versionNumber: number } | null;
}
const initial: AmendmentsState = { list: { status: 'idle' }, diffs: {}, busy: null, notices: {}, applied: null };

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may already have recorded it. */
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';

type Gateway = Pick<AgreementGateway, 'amendments' | 'amendmentDiff' | 'applyAmendment' | 'rejectAmendment' | 'withdrawAmendment' | 'version'>;

/**
 * Amendment review and the three consequences on a PROPOSED amendment, each its own explicit action:
 *   apply  = SecurePay creates a NEW current Agreement version (the old one is kept as history);
 *   reject = SecurePay marks the proposal REJECTED (the Agreement is untouched);
 *   withdraw = SecurePay marks the proposal WITHDRAWN (proposer only; the Agreement is untouched).
 * Outcomes are claimed only from what SecurePay returns or, when a call is uncertain, from re-reading the amendment.
 */
export function createAmendmentsController(gateway: Gateway, agreementId: string, currentVersionId: () => string | null, onAgreementChanged: () => void | Promise<void> = () => {}, id = () => crypto.randomUUID()) {
  let state: AmendmentsState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<AmendmentsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const notice = (amendmentId: string, n: Notice | null) => { const next = { ...state.notices }; if (n) next[amendmentId] = n; else delete next[amendmentId]; update({ notices: next }); };
  /** One key per amendment until its apply is settled: an uncertain retry can never be a "new" apply. */
  const applyKeys = new Map<string, string>();
  let inflight: Promise<void> | null = null;

  async function readList(): Promise<AgreementAmendmentDto[] | null> {
    try { const items = await gateway.amendments(agreementId); update({ list: { status: 'ready', items } }); return items; }
    catch { update({ list: { status: 'error' } }); return null; }
  }

  /** The proof of an apply: the amendment itself says APPLIED and names the version it created. */
  async function settleApplied(amendmentId: string, items: AgreementAmendmentDto[] | null): Promise<boolean> {
    const a = items?.find(x => x.id === amendmentId);
    if (!a || a.status !== 'APPLIED' || !a.appliedVersionId) return false;
    try { const v = await gateway.version(agreementId, a.appliedVersionId); update({ applied: { amendmentId, versionNumber: v.versionNumber } }); }
    catch { update({ applied: null }); }
    applyKeys.delete(amendmentId);
    notice(amendmentId, { kind: 'done', text: state.applied ? `The Agreement is now at version ${state.applied.versionNumber}. The earlier version stays in its history.` : 'This change was applied and created a new version.' });
    onAgreementChanged();
    return true;
  }

  return {
    getSnapshot: (): AmendmentsState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Amendments can only be read while the Agreement allows them; otherwise nothing is called and nothing is claimed. */
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

    async loadDiff(amendmentId: string) {
      if (state.diffs[amendmentId]) return;
      update({ diffs: { ...state.diffs, [amendmentId]: { status: 'loading' } } });
      try { update({ diffs: { ...state.diffs, [amendmentId]: { status: 'ready', diff: await gateway.amendmentDiff(agreementId, amendmentId) } } }); }
      catch { update({ diffs: { ...state.diffs, [amendmentId]: { status: 'error' } } }); }
    },

    async apply(amendmentId: string) {
      if (state.busy) return;
      const key = applyKeys.get(amendmentId) ?? id();
      applyKeys.set(amendmentId, key);
      update({ busy: { id: amendmentId, action: 'apply' } }); notice(amendmentId, null);
      try {
        const version = await gateway.applyAmendment(agreementId, amendmentId, key);
        applyKeys.delete(amendmentId);
        update({ busy: null, applied: { amendmentId, versionNumber: version.versionNumber } });
        notice(amendmentId, { kind: 'done', text: `The Agreement is now at version ${version.versionNumber}. The earlier version stays in its history.` });
        onAgreementChanged(); await readList();
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { notice(amendmentId, { kind: 'uncertain', text: `We’re not sure whether the change was applied. ${UNCERTAIN}` }); return; }
        if (error instanceof ApiError && error.status === 401) { applyKeys.delete(amendmentId); notice(amendmentId, { kind: 'error', text: 'Your session ended before SecurePay could act on this. Nothing was applied. Sign in again, then try again.' }); return; }
        if (error instanceof ApiError && error.status === 403) { applyKeys.delete(amendmentId); notice(amendmentId, { kind: 'error', text: 'This account can’t apply changes to this Agreement. Nothing was applied.' }); return; }
        // 422 / 409 cover "stale source version", "not applicable" (which is ALSO what a replay of an applied amendment says),
        // and validation: settle by asking SecurePay rather than guessing which.
        const items = await readList();
        if (await settleApplied(amendmentId, items)) return;
        applyKeys.delete(amendmentId);
        // Re-read the Agreement FIRST so "stale" is judged against SecurePay's current version, not the one on screen.
        await onAgreementChanged();
        const a = items?.find(x => x.id === amendmentId);
        const current = currentVersionId();
        if (a && a.status === 'PROPOSED' && current && a.sourceVersionId !== current) notice(amendmentId, { kind: 'error', text: 'The Agreement changed after this proposal was made, so it can no longer be applied. Nothing was applied. Review the current version before proposing another change.' });
        else if (a && a.status !== 'PROPOSED') notice(amendmentId, { kind: 'info', text: `This proposal is ${a.status.toLowerCase()}, so it can’t be applied.` });
        else notice(amendmentId, { kind: 'error', text: 'SecurePay couldn’t apply this change. Nothing was applied.' });
      }
    },

    /** After an uncertain apply: re-read the amendment; APPLIED + appliedVersionId is the proof. */
    async checkApply(amendmentId: string) {
      if (state.busy) return;
      const items = await readList();
      if (await settleApplied(amendmentId, items)) return;
      notice(amendmentId, { kind: 'uncertain', text: items ? 'SecurePay doesn’t show this change as applied yet. You can try again — it uses the same request, so it can’t create two versions.' : 'SecurePay couldn’t be reached to check. Try again in a moment.' });
    },

    async reject(amendmentId: string) { await terminal(amendmentId, 'reject'); },
    async withdraw(amendmentId: string) { await terminal(amendmentId, 'withdraw'); },
    reset() { applyKeys.clear(); inflight = null; update({ ...initial }); },
  };

  async function terminal(amendmentId: string, action: 'reject' | 'withdraw') {
    if (state.busy) return;
    update({ busy: { id: amendmentId, action } }); notice(amendmentId, null);
    const want = action === 'reject' ? 'REJECTED' : 'WITHDRAWN';
    try {
      const result = await (action === 'reject' ? gateway.rejectAmendment(agreementId, amendmentId) : gateway.withdrawAmendment(agreementId, amendmentId));
      update({ busy: null });
      // A 200 is NOT proof: SecurePay answers 200 with the unchanged amendment when it is no longer PROPOSED.
      if (result.status === want) notice(amendmentId, { kind: 'done', text: action === 'reject' ? 'This proposed change was rejected. The current Agreement stays as it is.' : 'Your proposal was withdrawn. The current Agreement stays as it is.' });
      else notice(amendmentId, { kind: 'info', text: `Nothing was changed: this proposal is already ${result.status.toLowerCase()}.` });
    } catch (error) {
      update({ busy: null });
      if (isUncertain(error)) notice(amendmentId, { kind: 'uncertain', text: `${UNCERTAIN} The list shows what SecurePay has.` });
      else if (error instanceof ApiError && error.status === 401) notice(amendmentId, { kind: 'error', text: 'Your session ended before SecurePay could act on this. Nothing was changed.' });
      else if (error instanceof ApiError && error.status === 403) notice(amendmentId, { kind: 'error', text: 'This account can’t do that on this Agreement. Nothing was changed.' });
      else if (action === 'withdraw' && error instanceof ApiError && error.kind === 'http' && /only proposer/i.test(error.message)) notice(amendmentId, { kind: 'error', text: 'Only the person who proposed this change can withdraw it. Nothing was changed.' });
      else notice(amendmentId, { kind: 'error', text: 'SecurePay couldn’t do that. Nothing was changed.' });
    }
    await readList();
  }
}
export type AmendmentsController = ReturnType<typeof createAmendmentsController>;
