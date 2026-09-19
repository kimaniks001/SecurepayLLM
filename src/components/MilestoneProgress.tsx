import { useState } from 'react';
import { ChevronDown, ChevronUp, CircleDot, CheckCircle2, Clock, AlertCircle, Ban } from 'lucide-react';
import type { Milestone, MilestoneStatus, CompletionSource } from '../types';

const completionSourceLabel: Record<CompletionSource, string> = {
  self_declared: 'Self-declared',
  counterparty_confirmation: 'Counterparty confirmation required',
  evidence_review: 'Evidence review required',
  inspection: 'Inspection required',
  agreed_condition: 'Agreed completion condition',
};

const statusConfig: Record<MilestoneStatus, { label: string; icon: typeof CircleDot; classes: string }> = {
  not_started: { label: 'Not started', icon: CircleDot, classes: 'text-sand-400' },
  in_progress: { label: 'In progress', icon: Clock, classes: 'text-forest-600' },
  ready_for_review: { label: 'Ready for review', icon: CircleDot, classes: 'text-ember-600' },
  complete: { label: 'Complete', icon: CheckCircle2, classes: 'text-forest-500' },
  blocked: { label: 'Waiting', icon: AlertCircle, classes: 'text-ember-600' },
  overdue: { label: 'Overdue', icon: AlertCircle, classes: 'text-red-500' },
  cancelled: { label: 'Cancelled', icon: Ban, classes: 'text-sand-400' },
};

/**
 * Phase 3 doctrine: milestones are independent unless the Agreement explicitly declares a
 * dependency -- the number below is presentation order only, never a workflow gate. A milestone
 * numbered "4" can be Complete while "2" is still Waiting, and that is correct, not a bug.
 */
function resolveWaitingReason(ms: Milestone, all: Milestone[]): string | null {
  if (ms.status !== 'blocked' || !ms.waitingReason) return null;
  const ids = ms.waitingReason.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
  if (ids.length === 0) return ms.waitingReason;
  const titles = ids.map(id => all.find(m => m.id === id)?.title ?? id);
  return `Waiting on: ${titles.join(', ')}`;
}

interface MilestoneProgressProps {
  milestones: Milestone[];
  isSimple: boolean;
  rootMilestone: Milestone;
}

export function MilestoneProgress({ milestones, isSimple, rootMilestone }: MilestoneProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isSimple || milestones.length === 0) {
    const root = rootMilestone;
    const StatusIcon = statusConfig[root.status].icon;
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Progress</div>
        <div className="flex items-center gap-2.5 mb-3">
          <StatusIcon className={`w-4 h-4 ${statusConfig[root.status].classes}`} />
          <span className="text-[0.875rem] font-medium text-forest-800">{root.title}</span>
          <span className={`text-[0.72rem] font-medium ${statusConfig[root.status].classes}`}>
            {statusConfig[root.status].label}
          </span>
        </div>
        <div className="space-y-1.5">
          {root.obligations.map((ob) => (
            <div key={ob.id} className="flex items-baseline gap-2 text-[0.825rem]">
              <span className="w-1 h-1 rounded-full bg-sand-400 mt-1.5 shrink-0" />
              <span className="text-sand-600">
                <span className="font-medium text-forest-800">{ob.responsibleParty}</span>
                {' — '}
                {ob.action}
              </span>
            </div>
          ))}
        </div>
        {root.completionCondition && (
          <div className="mt-3 pt-3 border-t border-cream-100">
            <span className="text-[0.72rem] text-sand-500">Condition: </span>
            <span className="text-[0.78rem] text-forest-800">{root.completionCondition}</span>
          </div>
        )}
        {root.completionSource && (
          <div className="mt-1.5">
            <span className="text-[0.72rem] text-sand-500">How completion is established: </span>
            <span className="text-[0.78rem] text-forest-800">{completionSourceLabel[root.completionSource]}</span>
          </div>
        )}
        {root.status === 'ready_for_review' && (
          <div className="mt-2 text-[0.72rem] text-ember-600">
            Ready for review → Completion condition satisfied → Complete
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Progress</div>
      <div className="space-y-2">
        {milestones.map((ms, i) => {
          const config = statusConfig[ms.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedId === ms.id;
          const waitingReason = resolveWaitingReason(ms, milestones);
          return (
            <div key={ms.id} className="rounded-xl border border-cream-100 overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : ms.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-50 transition-colors text-left"
              >
                <span className="text-[0.72rem] font-medium text-sand-400 w-5 shrink-0">{i + 1}.</span>
                <StatusIcon className={`w-4 h-4 ${config.classes} shrink-0`} />
                <span className="flex-1 text-[0.875rem] font-medium text-forest-800">{ms.title}</span>
                <span className={`text-[0.72rem] font-medium ${config.classes}`}>{config.label}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-sand-400" /> : <ChevronDown className="w-3.5 h-3.5 text-sand-400" />}
              </button>
              {waitingReason && (
                <div className="px-4 pb-2.5 -mt-1 text-[0.72rem] text-ember-600">{waitingReason}</div>
              )}
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 space-y-2 animate-quiet-in">
                  {ms.responsible && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Responsible:</span>
                      <span className="text-forest-800">{ms.responsible}</span>
                    </div>
                  )}
                  {ms.target && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Target:</span>
                      <span className="text-forest-800">{ms.target}</span>
                    </div>
                  )}
                  {ms.value && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Value:</span>
                      <span className="text-forest-800">{ms.value}</span>
                    </div>
                  )}
                  {ms.work.length > 0 && (
                    <div>
                      <div className="text-[0.72rem] text-sand-500 mb-1">Work</div>
                      <ul className="space-y-0.5">
                        {ms.work.map((w, j) => (
                          <li key={j} className="text-[0.825rem] text-forest-800 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ms.obligations.length > 0 && (
                    <div>
                      <div className="text-[0.72rem] text-sand-500 mb-1">Obligations</div>
                      <div className="space-y-1">
                        {ms.obligations.map((ob) => (
                          <div key={ob.id} className="text-[0.825rem] text-forest-800 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
                            <span>
                              <span className="font-medium">{ob.responsibleParty}</span>
                              {' — '}
                              {ob.action}
                              {ob.dueDate && <span className="text-sand-500"> · {ob.dueDate}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ms.completionCondition && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Condition:</span>
                      <span className="text-forest-800">{ms.completionCondition}</span>
                    </div>
                  )}
                  {ms.completionSource && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">How completion is established:</span>
                      <span className="text-forest-800">{completionSourceLabel[ms.completionSource]}</span>
                    </div>
                  )}
                  {ms.status === 'ready_for_review' && (
                    <div className="text-[0.72rem] text-ember-600">
                      Ready for review → Completion condition satisfied → Complete
                    </div>
                  )}
                  {ms.defectRule && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Defect rule:</span>
                      <span className="text-forest-800">{ms.defectRule}</span>
                    </div>
                  )}
                  {ms.evidenceRequired && ms.evidenceRequired.length > 0 && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Evidence:</span>
                      <span className="text-forest-800">{ms.evidenceRequired.join(', ')}</span>
                    </div>
                  )}
                  {ms.inspectionRequired && (
                    <div className="flex items-center gap-2 text-[0.78rem] text-ember-600">
                      <Ban className="w-3.5 h-3.5" />
                      Inspection required — Master not selected yet
                    </div>
                  )}
                  {ms.dependencyIds && ms.dependencyIds.length > 0 && (
                    <div className="flex items-baseline gap-2 text-[0.78rem]">
                      <span className="text-sand-500">Depends on:</span>
                      <span className="text-forest-800">
                        {ms.dependencyIds.map((depId) => {
                          const dep = milestones.find((m) => m.id === depId);
                          return dep ? dep.title : depId;
                        }).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
