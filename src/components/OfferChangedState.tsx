import { AlertTriangle, RefreshCw } from 'lucide-react';

interface OfferChangedStateProps {
  oldPrice: string;
  newPrice: string;
  hasAdopted: boolean;
  onRefresh: () => void;
}

export function OfferChangedState({ oldPrice, newPrice, hasAdopted, onRefresh }: OfferChangedStateProps) {
  return (
    <div className="rounded-xl border border-ember-300 bg-ember-50 px-4 py-3 animate-quiet-in">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-ember-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-ember-600" />
        </div>
        <div className="flex-1">
          <div className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">This offer changed</div>
          <div className="mt-1.5 space-y-0.5 text-[0.825rem]">
            <div className="text-sand-600">You were viewing: <span className="text-forest-800">{oldPrice}</span></div>
            <div className="text-sand-600">Current offer: <span className="text-forest-800">{newPrice}</span></div>
          </div>
          {hasAdopted ? (
            <p className="text-[0.78rem] text-sand-600 mt-2">
              Your trade remains based on the facts you adopted. The original offer facts are preserved in your trade.
            </p>
          ) : (
            <p className="text-[0.78rem] text-sand-600 mt-2">
              You have not adopted this offer yet. You can view the current offer.
            </p>
          )}
          <button
            onClick={onRefresh}
            className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-ember-600 text-cream-50 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-ember-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            View current offer
          </button>
        </div>
      </div>
    </div>
  );
}
