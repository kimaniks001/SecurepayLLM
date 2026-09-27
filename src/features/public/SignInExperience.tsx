import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { SecureAuthCard } from '../../components/SecureAuth';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

/**
 * Public Experience Convergence Phase 2 -- the public Sign in page (`#/sign-in`).
 *
 * Authentication only: it reuses the one existing identity controller (KS Number + password, then the
 * one-time code) and the existing SecureAuth card. It never chooses a plan, starts Activation, funds
 * anything, creates or joins an Agreement, or joins The Trust Project -- it receives only the auth gateway
 * and the session, nothing else.
 */
export function SignInExperience({ auth, session, onSignedIn, onCancel, onRecover, onGetKsNumber }: {
  auth: Pick<AuthGateway, 'signIn' | 'completeOtp' | 'resendOtp'>;
  session: Pick<SessionStore, 'setTokens'>;
  /** Called once SecurePay has confirmed the person and the session is established. */
  onSignedIn: () => void;
  onCancel: () => void;
  onRecover: () => void;
  /** Public Experience Convergence Phase 4 -- the generic, identity-only signup (`#/sign-up`). */
  onGetKsNumber?: () => void;
}) {
  const [identity, setIdentity] = useState(() => createIdentityController(auth, session));
  const state = useSyncExternalStore(identity.subscribe, identity.getSnapshot, identity.getSnapshot);

  useEffect(() => {
    if (state.phase === 'signed-in') onSignedIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const view = secureAuthView(state, {
    title: 'Sign in with your KS Number',
    reason: 'Signing in only proves who you are. It does not create, join, confirm or pay for anything.',
    secondaryLabel: 'Cancel',
  });

  const choose = (value: string) => {
    if (value === 'submit_credentials') void identity.submitCredentials();
    else if (value === 'submit_otp') void identity.submitOtp();
    else if (value === 'reset_credentials') identity.reset();
    else if (value === 'cancel_auth') { setIdentity(createIdentityController(auth, session)); onCancel(); }
  };

  // Enter submits the current step, like any sign-in form.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || state.busy) return;
    event.preventDefault();
    choose(state.phase === 'otp' ? 'submit_otp' : 'submit_credentials');
  };

  return (
    <main id="main" className="flex-1 overflow-auto bg-cream-100 bg-ks001-surface px-4 py-12 md:py-20" data-public-sign-in>
      <div className="mx-auto max-w-md">
        <h1 className="text-center font-display text-3xl md:text-4xl font-medium tracking-tight text-forest-800">Sign in to SecurePay</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[0.95rem] leading-relaxed text-sand-700">
          Your KS Number is your identity across SecurePay and The Trust Project.
        </p>
        <div className="mt-8" onKeyDown={onKeyDown}>
          <SecureAuthCard
            data={view}
            values={state.phase === 'otp' ? [state.otp] : [state.ksNumber, state.password]}
            disabled={state.busy}
            errorText={state.error}
            onFieldChange={(index, value) => {
              if (state.phase === 'otp') identity.setOtp(value);
              else if (index === 0) identity.setKsNumber(value);
              else identity.setPassword(value);
            }}
            onChoice={choose}
          />
        </div>
        {state.phase === 'otp' && (
          <p className="mt-4 text-center">
            <button type="button" disabled={state.busy} onClick={() => void identity.resendOtp()}
              className="min-h-11 rounded-lg px-2 text-[0.85rem] text-forest-700 underline hover:text-forest-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              Send the code again
            </button>
          </p>
        )}
        {onGetKsNumber && state.phase !== 'otp' && (
          <p className="mt-6 text-center text-[0.9rem] text-sand-700" data-get-ks-number>
            Don’t have a KS Number?{' '}
            <button type="button" onClick={onGetKsNumber}
              className="min-h-11 rounded-lg px-1 font-medium text-forest-700 underline hover:text-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              Get one
            </button>
          </p>
        )}
        <p className="mt-3 text-center">
          <button type="button" onClick={onRecover}
            className="min-h-11 rounded-lg px-2 text-[0.85rem] text-forest-700 underline hover:text-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
            Trouble signing in? Recover your account
          </button>
        </p>
      </div>
    </main>
  );
}
