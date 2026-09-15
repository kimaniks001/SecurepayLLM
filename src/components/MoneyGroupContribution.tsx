import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface MoneyGroupContributionProps {
  detail: MoneyDetail;
}

export function MoneyGroupContribution({ detail }: MoneyGroupContributionProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Group contribution</div>
      <div className="space-y-2.5 mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Agreement</span>
          <span className="text-[0.825rem] font-medium text-forest-800">{detail.agreementLink.agreementTitle}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Your obligation</span>
          <span className="text-[0.825rem] text-forest-800">{detail.amount}</span>
        </div>
      </div>
      {detail.groupParticipants && detail.groupParticipants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-cream-100">
          <div className="text-[0.72rem] text-sand-500 mb-2">Participants</div>
          <div className="space-y-2">
            {detail.groupParticipants.map((p, i) => (
              <div key={i} className="rounded-lg bg-cream-50 px-3 py-2">
                <div className="flex items-center justify-between text-[0.78rem] mb-1">
                  <span className="text-forest-800 font-medium">{p.name}</span>
                  <span className="text-sand-500">{p.amount}</span>
                </div>
                <div className="flex items-center gap-3 text-[0.68rem]">
                  <div>
                    <span className="text-sand-400">Agreement: </span>
                    <span className="text-forest-700">{p.agreementActionStatus}</span>
                  </div>
                  <div>
                    <span className="text-sand-400">Money: </span>
                    <span className={`font-medium ${
                      p.moneyStatus === 'Confirmed' ? 'text-forest-600' :
                      p.moneyStatus === 'No evaluation yet' ? 'text-sand-500' :
                      'text-sand-500'
                    }`}>{p.moneyStatus}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-cream-100">
        <p className="text-[0.72rem] text-sand-400 mb-2">
          Contribution obligation is an agreement action. Money authority determines payment status separately.
        </p>
        <MoneyAuthorityBadge />
      </div>
    </div>
  );
}
