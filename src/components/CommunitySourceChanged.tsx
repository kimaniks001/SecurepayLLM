import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CommunitySourceChangedProps {
  oldText: string;
  newText: string;
  onRefresh: () => void;
}

export function CommunitySourceChanged({ oldText, newText, onRefresh }: CommunitySourceChangedProps) {
  return (
    <div className="rounded-xl border border-ember-300 bg-ember-50 px-4 py-3 animate-quiet-in">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-ember-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-ember-600" />
        </div>
        <div className="flex-1">
          <div className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Source updated</div>
          <p className="text-[0.825rem] text-ember-700 mt-1">
            The Community item changed after you started this trade.
          </p>
          <div className="mt-1.5 space-y-0.5 text-[0.78rem]">
            <div className="text-sand-600">You started from: <span className="text-forest-800">{oldText}</span></div>
            <div className="text-sand-600">Current: <span className="text-forest-800">{newText}</span></div>
          </div>
          <p className="text-[0.72rem] text-sand-500 mt-2">
            Your trade retains the facts you adopted. Review the current source if you want to use the new information.
          </p>
          <button
            onClick={onRefresh}
            className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-ember-600 text-cream-50 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-ember-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Review current source
          </button>
        </div>
      </div>
    </div>
  );
}
