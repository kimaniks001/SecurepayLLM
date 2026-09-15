import { AlertTriangle, ArrowRight } from 'lucide-react';

interface AgreementStaleBannerProps {
  viewedVersion: string;
  currentVersion: string;
  onViewCurrent: () => void;
}

export function AgreementStaleBanner({ viewedVersion, currentVersion, onViewCurrent }: AgreementStaleBannerProps) {
  return (
    <div className="rounded-xl border border-ember-300 bg-ember-50 px-4 py-3 animate-quiet-in">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-ember-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-ember-600" />
        </div>
        <div className="flex-1">
          <div className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">This agreement changed</div>
          <p className="text-[0.825rem] text-ember-700 mt-1">
            You were viewing {viewedVersion}. The current agreement is now {currentVersion}.
          </p>
          <p className="text-[0.75rem] text-sand-600 mt-0.5">
            Nothing has been confirmed from the stale view.
          </p>
          <button
            onClick={onViewCurrent}
            className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-ember-600 text-cream-50 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-ember-700 transition-colors"
          >
            View current version
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
