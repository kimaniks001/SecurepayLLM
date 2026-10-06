import type { AgreementSummary } from '../types';
import { AgreementStatusBadge } from './AgreementStatusBadge';

interface AgreementCardProps {
  agreement: AgreementSummary;
  onOpen: (id: string) => void;
}

export function AgreementCard({ agreement, onOpen }: AgreementCardProps) {
  const isTakingShape = agreement.status === 'taking_shape';
  // Phase 2 Human Core (Section 14/16): an Agreement is bigger than money, so an amount that isn't
  // actually known yet is not a fact worth the same weight as one that is -- it still renders, just
  // without the emphasis a real figure earns.
  const hasAmount = agreement.amount !== 'Not yet specified';

  return (
    <button
      onClick={() => onOpen(agreement.id)}
      className="w-full text-left rounded-2xl border border-cream-200 bg-white px-5 py-4 hover:border-forest-300 hover:shadow-soft transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[0.95rem] font-medium text-forest-800 leading-tight">{agreement.title}</h3>
          <p className="text-[0.8rem] text-sand-500 mt-0.5">
            {agreement.counterparty}
            {agreement.counterpartyRole !== '—' && ` · ${agreement.counterpartyRole}`}
          </p>
          {isTakingShape && (
            <p className="text-[0.7rem] text-sand-400 mt-1 italic">Not yet an agreement</p>
          )}
        </div>
        <AgreementStatusBadge status={agreement.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.78rem]">
        {agreement.completion !== '—' && (
          <span className="text-sand-600">
            <span className="text-sand-400">Complete by: </span>
            <span className="text-forest-800">{agreement.completion}</span>
          </span>
        )}
        {agreement.location && (
          <span className="text-sand-600">
            <span className="text-sand-400">Location: </span>
            <span className="text-forest-800">{agreement.location}</span>
          </span>
        )}
        {/* Money only where materially relevant (Section 14/16) -- last in the row, quiet when unknown. */}
        <span className={hasAmount ? 'text-sand-600' : 'text-sand-400'}>
          <span className="text-sand-400">Amount: </span>
          <span className={hasAmount ? 'font-medium text-forest-800' : ''}>{agreement.amount}</span>
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {agreement.nextAction !== '—' ? (
            <p className="text-[0.78rem] font-medium text-forest-600">
              Next: {agreement.nextAction}
            </p>
          ) : (
            <p className="text-[0.78rem] text-sand-400">No action needed</p>
          )}
        </div>
        <span className="text-[0.72rem] text-sand-400 shrink-0">
          {agreement.lastActivity} · {agreement.lastActivityTime}
        </span>
      </div>
    </button>
  );
}
