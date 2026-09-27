import type { AppView } from '../../types';
import { SIGN_UP_HASH, isSignUpHash } from '../join/route';

/**
 * Public Experience Convergence Phase 2 + Phase 4 final correction -- the ONE in-memory memory of where a
 * signed-out person came from, and which area (AppView) they asked for, while they identify themselves.
 *
 * It spans both identity legs of the same journey:
 *   `#/sign-in`  -- Sign in
 *   `#/sign-up`  -- "Don't have a KS Number? Get one" (generic, identity-only signup)
 * Moving between the two legs ("Get one", "I have a KS Number", the signup's Back) keeps the SAME origin and
 * intent, so a KS Number created here returns the person exactly where Sign in would have.
 *
 * Memory only: never the URL and never browser storage. Leaving both legs (any other hash) forgets it.
 * Join (`#/join`) and Agreement-invitation signup own their own continuation and never use this.
 */
export const SIGN_IN_HASH = '#/sign-in';
const SIGN_IN_PATTERN = /^#\/?sign-in\/?$/;

export const isSignInHash = (hash: string) => SIGN_IN_PATTERN.test(hash);

export type AuthLeg = 'sign-in' | 'sign-up' | null;
export const authLegFor = (hash: string): AuthLeg => (isSignInHash(hash) ? 'sign-in' : isSignUpHash(hash) ? 'sign-up' : null);

/** The only thing the flow touches: the current hash. */
export interface HashLocation {
  get(): string;
  set(hash: string): void;
}

interface Origin { hash: string; intent: AppView | null }

export function createSignInFlow(location: HashLocation) {
  let origin: Origin | null = null;
  const ensureOrigin = () => { origin ??= { hash: authLegFor(location.get()) ? '' : location.get(), intent: null }; };

  return {
    leg: (): AuthLeg => authLegFor(location.get()),
    /** The remembered area to open afterwards, if any (read-only; for the route's own consumers and tests). */
    intent: (): AppView | null => origin?.intent ?? null,

    /** Opens Sign in, remembering the current location and, optionally, the view to open afterwards. */
    open(intent: AppView | null = null) {
      const current = location.get();
      origin = { hash: authLegFor(current) ? (origin?.hash ?? '') : current, intent };
      if (!isSignInHash(current)) location.set(SIGN_IN_HASH);
    },
    /** Sign in → "Get one": the generic signup leg, keeping the same origin and intent. */
    toSignUp() {
      ensureOrigin();
      if (!isSignUpHash(location.get())) location.set(SIGN_UP_HASH);
    },
    /** Signup → "I have a KS Number" / Back: back to Sign in, keeping the same origin and intent. */
    toSignIn() {
      ensureOrigin();
      if (!isSignInHash(location.get())) location.set(SIGN_IN_HASH);
    },
    /** Leaves whichever leg is showing for where the person came from. Returns the remembered intent. */
    close(): AppView | null {
      const intent = origin?.intent ?? null;
      const back = origin?.hash ?? '';
      origin = null;
      if (authLegFor(location.get())) location.set(back);
      return intent;
    },
    /** Called on every hash change: once neither leg is showing, the journey is over and nothing is remembered. */
    sync() {
      if (!authLegFor(location.get())) origin = null;
    },
  };
}
export type SignInFlow = ReturnType<typeof createSignInFlow>;

export const windowHashLocation: HashLocation = {
  get: () => (typeof window === 'undefined' ? '' : window.location.hash),
  set: hash => { window.location.hash = hash; },
};
