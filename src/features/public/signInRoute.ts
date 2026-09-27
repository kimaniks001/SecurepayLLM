import { useEffect, useState } from 'react';
import type { AppView } from '../../types';
import { createSignInFlow, windowHashLocation, type AuthLeg } from './signInFlow';

/**
 * Public Experience Convergence Phase 2 -- the public Sign in route, `#/sign-in`.
 *
 * It is handled inside `AgentExperience` (not as a separate RuntimeApp route), so a signed-out visitor's
 * in-memory conversation, sources and Home state stay mounted while they sign in. Where they came from is
 * held in memory only -- never in the URL -- and restored afterwards.
 *
 * Phase 4 final correction: the generic signup (`#/sign-up`, "Get one") is the second leg of the SAME
 * journey, so it shares this one in-memory origin + intent (see `signInFlow.ts`).
 */
export { SIGN_IN_HASH, isSignInHash } from './signInFlow';

export interface SignInRoute {
  /** `#/sign-in` is showing. */
  active: boolean;
  /** `#/sign-up` (generic signup, reached from Sign in) is showing. */
  signingUp: boolean;
  /** Opens `#/sign-in`, remembering the current location and, optionally, the view to open afterwards. */
  open: (intent?: AppView | null) => void;
  /** Sign in → "Get one", keeping the remembered location and intent. */
  toSignUp: () => void;
  /** Signup → "I have a KS Number" / Back, keeping the remembered location and intent. */
  toSignIn: () => void;
  /** Leaves `#/sign-in` or `#/sign-up` for where the person came from. Returns the remembered intent, if any. */
  close: () => AppView | null;
}

export function useSignInRoute(): SignInRoute {
  const [flow] = useState(() => createSignInFlow(windowHashLocation));
  const [leg, setLeg] = useState<AuthLeg>(() => flow.leg());
  useEffect(() => {
    const onHashChange = () => { flow.sync(); setLeg(flow.leg()); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [flow]);
  const refresh = () => setLeg(flow.leg());
  return {
    active: leg === 'sign-in',
    signingUp: leg === 'sign-up',
    open: (intent = null) => { flow.open(intent); refresh(); },
    toSignUp: () => { flow.toSignUp(); refresh(); },
    toSignIn: () => { flow.toSignIn(); refresh(); },
    close: () => { const intent = flow.close(); refresh(); return intent; },
  };
}
