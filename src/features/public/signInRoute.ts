import { useEffect, useState } from 'react';
import type { AppView } from '../../types';

/**
 * Public Experience Convergence Phase 2 -- the public Sign in route, `#/sign-in`.
 *
 * It is handled inside `AgentExperience` (not as a separate RuntimeApp route), so a signed-out visitor's
 * in-memory conversation, sources and Home state stay mounted while they sign in. Where they came from is
 * held in memory only -- never in the URL -- and restored afterwards.
 */
export const SIGN_IN_HASH = '#/sign-in';
const SIGN_IN_PATTERN = /^#\/?sign-in\/?$/;

export const isSignInHash = (hash: string) => SIGN_IN_PATTERN.test(hash);

export interface SignInRoute {
  active: boolean;
  /** Opens `#/sign-in`, remembering the current location and, optionally, the view to open afterwards. */
  open: (intent?: AppView | null) => void;
  /** Leaves `#/sign-in` for where the person came from. Returns the remembered intent, if any. */
  close: () => AppView | null;
}

export function useSignInRoute(): SignInRoute {
  const read = () => typeof window !== 'undefined' && isSignInHash(window.location.hash);
  const [active, setActive] = useState(read);
  const [origin, setOrigin] = useState<{ hash: string; intent: AppView | null } | null>(null);
  useEffect(() => {
    const onHashChange = () => setActive(read());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return {
    active,
    open: (intent = null) => {
      const current = window.location.hash;
      setOrigin({ hash: isSignInHash(current) ? '' : current, intent });
      setActive(true);
      if (!isSignInHash(current)) window.location.hash = SIGN_IN_HASH;
    },
    close: () => {
      const intent = origin?.intent ?? null;
      const back = origin?.hash ?? '';
      setOrigin(null);
      setActive(false);
      if (isSignInHash(window.location.hash)) window.location.hash = back;
      return intent;
    },
  };
}
