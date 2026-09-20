import { useEffect, useState, useSyncExternalStore } from 'react';
import { ShieldCheck, LogOut, Briefcase, Settings as SettingsIcon, Code2, FolderOpen, Sparkles, Bell, KeyRound } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import { circleVerificationStatusLabel } from '../../circleLabels';
import { decimalMoney } from '../../decimalMoney';
import type { AppView } from '../../types';
import type { SubscriptionPlan } from '../../api/securepay/subscription';
import type { AccountController } from './controller';

const PLAN_LABEL: Record<SubscriptionPlan, string> = { FOR_YOU: 'For You', BUSINESS: 'Business' };

/** Local-only form state -- never held in the controller, cleared on success, cancel, or unmount. */
function ChangePasswordForm({ controller }: { controller: AccountController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const clearFields = () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setLocalError(null); };
  const cancel = () => { clearFields(); controller.resetChangePasswordStatus(); setOpen(false); };

  useEffect(() => { if (state.changePasswordDone) clearFields(); }, [state.changePasswordDone]);
  // Sensitive local state must not outlive this form, including an unexpected unmount (e.g. leaving Account).
  useEffect(() => () => clearFields(), []);

  const submit = () => {
    setLocalError(null);
    if (!currentPassword || !newPassword) { setLocalError('Enter your current and new password.'); return; }
    if (newPassword !== confirmPassword) { setLocalError('New password and confirmation do not match.'); return; }
    void controller.changePassword(currentPassword, newPassword);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-[0.82rem] text-forest-700 underline mt-3">
        <KeyRound className="w-3.5 h-3.5" /> Change password
      </button>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-cream-200 space-y-2">
      <div className="text-[0.85rem] text-forest-800 font-medium mb-1">Change password</div>
      <input
        type="password" autoComplete="current-password" placeholder="Current password"
        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
        className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]"
      />
      <input
        type="password" autoComplete="new-password" placeholder="New password"
        value={newPassword} onChange={e => setNewPassword(e.target.value)}
        className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]"
      />
      <input
        type="password" autoComplete="new-password" placeholder="Confirm new password"
        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
        className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]"
      />
      {localError && <StatusNotice tone="warning" icon={false}>{localError}</StatusNotice>}
      {state.changePasswordError && <StatusNotice tone="warning" icon={false}>{state.changePasswordError}</StatusNotice>}
      {state.changePasswordDone && (
        <StatusNotice tone="success" icon={false}>
          Password changed. For your security, every device — including this one — has been signed out; you'll need to sign in again with your new password.
        </StatusNotice>
      )}
      {!state.changePasswordDone && (
        <div className="flex gap-2 pt-1">
          <Button onClick={submit} disabled={state.changePasswordBusy} className="flex-1 py-2">
            {state.changePasswordBusy ? 'Changing…' : 'Change password'}
          </Button>
          <Button variant="secondary" onClick={cancel} disabled={state.changePasswordBusy} className="px-4 py-2">Cancel</Button>
        </div>
      )}
    </div>
  );
}

/**
 * Phase 5 -- Account: who you are, not how SecurePay behaves for you (see Settings) and not an
 * operational Business dashboard (see Business Home). Identity is the real, self-scoped `/circle/me`
 * read this codebase already trusts. A Business membership is a separate, explicit lookup -- there is
 * no backend index of "which Businesses do I belong to," so entering that Business's KS Number is
 * the honest mechanism, not a fabricated auto-discovered list.
 *
 * Phase 6 final correction adds Plan & Subscription (real `subscriptions/me` fields only -- no
 * invented invoices/next billing date/upgrade recommendations) and Change Password under Security,
 * without turning this into a dashboard of equal-priority cards.
 */
export function AccountExperience({ controller, onNavigate }: {
  controller: AccountController;
  onNavigate: (view: AppView) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => { void controller.load(); void controller.loadSubscription(); }, [controller]);

  const identity = state.identity.data;
  const subscription = state.subscription.data;

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="signed-in" onNavigate={onNavigate} />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">
        <PageHeader title="Account" description="Your identity, your Businesses, and your security — not a settings dumping ground." />

        {state.identity.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading your identity…</p>}
        {state.identity.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.identity.error}</StatusNotice>}

        {identity && (
          <Surface className="animate-quiet-in">
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Your KS Number</div>
              <div className="text-[1.1rem] font-display text-forest-800 font-medium">{identity.canonicalKsNumber}</div>
              {identity.displayName && <div className="text-[0.82rem] text-sand-600 mt-0.5">{identity.displayName}</div>}
              <div className="mt-3 flex items-center gap-1.5 text-[0.78rem] text-sand-600">
                <ShieldCheck className="w-3.5 h-3.5 text-sand-400" />
                {circleVerificationStatusLabel[identity.verificationStatus]}
              </div>
              <div className="text-[0.72rem] text-sand-400 mt-1">SecurePay identity since {identity.memberSince}</div>
            </SurfaceBody>
          </Surface>
        )}

        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Plan &amp; Subscription</div>
            {state.subscription.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
            {state.subscription.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.subscription.error}</StatusNotice>}
            {state.subscription.status === 'none' && (
              <>
                <p className="text-[0.78rem] text-sand-600 mb-2">You haven't activated a SecurePay subscription yet.</p>
                <a href="#/activate" className="inline-flex items-center justify-center rounded-xl border border-forest-200 bg-forest-50 px-4 py-2.5 text-[0.825rem] font-medium text-forest-700 hover:bg-forest-100 transition-colors">
                  Activate SecurePay
                </a>
              </>
            )}
            {state.subscription.status === 'ready' && subscription && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[0.95rem] text-forest-800 font-medium">{PLAN_LABEL[subscription.plan]}</span>
                  <span className="text-[0.72rem] text-sand-500 capitalize">{subscription.status.toLowerCase()}</span>
                </div>
                <div className="text-[0.82rem] text-sand-600">{decimalMoney(String(subscription.monthlyFeeMinor), subscription.currency)} / month</div>
                <div className="text-[0.72rem] text-sand-500 pt-1">
                  {subscription.consecutivePaidCycles} consecutive paid cycle{subscription.consecutivePaidCycles === 1 ? '' : 's'} · {subscription.lifetimePaidCycles} lifetime
                </div>
                {subscription.retentionQualified && subscription.qualifiedRewardAmountMinor != null && subscription.qualifiedRewardCurrency && (
                  <div className="text-[0.72rem] text-forest-600 pt-1">
                    Retention-qualified: {decimalMoney(String(subscription.qualifiedRewardAmountMinor), subscription.qualifiedRewardCurrency)}
                  </div>
                )}
              </div>
            )}
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceBody>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onNavigate('notifications')} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2.5 text-[0.82rem] text-forest-800 hover:border-forest-300"><Bell className="w-4 h-4 text-forest-500" /> Notifications</button>
              <button onClick={() => onNavigate('settings')} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2.5 text-[0.82rem] text-forest-800 hover:border-forest-300"><SettingsIcon className="w-4 h-4 text-forest-500" /> Settings</button>
              <button onClick={() => onNavigate('projects')} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2.5 text-[0.82rem] text-forest-800 hover:border-forest-300"><FolderOpen className="w-4 h-4 text-forest-500" /> Projects</button>
              <button onClick={() => onNavigate('vision-board')} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2.5 text-[0.82rem] text-forest-800 hover:border-forest-300"><Sparkles className="w-4 h-4 text-forest-500" /> Vision Board</button>
              <button onClick={() => onNavigate('business')} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2.5 text-[0.82rem] text-forest-800 hover:border-forest-300"><Briefcase className="w-4 h-4 text-forest-500" /> Business</button>
              <button onClick={() => onNavigate('developer')} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2.5 text-[0.82rem] text-forest-800 hover:border-forest-300 col-span-2"><Code2 className="w-4 h-4 text-forest-500" /> Developer / Connect</button>
            </div>
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Open a Business</div>
            <p className="text-[0.78rem] text-sand-600 mb-2">SecurePay does not yet list every Business you belong to automatically — enter one to look it up. Being able to read its name does not by itself mean you have any authority for it; SecurePay confirms that separately, below.</p>
            <div className="flex gap-2">
              <input value={state.businessKsInput} onChange={e => controller.setBusinessKsInput(e.target.value)} placeholder="Business KS Number" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
              <Button variant="secondary" onClick={() => void controller.checkBusiness()} disabled={!state.businessKsInput.trim() || state.business.status === 'loading'} className="px-4">Check</Button>
            </div>
            {state.business.status === 'loading' && <p role="status" className="text-sm text-sand-500 mt-2">Checking…</p>}
            {state.business.status === 'error' && <StatusNotice tone="warning" icon={false} className="mt-2">{state.business.error}</StatusNotice>}
            {state.business.status === 'ready' && state.business.data && (
              <div className="mt-3 rounded-xl bg-cream-50 border border-cream-200 px-3 py-2.5">
                <div className="text-[0.82rem] text-forest-800">{state.business.data.businessKsNumber}</div>
                <div className="text-[0.7rem] text-sand-500 mt-0.5">Organization activated {new Date(state.business.data.activatedAt).toLocaleDateString()}</div>
                <div className="mt-2 pt-2 border-t border-cream-200">
                  {/* Fail-closed: reading this organization's name is not proof of authority for it --
                      that is confirmed only by a successful authoritySummary read, shown below. A
                      failed authority read is never presented as "no permissions"; those are
                      different facts (see BusinessExperience's identical distinction). */}
                  {state.authority.status === 'loading' && <p role="status" className="text-[0.75rem] text-sand-500">Confirming your authority for this Business…</p>}
                  {state.authority.status === 'error' && <StatusNotice tone="warning" icon={false}>SecurePay could not confirm your authority for that Business. {state.authority.error}</StatusNotice>}
                  {state.authority.status === 'ready' && state.authority.data && (
                    <>
                      <div className="text-[0.68rem] text-sand-500 uppercase tracking-wide mb-1">Your authority for this Business</div>
                      {state.authority.data.permissions.length === 0
                        ? <p className="text-[0.75rem] text-sand-500">Confirmed: no permissions are currently granted to you for this Business.</p>
                        : <div className="flex flex-wrap gap-1.5">{state.authority.data.permissions.map(p => <span key={p} className="text-[0.68rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{p.replace(/_/g, ' ').toLowerCase()}</span>)}</div>}
                    </>
                  )}
                </div>
                {state.authority.status === 'ready' && <button onClick={() => onNavigate('business')} className="text-[0.78rem] text-forest-700 underline mt-2">Open Business Home</button>}
              </div>
            )}
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Security</div>
            <p className="text-[0.78rem] text-sand-600 mb-3">If you believe another device or session has access you don't recognise, sign out everywhere. This ends every active session and refresh token for your account.</p>
            {state.logoutAllError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.logoutAllError}</StatusNotice>}
            {state.logoutAllDone && <StatusNotice tone="success" icon={false} className="mb-2">You've been signed out everywhere. This device will need to sign in again shortly.</StatusNotice>}
            <Button variant="secondary" onClick={() => void controller.signOutEverywhere()} disabled={state.logoutAllBusy} className="w-full py-2.5 flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> {state.logoutAllBusy ? 'Signing out…' : 'Sign out everywhere'}
            </Button>
            <ChangePasswordForm controller={controller} />
            <button onClick={() => onNavigate('recovery')} className="text-[0.78rem] text-forest-700 underline mt-3 block">Forgot your password? Recover your account</button>
          </SurfaceBody>
        </Surface>
      </div>
    </div>
  );
}
