import { useSyncExternalStore } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import type { AppView } from '../../types';
import type { RecoveryController } from './controller';

/**
 * Phase 5 -- Account recovery (`AuthenticationController.requestRecovery/verifyRecovery/
 * resetRecoveryPassword`). This restores only the login credential; it never restores or implies
 * Business membership, delegated authority, or Agreement/Money authority -- see the controller's own
 * doctrine comment. The copy on the request step deliberately never confirms or denies that a KS
 * Number exists, matching the backend's own enumeration-resistant design.
 */
export function RecoveryExperience({ controller, onNavigate, onSignIn }: {
  controller: RecoveryController;
  onNavigate: (view: AppView) => void;
  /** Recovery succeeded -- return to ordinary sign-in with the new password. */
  onSignIn: () => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="signed-out" onNavigate={onNavigate} />
      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          {/* 'signed-in' is deliberate, not 'signed-out': the router's own fallback for that view,
              when not actually signed in, quietly returns to Home -- 'signed-out' would instead fall
              through to the router's generic "this area is not available yet" notice. */}
          <button onClick={() => onNavigate('signed-in')} className="flex items-center gap-1.5 text-sand-500 hover:text-forest-600 text-[0.8rem]">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </button>

          <PageHeader title="Recover your account" description="This resets your password only. It does not restore Business membership, delegated authority, or any Agreement/Money authority on its own — sign in fresh afterward with your new password." />

          {state.step === 'request' && (
            <Surface>
              <SurfaceBody>
                <label className="text-[0.72rem] text-sand-500">Your KS Number</label>
                <input value={state.ksNumber} onChange={e => controller.setKsNumber(e.target.value)} placeholder="KS Number" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1 mb-3" />
                {state.error && <StatusNotice tone="warning" icon={false} className="mb-3">{state.error}</StatusNotice>}
                <Button onClick={() => void controller.requestRecovery()} disabled={state.busy || !state.ksNumber.trim()} className="w-full py-2.5">
                  {state.busy ? 'Sending…' : 'Send recovery code'}
                </Button>
                <p className="text-[0.72rem] text-sand-500 mt-3">If that KS Number exists and has a verified contact on file, a code has been sent to it. For your security, SecurePay never confirms whether a given KS Number exists.</p>
              </SurfaceBody>
            </Surface>
          )}

          {state.step === 'verify' && (
            <Surface>
              <SurfaceBody>
                <label className="text-[0.72rem] text-sand-500">Enter the code sent to your registered contact</label>
                <input value={state.otpCode} onChange={e => controller.setOtpCode(e.target.value)} placeholder="Code" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1 mb-3" />
                {state.error && <StatusNotice tone="warning" icon={false} className="mb-3">{state.error}</StatusNotice>}
                <Button onClick={() => void controller.verifyOtp()} disabled={state.busy || !state.otpCode.trim()} className="w-full py-2.5">
                  {state.busy ? 'Checking…' : 'Verify code'}
                </Button>
              </SurfaceBody>
            </Surface>
          )}

          {state.step === 'reset' && (
            <Surface>
              <SurfaceBody>
                <label className="text-[0.72rem] text-sand-500">New password</label>
                <input type="password" value={state.newPassword} onChange={e => controller.setNewPassword(e.target.value)} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1 mb-3" />
                <label className="text-[0.72rem] text-sand-500">Confirm new password</label>
                <input type="password" value={state.confirmPassword} onChange={e => controller.setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1 mb-3" />
                {state.error && <StatusNotice tone="warning" icon={false} className="mb-3">{state.error}</StatusNotice>}
                <Button onClick={() => void controller.resetPassword()} disabled={state.busy || !state.newPassword || !state.confirmPassword} className="w-full py-2.5">
                  {state.busy ? 'Saving…' : 'Set new password'}
                </Button>
                <p className="text-[0.72rem] text-sand-500 mt-3">This signs every device out of your account, everywhere, for your security.</p>
              </SurfaceBody>
            </Surface>
          )}

          {state.step === 'done' && (
            <Surface>
              <SurfaceBody>
                <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-forest-600" /><span className="text-[0.85rem] text-forest-800 font-medium">Password updated</span></div>
                <p className="text-[0.78rem] text-sand-600 mb-3">Sign in with your new password. Any Business membership, delegated authority, or Agreement access you had before is unchanged — it was never part of what this reset touched.</p>
                <Button onClick={() => { controller.reset(); onSignIn(); }} className="w-full py-2.5">Go to sign in</Button>
              </SurfaceBody>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}
