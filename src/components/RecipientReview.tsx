import { Mail, Wrench, Banknote, Package, Calendar } from 'lucide-react';
import type { RecipientReviewResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface RecipientReviewCardProps {
  data: RecipientReviewResponse;
  onChoice: (value: string) => void;
}

export function RecipientReviewCard({ data, onChoice }: RecipientReviewCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-4 bg-forest-50 border-b border-forest-100 flex items-center gap-2">
        <Mail className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">You've been invited</span>
      </div>

      <div className="px-6 py-5">
        <p className="text-[0.875rem] text-sand-600 mb-1">{data.inviterName} has invited you to review</p>
        <h2 className="font-display text-lg text-forest-800 leading-tight">{data.title}</h2>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-forest-400 shrink-0" />
            <span className="text-[0.78rem] text-sand-600">Your role:</span>
            <span className="text-[0.875rem] font-medium text-forest-800">{data.role}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Banknote className="w-4 h-4 text-forest-400 shrink-0" />
            <span className="text-[0.78rem] text-sand-600">Labour:</span>
            <span className="text-[0.875rem] font-medium text-forest-800">{data.labour}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Package className="w-4 h-4 text-forest-400 shrink-0" />
            <span className="text-[0.78rem] text-sand-600">Materials:</span>
            <span className="text-[0.825rem] text-forest-800">{data.materials}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-forest-400 shrink-0" />
            <span className="text-[0.78rem] text-sand-600">Complete:</span>
            <span className="text-[0.825rem] text-forest-800">{data.completion}</span>
          </div>
        </div>

        <p className="mt-4 text-[0.7rem] text-sand-400">Demo SecureLink invitation</p>
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
