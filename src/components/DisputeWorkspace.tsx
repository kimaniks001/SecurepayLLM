import { useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { DisputeDetail } from '../types';
import { DisputeScopeView } from './DisputeScopeView';
import { DisputeAgreementCode } from './DisputeAgreementCode';
import { DisputeEvidenceView } from './DisputeEvidenceView';
import { DisputePositionsView } from './DisputePositionsView';
import { DisputeMatchingView } from './DisputeMatchingView';
import { DisputeMatchReached } from './DisputeMatchReached';
import { DisputeMasterList } from './DisputeMasterList';
import { DisputeMasterCost } from './DisputeMasterCost';
import { DisputeMasterAppointment } from './DisputeMasterAppointment';
import { DisputeMasterReview } from './DisputeMasterReview';
import { DisputeMasterOpinion } from './DisputeMasterOpinion';
import { DisputeResolved } from './DisputeResolved';
import { DisputeUnresolved } from './DisputeUnresolved';
import { DisputeAmountSummary } from './DisputeAmountSummary';
import { ConversationInput } from './ConversationInput';

interface DisputeWorkspaceProps {
  dispute: DisputeDetail;
  onBack: () => void;
  onAskAgent: (text: string) => void;
  isThinking: boolean;
  agentResponses: { text: string }[];
}

export function DisputeWorkspace({ dispute, onBack, onAskAgent, isThinking, agentResponses }: DisputeWorkspaceProps) {
  const [showAgent, setShowAgent] = useState(false);

  const stepLabel: Record<string, string> = {
    issue_raised: 'Issue raised',
    isolating_scope: 'Isolating disputed scope',
    scope_confirmed: 'Disputed scope confirmed',
    counterparty_reviews_scope: 'Counterparty reviewing scope',
    agreement_code: 'Agreement Code',
    evidence: 'Evidence',
    positions: 'Positions',
    matching: 'Matching',
    match_reached: 'Match reached',
    master_available: 'Master available',
    master_cost: 'Master cost',
    master_appointment: 'Master appointment',
    master_review: 'Master review',
    master_opinion: 'Master opinion',
    opinion_matching: 'Opinion matching',
    resolved: 'Resolved',
    unresolved: 'Unresolved',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {dispute.agreementTitle}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Dispute resolution</h1>
            <div className="mt-1.5 flex items-center gap-2.5 text-[0.75rem] text-sand-500">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium bg-ember-50 text-ember-700">
                <span className="w-1.5 h-1.5 rounded-full bg-ember-500" />
                {stepLabel[dispute.step] || dispute.step}
              </span>
              <span>Agreement: <span className="text-forest-700 font-medium">{dispute.agreementVersion}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Amount summary always visible */}
          <DisputeAmountSummary
            totalAgreementValue={dispute.totalAgreementValue}
            disputedAmount={dispute.disputedAmount}
            notDisputedAmount={dispute.notDisputedAmount}
          />

          {/* Step content */}
          {(dispute.step === 'issue_raised' || dispute.step === 'isolating_scope' || dispute.step === 'scope_confirmed' || dispute.step === 'counterparty_reviews_scope') && (
            <DisputeScopeView dispute={dispute} />
          )}

          {dispute.step === 'agreement_code' && <DisputeAgreementCode />}

          {dispute.step === 'evidence' && <DisputeEvidenceView evidence={dispute.evidence} />}

          {dispute.step === 'positions' && <DisputePositionsView positions={dispute.positions} />}

          {dispute.step === 'matching' && <DisputeMatchingView match={dispute.match} />}

          {dispute.step === 'match_reached' && <DisputeMatchReached dispute={dispute} />}

          {dispute.step === 'master_available' && <DisputeMasterList masters={dispute.masters || []} />}

          {dispute.step === 'master_cost' && <DisputeMasterCost dispute={dispute} />}

          {dispute.step === 'master_appointment' && <DisputeMasterAppointment dispute={dispute} />}

          {dispute.step === 'master_review' && <DisputeMasterReview dispute={dispute} />}

          {dispute.step === 'master_opinion' && <DisputeMasterOpinion dispute={dispute} />}

          {dispute.step === 'opinion_matching' && <DisputeMasterOpinion dispute={dispute} showMatching />}

          {dispute.step === 'resolved' && <DisputeResolved dispute={dispute} />}

          {dispute.step === 'unresolved' && <DisputeUnresolved dispute={dispute} />}

          {/* Evidence shown alongside later steps too */}
          {dispute.step !== 'evidence' && dispute.evidence.length > 0 && (
            <DisputeEvidenceView evidence={dispute.evidence} compact />
          )}
        </div>
      </div>

      {/* Agent bar */}
      <div className="px-4 md:px-6 py-3 border-t border-cream-200/60 bg-cream-50/60 backdrop-blur-sm">
        {showAgent && agentResponses.length > 0 && (
          <div className="mb-2 space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
            {agentResponses.map((r, i) => (
              <div key={i} className="text-[0.8rem] text-forest-800 bg-forest-50 rounded-lg px-3 py-2">
                {r.text}
              </div>
            ))}
          </div>
        )}
        {isThinking && (
          <div className="mb-2 text-[0.78rem] text-sand-400 px-3">SecurePay is thinking...</div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAgent((v) => !v)}
            className="flex items-center gap-1.5 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700 px-2.5 py-1.5 rounded-lg hover:bg-forest-50 transition-colors shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask
          </button>
          <div className="flex-1">
            <ConversationInput
              onSend={(text) => { setShowAgent(true); onAskAgent(text); }}
              placeholder="Ask about this dispute..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
