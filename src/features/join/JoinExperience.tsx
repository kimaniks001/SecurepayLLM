import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { CommunityGateway } from '../../api/securepay/community';
import { SecureAuthCard } from '../../components/SecureAuth';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { createSignupController } from '../signup/controller';
import { signupView } from '../signup/view';
import { createJoinController, membershipKind, type ContinuationOutcome, type JoinTarget } from './controller';
import { INTEREST_CONTEXT, type JoinInterest } from './share';
import { ACCEPTANCE_LABEL, JOIN_IS_NOT, NO_LONGER_AUTHORISED, NO_LONGER_AUTHORISED_ORGANIZATION, businessAcceptanceLabel, businessJoinButton } from './copy';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';
const primary = `inline-flex min-h-11 items-center justify-center rounded-xl bg-forest-600 px-5 text-[0.9rem] font-medium text-cream-50 hover:bg-forest-700 disabled:opacity-40 transition-colors ${focusRing}`;
const secondary = `inline-flex min-h-11 items-center justify-center rounded-xl border border-forest-200 bg-white/80 px-5 text-[0.9rem] font-medium text-forest-800 hover:bg-forest-50 disabled:opacity-40 transition-colors ${focusRing}`;
const quiet = `min-h-11 rounded-lg px-2 text-[0.85rem] text-forest-700 underline hover:text-forest-800 ${focusRing}`;

/**
 * Public Experience Convergence Phase 4 (ADR-0021) -- `#/join`.
 *
 * Signed out: what The Trust Project is, the current 12 Principles, then an identity choice (get a KS Number,
 * or sign in) handled right here. Signed in: the person's own membership state and, where allowed, an explicit
 * acceptance control and a separate "Join The Trust Project" action. A signed-in person is never offered signup.
 * Signup and sign-in complete identity only; nothing joins until the final, explicit action.
 *
 * Phase 4C (API ADR-0023) -- the same page adapts to who the person is acting as. Acting for a Business (a capacity
 * SecurePay confirmed in the Business area), it names that Business and its KS Number, reads and changes THE
 * BUSINESS's membership, and says "Join for {Business}". SecurePay re-proves the right to decide on every read and
 * Join; if it no longer does, nothing joins and the person can continue as themself.
 *
 * Phase 4D (API ADR-0024) -- exactly the same for an Organization KS the person acts for: it is named as an
 * Organization (never a Business), and its own membership is read and changed through its own calls.
 */
export function JoinExperience({
  communityGateway, auth, session, signedIn, interest, continueConversation,
  onExploreCommunity, onReturnToConversation, onHelp, onDone, actingFor = null, actingForOrganization = null, selfName = null, onSwitchToSelf,
}: {
  communityGateway: Pick<CommunityGateway, 'currentPrinciples'> & {
    membership: Pick<CommunityGateway['membership'], 'me' | 'join'>
      & Partial<Pick<CommunityGateway['membership'], 'business' | 'joinBusiness' | 'organization' | 'joinOrganization'>>;
  };
  auth: Pick<AuthGateway, 'signIn' | 'completeOtp' | 'resendOtp' | 'signupStart' | 'signupResend' | 'signupVerify'>;
  session: Pick<SessionStore, 'setTokens'>;
  signedIn: boolean;
  interest: JoinInterest | null;
  continueConversation: () => Promise<ContinuationOutcome>;
  onExploreCommunity: () => void;
  onReturnToConversation: (conversationId: string) => void;
  onHelp: () => void;
  onDone: () => void;
  /** Phase 4C -- the Business the person is acting for, if any (from the confirmed Business-area capacity). */
  actingFor?: { businessKsNumber: string; displayName: string | null } | null;
  /** Phase 4D -- the Organization KS the person is acting for, if any (from the confirmed capacity). */
  actingForOrganization?: { organizationKsNumber: string; displayName: string | null } | null;
  selfName?: string | null;
  onSwitchToSelf?: () => void;
}) {
  const [target] = useState<JoinTarget>(() => signedIn && actingFor
    ? { kind: 'business', businessKsNumber: actingFor.businessKsNumber, displayName: actingFor.displayName }
    : signedIn && actingForOrganization
      ? { kind: 'organization', organizationKsNumber: actingForOrganization.organizationKsNumber, displayName: actingForOrganization.displayName }
      : { kind: 'self' });
  const [controller] = useState(() => createJoinController(communityGateway, continueConversation, undefined, target));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [identityPath, setIdentityPath] = useState<'choose' | 'signup' | 'signin'>('choose');
  const statusRef = useRef<HTMLDivElement>(null);
  const acceptId = useId();

  useEffect(() => { void controller.loadPrinciples(); }, [controller]);
  useEffect(() => {
    if (signedIn) void controller.loadMembership();
    else { controller.resetPersonal(); setIdentityPath('choose'); }
  }, [signedIn, controller]);
  // Move focus to a new outcome (joined, stale Principles, an error) so it is announced.
  useEffect(() => {
    if (state.phase === 'joined' || state.staleNotice || state.error) statusRef.current?.focus();
  }, [state.phase, state.staleNotice, state.error]);

  const kind = membershipKind(state.membership.value);
  // The represented identity (a Business or an Organization), named by its own kind -- never "self".
  const business = target.kind === 'business'
    ? { ksNumber: target.businessKsNumber, displayName: target.displayName, kindLabel: 'Business' as const }
    : target.kind === 'organization'
      ? { ksNumber: target.organizationKsNumber, displayName: target.displayName, kindLabel: 'Organization' as const }
      : null;
  const businessName = business ? business.displayName ?? business.ksNumber : null;
  const noLongerAuthorised = business?.kindLabel === 'Organization' ? NO_LONGER_AUTHORISED_ORGANIZATION : NO_LONGER_AUTHORISED;
  const identityId = `${acceptId}-identity`;
  const inviter = state.membership.value?.invitedByDisplayName ?? null;

  return (
    <main id="main" className="flex-1 overflow-auto bg-cream-100 bg-ks001-surface px-4 py-10 md:py-16" data-public-join>
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-center text-[0.75rem] font-semibold uppercase tracking-wide text-forest-600">The Trust Project · powered by SecurePay</p>
        <h1 className="mt-2 text-center font-display text-3xl md:text-4xl font-medium tracking-tight text-forest-800">Join The Trust Project</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-[0.95rem] leading-relaxed text-sand-700">
          People, businesses and organizations can belong. Each has its own KS Number for SecurePay and The Trust Project.
        </p>

        <section aria-labelledby="join-what" className="mt-8 rounded-2xl border border-cream-200 bg-white/85 p-5 md:p-6 shadow-soft">
          <h2 id="join-what" className="font-display text-lg text-forest-800">What joining means</h2>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-forest-700">
            The Trust Project is powered by SecurePay, and your KS Number is your identity across both. Joining gives you membership in The Trust Project — belonging to a community of people choosing to trade fairly, using shared tools, practical systems and one another’s knowledge.
          </p>
          <p className="mt-3 text-[0.85rem] text-sand-700">Joining doesn’t:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[0.85rem] text-sand-700">
            {JOIN_IS_NOT.map(line => <li key={line}>{line}</li>)}
          </ul>
          <p className="mt-3 text-[0.85rem] text-sand-700">You never have to invite, teach or sell. SecurePay itself works whether or not you join.</p>
          {interest && <p className="mt-3 rounded-xl bg-cream-50 px-3 py-2 text-[0.85rem] text-forest-700" data-join-interest={interest}>{INTEREST_CONTEXT[interest]}</p>}
        </section>

        <section aria-labelledby="join-principles" className="mt-5 rounded-2xl border border-cream-200 bg-white/85 p-5 md:p-6 shadow-soft">
          <h2 id="join-principles" className="font-display text-lg text-forest-800">
            The 12 Principles{state.principles.label ? <span className="ml-2 text-[0.8rem] font-sans text-sand-600">({state.principles.label})</span> : null}
          </h2>
          {state.principles.status === 'loading' && <p className="mt-2 text-[0.85rem] text-sand-600">Loading the current Principles…</p>}
          {state.principles.status === 'error' && (
            <p role="alert" className="mt-2 text-[0.85rem] text-ember-700">
              SecurePay couldn’t load the Principles right now, so joining isn’t possible yet.{' '}
              <button type="button" className={quiet} onClick={() => void controller.loadPrinciples()}>Try again</button>
            </p>
          )}
          {state.principles.items.length > 0 && (
            <ol className="mt-3 space-y-2.5">
              {state.principles.items.map(p => (
                <li key={p.number} className="text-[0.88rem] leading-relaxed">
                  <span className="font-medium text-forest-800">{p.number}. {p.title}</span>
                  <span className="block text-sand-700">{p.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
          {state.staleNotice && (
            <p role="alert" className="mt-5 rounded-xl border border-ember-200 bg-ember-50 px-4 py-3 text-[0.88rem] text-ember-800">
              The 12 Principles were updated while you were reading. Please read the current version above and choose again — nothing was joined.
            </p>
          )}
        </div>

        <section aria-labelledby="join-action" className="mt-5 rounded-2xl border border-forest-200 bg-white p-5 md:p-6 shadow-soft" data-join-state={signedIn ? kind : 'signed-out'}>
          <h2 id="join-action" className="sr-only">Your choice</h2>

          {signedIn && !business && (
            <p id={identityId} className="mb-3 text-[0.85rem] text-sand-700" data-join-identity="self">
              You are joining as <span className="font-medium text-forest-800 break-words">{selfName || 'yourself'}</span>
            </p>
          )}
          {signedIn && business && (
            <div className="mb-4 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3" data-join-identity={target.kind}>
              <p id={identityId} className="text-[0.9rem] text-forest-800">You are acting for <span className="font-medium break-words">{businessName}</span></p>
              <p id={`${identityId}-ks`} className="text-[0.75rem] text-sand-600 break-all">{business.kindLabel} KS Number {business.ksNumber}</p>
              {onSwitchToSelf && <button type="button" className={`${quiet} -ml-2`} onClick={onSwitchToSelf}>Switch back to yourself</button>}
            </div>
          )}

          {!signedIn && identityPath === 'choose' && (
            <div className="space-y-3">
              <p className="text-[0.9rem] text-forest-800">First, your SecurePay identity. Joining comes after, as its own choice.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className={primary} onClick={() => setIdentityPath('signup')}>Get my KS Number</button>
                <button type="button" className={secondary} onClick={() => setIdentityPath('signin')}>I already have a KS Number</button>
              </div>
            </div>
          )}
          {!signedIn && identityPath === 'signup' && <JoinSignup auth={auth} session={session} onUseExisting={() => setIdentityPath('signin')} onBack={() => setIdentityPath('choose')} />}
          {!signedIn && identityPath === 'signin' && <JoinSignIn auth={auth} session={session} onBack={() => setIdentityPath('choose')} onHelp={onHelp} />}

          {signedIn && state.membership.status === 'loading' && state.phase !== 'joined' && <p className="text-[0.88rem] text-sand-600">{business ? `Checking ${businessName}’s membership…` : 'Checking your membership…'}</p>}
          {signedIn && state.membership.status === 'error' && (
            <p role="alert" className="text-[0.88rem] text-ember-700">
              {business ? `SecurePay couldn’t check ${businessName}’s membership just now.` : 'SecurePay couldn’t check your membership just now.'}{' '}
              <button type="button" className={quiet} onClick={() => void controller.loadMembership()}>Try again</button>
            </p>
          )}

          {signedIn && business && state.authorityLost && (
            <div className="space-y-3" role="alert">
              <p className="text-[0.9rem] text-forest-800">{noLongerAuthorised}</p>
              <p className="text-[0.85rem] text-sand-700">Nothing was joined for {businessName}.</p>
              {onSwitchToSelf && <button type="button" className={secondary} onClick={onSwitchToSelf}>Continue as yourself</button>}
            </div>
          )}

          {signedIn && business && state.phase === 'joined' && (
            <div className="space-y-3" role="status">
              <p className="font-display text-lg text-forest-800 break-words">{businessName} has joined The Trust Project.</p>
              <p className="text-[0.88rem] text-sand-700">Only {businessName}’s membership changed. Your own membership is unchanged, and no Agreement, payment, subscription or capacity was created.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className={primary} onClick={onExploreCommunity}>Explore Community</button>
                <button type="button" className={secondary} onClick={onDone}>Back</button>
              </div>
            </div>
          )}

          {signedIn && !business && state.phase === 'joined' && (
            <div className="space-y-3" role="status">
              <p className="font-display text-lg text-forest-800">You’re a Member of The Trust Project.</p>
              <p className="text-[0.88rem] text-sand-700">Nothing else changed: no Agreement, payment, subscription or capacity was created.</p>
              {state.continuation?.kind === 'claiming' && <p className="text-[0.85rem] text-sand-600">Keeping your conversation with you…</p>}
              {state.continuation?.kind === 'claimed' && <p className="text-[0.85rem] text-forest-700">Your conversation is now saved to your KS Number.</p>}
              {state.continuation?.kind === 'failed' && <p className="text-[0.85rem] text-ember-700">You’ve joined, but SecurePay couldn’t keep your earlier conversation with your KS Number. Your membership is not affected.</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                {state.continuation?.kind === 'claimed'
                  ? <button type="button" className={primary} onClick={() => onReturnToConversation((state.continuation as { conversationId: string }).conversationId)}>Back to your conversation</button>
                  : <button type="button" className={primary} onClick={onExploreCommunity}>Explore Community</button>}
                {state.continuation?.kind === 'claimed' && <button type="button" className={secondary} onClick={onExploreCommunity}>Explore Community</button>}
              </div>
            </div>
          )}

          {signedIn && state.phase !== 'joined' && state.membership.status === 'ready' && !state.authorityLost && kind === 'active' && (
            <div className="space-y-3">
              <p className="font-display text-lg text-forest-800 break-words">{business ? `${businessName} is already a Member.` : 'You’re already a Member.'}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className={primary} onClick={onExploreCommunity}>Explore Community</button>
                <button type="button" className={secondary} onClick={onDone}>Back</button>
              </div>
            </div>
          )}

          {signedIn && state.phase !== 'joined' && state.membership.status === 'ready' && !state.authorityLost && kind === 'revoked' && (
            <div className="space-y-3">
              <p className="text-[0.9rem] text-forest-800">{business ? `Joining isn’t available for ${businessName}.` : 'Joining isn’t available for this KS Number.'} If you think this is a mistake, use Help & Support.</p>
              <button type="button" className={secondary} onClick={onHelp}>Help & Support</button>
            </div>
          )}

          {signedIn && business && state.phase !== 'joined' && state.membership.status === 'ready' && !state.authorityLost && state.canManage === false && (kind === 'none' || kind === 'invited' || kind === 'declined') && (
            <p className="text-[0.9rem] text-forest-800">You can act for {businessName}, but you can’t make its Trust Project decision.</p>
          )}

          {signedIn && state.phase !== 'joined' && state.membership.status === 'ready' && !state.authorityLost && (!business || state.canManage === true) && (kind === 'none' || kind === 'invited' || kind === 'declined') && (
            <div className="space-y-4">
              {business && kind === 'none' && (
                <div className="space-y-1">
                  <p className="text-[0.9rem] text-forest-800 break-words">{businessName} has not joined The Trust Project yet.</p>
                  <p className="text-[0.85rem] text-sand-700">You can join for this {business.kindLabel} because you are authorized to act for it. Review the 12 Principles above before joining for {businessName}.</p>
                </div>
              )}
              {kind === 'invited' && <p className="text-[0.9rem] text-forest-800">{inviter ?? 'Someone in the community'} invited {business ? businessName : 'you'} to The Trust Project.</p>}
              {kind === 'declined' && <p className="text-[0.9rem] text-forest-800">{business ? `${businessName} declined an invitation earlier. It can still join; that earlier choice stays on record.` : 'You declined an invitation earlier. You can still choose to join; that earlier choice stays on record.'}</p>}
              <div className="flex items-start gap-3">
                <input
                  id={acceptId} type="checkbox" checked={state.accepted}
                  disabled={state.phase === 'joining' || state.principles.status !== 'ready'}
                  onChange={event => controller.setAccepted(event.target.checked)}
                  className="mt-3 h-5 w-5 shrink-0 accent-forest-600"
                  aria-describedby={state.error ? `${acceptId}-error` : undefined}
                />
                <label htmlFor={acceptId} className="min-h-[44px] cursor-pointer py-2.5 text-[0.9rem] leading-snug text-forest-800 break-words">{business ? businessAcceptanceLabel(businessName!) : ACCEPTANCE_LABEL}</label>
              </div>
              {state.error && <p id={`${acceptId}-error`} role="alert" className="text-[0.85rem] text-ember-700">{state.error}</p>}
              <button
                type="button" className={primary}
                disabled={!state.accepted || state.phase === 'joining' || state.principles.status !== 'ready'}
                onClick={() => void controller.join()}
                aria-describedby={business ? `${identityId} ${identityId}-ks` : identityId}
              >
                {state.phase === 'joining' ? 'Joining…' : business ? businessJoinButton(businessName!) : 'Join The Trust Project'}
              </button>
            </div>
          )}
        </section>

        <p className="mt-6 text-center">
          <button type="button" className={quiet} onClick={onDone}>Not now</button>
        </p>
      </div>
    </main>
  );
}

/** Identity only: the same signup controller every other flow uses, with Join's own honest wording. */
function JoinSignup({ auth, session, onUseExisting, onBack }: {
  auth: Pick<AuthGateway, 'signupStart' | 'signupResend' | 'signupVerify'>;
  session: Pick<SessionStore, 'setTokens'>;
  onUseExisting: () => void;
  onBack: () => void;
}) {
  return <SignupForm auth={auth} session={session} context="TRUST_PROJECT_JOIN" onUseExisting={onUseExisting} onBack={onBack} />;
}

export function SignupForm({ auth, session, context, onUseExisting, onBack }: {
  auth: Pick<AuthGateway, 'signupStart' | 'signupResend' | 'signupVerify'>;
  session: Pick<SessionStore, 'setTokens'>;
  context: 'GENERIC' | 'TRUST_PROJECT_JOIN';
  onUseExisting: () => void;
  onBack: () => void;
}) {
  const [signup] = useState(() => createSignupController(auth, session, context));
  const state = useSyncExternalStore(signup.subscribe, signup.getSnapshot, signup.getSnapshot);
  const view = signupView(state, context);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || state.busy) return;
    event.preventDefault();
    if (state.phase === 'otp') void signup.verify(); else void signup.start();
  };
  return (
    <div className="space-y-3" onKeyDown={onKeyDown} data-signup-context={context}>
      {state.phase === 'form' && (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">How should SecurePay reach you?</legend>
          {(['SMS', 'EMAIL'] as const).map(channel => (
            <button key={channel} type="button" aria-pressed={state.channelType === channel} disabled={state.busy}
              onClick={() => signup.setChannelType(channel)}
              className={`min-h-11 rounded-xl border px-4 text-[0.85rem] font-medium ${state.channelType === channel ? 'border-forest-600 bg-forest-50 text-forest-800' : 'border-cream-300 bg-white text-forest-700'} ${focusRing}`}>
              {channel === 'SMS' ? 'Phone' : 'Email'}
            </button>
          ))}
        </fieldset>
      )}
      <SecureAuthCard
        data={view}
        values={state.phase === 'otp' ? [state.otp] : [state.displayName, state.destination, state.password]}
        disabled={state.busy}
        errorText={state.error}
        onFieldChange={(index, value) => {
          if (state.phase === 'otp') signup.setOtp(value);
          else if (index === 0) signup.setDisplayName(value);
          else if (index === 1) signup.setDestination(value);
          else signup.setPassword(value);
        }}
        onChoice={value => {
          if (value === 'signup_start') void signup.start();
          else if (value === 'signup_verify') void signup.verify();
          else if (value === 'signup_reset') signup.reset();
          else if (value === 'signup_use_existing') { signup.reset(); onUseExisting(); }
        }}
      />
      {state.phase === 'otp' && (
        <button type="button" disabled={state.busy} onClick={() => void signup.resend()} className={quiet}>Send the code again</button>
      )}
      {state.error && (
        <p className="text-[0.85rem] text-sand-700">
          Already have a KS Number? <button type="button" className={quiet} onClick={() => { signup.reset(); onUseExisting(); }}>Sign in</button>
        </p>
      )}
      <button type="button" className={quiet} onClick={() => { signup.reset(); onBack(); }}>Back</button>
    </div>
  );
}

function JoinSignIn({ auth, session, onBack, onHelp }: {
  auth: Pick<AuthGateway, 'signIn' | 'completeOtp' | 'resendOtp'>;
  session: Pick<SessionStore, 'setTokens'>;
  onBack: () => void;
  onHelp: () => void;
}) {
  const [identity] = useState(() => createIdentityController(auth, session));
  const state = useSyncExternalStore(identity.subscribe, identity.getSnapshot, identity.getSnapshot);
  const view = secureAuthView(state, {
    title: 'Sign in with your KS Number',
    reason: 'Signing in only proves who you are. You’ll choose whether to join next.',
    secondaryLabel: 'Back',
  });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || state.busy) return;
    event.preventDefault();
    if (state.phase === 'otp') void identity.submitOtp(); else void identity.submitCredentials();
  };
  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
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
        onChoice={value => {
          if (value === 'submit_credentials') void identity.submitCredentials();
          else if (value === 'submit_otp') void identity.submitOtp();
          else if (value === 'reset_credentials') identity.reset();
          else if (value === 'cancel_auth') { identity.reset(); onBack(); }
        }}
      />
      {state.phase === 'otp' && <button type="button" disabled={state.busy} onClick={() => void identity.resendOtp()} className={quiet}>Send the code again</button>}
      <button type="button" className={quiet} onClick={onHelp}>Trouble signing in? Recover your account</button>
    </div>
  );
}
