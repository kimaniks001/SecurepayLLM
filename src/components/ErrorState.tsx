import { AlertTriangle } from 'lucide-react';
import type { ErrorStateResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface ErrorStateCardProps {
  data: ErrorStateResponse;
  onChoice: (value: string) => void;
}

export function ErrorStateCard({ data, onChoice }: ErrorStateCardProps) {
  return (
    <div className="rounded-2xl border border-ember-200 bg-white overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-ember-600" />
          </div>
        </div>
        <h2 className="font-display text-base text-forest-800">{data.title}</h2>
        <p className="mt-2 text-[0.875rem] text-sand-600 leading-relaxed">{data.text}</p>
      </div>
      <div className="px-6 pb-5">
        <ChoiceButtons
          data={{ type: 'CHOICE_BUTTONS', choices: [
            { label: data.primaryLabel, value: data.primaryValue },
          ] }}
          onChoice={onChoice}
        />
      </div>
    </div>
  );
}
