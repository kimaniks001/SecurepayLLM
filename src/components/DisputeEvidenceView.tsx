import { FileText, Image, Upload } from 'lucide-react';
import type { DisputeEvidence } from '../types';

interface DisputeEvidenceViewProps {
  evidence: DisputeEvidence[];
  compact?: boolean;
}

const typeIcon: Record<string, typeof FileText> = {
  Photo: Image,
  Document: FileText,
  Notice: FileText,
  Receipt: FileText,
};

export function DisputeEvidenceView({ evidence, compact }: DisputeEvidenceViewProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Submitted evidence</div>

      {evidence.length === 0 ? (
        <p className="text-[0.85rem] text-sand-500 mb-3">No evidence has been submitted yet.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {evidence.map((ev) => {
            const Icon = typeIcon[ev.type] || FileText;
            return (
              <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-cream-100 px-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-sand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.825rem] font-medium text-forest-800 truncate">{ev.filename}</div>
                  <div className="text-[0.72rem] text-sand-500">
                    {ev.type} · {ev.source} · {ev.date}
                  </div>
                  <div className="text-[0.72rem] text-ember-600 mt-0.5">Linked: {ev.linkedComponent}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[0.72rem] text-sand-400 mb-3">
        Evidence is submitted, not proven fact. Each item shows who added it and what disputed component it relates to.
      </p>

      {!compact && (
        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors">
          <Upload className="w-4 h-4" />
          Add evidence
        </button>
      )}
    </div>
  );
}
