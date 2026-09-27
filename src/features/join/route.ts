import { useEffect, useState } from 'react';
import { parseJoinInterest, type JoinInterest } from './share';

/**
 * Public Experience Convergence Phase 4 -- the public `#/join` and `#/sign-up` routes. Like `#/sign-in`, they
 * are handled inside `AgentExperience`, so an in-progress conversation stays mounted while someone joins.
 * The only thing ever read from the URL is the presentation-only `interest`; nothing that identifies or authorises anyone.
 */
const JOIN_PATTERN = /^#\/?join\/?(?:\?(.*))?$/;
const SIGN_UP_PATTERN = /^#\/?sign-up\/?$/;
export const JOIN_HASH = '#/join';
export const SIGN_UP_HASH = '#/sign-up';

export function parseJoinRoute(hash: string): { interest: JoinInterest | null } | null {
  const match = JOIN_PATTERN.exec(hash);
  if (!match) return null;
  const params = new URLSearchParams(match[1] ?? '');
  return { interest: parseJoinInterest(params.get('interest')) };
}

export const isSignUpHash = (hash: string) => SIGN_UP_PATTERN.test(hash);

function useHash(): string {
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash));
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash;
}

export interface HashRoute<T> {
  value: T;
  open: () => void;
  close: () => void;
}

export function useJoinRoute(): HashRoute<{ interest: JoinInterest | null } | null> {
  const value = parseJoinRoute(useHash());
  return {
    value,
    open: () => { if (!parseJoinRoute(window.location.hash)) window.location.hash = JOIN_HASH; },
    close: () => { if (parseJoinRoute(window.location.hash)) window.location.hash = ''; },
  };
}

export function useSignUpRoute(): HashRoute<boolean> {
  const value = isSignUpHash(useHash());
  return {
    value,
    open: () => { if (!isSignUpHash(window.location.hash)) window.location.hash = SIGN_UP_HASH; },
    close: () => { if (isSignUpHash(window.location.hash)) window.location.hash = ''; },
  };
}
