import { UserPlus } from 'lucide-react';
import type { JoinPromptResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface JoinPromptCardProps {
  data: JoinPromptResponse;
  onChoice: (value: string) => void;
}

export function JoinPromptCard({ data, onChoice }: JoinPromptCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-forest-600" />
          </div>
        </div>
        <h2 className="font-display text-lg text-forest-800">{data.title}</h2>
        <p className="mt-2 text-[0.875rem] text-sand-600 leading-relaxed">{data.text}</p>
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
