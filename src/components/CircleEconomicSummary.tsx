import { ArrowLeft, TrendingUp, Briefcase, HandHelping, ArrowRight, Users, Repeat, Store, FileText } from 'lucide-react';
import type { Circle, CircleEconomicActivity, EconomicActivityType } from '../types';

const activityIcon: Record<EconomicActivityType, typeof TrendingUp> = {
  external_opportunity_introduced: Briefcase,
  need_shared: HandHelping,
  opportunity_shared: Briefcase,
  help_offered: HandHelping,
  introduction_made: Users,
  work_passed: ArrowRight,
  source_used_for_trade: FileText,
  trade_started: TrendingUp,
  agreement_originated: FileText,
  repeat_work: Repeat,
  store_offer_used: Store,
  work_story_used: FileText,
  growth_contribution_recorded: TrendingUp,
};

const activityLabel: Record<EconomicActivityType, string> = {
  external_opportunity_introduced: 'Work brought in',
  need_shared: 'Need shared',
  opportunity_shared: 'Opportunity shared',
  help_offered: 'Help offered',
  introduction_made: 'Introduction made',
  work_passed: 'Work passed',
  source_used_for_trade: 'Source used for trade',
  trade_started: 'Trade started',
  agreement_originated: 'Agreement originated',
  repeat_work: 'Repeat work',
  store_offer_used: 'Store offer used',
  work_story_used: 'Work story used',
  growth_contribution_recorded: 'Growth contribution',
};

interface CircleEconomicSummaryProps {
  circle: Circle;
  onBack: () => void;
}

export function CircleEconomicSummary({ circle, onBack }: CircleEconomicSummaryProps) {
  const broughtIn = circle.economicActivity.filter((a) => a.type === 'external_opportunity_introduced' || a.type === 'need_shared' || a.type === 'opportunity_shared');
  const passed = circle.economicActivity.filter((a) => a.type === 'work_passed' || a.type === 'introduction_made');
  const trades = circle.economicActivity.filter((a) => a.type === 'trade_started' || a.type === 'source_used_for_trade');


  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {circle.name}
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Economic story</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Flow diagram */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">How work moves through the network</div>
          <div className="space-y-3">
            <div className="rounded-lg bg-cream-50 px-3 py-2">
              <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Outside project</div>
              <div className="text-[0.825rem] text-forest-800">Residential renovation in Westlands — introduced by James</div>
            </div>
            <div className="text-center text-sand-400">↓</div>
            <div className="rounded-lg bg-cream-50 px-3 py-2">
              <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Needs</div>
              <div className="text-[0.825rem] text-forest-800">Electrical · Plumbing · Painting</div>
            </div>
            <div className="text-center text-sand-400">↓</div>
            <div className="rounded-lg bg-cream-50 px-3 py-2">
              <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Members</div>
              <div className="text-[0.825rem] text-forest-800">Grace · Jane · Peter</div>
            </div>
            <div className="text-center text-sand-400">↓</div>
            <div className="rounded-lg bg-forest-50 px-3 py-2">
              <div className="text-[0.68rem] font-medium text-forest-600 uppercase tracking-wide">Trades</div>
              <div className="text-[0.825rem] text-forest-800">3 independent Circle-origin trades</div>
            </div>
          </div>
          <p className="text-[0.72rem] text-sand-400 mt-3">
            One external project led to three independent Circle-origin trades. Each trade is separate. Circle is not a party to any agreement.
          </p>
        </div>

        {/* Activity list */}
        <div>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Recent economic activity</div>
          <div className="space-y-2">
            {circle.economicActivity.map((item: CircleEconomicActivity) => {
              const Icon = activityIcon[item.type];
              return (
                <div key={item.id} className="rounded-xl border border-cream-200 bg-white px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-sand-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">{activityLabel[item.type]}</div>
                      <div className="text-[0.825rem] text-forest-800 mt-0.5">{item.description}</div>
                      <div className="flex items-center gap-2 mt-1 text-[0.68rem] text-sand-400">
                        <span>{item.actor}</span>
                        <span>·</span>
                        <span>{item.date}</span>
                        {item.introducerIdentity && (
                          <>
                            <span>·</span>
                            <span>Introducer: {item.introducerIdentity}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
            <Briefcase className="w-4 h-4 text-sand-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{broughtIn.length}</div>
            <div className="text-[0.65rem] text-sand-500">Brought in</div>
          </div>
          <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
            <ArrowRight className="w-4 h-4 text-sand-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{passed.length}</div>
            <div className="text-[0.65rem] text-sand-500">Passed</div>
          </div>
          <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-center">
            <TrendingUp className="w-4 h-4 text-sand-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{trades.length}</div>
            <div className="text-[0.65rem] text-sand-500">Trades started</div>
          </div>
        </div>

        {/* Growth contributions */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Growth contributions</div>
          <div className="space-y-2">
            {circle.members.map((member) => (
              <div key={member.personId} className="flex items-center justify-between text-[0.825rem]">
                <span className="text-forest-800">{member.name}</span>
                <span className="text-sand-500">{member.growthContributions} contribution{member.growthContributions !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.68rem] text-sand-400 mt-2">
            Growth credit is not Money, not a wallet balance, and not a financial entitlement.
          </p>
        </div>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Work brought in ≠ Circle revenue. Circle growth credit ≠ Money. No fake multipliers. Only factual linked activity.
        </p>
      </div>
    </div>
  );
}
