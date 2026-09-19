import type { DisputePosition } from '../types';

interface DisputePositionsViewProps {
  positions: DisputePosition[];
}

export function DisputePositionsView({ positions }: DisputePositionsViewProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Each party states their position</div>
        <p className="text-[0.825rem] text-sand-600 mb-3">
          A dispute does not have to be monetary. Each party states what they believe should happen.
        </p>

        <div className="space-y-3">
          {positions.map((pos, i) => (
            <div key={i} className="rounded-xl border border-cream-200 px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.825rem] font-medium text-forest-800">{pos.party}</span>
                {pos.monetaryAmount && (
                  <span className="text-[0.78rem] font-medium text-ember-600">{pos.monetaryAmount}</span>
                )}
              </div>
              <p className="text-[0.825rem] text-sand-600">{pos.positionText}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
