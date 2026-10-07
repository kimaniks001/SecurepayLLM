import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Printer, Sparkles } from 'lucide-react';
import type { AgreementFormation, FormationOpenPoint, FormationSide, FormationTerm } from './view';
import type { ResolveOutcome } from './MicroReview';
import type { CorrectionOutcome } from './correction';
import { TURN_MAX_CHARS } from '../entry/lifecycle';

/**
 * Entry Perfection Phase 6 -- REVIEW: "What does SecurePay think we are agreeing?" In human agreement language, from the
 * server's canonical projection only. Scannable sections, the current value of every term (a corrected source figure is
 * history, never the value), calm "Needs checking" points, evidence one tap away, corrections in plain words to KS001, and
 * the one explicit action that can lead to confirmation: "Set this up securely" (pinned to the version shown here).
 */
export function AgreementReview({ formation, changes, busy, checking, error, onBack, onCheck, onCorrect, onRetryCorrection, onResolve, onOpenPoint, onSetUp, onAcknowledgeChanges, setUp, settingUpAs, onUnlink }: {
  formation: AgreementFormation; changes: string[]; busy: boolean; checking: string | null; error: string | null;
  onBack: () => void; onCheck: (openPointId: string) => void; onSetUp: (version: number) => void;
  /**
   * User-Ready Beta Gate 1 (EP-CERT-002) -- resolves only once the outcome is KNOWN. The words stay in the box until it is
   * 'ok'; `onRetryCorrection` re-sends the SAME pending message (never a duplicate) for 'failed' / 'unknown' / 'blocked'.
   * A caller that returns nothing (a static preview) is treated as accepted.
   */
  onCorrect: (text: string) => Promise<CorrectionOutcome> | void;
  onRetryCorrection?: () => Promise<CorrectionOutcome>;
  /** User-Ready Beta Gate 1 (EP-CERT-003) -- settle a disagreement directly: keep this side (server-side, version-pinned). */
  onResolve?: (point: FormationOpenPoint, side: FormationSide) => Promise<ResolveOutcome>;
  /** Opens the one-decision micro-review (e.g. to enter a different amount). */
  onOpenPoint?: (point: FormationOpenPoint) => void;
  onAcknowledgeChanges: () => void; setUp: ReactNode;
  /** Entry Perfection Phase 8 -- who the set-up is FOR: always the signed-in person; `actingFor` is a Business/Organization they
   *  currently act as elsewhere in SecurePay, named so it is never silently assumed. Absent while signed out. */
  settingUpAs?: { signedIn: boolean; actingFor: string | null };
  /** Entry Perfection Phase 9 (UR-266) -- "Not this person" on a linked party. */
  onUnlink?: (partyKey: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [correction, setCorrection] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<{ pointId: string; text: string } | null>(null);
  const resolve = async (point: FormationOpenPoint, side: FormationSide) => {
    if (!onResolve) return;
    setResolving(point.id); setResolveError(null);
    try {
      const outcome = await onResolve(point, side);
      if (!outcome.ok) setResolveError({ pointId: point.id, text: outcome.error });
    } finally { setResolving(null); }
  };
  const [correcting, setCorrecting] = useState(false);
  const [correctionNote, setCorrectionNote] = useState<{ tone: 'ok' | 'problem'; text: string; retry: boolean } | null>(null);
  const settle = (outcome: CorrectionOutcome | void) => {
    if (!outcome || outcome.status === 'ok') {
      setCorrection('');
      setCorrectionNote(outcome?.acknowledgement ? { tone: 'ok', text: outcome.acknowledgement, retry: false } : null);
    } else {
      setCorrectionNote({ tone: 'problem', text: outcome.message, retry: !!onRetryCorrection });
    }
  };
  const run = async (attempt: () => Promise<CorrectionOutcome> | void) => {
    setCorrecting(true);
    try { settle(await attempt()); } finally { setCorrecting(false); }
  };
  const tooLong = correction.trim().length > TURN_MAX_CHARS;
  useEffect(() => { heading.current?.focus(); }, []);
  const needsChecking = formation.openPoints.filter(p => p.blocksConfirmation || !p.checked);
  const checked = formation.openPoints.filter(p => !p.blocksConfirmation && p.checked);
  const documentTitle = formation.what[0]?.value || formation.summary || 'Agreement';
  return <section aria-labelledby="agreement-review-title" className="space-y-4 pb-6">
    <div className="agreement-screen-only flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={onBack} className="min-h-11 text-[0.85rem] text-forest-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">← Back to the conversation</button>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest-200 bg-white px-4 text-[0.82rem] font-semibold text-forest-700 shadow-soft hover:border-forest-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        <Printer className="h-4 w-4" aria-hidden="true" /> Print draft
      </button>
    </div>
    <article data-agreement-print className="sp-agreement-paper space-y-5 px-5 py-6 md:px-8 md:py-8">
      <header className="border-b border-cream-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-forest-700"><Sparkles className="h-4 w-4" aria-hidden="true" /> SecurePay Agreement</div>
          <div className="rounded-full border border-ember-200 bg-ember-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-ember-800">Draft for review · not agreed</div>
        </div>
        <h1 className="mt-5 font-display text-3xl leading-tight tracking-[-0.025em] text-forest-900">{documentTitle}</h1>
        {formation.summary && formation.summary !== documentTitle && <p className="mt-2 max-w-3xl text-[0.95rem] leading-6 text-sand-700">{formation.summary}</p>}
        <p className="mt-3 text-[0.76rem] text-sand-500">Version {formation.version} · built from the current SecurePay understanding</p>
      </header>
      <div className="agreement-screen-only mt-5">
      <h2 id="agreement-review-title" ref={heading} tabIndex={-1} className="font-display text-lg text-forest-800 focus:outline-none">Review this agreement</h2>
      <p className="mt-1 text-[0.85rem] leading-snug text-sand-600">This is what SecurePay understands so far. Nothing is agreed until you set it up.</p>
      </div>

    {changes.length > 0 && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-forest-200 bg-forest-50 px-3.5 py-2.5 text-[0.85rem] text-forest-800">
      <span>Updated: {changes.join('; ')}.</span>
      <button type="button" onClick={onAcknowledgeChanges} className="min-h-11 shrink-0 px-1 text-[0.8rem] underline">OK</button>
    </div>}

    {formation.readingSources.length > 0 && <p role="status" className="rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-[0.85rem] text-sand-700">
      Still reading {formation.readingSources.join(', ')} — you can review what I have so far.</p>}
    {formation.origin && <p className="text-[0.8rem] text-sand-600">Started from the {formation.origin.type.toLowerCase()} offer “{formation.origin.title}”{formation.origin.offeredBy ? ` offered by ${formation.origin.offeredBy} (not a participant yet)` : ''}{formation.origin.priceNow ? ` · current price ${formation.origin.priceNow}` : ''}.</p>}

    {needsChecking.length > 0 && <div aria-labelledby="review-open-points" className="surface-decision px-4 py-3">
      <h3 id="review-open-points" className="text-[0.8rem] font-semibold uppercase tracking-wide text-sand-700">Needs checking</h3>
      <ul className="mt-2 space-y-2.5">
        {needsChecking.map(p => <li key={p.id} className="text-[0.88rem] leading-snug text-sand-800">
          <p>{p.text}</p>
          {p.checkable && <button type="button" disabled={busy || checking === p.id} onClick={() => onCheck(p.id)}
            className="mt-1 inline-flex min-h-11 items-center rounded-full border border-forest-300 bg-white px-4 text-[0.82rem] text-forest-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
            {checking === p.id ? 'Saving…' : 'Mark as checked'}
          </button>}
          {onResolve && p.sides.some(s => s.choosable) ? <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose which is right">
            {p.sides.filter(s => s.choosable).map(s => <button key={s.factId ?? s.value} type="button" disabled={busy || resolving === p.id}
              onClick={() => void resolve(p, s)} aria-label={`Use ${s.value}${s.from ? ` from ${s.from}` : ''}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-forest-300 bg-white px-4 text-[0.82rem] text-forest-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              Use {s.value}{s.from && <span className="text-sand-600">· {s.from}</span>}
            </button>)}
            {onOpenPoint && p.topic === 'MONEY' && <button type="button" onClick={() => onOpenPoint(p)} className="min-h-11 px-1 text-[0.82rem] text-forest-700 underline">Another amount</button>}
          </div>
            : !p.checkable && <p className="mt-0.5 text-[0.78rem] text-sand-600">Tell KS001 which is right below — the agreement updates straight away.</p>}
          {resolveError?.pointId === p.id && <p role="alert" className="mt-1 text-[0.8rem] text-ember-800">{resolveError.text}</p>}
        </li>)}
      </ul>
    </div>}

    <Section title="What" terms={formation.what} />
    {formation.who.length > 0 && <div>
      <h3 className="px-1 pb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-sand-500">Who</h3>
      <ul className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white/85">
        {formation.who.map(p => <li key={p.key} className="px-4 py-2.5 text-[0.9rem]">
          <span className="text-forest-800">{p.name}</span>{p.role && <span className="text-sand-600"> · {p.role}</span>}
          {/* Entry Perfection Phase 8 -- described is never shown as verified; verified is never shown as having agreed. */}
          <span className="block text-[0.78rem] text-sand-500">{p.identity === 'VERIFIED'
            ? `${p.ksNumber} · linked to a verified SecurePay identity · hasn’t joined yet`
            : p.identity === 'MISSING' ? p.describedAs : `${p.describedAs ? `${p.describedAs} · ` : ''}not yet linked to a SecurePay identity`}</span>
          {p.linked && onUnlink && <button type="button" disabled={busy || checking === p.key} onClick={() => onUnlink(p.key)}
            className="mt-1 inline-flex min-h-11 items-center text-[0.8rem] text-forest-700 underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
            aria-label={`Not ${p.name} — unlink this identity`}>{checking === p.key ? 'Unlinking…' : 'Not this person'}</button>}
        </li>)}
      </ul>
      <p className="px-1 pt-1.5 text-[0.75rem] text-sand-500">Nobody else has joined or agreed yet. You can link or invite them after you set this up.</p>
    </div>}
    <Section title="Money" terms={formation.money} />
    <Section title="When" terms={formation.when} />
    {formation.responsibilities.map(g => <Section key={g.party} title={`${g.party} will`} terms={g.duties} />)}
    <Section title="Conditions" terms={formation.conditions} />
    <Section title="Not included" terms={formation.notIncluded} />

    {/* Entry Perfection Phase 7 (UR-259) -- checked is "I've seen it", not "it's settled": it stays visibly open. */}
    {checked.length > 0 && <p className="text-[0.78rem] text-sand-500">Checked by you — still open: {checked.map(p => p.text).join(' · ')}</p>}

      <footer className="mt-7 border-t border-cream-200 pt-4 text-[0.72rem] leading-5 text-sand-500">
        This draft mirrors SecurePay’s current understanding. Printing it does not set up the Agreement, confirm a participant, or move money.
      </footer>
    </article>

    <form className="agreement-screen-only surface-info p-3" onSubmit={e => { e.preventDefault(); const text = correction.trim(); if (text && !tooLong && !correcting) void run(() => onCorrect(text)); }}>
      <label htmlFor="review-correction" className="block text-[0.82rem] text-forest-800">Something not right? Tell KS001 in your own words.</label>
      <div className="mt-2 flex gap-2">
        <input id="review-correction" value={correction} onChange={e => setCorrection(e.target.value)} placeholder="e.g. It’s 185,000, not 180"
          readOnly={correcting} aria-describedby="review-correction-note" aria-invalid={tooLong || undefined}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-cream-300 px-3 text-[0.9rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300" />
        <button type="submit" disabled={busy || correcting || !correction.trim() || tooLong} className="min-h-11 shrink-0 rounded-full border border-forest-300 px-4 text-[0.85rem] text-forest-700 disabled:opacity-40">{correcting ? 'Sending…' : 'Send'}</button>
      </div>
      <div id="review-correction-note" aria-live="polite">
        {tooLong && <p className="mt-2 text-[0.8rem] text-ember-800">That’s longer than a correction. Keep it short here, or paste the longer text into the conversation.</p>}
        {correctionNote && <div className={`mt-2 text-[0.82rem] ${correctionNote.tone === 'ok' ? 'text-forest-800' : 'text-ember-800'}`} role={correctionNote.tone === 'ok' ? 'status' : 'alert'}>
          {correctionNote.tone === 'ok' && <span className="font-display">KS001 · </span>}{correctionNote.text}
          {correctionNote.retry && onRetryCorrection && <button type="button" disabled={correcting} onClick={() => void run(onRetryCorrection)} className="ml-2 min-h-11 underline text-forest-700 disabled:opacity-40">{correcting ? 'Checking…' : 'Try again'}</button>}
        </div>}
      </div>
    </form>

    {error && <p role="alert" className="text-[0.85rem] text-ember-800">{error}</p>}
    <div className="agreement-screen-only space-y-2">
      <button type="button" disabled={busy || !formation.confirmable} onClick={() => onSetUp(formation.version)}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-forest-700 px-5 text-[0.95rem] font-medium text-white hover:bg-forest-800 disabled:bg-sand-300 disabled:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 sm:w-auto">
        Set this up securely
      </button>
      <p className="text-[0.78rem] text-sand-600">{formation.confirmable ? 'You’ll sign in if you haven’t already. Nothing is agreed until you set it up.' : formation.confirmationBlockedReason}</p>
      {settingUpAs?.signedIn && <p className="text-[0.78rem] text-sand-600" data-testid="setting-up-as">
        {settingUpAs.actingFor
          ? `You’ll set this up as yourself, not as ${settingUpAs.actingFor} — setting up an agreement for a business or organization from a conversation isn’t available yet.`
          : 'You’ll set this up as yourself.'}
      </p>}
      {setUp}
    </div>
  </section>;
}

function Section({ title, terms }: { title: string; terms: FormationTerm[] }) {
  if (terms.length === 0) return null;
  return <div>
    <h3 className="px-1 pb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-sand-500">{title}</h3>
    <dl className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white/85">
      {terms.map(t => <div key={t.key} className="px-4 py-2.5">
        {/* "{party} will" already says what a duty is; only a distinct label (e.g. Delivery) is shown for duties. */}
        <dt className={t.label === 'Does' ? 'sr-only' : 'text-[0.75rem] text-sand-600'}>{t.label === 'Does' ? 'Responsibility' : t.label}</dt>
        <dd className="text-[0.95rem] text-forest-900">
          <span className="break-words">{t.value}</span>{t.detail && <span className="text-sand-700"> · {t.detail}</span>}
          <span className="mt-0.5 flex flex-wrap gap-x-2 text-[0.75rem]">
            {t.needsChecking && <span className="font-medium text-ember-800">Needs checking</span>}
            {t.basis === 'INFERRED' && <span className="text-ember-700">SecurePay’s reading</span>}
            {t.history && <span className="text-sand-500">{t.history}</span>}
          </span>
          {t.evidence.length > 0 && <details className="mt-0.5 text-[0.75rem] text-sand-500">
            <summary className="cursor-pointer select-none">From {t.evidence[0].sourceName}{t.evidence[0].locator ? ` · ${t.evidence[0].locator}` : ''}{t.evidence.length > 1 ? ` (+${t.evidence.length - 1} more)` : ''}</summary>
            <ul className="mt-1 space-y-0.5 pl-3">{t.evidence.map((e, i) => <li key={i}>{e.sourceName}{e.locator ? ` · ${e.locator}` : ''}{e.removed ? ' — source removed' : ''}</li>)}</ul>
          </details>}
        </dd>
      </div>)}
    </dl>
  </div>;
}
