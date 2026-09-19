import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface MoneyAgreementContextProps {
  detail: MoneyDetail;
}

export function MoneyAgreementContext({ detail }: MoneyAgreementContextProps) {
  const { agreementLink, capacityLabel, counterpartyName } = detail;

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Agreement context</div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Agreement</span>
          <span className="text-[0.825rem] font-medium text-forest-800 text-right">{agreementLink.agreementTitle}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Version</span>
          <span className="text-[0.825rem] text-forest-800">{agreementLink.agreementVersion}</span>
        </div>
        {agreementLink.milestoneTitle && (
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Milestone</span>
            <span className="text-[0.825rem] text-forest-800">{agreementLink.milestoneTitle}</span>
          </div>
        )}
        {counterpartyName && (
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Counterparty</span>
            <span className="text-[0.825rem] text-forest-800">{counterpartyName}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Paying as</span>
          <span className="text-[0.825rem] text-forest-800">{capacityLabel}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-cream-100">
        <MoneyAuthorityBadge />
      </div>
    </div>
  );
}
