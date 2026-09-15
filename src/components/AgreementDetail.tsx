import { useState } from 'react';
import { ArrowLeft, MessageCircle, Wallet } from 'lucide-react';
import type { AgreementDetail as AgreementDetailType, AgreementAction, Milestone, MoneyDetail } from '../types';
import { AgreementStatusBadge } from './AgreementStatusBadge';
import { AgreementOverview } from './AgreementOverview';
import { AgreementPeople } from './AgreementPeople';
import { AgreementTerms } from './AgreementTerms';
import { AgreementDocuments } from './AgreementDocuments';
import { AgreementActivity } from './AgreementActivity';
import { AgreementChanges } from './AgreementChanges';
import { MoneyAgreementContext } from './MoneyAgreementContext';
import { MoneyStatus } from './MoneyStatus';
import { AgreementSupport } from './AgreementSupport';
import { AgreementReuse } from './AgreementReuse';
import { AgreementStaleBanner } from './AgreementStaleBanner';
import { MilestoneProgress } from './MilestoneProgress';
import { ActionList } from './ActionList';
import { ConversationInput } from './ConversationInput';

interface AgreementProgress {
  milestones: Milestone[];
  isSimple: boolean;
  rootMilestone: Milestone;
  actions: AgreementAction[];
}

interface AgreementDetailProps {
  detail: AgreementDetailType;
  onBack: () => void;
  onAskAgent: (text: string) => void;
  isThinking: boolean;
  agentResponses: { text: string }[];
  isStale?: boolean;
  viewedVersion?: string;
  onViewCurrent?: () => void;
  onRaiseIssue?: () => void;
  onOpenMoney?: (id: string) => void;
  /**
   * The demo fixture's Money/progress source lives with its caller (see src/App.tsx), never inside this
   * locked component, so a real caller can never accidentally bundle or fall back to fixture Money/
   * milestone data. `null` means "real mode, no data for this section" (renders the section's own
   * truthful empty/unavailable state) — distinct from omitting the prop entirely.
   */
  money: MoneyDetail | null;
  progress: AgreementProgress | null;
}

type Tab = 'overview' | 'terms' | 'people' | 'documents' | 'activity' | 'changes' | 'money' | 'support' | 'progress';

const tabs: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'terms', label: 'Terms' },
  { value: 'people', label: 'People' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity', label: 'Activity' },
  { value: 'changes', label: 'Changes' },
  { value: 'money', label: 'Money' },
  { value: 'progress', label: 'Progress' },
  { value: 'support', label: 'Support' },
];

type MobileSection = 'overview' | 'people-terms' | 'documents' | 'activity-changes' | 'money' | 'progress' | 'support';

const mobileSections: { value: MobileSection; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'people-terms', label: 'People & terms' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity-changes', label: 'Activity & changes' },
  { value: 'money', label: 'Money' },
  { value: 'progress', label: 'Progress' },
  { value: 'support', label: 'Support' },
];

export function AgreementDetail({ detail, onBack, onAskAgent, isThinking, agentResponses, isStale, viewedVersion, onViewCurrent, onRaiseIssue, onOpenMoney, money, progress }: AgreementDetailProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [mobileSection, setMobileSection] = useState<MobileSection>('overview');
  const [showAgent, setShowAgent] = useState(false);

  const showVersion = detail.status !== 'taking_shape';
  const showReuse = detail.status === 'completed';
  const structure = progress;
  const moneyForAgreement = money;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Agreements
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{detail.title}</h1>
            <div className="mt-1.5 flex items-center gap-2.5 text-[0.75rem] text-sand-500">
              {showVersion && (
                <span>Version: <span className="text-forest-700 font-medium">{detail.version}</span></span>
              )}
              {showVersion && <span className="text-sand-300">·</span>}
              <AgreementStatusBadge status={detail.status} label={detail.statusLabel} />
            </div>
          </div>
        </div>
      </div>

      {/* Stale banner */}
      {isStale && onViewCurrent && viewedVersion && (
        <div className="px-4 md:px-6 pt-3">
          <AgreementStaleBanner
            viewedVersion={viewedVersion}
            currentVersion={detail.version}
            onViewCurrent={onViewCurrent}
          />
        </div>
      )}

      {/* Desktop: Tabbed workspace */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        <div className="px-4 md:px-6 py-2 border-b border-cream-200/60 bg-cream-50/50 flex gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`text-[0.78rem] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap transition-all ${
                tab === t.value
                  ? 'text-forest-700 bg-forest-50'
                  : 'text-sand-500 hover:text-forest-600 hover:bg-cream-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {tab === 'overview' && <AgreementOverview detail={detail} />}
            {tab === 'terms' && <AgreementTerms detail={detail} />}
            {tab === 'people' && <AgreementPeople people={detail.people} />}
            {tab === 'documents' && <AgreementDocuments documents={detail.documents} />}
            {tab === 'activity' && <AgreementActivity activity={detail.activity} />}
            {tab === 'changes' && <AgreementChanges changes={detail.changes} versions={detail.versions} />}
            {tab === 'money' && moneyForAgreement && (
              <>
                <MoneyAgreementContext detail={moneyForAgreement} />
                <MoneyStatus detail={moneyForAgreement} />
                {onOpenMoney && (
                  <button
                    onClick={() => onOpenMoney(detail.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    Open Money
                  </button>
                )}
              </>
            )}
            {tab === 'progress' && structure && (
              <>
                <MilestoneProgress milestones={structure.milestones} isSimple={structure.isSimple} rootMilestone={structure.rootMilestone} />
                <ActionList actions={structure.actions} />
              </>
            )}
            {tab === 'support' && <AgreementSupport onAskAgent={() => { setShowAgent(true); setTab('overview'); }} onRaiseIssue={onRaiseIssue} />}

            {showReuse && tab === 'overview' && <AgreementReuse detail={detail} />}

            {detail.status === 'cancelled' && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="text-[0.7rem] font-medium text-red-700 uppercase tracking-wide">Cancelled</div>
                <p className="text-[0.825rem] text-red-600 mt-1">
                  Cancelled by {detail.cancelledBy} on {detail.cancelledDate}
                </p>
                {detail.cancelledReason && (
                  <p className="text-[0.78rem] text-sand-600 mt-0.5">{detail.cancelledReason}</p>
                )}
              </div>
            )}
            {detail.status === 'expired' && (
              <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3">
                <div className="text-[0.7rem] font-medium text-sand-600 uppercase tracking-wide">Expired</div>
                <p className="text-[0.825rem] text-sand-600 mt-1">{detail.expiredReason || 'The invitation expired before the other party joined.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Calm section model */}
      <div className="md:hidden flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Section selector */}
          <div className="flex flex-wrap gap-2">
            {mobileSections.map((s) => (
              <button
                key={s.value}
                onClick={() => setMobileSection(s.value)}
                className={`text-[0.75rem] font-medium rounded-full px-3 py-1.5 transition-all ${
                  mobileSection === s.value
                    ? 'bg-forest-600 text-cream-50'
                    : 'bg-white text-sand-600 border border-cream-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Section content */}
          {mobileSection === 'overview' && (
            <>
              <AgreementOverview detail={detail} />
              {showReuse && <AgreementReuse detail={detail} />}
              {detail.status === 'cancelled' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="text-[0.7rem] font-medium text-red-700 uppercase tracking-wide">Cancelled</div>
                  <p className="text-[0.825rem] text-red-600 mt-1">
                    Cancelled by {detail.cancelledBy} on {detail.cancelledDate}
                  </p>
                  {detail.cancelledReason && (
                    <p className="text-[0.78rem] text-sand-600 mt-0.5">{detail.cancelledReason}</p>
                  )}
                </div>
              )}
              {detail.status === 'expired' && (
                <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3">
                  <div className="text-[0.7rem] font-medium text-sand-600 uppercase tracking-wide">Expired</div>
                  <p className="text-[0.825rem] text-sand-600 mt-1">{detail.expiredReason || 'The invitation expired before the other party joined.'}</p>
                </div>
              )}
            </>
          )}

          {mobileSection === 'people-terms' && (
            <>
              <AgreementPeople people={detail.people} />
              <AgreementTerms detail={detail} />
            </>
          )}

          {mobileSection === 'documents' && <AgreementDocuments documents={detail.documents} />}

          {mobileSection === 'activity-changes' && (
            <>
              <AgreementActivity activity={detail.activity} />
              <AgreementChanges changes={detail.changes} versions={detail.versions} />
            </>
          )}

          {mobileSection === 'money' && moneyForAgreement && (
            <>
              <MoneyAgreementContext detail={moneyForAgreement} />
              <MoneyStatus detail={moneyForAgreement} />
              {onOpenMoney && (
                <button
                  onClick={() => onOpenMoney(detail.id)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Open Money
                </button>
              )}
            </>
          )}

          {mobileSection === 'progress' && structure && (
            <>
              <MilestoneProgress milestones={structure.milestones} isSimple={structure.isSimple} rootMilestone={structure.rootMilestone} />
              <ActionList actions={structure.actions} />
            </>
          )}

          {mobileSection === 'support' && (
            <AgreementSupport onAskAgent={() => setShowAgent(true)} onRaiseIssue={onRaiseIssue} />
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
              placeholder="Ask about this agreement..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
