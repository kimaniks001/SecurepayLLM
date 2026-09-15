import { useEffect, useSyncExternalStore } from 'react';
import { SecureAuthCard } from '../../components/SecureAuth';
import { CanonicalAgreementCard } from '../../components/CanonicalAgreement';
import { NoticeCard } from '../../components/NoticeCard';
import { ErrorStateCard } from '../../components/ErrorState';
import { ChoiceButtons } from '../../components/ChoiceButtons';
import type { HandoffController } from './controller';
import type { IdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { canonicalAgreementView, handoffNoticeView, handoffErrorView, expiredHandoffView } from './view';

export function HandoffPanel({ handoff, identity, onDone }: { handoff: HandoffController; identity: IdentityController; onDone: () => void }) {
  const state = useSyncExternalStore(handoff.subscribe, handoff.getSnapshot);
  const identityState = useSyncExternalStore(identity.subscribe, identity.getSnapshot);

  useEffect(() => {
    if (state.phase === 'identity-required' && identityState.phase === 'signed-in') {
      void handoff.continueAfterIdentity();
      identity.reset();
    }
  }, [state.phase, identityState.phase, handoff, identity]);

  const leave = () => { handoff.reset(); identity.reset(); onDone(); };

  if (state.phase === 'idle') return null;

  if (state.phase === 'creating') return <p role="status" className="text-sm text-sand-500 px-1">Starting a secure handoff…</p>;

  if (state.phase === 'identity-required') {
    const authData = secureAuthView(identityState);
    return (
      <SecureAuthCard
        data={authData}
        values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
        disabled={identityState.busy}
        errorText={identityState.error}
        onFieldChange={(index, value) => {
          if (identityState.phase === 'otp') identity.setOtp(value);
          else if (index === 0) identity.setKsNumber(value);
          else identity.setPassword(value);
        }}
        onChoice={value => {
          if (value === 'submit_credentials') void identity.submitCredentials();
          else if (value === 'submit_otp') void identity.submitOtp();
          else if (value === 'reset_credentials') identity.reset();
          else if (value === 'cancel_auth') leave();
        }}
      />
    );
  }

  if (state.phase === 'adopting') return <p role="status" className="text-sm text-sand-500 px-1">Confirming your identity with SecurePay…</p>;

  if (state.phase === 'needs-resolution' && state.handoff) {
    return (
      <div className="space-y-3">
        <NoticeCard data={handoffNoticeView(state.handoff)} />
        {state.handoff.unresolvedMatters.map((matter, i) => <p key={i} className="text-[0.8rem] text-sand-600 px-1">{matter}</p>)}
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Return to conversation', value: 'back' }] }} onChoice={leave} />
      </div>
    );
  }

  if (state.phase === 'review-loading') return <p role="status" className="text-sm text-sand-500 px-1">Loading the canonical Agreement review…</p>;

  if (state.phase === 'review-ready' && state.handoff && state.review) {
    return (
      <CanonicalAgreementCard
        data={canonicalAgreementView(state.review, state.handoff)}
        onChoice={value => {
          if (value === 'set_securely') void handoff.setSecurely();
          else if (value === 'refresh_review') void handoff.refresh();
          else if (value === 'back_to_conversation') leave();
        }}
      />
    );
  }

  if (state.phase === 'review-stale' && state.handoff) {
    return (
      <div className="space-y-3">
        <NoticeCard data={handoffNoticeView(state.handoff)} />
        <ChoiceButtons
          data={{ type: 'CHOICE_BUTTONS', choices: [
            { label: 'Refresh review', value: 'refresh' },
            { label: 'Start a fresh continuation', value: 'restart' },
          ] }}
          onChoice={value => { if (value === 'refresh') void handoff.refresh(); else leave(); }}
        />
      </div>
    );
  }

  if (state.phase === 'progressing') return <p role="status" className="text-sm text-sand-500 px-1">Setting this securely…</p>;

  if (state.phase === 'progressed' && state.handoff) {
    return (
      <div className="space-y-3">
        <NoticeCard data={handoffNoticeView(state.handoff)} />
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Return to conversation', value: 'done' }] }} onChoice={leave} />
      </div>
    );
  }

  if (state.phase === 'expired') return <ErrorStateCard data={expiredHandoffView()} onChoice={leave} />;

  return <ErrorStateCard data={handoffErrorView(state.error ?? 'SecurePay could not complete this step.')} onChoice={leave} />;
}
