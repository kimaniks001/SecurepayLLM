import { ArrowLeft, Users, Check, Clock, ArrowRight } from 'lucide-react';
import { demoReferralEvaluations } from '../ecosystemData';
import { demoIntroductions } from '../circleData';

interface ReferralHistoryViewProps {
  onBack: () => void;
}

export function ReferralHistoryView({ onBack }: ReferralHistoryViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Referral history</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-3">
        {demoReferralEvaluations.map((ref) => {
          const intro = demoIntroductions.find((i) => i.introductionId === ref.introductionId);
          return (
            <div key={ref.referralId} className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-sand-400" />
                <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Referral</span>
              </div>
              {intro && (
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-baseline justify-between text-[0.78rem]">
                    <span className="text-sand-600">Introduced by</span>
                    <span className="text-forest-800 font-medium">{intro.introducedByIdentity}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[0.78rem]">
                    <span className="text-sand-600">Introduced to</span>
                    <span className="text-forest-800">{intro.introducedPartyIdentity}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[0.78rem]">
                    <span className="text-sand-600">For</span>
                    <span className="text-forest-800">{intro.recipientIdentity || '—'}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[0.78rem]">
                    <span className="text-sand-600">Type</span>
                    <span className="text-forest-800 capitalize">{intro.relationshipType.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              )}

              {/* Evaluation status */}
              <div className="pt-3 border-t border-cream-100 space-y-1.5">
                <div className="flex items-center justify-between text-[0.78rem]">
                  <span className="text-sand-600">Candidate status</span>
                  <div className="flex items-center gap-1.5">
                    {ref.candidateStatus === 'qualified' && <Check className="w-3.5 h-3.5 text-forest-500" />}
                    {ref.candidateStatus === 'candidate' && <Clock className="w-3.5 h-3.5 text-sand-400" />}
                    <span className={`font-medium ${ref.candidateStatus === 'qualified' ? 'text-forest-600' : 'text-sand-500'}`}>
                      {ref.candidateStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[0.78rem]">
                  <span className="text-sand-600">Qualification</span>
                  <span className={`font-medium ${ref.qualificationStatus === 'qualified' ? 'text-forest-600' : 'text-sand-500'}`}>
                    {ref.qualificationStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[0.78rem]">
                  <span className="text-sand-600">Reward status</span>
                  <span className={`font-medium ${ref.rewardStatus === 'eligible_pending' ? 'text-ember-600' : ref.rewardStatus === 'earned' ? 'text-forest-600' : 'text-sand-400'}`}>
                    {ref.rewardStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {ref.reasonCodes && ref.reasonCodes.length > 0 && (
                <div className="mt-2 text-[0.72rem] text-sand-500">
                  {ref.reasonCodes.map((r, i) => <div key={i}>· {r}</div>)}
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">How referrals work</div>
          <div className="space-y-1 text-[0.78rem] text-sand-600">
            <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-sand-400" /> Introduction recorded</div>
            <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-sand-400" /> Referral candidate identified</div>
            <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-sand-400" /> Qualification evaluated by authoritative backend</div>
            <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-sand-400" /> If qualified and qualifying event occurs: reward eligible</div>
            <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-sand-400" /> Reward paid separately from Agreement Money</div>
          </div>
          <p className="text-[0.68rem] text-sand-400 mt-2">
            Referral candidate does not automatically become qualified. Qualified referral does not automatically mean reward paid. Reward does not alter Agreement trade Money.
          </p>
        </div>
      </div>
    </div>
  );
}
