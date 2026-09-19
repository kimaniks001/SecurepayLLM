import { ArrowLeft, Users, ShieldCheck, Briefcase, Store, Sparkles, ChevronRight, HandHelping } from 'lucide-react';

interface TradeHelpPanelProps {
  onBack: () => void;
  onPlugs: () => void;
  onMasters: () => void;
  onSolutions: () => void;
  onPartners: () => void;
  onAskAgent: () => void;
  /** Optional so the existing fixture path (which never wired this button) stays byte-identical when
   * omitted. Real mode passes this to reach the real Referral experience (Golden Spine H). */
  onReferrals?: () => void;
}

export function TradeHelpPanel({ onBack, onPlugs, onMasters, onSolutions, onPartners, onAskAgent, onReferrals }: TradeHelpPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Help this trade happen</h1>
        <p className="text-[0.72rem] text-sand-500 mt-0.5">Find people and services that can help make your trade possible, safer, or verified</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-3">
        {/* Agent entry */}
        <button
          onClick={onAskAgent}
          className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] font-medium text-forest-600">
            <Sparkles className="w-3.5 h-3.5" />
            Not sure who you need?
          </span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">Tell SecurePay what you're trying to do and we'll suggest the right kind of help</p>
        </button>

        {/* Connect me */}
        <button
          onClick={onPlugs}
          className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center shrink-0">
              <HandHelping className="w-4.5 h-4.5 text-forest-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">People who can connect</div>
              <p className="text-[0.72rem] text-sand-500 mt-0.5">Plugs who help find providers, navigate options, and connect parties</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
          </div>
        </button>

        {/* Expert help */}
        <button
          onClick={onMasters}
          className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">Expert help — Masters</div>
              <p className="text-[0.72rem] text-sand-500 mt-0.5">Trusted subject-matter experts for assessment, inspection, and professional guidance</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
          </div>
        </button>

        {/* Solutions */}
        <button
          onClick={onSolutions}
          className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
              <Briefcase className="w-4.5 h-4.5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">Formal solutions</div>
              <p className="text-[0.72rem] text-sand-500 mt-0.5">Inspection, valuation, funding, insurance, legal support, and other institutional services</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
          </div>
        </button>

        {/* Partners */}
        <button
          onClick={onPartners}
          className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
              <Store className="w-4.5 h-4.5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">Partners</div>
              <p className="text-[0.72rem] text-sand-500 mt-0.5">Banks, SACCOs, insurers, inspection firms, and other accredited institutions</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
          </div>
        </button>

        {/* Referral history */}
        <button
          onClick={onReferrals}
          className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">Referral history</div>
              <p className="text-[0.72rem] text-sand-500 mt-0.5">See who introduced whom and referral evaluation status</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
          </div>
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Discovery ≠ endorsement. The people who help a trade happen must remain distinct from the parties who actually agree the trade.
        </p>
      </div>
    </div>
  );
}
