import { AlertCircle, Calendar, Camera, Tag, Wallet } from 'lucide-react';
import type { AgentAgreementWorkspaceFocus, AgentAgreementWorkspaceViewDto } from '../api/securepay/agent/dto';

/**
 * Final Phase 3 question-focused pass -- which sections this focus is allowed to show, straight
 * from the server-returned, non-authority-bearing `focus` value. Never inferred from the question
 * text. FULL (and ACTIVITY, which the backend itself already degrades to FULL) shows everything;
 * every other focus shows exactly the one section it names, so "show me the roofing photos" can
 * never surface unrelated Money, and "what happens Friday" can never surface unrelated Evidence.
 */
function sectionsFor(focus: AgentAgreementWorkspaceFocus) {
  const all = focus === 'FULL' || focus === 'ACTIVITY';
  return {
    waiting: all || focus === 'NEXT_ACTIONS' || focus === 'MILESTONES',
    problems: all || focus === 'PROBLEMS',
    money: all || focus === 'MONEY',
    calendar: all || focus === 'CALENDAR',
    tags: all || focus === 'TAGS',
    evidence: all || focus === 'EVIDENCE',
  };
}

/**
 * The visual half of "Ask SecurePay" from inside an Agreement -- UNDERSTOOD's structured
 * confirmed-truth card. Every field here is exactly what SecurePayAPI's own AgreementWorkspaceAgentPort
 * returned (never invented, never re-derived by this component) -- see AgentAgreementWorkspaceController.
 * Rendered instead of, or alongside, a long prose answer whenever there is something structured
 * worth seeing rather than reading.
 */
export function AgentUnderstoodCard({ workspace }: { workspace: AgentAgreementWorkspaceViewDto }) {
  const sections = sectionsFor(workspace.focus);
  const waiting = sections.waiting ? workspace.milestones.filter(m => m.effectiveState === 'WAITING' && m.waitingReason) : [];
  const protectedMoney = sections.money ? workspace.moneyPositions.filter(m => m.remainingFundedMinor > 0) : [];
  const nextEvent = sections.calendar ? workspace.upcomingEvents[0] : undefined;
  const problems = sections.problems ? workspace.problems : [];
  const tags = sections.tags ? workspace.tags : [];
  const evidence = sections.evidence ? (workspace.evidence ?? []) : [];

  if (waiting.length === 0 && protectedMoney.length === 0 && !nextEvent && problems.length === 0
      && tags.length === 0 && evidence.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 space-y-2 text-[0.78rem]">
      <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">What SecurePay understands</div>
      {waiting.map((m, i) => (
        <div key={i} className="flex items-start gap-2 text-ember-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{m.waitingReason}</span>
        </div>
      ))}
      {problems.length > 0 && (
        <div className="flex items-start gap-2 text-red-600">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{problems.length} open review case{problems.length > 1 ? 's' : ''}</span>
        </div>
      )}
      {protectedMoney.map((m, i) => (
        <div key={i} className="flex items-center gap-2 text-forest-700">
          <Wallet className="w-3.5 h-3.5 shrink-0" />
          <span>{m.currency} {(m.remainingFundedMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} still protected</span>
        </div>
      ))}
      {nextEvent && (
        <div className="flex items-center gap-2 text-forest-700">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{nextEvent.title} — {new Date(nextEvent.occursAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[0.68rem] text-sand-600 bg-cream-100 border border-cream-200 rounded-full px-2 py-0.5">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
      {evidence.length > 0 && (
        <div className="space-y-1 pt-0.5">
          {evidence.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-forest-700">
              <Camera className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{e.description || e.evidenceType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
