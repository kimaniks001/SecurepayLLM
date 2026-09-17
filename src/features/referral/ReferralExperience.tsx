import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Users, Check, Clock } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { SecureAuthCard } from '../../components/SecureAuth';
import { ErrorStateCard } from '../../components/ErrorState';
import type { ReferralGateway } from '../../api/securepay/referral';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView, ErrorStateResponse } from '../../types';
import { createReferralController, errorText } from './controller';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

function errorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load your referrals', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}

/**
 * The real R11A generic referral-code system (task doc never named it; verified real and live on
 * `origin/main` — docs/PRODUCTION_MIGRATION_LEDGER.md section 18). This is a genuinely real "list all my
 * referrals" global history, distinct from the per-Agreement KeyContract Plug-attribution referral state
 * (see features/plug/PlugExperience.tsx). Bolt's `ReferralHistoryView` stays fixture-only: it renders
 * `demoReferralEvaluations`/`demoIntroductions`, a shape (introducer/introduced-to/candidate+qualification+
 * reward-status triad) that matches neither real backend domain field-for-field — this is a new, narrow
 * real screen in the same visual language.
 */
export function ReferralExperience({ gateway, auth, session, onNavigate }: {
  gateway: ReferralGateway; auth: AuthGateway; session: SessionStore;
  onNavigate: (view: AppView) => void;
}) {
  const [controller] = useState(() => createReferralController(gateway));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);

  useEffect(() => {
    if (sessionState.status === 'signed-in') void controller.load();
    else controller.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status]);

  const navBarView: AppView = 'community';

  if (sessionState.status !== 'signed-in') {
    const authData = secureAuthView(identityState);
    return (
      <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
        <NavBar view={navBarView} onNavigate={onNavigate} />
        <div className="flex-1 flex items-center justify-center p-6">
          <SecureAuthCard
            data={authData}
            values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
            disabled={identityState.busy}
            errorText={identityState.error}
            onFieldChange={(index, value) => {
              if (identityState.phase === 'otp') identityController.setOtp(value);
              else if (index === 0) identityController.setKsNumber(value);
              else identityController.setPassword(value);
            }}
            onChoice={value => {
              if (value === 'submit_credentials') void identityController.submitCredentials();
              else if (value === 'submit_otp') void identityController.submitOtp();
              else if (value === 'reset_credentials') identityController.reset();
              else if (value === 'cancel_auth') { setIdentityController(createIdentityController(auth, session)); onNavigate('ecosystem'); }
            }}
          />
        </div>
      </div>
    );
  }

  let body: React.ReactNode;
  if (state.history.status === 'error') {
    body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.history.error))} onChoice={() => void controller.load()} /></div>;
  } else if (state.history.status !== 'ready' || state.code.status !== 'ready') {
    body = <p role="status" className="text-sm text-sand-500 text-center py-10">Loading your referrals…</p>;
  } else {
    const history = state.history.data;
    const code = state.code.data;
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Your referral code</div>
          <div className="text-[1.1rem] font-display text-forest-800 font-medium">{code.code}</div>
          <div className="text-[0.72rem] text-sand-500 mt-1">Referred: {history.totalReferred} · Activated or later: {history.activatedOrLaterCount}</div>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Have a referral code?</div>
          <div className="flex gap-2">
            <input value={state.redeemInput} onChange={e => controller.setRedeemInput(e.target.value)} placeholder="Enter a code" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
            <button onClick={() => void controller.redeem()} disabled={!state.redeemInput.trim() || state.redeemBusy} className="rounded-lg bg-forest-600 text-cream-50 text-[0.8rem] font-medium px-4 disabled:opacity-40">Redeem</button>
          </div>
          {state.redeemError && <p role="alert" className="text-[0.75rem] text-ember-600 mt-2">{state.redeemError}</p>}
          {state.redeemedStatus && <p className="text-[0.75rem] text-forest-600 mt-2">Redeemed — status: {state.redeemedStatus}</p>}
        </div>

        {history.relationships.map(rel => (
          <div key={rel.relationshipId} className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-sand-400" /><span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Referred trader</span></div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">KS Number</span>
              <span className="text-forest-800 font-medium">{rel.referredKsNumber}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem] mt-1.5">
              <span className="text-sand-600">Status</span>
              <div className="flex items-center gap-1.5">
                {rel.status === 'QUALIFIED' && <Check className="w-3.5 h-3.5 text-forest-500" />}
                {rel.status === 'PENDING' && <Clock className="w-3.5 h-3.5 text-sand-400" />}
                <span className={`font-medium ${rel.status === 'QUALIFIED' ? 'text-forest-600' : 'text-sand-500'}`}>{rel.status}</span>
              </div>
            </div>
            {rel.reward && (
              <div className="mt-1.5 text-[0.78rem] text-sand-600">Referral reward: {rel.reward.amountMinor} {rel.reward.currency} (minor units)</div>
            )}
            {rel.qualificationExplanation && <div className="mt-1 text-[0.72rem] text-sand-500">{rel.qualificationExplanation}</div>}
          </div>
        ))}
        {history.relationships.length === 0 && (
          <p className="text-[0.825rem] text-sand-500 px-1">No one has been referred with your code yet.</p>
        )}

        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">How this referral reward works</div>
          <p className="text-[0.78rem] text-sand-600">
            A referral reward is never a wallet balance, settlement balance, or Payment Ready — it is a
            separate, factual backend record, paid separately from Agreement Money.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={onNavigate} />
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={() => onNavigate('ecosystem')} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">{body}</div>
    </div>
  );
}
