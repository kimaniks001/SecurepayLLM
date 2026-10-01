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
export type NotificationSection = 'NEEDS_YOU' | 'UPDATES' | 'COMMUNITY' | 'EARLIER';

export function notificationSection(notification: NotificationEvent): NotificationSection {
  if (!notification.resolvedAt && parseNotificationActionKey(notification.actionKey) !== null) return 'NEEDS_YOU';
  if (notification.category === 'COMMUNITY' && !notification.resolvedAt) return 'COMMUNITY';
  if (!notification.readAt && !notification.resolvedAt) return 'UPDATES';
  return 'EARLIER';
}

const SECTION_LABEL: Record<NotificationSection, string> = {
  NEEDS_YOU: 'NEEDS YOU',
  UPDATES: 'UPDATES',
  COMMUNITY: 'COMMUNITY',
  EARLIER: 'EARLIER',
};

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
  // A handled/superseded notification is history. Never leave an old action button live merely
  // because its original actionKey is still part of the audit record.
  if (notification.resolvedAt) return null;
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
              <CheckCircle2 className="w-3.5 h-3.5" />
              {notification.resolutionAction === 'SUPERSEDED' ? 'No longer needs action' : 'Handled'}
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

  const grouped = state.inbox.status === 'ready' && state.inbox.data
    ? (['NEEDS_YOU', 'UPDATES', 'COMMUNITY', 'EARLIER'] as NotificationSection[]).map(section => ({
        section,
        items: state.inbox.data!.filter(notification => notificationSection(notification) === section),
      }))
    : [];
  const needsYouCount = grouped.find(group => group.section === 'NEEDS_YOU')?.items.length ?? 0;

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
            {needsYouCount > 0 && (
              <p className="text-[0.82rem] font-medium text-forest-700">
                {needsYouCount} {needsYouCount === 1 ? 'thing needs' : 'things need'} you
              </p>
            )}
            {state.inbox.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
            {state.inbox.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.inbox.error}</StatusNotice>}
            {state.inbox.status === 'ready' && state.inbox.data && state.inbox.data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-8 h-8 text-sand-300 mb-2" />
                <p className="text-[0.82rem] text-sand-500">Nothing needs your attention right now.</p>
              </div>
            )}
            {state.inbox.status === 'ready' && state.inbox.data && state.inbox.data.length > 0 && (
              <div className="space-y-5">
                {grouped.filter(group => group.items.length > 0).map(group => (
                  <section key={group.section} aria-labelledby={`notification-section-${group.section}`} className="space-y-2">
                    <div>
                      <h2 id={`notification-section-${group.section}`} className="text-[0.7rem] font-semibold text-sand-500 tracking-wide">
                        {SECTION_LABEL[group.section]}
                      </h2>
                      {group.section === 'NEEDS_YOU' && <p className="text-[0.72rem] text-sand-500 mt-0.5">Your decision or action is required.</p>}
                      {group.section === 'UPDATES' && <p className="text-[0.72rem] text-sand-500 mt-0.5">Meaningful changes that do not need a decision right now.</p>}
                      {group.section === 'COMMUNITY' && <p className="text-[0.72rem] text-sand-500 mt-0.5">Circle, service and learning activity worth knowing about.</p>}
                    </div>
                    {group.items.map(notification => (
                      <NotificationRow key={notification.id} notification={notification} onMarkRead={id => void controller.markRead(id)} onOpenAgreement={onOpenAgreement} onOpenInvitations={onOpenInvitations} />
                    ))}
                  </section>
                ))}
                {state.hasMore && (
                  <button
                    onClick={() => void controller.loadMore()}
                    disabled={state.loadingMore}
                    className="w-full text-center text-[0.8rem] text-forest-700 underline py-2 disabled:opacity-50"
                  >
                    {state.loadingMore ? 'Loading…' : 'Earlier notifications'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'preferences' && (
          <>
            <p className="text-[0.78rem] text-sand-500 -mt-1">
              These control delivery for individual notification categories below. General account
              channels (email/SMS/push) and marketing messages are separate and live in Settings.
            </p>
            {state.preferences.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
            {state.preferences.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.preferences.error}</StatusNotice>}
            {state.preferencesDraft && (
              <>
                <Surface>
                  <SurfaceBody>
                    <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Delivery channel</div>
                    <p className="text-[0.75rem] text-sand-500 mb-1">
                      WhatsApp is SecurePay's preferred channel where available. SecurePay tries enabled
                      channels in order and stops after delivery succeeds; SMS or email are fallbacks when
                      the earlier channel fails.
                    </p>
                    <div className="divide-y divide-cream-100">
                      <Toggle label="WhatsApp" hint="Preferred channel." checked={state.preferencesDraft.whatsappEnabled} onChange={v => controller.setPreferencesDraft({ whatsappEnabled: v })} />
                      <Toggle label="SMS" hint="Used if WhatsApp is off or unavailable." checked={state.preferencesDraft.smsEnabled} onChange={v => controller.setPreferencesDraft({ smsEnabled: v })} />
                      <Toggle label="Email" hint="Used if WhatsApp and SMS are both off." checked={state.preferencesDraft.emailEnabled} onChange={v => controller.setPreferencesDraft({ emailEnabled: v })} />
                    </div>
                  </SurfaceBody>
                </Surface>

                {state.quietHoursDraft && (
                  <Surface>
                    <SurfaceBody>
                      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Quiet hours</div>
                      <p className="text-[0.75rem] text-sand-500 mb-1">
                        Hold non-critical external interruptions during this window. In-app records still appear immediately; Critical and Security updates are not silently held.
                      </p>
                      <Toggle label="Use quiet hours" checked={state.quietHoursDraft.enabled} onChange={v => controller.setQuietHoursDraft({ enabled: v })} />
                      {state.quietHoursDraft.enabled && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <label className="text-[0.72rem] text-sand-500">From
                            <input type="time" value={state.quietHoursDraft.startLocal} onChange={e => controller.setQuietHoursDraft({ startLocal: e.target.value })} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem] text-forest-800" />
                          </label>
                          <label className="text-[0.72rem] text-sand-500">Until
                            <input type="time" value={state.quietHoursDraft.endLocal} onChange={e => controller.setQuietHoursDraft({ endLocal: e.target.value })} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem] text-forest-800" />
                          </label>
                          <label className="col-span-2 text-[0.72rem] text-sand-500">Time zone
                            <input value={state.quietHoursDraft.timeZone} onChange={e => controller.setQuietHoursDraft({ timeZone: e.target.value })} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem] text-forest-800" />
                          </label>
                        </div>
                      )}
                    </SurfaceBody>
                  </Surface>
                )}

                <Surface>
                  <SurfaceBody>
                    <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Categories</div>
                    <p className="text-[0.75rem] text-sand-500 mb-1">Turning a category off stops it from reaching you anywhere, including in this inbox.</p>
                    <div className="divide-y divide-cream-100">
                      <Toggle label="Agreements" checked={state.preferencesDraft.agreementsCategoryEnabled} onChange={v => controller.setPreferencesDraft({ agreementsCategoryEnabled: v })} />
                      <Toggle label="Money" checked={state.preferencesDraft.moneyCategoryEnabled} onChange={v => controller.setPreferencesDraft({ moneyCategoryEnabled: v })} />
                      <Toggle label="Reviews" checked={state.preferencesDraft.reviewsCategoryEnabled} onChange={v => controller.setPreferencesDraft({ reviewsCategoryEnabled: v })} />
                      <div className="flex items-start justify-between gap-3 py-2.5">
                        <span>
                          <span className="block text-[0.85rem] text-forest-800">Security</span>
                          <span className="block text-[0.72rem] text-sand-500 mt-0.5">Required. Security and identity-risk updates cannot be silenced by ordinary notification preferences.</span>
                        </span>
                        <span className="text-[0.7rem] font-medium text-forest-600">Required</span>
                      </div>
                      <Toggle label="Community" checked={state.preferencesDraft.communityCategoryEnabled} onChange={v => controller.setPreferencesDraft({ communityCategoryEnabled: v })} />
                      <Toggle label="Support" checked={state.preferencesDraft.supportCategoryEnabled} onChange={v => controller.setPreferencesDraft({ supportCategoryEnabled: v })} />
                    </div>
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
