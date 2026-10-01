import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import type { AppView } from '../../types';
import { parseNotificationActionKey, type NotificationCategory, type NotificationEvent } from '../../api/securepay/notifications';
import type { NotificationsController } from './controller';

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  AGREEMENTS: 'Agreements',
  MONEY: 'Money',
  REVIEWS: 'Reviews',
  SECURITY: 'Security',
  COMMUNITY: 'Community',
  SUPPORT: 'Support',
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as NotificationCategory[];

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * PHASE 4 Care convergence (Section 1-3, 12) — the notification's own `actionKey` now decides the
 * action, never `agreementId`'s mere presence (Section 1's own named bug: an invited person who has not
 * yet joined may have no Agreement read authority at all, even though `agreementId` is carried for
 * audit/context). An unrecognized or absent `actionKey` (or an Agreement-scoped one missing the
 * `agreementId` it needs) renders no button at all -- informational only (Section 38).
 */
export function actionFor(notification: NotificationEvent, onOpenAgreement: (agreementId: string) => void, onOpenInvitations: () => void): { label: string; run: () => void } | null {
  const actionKey = parseNotificationActionKey(notification.actionKey);
  if (actionKey === 'OPEN_INVITATIONS') return { label: 'Review invitation', run: onOpenInvitations };
  if (actionKey === 'OPEN_AGREEMENT' && notification.agreementId) {
    const agreementId = notification.agreementId;
    return { label: 'Open Agreement', run: () => onOpenAgreement(agreementId) };
  }
  if (actionKey === 'REVIEW_AGREEMENT' && notification.agreementId) {
    const agreementId = notification.agreementId;
    return { label: 'Review Agreement', run: () => onOpenAgreement(agreementId) };
  }
  return null;
}

function NotificationRow({ notification, onMarkRead, onOpenAgreement, onOpenInvitations }: {
  notification: NotificationEvent;
  onMarkRead: (id: string) => void;
  onOpenAgreement: (agreementId: string) => void;
  onOpenInvitations: () => void;
}) {
  const unread = !notification.readAt;
  const action = actionFor(notification, onOpenAgreement, onOpenInvitations);
  return (
    <div className={`rounded-xl border px-4 py-3 ${unread ? 'border-forest-200 bg-forest-50/40' : 'border-cream-200 bg-white'}`}>
      <div className="flex items-start gap-2.5">
        {unread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-forest-500 shrink-0" aria-hidden="true" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[0.68rem] text-sand-500 uppercase tracking-wide">
            <span>{CATEGORY_LABEL[notification.category]}</span>
            <span aria-hidden="true">·</span>
            <span>{relativeTime(notification.createdAt)}</span>
          </div>
          <p className="mt-1 text-[0.85rem] text-forest-800 font-medium">{notification.title}</p>
          <p className="mt-0.5 text-[0.8rem] text-sand-600 leading-relaxed">{notification.body}</p>
          {notification.resolvedAt && (
            <p className="mt-1.5 flex items-center gap-1 text-[0.72rem] text-forest-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[0.75rem]">
            {action && (
              <button onClick={action.run} className="text-forest-700 underline">
                {action.label}
              </button>
            )}
            {unread && (
              <button onClick={() => onMarkRead(notification.id)} className="text-sand-500 underline">
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Choice({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: {value:string;label:string}[]; onChange: (value: string) => void }) {
  return (
    <label className="block py-2.5">
      <span className="block text-[0.85rem] text-forest-800">{label}</span>
      {hint && <span className="block text-[0.72rem] text-sand-500 mt-0.5 mb-1.5">{hint}</span>}
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.82rem] text-forest-800">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 py-2.5 cursor-pointer">
      <span>
        <span className="block text-[0.85rem] text-forest-800">{label}</span>
        {hint && <span className="block text-[0.72rem] text-sand-500 mt-0.5">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 shrink-0" />
    </label>
  );
}

/**
 * Phase 6 convergence -- the canonical in-app attention centre. Backed by the real, self-scoped
 * `NotificationController` (`/api/v1/notifications`). Deliberately not a social feed: no likes, no
 * engagement counters, no loud badge numbers -- see docs/PHASE6_CONVERGENCE_PRODUCTION.md.
 *
 * WhatsApp/SMS/email are delivery channels for the *same* SecurePay-owned events shown here, never
 * a competing source of truth (task doctrine: "WhatsApp does not create truth; SecurePay does").
 * This screen is the durable, ownership-of-truth surface; it does not claim WhatsApp delivered
 * anything -- see the Preferences tab's own note on today's real backend delivery gap.
 */
export function NotificationsExperience({ controller, onNavigate, onOpenAgreement }: {
  controller: NotificationsController;
  onNavigate: (view: AppView) => void;
  onOpenAgreement: (agreementId: string) => void;
}) {
  // KS001 Upgrade Phase 4 final convergence (Section 5) -- OPEN_INVITATIONS now routes straight to the
  // dedicated Invitations surface (the same top-level hash route Home's own "View all invitations"
  // doorway uses), rather than dumping the caller at general Home and making them find it themselves.
  // Still purely a navigation hint -- no authority is encoded in the actionKey itself (Section 5's own
  // "OPEN_INVITATIONS remains a navigation hint only" instruction).
  const onOpenInvitations = () => { window.location.hash = '#/invitations'; };
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [tab, setTab] = useState<'inbox' | 'preferences'>('inbox');

  useEffect(() => { void controller.load(); }, [controller]);
  useEffect(() => { if (tab === 'preferences' && state.preferences.status === 'idle') void controller.loadPreferences(); }, [tab, state.preferences.status, controller]);

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="notifications" onNavigate={onNavigate} />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">
        <PageHeader title="Notifications" description="What needs your attention in SecurePay." />

        <div className="flex border-b border-cream-200/60">
          <button onClick={() => setTab('inbox')} aria-current={tab === 'inbox'} className={`flex-1 py-2 text-[0.8rem] font-medium ${tab === 'inbox' ? 'text-forest-700 border-b-2 border-forest-600' : 'text-sand-500 border-b-2 border-transparent'}`}>Inbox</button>
          <button onClick={() => setTab('preferences')} aria-current={tab === 'preferences'} className={`flex-1 py-2 text-[0.8rem] font-medium ${tab === 'preferences' ? 'text-forest-700 border-b-2 border-forest-600' : 'text-sand-500 border-b-2 border-transparent'}`}>Preferences</button>
        </div>

        {tab === 'inbox' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => controller.setCategoryFilter(null)}
                className={`text-[0.75rem] rounded-full px-3 py-1 border ${state.categoryFilter === null ? 'border-forest-500 text-forest-700 bg-forest-50' : 'border-cream-200 text-sand-600'}`}
              >
                All
              </button>
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => controller.setCategoryFilter(category)}
                  className={`text-[0.75rem] rounded-full px-3 py-1 border ${state.categoryFilter === category ? 'border-forest-500 text-forest-700 bg-forest-50' : 'border-cream-200 text-sand-600'}`}
                >
                  {CATEGORY_LABEL[category]}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-[0.75rem] text-sand-600 ml-1">
                <input type="checkbox" checked={state.unreadOnly} onChange={e => controller.setUnreadOnly(e.target.checked)} /> Unread only
              </label>
            </div>

            {state.inbox.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
            {state.inbox.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.inbox.error}</StatusNotice>}
            {state.inbox.status === 'ready' && state.inbox.data && state.inbox.data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-8 h-8 text-sand-300 mb-2" />
                <p className="text-[0.82rem] text-sand-500">Nothing needs your attention right now.</p>
              </div>
            )}
            {state.inbox.status === 'ready' && state.inbox.data && state.inbox.data.length > 0 && (
              <div className="space-y-2">
                {state.inbox.data.map(notification => (
                  <NotificationRow key={notification.id} notification={notification} onMarkRead={id => void controller.markRead(id)} onOpenAgreement={onOpenAgreement} onOpenInvitations={onOpenInvitations} />
                ))}
                {state.hasMore && (
                  <button
                    onClick={() => void controller.loadMore()}
                    disabled={state.loadingMore}
                    className="w-full text-center text-[0.8rem] text-forest-700 underline py-2 disabled:opacity-50"
                  >
                    {state.loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'preferences' && (
          <>
            <p className="text-[0.78rem] text-sand-500 -mt-1">
              Choose what deserves interruption and how SecurePay may reach you. Security remains protected; in-app remains the durable record.
            </p>
            {state.preferences.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
            {state.preferences.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.preferences.error}</StatusNotice>}
            {state.preferencesDraft && (
              <>
                <Surface>
                  <SurfaceBody>
                    <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">What should interrupt you?</div>
                    <div className="divide-y divide-cream-100">
                      <div className="py-2.5">
                        <div className="text-[0.85rem] text-forest-800">Security</div>
                        <div className="text-[0.72rem] text-sand-500 mt-0.5">Protected. Ordinary preferences cannot turn off serious security, identity or money-risk alerts.</div>
                      </div>
                      <Choice
                        label="Agreements & Money"
                        value={state.preferencesDraft.agreementsMoneyMode}
                        options={[{value:'IMMEDIATE',label:'Immediate'},{value:'IN_APP_ONLY',label:'In-app only'}]}
                        onChange={v => controller.setPreferencesDraft({ agreementsMoneyMode: v as 'IMMEDIATE'|'IN_APP_ONLY' })}
                      />
                      <Choice
                        label="Store / Plug / Master"
                        value={state.preferencesDraft.storePlugMasterMode}
                        options={[{value:'IMMEDIATE',label:'Immediate'},{value:'DAILY_SUMMARY',label:'Daily summary'},{value:'OFF',label:'Off'}]}
                        onChange={v => controller.setPreferencesDraft({ storePlugMasterMode: v as 'IMMEDIATE'|'DAILY_SUMMARY'|'OFF' })}
                      />
                      <Choice
                        label="Community & Circles"
                        hint="Important activity, not scrolling prompts."
                        value={state.preferencesDraft.communityMode}
                        options={[{value:'IMPORTANT_ONLY',label:'Important only'},{value:'DAILY_SUMMARY',label:'Daily summary'},{value:'OFF',label:'Off'}]}
                        onChange={v => controller.setPreferencesDraft({ communityMode: v as 'IMPORTANT_ONLY'|'DAILY_SUMMARY'|'OFF' })}
                      />
                      <Choice
                        label="Opportunities"
                        value={state.preferencesDraft.opportunitiesMode}
                        options={[{value:'IMPORTANT_MATCHES',label:'Important matches'},{value:'DAILY',label:'Daily'},{value:'WEEKLY',label:'Weekly'},{value:'OFF',label:'Off'}]}
                        onChange={v => controller.setPreferencesDraft({ opportunitiesMode: v as 'IMPORTANT_MATCHES'|'DAILY'|'WEEKLY'|'OFF' })}
                      />
                    </div>
                  </SurfaceBody>
                </Surface>

                <Surface>
                  <SurfaceBody>
                    <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Channels</div>
                    <p className="text-[0.75rem] text-sand-500 mb-1">SecurePay keeps the in-app record. External channels are delivery only; fallback happens only after the preferred channel does not deliver.</p>
                    <div className="divide-y divide-cream-100">
                      <Toggle label="WhatsApp" hint="Preferred external channel when available." checked={state.preferencesDraft.whatsappEnabled} onChange={v => controller.setPreferencesDraft({ whatsappEnabled: v })} />
                      <Toggle label="SMS fallback" hint="Used only when policy permits fallback." checked={state.preferencesDraft.smsFallbackEnabled} onChange={v => controller.setPreferencesDraft({ smsFallbackEnabled: v })} />
                      <Toggle label="Email" checked={state.preferencesDraft.emailEnabled} onChange={v => controller.setPreferencesDraft({ emailEnabled: v })} />
                      <Toggle label="Push" hint="Saved now; delivery requires a configured push provider." checked={state.preferencesDraft.pushEnabled} onChange={v => controller.setPreferencesDraft({ pushEnabled: v })} />
                    </div>
                  </SurfaceBody>
                </Surface>

                <Surface>
                  <SurfaceBody>
                    <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Quiet hours</div>
                    <Toggle label="Use quiet hours" hint="Non-critical notifications can wait. Protected alerts are not silently suppressed." checked={state.preferencesDraft.quietHoursEnabled} onChange={v => controller.setPreferencesDraft({
                      quietHoursEnabled: v,
                      quietStart: v ? (state.preferencesDraft?.quietStart ?? '21:00') : null,
                      quietEnd: v ? (state.preferencesDraft?.quietEnd ?? '07:00') : null,
                      quietTimeZone: v ? (state.preferencesDraft?.quietTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) : null,
                    })} />
                    {state.preferencesDraft.quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className="text-[0.72rem] text-sand-500">From<input type="time" value={state.preferencesDraft.quietStart ?? '21:00'} onChange={e => controller.setPreferencesDraft({ quietStart: e.target.value })} className="block w-full mt-1 rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" /></label>
                        <label className="text-[0.72rem] text-sand-500">Until<input type="time" value={state.preferencesDraft.quietEnd ?? '07:00'} onChange={e => controller.setPreferencesDraft({ quietEnd: e.target.value })} className="block w-full mt-1 rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" /></label>
                      </div>
                    )}
                  </SurfaceBody>
                </Surface>

                {state.preferencesSaveError && <StatusNotice tone="warning" icon={false}>{state.preferencesSaveError}</StatusNotice>}
                {state.preferencesJustSaved && !state.preferencesSaveError && <StatusNotice tone="success" icon={false}>Saved.</StatusNotice>}
                <Button onClick={() => void controller.savePreferences()} disabled={state.preferencesSaving} className="w-full py-2.5">
                  {state.preferencesSaving ? 'Saving…' : 'Save preferences'}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
