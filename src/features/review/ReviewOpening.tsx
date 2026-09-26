import { useState } from 'react';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
import type { ReviewV2Case, ReviewV2Preflight, ReviewV2SubjectOption } from '../../api/securepay/agreement-review/dto';
import { decimalMoney } from '../../decimalMoney';
import { createAttemptStore } from '../money/attempt';
import { OPEN_WORDS, runOpenV2, type OpenOutcome } from './actions';
import {
  REVIEW_REASON_WORDS, V2_BOUNDARY, openingUnavailableWords, subjectUnavailableWords, v2RestrictedWords, v2RoleWords, v2StateWords, v2SubjectWords,
} from './display';

const btn = 'rounded-xl border border-cream-200 px-3 py-2 text-sm text-forest-800 hover:border-forest-300 hover:bg-cream-50 disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = 'rounded-xl bg-forest-700 px-3 py-2 text-sm text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed';
const label = 'text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide';
const money = (minor: number, currency: string) => decimalMoney(String(minor), currency);

type Read<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/** Phase 7 Slice 6B -- the formal Reviews (v2) the caller takes part in, in words. Unread is never "none". */
export function V2CaseList({ cases }: { cases: Read<ReviewV2Case[]> }) {
  if (cases.status === 'loading') return <p role="status" className="text-sm text-sand-500">Loading formal reviews…</p>;
  if (cases.status === 'error') return <p role="alert" className="text-sm text-ember-700">Formal reviews couldn’t be loaded. That doesn’t mean there are none.</p>;
  if (cases.data.length === 0) return <p className="text-sm text-sand-600">No formal reviews you take part in on this Agreement.</p>;
  return (
    <ul className="space-y-2" data-testid="review-v2-cases">
      {cases.data.map(c => (
        <li key={c.reviewCaseId} className="rounded-xl border border-cream-200 p-3 space-y-1">
          <div className="font-medium text-forest-800">{c.subject}</div>
          <div className="text-sm text-sand-700">{v2StateWords(c.state)}</div>
          <div className="text-xs text-sand-600">
            {money(c.affectedAmountMinor, c.currency)} under review · {c.releaseRestricted ? 'release of this is restricted while it is open' : 'release is no longer restricted by this review'}
          </div>
          <div className="text-xs text-sand-600">You: {v2RoleWords(c.yourRole)} · Taking part: {c.people.filter(p => !p.isYou).map(p => p.name).join(', ') || 'only you'}</div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Phase 7 Slice 6B -- "Start a formal review". Only what SecurePay's preflight offers can be chosen; SecurePay decides what becomes restricted, the
 * amount and who takes part, and the person confirms explicitly before anything is sent. One opening = one request = one key: an uncertain result
 * retries the same request or is settled from the list of reviews.
 */
export function StartFormalReview({ gateway, preflight, onOpened, onCancel }: {
  gateway: Pick<AgreementReviewGateway, 'v2Open' | 'v2Cases'>; preflight: ReviewV2Preflight; onOpened: () => void; onCancel: () => void;
}) {
  const [attempts] = useState(() => createAttemptStore());
  const [subject, setSubject] = useState<ReviewV2SubjectOption | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<OpenOutcome['kind'] | null>(null);
  const reasons = preflight.reasonCodes.filter(code => REVIEW_REASON_WORDS[code]);
  const locked = busy || outcome === 'uncertain';

  const request = () => ({ agreementId: preflight.agreementId, expectedAgreementVersionId: preflight.currentVersionId, subjectType: subject!.subjectType, subjectId: subject!.subjectId, reasonCode: reason! });
  const open = async () => {
    setBusy(true);
    const result = await runOpenV2(gateway, attempts, request());
    setOutcome(result.kind); setBusy(false);
    if (result.kind === 'ok') onOpened();
  };
  // "Check what happened": the caller's own list of reviews is the proof -- a review on this exact subject that they opened.
  const check = async () => {
    setBusy(true);
    try {
      const listed = await gateway.v2Cases(preflight.agreementId);
      const expected = v2SubjectWords(subject!);
      if (listed.items.some(c => c.openedByYou && c.subject === expected)) { attempts.settle(); setOutcome('ok'); onOpened(); }
      else setOutcome('uncertain');
    } catch { setOutcome('uncertain'); }
    setBusy(false);
  };

  return (
    <div className="space-y-4 rounded-xl border border-cream-200 p-4" data-testid="start-formal-review">
      <section className="space-y-2">
        <div className={label}>1 · What is the problem about?</div>
        <ul className="space-y-1.5">
          {preflight.subjects.map(option => (
            <li key={`${option.subjectType}:${option.subjectId}`}>
              <label className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${option.available ? 'border-cream-200 cursor-pointer' : 'border-cream-100 text-sand-500'}`}>
                <input type="radio" name="review-subject" disabled={!option.available || locked} checked={subject === option}
                  onChange={() => { setSubject(option); setUnderstood(false); setOutcome(null); }} className="mt-1" />
                <span>
                  <span className="block text-forest-800">{v2SubjectWords(option)}</span>
                  {!option.available && <span className="block text-xs">{subjectUnavailableWords(option.unavailableReason)}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {subject && <section className="space-y-2">
        <div className={label}>2 · What happened?</div>
        <ul className="space-y-1.5">
          {reasons.map(code => (
            <li key={code}>
              <label className="flex items-center gap-2 text-sm text-forest-800">
                <input type="radio" name="review-reason" disabled={locked} checked={reason === code} onChange={() => { setReason(code); setUnderstood(false); }} />
                {REVIEW_REASON_WORDS[code]}
              </label>
            </li>
          ))}
        </ul>
      </section>}

      {subject && reason && <section className="space-y-2" data-testid="review-open-summary">
        <div className={label}>3 · What will happen</div>
        <dl className="space-y-1 text-sm">
          <div><dt className="inline text-sand-600">Restricted from release while the review is open: </dt><dd className="inline text-forest-800">{v2RestrictedWords(subject)}</dd></div>
          <div><dt className="inline text-sand-600">Amount under review: </dt><dd className="inline text-forest-800">{money(subject.affectedAmountMinor, preflight.currency)}</dd></div>
          <div><dt className="inline text-sand-600">Taking part with you: </dt><dd className="inline text-forest-800">{subject.people.map(p => `${p.name} (${v2RoleWords(p.role).toLowerCase()})`).join(', ')}</dd></div>
          {subject.interruptsReleaseCountdown && <div className="text-forest-800">The 48-hour release countdown running on this will stop.</div>}
          <div className="text-sand-700">Each person taking part holds a refundable Review Reserve of {money(preflight.reviewReserveMinimumMinor, preflight.currency)} while the review is open. It is not a charge. {subject.allReserveReady ? 'Everyone’s Review Reserve is ready.' : subject.yourReserveReady ? 'Yours is ready, but someone else’s isn’t yet.' : 'Yours isn’t ready yet.'}</div>
        </dl>
        <p className="text-xs text-sand-600">{V2_BOUNDARY}</p>
        <label className="flex items-start gap-2 text-sm text-forest-800">
          <input type="checkbox" checked={understood} disabled={locked} onChange={e => setUnderstood(e.target.checked)} className="mt-1" />
          I understand what opening this formal review will do.
        </label>
      </section>}

      {outcome && <p role={outcome === 'ok' || outcome === 'uncertain' ? 'status' : 'alert'} className="text-sm text-forest-800">{OPEN_WORDS[outcome]}</p>}
      <div className="flex flex-wrap gap-2">
        {outcome === 'uncertain'
          ? <>
              <button onClick={() => void open()} disabled={busy} className={btnPrimary}>Try the same request again</button>
              <button onClick={() => void check()} disabled={busy} className={btn}>Check what happened</button>
            </>
          : outcome !== 'ok' && <>
              <button onClick={() => void open()} disabled={busy || !subject || !reason || !understood || !subject.available} className={btnPrimary}>{busy ? 'Opening…' : 'Open formal review'}</button>
              <button onClick={onCancel} disabled={busy} className={btn}>Cancel</button>
            </>}
      </div>
    </div>
  );
}

/** Whether (and why not) a formal review can be started here, from SecurePay's preflight. */
export function OpeningAvailability({ preflight, onStart }: { preflight: Read<ReviewV2Preflight>; onStart: () => void }) {
  if (preflight.status === 'loading') return <p role="status" className="text-sm text-sand-500">Checking whether a formal review can be started…</p>;
  if (preflight.status === 'error') return <p className="text-sm text-sand-600">SecurePay couldn’t check whether a formal review can be started here just now.</p>;
  if (preflight.data.openingAvailable) return <button onClick={onStart} className={btn}>Start a formal review</button>;
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-sand-600">{openingUnavailableWords(preflight.data.unavailableReason)}</p>
      {/* Nothing to choose, but each subject SecurePay considered is listed with its own reason (read-only; no control). */}
      {preflight.data.subjects.length > 0 && <ul className="space-y-1" data-testid="review-subjects-unavailable">
        {preflight.data.subjects.map(s => (
          <li key={`${s.subjectType}:${s.subjectId}`} className="text-sm">
            <span className="text-forest-800">{v2SubjectWords(s)}</span>
            <span className="block text-xs text-sand-600">{subjectUnavailableWords(s.unavailableReason)}</span>
          </li>
        ))}
      </ul>}
    </div>
  );
}
