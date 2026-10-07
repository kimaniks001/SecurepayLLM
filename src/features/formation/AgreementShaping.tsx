import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import type { AgreementFormation, FormationOpenPoint, FormationTerm } from './view';
import { NextQuestion } from './NextQuestion';
import { nextStep } from './nextStep';

function firstSettled(terms: FormationTerm[]): FormationTerm | null {
  return terms.find(term => !term.needsChecking) ?? terms[0] ?? null;
}

function MiniTerm({ label, term }: { label: string; term: FormationTerm }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.13em] text-sand-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-forest-900">{term.value}</dd>
      {term.detail && <dd className="mt-0.5 text-[0.74rem] leading-5 text-sand-600">{term.detail}</dd>}
    </div>
  );
}

/**
 * The living Agreement: once the backend says a coherent arrangement is reviewable, the person no longer sees
 * "a chat with some extracted facts". They see their Agreement quietly forming from the SAME server-owned
 * formation projection. No term is re-derived here and nothing displayed as settled becomes Agreement authority.
 */
export function AgreementShaping({ formation, changes = [], onReview, onAnswer, answering = false, onResolvePoint }: {
  formation: AgreementFormation | null; changes?: string[]; onReview: () => void; onAnswer?: (text: string) => void; answering?: boolean;
  onResolvePoint?: (point: FormationOpenPoint) => void;
}) {
  if (!formation) return null;
  const hasShape = formation.stage !== 'NOTHING_YET' && (formation.what.length > 0 || formation.who.length > 0 || formation.money.length > 0
    || formation.when.length > 0 || formation.responsibilities.some(group => group.duties.length > 0) || formation.conditions.length > 0);
  if (!hasShape) return null;

  const step = nextStep(formation);
  const go = () => { if (step.kind === 'point' && onResolvePoint) onResolvePoint(step.point); else onReview(); };
  const settleable = formation.question && onResolvePoint
    ? formation.openPoints.find(point => formation.question!.openPointIds.includes(point.id) && point.sides.some(side => side.choosable)) ?? null
    : null;

  const what = firstSettled(formation.what);
  const money = firstSettled(formation.money);
  const when = firstSettled(formation.when);
  const firstDuty = formation.responsibilities.flatMap(group => group.duties)[0] ?? null;
  const open = formation.openPoints.filter(point => point.blocksConfirmation || !point.checked);
  const people = formation.who.slice(0, 4);
  const capturedCount = formation.what.length + formation.money.length + formation.when.length
    + formation.conditions.length + formation.notIncluded.length + formation.responsibilities.reduce((sum, group) => sum + group.duties.length, 0);

  return (
    <section aria-labelledby="living-agreement-title" className="sp-living-agreement overflow-hidden">
      <div className="sp-living-agreement-glow" aria-hidden="true" />
      <div className="relative px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-forest-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Your agreement is forming
          </div>
          <div className="rounded-full border border-forest-100 bg-white/75 px-3 py-1 text-[0.68rem] font-medium text-sand-600">
            Version {formation.version}
          </div>
        </div>

        <div className="mt-4 max-w-3xl">
          <h2 id="living-agreement-title" className="font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-forest-900 md:text-[1.8rem]">
            {formation.summary || what?.value || 'The shape of what you mean'}
          </h2>
          <p className="mt-2 max-w-2xl text-[0.82rem] leading-6 text-sand-600">
            SecurePay is turning the conversation into something you can actually read, correct and agree to. Nothing is agreed yet.
          </p>
        </div>

        {changes.length > 0 && (
          <div role="status" className="sp-agreement-change mt-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{changes.join(' · ')}</span>
          </div>
        )}

        {people.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {people.map(person => (
              <span key={person.key} className="rounded-full border border-cream-200 bg-white/80 px-3 py-1.5 text-[0.76rem] text-forest-800 shadow-[0_2px_8px_-6px_rgba(36,73,54,.35)]">
                {person.name}{person.role ? <span className="text-sand-500"> · {person.role}</span> : null}
              </span>
            ))}
            {formation.who.length > people.length && <span className="px-1 py-1.5 text-[0.75rem] text-sand-500">+{formation.who.length - people.length} more</span>}
          </div>
        )}

        {(what || money || when || firstDuty) && (
          <dl className="mt-5 grid gap-4 rounded-[1.25rem] border border-cream-200/85 bg-white/78 p-4 shadow-[0_16px_40px_-34px_rgba(36,73,54,.45)] sm:grid-cols-2 lg:grid-cols-4">
            {what && <MiniTerm label={what.label || 'What'} term={what} />}
            {money && <MiniTerm label={money.label || 'Money'} term={money} />}
            {when && <MiniTerm label={when.label || 'When'} term={when} />}
            {firstDuty && <MiniTerm label="Responsibility" term={firstDuty} />}
          </dl>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 text-[0.75rem] text-sand-600">
          {capturedCount > 0 && <span>{capturedCount} {capturedCount === 1 ? 'detail' : 'details'} captured</span>}
          <span aria-hidden="true">·</span>
          <span>{formation.reviewable
            ? (open.length === 0 ? 'Ready for a calm review' : <>{open.length} {open.length === 1 ? 'thing' : 'things'} still worth checking</>)
            : 'Still taking shape'}</span>
          {formation.readingSources.length > 0 && <><span aria-hidden="true">·</span><span>Still reading {formation.readingSources.join(', ')}</span></>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {formation.reviewable ? (
            <>
              <button type="button" onClick={go} data-next-step={step.kind}
                className="sp-primary-action inline-flex min-h-12 items-center gap-2 px-5 text-[0.9rem] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
                {step.kind === 'none' ? 'See the agreement' : step.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              {step.kind !== 'review' && step.kind !== 'none' && (
                <button type="button" onClick={onReview}
                  className="min-h-11 rounded-full px-3 text-[0.8rem] font-medium text-forest-700 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
                  See the whole agreement
                </button>
              )}
            </>
          ) : (
            <p className="rounded-full border border-cream-200 bg-white/70 px-4 py-2.5 text-[0.78rem] text-sand-600">
              Keep talking naturally — this document will keep filling itself in.
            </p>
          )}
        </div>

        {settleable && onResolvePoint ? (
          <div className="mt-4 rounded-[1.1rem] border border-ember-200/80 bg-ember-50/55 px-4 py-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ember-800">One useful thing to settle</p>
            <p className="mt-1 text-[0.9rem] leading-6 text-forest-900">{formation.question!.text}</p>
            <button type="button" onClick={() => onResolvePoint(settleable)} disabled={answering}
              className="mt-2 inline-flex min-h-11 items-center rounded-full border border-forest-300 bg-white px-4 text-[0.84rem] font-medium text-forest-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              Choose what is right
            </button>
          </div>
        ) : onAnswer ? (
          <div className="mt-4">
            <NextQuestion question={formation.question} disabled={answering} onAnswer={onAnswer} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
