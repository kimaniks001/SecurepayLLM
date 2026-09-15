import { ShieldCheck } from 'lucide-react';
import type { TransitionConfirmResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface TransitionConfirmCardProps {
  data: TransitionConfirmResponse;
  onChoice: (value: string) => void;
}

export function TransitionConfirmCard({ data, onChoice }: TransitionConfirmCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-forest-50 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-forest-600" />
          </div>
        </div>
        <h2 className="font-display text-lg text-forest-800 leading-tight">{data.title}</h2>
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
