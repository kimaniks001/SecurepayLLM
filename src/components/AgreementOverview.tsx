import type { AgreementAction, AgreementDetail } from '../types';
import { StatusNotice } from './dna/StatusNotice';

interface AgreementOverviewProps {
  detail: AgreementDetail;
  /** Phase 2 Human Core (Section 18/20): the same already-fetched, backend-authoritative actions
   * Progress shows -- reused here only to surface "what happens next" at the top of Overview, never
   * re-derived or guessed. Optional so callers without Progress data (e.g. a stale/cancelled view)
   * simply omit the leading block rather than fabricate one. */
  actions?: AgreementAction[];
}

function OverviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-cream-100 last:border-0">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </div>
  );
}

const actionPriority: AgreementAction['status'][] = ['overdue', 'needs_you', 'waiting_on_other', 'upcoming'];

/** The single most meaningful "what happens next" action, straight off backend truth -- never a
 * client-side guess about Agreement state. */
function primaryAction(actions: AgreementAction[] | undefined): AgreementAction | null {
  if (!actions) return null;
  for (const status of actionPriority) {
    const match = actions.find(a => a.status === status);
    if (match) return match;
  }
  return null;
}

export function AgreementOverview({ detail, actions }: AgreementOverviewProps) {
  const next = primaryAction(actions);
  const hasPrice = detail.price !== 'Not yet specified';
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      {next && (
        <div className="pb-3 mb-1 border-b border-cream-100">
          <StatusNotice tone={next.status === 'waiting_on_other' ? 'info' : 'warning'} icon={false}>
            <span className="font-medium">Next: </span>{next.label}
            {next.due && <span className="text-sand-600"> · due {next.due}</span>}
          </StatusNotice>
        </div>
      )}
      <OverviewSection label="What">
        <ul className="space-y-1">
          {detail.work.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[0.875rem] text-forest-800">
              <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </OverviewSection>

      <OverviewSection label="Who">
        {detail.people.map((person, i) => (
          <div key={i} className="text-[0.875rem] text-forest-800">
            <span className="font-medium">{person.name}</span>
            <span className="text-sand-500"> — {person.role}</span>
          </div>
        ))}
      </OverviewSection>

      <OverviewSection label="Money">
        <span className={hasPrice ? 'text-[0.875rem] font-medium text-forest-800' : 'text-[0.875rem] text-sand-500'}>{detail.price}</span>
      </OverviewSection>

      {detail.materials !== '—' && (
        <OverviewSection label="Materials">
          <span className="text-[0.875rem] text-forest-800">{detail.materials}</span>
        </OverviewSection>
      )}

      {detail.completion !== '—' && (
        <OverviewSection label="When">
          <span className="text-[0.875rem] text-forest-800">Complete by {detail.completion}</span>
        </OverviewSection>
      )}

      {detail.conditions.length > 0 && (
        <OverviewSection label="Conditions">
          <ul className="space-y-1">
            {detail.conditions.map((c, i) => (
              <li key={i} className="text-[0.825rem] text-sand-600">
                {c}
              </li>
            ))}
          </ul>
        </OverviewSection>
      )}

      {detail.completedDate && (
        <div className="mt-3 rounded-lg bg-cream-50 px-3 py-2">
          <span className="text-[0.78rem] text-sand-600">Completed: </span>
          <span className="text-[0.78rem] font-medium text-forest-800">{detail.completedDate}</span>
        </div>
      )}
    </div>
  );
}
