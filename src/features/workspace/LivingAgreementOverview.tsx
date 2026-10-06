import type { AgreementCompletionResponse, AgreementDetailResponse, MilestoneEffectiveStateResponse, WorkspaceNextActionResponse } from '../../api/securepay/agreements/dto';
import { completionFacts, milestoneReasonWords, milestoneStateWord } from '../execution/display';
import { ExperiencePathway } from '../experience/ExperiencePathway';
import { Ks001SurfaceGuide } from '../experience/Ks001SurfaceGuide';
import type { AppView } from '../../types';

const actionClass = 'min-h-11 rounded-xl border border-cream-200 bg-white px-4 py-3 text-left text-sm text-forest-800 hover:border-forest-400 focus-visible:ring-2 focus-visible:ring-forest-400';

/** Read-only landing projection. Actions open existing, freshly gated workspaces. */
export function LivingAgreementOverview({ detail, effectiveStates, completion, nextActions, onProgress, onPeople, onDocuments, onChanges, onMoney, onJourneyNavigate, onAskKs001 }: {
  detail: AgreementDetailResponse;
  effectiveStates: MilestoneEffectiveStateResponse[] | null;
  completion: AgreementCompletionResponse | null;
  nextActions?: WorkspaceNextActionResponse[];
  onProgress: () => void;
  onPeople: () => void;
  onDocuments: () => void;
  onChanges: () => void;
  onMoney: () => void;
  onJourneyNavigate?: (view: AppView) => void;
  onAskKs001?: () => void;
}) {
  const facts = completionFacts(completion);
  const milestoneStates = new Map(effectiveStates?.map(state => [state.milestoneId, state]));
  const titleOf = (id: string) => detail.milestones.find(milestone => milestone.milestoneId === id)?.title ?? null;
  return <section aria-label="Agreement at a glance" className="space-y-4">
    <ExperiencePathway active="agreement" onNavigate={onJourneyNavigate} />
    <Ks001SurfaceGuide surface="agreement" onAsk={onAskKs001} />
    <div className="rounded-2xl border border-forest-200 bg-forest-50/50 p-5">
      <p className="text-xs uppercase tracking-wide text-sand-500">What we agreed</p>
      <p className="mt-2 font-display text-xl text-forest-800 break-words">{detail.overview.purpose || detail.overview.title}</p>
      {detail.overview.description && <p className="mt-2 text-sm text-sand-600 break-words">{detail.overview.description}</p>}
      <p className="mt-3 text-xs text-sand-500">{detail.currentVersion ? `Current version ${detail.currentVersion.versionNumber}` : 'Current version unavailable'}</p>
    </div>
    <div className="rounded-2xl border border-cream-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-sand-500">What needs you next</p>
          <h2 className="mt-1 font-display text-lg text-forest-800">{nextActions?.length ? 'SecurePay has something for you to review' : 'Nothing is currently asking for your action'}</h2>
        </div>
        {nextActions?.length ? <span className="rounded-full bg-ember-50 px-2.5 py-1 text-xs font-medium text-ember-700">{nextActions.length}</span> : null}
      </div>
      {nextActions?.length ? (
        <ul className="mt-3 space-y-2">
          {nextActions.slice(0, 3).map((action, index) => (
            <li key={`${action.actionCode}:${action.deadline ?? index}`} className="rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-forest-800">{action.reason}</span>
                <span className="text-[0.68rem] uppercase tracking-wide text-sand-500">{action.attentionClass.replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-1 text-xs text-sand-500">{action.category.replace(/_/g, ' ')}{action.deadline ? ` · due ${new Date(action.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-sand-600">You can still inspect progress, people, changes and Money below.</p>
      )}
      <button type="button" onClick={onProgress} className={`${actionClass} mt-4 w-full`}>Open the work</button>
    </div>
    <div className="rounded-2xl border border-cream-200 bg-white p-5">
      <h2 className="font-display text-lg text-forest-800">Where we are</h2>
      <p className="mt-2 text-sm font-medium text-forest-800">{facts.headline}</p>
      <p className="mt-1 text-sm text-sand-600">{facts.text}</p>
      {detail.milestones.length > 0 && <ul className="mt-4 space-y-3">
        {detail.milestones.map(milestone => {
          const effective = milestoneStates.get(milestone.milestoneId);
          const reason = effective?.state === 'WAITING' || effective?.state === 'BLOCKED'
            ? milestoneReasonWords(effective.reason, titleOf) : null;
          return <li key={milestone.milestoneId} className="border-t border-cream-100 pt-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium text-forest-800">{milestone.title}</span>
              <span className="text-sand-600">{effective ? milestoneStateWord(effective.state) : 'Live status unavailable'}</span>
            </div>
            {milestone.dueAt && <p className="mt-1 text-xs text-sand-500">Due {new Date(milestone.dueAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
            {reason && <p className="mt-1 text-sm text-sand-600">{reason}</p>}
          </li>;
        })}
      </ul>}
      <button type="button" onClick={onProgress} className={`${actionClass} mt-4 w-full`}>Open work, conditions & evidence</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button type="button" onClick={onPeople} className={actionClass}>People & responsibilities <span className="block mt-1 text-xs text-sand-500">Review who is involved and their current confirmation.</span></button>
      <button type="button" onClick={onDocuments} className={actionClass}>Documents <span className="block mt-1 text-xs text-sand-500">{detail.documents.length} document{detail.documents.length === 1 ? '' : 's'} recorded. Evidence review is in work.</span></button>
      <button type="button" onClick={onChanges} className={actionClass}>Versions & changes <span className="block mt-1 text-xs text-sand-500">Review proposals and the exact version before responding.</span></button>
      <button type="button" onClick={onMoney} className={actionClass}>Agreement Money <span className="block mt-1 text-xs text-sand-500">See funding, charges and the next permitted financial action.</span></button>
    </div>
  </section>;
}
