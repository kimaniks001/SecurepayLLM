import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AgreementFormation, FormationTerm } from './view';

/**
 * Entry Perfection Phase 6 -- REVIEW: "What does SecurePay think we are agreeing?" In human agreement language, from the
 * server's canonical projection only. Scannable sections, the current value of every term (a corrected source figure is
 * history, never the value), calm "Needs checking" points, evidence one tap away, corrections in plain words to KS001, and
 * the one explicit action that can lead to confirmation: "Set this up securely" (pinned to the version shown here).
 */
export function AgreementReview({ formation, changes, busy, checking, error, onBack, onCheck, onCorrect, onSetUp, onAcknowledgeChanges, setUp }: {
  formation: AgreementFormation; changes: string[]; busy: boolean; checking: string | null; error: string | null;
  onBack: () => void; onCheck: (openPointId: string) => void; onCorrect: (text: string) => void; onSetUp: (version: number) => void;
  onAcknowledgeChanges: () => void; setUp: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [correction, setCorrection] = useState('');
  useEffect(() => { heading.current?.focus(); }, []);
  const needsChecking = formation.openPoints.filter(p => p.blocksConfirmation || !p.checked);
  const checked = formation.openPoints.filter(p => !p.blocksConfirmation && p.checked);
  return <section aria-labelledby="agreement-review-title" className="space-y-4 pb-6">
    <button type="button" onClick={onBack} className="min-h-11 text-[0.85rem] text-forest-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">← Back to the conversation</button>
    <div>
      <h2 id="agreement-review-title" ref={heading} tabIndex={-1} className="font-display text-lg text-forest-800 focus:outline-none">Review this agreement</h2>
      <p className="mt-1 text-[0.85rem] leading-snug text-sand-600">This is what SecurePay understands so far. Nothing is agreed until you set it up.</p>
    </div>

    {changes.length > 0 && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-forest-200 bg-forest-50 px-3.5 py-2.5 text-[0.85rem] text-forest-800">
      <span>Updated: {changes.join('; ')}.</span>
      <button type="button" onClick={onAcknowledgeChanges} className="min-h-11 shrink-0 px-1 text-[0.8rem] underline">OK</button>
    </div>}

    {formation.summary && <p className="rounded-xl bg-white/80 px-3.5 py-3 text-[0.95rem] leading-snug text-forest-900 shadow-soft">{formation.summary}</p>}
    {formation.origin && <p className="text-[0.8rem] text-sand-600">Started from the {formation.origin.type.toLowerCase()} offer “{formation.origin.title}”{formation.origin.offeredBy ? ` offered by ${formation.origin.offeredBy}` : ''}{formation.origin.priceNow ? ` · current price ${formation.origin.priceNow}` : ''}.</p>}

    {needsChecking.length > 0 && <div aria-labelledby="review-open-points" className="rounded-2xl border border-ember-200 bg-ember-50/60 px-4 py-3">
      <h3 id="review-open-points" className="text-[0.8rem] font-semibold uppercase tracking-wide text-sand-700">Needs checking</h3>
      <ul className="mt-2 space-y-2.5">
        {needsChecking.map(p => <li key={p.id} className="text-[0.88rem] leading-snug text-sand-800">
          <p>{p.text}</p>
          {p.checkable && <button type="button" disabled={busy || checking === p.id} onClick={() => onCheck(p.id)}
            className="mt-1 inline-flex min-h-11 items-center rounded-full border border-forest-300 bg-white px-4 text-[0.82rem] text-forest-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
            {checking === p.id ? 'Saving…' : 'Mark as checked'}
          </button>}
          {!p.checkable && <p className="mt-0.5 text-[0.78rem] text-sand-600">Tell KS001 which is right below — the agreement updates straight away.</p>}
        </li>)}
      </ul>
    </div>}

    <Section title="What" terms={formation.what} />
    {formation.who.length > 0 && <div>
      <h3 className="px-1 pb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-sand-500">Who</h3>
      <ul className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white/85">
        {formation.who.map(p => <li key={p.key} className="px-4 py-2.5 text-[0.9rem]">
          <span className="text-forest-800">{p.name}</span>{p.role && <span className="text-sand-600"> · {p.role}</span>}
          <span className="block text-[0.78rem] text-sand-500">{p.identity === 'VERIFIED' ? `${p.ksNumber} · verified on SecurePay` : p.describedAs}</span>
        </li>)}
      </ul>
    </div>}
    <Section title="Money" terms={formation.money} />
    <Section title="When" terms={formation.when} />
    {formation.responsibilities.map(g => <Section key={g.party} title={`${g.party} will`} terms={g.duties} />)}
    <Section title="Conditions" terms={formation.conditions} />
    <Section title="Not included" terms={formation.notIncluded} />

    {/* Entry Perfection Phase 7 (UR-259) -- checked is "I've seen it", not "it's settled": it stays visibly open. */}
    {checked.length > 0 && <p className="text-[0.78rem] text-sand-500">Checked by you — still open: {checked.map(p => p.text).join(' · ')}</p>}

    <form className="rounded-2xl border border-cream-200 bg-white/85 p-3" onSubmit={e => { e.preventDefault(); if (correction.trim()) { onCorrect(correction.trim()); setCorrection(''); } }}>
      <label htmlFor="review-correction" className="block text-[0.82rem] text-forest-800">Something not right? Tell KS001 in your own words.</label>
      <div className="mt-2 flex gap-2">
        <input id="review-correction" value={correction} onChange={e => setCorrection(e.target.value)} placeholder="e.g. It’s 185,000, not 180"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-cream-300 px-3 text-[0.9rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300" />
        <button type="submit" disabled={busy || !correction.trim()} className="min-h-11 shrink-0 rounded-full border border-forest-300 px-4 text-[0.85rem] text-forest-700 disabled:opacity-40">Send</button>
      </div>
    </form>

    {error && <p role="alert" className="text-[0.85rem] text-ember-800">{error}</p>}
    <div className="space-y-2">
      <button type="button" disabled={busy || !formation.confirmable} onClick={() => onSetUp(formation.version)}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-forest-700 px-5 text-[0.95rem] font-medium text-white hover:bg-forest-800 disabled:bg-sand-300 disabled:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 sm:w-auto">
        Set this up securely
      </button>
      <p className="text-[0.78rem] text-sand-600">{formation.confirmable ? 'You’ll sign in if you haven’t already. Nothing is agreed until you set it up.' : formation.confirmationBlockedReason}</p>
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
