import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Search, FileText, MessageSquareText } from 'lucide-react';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type { NotificationEvent, NotificationsGateway } from '../../api/securepay/notifications';
import type { AgreementConversationHit, AgreementMessagesGateway } from '../../api/securepay/agreement-messages';
import { AgreementThreadPanel } from './AgreementThreadPanel';
import { parseNotificationActionKey } from '../../api/securepay/notifications';
import { parseArchiveSearch, uniqueAgreements, type ArchiveSearchPlan } from './archiveSearch';

import type { SessionStore } from '../../api/securepay/session';
type HistoryGateways = {
  agreements: Pick<AgreementGateway, 'searchAgreements'>;
  notifications: Pick<NotificationsGateway, 'search' | 'get'>;
  messages?: AgreementMessagesGateway;
};

type SearchOutcome = {
  agreements: CurrentUserAgreementSummaryResponse[];
  notifications: NotificationEvent[];
  conversations: AgreementConversationHit[];
  conversationsError: string | null;
  agreementCount: number | null;
  notificationsHasMore: boolean;
  agreementsError: string | null;
  notificationsError: string | null;
};
const empty: SearchOutcome = {
  agreements: [], notifications: [], conversations: [], conversationsError: null, agreementCount: null,
  notificationsHasMore: false, agreementsError: null, notificationsError: null,
};
function dateLabel(iso: string) {
  return Number.isFinite(Date.parse(iso))
    ? new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Date unavailable';
}

/**
 * Canonical archive search for personal Mini:
 * - actual Agreement results come from existing participant-authorized /me/agreements/search.
 * - real Inbox events come from B4 recipient-only /notifications/me/search.
 * - both are queried independently so one outage never manufactures "no results"
 *   for the other.
 * - the action points to original Agreement (authorization rechecked) or original
 *   notification (owner-only detail read).
 *
 * This is NOT peer-to-peer threaded messaging or semantic document OCR.
 * Historical data not imported to SecurePay is unavailable, never invented.
 */
export function ArchiveSearchPanel({
  gateway, onOpenAgreement, session,
}: {
  gateway: HistoryGateways;
  session: SessionStore;
  onOpenAgreement: (agreementId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<ArchiveSearchPlan | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'invalid'>('idle');
  const [results, setResults] = useState<SearchOutcome>(empty);
  const [message, setMessage] = useState<string | null>(null);
  const [opened, setOpened] = useState<NotificationEvent | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const serial = useRef(0);
  const owner = useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const [resultOwner, setResultOwner] = useState(owner);
  useEffect(() => {
    serial.current++;
    setPhase('idle'); setResults(empty); setOpened(null); setThreadId(null); setResultOwner(owner);
    setMessage(null); setDetailError(null); setPlan(null); setQuery('');
  }, [owner]);

  async function find(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const request = ++serial.current;
    const ownerAtRequest = session.getSnapshot();
    setResultOwner(ownerAtRequest);
    let criteria: ArchiveSearchPlan;
    try { criteria = parseArchiveSearch(query); }
    catch {
      setPhase('invalid'); setMessage('Describe a deal, a person, a product or a year to search.');
      setResults(empty); return;
    }
    setPlan(criteria); setPhase('loading'); setMessage(null); setOpened(null); setThreadId(null);
    setDetailError(null); setResults(empty); setMoreBusy(false);
    const agreementArgs = {
      subject: criteria.subject ?? undefined,
      person: criteria.person ?? undefined,
      fromDate: criteria.fromDate ?? undefined,
      toDate: criteria.toDate ?? undefined,
      page: 0, size: 20,
    };
    // When no person was explicitly named, check the same user text as
    // subject *and* person separately. The API owns both searches and permissions.
    const fallbackPerson = !criteria.explicitPerson && criteria.subject
      ? gateway.agreements.searchAgreements({
          person: criteria.subject, fromDate: criteria.fromDate ?? undefined,
          toDate: criteria.toDate ?? undefined, page: 0, size: 20,
        })
      : null;
    const [agreement, notification, other, conversation] = await Promise.allSettled([
      gateway.agreements.searchAgreements(agreementArgs),
      gateway.notifications.search({
        query: criteria.notificationQuery,
        fromDate: criteria.fromDate ?? undefined, toDate: criteria.toDate ?? undefined,
        page: 0, size: 20,
      }),
      fallbackPerson,
      gateway.messages ? gateway.messages.search({
        query: criteria.notificationQuery,
        fromDate: criteria.fromDate ?? undefined, toDate: criteria.toDate ?? undefined,
        page: 0, size: 20,
      }) : Promise.resolve(null),
    ]);
    if (serial.current !== request || session.getSnapshot() !== ownerAtRequest) return;

    const agreementPages = [];
    let agreementsError: string | null = null;
    let agreementCount: number | null = null;
    if (agreement.status === 'fulfilled') {
      agreementPages.push(agreement.value.items);
      agreementCount = agreement.value.totalElements;
    } else agreementsError = 'Agreement search is unavailable right now.';
    if (other.status === 'fulfilled' && other.value) {
      agreementPages.push(other.value.items);
      agreementCount = agreementCount === null ? other.value.totalElements : null;
    }
    const items = uniqueAgreements(agreementPages);
    const messages = notification.status === 'fulfilled' ? notification.value : [];
    setResults({
      agreements: items, notifications: messages,
      conversations: conversation.status === 'fulfilled' ? (conversation.value ?? []) : [],
      conversationsError: !gateway.messages ? 'Agreement messaging is not connected here.'
        : conversation.status === 'rejected' ? 'Conversation search is unavailable right now.' : null,
      agreementCount, notificationsHasMore: messages.length === 20,
      agreementsError, notificationsError: notification.status === 'rejected'
        ? 'Inbox search is unavailable right now.' : null,
    });
    setPhase('ready');
  }

  async function openOriginal(notificationId: string) {
    const ownerAtRequest = session.getSnapshot();
    setDetailError(null); setOpened(null);
    try {
      const event = await gateway.notifications.get(notificationId);
      if (session.getSnapshot() !== ownerAtRequest) return;
      if (event.id !== notificationId) throw new Error('Mismatched Inbox record');
      setOpened(event);
    } catch {
      if (session.getSnapshot() === ownerAtRequest)
        setDetailError('SecurePay could not retrieve that original Inbox record under this KSNumber.');
    }
  }

  async function loadOlder() {
    if (!plan || moreBusy || !results.notificationsHasMore) return;
    const request = serial.current;
    const page = Math.floor(results.notifications.length / 20);
    setMoreBusy(true);
    try {
      const next = await gateway.notifications.search({
        query: plan.notificationQuery,
        fromDate: plan.fromDate ?? undefined,
        toDate: plan.toDate ?? undefined, page, size: 20,
      });
      if (request !== serial.current) return;
      const ids = new Set(results.notifications.map(n => n.id));
      setResults(previous => ({
        ...previous,
        notifications: [...previous.notifications, ...next.filter(n => !ids.has(n.id))],
        notificationsHasMore: next.length === 20,
      }));
    } catch {
      if (request === serial.current) setMessage('Could not retrieve older Inbox messages. Try again.');
    } finally { if (request === serial.current) setMoreBusy(false); }
  }

  return (
    <section aria-label="Search my commercial records"
      className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-forest-700" aria-hidden="true" />
        <h2 className="font-medium text-[0.9rem] text-forest-800">Find an agreement or message</h2>
      </div>
      <p className="text-[0.76rem] text-sand-600">
        Search the real agreements and Inbox records linked to your KSNumber. For example,
        “cement deal around 2016 with Tom Contractors.”
      </p>
      <form onSubmit={e => void find(e)} className="flex flex-col sm:flex-row gap-2">
        <input aria-label="Search my agreements and messages"
          value={query} onChange={e => setQuery(e.target.value)} maxLength={160}
          placeholder="A deal, supplier, product or year…"
          className="min-h-11 flex-1 min-w-0 border border-cream-200 rounded-xl px-3 text-sm text-forest-900" />
        <button type="submit" disabled={phase === 'loading'}
          className="min-h-11 rounded-xl px-4 bg-forest-700 text-white text-sm font-medium disabled:opacity-50">
          {phase === 'loading' ? 'Searching…' : 'Find it'}
        </button>
      </form>
      <p className="text-[0.7rem] text-sand-500">
        Includes saved SecurePay records only. Older paper or external transactions need
        authorized import. Search does not create or change an agreement.
      </p>
      {phase === 'invalid' && <p role="alert" className="text-xs text-ember-700">{message}</p>}
      {phase === 'loading' && <p role="status" className="text-xs text-sand-600">Checking your records…</p>}
      {phase === 'ready' && resultOwner === owner && (
        <div className="space-y-3">
          {plan?.fromDate && (
            <p className="text-xs text-sand-600">
              Time: {plan.original.match(/\\b(?:19|20)\\d{2}\\b/)?.[0] ?? 'specified period'}
              {plan.person ? ` · with ${plan.person}` : ''}
              {plan.subject ? ` · about ${plan.subject}` : ''}
            </p>
          )}
          <div className="space-y-2">
            <h3 className="text-[0.78rem] font-semibold text-forest-800 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Agreements
            </h3>
            {results.agreementsError && <p role="alert" className="text-xs text-ember-700">{results.agreementsError}</p>}
            {!results.agreementsError && results.agreements.length === 0 &&
              <p className="text-xs text-sand-600">No matching SecurePay agreements were returned.</p>}
            {results.agreements.map(item => (
              <div key={item.agreementId} className="border border-cream-200 rounded-xl p-3 space-y-2">
                <button type="button" onClick={() => onOpenAgreement(item.agreementId)}
                  className="block w-full text-left">
                  <span className="block text-sm font-semibold text-forest-800">{item.title || item.publicReference}</span>
                  <span className="block text-xs text-sand-600">
                    {item.counterparty?.displayName || 'Agreement'} · {item.status} · {dateLabel(item.createdAt)}
                  </span>
                  <span className="block text-xs text-forest-700 mt-1 underline">Open original Agreement</span>
                </button>
                {gateway.messages && (
                  <button type="button" className="text-xs underline text-forest-700"
                    onClick={() => setThreadId(item.agreementId)}>
                    Read agreement conversation
                  </button>
                )}
              </div>
            ))}
            {results.agreementCount !== null && results.agreementCount > results.agreements.length &&
              <p className="text-xs text-sand-600">
                Showing the first {results.agreements.length} of {results.agreementCount} matches.
                Refine the search for older records.
              </p>}
          </div>
          <div className="space-y-2">
            <h3 className="text-[0.78rem] font-semibold text-forest-800 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" /> Agreement conversations
            </h3>
            {results.conversationsError && <p role="alert" className="text-xs text-ember-700">{results.conversationsError}</p>}
            {!results.conversationsError && results.conversations.length === 0 &&
              <p className="text-xs text-sand-600">No matching saved Agreement messages were returned.</p>}
            {results.conversations.map(item => (
              <div key={item.id} className="rounded-xl border border-cream-200 p-3 space-y-1">
                <p className="text-xs text-sand-500">
                  {item.agreementTitle} · {dateLabel(item.createdAt)} · {item.mine ? 'You' : 'Agreement participant'}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{item.body}</p>
                {gateway.messages && <button type="button" className="text-xs underline text-forest-700"
                  onClick={() => setThreadId(item.agreementId)}>
                  Read original conversation
                </button>}
              </div>
            ))}
            {results.conversations.length === 20 &&
              <p className="text-xs text-sand-600">Showing the first 20 matching messages. Refine the search to find older conversations.</p>}
          </div>
          {gateway.messages && threadId && (
            <AgreementThreadPanel key={threadId}
              agreementId={threadId} gateway={gateway.messages}
              onOpenAgreement={onOpenAgreement}
              onClose={() => setThreadId(null)} />
          )}
          <div className="space-y-2">
            <h3 className="text-[0.78rem] font-semibold text-forest-800 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" /> Inbox messages and updates
            </h3>
            {results.notificationsError && <p role="alert" className="text-xs text-ember-700">{results.notificationsError}</p>}
            {!results.notificationsError && results.notifications.length === 0 &&
              <p className="text-xs text-sand-600">No matching saved Inbox updates were returned.</p>}
            {results.notifications.map(item => (
              <div key={item.id} className="border border-cream-200 rounded-xl p-3 space-y-1">
                <div className="text-xs text-sand-500">{item.category} · {dateLabel(item.createdAt)}</div>
                <p className="text-sm font-medium text-forest-800">{item.title}</p>
                <p className="text-xs text-sand-600">{item.body}</p>
                <button type="button" onClick={() => void openOriginal(item.id)}
                  className="text-xs text-forest-700 underline">Read original Inbox record</button>
                {item.agreementId &&
                  (parseNotificationActionKey(item.actionKey) === 'OPEN_AGREEMENT' ||
                   parseNotificationActionKey(item.actionKey) === 'REVIEW_AGREEMENT') &&
                  <button type="button" onClick={() => onOpenAgreement(item.agreementId!)}
                    className="ml-3 text-xs text-forest-700 underline">Review related Agreement</button>}
              </div>
            ))}
            {results.notificationsHasMore &&
              <button type="button" disabled={moreBusy} onClick={() => void loadOlder()}
                className="w-full text-xs text-forest-700 underline py-2 disabled:opacity-50">
                {moreBusy ? 'Loading…' : 'Load earlier messages'}
              </button>}
            {message && <p role="alert" className="text-xs text-ember-700">{message}</p>}
          </div>
          {opened && (
            <div className="border border-forest-200 bg-forest-50 rounded-xl p-3 space-y-1" role="region" aria-label="Original Inbox record">
              <p className="text-xs text-forest-700">Original SecurePay Inbox record · {dateLabel(opened.createdAt)}</p>
              <p className="text-sm font-medium">{opened.title}</p>
              <p className="text-sm">{opened.body}</p>
              <button className="text-xs underline text-forest-700" onClick={() => setOpened(null)}>Close record</button>
            </div>
          )}
          {detailError && <p role="alert" className="text-xs text-ember-700">{detailError}</p>}
        </div>
      )}
    </section>
  );
}
