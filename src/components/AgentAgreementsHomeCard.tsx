import { AlertCircle, Calendar, Clock, Gavel, Tag, Wallet } from 'lucide-react';
import type { AgentAgreementsHomeViewDto } from '../api/securepay/agent/dto';

/**
 * Final Phase 3 completion pass -- the visual half of the Agent's cross-Agreement AGREEMENTS_HOME
 * artifact. Every field is exactly what the backend's own read_my_agreements_home tool output
 * carried (never invented, never re-derived here) -- see AgentAgreementsHomeAgentPort. Renders
 * only the sections that answer the current question (each section renders nothing when its own
 * array is empty), never the full Home dashboard restated verbatim.
 */
export function AgentAgreementsHomeCard({ home }: { home: AgentAgreementsHomeViewDto }) {
  const isEmpty = home.needsAttention.length === 0 && home.waitingOnOthers.length === 0
    && home.problems.length === 0 && home.recentlyCompleted.length === 0 && home.upcoming.length === 0
    && home.recentActivity.length === 0 && home.moneyByCurrency.length === 0;
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.78rem] text-sand-500">
        Nothing across your Agreements needs attention right now.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 space-y-2.5 text-[0.78rem]">
      <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Across your Agreements</div>

      {home.needsAttention.length > 0 && (
        <div className="space-y-1">
          <div className="text-[0.68rem] font-medium text-ember-600 uppercase tracking-wide">Needs you</div>
          {home.needsAttention.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-ember-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{a.title}{a.nextDeadline ? ` — ${new Date(a.nextDeadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      {home.waitingOnOthers.length > 0 && (
        <div className="space-y-1">
          <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Waiting on others</div>
          {home.waitingOnOthers.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sand-600">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{a.title}</span>
            </div>
          ))}
        </div>
      )}

      {home.problems.length > 0 && (
        <div className="flex items-start gap-2 text-red-600">
          <Gavel className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{home.problems.length} open problem{home.problems.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {home.upcoming.length > 0 && (
        <div className="space-y-1">
          <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Upcoming</div>
          {home.upcoming.slice(0, 5).map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-forest-700">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{e.title} ({e.agreementTitle}){e.occursAt ? ` — ${new Date(e.occursAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      {home.recentActivity.length > 0 && (
        <div className="space-y-1">
          <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Recent activity</div>
          {home.recentActivity.slice(0, 5).map((a, i) => (
            <div key={i} className="text-sand-600">{a.agreementTitle}: {a.activityType.toLowerCase().replace(/_/g, ' ')}</div>
          ))}
        </div>
      )}

      {home.recentlyCompleted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {home.recentlyCompleted.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[0.68rem] text-sand-600 bg-cream-100 border border-cream-200 rounded-full px-2 py-0.5">
              <Tag className="w-2.5 h-2.5" />
              {a.title} completed
            </span>
          ))}
        </div>
      )}

      {home.moneyByCurrency.length > 0 && (
        <div className="space-y-1">
          {home.moneyByCurrency.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-forest-700">
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>{m.currency} {(m.remainingFundedMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} still protected</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
