import type { AgreementCompletionResponse, AgreementDetailResponse, MilestoneEffectiveStateResponse, WorkspaceNextActionResponse } from '../../api/securepay/agreements/dto';
import { completionFacts } from '../execution/display';
import { ExperiencePathway } from '../experience/ExperiencePathway';
import { Ks001SurfaceGuide } from '../experience/Ks001SurfaceGuide';
import { moneyText, minorFromString } from '../money/amount';
import type { AppView } from '../../types';
import { humanNextActionReason, type CalendarEventView } from './view';

const actionClass = 'min-h-11 rounded-xl border border-cream-200 bg-white px-4 py-3 text-left text-sm text-forest-800 hover:border-forest-400 focus-visible:ring-2 focus-visible:ring-forest-400';

function agreementAmount(detail: AgreementDetailResponse) {
  const minor = minorFromString(detail.overview.proposedAmountMinor);
  return minor == null ? 'Not yet specified' : moneyText(minor, detail.overview.currency);
}

/**
 * Human-first Agreement landing. The deeper record keeps every authority surface, but this projection
 * owns the one customer story: what was agreed, what happens next, where things stand and the next date.
 * It never derives permissions or lifecycle state locally.
 */
export function LivingAgreementOverview({ detail, effectiveStates: _effectiveStates, completion, nextActions, events = [], onProgress, onPeople, onDocuments, onChanges, onMoney, onJourneyNavigate, onAskKs001 }: {
  detail: AgreementDetailResponse;
  effectiveStates: MilestoneEffectiveStateResponse[] | null;
  completion: AgreementCompletionResponse | null;
  nextActions?: WorkspaceNextActionResponse[];
  events?: CalendarEventView[];
  onProgress: () => void;
  onPeople: () => void;
  onDocuments: () => void;
  onChanges: () => void;
  onMoney: () => void;
  onJourneyNavigate?: (view: AppView) => void;
  onAskKs001?: () => void;
}) {
  const facts = completionFacts(completion);
  const next = nextActions?.[0] ?? null;
  const nextDate = events[0] ?? null;
  const amount = agreementAmount(detail);

  return <section aria-label="Agreement at a glance" className="space-y-4">
    <ExperiencePathway active="agreement" onNavigate={onJourneyNavigate} />
    <Ks001SurfaceGuide surface="agreement" onAsk={onAskKs001} />

    <div className="rounded-3xl border border-forest-200 bg-white/85 p-5 md:p-6">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">At a glance</p>
      <h2 className="mt-2 font-display text-2xl text-forest-900 break-words">{detail.overview.purpose || detail.overview.title}</h2>
      {detail.overview.description && <p className="mt-2 text-sm leading-6 text-sand-600 break-words">{detail.overview.description}</p>}
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-cream-50 px-4 py-3">
          <dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Agreement amount</dt>
          <dd className="mt-1 text-sm font-semibold text-forest-900">{amount}</dd>
        </div>
        <div className="rounded-2xl bg-cream-50 px-4 py-3">
          <dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">People</dt>
          <dd className="mt-1 text-sm font-semibold text-forest-900">{detail.participants.length} participant{detail.participants.length === 1 ? '' : 's'}</dd>
        </div>
        <div className="rounded-2xl bg-cream-50 px-4 py-3">
          <dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Version</dt>
          <dd className="mt-1 text-sm font-semibold text-forest-900">{detail.currentVersion ? detail.currentVersion.versionNumber : 'Unavailable'}</dd>
        </div>
      </dl>
    </div>

    <div className="rounded-3xl border border-cream-200 bg-white p-5 md:p-6">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">What happens next</p>
      {next ? <>
        <h2 className="mt-2 font-display text-xl text-forest-900">{humanNextActionReason(next)}</h2>
        {next.deadline && <p className="mt-1 text-sm text-sand-600">Due {new Date(next.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
        {(nextActions?.length ?? 0) > 1 && <p className="mt-2 text-xs text-sand-500">+{(nextActions?.length ?? 1) - 1} other item{(nextActions?.length ?? 1) - 1 === 1 ? '' : 's'} in the full record.</p>}
      </> : <>
        <h2 className="mt-2 font-display text-xl text-forest-900">Nothing is asking for your action right now.</h2>
        <p className="mt-1 text-sm text-sand-600">You can still review the Agreement, its Money and its activity without creating a new action.</p>
      </>}
    </div>

    <div className="rounded-3xl border border-cream-200 bg-white p-5 md:p-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Where we are</p>
          <h2 className="mt-2 font-display text-xl text-forest-900">{facts.headline}</h2>
          <p className="mt-1 text-sm leading-6 text-sand-600">{facts.text}</p>
        </div>
        {nextDate && (
          <div className="rounded-2xl bg-forest-50 px-4 py-3 sm:min-w-52">
            <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">Next date</p>
            <p className="mt-1 text-sm font-semibold text-forest-900">{nextDate.title}</p>
            <p className="mt-0.5 text-xs text-sand-600">{nextDate.dateLabel}{nextDate.timeLabel ? ` · ${nextDate.timeLabel}` : ''}</p>
          </div>
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button type="button" onClick={onPeople} className={actionClass}>People <span className="mt-1 block text-xs text-sand-500">Who is involved and where they stand.</span></button>
      <button type="button" onClick={onMoney} className={actionClass}>Money <span className="mt-1 block text-xs text-sand-500">What was agreed, where money is and what can happen next.</span></button>
      <button type="button" onClick={onProgress} className={actionClass}>Work & evidence <span className="mt-1 block text-xs text-sand-500">Conditions, milestones and evidence.</span></button>
    </div>

    <details className="rounded-2xl border border-cream-200 bg-white/65">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-sand-600">
        <span>More from this Agreement</span>
        <span className="text-xs text-sand-400">Documents · changes</span>
      </summary>
      <div className="grid gap-2 border-t border-cream-200 p-3 sm:grid-cols-2">
        <button type="button" onClick={onDocuments} className={actionClass}>Documents <span className="mt-1 block text-xs text-sand-500">{detail.documents.length} recorded.</span></button>
        <button type="button" onClick={onChanges} className={actionClass}>Versions & changes <span className="mt-1 block text-xs text-sand-500">See proposals and version history.</span></button>
      </div>
    </details>
  </section>;
}
