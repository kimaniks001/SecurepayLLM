import type { AgreementDetail } from '../types';

interface AgreementOverviewProps {
  detail: AgreementDetail;
}

function OverviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-cream-100 last:border-0">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </div>
  );
}

export function AgreementOverview({ detail }: AgreementOverviewProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
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
        <span className="text-[0.875rem] font-medium text-forest-800">{detail.price}</span>
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
