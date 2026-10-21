import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { AgreementFormation, FormationOpenPoint, FormationTerm } from './view';
import { NextQuestion } from './NextQuestion';
import { nextStep } from './nextStep';

function firstSettled(terms: FormationTerm[]): FormationTerm | null {
  return terms.find(term => !term.needsChecking) ?? terms[0] ?? null;
}

function Term({ label, term }: { label: string; term: FormationTerm }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">{label}</dt>
      <dd className="mt-1 break-words text-[0.98rem] leading-6 text-forest-900">{term.value}</dd>
      {term.detail && <dd className="mt-0.5 text-[0.8rem] leading-5 text-sand-700">{term.detail}</dd>}
    </div>
  );
}

/**
 * Phase 3 Human Experience — the Agreement itself is the interface.
 * Every visible fact comes from the server-owned formation projection; this component only arranges
 * that truth into a readable document and presents the one server-owned question / next action.
 */
export function AgreementShaping({ formation, changes = [], onReview, onAnswer, answering = false, onResolvePoint }: {
  formation: AgreementFormation | null;
  changes?: string[];
  onReview: () => void;
  onAnswer?: (text: string) => void;
  answering?: boolean;
  onResolvePoint?: (point: FormationOpenPoint) => void;
}) {
  if (!formation) return null;
  const hasShape = formation.stage !== 'NOTHING_YET' && (
    formation.what.length > 0 || formation.who.length > 0 || formation.money.length > 0
    || formation.when.length > 0 || formation.responsibilities.some(group => group.duties.length > 0)
    || formation.conditions.length > 0 || formation.notIncluded.length > 0
  );
  if (!hasShape) return null;

  const step = nextStep(formation);
  const go = () => {
    if (step.kind === 'point' && onResolvePoint) onResolvePoint(step.point);
    else onReview();
  };
  const settleable = formation.question && onResolvePoint
    ? formation.openPoints.find(point => formation.question!.openPointIds.includes(point.id) && point.sides.some(side => side.choosable)) ?? null
    : null;

  const what = firstSettled(formation.what);
  const money = firstSettled(formation.money);
  const when = firstSettled(formation.when);
  const title = formation.summary || what?.value || 'Your Agreement';

  return (
    <section aria-labelledby="living-agreement-title" className="sp-living-agreement overflow-hidden" data-phase3-agreement>
      <div className="sp-living-agreement-glow" aria-hidden="true" />
      <div className="relative px-5 py-5 md:px-7 md:py-7">
        <header className="border-b border-cream-200/80 pb-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-forest-700">Your Agreement is taking shape</p>
          <h2 id="living-agreement-title" className="mt-2 font-display text-[1.7rem] leading-tight tracking-[-0.025em] text-forest-900 md:text-[2rem]">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-[0.84rem] leading-6 text-sand-700">Nothing is agreed yet. You can read this, correct it, and decide what happens next.</p>
        </header>

        {changes.length > 0 && (
          <div role="status" className="sp-agreement-change mt-4" data-agreement-change>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold">Changed</span>
              <span className="ml-1">{changes.join(' · ')}</span>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-x-8 md:grid-cols-2">
          {formation.who.length > 0 && (
            <div className="py-3 first:pt-0">
              <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">People</h3>
              <div className="mt-1 space-y-1">
                {formation.who.map(person => (
                  <p key={person.key} className="text-[0.95rem] text-forest-900">
                    {person.name}{person.role ? <span className="text-sand-600"> · {person.role}</span> : null}
                  </p>
                ))}
              </div>
            </div>
          )}
          {what && <Term label={what.label || 'Work'} term={what} />}
          {money && <Term label={money.label || 'Price'} term={money} />}
          {when && <Term label={when.label || 'When'} term={when} />}
          {formation.responsibilities.map(group => (
            group.duties.length > 0 ? <div key={group.party} className="py-3">
              <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">{group.party} will</h3>
              <ul className="mt-1 space-y-1.5">
                {group.duties.map(term => <li key={term.key} className="text-[0.95rem] leading-6 text-forest-900">{term.value}{term.detail ? <span className="text-sand-700"> · {term.detail}</span> : null}</li>)}
              </ul>
            </div> : null
          ))}
          {formation.conditions.length > 0 && <div className="py-3">
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Conditions</h3>
            <ul className="mt-1 space-y-1.5">{formation.conditions.map(term => <li key={term.key} className="text-[0.95rem] leading-6 text-forest-900">{term.value}</li>)}</ul>
          </div>}
          {formation.notIncluded.length > 0 && <div className="py-3">
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Not included</h3>
            <ul className="mt-1 space-y-1.5">{formation.notIncluded.map(term => <li key={term.key} className="text-[0.95rem] leading-6 text-forest-900">{term.value}</li>)}</ul>
          </div>}
        </div>

        <div className="mt-5 border-t border-cream-200/80 pt-5">
          {settleable && onResolvePoint ? (
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ember-800">One thing needs your attention</p>
              <p className="mt-1 text-[1rem] leading-6 text-forest-900">{formation.question!.text}</p>
              <button type="button" onClick={() => onResolvePoint(settleable)} disabled={answering}
                className="mt-3 inline-flex min-h-11 items-center rounded-full border border-forest-300 bg-white px-4 text-[0.85rem] font-medium text-forest-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
                Choose what is right
              </button>
            </div>
          ) : onAnswer && formation.question ? (
            <div>
              <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ember-800">One thing needs your attention</p>
              <NextQuestion question={formation.question} disabled={answering} onAnswer={onAnswer} />
            </div>
          ) : formation.reviewable ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-forest-900">Everything needed for review is here.</p>
                <p className="mt-1 text-[0.82rem] text-sand-700">Read the Agreement itself before you keep it or involve anyone else.</p>
              </div>
              <button type="button" onClick={go} data-next-step={step.kind}
                className="sp-primary-action inline-flex min-h-12 items-center gap-2 px-5 text-[0.9rem] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
                Review the Agreement <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="text-[0.82rem] leading-6 text-sand-700">Keep talking normally. SecurePay will ask only when something material is still missing.</p>
          )}
        </div>

        {formation.readingSources.length > 0 && <p className="mt-4 text-[0.75rem] text-sand-600">Still reading {formation.readingSources.join(', ')}.</p>}
      </div>
    </section>
  );
}
