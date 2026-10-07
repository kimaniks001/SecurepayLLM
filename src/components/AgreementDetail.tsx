import { useState } from 'react';
import { ArrowLeft, MessageCircle, Printer, Wallet } from 'lucide-react';
import type { AgreementDetail as AgreementDetailType, AgreementAction, Milestone, MoneyDetail } from '../types';
import { AgreementStatusBadge } from './AgreementStatusBadge';
import { AgreementOverview } from './AgreementOverview';
import { AgreementPeople } from './AgreementPeople';
import { AgreementTerms } from './AgreementTerms';
import { AgreementDocuments } from './AgreementDocuments';
import { AgreementActivity } from './AgreementActivity';
import { AgreementChanges } from './AgreementChanges';
import { AgreementSupport } from './AgreementSupport';
import { AgreementReuse } from './AgreementReuse';
import { AgreementStaleBanner } from './AgreementStaleBanner';
import { MilestoneProgress } from './MilestoneProgress';
import { ActionList } from './ActionList';
import { ConversationInput } from './ConversationInput';
import { AgreementCalendarAndTags, type ConflictView, type TagView } from './AgreementCalendarAndTags';
import { AgentUnderstoodCard } from './AgentUnderstoodCard';
import { StatusNotice } from './dna/StatusNotice';
import type { AgentAgreementWorkspaceViewDto } from '../api/securepay/agent/dto';
import type { AgreementDetailResponse } from '../api/securepay/agreements/dto';
import { AgreementPrintRecord } from './AgreementPrintRecord';
import type { AgreementNextView, CalendarEventView } from '../features/workspace/view';

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
  /** UNDERSTOOD's structured half of an Agent answer -- see AgentUnderstoodCard's own doc. */
  understoodWorkspace?: AgentAgreementWorkspaceViewDto | null;
  isStale?: boolean;
  viewedVersion?: string;
  onViewCurrent?: () => void;
  onRaiseIssue?: () => void;
  /** Real path only: the canonical Agreement Review surface, shown from the Support tab/section. */
  reviewPanel?: React.ReactNode;
  /** Real path only: open on this tab (one-shot navigation hint from Help). */
  initialTab?: 'support';
  /** Real path only: opens Help & Support scoped to this Agreement. */
  onOpenHelp?: () => void;
  onOpenMoney?: (id: string) => void;
  onOpenReferral?: () => void;
  /**
   * The demo fixture's Money/progress source lives with its caller (see src/App.tsx), never inside this
   * locked component, so a real caller can never accidentally bundle or fall back to fixture Money/
   * milestone data. `null` means "real mode, no data for this section" (renders the section's own
   * truthful empty/unavailable state) — distinct from omitting the prop entirely.
   */
  money: MoneyDetail | null;
  progress: AgreementProgress | null;
  /**
   * Deep-review correction: the authoritative first next action for this Agreement, already
   * backend-sorted (never re-ranked here) -- distinct from `progress.actions`, which is honestly
   * always empty in real production (see agreementProgressView's own doc comment). `null` means no
   * action is currently due for this participant; Overview shows nothing rather than a fallback.
   */
  next?: AgreementNextView | null;
  /** Phase 3 Living Agreements -- KSCalendar + personal tags for this one Agreement. */
  events?: CalendarEventView[];
  conflicts?: ConflictView[];
  tags?: TagView[];
  onAddTag?: (label: string) => void;
  onRemoveTag?: (tagId: string) => void;
  /** Real mode: the Invite action + invitation list, rendered inside the People area. */
  peopleExtra?: React.ReactNode;
  /** Real mode: replaces the fixture Changes content with versions + proposed changes. */
  changesPanel?: React.ReactNode;
  /** Real mode: replaces the fixture Progress content (which infers a root milestone and status locally) with SecurePay's own execution reads. */
  progressPanel?: React.ReactNode;
  /** Real mode: something the caller should see before the tabs (e.g. a version that needs their review). */
  topExtra?: React.ReactNode;
  /** Real projection composed by the caller; section controls navigate without changing authority. */
  overviewPanel?: (open: (section: 'progress' | 'people' | 'documents' | 'changes') => void) => React.ReactNode;
  /** Current backend Agreement record used only for the printable document. No print field is invented client-side. */
  printRecord?: AgreementDetailResponse | null;
}

type Tab = 'overview' | 'terms' | 'people' | 'documents' | 'activity' | 'changes' | 'money' | 'support' | 'progress' | 'calendar';

const primaryTabs: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'people', label: 'People' },
  { value: 'money', label: 'Money' },
  { value: 'activity', label: 'Activity' },
];

const fullRecordTabs: { value: Tab; label: string }[] = [
  { value: 'terms', label: 'Terms' },
  { value: 'documents', label: 'Documents' },
  { value: 'changes', label: 'Changes' },
  { value: 'progress', label: 'Progress' },
  { value: 'calendar', label: 'Calendar & tags' },
  { value: 'support', label: 'Support' },
];

type MobileSection = 'overview' | 'people-terms' | 'documents' | 'activity-changes' | 'money' | 'progress' | 'calendar' | 'support';

const primaryMobileSections: { value: MobileSection; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'people-terms', label: 'People' },
  { value: 'money', label: 'Money' },
  { value: 'progress', label: 'Milestones' },
];

const moreMobileSections: { value: MobileSection; label: string }[] = [
  { value: 'documents', label: 'Documents' },
  { value: 'activity-changes', label: 'Activity & changes' },
  { value: 'calendar', label: 'Calendar & tags' },
  { value: 'support', label: 'Support & reviews' },
];


function AgreementMoneySummary({ money, onOpen }: { money: MoneyDetail; onOpen?: () => void }) {
  return (
    <section aria-label="Money for this Agreement" className="rounded-2xl border border-forest-200 bg-white px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Money</p>
          <p className="mt-1 font-display text-2xl text-forest-900">{money.amount}</p>
          <p className="mt-2 text-sm font-medium text-forest-800">{money.stateLabel}</p>
          <p className="mt-1 text-sm text-sand-600">
            {(money.moneyRecordCount ?? 0) > 0
              ? `${money.moneyRecordCount ?? 0} money event${(money.moneyRecordCount ?? 0) === 1 ? '' : 's'} recorded for this Agreement.`
              : 'No Agreement Money activity is recorded here yet.'}
          </p>
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="sp-primary-action min-h-11 shrink-0 px-5 text-[0.825rem] font-semibold"
          >
            <Wallet className="mr-2 inline-block h-4 w-4" />
            See Money
          </button>
        )}
      </div>
      <p className="mt-4 border-t border-cream-100 pt-3 text-xs leading-5 text-sand-500">
        SecurePay re-checks current funding, release and movement authority when you open Money. This summary does not create a financial permission.
      </p>
    </section>
  );
}

export function AgreementDetail({ detail, onBack, onAskAgent, isThinking, agentResponses, understoodWorkspace = null, isStale, viewedVersion, onViewCurrent, onRaiseIssue, reviewPanel, initialTab, onOpenHelp, onOpenMoney, onOpenReferral, money, progress, next = null, events = [], conflicts = [], tags = [], onAddTag, onRemoveTag, peopleExtra, changesPanel, progressPanel, topExtra, overviewPanel, printRecord = null }: AgreementDetailProps) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'overview');
  const [mobileSection, setMobileSection] = useState<MobileSection>(initialTab ?? 'overview');
  const [showAgent, setShowAgent] = useState(false);

  const showVersion = detail.status !== 'taking_shape';
  const showReuse = detail.status === 'completed';
  const structure = progress;
  const moneyForAgreement = money;
  const openSection = (section: 'progress' | 'people' | 'documents' | 'changes') => {
    setTab(section);
    setMobileSection(section === 'people' ? 'people-terms' : section === 'changes' ? 'activity-changes' : section);
  };

  return (
    <div className="sp-life-canvas flex-1 flex flex-col overflow-hidden">
      {/* Header — the Agreement should feel understood before it feels legal. */}
      <div className="px-4 pt-4 md:px-6 md:pt-5">
        <div className="sp-hero px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-3">
            <button onClick={onBack} className="flex min-h-11 items-center gap-1.5 text-[0.78rem] font-medium text-sand-500 hover:text-forest-700 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Agreements
            </button>
            {printRecord && (
              <button type="button" onClick={() => window.print()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest-200 bg-white/80 px-4 text-[0.78rem] font-semibold text-forest-700 shadow-soft hover:border-forest-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print agreement
              </button>
            )}
          </div>
          <div className="mt-1 max-w-3xl">
            <div className="sp-kicker">Living Agreement</div>
            <h1 className="sp-display mt-2 text-[2rem] md:text-4xl">{detail.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[0.72rem] text-sand-500">
              <AgreementStatusBadge status={detail.status} label={detail.statusLabel} />
              {showVersion && <span className="rounded-full bg-white/70 px-2.5 py-1">Version {detail.version}</span>}
            </div>
            <p className="mt-3 max-w-2xl text-[0.78rem] leading-5 text-sand-600">
              See the people, commitments, progress and money around this Agreement without losing the thread.
            </p>
          </div>
        </div>
      </div>

      {printRecord && <AgreementPrintRecord detail={printRecord} statusLabel={detail.statusLabel} />}

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
      {topExtra && <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50/60 max-h-[70vh] overflow-y-auto">{topExtra}</div>}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        <div className="px-4 md:px-6 py-2 border-b border-cream-200/60 bg-cream-50/50 flex items-center gap-1">
          {primaryTabs.map((t) => (
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
          <details className="relative ml-auto" open={fullRecordTabs.some(t => t.value === tab)}>
            <summary className={`cursor-pointer list-none text-[0.78rem] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap transition-all ${
              fullRecordTabs.some(t => t.value === tab)
                ? 'text-forest-700 bg-forest-50'
                : 'text-sand-500 hover:text-forest-600 hover:bg-cream-100'
            }`}>
              Full record
            </summary>
            <div className="absolute right-0 z-20 mt-2 min-w-52 rounded-2xl border border-cream-200 bg-white p-2 shadow-lg">
              {fullRecordTabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={`block min-h-11 w-full rounded-xl px-3 text-left text-[0.78rem] font-medium ${
                    tab === t.value ? 'bg-forest-50 text-forest-800' : 'text-sand-600 hover:bg-cream-50 hover:text-forest-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </details>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {tab === 'overview' && (overviewPanel ? overviewPanel(openSection) : <AgreementOverview detail={detail} next={next} />)}
            {tab === 'terms' && <AgreementTerms detail={detail} />}
            {tab === 'people' && <AgreementPeople people={detail.people}>{peopleExtra}</AgreementPeople>}
            {tab === 'documents' && <AgreementDocuments documents={detail.documents} />}
            {tab === 'activity' && <AgreementActivity activity={detail.activity} />}
            {tab === 'changes' && (changesPanel ?? <AgreementChanges changes={detail.changes} versions={detail.versions} />)}
            {tab === 'money' && moneyForAgreement && (
              <AgreementMoneySummary money={moneyForAgreement} onOpen={onOpenMoney ? () => onOpenMoney(detail.id) : undefined} />
            )}
            {tab === 'progress' && progressPanel}
            {tab === 'progress' && !progressPanel && structure && (
              <>
                <MilestoneProgress milestones={structure.milestones} isSimple={structure.isSimple} rootMilestone={structure.rootMilestone} />
                <ActionList actions={structure.actions} />
              </>
            )}
            {tab === 'calendar' && onAddTag && onRemoveTag && (
              <AgreementCalendarAndTags events={events} conflicts={conflicts} tags={tags} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
            )}
            {tab === 'support' && <AgreementSupport onAskAgent={() => { setShowAgent(true); setTab('overview'); }} onRaiseIssue={onRaiseIssue} onOpenReferral={onOpenReferral} reviewPanel={reviewPanel} onOpenMoney={onOpenMoney ? () => onOpenMoney(detail.id) : undefined} onOpenHelp={onOpenHelp} initialOpenReviews={initialTab === 'support'} />}

            {showReuse && tab === 'overview' && <AgreementReuse detail={detail} />}

            {detail.status === 'cancelled' && (
              <StatusNotice tone="error" icon={false}>
                <div className="text-[0.7rem] font-medium uppercase tracking-wide">Cancelled</div>
                <p className="mt-1">Cancelled by {detail.cancelledBy} on {detail.cancelledDate}</p>
                {detail.cancelledReason && (
                  <p className="text-[0.78rem] text-sand-600 mt-0.5">{detail.cancelledReason}</p>
                )}
              </StatusNotice>
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
      <div className="md:hidden flex-1 overflow-y-auto scrollbar-thin px-4 py-4 pb-28">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Four obvious doors first; the full record stays available without crowding the first decision. */}
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-cream-200 bg-white/70 p-1.5 shadow-soft">
            {primaryMobileSections.map((s) => (
              <button
                key={s.value}
                onClick={() => setMobileSection(s.value)}
                className={`min-h-11 rounded-xl px-1.5 text-[0.68rem] font-semibold transition-all ${
                  mobileSection === s.value
                    ? 'bg-forest-700 text-cream-50 shadow-soft'
                    : 'text-sand-600 hover:bg-cream-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <details className="rounded-xl border border-cream-200/80 bg-white/60">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[0.72rem] font-medium text-sand-600">
              <span>Full Agreement record</span>
              <span className="text-sand-400">Documents · changes · calendar · support</span>
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-cream-200 p-2.5">
              {moreMobileSections.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setMobileSection(s.value)}
                  className={`min-h-11 rounded-xl border px-3 text-left text-[0.7rem] font-medium ${
                    mobileSection === s.value
                      ? 'border-forest-300 bg-forest-50 text-forest-800'
                      : 'border-cream-200 bg-white text-sand-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </details>

          {/* Section content */}
          {mobileSection === 'overview' && (
            <>
              {overviewPanel ? overviewPanel(openSection) : <AgreementOverview detail={detail} next={next} />}
              {showReuse && <AgreementReuse detail={detail} />}
              {detail.status === 'cancelled' && (
                <StatusNotice tone="error" icon={false}>
                  <div className="text-[0.7rem] font-medium uppercase tracking-wide">Cancelled</div>
                  <p className="mt-1">Cancelled by {detail.cancelledBy} on {detail.cancelledDate}</p>
                  {detail.cancelledReason && (
                    <p className="text-[0.78rem] text-sand-600 mt-0.5">{detail.cancelledReason}</p>
                  )}
                </StatusNotice>
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
              <AgreementPeople people={detail.people}>{peopleExtra}</AgreementPeople>
              <AgreementTerms detail={detail} />
            </>
          )}

          {mobileSection === 'documents' && <AgreementDocuments documents={detail.documents} />}

          {mobileSection === 'activity-changes' && (
            <>
              <AgreementActivity activity={detail.activity} />
              {changesPanel ?? <AgreementChanges changes={detail.changes} versions={detail.versions} />}
            </>
          )}

          {mobileSection === 'money' && moneyForAgreement && (
            <AgreementMoneySummary money={moneyForAgreement} onOpen={onOpenMoney ? () => onOpenMoney(detail.id) : undefined} />
          )}

          {mobileSection === 'progress' && progressPanel}
          {mobileSection === 'progress' && !progressPanel && structure && (
            <>
              <MilestoneProgress milestones={structure.milestones} isSimple={structure.isSimple} rootMilestone={structure.rootMilestone} />
              <ActionList actions={structure.actions} />
            </>
          )}

          {mobileSection === 'calendar' && onAddTag && onRemoveTag && (
            <AgreementCalendarAndTags events={events} conflicts={conflicts} tags={tags} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
          )}

          {mobileSection === 'support' && (
            <AgreementSupport onAskAgent={() => setShowAgent(true)} onRaiseIssue={onRaiseIssue} onOpenReferral={onOpenReferral} reviewPanel={reviewPanel} onOpenMoney={onOpenMoney ? () => onOpenMoney(detail.id) : undefined} onOpenHelp={onOpenHelp} initialOpenReviews={initialTab === 'support'} />
          )}
        </div>
      </div>

      {/* Agent bar */}
      <div className="px-4 md:px-6 py-3 border-t border-cream-200/60 bg-cream-50/60 backdrop-blur-sm">
        {showAgent && understoodWorkspace && (
          <div className="mb-2">
            <AgentUnderstoodCard workspace={understoodWorkspace} />
          </div>
        )}
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
