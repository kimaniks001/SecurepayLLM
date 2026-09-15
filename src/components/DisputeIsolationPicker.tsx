import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface DisputeIsolationPickerProps {
  milestones: { id: string; title: string }[];
  obligations: Record<string, { id: string; title: string }[]>;
  onSelect: (milestoneId: string, obligationId: string) => void;
}

export function DisputeIsolationPicker({ milestones, obligations, onSelect }: DisputeIsolationPickerProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [selectedObligation, setSelectedObligation] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">What is the issue connected to?</div>

      {!selectedMilestone && (
        <div className="space-y-2">
          {milestones.map((ms) => (
            <button
              key={ms.id}
              onClick={() => setSelectedMilestone(ms.id)}
              className="w-full flex items-center justify-between rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left"
            >
              <span className="text-[0.825rem] font-medium text-forest-800">{ms.title}</span>
              <ArrowRight className="w-3.5 h-3.5 text-sand-400" />
            </button>
          ))}
        </div>
      )}

      {selectedMilestone && !selectedObligation && (
        <div>
          <button
            onClick={() => setSelectedMilestone(null)}
            className="text-[0.78rem] text-sand-500 hover:text-forest-600 mb-3"
          >
            ← Back to milestones
          </button>
          <div className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Which obligation?</div>
          <div className="space-y-2">
            {(obligations[selectedMilestone] || []).map((ob) => (
              <button
                key={ob.id}
                onClick={() => setSelectedObligation(ob.id)}
                className="w-full flex items-center justify-between rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left"
              >
                <span className="text-[0.825rem] font-medium text-forest-800">{ob.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-sand-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMilestone && selectedObligation && (
        <div>
          <div className="rounded-xl bg-forest-50 border border-forest-200 px-4 py-3 mb-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-forest-600" />
              <span className="text-[0.825rem] font-medium text-forest-800">Disputed scope selected</span>
            </div>
            <div className="mt-2 text-[0.78rem] text-forest-800">
              {milestones.find((m) => m.id === selectedMilestone)?.title}
              {' → '}
              {obligations[selectedMilestone]?.find((o) => o.id === selectedObligation)?.title}
            </div>
          </div>
          <button
            onClick={() => onSelect(selectedMilestone, selectedObligation)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            Confirm disputed scope
          </button>
          <button
            onClick={() => { setSelectedObligation(null); }}
            className="w-full text-[0.78rem] text-sand-500 hover:text-forest-600 mt-2"
          >
            Change selection
          </button>
        </div>
      )}
    </div>
  );
}
