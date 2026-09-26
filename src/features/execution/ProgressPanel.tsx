import { useEffect, useSyncExternalStore } from 'react';
import type { EvidenceDto, NextActionDto, ObligationDto } from '../../api/securepay/agreements';
import type { AgreementCompletionResponse, AgreementDetailResponse, MilestoneEffectiveStateResponse } from '../../api/securepay/agreements/dto';
import { completionFacts, evidenceTypeWords, milestoneReasonWords, milestoneStateWord, nextActionWords, obligationStatusWord, requirementWords, satisfiedWords } from './display';
import { STATEMENT_MAX, type ExecutionController, type Notice } from './controller';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';
const BTN = `min-h-11 rounded-full px-4 text-[0.85rem] font-medium ${FOCUS} disabled:opacity-40`;
const SECONDARY = `${BTN} border border-cream-300 bg-white text-forest-700 hover:border-forest-300`;
const PRIMARY = `${BTN} bg-forest-700 text-cream-50 hover:bg-forest-800`;
const dateOf = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const LIMIT = {
  complete: 'Completing it from this screen is temporarily unavailable until SecurePay can bind the action safely to the current Agreement version.',
};
const tone = (n: Notice) => n.kind === 'done' ? 'border-forest-200 bg-forest-50 text-forest-800' : n.kind === 'info' ? 'border-cream-300 bg-cream-50 text-sand-800' : 'border-ember-200 bg-ember-50 text-sand-800';

/**
 * Progress = what is actually happening in the CURRENT version's work, from SecurePay's own reads. No percentages, no "step N of M",
 * no dependency inferred from sequence order, no invented milestone for a simple Agreement, and no button that means "the Agreement
 * is complete" (that is a read-only projection).
 */
export function ProgressPanel({ controller, detail, effectiveStates, completion, ownParticipantId, onOpenMoney }: {
  controller: ExecutionController; detail: AgreementDetailResponse; effectiveStates: MilestoneEffectiveStateResponse[] | null;
  completion: AgreementCompletionResponse | null; ownParticipantId: string | null; onOpenMoney?: () => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.load(); }, [controller, detail.currentVersion?.versionId]);
  const facts = completionFacts(completion);
  const me = ownParticipantId;
  const nameOf = (participantId: string) => { const p = detail.participants.find(x => x.participantId === participantId); return p ? (p.displayName || p.ksNumber || null) : null; };
  const currentList = controller.current();
  const allList: ObligationDto[] = state.obligations.status === 'ready' ? state.obligations.data : [];
  const otherVersions = allList.length - currentList.length;
  const titleOfObligation = (oid: string) => allList.find(o => o.id === oid)?.title ?? null;
  const titleOfMilestone = (mid: string) => detail.milestones.find(m => m.milestoneId === mid)?.title ?? null;
  const nextFor = (oid: string): NextActionDto | null => state.nextActions.status === 'ready' ? state.nextActions.data.find(a => a.targetObligationId === oid) ?? null : null;
  const effective = (mid: string) => effectiveStates?.find(s => s.milestoneId === mid) ?? null;

  const card = (o: ObligationDto) => {
    const next = nextFor(o.id); const notice = state.notices[o.id];
    const comp = state.completion[o.id]; const ev = state.evidence[o.id];
    const responsible = nameOf(o.responsibleParticipantId); const mine = !!me && o.responsibleParticipantId === me;
    const blockers = (next?.blockedByObligationIds ?? []).map(titleOfObligation);
    const review = controller.reviewTarget(o.id);
    const replacing = controller.replacementTarget(o.id);
    const reviewWords = (e: EvidenceDto) => e.reviewState === 'APPROVED' || (!e.reviewState && approved(e.id)) ? 'Approved in review'
      : e.reviewState === 'REJECTED' ? 'Not accepted in review'
      : e.reviewState === 'NEEDS_MORE_INFORMATION' ? 'More information requested'
      : e.reviewState === 'SUPERSEDED' ? 'Replaced by newer evidence'
      : e.reviewState === 'AWAITING_REVIEW' ? 'Awaiting review'
      : comp?.status === 'ready' ? 'Not yet approved in review' : 'Review status unavailable';
    const approved = (eid: string) => comp?.status === 'ready' && comp.data.satisfiedRequirements.includes(`evidence_approved_${eid}`);
    const monetary = o.obligationType === 'MONETARY';
    const detailsLoaded = !!comp || !!ev;
    return <li key={o.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h4 className="break-words font-display text-[1rem] text-forest-800">{o.title}</h4>
        <span className="text-[0.78rem] font-medium text-sand-700">{obligationStatusWord(o.status)}</span>
      </div>
      {o.description && <p className="mt-0.5 break-words text-[0.85rem] text-sand-700">{o.description}</p>}
      <p className="mt-1 text-[0.8rem] text-sand-600">Responsible: {responsible ?? 'Responsible participant'}{mine ? ' (you)' : ''}</p>
      {o.status === 'OVERDUE' && <p className="text-[0.8rem] text-sand-800">This is past its expected time and still needs attention.</p>}
      {next && <p className="mt-1.5 text-[0.85rem] leading-snug text-forest-800">{nextActionWords(next)}</p>}
      {next?.actionType === 'WAIT_FOR_DEPENDENCY' && next.prerequisiteStatus === 'BLOCKED' && blockers.length > 0 && <p className="text-[0.8rem] text-sand-700">Waiting for {blockers.map(t => t ? `“${t}”` : 'other work').join(', ')} to be completed.</p>}
      {/* Submit evidence (Phase 7 Slice 2): a written statement only, offered only on SecurePay's own SUBMIT_EVIDENCE signal for the caller.
          SecurePay derives the submitter, enforces responsibility and binds the submission to the current versions. No file upload exists. */}
      {(controller.canSubmitEvidence(o.id) || !!replacing) && notice?.action !== 'evidence' && <div className="mt-2 space-y-1.5">
        <label htmlFor={`evidence-${o.id}`} className="block text-[0.8rem] font-medium text-forest-800">{replacing ? 'Replace your evidence: describe what you did, with what was asked for' : 'Describe what you did, as your evidence'}</label>
        <textarea id={`evidence-${o.id}`} rows={3} maxLength={STATEMENT_MAX} value={state.drafts[o.id] ?? ''} disabled={!!state.busy}
          onChange={e => controller.setDraft(o.id, e.target.value)}
          className={`w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-[0.85rem] text-forest-800 ${FOCUS}`} />
        <p className="text-[0.75rem] leading-snug text-sand-600">Uploading files isn’t available in SecurePay yet, so your written statement is your evidence. Submitting it doesn’t approve it or complete the work — it waits for review.</p>
        <button type="button" className={PRIMARY} disabled={!!state.busy || !(state.drafts[o.id] ?? '').trim()} onClick={() => void controller.submitStatement(o.id)}>{state.busy?.id === o.id && state.busy.action === 'evidence' ? 'Submitting…' : replacing ? 'Replace evidence' : 'Submit evidence'}</button>
      </div>}
      {next && next.requiredEvidenceTypes.length > 0 && <p className="text-[0.8rem] text-sand-700">Evidence asked for: {next.requiredEvidenceTypes.map(evidenceTypeWords).join(', ')}.</p>}
      {monetary && next?.actionType === 'FUND_AGREEMENT' && onOpenMoney && <button type="button" className={`${SECONDARY} mt-1.5`} onClick={onOpenMoney}>Open Money</button>}

      {!detailsLoaded && <button type="button" className={`${SECONDARY} mt-2`} onClick={() => void controller.loadDetails(o.id)}>See details</button>}
      {ev && <div className="mt-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Evidence</p>
        {ev.status === 'loading' && <p role="status" className="text-[0.8rem] text-sand-600">Loading evidence…</p>}
        {ev.status === 'error' && <p className="text-[0.82rem] text-sand-700">Evidence couldn’t be loaded right now.</p>}
        {ev.status === 'ready' && ev.data.length === 0 && <p className="text-[0.82rem] text-sand-600">No evidence has been submitted.</p>}
        {ev.status === 'ready' && ev.data.length > 0 && <ul className="mt-1 space-y-1.5">{ev.data.map(e => <li key={e.id} className="rounded-xl bg-cream-50 px-3 py-2">
          <p className="break-words text-[0.85rem] text-forest-800">{e.kind === 'STATEMENT' ? 'Written statement' : evidenceTypeWords(e.evidenceType)}{e.description ? ` — ${e.description}` : ''}</p>
          <p className="text-[0.75rem] text-sand-600">Submitted {dateOf(e.submittedAt)} · {reviewWords(e)}</p>
          {e.reviewReason && (e.reviewState === 'REJECTED' || e.reviewState === 'NEEDS_MORE_INFORMATION') && <p className="break-words text-[0.78rem] text-sand-800">Reason given: {e.reviewReason}</p>}
        </li>)}</ul>}
      </div>}

      {comp?.status === 'ready' && (o.status === 'IN_PROGRESS' || o.status === 'EVIDENCE_SUBMITTED' || o.status === 'OVERDUE') && <div className="mt-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Before this can be completed</p>
        {comp.data.eligible
          ? <p className="text-[0.85rem] text-forest-800">SecurePay says the completion requirements for this obligation are satisfied.</p>
          : <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[0.82rem] text-sand-800">{comp.data.unmetRequirements.map((r, i) => <li key={i}>{requirementWords(r, titleOfObligation)}</li>)}</ul>}
        {comp.data.satisfiedRequirements.map(satisfiedWords).filter(Boolean).length > 0 && <ul className="mt-1 space-y-0.5 text-[0.78rem] text-sand-600">{comp.data.satisfiedRequirements.map(satisfiedWords).filter((t): t is string => !!t).map((t, i) => <li key={i}>✓ {t}</li>)}</ul>}
      </div>}
      {comp?.status === 'error' && <p className="mt-2 text-[0.82rem] text-sand-700">The completion requirements couldn’t be loaded right now, so nothing can be completed from here.</p>}

      {/* Start work (Phase 7 Slice 1): SecurePay binds the start atomically to the current Agreement version and this work's state version, and
          checks the responsible participant itself, so it is offered only on SecurePay's own START_OBLIGATION signal.
          Review (Phase 7 Slice 3): offered only on SecurePay's own REVIEW_EVIDENCE signal (SecurePay decides who reviews -- the obligation's
          beneficiary -- and binds the decision to the current versions). A review is not completion and moves no money.
          WITHHELD: Complete. That endpoint still has no responsibility/version binding (Slice 4); its fact is shown read-only. */}
      {controller.canStart(o.id) && notice?.action !== 'start' && <button type="button" className={`${PRIMARY} mt-3`} disabled={!!state.busy} onClick={() => void controller.start(o.id)}>{state.busy?.id === o.id && state.busy.action === 'start' ? 'Starting…' : 'Start work'}</button>}
      {review && notice?.action !== 'review' && <div className="mt-3 space-y-1.5">
        <p className="text-[0.8rem] font-medium text-forest-800">Review this evidence</p>
        <p className="text-[0.75rem] leading-snug text-sand-600">This work is done for you, so you decide whether this evidence is acceptable. Approving it doesn’t by itself complete the work or release money.</p>
        <label htmlFor={`review-${o.id}`} className="block text-[0.78rem] text-sand-700">Reason (needed if it isn’t accepted or you need more information)</label>
        <textarea id={`review-${o.id}`} rows={2} maxLength={1024} value={controller.reviewReasonDraft(o.id)} disabled={!!state.busy}
          onChange={e => controller.setReviewReason(o.id, e.target.value)}
          className={`w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-[0.85rem] text-forest-800 ${FOCUS}`} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={PRIMARY} disabled={!!state.busy} onClick={() => void controller.review(o.id, 'APPROVED')}>Approve evidence</button>
          <button type="button" className={SECONDARY} disabled={!!state.busy || !controller.reviewReasonDraft(o.id).trim()} onClick={() => void controller.review(o.id, 'REJECTED')}>Not accepted</button>
          <button type="button" className={SECONDARY} disabled={!!state.busy || !controller.reviewReasonDraft(o.id).trim()} onClick={() => void controller.review(o.id, 'NEEDS_MORE_INFORMATION')}>Ask for more information</button>
        </div>
      </div>}
      {comp?.status === 'ready' && comp.data.eligible && mine && (o.status === 'IN_PROGRESS' || o.status === 'EVIDENCE_SUBMITTED') && <p className="mt-3 text-[0.8rem] leading-snug text-sand-700">{LIMIT.complete}</p>}
      {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-2 rounded-xl border px-3 py-2 text-[0.82rem] ${tone(notice)}`}><p>{notice.text}</p>
        {notice.kind === 'uncertain' && notice.action === 'start' && <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={SECONDARY} disabled={!!state.busy} onClick={() => void controller.checkStart(o.id)}>Check with SecurePay</button>
          {controller.canStart(o.id) && <button type="button" className={SECONDARY} disabled={!!state.busy} onClick={() => void controller.start(o.id)}>Try starting again</button>}
        </div>}
        {notice.kind === 'uncertain' && notice.action === 'review' && <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={SECONDARY} disabled={!!state.busy} onClick={() => void controller.checkReview(o.id)}>Check with SecurePay</button>
          {controller.pendingReviewFor(o.id) && <button type="button" className={SECONDARY} disabled={!!state.busy} onClick={() => { const p = controller.pendingReviewFor(o.id); if (p) void controller.review(o.id, p.decision); }}>Try recording the review again</button>}
        </div>}
        {notice.kind === 'uncertain' && notice.action === 'evidence' && <div className="mt-2 space-y-2">
          {controller.pendingStatement(o.id) && <p className="break-words text-[0.8rem] text-sand-700">Your statement: “{controller.pendingStatement(o.id)}”</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={SECONDARY} disabled={!!state.busy} onClick={() => void controller.checkEvidence(o.id)}>Check with SecurePay</button>
            <button type="button" className={SECONDARY} disabled={!!state.busy} onClick={() => void controller.submitStatement(o.id)}>Try submitting again</button>
          </div>
        </div>}
      </div>}
    </li>;
  };

  const placed = new Set<string>();
  const milestoneBlocks = detail.milestones.map(m => {
    const items = currentList.filter(o => m.obligationIds.includes(o.id)); items.forEach(o => placed.add(o.id));
    const eff = effective(m.milestoneId);
    const word = effectiveStates === null ? null : eff ? milestoneStateWord(eff.state) : null;
    const why = eff?.state === 'WAITING' ? milestoneReasonWords(eff.reason, titleOfMilestone) : null;
    return <section key={m.milestoneId} aria-label={m.title} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="break-words font-display text-[1.05rem] text-forest-800">{m.title}</h3>
        <span className="text-[0.78rem] font-medium text-sand-700">{effectiveStates === null ? 'Milestone status couldn’t be loaded' : word ?? 'Status unavailable'}</span>
      </div>
      {m.description && <p className="break-words text-[0.85rem] text-sand-700">{m.description}</p>}
      {why && <p className="text-[0.82rem] text-sand-800">{why}</p>}
      {items.length > 0 ? <ul className="space-y-3">{items.map(card)}</ul> : <p className="text-[0.82rem] text-sand-600">No work is listed for this milestone.</p>}
    </section>;
  });
  const rest = currentList.filter(o => !placed.has(o.id));

  return <section aria-label="Work in this Agreement" className="space-y-4">
    <div className={`rounded-2xl border px-4 py-3 ${facts.tone === 'complete' ? 'border-forest-200 bg-forest-50' : 'border-cream-200 bg-white'}`}>
      <h3 className="font-display text-[1.05rem] text-forest-800">{facts.headline}</h3>
      <p className="text-[0.85rem] leading-snug text-sand-800">{facts.text}</p>
      {facts.completedAt && <p className="text-[0.78rem] text-sand-600">Completed {dateOf(facts.completedAt)}</p>}
    </div>
    {/* An outcome about work that is no longer current (e.g. the Agreement moved on) has no card to sit on: say it here. */}
    {Object.entries(state.notices).filter(([oid]) => !currentList.some(o => o.id === oid)).map(([oid, n]) => <div key={oid} role={n.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2 text-[0.82rem] ${tone(n)}`}>{n.text}</div>)}
    {state.nextActions.status === 'error' && <p className="text-[0.82rem] text-sand-700">SecurePay’s next steps couldn’t be loaded, so no actions are shown here.</p>}
    {state.obligations.status === 'loading' && <p role="status" className="text-[0.85rem] text-sand-600">Loading the work in this Agreement…</p>}
    {state.obligations.status === 'error' && <p className="text-[0.85rem] text-sand-700">The work in this Agreement couldn’t be loaded right now. <button type="button" className={`underline ${FOCUS}`} onClick={() => void controller.load()}>Try again</button></p>}
    {state.obligations.status === 'ready' && currentList.length === 0 && <p className="text-[0.85rem] text-sand-600">This version of the Agreement doesn’t list any work.</p>}
    {milestoneBlocks}
    {state.obligations.status === 'ready' && rest.length > 0 && <div className="space-y-2">{detail.milestones.length > 0 && <h3 className="font-display text-[1.05rem] text-forest-800">Other work</h3>}<ul className="space-y-3">{rest.map(card)}</ul></div>}
    {otherVersions > 0 && <p className="text-[0.75rem] text-sand-500">{otherVersions} {otherVersions === 1 ? 'obligation belongs' : 'obligations belong'} to earlier versions and {otherVersions === 1 ? 'isn’t' : 'aren’t'} shown as current work.</p>}
  </section>;
}
