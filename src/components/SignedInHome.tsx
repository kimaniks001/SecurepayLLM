import { AgentIcon } from './AgentIcon';
import { ConversationInput } from './ConversationInput';
import { NeedsAttentionList } from './NeedsAttentionList';
import { WaitingOnOthersList } from './WaitingOnOthersList';
import { RecentActivity } from './RecentActivity';
import { HomeWorkbenchSummary } from './HomeWorkbenchSummary';
import type { AttentionItem, WaitingItem, ActivityEntry } from '../types';

interface SignedInHomeProps {
  onStart: (text: string) => void;
  attentionItems: AttentionItem[];
  waitingItems: WaitingItem[];
  recentActivity: ActivityEntry[];
  onOpenAgreement: (id: string) => void;
  onNavigateAgreements: () => void;
  /**
   * Real callers must supply these three explicitly (never omit) so this component never has to guess
   * a truthful value itself; omitting them preserves the exact existing Bolt fixture text/prompts
   * unchanged. There is no verified authenticated display-name contract, and the general Agent
   * conversation endpoints remain `auth: 'none'` with no signed-in Agreement/people/activity context
   * wired into them — so real mode must never claim a person's name or an account-aware Agent memory,
   * and its suggested prompts must never presuppose personal history the Agent cannot truthfully answer.
   */
  greeting?: string;
  subheading?: string;
  suggestedPrompts?: string[];
}

const fixtureGreeting = 'Welcome back, James';
const fixtureSubheading = 'SecurePay remembers your agreements, people and activity. Ask anything, or start something new.';
const fixturePrompts = ['Show me everything waiting for me', 'Which agreements changed this week?', 'What did Peter agree to?', 'Find my agreement with Kamau'];

export function SignedInHome({
  onStart,
  attentionItems,
  waitingItems,
  recentActivity,
  onOpenAgreement,
  onNavigateAgreements,
  greeting = fixtureGreeting,
  subheading = fixtureSubheading,
  suggestedPrompts = fixturePrompts,
}: SignedInHomeProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: conversation entry */}
      <div className="flex-1 md:flex-[1.35] flex flex-col min-w-0 bg-cream-50">
        <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-cream-200/60">
          <AgentIcon state="listening" size={28} />
          <div>
            <div className="font-display text-sm text-forest-800">SecurePay</div>
            <div className="text-[0.7rem] text-sand-500">{greeting}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-6 animate-fade-in-down">
              <AgentIcon state="listening" size={56} />
            </div>
            <h1 className="font-display text-2xl md:text-3xl text-forest-800 font-medium leading-tight text-balance animate-fade-in-up">
              What are you trying to make happen?
            </h1>
            <p className="mt-3 text-[0.9rem] text-sand-600 leading-relaxed max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {subheading}
            </p>
            <div className="mt-6 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <ConversationInput onSend={onStart} placeholder="Ask SecurePay anything..." />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onStart(prompt)}
                  className="text-[0.8rem] text-sand-600 bg-cream-100 hover:bg-cream-200 border border-cream-200 rounded-full px-3.5 py-1.5 transition-colors hover:text-forest-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: needs attention + waiting below the fold */}
          <div className="md:hidden mt-8 space-y-6">
            <NeedsAttentionList items={attentionItems} onOpenAgreement={onOpenAgreement} />
            <WaitingOnOthersList items={waitingItems} onOpenAgreement={onOpenAgreement} />
            <RecentActivity items={recentActivity} onOpenAgreement={onOpenAgreement} />
            <button
              onClick={onNavigateAgreements}
              className="w-full text-center text-[0.85rem] font-medium text-forest-600 hover:text-forest-700 py-2"
            >
              View all agreements
            </button>
          </div>
        </div>
      </div>

      {/* Right: workbench */}
      <div className="hidden md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-100/50 min-w-0 overflow-y-auto scrollbar-thin">
        <div className="px-5 py-5 space-y-5">
          <HomeWorkbenchSummary
            needsCount={attentionItems.length}
            waitingCount={waitingItems.length}
            recentCount={recentActivity.length}
            onNavigateAgreements={onNavigateAgreements}
          />
          <NeedsAttentionList items={attentionItems} onOpenAgreement={onOpenAgreement} />
          <WaitingOnOthersList items={waitingItems} onOpenAgreement={onOpenAgreement} />
          <RecentActivity items={recentActivity} onOpenAgreement={onOpenAgreement} />
        </div>
      </div>
    </div>
  );
}
