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
import { createSignupController } from '../signup/controller';
import { signupView } from '../signup/view';
import { recipientReviewView, joinPromptView, joinedStatusView, exactVersionView, participantsView, roleWords, needsChangingView, changedVersionNoticeView, confirmedView, recipientErrorView } from './view';

const AUTH_CONTEXT = { title: 'SecurePay needs to know who you are', reason: 'Before adding you to this Agreement, SecurePay needs to know who you are. Signing in only proves that — it does not join, confirm or accept anything, and you’ll come straight back to this invitation.', secondaryLabel: 'Not now' };

/**
 * KS001 Upgrade Phase 4 continuation (Section 14) — the identity-boundary sub-choice: sign in with an
 * existing KS Number, or get a new one via signup. Purely local UI routing between the two EXISTING,
 * unmodified sub-controllers below; never itself a source of authority.
 */
type IdentityPath = 'unset' | 'signin' | 'signup';

export function RecipientExperience({ token, gateway, auth, session, onLeave }: {
  token: string; gateway: AgreementGateway; auth: AuthGateway; session: SessionStore; onLeave: () => void;
}) {
  const [recipient] = useState(() => createRecipientController(gateway, token));
  const [identity] = useState(() => createIdentityController(auth, session));
  const [signup] = useState(() => createSignupController(auth, session));
  const state = useSyncExternalStore(recipient.subscribe, recipient.getSnapshot);
  const [needsChanging, setNeedsChanging] = useState(false);
  const [identityPath, setIdentityPath] = useState<IdentityPath>('unset');
  const identityState = useSyncExternalStore(identity.subscribe, identity.getSnapshot);
  const signupState = useSyncExternalStore(signup.subscribe, signup.getSnapshot);

  useEffect(() => { void recipient.load(); }, [recipient]);
  useEffect(() => {
    if (state.phase === 'identity-required' && identityState.phase === 'signed-in') {
      recipient.afterIdentitySignedIn();
      identity.reset();
      setIdentityPath('unset');
    }
  }, [state.phase, identityState.phase, recipient, identity]);
  useEffect(() => {
    // KS001 Upgrade Phase 4 continuation (Section 17/18) -- signup completing only establishes a session,
    // the SAME way ordinary sign-in's OTP completion does. It never calls recipient.join() itself; the
    // person still lands on the explicit Join prompt, exactly like the existing sign-in path.
    if (state.phase === 'identity-required' && signupState.phase === 'completed') {
      recipient.afterIdentitySignedIn();
      signup.reset();
      setIdentityPath('unset');
    }
  }, [state.phase, signupState.phase, recipient, signup]);

  const leave = () => { recipient.reset(); identity.reset(); signup.reset(); setIdentityPath('unset'); onLeave(); };

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
    // After Join, "before adding you to this Agreement" would be false: only the stage-true words are used.
    const afterJoin = state.resume === 'reload-version' || state.resume === 'version-ready';
    if (identityPath === 'unset') {
      // KS001 Upgrade Phase 4 continuation (Section 14) -- the identity-boundary choice. Neither option
      // is itself an action on the Agreement; both merely lead to establishing who the person is.
      body = (
        <div className="space-y-3 text-center">
          <p className="text-[0.9rem] text-sand-700">{state.authNotice ?? AUTH_CONTEXT.reason}</p>
          <ChoiceButtons
            data={{ type: 'CHOICE_BUTTONS', choices: [
              { label: 'I have a KS Number', value: 'path_signin' },
              { label: 'Get my KS Number', value: 'path_signup' },
            ] }}
            onChoice={value => {
              if (value === 'path_signin') setIdentityPath('signin');
              else if (value === 'path_signup') setIdentityPath('signup');
            }}
          />
          <button type="button" className="text-[0.8rem] text-sand-500 underline" onClick={leave}>Not now</button>
        </div>
      );
    } else if (identityPath === 'signup') {
      const signupData = signupView(signupState);
      body = (
        <div className="space-y-3">
          {signupState.phase === 'form' && (
            <ChoiceButtons
              data={{ type: 'CHOICE_BUTTONS', choices: [
                { label: 'Phone', value: 'channel_sms' },
                { label: 'Email', value: 'channel_email' },
              ] }}
              onChoice={value => {
                if (value === 'channel_sms') signup.setChannelType('SMS');
                else if (value === 'channel_email') signup.setChannelType('EMAIL');
              }}
            />
          )}
          <SecureAuthCard
            data={signupData}
            values={signupState.phase === 'otp' ? [signupState.otp] : [signupState.displayName, signupState.destination, signupState.password]}
            disabled={signupState.busy}
            errorText={signupState.error}
            onFieldChange={(index, value) => {
              if (signupState.phase === 'otp') signup.setOtp(value);
              else if (index === 0) signup.setDisplayName(value);
              else if (index === 1) signup.setDestination(value);
              else signup.setPassword(value);
            }}
            onChoice={value => {
              if (value === 'signup_start') void signup.start();
              else if (value === 'signup_verify') void signup.verify();
              else if (value === 'signup_reset') signup.reset();
              else if (value === 'signup_use_existing') { signup.reset(); setIdentityPath('signin'); }
            }}
          />
        </div>
      );
    } else {
      const authData = secureAuthView(identityState, state.authNotice
        ? { ...AUTH_CONTEXT, reason: afterJoin ? `${state.authNotice} Signing in only proves who you are — it does not confirm anything.` : `${state.authNotice} ${AUTH_CONTEXT.reason}` }
        : AUTH_CONTEXT);
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
            else if (value === 'cancel_auth') { identity.reset(); setIdentityPath('unset'); }
          }}
        />
      );
    }
  } else if (state.phase === 'join-prompt' || state.phase === 'join-error' || state.phase === 'join-uncertain') {
    body = (
      <div className="space-y-3">
        {state.phase === 'join-error' && <ErrorStateCard data={{ ...recipientErrorView(state.error ?? 'Joining did not succeed.'), primaryLabel: 'Try again', primaryValue: 'retry' }} onChoice={() => void recipient.join()} />}
        {state.phase === 'join-uncertain' && <div className="space-y-2">
          <NoticeCard data={{ type: 'NOTICE', label: 'We’re not sure that went through', text: `${state.error} You may or may not have joined. Trying again sends the same request, so it can’t add you twice.`, tone: 'worth_checking' }} />
          <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Check and try again', value: 'retry' }, { label: 'Not now', value: 'leave' }] }} onChoice={value => { if (value === 'retry') void recipient.join(); else leave(); }} />
        </div>}
        {state.invitation && (state.phase === 'join-prompt' || state.phase === 'join-uncertain') && <p className="break-words px-1 text-center text-[0.85rem] text-sand-700">{state.invitation.title} · your role: {roleWords(state.invitation.intendedRole)}</p>}
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
    body = <p role="status" className="text-sm text-sand-500 text-center">{state.phase === 'joining' ? 'Adding you to the Agreement…' : 'Loading the current Agreement version…'}</p>;
  } else if ((state.phase === 'version-ready' || state.phase === 'confirming' || state.phase === 'confirm-error' || state.phase === 'confirm-uncertain') && state.join && state.version) {
    body = (
      <div className="space-y-3">
        <JoinedStatusCard data={joinedStatusView(state.join)} />
        {state.changed && <NoticeCard data={changedVersionNoticeView()} />}
        {state.phase === 'confirm-error' && <p role="alert" className="text-[0.85rem] text-ember-700 text-center">{state.error}</p>}
        {state.phase === 'confirm-uncertain' && <div className="space-y-2">
          <NoticeCard data={{ type: 'NOTICE', label: 'We’re not sure that went through', text: `${state.error} Your confirmation may or may not be recorded, so it isn’t shown as done. Trying again sends the same request for the same version, so it can’t be recorded twice.`, tone: 'worth_checking' }} />
          <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Check and try again', value: 'retry' }] }} onChoice={() => void recipient.confirm()} />
        </div>}
        <CanonicalAgreementCard
          data={exactVersionView(state.version, participantsView(state.participants, state.join.participantId))}
          onChoice={value => {
            if (value === 'confirm_version') void recipient.confirm();
            else if (value === 'need_change') setNeedsChanging(open => !open);
          }}
        />
        {needsChanging && <NoticeCard data={needsChangingView()} />}
        {state.phase === 'confirming' && <p role="status" className="text-sm text-sand-500 text-center">Recording your confirmation…</p>}
      </div>
    );
  } else if (state.phase === 'confirmed' && state.confirmation) {
    body = (
      <div className="space-y-3">
        <NoticeCard data={confirmedView(state.confirmation)} />
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Done', value: 'done' }] }} onChoice={leave} />
      </div>
    );
  } else if (state.phase === 'error' && state.join) {
    // Joined, but the Agreement version could not be read: only the READ is retried, never Join.
    body = <ErrorStateCard data={{ ...recipientErrorView(`You have joined this Agreement, but SecurePay couldn’t load it just now. ${state.error ?? ''}`.trim()), primaryLabel: 'Try again', primaryValue: 'retry' }} onChoice={() => void recipient.reloadVersion()} />;
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
