import { useState, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, FileText, Search, Sparkles, Users } from 'lucide-react';
import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import { ConversationInput } from './ConversationInput';
import { FairTradeAffordance, FairTradePrinciplesPanel } from './FairTradePrinciples';
import { NeedsAttentionList } from './NeedsAttentionList';
import { WaitingOnOthersList } from './WaitingOnOthersList';
import { RecentActivity } from './RecentActivity';
import { HomeWorkbenchSummary } from './HomeWorkbenchSummary';
import { UpcomingEventsList } from './UpcomingEventsList';
import { ProblemsList } from './ProblemsList';
import { AgreementMoneyByCurrencySummary } from './AgreementMoneyByCurrencySummary';
import { InvitationsForYou } from './InvitationsForYou';
import type { AttentionItem, WaitingItem, ActivityEntry, ProblemItem, MoneyByCurrencyItem } from '../types';
import type { CalendarEventView, InvitationForYouCardView } from '../features/workspace/view';

interface SignedInHomeProps {
  onStart: (text: string) => void;
  attentionItems: AttentionItem[];
  waitingItems: WaitingItem[];
  recentActivity: ActivityEntry[];
  /** Phase 3 KSCalendar: upcoming events across every Agreement the person can read. Defaults to empty. */
  upcomingEvents?: (CalendarEventView & { agreementId: string; agreementTitle: string })[];
  /** Final Phase 3 correction (Section 9): real Agreement review/dispute state. Defaults to empty. */
  problems?: ProblemItem[];
  /** Final Phase 3 correction (Section 9): real Agreement Money by currency. Defaults to empty. */
  moneyByCurrency?: MoneyByCurrencyItem[];
  /** PHASE 4 NEXT SLICE (Section 4): invitations the authenticated caller can review, from GET /agreement-invitations/me. Defaults to empty. */
  invitations?: InvitationForYouCardView[];
  onOpenAgreement: (id: string) => void;
  onNavigateAgreements: () => void;
  /** PHASE 4 NEXT SLICE (Section 7): opens the existing recipient review experience by invitation id — never Home's own detail page. Real callers must supply this; the fixture/demo app never renders any invitations, so its own no-op default is never actually reachable. */
  onReviewInvitation?: (invitationId: string) => void;
  /** KS001 Upgrade Phase 4 final convergence (Section 4): the real "View all invitations" doorway to the dedicated Invitations surface. */
  onViewAllInvitations?: () => void;
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
  /** Phase 7 Slice 5B -- an optional lower-page doorway (The Trust Project), rendered BELOW the conversation
   *  and the person's own lists; omitted, the markup is unchanged. */
  belowHome?: ReactNode;
  /** Phase 7 Slice 6 -- a Problem is a Review/dispute fact: open its Agreement on Support (Reviews &amp; issues). Defaults to onOpenAgreement. */
  onOpenProblem?: (id: string) => void;
}

const fixtureGreeting = 'Welcome back, James';
const fixtureSubheading = 'SecurePay remembers your agreements, people and activity. Ask anything, or start something new.';
const fixturePrompts = ['Show me everything waiting for me', 'Which agreements changed this week?', 'What did Peter agree to?', 'Find my agreement with Kamau'];

export function SignedInHome({
  onStart,
  attentionItems,
  waitingItems,
  recentActivity,
  upcomingEvents = [],
  problems = [],
  moneyByCurrency = [],
  invitations = [],
  onOpenAgreement,
  onNavigateAgreements,
  onReviewInvitation = () => {},
  onViewAllInvitations = () => {},
  greeting = fixtureGreeting,
  subheading = fixtureSubheading,
  suggestedPrompts = fixturePrompts,
  belowHome,
  onOpenProblem,
}: SignedInHomeProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  const needsCount = attentionItems.length + invitations.length;
  const waitingCount = waitingItems.length;
  const momentumCount = recentActivity.length + upcomingEvents.length;
  const quickActions = [
    { label: 'Plan', help: 'Turn an idea into a clear plan', icon: FileText, prompt: 'Help me turn an idea into a clear plan.' },
    { label: 'Compare', help: 'Make the options obvious', icon: Search, prompt: 'Help me compare my options before I decide.' },
    { label: 'Prepare Agreement', help: 'Make the commitment clear', icon: CheckCircle2, prompt: 'Help me prepare a clear agreement from what I am trying to do.' },
    { label: 'Find People', help: 'Connect the right people', icon: Users, prompt: 'Help me work out who I need and how SecurePay can help me find them.' },
  ];

  return (
    <div className="sp-life-canvas flex-1 overflow-y-auto scrollbar-thin pb-24 md:pb-0">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-8 md:py-8">
        <section className="sp-hero sp-lift-in px-5 py-6 md:px-9 md:py-9">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3">
              <img src={securepayMark} alt="SecurePay" className="h-9 w-9 md:h-10 md:w-10" />
              <div>
                <div className="sp-kicker">KS001</div>
                <div className="mt-0.5 text-xs text-sand-500">{greeting}</div>
              </div>
            </div>

            <h1 className="sp-display mt-5 max-w-2xl text-[2.65rem] md:text-6xl">
              What do you want to make <span className="sp-real-word">real</span> today?
            </h1>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-6 text-sand-700 md:text-base">
              {subheading} KS001 can help you think, plan, compare, prepare an Agreement, find people and move into action.
            </p>

            <div className="mt-6">
              <ConversationInput onSend={onStart} placeholder="Tell KS001 what you want to make happen…" />
            </div>
            <button
              type="button"
              onClick={() => {
                const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[placeholder*="Tell KS001"], textarea[placeholder*="Tell KS001"]');
                input?.focus();
              }}
              className="sp-primary-action mt-3 flex w-full items-center justify-between px-5 text-[0.92rem] font-semibold md:max-w-xl"
            >
              <span className="flex items-center gap-2.5"><Sparkles className="h-4 w-4" /> Start with KS001</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-3">
              <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
            </div>
          </div>
        </section>

        <section aria-label="Quick starts" className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {quickActions.map(({ label, help, icon: Icon, prompt }, index) => (
            <button
              key={label}
              type="button"
              onClick={() => onStart(prompt)}
              className="sp-action-tile sp-settle p-3.5 text-left"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-3 block text-[0.82rem] font-semibold leading-4 text-forest-900">{label}</span>
              <span className="mt-1 block text-[0.68rem] leading-4 text-sand-500">{help}</span>
            </button>
          ))}
        </section>

        <section className="mt-7 md:grid md:grid-cols-[1.15fr_0.85fr] md:gap-6">
          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="sp-kicker">Your world today</div>
                <h2 className="font-display mt-1 text-2xl text-forest-900">See what is moving.</h2>
              </div>
              <button onClick={onNavigateAgreements} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-forest-700">
                Agreements <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="sp-section p-3.5">
                <div className="sp-value text-2xl">{needsCount}</div>
                <div className="mt-1 text-[0.68rem] font-medium text-sand-600">Need you</div>
              </div>
              <div className="sp-section p-3.5">
                <div className="sp-value text-2xl">{waitingCount}</div>
                <div className="mt-1 text-[0.68rem] font-medium text-sand-600">Waiting</div>
              </div>
              <div className="sp-section p-3.5">
                <div className="sp-value text-2xl">{momentumCount}</div>
                <div className="mt-1 text-[0.68rem] font-medium text-sand-600">Moving</div>
              </div>
            </div>

            <div className="mt-4 space-y-5">
              <InvitationsForYou items={invitations} onReview={onReviewInvitation} onViewAll={onViewAllInvitations} />
              <NeedsAttentionList items={attentionItems} onOpenAgreement={onOpenAgreement} />
              <WaitingOnOthersList items={waitingItems} onOpenAgreement={onOpenAgreement} />
              <ProblemsList items={problems} onOpenAgreement={onOpenProblem ?? onOpenAgreement} />
              <UpcomingEventsList items={upcomingEvents} onOpenAgreement={onOpenAgreement} />
            </div>
          </div>

          <div className="mt-7 md:mt-0">
            <div className="sp-section-warm p-4 md:sticky md:top-20">
              <div className="sp-kicker">Progress you can feel</div>
              <h2 className="font-display mt-1 text-xl text-forest-900">Small wins become real work.</h2>
              <p className="mt-2 text-[0.78rem] leading-5 text-sand-600">
                SecurePay keeps the hard parts underneath. You keep the clear next step in front of you.
              </p>

              <div className="mt-4 sp-progress-track" aria-hidden="true">
                <div className="sp-progress-fill" style={{ width: `${Math.min(100, 24 + Math.min(76, momentumCount * 12))}%` }} />
              </div>

              <div className="mt-5 space-y-5">
                <RecentActivity items={recentActivity} onOpenAgreement={onOpenAgreement} />
                <AgreementMoneyByCurrencySummary items={moneyByCurrency} />
              </div>

              <div className="mt-5 border-t border-cream-300/70 pt-4">
                <div className="text-[0.7rem] font-semibold text-forest-800">Not sure where to begin?</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => onStart(prompt)}
                      className="min-h-11 rounded-full border border-cream-300 bg-white/75 px-3 text-[0.72rem] text-sand-700 transition-colors hover:border-forest-300 hover:text-forest-800"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {belowHome && <div className="mt-12">{belowHome}</div>}
      </div>

      {fairTradeOpen && <FairTradePrinciplesPanel onClose={() => setFairTradeOpen(false)} />}
    </div>
  );

}
