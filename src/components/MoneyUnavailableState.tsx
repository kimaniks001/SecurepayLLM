import { Ban, FileText } from 'lucide-react';

interface MoneyUnavailableStateProps {
  message: string;
  onViewAgreement: () => void;
}

export function MoneyUnavailableState({ message, onViewAgreement }: MoneyUnavailableStateProps) {
  return (
    <div className="rounded-2xl border border-ember-200 bg-ember-50/50 px-5 py-5 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <Ban className="w-5 h-5 text-ember-600" />
        <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">SecurePay Money is temporarily unavailable</span>
      </div>
      <p className="text-[0.825rem] text-ember-700 mb-4">{message}</p>
      <button
        onClick={onViewAgreement}
        className="flex items-center gap-1.5 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        View agreement
      </button>
    </div>
  );
}
