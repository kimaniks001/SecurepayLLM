import type { AgreementGateway, EvidenceDto, NextActionDto, ObligationCompletionStatusDto, ObligationDto, ReviewDecision } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';
import { currentVersionObligations } from './display';

export type Remote<T> = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };
export type ExecAction = 'start' | 'complete' | 'review' | 'evidence';
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
  pendingReview: Record<string, ReviewDecision>;
  /** Phase 7 Slice 2: the written statement being drafted per obligation (never persisted outside this controller). */
  drafts: Record<string, string>;
}
const initial: ExecutionState = { obligations: { status: 'idle' }, nextActions: { status: 'idle' }, completion: {}, evidence: {}, busy: null, notices: {}, pendingReview: {}, drafts: {} };

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may already have recorded it. */
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';
const ACTIVE = ['IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'OVERDUE'];
/** The only states SecurePay can start from (ObligationService#start); PENDING is never startable. */
const startable = (status: string) => status === 'AVAILABLE' || status === 'OVERDUE';

type Gateway = Pick<AgreementGateway, 'detail' | 'obligations' | 'obligationCompletionStatus' | 'startObligation' | 'completeObligation' | 'obligationEvidence' | 'reviewEvidence' | 'myNextActions' | 'submitEvidence'>;
/** SecurePay's own limit for a written statement. */
export const STATEMENT_MAX = 2048;

/**
 * Execution of the CURRENT version's obligations. It reads; it acts only where SecurePay's own signals allow, and never advances
 * anything locally:
 *  - Start work: only when the caller's own next actions contain START_OBLIGATION for that obligation. Since Phase 7 Slice 1 the
 *    server itself enforces the responsible participant and binds the start atomically to the expected Agreement + obligation
 *    versions this controller sends; the next-action gate only decides whether to OFFER the control.
 *  - Review evidence (Phase 7 Slice 3): only when the caller's own next actions contain REVIEW_EVIDENCE naming that evidence. SecurePay
 *    decides who reviews (the obligation's beneficiary), binds the decision to the expected versions and records one decision per item:
 *    Approve, Not accepted, or Ask for more information (a reason is required unless approving). A review is never completion.
 *  - Replace evidence (Phase 7 Slice 3): only on SecurePay's REPLACE_EVIDENCE action; the written statement explicitly supersedes
 *    exactly the item that was not accepted / needs more information.
 *  - Complete this obligation: only when SecurePay's completion-status says eligible AND the obligation's responsible participant
 *    is the caller (the server checks no participant for completion; this only ever RESTRICTS).
 *  - Submit evidence (Phase 7 Slice 2): only when the caller's own next actions contain SUBMIT_EVIDENCE for that obligation. It is a
 *    WRITTEN STATEMENT only: SecurePay has no file storage, so nothing is uploaded. SecurePay derives the submitter, enforces the
 *    responsible participant and binds the submission to the expected Agreement + obligation versions. Evidence is not approval.
 * There is no evidence upload (no storage exists) and no whole-Agreement completion command (it is a read model).
 */
export function createExecutionController(gateway: Gateway, agreementId: string, currentVersionId: () => string | null, ownParticipantId: () => string | null, onChanged: () => void | Promise<void> = () => {}, id = () => crypto.randomUUID()) {
  let state: ExecutionState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<ExecutionState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const notice = (key: string, n: Notice | null) => { const next = { ...state.notices }; if (n) next[key] = n; else delete next[key]; update({ notices: next }); };
  /** One key per consequential attempt, released on settle; an uncertain retry re-sends the SAME one. */
  /** Start pins the expected versions WITH its key: an uncertain retry must resend the identical request (SecurePay's idempotency digest covers them). */
  const startPins = new Map<string, { versionId: string; stateVersion: number }>();
  /** Evidence pins the versions AND the exact text with its key, for the same reason. */
  const evidencePins = new Map<string, { versionId: string; stateVersion: number; text: string; supersedes?: string }>();
  /** Review pins the versions, decision and reason with its key (per evidence item). */
  const reviewPins = new Map<string, { versionId: string; stateVersion: number; decision: ReviewDecision; reason?: string }>();
  const replaceTargetIn = (next: NextActionDto[], oid: string) => next.find(a => a.actionType === 'REPLACE_EVIDENCE' && a.targetObligationId === oid && a.supportingEvidenceIds.length > 0)?.supportingEvidenceIds[0] ?? null;
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
   * SUPERSEDED version, so what rendered a button is never enough. THIS PREFLIGHT CANNOT ELIMINATE THE RACE: between the fresh read and
   * the POST another client can make a new version current. Only the backend can make that check atomic. Since Phase 7 Slice 1 START
   * is atomic server-side (expected Agreement version + obligation state version, stale -> 409), so Start is wired; the review and
   * complete endpoints are still not conditional on the current version, so the production UI keeps withholding Review / Complete
   * (see docs/UI_COMPLETION_PHASE7_EXECUTION.md). Immediately before a consequential call, ask SecurePay afresh
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
      return !!o && state.nextActions.status === 'ready' && state.nextActions.data.some(a => a.actionType === 'START_OBLIGATION' && a.targetObligationId === oid) && startable(o.status);
    },
    /** The evidence of this obligation whose review is unsettled after an uncertain attempt (by exact evidence id). */
    pendingReviewFor(oid: string): { evidenceId: string; decision: ReviewDecision } | null {
      const ev = state.evidence[oid];
      const hit = ev?.status === 'ready' ? ev.data.find(e => state.pendingReview[e.id]) : null;
      return hit ? { evidenceId: hit.id, decision: state.pendingReview[hit.id] } : null;
    },
    reviewTarget(oid: string): { evidenceId: string } | null {
      if (!obligationById(oid)) return null;
      const pending = this.pendingReviewFor(oid);
      if (pending) return { evidenceId: pending.evidenceId };
      if (state.nextActions.status !== 'ready') return null;
      const a = state.nextActions.data.find(x => x.actionType === 'REVIEW_EVIDENCE' && x.targetObligationId === oid && x.supportingEvidenceIds.length > 0);
      return a ? { evidenceId: a.supportingEvidenceIds[0] } : null;
    },
    /** Phase 7 Slice 3: the exact evidence SecurePay asks the caller to replace (REPLACE_EVIDENCE), if any. */
    replacementTarget(oid: string): string | null {
      if (!obligationById(oid) || state.nextActions.status !== 'ready') return null;
      return replaceTargetIn(state.nextActions.data, oid);
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
      if (!fresh.next.some(a => a.actionType === 'START_OBLIGATION' && a.targetObligationId === oid) || !startable(target.status)) { await blocked(oid, 'started', 'signal'); return; }
      const key = keyFor(`start:${oid}`);
      // A first attempt binds to what SecurePay just said is current; an uncertain retry resends the pinned request unchanged.
      let pin = startPins.get(oid);
      if (!pin) { pin = { versionId: fresh.versionId, stateVersion: target.stateVersion }; startPins.set(oid, pin); }
      const settle = () => { keys.delete(`start:${oid}`); startPins.delete(oid); };
      update({ busy: { id: oid, action: 'start' } });
      try {
        const result = await gateway.startObligation(agreementId, oid, { idempotencyKey: key, expectedAgreementVersionId: pin.versionId, expectedObligationVersion: pin.stateVersion });
        settle(); update({ busy: null });
        // Claimed only from what SecurePay returns; then everything is re-read (nothing advanced locally).
        notice(oid, result.status === 'IN_PROGRESS' ? { kind: 'done', text: 'SecurePay recorded that this work is in progress.' } : { kind: 'info', text: `SecurePay shows this work as ${result.status.toLowerCase().replace(/_/g, ' ')}.` });
        await refreshAll(); void onChanged();
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { notice(oid, { kind: 'uncertain', action: 'start', text: `We’re not sure whether SecurePay recorded the start. ${UNCERTAIN}` }); return; }
        settle();
        if (error instanceof ApiError && error.status === 401) { notice(oid, { kind: 'error', text: 'Your session ended before SecurePay could act on this. Nothing was started. Sign in again, then try again.' }); return; }
        if (error instanceof ApiError && error.status === 403) { notice(oid, { kind: 'error', text: 'This account can’t start this work. Nothing was started.' }); return; }
        // 409: the Agreement or this work changed since it was read (stale view); 422: the Agreement is closed. Ask SecurePay what is true now.
        const stale = error instanceof ApiError && error.status === 409;
        if (stale) await onChanged();
        await refreshAll();
        const o = obligationById(oid);
        notice(oid, o?.status === 'IN_PROGRESS' ? { kind: 'info', text: 'SecurePay shows this work as already in progress.' }
          : stale ? { kind: 'error', ttl: 2, text: 'The Agreement or this work changed while you were looking at it, so nothing was started. Check what SecurePay shows now.' }
          : { kind: 'error', text: 'SecurePay couldn’t start this work. Nothing was started.' });
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
      if (['IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'COMPLETED', 'REJECTED'].includes(o.status)) { keys.delete(`start:${oid}`); startPins.delete(oid); notice(oid, { kind: 'done', text: `SecurePay now shows this work as ${words(o.status)}.` }); void onChanged(); return; }
      if (o.status === 'AVAILABLE' || o.status === 'PENDING') { notice(oid, { kind: 'uncertain', action: 'start', text: 'SecurePay doesn’t show this work as started yet. You can try again — it uses the same request, so it can’t start twice.' }); return; }
      keys.delete(`start:${oid}`); startPins.delete(oid);
      notice(oid, { kind: 'info', text: `SecurePay now shows this work as ${words(o.status)}. SecurePay can’t establish from this read whether the earlier start request was recorded. Start isn’t available from this state.` });
      void onChanged();
    },

    // -------------------------------------------------------------- Submit evidence (a written statement; Phase 7 Slice 2)
    canSubmitEvidence(oid: string): boolean {
      const o = obligationById(oid);
      return !!o && state.nextActions.status === 'ready' && state.nextActions.data.some(a => a.actionType === 'SUBMIT_EVIDENCE' && a.targetObligationId === oid) && (o.status === 'IN_PROGRESS' || o.status === 'OVERDUE');
    },
    /** The statement an unsettled (uncertain) submission is pinned to, if any; it can't be edited until settled. */
    pendingStatement(oid: string): string | null { return evidencePins.get(oid)?.text ?? null; },
    setDraft(oid: string, text: string) { if (!evidencePins.has(oid)) update({ drafts: { ...state.drafts, [oid]: text.slice(0, STATEMENT_MAX) } }); },
    async submitStatement(oid: string) {
      if (state.busy) return;
      const pinned = evidencePins.get(oid);
      const text = (pinned?.text ?? state.drafts[oid] ?? '').trim();
      if (!text) { notice(oid, { kind: 'error', text: 'Write what you did before submitting it as evidence.' }); return; }
      const replacing = pinned ? pinned.supersedes ?? null : this.canSubmitEvidence(oid) ? null : this.replacementTarget(oid);
      if (!pinned && !this.canSubmitEvidence(oid) && !replacing) return;
      update({ busy: { id: oid, action: 'evidence' } }); notice(oid, null);
      const fresh = await freshAuthority(); update({ busy: null });
      if (!fresh) { await blocked(oid, 'submitted', 'unreadable'); return; }
      const target = inFreshVersion(fresh, oid);
      if (!target) { await blocked(oid, 'submitted', 'version'); return; }
      // A first submission needs SecurePay's SUBMIT_EVIDENCE signal. An uncertain RETRY may find it gone because the first attempt landed;
      // it resends the pinned request unchanged and SecurePay replays it (or answers 409 if something else changed).
      const stillAsked = replacing
        ? replaceTargetIn(fresh.next, oid) === replacing
        : fresh.next.some(a => a.actionType === 'SUBMIT_EVIDENCE' && a.targetObligationId === oid) && (target.status === 'IN_PROGRESS' || target.status === 'OVERDUE');
      if (!pinned && !stillAsked) { await blocked(oid, 'submitted', 'signal'); return; }
      const key = keyFor(`evidence:${oid}`);
      const pin = pinned ?? { versionId: fresh.versionId, stateVersion: target.stateVersion, text, ...(replacing ? { supersedes: replacing } : {}) };
      evidencePins.set(oid, pin);
      const settle = () => { keys.delete(`evidence:${oid}`); evidencePins.delete(oid); };
      update({ busy: { id: oid, action: 'evidence' } });
      try {
        await gateway.submitEvidence(agreementId, oid, { idempotencyKey: key, expectedAgreementVersionId: pin.versionId, expectedObligationVersion: pin.stateVersion, evidenceType: 'TEXT_STATEMENT', description: pin.text, ...(pin.supersedes ? { supersedesEvidenceId: pin.supersedes } : {}) });
        settle(); const d = { ...state.drafts }; delete d[oid]; update({ busy: null, drafts: d });
        notice(oid, { kind: 'done', text: pin.supersedes
          ? 'SecurePay recorded your new evidence in place of the earlier one. It now waits for review — submitting it doesn’t approve it or complete the work.'
          : 'SecurePay recorded your evidence. It now waits for review — submitting it doesn’t approve it or complete the work.' });
        await refreshAll(); void onChanged();
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { notice(oid, { kind: 'uncertain', action: 'evidence', text: `We’re not sure whether SecurePay recorded your evidence. ${UNCERTAIN}` }); return; }
        settle();
        if (error instanceof ApiError && error.status === 401) { notice(oid, { kind: 'error', text: 'Your session ended before SecurePay could act on this. No evidence was submitted. Sign in again, then try again.' }); return; }
        if (error instanceof ApiError && error.status === 403) { notice(oid, { kind: 'error', text: 'Only the person responsible for this work can submit evidence for it. No evidence was submitted.' }); return; }
        const stale = error instanceof ApiError && error.status === 409;
        if (stale) await onChanged();
        await refreshAll();
        notice(oid, stale
          ? { kind: 'error', ttl: 2, text: 'The Agreement or this work changed while you were looking at it, so no evidence was submitted. Check what SecurePay shows now.' }
          : { kind: 'error', text: 'SecurePay couldn’t accept that evidence. No evidence was submitted.' });
      }
    },
    /** After an uncertain submission: only a re-read evidence record with exactly the pinned statement proves it was recorded. */
    async checkEvidence(oid: string) {
      if (state.busy) return;
      const pin = evidencePins.get(oid);
      const list = await readEvidence(oid); await Promise.all([readObligations(), readNext()]);
      if (!list) { notice(oid, { kind: 'uncertain', action: 'evidence', text: 'SecurePay couldn’t be reached to check. Try again in a moment.' }); return; }
      if (pin && list.some(e => e.status !== 'SUPERSEDED' && (e.description ?? '').trim() === pin.text)) {
        keys.delete(`evidence:${oid}`); evidencePins.delete(oid); const d = { ...state.drafts }; delete d[oid]; update({ drafts: d });
        notice(oid, { kind: 'done', text: 'SecurePay shows your evidence as submitted. It now waits for review.' }); void onChanged(); return;
      }
      notice(oid, { kind: 'uncertain', action: 'evidence', text: 'SecurePay doesn’t show that evidence yet. You can try again — it sends the same request, so it can’t be recorded twice.' });
    },

    // -------------------------------------------------------------- Review evidence (Phase 7 Slice 3)
    /** The participant-facing reason being drafted for a review (never persisted outside this controller). */
    reviewReasonDraft(oid: string): string { return state.drafts[`review:${oid}`] ?? ''; },
    setReviewReason(oid: string, text: string) { update({ drafts: { ...state.drafts, [`review:${oid}`]: text.slice(0, 1024) } }); },
    async review(oid: string, decision: ReviewDecision, reason?: string) {
      const target = this.reviewTarget(oid);
      if (state.busy || !target) return;
      const pinned = reviewPins.get(target.evidenceId);
      if (pinned && pinned.decision !== decision) return; // an unsettled review can't be contradicted
      const why = (pinned ? pinned.reason : (reason ?? this.reviewReasonDraft(oid)))?.trim() || undefined;
      if (decision !== 'APPROVED' && !why) { notice(oid, { kind: 'error', text: 'Say what is wrong or what is missing, so it can be fixed. No review was recorded.' }); return; }
      update({ busy: { id: oid, action: 'review' } }); notice(oid, null);
      const fresh = await freshAuthority(); update({ busy: null });
      if (!fresh) { await blocked(oid, 'reviewed', 'unreadable'); return; }
      const work = inFreshVersion(fresh, oid);
      if (!work) { await blocked(oid, 'reviewed', 'version'); return; }
      // A first review needs SecurePay's REVIEW_EVIDENCE action for exactly this evidence. An uncertain RETRY (same key, same pinned
      // request) may find that action already gone because the first attempt landed; SecurePay replays it or answers 409.
      const named = fresh.next.some(a => a.actionType === 'REVIEW_EVIDENCE' && a.targetObligationId === oid && a.supportingEvidenceIds.includes(target.evidenceId));
      if (!pinned && !named) { await blocked(oid, 'reviewed', 'signal'); return; }
      const key = keyFor(`review:${target.evidenceId}`);
      const pin = pinned ?? { versionId: fresh.versionId, stateVersion: work.stateVersion, decision, ...(why ? { reason: why } : {}) };
      reviewPins.set(target.evidenceId, pin);
      const settle = () => { keys.delete(`review:${target.evidenceId}`); reviewPins.delete(target.evidenceId); const p = { ...state.pendingReview }; delete p[target.evidenceId]; const d = { ...state.drafts }; delete d[`review:${oid}`]; update({ pendingReview: p, drafts: d }); };
      update({ busy: { id: oid, action: 'review' } });
      try {
        await gateway.reviewEvidence(agreementId, target.evidenceId, { idempotencyKey: key, expectedAgreementVersionId: pin.versionId, expectedObligationVersion: pin.stateVersion, decision: pin.decision, ...(pin.reason ? { reason: pin.reason } : {}) });
        // 200 means SecurePay recorded THIS decision. A review never changes the evidence's status, completes work or moves money.
        settle(); update({ busy: null });
        notice(oid, { kind: 'done', text: decision === 'APPROVED'
          ? 'SecurePay recorded your review: approved. That doesn’t by itself complete the work or release money.'
          : decision === 'REJECTED'
            ? 'SecurePay recorded your review: not accepted. The person responsible can replace the evidence.'
            : 'SecurePay recorded that you asked for more information. The person responsible can replace the evidence.' });
        await refreshAll(); void onChanged();
      } catch (error) {
        update({ busy: null });
        if (isUncertain(error)) { update({ pendingReview: { ...state.pendingReview, [target.evidenceId]: decision } }); notice(oid, { kind: 'uncertain', action: 'review', text: `We’re not sure whether that review was recorded. ${UNCERTAIN}` }); return; }
        settle();
        const said = error instanceof ApiError && error.kind === 'http' ? error.message.toLowerCase() : '';
        if (error instanceof ApiError && error.status === 401) notice(oid, { kind: 'error', text: 'Your session ended before SecurePay could act on this. No review was recorded. Sign in again, then try again.' });
        else if (error instanceof ApiError && error.status === 403) notice(oid, { kind: 'error', text: 'This account can’t review this evidence. No review was recorded.' });
        else if (error instanceof ApiError && error.status === 409) { await onChanged(); await refreshAll(); notice(oid, { kind: 'error', ttl: 2, text: 'The evidence or the Agreement changed, or it was already reviewed, so no review was recorded. Check what SecurePay shows now.' }); }
        else if (said.includes('self-review')) notice(oid, { kind: 'error', text: 'You submitted this evidence, so you can’t review it. No review was recorded.' });
        else notice(oid, { kind: 'error', text: 'SecurePay couldn’t record that review. No review was recorded.' });
      }
    },
    /**
     * After an uncertain review: re-read the evidence. SecurePay's reviewState proves the OUTCOME (approved / not accepted / more
     * information) -- not who made it, so the wording never says "your". Completion-status remains a fallback proof of approval.
     */
    async checkReview(oid: string) {
      if (state.busy) return;
      const pending = this.pendingReviewFor(oid);
      const list = await readEvidence(oid); await readNext(); const c = await readCompletion(oid);
      if (!pending) { notice(oid, null); return; }
      const shown = list?.find(e => e.id === pending.evidenceId)?.reviewState;
      const words: Record<string, string> = { APPROVED: 'approved in review', REJECTED: 'not accepted in review', NEEDS_MORE_INFORMATION: 'needing more information' };
      const settleTo = (n: Notice) => { keys.delete(`review:${pending.evidenceId}`); reviewPins.delete(pending.evidenceId); const p = { ...state.pendingReview }; delete p[pending.evidenceId]; update({ pendingReview: p }); notice(oid, n); void onChanged(); };
      if (shown === pending.decision || (!shown && pending.decision === 'APPROVED' && c?.satisfiedRequirements.includes(`evidence_approved_${pending.evidenceId}`))) {
        // proves the review OUTCOME, not who made it
        settleTo({ kind: 'done', text: `SecurePay now shows this evidence as ${words[pending.decision]}.` }); return;
      }
      if (shown && shown !== 'AWAITING_REVIEW') { settleTo({ kind: 'info', text: shown === 'SUPERSEDED' ? 'SecurePay shows this evidence has been replaced, so it can’t be reviewed any more.' : `SecurePay shows this evidence as ${words[shown] ?? 'reviewed'}. Nothing more was sent.` }); return; }
      notice(oid, { kind: 'uncertain', action: 'review', text: list || c ? 'SecurePay doesn’t show that review yet. Trying again sends the same request, so it can’t be recorded twice.' : 'SecurePay couldn’t be reached to check. Try again in a moment.' });
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
    reset() { keys.clear(); startPins.clear(); evidencePins.clear(); reviewPins.clear(); inflight = null; update({ ...initial }); },
  };
}
export type ExecutionController = ReturnType<typeof createExecutionController>;
