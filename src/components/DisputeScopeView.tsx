import { Check, Edit3, AlertCircle } from 'lucide-react';
import type { DisputeDetail } from '../types';
import { DisputeIsolationPicker } from './DisputeIsolationPicker';
import { disputeIsolationOptions } from '../milestoneData';

interface DisputeScopeViewProps {
  dispute: DisputeDetail;
}

export function DisputeScopeView({ dispute }: DisputeScopeViewProps) {
  const { scope, step } = dispute;
  const isConfirmed = step === 'scope_confirmed';
  const isCounterpartyReview = step === 'counterparty_reviews_scope';
  const isIsolating = step === 'issue_raised' || step === 'isolating_scope';
  const isolationOpts = (disputeIsolationOptions as Record<string, typeof disputeIsolationOptions['agr-bathroom']>)[dispute.agreementId];

  return (
    <div className="space-y-3 animate-quiet-in">
      {/* Proposer statement */}
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">What James says the problem is</div>
        <p className="text-[0.85rem] text-forest-800 leading-relaxed">{dispute.proposerStatement}</p>
      </div>

      {/* Disputed scope */}
      <div className="rounded-2xl border border-ember-200 bg-ember-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-ember-600" />
          <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Disputed</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Agreement</span>
            <span className="text-[0.825rem] font-medium text-forest-800">{scope.agreementTitle}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Current version</span>
            <span className="text-[0.825rem] font-medium text-forest-800">{scope.agreementVersion}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Obligation</span>
            <span className="text-[0.825rem] text-forest-800">{scope.disputedObligation}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Area</span>
            <span className="text-[0.825rem] text-forest-800">{scope.disputedArea}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Related term</span>
            <span className="text-[0.825rem] text-forest-800">{scope.relatedTerm}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Amount connected to dispute</span>
            <span className="text-[0.825rem] font-medium text-ember-700">{scope.disputedAmount}</span>
          </div>
        </div>
      </div>

      {/* Not in dispute */}
      <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Not in dispute</div>
        <ul className="space-y-1">
          {scope.notInDispute.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[0.825rem] text-sand-600">
              <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Dispute isolation picker for initial isolation */}
      {isIsolating && isolationOpts && (
        <DisputeIsolationPicker
          milestones={isolationOpts.milestones}
          obligations={isolationOpts.obligations}
          onSelect={(_msId, _obId) => {}}
        />
      )}

      {/* Counterparty review */}
      {isCounterpartyReview && (
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Peter's review</div>
          <p className="text-[0.825rem] text-sand-600">
            Peter sees the same disputed scope. He may agree, suggest a different scope, or respond to the issue.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
              <Check className="w-4 h-4" />
              Agree this is the correct disputed scope
            </button>
            <button className="flex items-center gap-1.5 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
              Suggest different scope
            </button>
          </div>
        </div>
      )}

      {/* Confirm scope */}
      {isConfirmed && (
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <p className="text-[0.85rem] text-sand-600 mb-3">
            This is the disputed scope. The rest of your agreement is still separate from this dispute.
          </p>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
              <Check className="w-4 h-4" />
              This is the correct disputed scope
            </button>
            <button className="flex items-center gap-1.5 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
              Change disputed scope
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
