import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
import { REVIEW_MAX_NARRATIVE } from '../../api/securepay/agreement-review';
import type { ReviewCaseDetailResponse, ReviewCaseSummaryResponse, ReviewEvidenceItemResponse, ReviewResponseType } from '../../api/securepay/agreement-review/dto';
import type { AgreementGateway } from '../../api/securepay/agreements';
import { createAttemptStore } from '../money/attempt';
import { ACK_WORDS, OUTCOME_WORDS, RESPOND_WORDS, runAcknowledge, runRespond, validateNarrative, type CaseContext, type ReviewOutcome } from './actions';
import {
  MONEY_MAY_BE_AFFECTED, OUTCOME_NOT_MONEY, RESPONSE_TYPE_WORDS, VERSION_SCOPE_WORDS, deadlineLine, evidenceSize, evidenceTypeWords, outcomeWords, participantActions,
  reasonWords, roleWords, stateGroup, stateWords, subjectLabel, versionNumberWords, versionScope, type SubjectLookup,
} from './display';

/** Independent reads: an unread fact is UNKNOWN, never zero/none. */
export type Read<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T; refreshing: boolean };
function useRead<T>(load: () => Promise<T>, key: string): [Read<T>, () => void] {
  const [state, setState] = useState<Read<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    // A re-read keeps the previous data on screen (marked refreshing) so local state below it -- an unresolved attempt, a draft -- is never unmounted.
    setState(prev => prev.status === 'ready' ? { ...prev, refreshing: true } : { status: 'loading' });
    load().then(data => { if (live) setState({ status: 'ready', data, refreshing: false }); }).catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return [state, useCallback(() => setTick(n => n + 1), [])];
}

const Note = ({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warn' }) =>
  <p role={tone === 'warn' ? 'alert' : undefined} className={`text-sm ${tone === 'warn' ? 'text-ember-700' : 'text-sand-600'}`}>{children}</p>;
const Label = ({ children }: { children: React.ReactNode }) => <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{children}</div>;
const btn = 'rounded-xl border border-cream-200 px-3 py-2 text-sm text-forest-800 hover:border-forest-300 hover:bg-cream-50 disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = 'rounded-xl bg-forest-700 px-3 py-2 text-sm text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed';

export const REVIEW_OPEN_WITHHELD = 'Starting a formal review from this screen is temporarily unavailable while SecurePay completes the participant handoff into the review.';
export const EVIDENCE_UPLOAD_WITHHELD = 'SecurePay can show evidence already recorded on this review. Adding new evidence from this screen is temporarily unavailable until formal review evidence has durable storage and retrieval.';
const EVIDENCE_STATES = new Set(['OPENED', 'AWAITING_RESPONSE', 'EVIDENCE_COLLECTION', 'UNDER_REVIEW']);

/**
 * The one canonical Agreement Review surface, reached from the Agreement's Support tab ("Reviews & issues"). Existing cases are read (list, detail,
 * evidence metadata) and the two participant commands the repository proves safe -- acknowledge and respond -- are offered. Opening a review, adding
 * evidence and requesting escalation are withheld (see docs/UI_COMPLETION_PHASE9_AGREEMENT_REVIEW.md). Nothing here computes or implies a financial effect.
 */
export function ReviewPanel({ gateway, agreementGateway, agreementId, currentVersionId, onOpenMoney }: {
  gateway: Pick<AgreementReviewGateway, 'list' | 'detail' | 'evidence' | 'acknowledge' | 'respond'>;
  agreementGateway: Pick<AgreementGateway, 'obligations' | 'versions'>;
  agreementId: string;
  /** From the exact Agreement Detail read (Phase 5/8). null = couldn't be established -> neutral version wording. */
  currentVersionId: string | null;
  onOpenMoney?: () => void;
}) {
  const [cases, refreshCases] = useRead(() => gateway.list({ agreementId, size: 50 }), agreementId);
  const [versions] = useRead(async () => new Map((await agreementGateway.versions(agreementId)).map(v => [v.id, v.versionNumber] as const)), agreementId);
  const [obligations] = useRead(async () => new Map((await agreementGateway.obligations(agreementId)).map(o => [o.id, o.title] as const)), agreementId);
  const [selected, setSelected] = useState<string | null>(null);
  const [extra, setExtra] = useState<ReviewCaseSummaryResponse[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [moreState, setMoreState] = useState<'idle' | 'loading' | 'error'>('idle');
  useEffect(() => { setExtra([]); setNextPage(1); setMoreState('idle'); }, [agreementId, cases.status === 'loading']);
  const loadMore = async () => {
    setMoreState('loading');
    try { const page = await gateway.list({ agreementId, size: 50, page: nextPage }); setExtra(prev => [...prev, ...page.items]); setNextPage(n => n + 1); setMoreState('idle'); }
    catch { setMoreState('error'); }
  };
  const lookup: SubjectLookup = useMemo(() => ({
    versions: versions.status === 'ready' ? versions.data : null,
    obligations: obligations.status === 'ready' ? obligations.data : null,
  }), [versions, obligations]);

  const merged: Read<{ items: ReviewCaseSummaryResponse[]; totalElements: number }> = cases.status === 'ready' ? { ...cases, data: { items: [...cases.data.items, ...extra], totalElements: cases.data.totalElements } } : cases;
  const chosen = merged.status === 'ready' ? merged.data.items.find(c => c.reviewCaseId === selected) ?? null : null;
  if (selected && chosen) {
    return <CaseView key={chosen.reviewCaseId} gateway={gateway} summary={chosen} lookup={lookup} currentVersionId={currentVersionId} onBack={() => { setSelected(null); refreshCases(); }} onOpenMoney={onOpenMoney} />;
  }

  return <ReviewListView cases={merged} lookup={lookup} currentVersionId={currentVersionId} onOpen={setSelected} onMore={() => void loadMore()} moreState={moreState} />;
}

export function ReviewListView({ cases, lookup, currentVersionId, onOpen, onMore, moreState = 'idle' }: {
  cases: Read<{ items: ReviewCaseSummaryResponse[]; totalElements: number }>; lookup: SubjectLookup; currentVersionId: string | null; onOpen: (reviewCaseId: string) => void; onMore?: () => void; moreState?: 'idle' | 'loading' | 'error';
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 space-y-4" data-testid="review-panel">
      <div>
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Reviews &amp; issues</div>
        <p className="text-[0.85rem] text-sand-600 mt-1">Formal reviews on this Agreement, and what SecurePay says about each. A review looks at one part of the Agreement; it does not rewrite the Agreement or move money by itself.</p>
      </div>
      {cases.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading reviews…</p>}
      {cases.status === 'error' && <Note tone="warn">Reviews couldn’t be loaded. That doesn’t mean there are none.</Note>}
      {cases.status === 'ready' && cases.data.items.length === 0 && <Note>No formal reviews on this Agreement.</Note>}
      {cases.status === 'ready' && cases.data.items.length > 0 && (['active', 'history', 'unknown'] as const).map(group => {
        const rows = cases.data.items.filter(c => stateGroup(c.state) === group);
        if (rows.length === 0) return null;
        return (
          <div key={group} className="space-y-2">
            <Label>{group === 'active' ? 'Active reviews' : group === 'history' ? 'Review history' : 'Other reviews'}</Label>
            <ul className="space-y-2">{rows.map(c => <CaseRow key={c.reviewCaseId} c={c} lookup={lookup} currentVersionId={currentVersionId} onOpen={() => onOpen(c.reviewCaseId)} />)}</ul>
          </div>
        );
      })}
      {cases.status === 'ready' && cases.data.totalElements > cases.data.items.length && (
        <div className="space-y-1">
          <Note>Showing {cases.data.items.length} of {cases.data.totalElements} reviews.</Note>
          {onMore && <button onClick={onMore} disabled={moreState === 'loading'} className={btn}>Show more reviews</button>}
          {moreState === 'error' && <Note tone="warn">More reviews couldn’t be loaded.</Note>}
        </div>
      )}
      <Note>{REVIEW_OPEN_WITHHELD}</Note>
    </div>
  );
}

function CaseRow({ c, lookup, currentVersionId, onOpen }: { c: ReviewCaseSummaryResponse; lookup: SubjectLookup; currentVersionId: string | null; onOpen: () => void }) {
  const scope = versionScope(c.agreementVersionId, currentVersionId);
  return (
    <li>
      <button onClick={onOpen} data-scope={scope} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
        <div className="font-medium text-forest-800">{subjectLabel(c.subjectType, c.subjectId, lookup)}</div>
        <div className="text-xs text-sand-600">{stateWords(c.state)} · {VERSION_SCOPE_WORDS[scope]}</div>
      </button>
    </li>
  );
}

function CaseView({ gateway, summary, lookup, currentVersionId, onBack, onOpenMoney }: {
  gateway: Pick<AgreementReviewGateway, 'detail' | 'evidence' | 'acknowledge' | 'respond'>;
  summary: ReviewCaseSummaryResponse; lookup: SubjectLookup; currentVersionId: string | null; onBack: () => void; onOpenMoney?: () => void;
}) {
  const [detail, refreshDetail] = useRead<ReviewCaseDetailResponse>(() => gateway.detail(summary.reviewCaseId, summary.agreementId), summary.reviewCaseId);
  const [evidence, refreshEvidence] = useRead(async () => (await gateway.evidence(summary.reviewCaseId, summary.agreementId)).items, summary.reviewCaseId);
  const refreshAll = () => { refreshDetail(); refreshEvidence(); };
  return (
    <CaseDetailView summary={summary} detail={detail} evidence={evidence} lookup={lookup} currentVersionId={currentVersionId} onBack={onBack} onRefresh={refreshAll} onOpenMoney={onOpenMoney}
      yourPart={<YourPart gateway={gateway} summary={summary} d={detail.status === 'ready' ? detail.data : null} refreshing={detail.status === 'ready' && detail.refreshing} refresh={refreshAll} />} />
  );
}

export function CaseDetailView({ summary, detail, evidence, lookup, currentVersionId, onBack, onRefresh, onOpenMoney, yourPart, now = new Date() }: {
  summary: ReviewCaseSummaryResponse; detail: Read<ReviewCaseDetailResponse>; evidence: Read<ReviewEvidenceItemResponse[]>; lookup: SubjectLookup; currentVersionId: string | null;
  onBack: () => void; onRefresh: () => void; onOpenMoney?: () => void; yourPart: React.ReactNode; now?: Date;
}) {
  // The list summary is enough to say WHAT and WHICH VERSION even if the detail read fails; the detail read adds the caller's own facts.
  const d = detail.status === 'ready' ? detail.data : null;
  const state = d?.state ?? summary.state;
  const scope = versionScope(summary.agreementVersionId, currentVersionId);
  const caseVersionWords = versionNumberWords(summary.agreementVersionId, lookup);
  const response = deadlineLine('Response deadline', d?.responseDeadlineAt ?? summary.responseDeadlineAt, state, now);
  const evidenceBy = deadlineLine('Evidence deadline', d?.evidenceDeadlineAt ?? summary.evidenceDeadlineAt, state, now);
  const outcome = d?.terminalOutcome ?? summary.terminalOutcome;
  const role = roleWords(d?.callerRole ?? summary.callerRole);

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 space-y-4" data-testid="review-case">
      <button onClick={onBack} className="text-xs text-forest-700 underline">← All reviews on this Agreement</button>

      <section className="space-y-1">
        <Label>What is under review</Label>
        <div className="font-medium text-forest-800">{subjectLabel(summary.subjectType, summary.subjectId, lookup)}</div>
        <div className="text-sm text-sand-700" data-scope={scope}>{VERSION_SCOPE_WORDS[scope]}{caseVersionWords ? ` · ${caseVersionWords}` : ''}</div>
        {scope === 'earlier' && <Note>This review was opened on an earlier version of the Agreement. It remains part of the record.</Note>}
      </section>

      <section className="space-y-1">
        <Label>Where the review stands</Label>
        <div className="text-sm text-forest-800 font-medium">{stateWords(state)}</div>
        {response && <div className="text-sm text-sand-700">{response.text}</div>}
        {response?.passedNote && <Note>{response.passedNote}</Note>}
        {evidenceBy && <div className="text-sm text-sand-700">{evidenceBy.text}</div>}
        {evidenceBy?.passedNote && <Note>{evidenceBy.passedNote}</Note>}
      </section>

      <section className="space-y-2">
        <Label>Your part</Label>
        {detail.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading your part…</p>}
        {detail.status === 'error' && <Note tone="warn">Your part in this review couldn’t be loaded.</Note>}
        {role && <div className="text-sm text-sand-700">{role}</div>}
        {yourPart}
      </section>

      <section className="space-y-2">
        <Label>Evidence</Label>
        {evidence.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading evidence…</p>}
        {evidence.status === 'error' && <Note tone="warn">Evidence list couldn’t be loaded.</Note>}
        {evidence.status === 'ready' && (evidence.data.length === 0
          ? <Note>SecurePay shows no evidence recorded on this review.</Note>
          : <ul className="space-y-1">{evidence.data.map(e => <EvidenceRow key={e.evidenceId} e={e} />)}</ul>)}
        {EVIDENCE_STATES.has(state) && <Note>{EVIDENCE_UPLOAD_WITHHELD}</Note>}
      </section>

      {outcome && (
        <section className="space-y-1" data-testid="review-decision">
          <Label>What SecurePay decided</Label>
          <div className="text-sm text-forest-800 font-medium">{outcomeWords(outcome)}</div>
          {d?.decisionReasonCode && <div className="text-sm text-sand-700">{reasonWords(d.decisionReasonCode)}</div>}
          <Note>{OUTCOME_NOT_MONEY}</Note>
        </section>
      )}
      {!outcome && stateGroup(state) === 'active' && <Note>SecurePay hasn’t recorded a decision on this review.</Note>}
      {(state === 'UNDER_REVIEW' || state === 'DECISION_PENDING') && <Note>Requesting escalation from this screen isn’t available.</Note>}

      <section className="space-y-1">
        <Label>Money</Label>
        <Note>{stateGroup(state) === 'active' ? MONEY_MAY_BE_AFFECTED : OUTCOME_NOT_MONEY}</Note>
        {onOpenMoney && <button onClick={onOpenMoney} className={btn}>Open Money for the current financial effect</button>}
      </section>
      <button onClick={onRefresh} className="text-xs text-forest-700 underline">Refresh this review</button>
    </div>
  );
}

function EvidenceRow({ e }: { e: ReviewEvidenceItemResponse }) {
  return (
    <li className="text-sm text-sand-700 rounded-xl border border-cream-200 px-3 py-2">
      <div className="font-medium text-forest-800 break-words">{e.originalFilename}</div>
      <div className="text-xs text-sand-600">{evidenceTypeWords(e.evidenceType)} · {e.mediaType} · {evidenceSize(e.contentLength)} · {new Date(e.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{e.submittedByCaller ? ' · Added by you' : ''}</div>
    </li>
  );
}

type Pending = { kind: 'ack'; ctx: CaseContext } | { kind: 'respond'; ctx: CaseContext; responseType: ReviewResponseType; narrative: string };

/**
 * The caller's own facts and the two participant commands. The Review case `version` used as `expectedVersion` is ALWAYS the one on the freshly read
 * case in `d`; an unresolved (uncertain) attempt keeps its ORIGINAL context, frozen, and is retried only as that exact request with its original key.
 */
export function YourPart({ gateway, summary, d, refreshing, refresh }: { gateway: Pick<AgreementReviewGateway, 'detail' | 'acknowledge' | 'respond'>; summary: ReviewCaseSummaryResponse; d: ReviewCaseDetailResponse | null; refreshing: boolean; refresh: () => void }) {
  const [ackAttempts] = useState(() => createAttemptStore());
  const [respondAttempts] = useState(() => createAttemptStore());
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [responseType, setResponseType] = useState<ReviewResponseType>('DISPUTE_POSITION');
  const [narrative, setNarrative] = useState('');
  const [reviewing, setReviewing] = useState(false);
  // Actions exist only while a FRESH case read is in hand (bound to its own `version`); while it is loading/failed nothing new can be started.
  const actions = d && !refreshing ? participantActions(d) : { canAcknowledge: false, canRespond: false };
  const frozen = pending?.kind === 'respond';

  const ctxNow = (): CaseContext => ({ reviewCaseId: summary.reviewCaseId, agreementId: summary.agreementId, expectedVersion: d!.version });

  const settle = (outcome: ReviewOutcome, kind: Pending['kind'], ctx: CaseContext, respond?: { responseType: ReviewResponseType; narrative: string }) => {
    if (outcome.kind === 'ok') {
      setPending(null); setMessage(kind === 'ack' ? ACK_WORDS.ok : RESPOND_WORDS.ok); if (kind === 'respond') { setNarrative(''); setReviewing(false); }
      refresh();
    } else if (outcome.kind === 'uncertain') {
      setPending(kind === 'ack' ? { kind, ctx } : { kind: 'respond', ctx, responseType: respond!.responseType, narrative: respond!.narrative });
      setMessage(OUTCOME_WORDS.uncertain);
    } else if (outcome.kind === 'invalid') {
      setMessage(outcome.problem === 'empty' ? 'Write your response before submitting it.' : `A response can be at most ${REVIEW_MAX_NARRATIVE} characters.`);
    } else {
      // A definite outcome: the attempt is over. Re-read the case so the next action is bound to the current Review case version (never a silent retry).
      setPending(null); setMessage(OUTCOME_WORDS[outcome.kind]); setReviewing(false); refresh();
    }
  };

  const acknowledge = async (ctx: CaseContext = ctxNow()) => { setBusy(true); setMessage(null); const o = await runAcknowledge(gateway, ackAttempts, ctx); settle(o, 'ack', ctx); setBusy(false); };
  const respond = async (ctx: CaseContext = ctxNow(), r = { responseType, narrative }) => { setBusy(true); setMessage(null); const o = await runRespond(gateway, respondAttempts, ctx, r); settle(o, 'respond', ctx, r); setBusy(false); };

  // "Check what happened": a re-read is the proof. The caller's own acknowledged/responded fact settles an uncertain attempt; otherwise the same request stays retryable.
  const check = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const fresh = await gateway.detail(summary.reviewCaseId, summary.agreementId);
      if (pending.kind === 'ack' && fresh.callerAcknowledged) { ackAttempts.settle(); setPending(null); setMessage(ACK_WORDS.already); }
      else if (pending.kind === 'respond' && fresh.callerResponded) { respondAttempts.settle(); setPending(null); setNarrative(''); setReviewing(false); setMessage(RESPOND_WORDS.already); }
      else setMessage('SecurePay doesn’t yet show that it was recorded. You can try the same request again; it can’t be recorded twice.');
      refresh();
    } catch { setMessage('SecurePay couldn’t check just now. You can try the same request again; it can’t be recorded twice.'); }
    setBusy(false);
  };

  const invalid = validateNarrative(narrative);
  return (
    <div className="space-y-3">
      {d?.callerAcknowledged && <div className="text-sm text-sand-700">SecurePay shows that you have acknowledged this review.</div>}
      {d?.callerResponded && <div className="text-sm text-sand-700">SecurePay shows that you have responded.</div>}
      {message && !(message === ACK_WORDS.already && d?.callerAcknowledged) && !(message === RESPOND_WORDS.already && d?.callerResponded) && <p role="status" className="text-sm text-forest-800">{message}</p>}

      {actions.canAcknowledge && pending?.kind !== 'ack' && (
        <div className="space-y-1">
          <p className="text-sm text-sand-700">When you press this, SecurePay will record that you have seen this review — nothing more. It doesn’t mean you agree, accept an allegation or accept an outcome.</p>
          <button onClick={() => void acknowledge()} disabled={busy} className={btn}>Acknowledge this review</button>
        </div>
      )}

      {(actions.canRespond || frozen) && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-forest-800">Your response</div>
          <fieldset disabled={frozen} className="space-y-1">
            <legend className="sr-only">What kind of response</legend>
            {RESPONSE_TYPE_WORDS.map(t => (
              <label key={t.value} className="flex items-start gap-2 text-sm text-sand-700">
                <input type="radio" disabled={frozen} name={`rt-${summary.reviewCaseId}`} value={t.value} checked={responseType === t.value} onChange={() => setResponseType(t.value)} className="mt-1" />
                <span><span className="font-medium text-forest-800">{t.label}</span> — {t.hint}</span>
              </label>
            ))}
          </fieldset>
          <textarea aria-label="Your response" value={narrative} disabled={frozen} maxLength={REVIEW_MAX_NARRATIVE} onChange={e => setNarrative(e.target.value)} rows={5}
            className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" placeholder="Write what you want SecurePay to record" />
          <div className="text-xs text-sand-500">{narrative.length} / {REVIEW_MAX_NARRATIVE}</div>
          {!reviewing && !frozen && <button onClick={() => setReviewing(true)} disabled={busy || !!invalid} className={btn}>Review your response</button>}
          {(reviewing || frozen) && (
            <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-2" data-testid="response-consequence">
              <p className="text-sm text-sand-700">When you press submit, SecurePay will record your formal response against this exact review. It records what you say; it does not decide the review.</p>
              {frozen
                ? <div className="flex flex-wrap gap-2">
                    <button onClick={() => pending!.kind === 'respond' && void respond(pending.ctx, { responseType: pending.responseType, narrative: pending.narrative })} disabled={busy} className={btnPrimary}>Try the same request again</button>
                    <button onClick={() => void check()} disabled={busy} className={btn}>Check what happened</button>
                  </div>
                : <div className="flex flex-wrap gap-2">
                    <button onClick={() => void respond()} disabled={busy || !!invalid} className={btnPrimary}>Submit response</button>
                    <button onClick={() => setReviewing(false)} disabled={busy} className={btn}>Edit</button>
                  </div>}
            </div>
          )}
        </div>
      )}
      {pending?.kind === 'ack' && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void acknowledge(pending.ctx)} disabled={busy} className={btnPrimary}>Try the same request again</button>
          <button onClick={() => void check()} disabled={busy} className={btn}>Check what happened</button>
        </div>
      )}
    </div>
  );
}
