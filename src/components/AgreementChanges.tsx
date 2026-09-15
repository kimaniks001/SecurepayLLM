import { ArrowRight } from 'lucide-react';
import type { AgreementChangeEntry, AgreementVersion } from '../types';

interface AgreementChangesProps {
  changes: AgreementChangeEntry[];
  versions: AgreementVersion[];
}

const statusTone = {
  accepted: 'text-forest-600 bg-forest-50',
  pending: 'text-ember-600 bg-ember-50',
  rejected: 'text-red-600 bg-red-50',
};

export function AgreementChanges({ changes, versions }: AgreementChangesProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      {/* Version history */}
      {versions.length > 0 && (
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Versions</div>
          <div className="space-y-2">
            {versions.map((v, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[0.825rem] font-medium text-forest-800">{v.version}</span>
                  {v.isCurrent && (
                    <span className="text-[0.65rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">Current</span>
                  )}
                </div>
                <span className="text-[0.75rem] text-sand-500">
                  {v.confirmedBy.length > 0 ? `Confirmed by ${v.confirmedBy.join(', ')}` : 'Not confirmed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Changes */}
      {changes.length === 0 ? (
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-6 text-center">
          <p className="text-[0.85rem] text-sand-500">No changes have been requested.</p>
        </div>
      ) : (
        changes.map((change, i) => (
          <div key={i} className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">
              {change.field} · {change.date}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[0.825rem] text-sand-600 line-through">{change.from}</span>
              <ArrowRight className="w-3.5 h-3.5 text-sand-400" />
              <span className="text-[0.825rem] font-medium text-forest-800">{change.to}</span>
            </div>
            <div className="mt-2 text-[0.78rem] text-sand-600">
              Requested by {change.requestedBy}
            </div>
            <div className="text-[0.78rem] text-sand-600">{change.reason}</div>
            <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${statusTone[change.status]}`}>
              {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
