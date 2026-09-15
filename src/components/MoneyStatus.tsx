import { CheckCircle2, Clock, AlertCircle, Ban, HelpCircle, RefreshCw, CircleDot } from 'lucide-react';
import type { MoneyDetail, MoneyState, PaymentReadinessStatus } from '../types';
import { paymentReadinessLabel, nextActionLabel } from '../moneyLabels';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

const stateConfig: Record<MoneyState, { icon: typeof CheckCircle2; classes: string }> = {
  not_ready: { icon: Ban, classes: 'text-sand-500' },
  ready: { icon: CheckCircle2, classes: 'text-forest-600' },
  method_selected: { icon: Clock, classes: 'text-forest-600' },
  payment_initiated: { icon: Clock, classes: 'text-ember-600' },
  pending_confirmation: { icon: Clock, classes: 'text-ember-600' },
  confirmed: { icon: CheckCircle2, classes: 'text-forest-600' },
  failed: { icon: AlertCircle, classes: 'text-red-500' },
  unknown: { icon: HelpCircle, classes: 'text-ember-600' },
  unavailable: { icon: Ban, classes: 'text-red-500' },
  stale: { icon: RefreshCw, classes: 'text-ember-600' },
  no_money_activity: { icon: CheckCircle2, classes: 'text-sand-400' },
};

const readinessConfig: Record<PaymentReadinessStatus, { icon: typeof CheckCircle2; classes: string; bg: string }> = {
  NO_EVALUATION_YET: { icon: HelpCircle, classes: 'text-sand-500', bg: 'bg-cream-50' },
  READY: { icon: CheckCircle2, classes: 'text-forest-600', bg: 'bg-forest-50' },
  NOT_READY: { icon: Ban, classes: 'text-sand-500', bg: 'bg-cream-50' },
  PARTIALLY_READY: { icon: CircleDot, classes: 'text-ember-600', bg: 'bg-ember-50' },
  BLOCKED: { icon: Ban, classes: 'text-red-500', bg: 'bg-red-50' },
};

interface MoneyStatusProps {
  detail: MoneyDetail;
}

export function MoneyStatus({ detail }: MoneyStatusProps) {
  const config = stateConfig[detail.state];
  const Icon = config.icon;
  const readiness = readinessConfig[detail.paymentReadiness];
  const ReadinessIcon = readiness.icon;
  const hasActions = detail.nextActions.length > 0 && detail.nextActions[0] !== 'none';

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-cream-50 flex items-center justify-center shrink-0">
          <Icon className={`w-4 h-4 ${config.classes}`} />
        </div>
        <div>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Money status</div>
          <div className={`text-[0.875rem] font-medium ${config.classes}`}>{detail.stateLabel}</div>
        </div>
      </div>

      {/* Payment readiness — authoritative, distinct */}
      <div className={`rounded-xl ${readiness.bg} px-3 py-2.5 mb-3`}>
        <div className="flex items-center gap-2 mb-1">
          <ReadinessIcon className={`w-3.5 h-3.5 ${readiness.classes}`} />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Payment readiness</span>
        </div>
        <div className={`text-[0.875rem] font-medium ${readiness.classes}`}>{paymentReadinessLabel[detail.paymentReadiness]}</div>

        {detail.paymentReadiness === 'NO_EVALUATION_YET' && (
          <p className="text-[0.78rem] text-sand-500 mt-1">
            SecurePay Money has not produced a current Payment Ready evaluation for this agreement/version yet.
          </p>
        )}
        {detail.paymentReadiness === 'PARTIALLY_READY' && (
          <p className="text-[0.78rem] text-ember-600 mt-1">
            Some conditions for payment readiness have been met. Others remain outstanding.
          </p>
        )}
        {detail.paymentReadiness === 'BLOCKED' && (
          <p className="text-[0.78rem] text-red-500 mt-1">
            This agreement is blocked for payment by SecurePay Money.
          </p>
        )}
      </div>

      {/* Outstanding reasons — from authority only */}
      {detail.outstandingReasons && detail.outstandingReasons.length > 0 && (
        <div className="mb-3">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Outstanding reasons</div>
          <ul className="space-y-1">
            {detail.outstandingReasons.map((reason, i) => (
              <li key={i} className="text-[0.825rem] text-sand-600 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Money record count */}
      {detail.moneyRecordCount !== undefined && detail.moneyRecordCount > 0 && (
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[0.78rem] text-sand-600">Money records</span>
          <span className="text-[0.825rem] text-forest-800">{detail.moneyRecordCount}</span>
        </div>
      )}

      {detail.amount && (
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[0.78rem] text-sand-600">Amount</span>
          <span className="text-[1rem] font-display font-medium text-forest-800">{detail.amount}</span>
        </div>
      )}

      {detail.errorMessage && (
        <p className="text-[0.825rem] text-ember-600 mt-2">{detail.errorMessage}</p>
      )}

      {detail.staleNotice && (
        <div className="mt-2 rounded-lg bg-ember-50 border border-ember-200 px-3 py-2">
          <p className="text-[0.825rem] text-ember-700">{detail.staleNotice}</p>
        </div>
      )}

      {/* Next actions — separate from money status */}
      <div className="mt-3 pt-3 border-t border-cream-100">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">Authorized next actions</div>
        {hasActions ? (
          <div className="space-y-1">
            {detail.nextActions.map((action) => (
              <div key={action} className="flex items-center gap-2 text-[0.825rem] text-forest-800">
                <CircleDot className="w-3 h-3 text-forest-500 shrink-0" />
                {nextActionLabel[action]}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.825rem] text-sand-500">No authorized next action for this participant.</p>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-cream-100">
        <MoneyAuthorityBadge />
      </div>

      {detail.isDemoState && (
        <div className="mt-1.5 text-[0.65rem] text-sand-400 italic">Demo money state — authoritative Money state comes from SecurePay Money</div>
      )}
    </div>
  );
}
