import { useState } from 'react';
import { MessageCircle, LifeBuoy, Flag, Users, Scale, Wallet } from 'lucide-react';

interface AgreementSupportProps {
  onAskAgent: () => void;
  onRaiseIssue?: () => void;
  /** Optional so the existing fixture path stays byte-identical when omitted (Golden Spine H). Opens the
   * real Referral/Plug-attribution view scoped to this exact agreement. */
  onOpenReferral?: () => void;
  /** Real (non-fixture) path only: the canonical Agreement Review surface. When omitted the fixture 'Raise an issue' row is unchanged. */
  reviewPanel?: React.ReactNode;
  /** Real path only. Money entry (canonical Money) and Help & Support entry (scoped to this Agreement). */
  onOpenMoney?: () => void;
  onOpenHelp?: () => void;
  /** Real path only: one-shot hint from Help to open the Reviews & issues panel. */
  initialOpenReviews?: boolean;
}

export function AgreementSupport({ onAskAgent, onRaiseIssue, onOpenReferral, reviewPanel, onOpenMoney, onOpenHelp, initialOpenReviews = false }: AgreementSupportProps) {
  const [showReviews, setShowReviews] = useState(initialOpenReviews);
  const real = !!reviewPanel;
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Support</div>
      <p className="text-[0.85rem] text-sand-600 mb-3">Need help with this agreement?</p>
      <div className="space-y-2">
        <button onClick={onAskAgent} className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left">
          <MessageCircle className="w-4 h-4 text-forest-600 shrink-0" />
          <div>
            <div className="text-[0.825rem] font-medium text-forest-800">{real ? 'Ask KS001' : 'Ask SecurePay'}</div>
            <div className="text-[0.72rem] text-sand-500">{real ? 'Ask about this Agreement, its terms, people, progress or history' : 'Ask about terms, people, changes or history'}</div>
          </div>
        </button>
        {real ? (
          <div className="rounded-xl border border-cream-200 px-4 py-3">
            <div className="text-[0.825rem] font-medium text-forest-800">Human support</div>
            <div className="text-[0.72rem] text-sand-500">Human support requests are not yet available from this screen. SecurePay can still help you inspect the Agreement, Money and formal Review state here.</div>
          </div>
        ) : (
        <div className="flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3">
          <LifeBuoy className="w-4 h-4 text-sand-500 shrink-0" />
          <div>
            <div className="text-[0.825rem] font-medium text-forest-800">Request human support</div>
            <div className="text-[0.72rem] text-sand-500">Coming soon</div>
          </div>
        </div>
        )}
        {reviewPanel ? (
          <>
            <button onClick={() => setShowReviews(v => !v)} aria-expanded={showReviews} className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left">
              <Scale className="w-4 h-4 text-forest-600 shrink-0" />
              <div>
                <div className="text-[0.825rem] font-medium text-forest-800">Reviews &amp; issues</div>
                <div className="text-[0.72rem] text-sand-500">See formal reviews on this agreement</div>
              </div>
            </button>
            {showReviews && reviewPanel}
            {onOpenMoney && (
              <button onClick={onOpenMoney} className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left">
                <Wallet className="w-4 h-4 text-forest-600 shrink-0" />
                <div>
                  <div className="text-[0.825rem] font-medium text-forest-800">Money</div>
                  <div className="text-[0.72rem] text-sand-500">Funding, Payment Ready, release and settlement truth</div>
                </div>
              </button>
            )}
            {onOpenHelp && (
              <button onClick={onOpenHelp} className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left">
                <LifeBuoy className="w-4 h-4 text-forest-600 shrink-0" />
                <div>
                  <div className="text-[0.825rem] font-medium text-forest-800">Help &amp; Support</div>
                  <div className="text-[0.72rem] text-sand-500">Where SecurePay shows what it knows, and where to go next</div>
                </div>
              </button>
            )}
          </>
        ) : (
        <button
          onClick={onRaiseIssue}
          disabled={!onRaiseIssue}
          className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left ${
            onRaiseIssue
              ? 'border-cream-200 hover:border-ember-300 hover:bg-ember-50/30'
              : 'border-cream-200 opacity-50 cursor-not-allowed'
          }`}
        >
          <Flag className="w-4 h-4 text-ember-600 shrink-0" />
          <div>
            <div className="text-[0.825rem] font-medium text-forest-800">Raise an issue</div>
            <div className="text-[0.72rem] text-sand-500">
              {onRaiseIssue ? 'Start dispute resolution' : 'Available on active agreements'}
            </div>
          </div>
        </button>
        )}
        {onOpenReferral && (
          <button onClick={onOpenReferral} className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left">
            <Users className="w-4 h-4 text-forest-600 shrink-0" />
            <div>
              <div className="text-[0.825rem] font-medium text-forest-800">Referral &amp; Plug attribution</div>
              <div className="text-[0.72rem] text-sand-500">See who introduced this agreement, if anyone</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
