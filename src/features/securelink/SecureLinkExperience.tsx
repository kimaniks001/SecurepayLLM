import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { SecureAuthCard } from '../../components/SecureAuth';
import { ChoiceButtons } from '../../components/ChoiceButtons';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { createSignupController } from '../signup/controller';
import { signupView } from '../signup/view';
import { createSecureLinkPublicController } from './publicController';
import { publicProductView } from './view';

const AUTH_CONTEXT = { title: 'SecurePay needs to know who you are', reason: 'Before joining this Agreement, SecurePay needs to know who you are. Signing in only proves that — it does not join, confirm or pay anything.', secondaryLabel: 'Not now' };

type IdentityPath = 'unset' | 'signin' | 'signup';

/**
 * KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 8) — the public SecureLink experience.
 * Reachable with NO authentication (`#/securelink/{slug}`). Review-first: opening it never joins,
 * confirms, accepts, or pays. "Join this Agreement" is the ONE legitimate continuation this surface
 * offers, and it hands off to the SAME existing `#/invitation/{token}` → RecipientExperience → Join
 * core once an authenticated join-authority token is issued — never a second Join implementation.
 */
export function SecureLinkExperience({ slug, gateway, auth, session, onLeave }: {
  slug: string;
  gateway: Pick<AgreementGateway, 'viewSecureLink' | 'requestSecureLinkJoinAuthority'>;
  auth: AuthGateway;
  session: SessionStore;
  onLeave: () => void;
}) {
  const [controller] = useState(() => createSecureLinkPublicController(gateway, slug));
  const [identity] = useState(() => createIdentityController(auth, session));
  const [signup] = useState(() => createSignupController(auth, session));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const identityState = useSyncExternalStore(identity.subscribe, identity.getSnapshot, identity.getSnapshot);
  const signupState = useSyncExternalStore(signup.subscribe, signup.getSnapshot, signup.getSnapshot);
  const [identityPath, setIdentityPath] = useState<IdentityPath>('unset');

  useEffect(() => { void controller.load(); }, [controller]);
  useEffect(() => {
    if (state.phase === 'identity-required' && identityState.phase === 'signed-in') {
      void controller.requestJoinAuthority(true);
      identity.reset();
      setIdentityPath('unset');
    }
  }, [state.phase, identityState.phase, controller, identity]);
  useEffect(() => {
    if (state.phase === 'identity-required' && signupState.phase === 'completed') {
      void controller.requestJoinAuthority(true);
      signup.reset();
      setIdentityPath('unset');
    }
  }, [state.phase, signupState.phase, controller, signup]);

  let body: React.ReactNode;
  if (state.phase === 'loading') {
    body = <p role="status" className="text-sm text-sand-500 text-center">Opening this SecureLink…</p>;
  } else if (state.phase === 'not-found') {
    body = <StatusNotice tone="warning" icon={false}>SecurePay can’t find this SecureLink. It may have expired or been withdrawn.</StatusNotice>;
  } else if (state.phase === 'error') {
    body = <StatusNotice tone="warning" icon={false}>{state.message}</StatusNotice>;
  } else if (state.phase === 'redirecting-to-join') {
    body = <p role="status" className="text-sm text-sand-500 text-center">Taking you to join…</p>;
  } else if (state.phase === 'ready' || state.phase === 'requesting-join-authority' || state.phase === 'join-authority-error') {
    const view = publicProductView(state.view);
    body = (
      <div className="space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-sand-500">{view.productTypeLabel}</p>
          <h2 className="font-display text-xl text-forest-800">{view.purposeSummary}</h2>
          {view.amountLine && <p className="text-sm text-sand-700">{view.amountLine}</p>}
          <p className="text-[0.78rem] text-sand-500">{view.statusLine}</p>
          <p className={`text-[0.75rem] ${view.isCurrentVersion ? 'text-sand-500' : 'text-ember-700'}`}>{view.versionLine}</p>
          {view.expiryLine && <p className="text-[0.75rem] text-sand-500">{view.expiryLine}</p>}
          {view.participants.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-[0.7rem] uppercase tracking-wide text-sand-500">Roles</p>
              {view.participants.map((p, i) => <p key={i} className="text-[0.82rem] text-sand-700">{p}</p>)}
            </div>
          )}
          {view.milestones.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-[0.7rem] uppercase tracking-wide text-sand-500">Milestones</p>
              {view.milestones.map((m, i) => <p key={i} className="text-[0.82rem] text-sand-700">{m}</p>)}
            </div>
          )}
          {view.nextStepGuidance && <p className="text-[0.8rem] text-sand-600 pt-1">{view.nextStepGuidance}</p>}
          <p className="text-[0.72rem] text-sand-400 pt-2">Viewing this SecureLink does not join, confirm, accept, or pay anything.</p>
        </div>
        {state.phase === 'join-authority-error' && <StatusNotice tone="warning" icon={false}>{state.message}</StatusNotice>}
        <Button
          onClick={() => void controller.requestJoinAuthority(session.getSnapshot().status === 'signed-in')}
          disabled={state.phase === 'requesting-join-authority'}
        >
          {state.phase === 'requesting-join-authority' ? 'Checking…' : 'Join this Agreement'}
        </Button>
      </div>
    );
  } else if (state.phase === 'identity-required') {
    if (identityPath === 'unset') {
      body = (
        <div className="space-y-3 text-center">
          <p className="text-[0.9rem] text-sand-700">{AUTH_CONTEXT.reason}</p>
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
          <button type="button" className="text-[0.8rem] text-sand-500 underline" onClick={() => controller.backToReview()}>Not now</button>
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
      const authData = secureAuthView(identityState, AUTH_CONTEXT);
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
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between">
        <button onClick={onLeave} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Leave</button>
        <img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" />
      </header>
      <div className="max-w-xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">{body}</div>
    </div>
  );
}
