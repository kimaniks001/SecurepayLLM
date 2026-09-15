import { Check } from 'lucide-react';
import type { AcceptancePromptResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface AcceptancePromptCardProps {
  data: AcceptancePromptResponse;
  onChoice: (value: string) => void;
}

export function AcceptancePromptCard({ data, onChoice }: AcceptancePromptCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5">
        <h2 className="font-display text-lg text-forest-800 text-center">{data.title}</h2>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.75rem] text-sand-500">
          <Check className="w-3.5 h-3.5 text-forest-500" />
          <span>{data.versionNote}</span>
        </div>
      </div>
      <div className="px-6 pb-5">
        <ChoiceButtons
          data={{ type: 'CHOICE_BUTTONS', choices: [
            { label: data.primaryLabel, value: data.primaryValue },
            { label: data.secondaryLabel, value: data.secondaryValue },
          ] }}
          onChoice={onChoice}
        />
      </div>
    </div>
  );
}
