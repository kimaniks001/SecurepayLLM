import type { AgreementCompletionResponse, AgreementDetailResponse, MilestoneEffectiveStateResponse, WorkspaceNextActionResponse } from '../../api/securepay/agreements/dto';
import { completionFacts } from '../execution/display';
import { moneyText, minorFromString } from '../money/amount';
import type { CalendarEventView } from './view';
import { AgreementNextStep, resolveAgreementNext } from './AgreementNextStep';

const detailActionClass = 'min-h-11 rounded-xl border border-cream-200 bg-white px-4 py-3 text-left text-sm text-forest-800 hover:border-forest-400 focus-visible:ring-2 focus-visible:ring-forest-400';

function agreementAmount(detail: AgreementDetailResponse) {
  const minor = minorFromString(detail.overview.proposedAmountMinor);
  return minor == null ? 'Amount not yet specified' : moneyText(minor, detail.overview.currency);
}

/**
 * Phase 4 — the Agreement remains the visible centre. This component is intentionally NOT a dashboard:
 * it shows the Agreement, one server-backed next step, then progressively disclosed record areas.
 * It never derives Money permission, evidence acceptance, completion, participant authority or a
 * Community Saver in React.
 */
export function LivingAgreementOverview({ detail, effectiveStates: _effectiveStates, completion, nextActions, nextActionsKnown = true, releaseAuthority, events = [], onProgress, onPeople, onDocuments, onChanges, onMoney, onAskKs001 }: {
  detail: AgreementDetailResponse;
  effectiveStates: MilestoneEffectiveStateResponse[] | null;
  completion: AgreementCompletionResponse | null;
  nextActions?: WorkspaceNextActionResponse[];
  nextActionsKnown?: boolean;
  /** Phase 4: read-only Money release authority, only relevant once Agreement completion is authoritative. */
  releaseAuthority?: { status: 'idle' | 'loading' | 'error' | 'ready'; authorized?: boolean; reasonCode?: string };
  events?: CalendarEventView[];
  onProgress: () => void;
  onPeople: () => void;
  onDocuments: () => void;
  onChanges: () => void;
  onMoney: () => void;
  onAskKs001?: () => void;
}) {
  const facts = completionFacts(completion);
  const amount = agreementAmount(detail);
  const nextDate = events[0] ?? null;
  const next = resolveAgreementNext({
    actionsKnown: nextActionsKnown,
    nextActions: nextActions ?? [],
    completion,
    nextDate,
    amountLabel: amount,
    releaseAuthority,
  });

  return (
    <section aria-label="Agreement at a glance" className="space-y-4" data-phase4-agreement-centre>
      <article className="sp-agreement-paper rounded-3xl border border-forest-200 bg-white/90 px-5 py-6 md:px-7 md:py-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-600">Agreement</p>
        <h1 className="mt-2 break-words font-display text-2xl text-forest-900 md:text-[1.8rem]">{detail.overview.purpose || detail.overview.title}</h1>
        {detail.overview.description && <p className="mt-2 max-w-2xl break-words text-[0.9rem] leading-6 text-sand-700">{detail.overview.description}</p>}
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-cream-200 pt-4">
          <div>
            <p className="text-[0.66rem] uppercase tracking-wide text-sand-600">Amount</p>
            <p className="mt-0.5 text-sm font-semibold text-forest-900">{amount}</p>
          </div>
          <div>
            <p className="text-[0.66rem] uppercase tracking-wide text-sand-600">People</p>
            <p className="mt-0.5 text-sm font-semibold text-forest-900">{detail.participants.length} participant{detail.participants.length === 1 ? '' : 's'}</p>
          </div>
          {nextDate && (
            <div>
              <p className="text-[0.66rem] uppercase tracking-wide text-sand-600">Next date</p>
              <p className="mt-0.5 text-sm font-semibold text-forest-900">{nextDate.dateLabel}</p>
            </div>
          )}
        </div>
      </article>

      <AgreementNextStep next={next} onOpenProgress={onProgress} onOpenChanges={onChanges} onOpenMoney={onMoney} onAskKs001={onAskKs001} />

      {completion && (
        <div className="px-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-600">Where things stand</p>
          <p className="mt-1 text-[0.86rem] leading-6 text-sand-700"><span className="font-medium text-forest-900">{facts.headline}.</span> {facts.text}</p>
        </div>
      )}

      <details className="rounded-2xl border border-cream-200 bg-white/65" data-agreement-details>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-sand-700">
          <span>Agreement details</span>
          <span className="text-xs text-sand-500">People · work · Money · documents · changes</span>
        </summary>
        <div className="grid gap-2 border-t border-cream-200 p-3 sm:grid-cols-2">
          <button type="button" onClick={onPeople} className={detailActionClass}>People <span className="mt-1 block text-xs text-sand-600">Who is involved and where they stand.</span></button>
          <button type="button" onClick={onProgress} className={detailActionClass}>Work & evidence <span className="mt-1 block text-xs text-sand-600">Conditions, milestones and evidence.</span></button>
          <button type="button" onClick={onMoney} className={detailActionClass}>Money <span className="mt-1 block text-xs text-sand-600">Open the Agreement's current Money record.</span></button>
          <button type="button" onClick={onDocuments} className={detailActionClass}>Documents <span className="mt-1 block text-xs text-sand-600">{detail.documents.length} recorded.</span></button>
          <button type="button" onClick={onChanges} className={detailActionClass}>Changes & history <span className="mt-1 block text-xs text-sand-600">Proposals and Agreement versions.</span></button>
        </div>
      </details>
    </section>
  );
}
