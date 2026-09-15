import type { AgreementVersion } from '../types';

interface AgreementVersionCardProps {
  versions: AgreementVersion[];
}

export function AgreementVersionCard({ versions }: AgreementVersionCardProps) {
  const current = versions.find((v) => v.isCurrent);
  const previous = versions.filter((v) => !v.isCurrent);

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Version</div>
      {current && (
        <div className="mb-3">
          <div className="text-[0.825rem] font-medium text-forest-800">Current version: {current.version}</div>
          <div className="text-[0.75rem] text-sand-500 mt-0.5">
            Confirmed by: {current.confirmedBy.join(', ') || 'No one yet'}
          </div>
        </div>
      )}
      {previous.length > 0 && (
        <div>
          <div className="text-[0.7rem] text-sand-400 mb-1">Previous versions:</div>
          {previous.map((v, i) => (
            <button key={i} className="block text-[0.78rem] text-forest-600 hover:text-forest-700 py-0.5">
              View {v.version}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
