import { Mail, User, FileText, Banknote, Calendar } from 'lucide-react';
import type { RecipientReviewResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface RecipientReviewCardProps {
  data: RecipientReviewResponse;
  onChoice: (value: string) => void;
  /** When provided, replaces the fixed demo caption with real backend-supplied notice text. */
  notice?: string;
}

/**
 * Deep-review correction pass: generalized off the old construction/labour-shaped card (fixed
 * "Labour"/"Materials"/"Complete" rows, always shown) so a service, product, contribution,
 * project, or general commercial Agreement can all be represented honestly. Purpose and proposed
 * amount are shown only when the backend actually supplied them; nothing is invented to fill a row.
 */
export function RecipientReviewCard({ data, onChoice, notice }: RecipientReviewCardProps) {
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
            <User className="w-4 h-4 text-forest-400 shrink-0" />
            <span className="text-[0.78rem] text-sand-600">Your role:</span>
            <span className="text-[0.875rem] font-medium text-forest-800">{data.role}</span>
          </div>
          {data.purpose && (
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-forest-400 shrink-0" />
              <span className="text-[0.78rem] text-sand-600">Purpose:</span>
              <span className="text-[0.875rem] text-forest-800">{data.purpose}</span>
            </div>
          )}
          {data.proposedAmount && (
            <div className="flex items-center gap-2.5">
              <Banknote className="w-4 h-4 text-forest-400 shrink-0" />
              <span className="text-[0.78rem] text-sand-600">Proposed amount:</span>
              <span className="text-[0.875rem] font-medium text-forest-800">{data.proposedAmount}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-forest-400 shrink-0" />
            <span className="text-[0.78rem] text-sand-600">{data.expiry}</span>
          </div>
        </div>

        <p className="mt-4 text-[0.78rem] text-sand-500">Continuing only lets you review this Agreement in detail. It does not join or accept anything yet.</p>
        <p className="mt-2 text-[0.7rem] text-sand-400">{notice ?? 'Demo SecureLink invitation'}</p>
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
