import { useEffect, useState, useSyncExternalStore } from 'react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { RecipientReviewCard } from '../../components/RecipientReview';
import { SecureAuthCard } from '../../components/SecureAuth';
import { JoinPromptCard } from '../../components/JoinPrompt';
import { JoinedStatusCard } from '../../components/JoinedStatus';
import { CanonicalAgreementCard } from '../../components/CanonicalAgreement';
import { NoticeCard } from '../../components/NoticeCard';
import { ErrorStateCard } from '../../components/ErrorState';
import { ChoiceButtons } from '../../components/ChoiceButtons';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { createRecipientController } from './controller';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { recipientReviewView, joinPromptView, joinedStatusView, exactVersionView, changedVersionNoticeView, confirmedView, recipientErrorView } from './view';

export function RecipientExperience({ token, gateway, auth, session, onLeave }: {
  token: string; gateway: AgreementGateway; auth: AuthGateway; session: SessionStore; onLeave: () => void;
}) {
  const [recipient] = useState(() => createRecipientController(gateway, token));
  const [identity] = useState(() => createIdentityController(auth, session));
  const state = useSyncExternalStore(recipient.subscribe, recipient.getSnapshot);
  const identityState = useSyncExternalStore(identity.subscribe, identity.getSnapshot);

  useEffect(() => { void recipient.load(); }, [recipient]);
  useEffect(() => {
    if (state.phase === 'identity-required' && identityState.phase === 'signed-in') {
      recipient.afterIdentitySignedIn();
      identity.reset();
    }
  }, [state.phase, identityState.phase, recipient, identity]);

  const leave = () => { recipient.reset(); identity.reset(); onLeave(); };

  let body: React.ReactNode;
  if (state.phase === 'idle' || state.phase === 'loading-invitation') {
    body = <p role="status" className="text-sm text-sand-500 text-center">Opening this invitation…</p>;
  } else if (state.phase === 'invitation-error') {
    body = <ErrorStateCard data={recipientErrorView(state.error ?? 'This invitation could not be opened.')} onChoice={leave} />;
  } else if (state.phase === 'invitation-ready' && state.invitation) {
    body = (
      <RecipientReviewCard
        data={recipientReviewView(state.invitation)}
        notice={state.invitation.notice}
        onChoice={value => {
          if (value === 'continue_review') recipient.proceed(session.getSnapshot().status === 'signed-in');
          else if (value === 'not_me') leave();
        }}
      />
    );
  } else if (state.phase === 'identity-required') {
    const authData = secureAuthView(identityState);
    body = (
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
  } else if (state.phase === 'join-prompt' || state.phase === 'join-error') {
    body = (
      <div className="space-y-3">
        {state.phase === 'join-error' && <ErrorStateCard data={recipientErrorView(state.error ?? 'Joining did not succeed.')} onChoice={() => void recipient.join()} />}
        {state.phase === 'join-prompt' && (
          <JoinPromptCard
            data={joinPromptView()}
            onChoice={value => {
              if (value === 'join_agreement') void recipient.join();
              else if (value === 'leave') leave();
            }}
          />
        )}
      </div>
    );
  } else if (state.phase === 'joining' || state.phase === 'version-loading') {
    body = <p role="status" className="text-sm text-sand-500 text-center">{state.phase === 'joining' ? 'Joining…' : 'Loading the current agreement version…'}</p>;
  } else if ((state.phase === 'version-ready' || state.phase === 'confirming' || state.phase === 'confirm-error') && state.join && state.version) {
    body = (
      <div className="space-y-3">
        <JoinedStatusCard data={joinedStatusView(state.join)} />
        {state.changed && <NoticeCard data={changedVersionNoticeView()} />}
        {state.phase === 'confirm-error' && <p role="alert" className="text-[0.8rem] text-ember-600 text-center">{state.error}</p>}
        <CanonicalAgreementCard
          data={exactVersionView(state.version)}
          onChoice={value => {
            if (value === 'confirm_acceptance') void recipient.confirm();
            // "I need something changed" is a safe no-op here: nothing is submitted, and no
            // real amendment/change-request contract is wired into this recipient slice.
          }}
        />
        {state.phase === 'confirming' && <p role="status" className="text-sm text-sand-500 text-center">Confirming…</p>}
      </div>
    );
  } else if (state.phase === 'confirmed' && state.confirmation) {
    body = (
      <div className="space-y-3">
        <NoticeCard data={confirmedView(state.confirmation)} />
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Done', value: 'done' }] }} onChoice={leave} />
      </div>
    );
  } else {
    body = <ErrorStateCard data={recipientErrorView(state.error ?? 'SecurePay could not complete this step.')} onChoice={leave} />;
  }

  return (
    <main className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6 gap-6">
      {/* Phase 2 Human Core (Section 21/22): the recipient must feel like the same SecurePay
          experience from the other side, not an anonymous public link -- own markup, not part of
          any locked Bolt component, so it never affects fixture parity for the cards below it. */}
      <img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" />
      <div className="w-full max-w-lg">{body}</div>
    </main>
  );
}
