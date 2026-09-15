import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { MoneyDetail, RailOption, ParticipantNextAction } from '../types';
import { MoneyAgreementContext } from './MoneyAgreementContext';
import { MoneyStatus } from './MoneyStatus';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { PaymentReview } from './PaymentReview';
import { PaymentPending } from './PaymentPending';
import { PaymentConfirmed } from './PaymentConfirmed';
import { PaymentUnknownState } from './PaymentUnknownState';
import { PaymentFailedState } from './PaymentFailedState';
import { MoneyActivity } from './MoneyActivity';
import { MoneyStaleState } from './MoneyStaleState';
import { MoneyUnavailableState } from './MoneyUnavailableState';
import { MoneyGroupContribution } from './MoneyGroupContribution';
import { MoneyDisputeContext } from './MoneyDisputeContext';

interface MoneyWorkspaceProps {
  detail: MoneyDetail;
  onBack: () => void;
  /**
   * Gates the rail-selection → review → confirm choreography, which is purely local UI with no
   * backend call behind it (down to a hardcoded `PaymentPending` attempt reference). Omitting this
   * prop preserves the exact existing fixture behavior. Real callers pass `false`: this slice verified
   * only the Payment Ready/next-action read contracts, not a funding/payment-intent mutation contract,
   * so the locked Bolt "Fund" affordance stays visible (via MoneyStatus's real next-actions text) without
   * this component fabricating a payment attempt/reference that never touched SecurePayAPI.
   */
  fundingFlowEnabled?: boolean;
}

type Stage = 'status' | 'method' | 'review' | 'pending' | 'confirmed' | 'unknown' | 'failed';

function hasAction(actions: ParticipantNextAction[], target: ParticipantNextAction): boolean {
  return actions.includes(target);
}

export function MoneyWorkspace({ detail, onBack, fundingFlowEnabled = true }: MoneyWorkspaceProps) {
  const canFund = hasAction(detail.nextActions, 'FUND_AGREEMENT') && fundingFlowEnabled;
  const canCheckStatus = hasAction(detail.nextActions, 'CHECK_STATUS');
  const canTryAgain = hasAction(detail.nextActions, 'TRY_AGAIN');
  const canChooseAnother = hasAction(detail.nextActions, 'CHOOSE_ANOTHER');

  const initialStage: Stage =
    detail.state === 'confirmed' ? 'confirmed' :
    detail.state === 'pending_confirmation' ? 'pending' :
    detail.state === 'unknown' ? 'unknown' :
    detail.state === 'failed' ? 'failed' :
    (detail.state === 'ready' && canFund) ? 'method' :
    'status';

  const [stage, setStage] = useState<Stage>(initialStage);
  const [selectedRail, setSelectedRail] = useState<RailOption | undefined>(detail.selectedRail);

  const handleSelectRail = (rail: RailOption) => {
    setSelectedRail(rail);
    setStage('review');
  };

  const handleConfirm = () => {
    setStage('pending');
  };

  const handleCheckStatus = () => {
    setStage('unknown');
  };

  const handleRetry = () => {
    setStage('method');
  };

  const handleChooseAnother = () => {
    setStage('method');
  };

  const handleRefresh = () => {
    setStage('status');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Money
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">
          {detail.agreementLink.agreementTitle || 'Money'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Unavailable state — fail closed */}
          {detail.state === 'unavailable' && (
            <MoneyUnavailableState
              message={detail.errorMessage || 'SecurePay Money is temporarily unavailable.'}
              onViewAgreement={onBack}
            />
          )}

          {/* Stale state */}
          {detail.state === 'stale' && detail.staleNotice && (
            <MoneyStaleState notice={detail.staleNotice} onRefresh={handleRefresh} />
          )}

          {/* Dispute context */}
          {detail.disputeLinked && (
            <MoneyDisputeContext detail={detail} />
          )}

          {/* Group contribution */}
          {detail.groupParticipants && detail.groupParticipants.length > 0 && (
            <MoneyGroupContribution detail={detail} />
          )}

          {/* Agreement context always visible */}
          {detail.agreementLink.agreementTitle && (
            <MoneyAgreementContext detail={{ ...detail, selectedRail }} />
          )}

          {/* Stage content — gated by next-action projection, not money status */}
          {stage === 'status' && <MoneyStatus detail={detail} />}

          {stage === 'method' && canFund && (
            <PaymentMethodPicker rails={detail.availableRails} onSelect={handleSelectRail} />
          )}
          {stage === 'method' && !canFund && (
            <MoneyStatus detail={detail} />
          )}

          {stage === 'review' && selectedRail && canFund && (
            <PaymentReview
              detail={{ ...detail, selectedRail }}
              onConfirm={handleConfirm}
              onBack={() => setStage('method')}
            />
          )}

          {stage === 'pending' && canCheckStatus && (
            <PaymentPending
              detail={{ ...detail, selectedRail, attemptInProgress: true, attemptReference: detail.attemptReference || 'SP-MNY-2026-0042' }}
              onCheckStatus={handleCheckStatus}
            />
          )}

          {stage === 'confirmed' && (
            <PaymentConfirmed detail={{ ...detail, selectedRail }} />
          )}

          {stage === 'unknown' && canCheckStatus && (
            <PaymentUnknownState
              detail={{ ...detail, selectedRail, attemptInProgress: true }}
              onCheckStatus={handleCheckStatus}
            />
          )}

          {stage === 'failed' && (
            <PaymentFailedState
              detail={detail}
              onRetry={canTryAgain ? handleRetry : undefined}
              onChooseAnother={canChooseAnother ? handleChooseAnother : undefined}
            />
          )}

          {/* Activity */}
          {detail.activity.length > 0 && <MoneyActivity items={detail.activity} />}
        </div>
      </div>
    </div>
  );
}
