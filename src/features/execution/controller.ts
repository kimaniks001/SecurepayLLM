import type { AgreementGateway, EvidenceDto, NextActionDto, ObligationCompletionStatusDto, ObligationDto } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';
import { currentVersionObligations } from './display';

export type Remote<T> = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };
export type ExecAction = 'start' | 'complete' | 'review';
export interface Notice { kind: 'done' | 'info' | 'uncertain' | 'error'; text: string; action?: ExecAction; /** How many more fresh looks (`load`) this outcome survives; the version-moved explanation must outlive the reload it triggers. */ ttl?: number }
export interface ExecutionState {
  /** ALL obligations SecurePay returns (every version). Only `current(...)` may be treated as current work. */
  obligations: Remote<ObligationDto[]>;
  nextActions: Remote<NextActionDto[]>;
  completion: Record<string, Remote<ObligationCompletionStatusDto>>;
  evidence: Record<string, Remote<EvidenceDto[]>>;
  busy: { id: string; action: ExecAction } | null;
  notices: Record<string, Notice>;
  /** An uncertain review pins its decision until settled, so the opposite decision can't be offered meanwhile. */
  pendingReview: Record<string, 'APPROVED' | 'REJECTED'>;
}
const initial: ExecutionState = { obligations: { status: 'idle' }, nextActions: { status: 'idle' }, completion: {}, evidence: {}, busy: null, notices: {}, pendingReview: {} };

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may already have recorded it. */
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';
const ACTIVE = ['IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'OVERDUE'];

type Gateway = Pick<AgreementGateway, 'detail' | 'obligations' | 'obligationCompletionStatus' | 'startObligation' | 'completeObligation' | 'obligationEvidence' | 'reviewEvidence' | 'myNextActions'>;

/**
 * Execution of the CURRENT version's obligations. It reads; it acts only where SecurePay's own signals allow, and never advances
 * anything locally:
 *  - Start work: only when the caller's own next actions contain START_OBLIGATION for that obligation (the server's own
 *    responsibility check for start compares the responsible participant with itself and can never fail).
 *  - Review evidence: only when the caller's own next actions contain REVIEW_EVIDENCE naming that evidence. Approve and Reject only.
 *  - Complete this obligation: only when SecurePay's completion-status says eligible AND the obligation's responsible participant
 *    is the caller (the server checks no participant for completion; this only ever RESTRICTS).
 * There is no evidence upload (no storage exists) and no whole-Agreement completion command (it is a read model).
 */
export function createExecutionController(gateway: Gateway, agreementId: string, currentVersionId: () => string | null, ownParticipantId: () => string | null, onChanged: () => void | Promise<void> = () => {}, id = () => crypto.randomUUID()) {
  let state: ExecutionState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<ExecutionState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const notice = (key: string, n: Notice | null) => { const next = { ...state.notices }; if (n) next[key] = n; else delete next[key]; update({ notices: next }); };
  /** One key per consequential attempt, released on settle; an uncertain retry re-sends the SAME one. */
  const keys = new Map<string, string>();
  const keyFor = (k: string) => { let v = keys.get(k); if (!v) { v = id(); keys.set(k, v); } return v; };
  let inflight: Promise<void> | null = null;

  const current = () => (state.obligations.status === 'ready' ? currentVersionObligations(state.obligations.data, currentVersionId()) : []);
  const obligationById = (oid: string) => current().find(o => o.id === oid) ?? null;

  async function readObligations(): Promise<ObligationDto[] | null> {
    try { const data = await gateway.obligations(agreementId); update({ obligations: { status: 'ready', data } }); return data; }
    catch { update({ obligations: { status: 'error' } }); return null; }
  }
  async function readNext(): Promise<NextActionDto[] | null> {
    try { const r = await gateway.myNextActions(agreementId); update({ nextActions: { status: 'ready', data: r.actions ?? [] } }); return r.actions ?? []; }
    catch { update({ nextActions: { status: 'error' } }); return null; }
  }
  async function readCompletion(oid: string): Promise<ObligationCompletionStatusDto | null> {
    try { const data = await gateway.obligationCompletionStatus(agreementId, oid); update({ completion: { ...state.completion, [oid]: { status: 'ready', data } } }); return data; }
    catch { update({ completion: { ...state.completion, [oid]: { status: 'error' } } }); return null; }
  }
  async function readEvidence(oid: string): Promise<EvidenceDto[] | null> {
    try { const data = await gateway.obligationEvidence(agreementId, oid); update({ evidence: { ...state.evidence, [oid]: { status: 'ready', data } } }); return data; }
    catch { update({ evidence: { ...state.evidence, [oid]: { status: 'error' } } }); return null; }
  }
  /** Details for the obligations that can be acted on or reviewed; each read fails on its own. */
  async function readDetails() {
    const active = current().filter(o => ACTIVE.includes(o.status) || (state.nextActions.status === 'ready' && state.nextActions.data.some(a => a.targetObligationId === o.id && a.actionType === 'REVIEW_EVIDENCE')));
    await Promise.all(active.flatMap(o => [readCompletion(o.id), readEvidence(o.id)]));
  }
  /**
   * ACTION-TIME AUTHORITY. The backend's start / complete / review endpoints do not themselves reject work that belongs to a
   * SUPERSEDED version, so what rendered a button is never enough. Immediately before a consequential call, ask SecurePay afresh
   * which version is current, which obligations exist, and what the caller's next actions are. Any read that fails means the
   * version can't be established, so nothing is sent.
   */
  interface Fresh { versionId: string; obligations: ObligationDto[]; next: NextActionDto[] }
  async function freshAuthority(): Promise<Fresh | null> {
    try {
      const [detail, obligations, next] = await Promise.all([gateway.detail(agreementId), gateway.obligations(agreementId), gateway.myNextActions(agreementId)]);
      update({ obligations: { status: 'ready', data: obligations }, nextActions: { status: 'ready', data: next.actions ?? [] } });
      const versionId = detail.currentVersion?.versionId ?? null;
      return versionId ? { versionId, obligations, next: next.actions ?? [] } : null;
    } catch { return null; }
  }
  const inFreshVersion = (f: Fresh, oid: string) => f.obligations.find(o => o.id === oid && o.agreementVersionId === f.versionId) ?? null;
  /** Explains a blocked press, refreshes what is shown, and sends nothing. */
  async function blocked(oid: string, verbed: string, why: 'unreadable' | 'version' | 'signal') {
    notice(oid, why === 'unreadable'
      ? { kind: 'error', text: `SecurePay couldn’t confirm the current version of the Agreement, so nothing was ${verbed}. Try again in a moment.` }
      : why === 'version'
        ? { kind: 'error', ttl: 2, text: `The Agreement changed while you were looking at it. This work belongs to an earlier version, so nothing was ${verbed}. Review the current Agreement.` }
        : { kind: 'error', text: `SecurePay no longer lists this as something for you to do, so nothing was ${verbed}.` });
    await onChanged(); await refreshAll();
  }
  async function refreshAll() { await Promise.all([readObligations(), readNext()]); await readDetails(); }

  return {
    getSnapshot: (): ExecutionState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    current, obligationById,

    /** Desktop and mobile both mount the panel: they share one in-flight read; a later mount reads fresh truth. */
    load(): Promise<void> {
      if (inflight) return inflight;
      // A fresh look drops outcomes already settled; only an UNSETTLED (uncertain) attempt is kept, so its recovery stays available.
      update({ obligations: { status: 'loading' }, nextActions: { status: 'loading' }, notices: Object.fromEntries(Object.entries(state.notices).filter(([, n]) => n.kind === 'uncertain' || (n.ttl ?? 0) > 1).map(([k, n]) => [k, n.ttl ? { ...n, ttl: n.ttl - 1 } : n])) });
      inflight = refreshAll().finally(() => { inflight = null; });
      return inflight;
    },
    /** Explicit "see details" for an obligation that isn't loaded eagerly. */
    async loadDetails(oid: string) { if (!state.completion[oid]) await Promise.all([readCompletion(oid), readEvidence(oid)]); },

    // -------------------------------------------------------------- authority gates (pure, from SecurePay's own signals)
    canStart(oid: string): boolean {
      const o = obligationById(oid);
      return !!o && state.nextActions.status === 'ready' && state.nextActions.data.some(a => a.actionType === 'START_OBLIGATION' && a.targetObligationId === oid) && (o.status === 'AVAILABLE' || o.status === 'PENDING');
    },
    /** The evidence of this obligation whose review is unsettled after an uncertain attempt (by exact evidence id). */
    pendingReviewFor(oid: string): { evidenceId: string; decision: 'APPROVED' | 'REJECTED' } | null {
      const ev = state.evidence[oid];
      const hit = ev?.status === 'ready' ? ev.data.find(e => state.pendingReview[e.id]) : null;
      return hit ? { evidenceId: hit.id, decision: state.pendingReview[hit.id] } : null;
    },
    reviewTarget(oid: string): { evidenceId: string; participantId: string } | null {
      if (!obligationById(oid)) return null;
      const pending = this.pendingReviewFor(oid); const me = ownParticipantId();
      if (pending && me) return { evidenceId: pending.evidenceId, participantId: me };
      if (state.nextActions.status !== 'ready') return null;
      const a = state.nextActions.data.find(x => x.actionType === 'REVIEW_EVIDENCE' && x.targetObligationId === oid && x.supportingEvidenceIds.length > 0);
      return a ? { evidenceId: a.supportingEvidenceIds[0], participantId: a.participantId } : null;
    },
    canComplete(oid: string): boolean {
      const o = obligationById(oid); const c = state.completion[oid];
      const me = ownParticipantId();
      return !!o && !!me && o.responsibleParticipantId === me && c?.status === 'ready' && c.data.eligible === true && (o.status === 'IN_PROGRESS' || o.status === 'EVIDENCE_SUBMITTED');
    },

    // -------------------------------------------------------------- Start work
    async start(oid: string) {
      if (state.busy || !this.canStart(oid)) return;
      update({ busy: { id: oid, action: 'start' } }); notice(oid, null);
      const fresh = await freshAuthority(); update({ busy: null });
      if (!fresh) { await blocked(oid, 'started', 'unreadable'); return; }
      const target = inFreshVersion(fresh, oid);
      if (!target) { await blocked(oid, 'started', 'version'); return; }
      if (!fresh.next.some(a => a.actionType === 'START_OBLIGATION' && a.targetObligationId === oid) || (target.status !== 'AVAILABLE' && target.status !== 'PENDING')) { await blocked(oid, 'started', 'signal'); return; }
      const key = keyFor(`start:${oid}`);
      update({ busy: { id: oid, action: 'start' } });
      try {
        const result = await gateway.startObligation(agreementId, oid, key);
        keys.delete(`start:${oid}`); update({ busy: null });
        // Claimed only from what SecurePay returns; then everything is re-read (nothing advanced locally).
        notice(oid, result.status === 'IN_PROGRESS' ? { kind: 'done', text: 'SecurePay recorded that this work is in progress.' } : { kind: 'info', text: `SecurePay shows this work as ${result.status.toLowerCase().replace(/_/g, ' ')}.` });
        await refreshAll(); void onChanged();
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { notice(oid, { kind: 'uncertain', action: 'start', text: `We’re not sure whether SecurePay recorded the start. ${UNCERTAIN}` }); return; }
        keys.delete(`start:${oid}`);
        if (error instanceof ApiError && error.status === 401) { notice(oid, { kind: 'error', text: 'Your session ended before SecurePay could act on this. Nothing was started. Sign in again, then try again.' }); return; }
        if (error instanceof ApiError && error.status === 403) { notice(oid, { kind: 'error', text: 'This account can’t start this work. Nothing was started.' }); return; }
        await refreshAll(); // 422 covers "not responsible", "invalid transition": ask SecurePay what is true now
        const o = obligationById(oid);
        notice(oid, o?.status === 'IN_PROGRESS' ? { kind: 'info', text: 'SecurePay shows this work as already in progress.' } : { kind: 'error', text: 'SecurePay couldn’t start this work. Nothing was started.' });
      }
    },
    /**
     * After an uncertain start. Only IN_PROGRESS / EVIDENCE_SUBMITTED / COMPLETED / REJECTED prove the work passed through IN_PROGRESS,
     * and even then it says what SecurePay NOW SHOWS (another actor may have moved it). BLOCKED / OVERDUE / CANCELLED are reachable from
     * AVAILABLE without any start, so they prove nothing about the earlier request: Start is closed, with no retry and no success tone.
     */
    async checkStart(oid: string) {
      if (state.busy) return;
      const all = await readObligations(); await readNext();
      const o = all?.find(x => x.id === oid);
      const words = (st: string) => st.toLowerCase().replace(/_/g, ' ');
      if (!o) { notice(oid, { kind: 'uncertain', action: 'start', text: 'SecurePay couldn’t be reached to check. Try again in a moment.' }); return; }
      if (['IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'COMPLETED', 'REJECTED'].includes(o.status)) { keys.delete(`start:${oid}`); notice(oid, { kind: 'done', text: `SecurePay now shows this work as ${words(o.status)}.` }); void onChanged(); return; }
      if (o.status === 'AVAILABLE' || o.status === 'PENDING') { notice(oid, { kind: 'uncertain', action: 'start', text: 'SecurePay doesn’t show this work as started yet. You can try again — it uses the same request, so it can’t start twice.' }); return; }
      keys.delete(`start:${oid}`);
      notice(oid, { kind: 'info', text: `SecurePay now shows this work as ${words(o.status)}. SecurePay can’t establish from this read whether the earlier start request was recorded. Start isn’t available from this state.` });
      void onChanged();
    },

    // -------------------------------------------------------------- Review evidence (Approve / Reject only)
    async review(oid: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
      const target = this.reviewTarget(oid);
      if (state.busy || !target) return;
      const pinned = state.pendingReview[target.evidenceId];
      if (pinned && pinned !== decision) return; // an unsettled review can't be contradicted
      update({ busy: { id: oid, action: 'review' } }); notice(oid, null);
      const fresh = await freshAuthority(); update({ busy: null });
      if (!fresh) { await blocked(oid, 'reviewed', 'unreadable'); return; }
      if (!inFreshVersion(fresh, oid)) { await blocked(oid, 'reviewed', 'version'); return; }
      // A first review needs SecurePay's REVIEW_EVIDENCE action for exactly this evidence. An uncertain RETRY (same key, same decision)
      // may find that action already gone because the first attempt landed, so it needs only the version check above -- never a cached pass.
      const named = fresh.next.some(a => a.actionType === 'REVIEW_EVIDENCE' && a.targetObligationId === oid && a.supportingEvidenceIds.includes(target.evidenceId));
      if (!pinned && !named) { await blocked(oid, 'reviewed', 'signal'); return; }
      const key = keyFor(`review:${target.evidenceId}`);
      update({ busy: { id: oid, action: 'review' } });
      try {
        await gateway.reviewEvidence(agreementId, target.evidenceId, { idempotencyKey: key, decision, reviewerParticipantId: target.participantId, ...(reason?.trim() ? { reason: reason.trim() } : {}) });
        // 200 means SecurePay recorded THIS decision (a conflicting earlier one is a 409). The evidence status is NOT changed by a review.
        keys.delete(`review:${target.evidenceId}`); const p = { ...state.pendingReview }; delete p[target.evidenceId]; update({ busy: null, pendingReview: p });
        notice(oid, { kind: 'done', text: decision === 'APPROVED' ? 'SecurePay recorded your review: approved.' : 'SecurePay recorded your review: not accepted.' });
        await refreshAll(); void onChanged();
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { update({ pendingReview: { ...state.pendingReview, [target.evidenceId]: decision } }); notice(oid, { kind: 'uncertain', action: 'review', text: `We’re not sure whether that review was recorded. ${UNCERTAIN}` }); return; }
        keys.delete(`review:${target.evidenceId}`);
        const said = error instanceof ApiError && error.kind === 'http' ? error.message.toLowerCase() : '';
        if (error instanceof ApiError && error.status === 401) notice(oid, { kind: 'error', text: 'Your session ended before SecurePay could act on this. No review was recorded. Sign in again, then try again.' });
        else if (error instanceof ApiError && error.status === 403) notice(oid, { kind: 'error', text: 'This account can’t review this evidence. No review was recorded.' });
        else if (error instanceof ApiError && error.status === 409) { notice(oid, { kind: 'info', text: 'SecurePay already has a different review recorded for this evidence. Nothing was changed.' }); await refreshAll(); }
        else if (said.includes('self-review')) notice(oid, { kind: 'error', text: 'You submitted this evidence, so you can’t review it. No review was recorded.' });
        else notice(oid, { kind: 'error', text: 'SecurePay couldn’t record that review. No review was recorded.' });
      }
    },
    /** After an uncertain review: re-read. An approval is provable from completion-status; a rejection is NOT readable, so it stays unresolved. */
    async checkReview(oid: string) {
      if (state.busy) return;
      const evidenceId = this.pendingReviewFor(oid)?.evidenceId ?? null;
      await readNext(); const c = await readCompletion(oid);
      if (evidenceId && state.pendingReview[evidenceId] === 'APPROVED' && c?.satisfiedRequirements.includes(`evidence_approved_${evidenceId}`)) {
        keys.delete(`review:${evidenceId}`); const p = { ...state.pendingReview }; delete p[evidenceId]; update({ pendingReview: p });
        // completion-status proves the review OUTCOME, not who made it: another reviewer may have approved while this request was unsure.
        notice(oid, { kind: 'done', text: 'SecurePay now shows this evidence as approved in review.' }); void onChanged(); return;
      }
      notice(oid, { kind: 'uncertain', action: 'review', text: c ? 'SecurePay doesn’t show that review as recorded, and a rejection can’t be read back, so this is still unsettled. Trying again sends the same request, so it can’t be recorded twice.' : 'SecurePay couldn’t be reached to check. Try again in a moment.' });
    },

    // -------------------------------------------------------------- Complete this obligation (obligation only)
    async complete(oid: string) {
      if (state.busy || !this.canComplete(oid)) return;
      update({ busy: { id: oid, action: 'complete' } }); notice(oid, null);
      const fresh = await freshAuthority();
      let fc: ObligationCompletionStatusDto | null = null;
      if (fresh) { fc = await readCompletion(oid); }
      update({ busy: null });
      if (!fresh || !fc) { await blocked(oid, 'completed', 'unreadable'); return; }
      const target = inFreshVersion(fresh, oid);
      if (!target) { await blocked(oid, 'completed', 'version'); return; }
      if (target.status === 'COMPLETED') { keys.delete(`complete:${oid}`); notice(oid, { kind: 'info', text: 'SecurePay now shows this obligation as completed. Nothing more was sent.' }); await refreshAll(); await onChanged(); return; }
      if (target.responsibleParticipantId !== ownParticipantId() || fc.eligible !== true || (target.status !== 'IN_PROGRESS' && target.status !== 'EVIDENCE_SUBMITTED')) { await blocked(oid, 'completed', 'signal'); return; }
      const key = keyFor(`complete:${oid}`);
      update({ busy: { id: oid, action: 'complete' } });
      try {
        const result = await gateway.completeObligation(agreementId, oid, key);
        keys.delete(`complete:${oid}`); update({ busy: null });
        notice(oid, result.status === 'COMPLETED' ? { kind: 'done', text: 'SecurePay recorded this obligation as complete. That doesn’t by itself mean the whole Agreement is complete or that Money is released.' } : { kind: 'info', text: `SecurePay shows this work as ${result.status.toLowerCase().replace(/_/g, ' ')}.` });
        await refreshAll(); await onChanged(); // dependents, milestones, whole-Agreement completion are RE-READ, never advanced here
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { notice(oid, { kind: 'uncertain', action: 'complete', text: `We’re not sure whether SecurePay recorded the completion. ${UNCERTAIN}` }); return; }
        keys.delete(`complete:${oid}`);
        if (error instanceof ApiError && error.status === 401) { notice(oid, { kind: 'error', text: 'Your session ended before SecurePay could act on this. Nothing was completed. Sign in again, then try again.' }); return; }
        if (error instanceof ApiError && error.status === 403) { notice(oid, { kind: 'error', text: 'This account can’t complete this obligation. Nothing was completed.' }); return; }
        await refreshAll(); await onChanged();
        const o = obligationById(oid);
        notice(oid, o?.status === 'COMPLETED' ? { kind: 'info', text: 'SecurePay shows this obligation as already complete.' } : { kind: 'error', text: 'SecurePay says this obligation’s completion requirements aren’t met yet. Nothing was completed.' });
      }
    },
    async checkComplete(oid: string) {
      if (state.busy) return;
      const all = await readObligations();
      const o = all?.find(x => x.id === oid);
      if (o?.status === 'COMPLETED') { keys.delete(`complete:${oid}`); notice(oid, { kind: 'done', text: 'SecurePay shows this obligation as complete.' }); await refreshAll(); await onChanged(); }
      else notice(oid, { kind: 'uncertain', action: 'complete', text: all ? 'SecurePay doesn’t show this obligation as complete yet. You can try again — it uses the same request, so it can’t be recorded twice.' : 'SecurePay couldn’t be reached to check. Try again in a moment.' });
    },
    reset() { keys.clear(); inflight = null; update({ ...initial }); },
  };
}
export type ExecutionController = ReturnType<typeof createExecutionController>;
