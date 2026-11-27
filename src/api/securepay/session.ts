import type { AuthGateway, SessionTokensDto } from './auth';
import { miniEnsureFreshSession } from './sessionRefresh.mjs';

export type SessionTokens = SessionTokensDto;
export type SessionState = { status: 'signed-out' } | { status: 'signed-in'; tokens: SessionTokens };

/**
 * The single session boundary. Tokens live only in memory for this tab; nothing is persisted,
 * logged, or decoded. The HTTP token provider reads through here and nowhere else.
 */
export function createSessionStore() {
  let state: SessionState = { status: 'signed-out' };
  // Explicit sign-in / account replacement differs from rotating a token
  // within the SAME login. Never let late refresh A overwrite new account B.
  let accountGeneration = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: (): SessionState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getAccessToken: (): string | null => (state.status === 'signed-in' ? state.tokens.accessToken : null),
    getAccountGeneration: (): number => accountGeneration,
    // Only sign-in / verified signup calls setTokens. Refresh is separate.
    setTokens: (tokens: SessionTokens) => { accountGeneration++; state = { status: 'signed-in', tokens }; notify(); },
    setRefreshedTokens: (tokens: SessionTokens) => {
      if (state.status !== 'signed-in') return;
      state = { status: 'signed-in', tokens }; notify();
    },
    clear: () => { accountGeneration++; state = { status: 'signed-out' }; notify(); },
    isAccessTokenExpired: (skewMs = 15000): boolean =>
      state.status === 'signed-in' && Date.parse(state.tokens.accessTokenExpiresAt) - skewMs <= Date.now(),
  };
}
export type SessionStore = ReturnType<typeof createSessionStore>;

/**
 * Actual refresh implementation is in a small independently runnable module
 * so token-rotation and cross-account races are covered by executable Node
 * tests, not only source text assertions.
 */
export function ensureFreshSession(session: SessionStore, auth: Pick<AuthGateway, 'refresh'>): Promise<void> {
  return miniEnsureFreshSession(session, auth);
}

/**
 * Ensures a live access token before each named authenticated call on `gateway`. Reads/writes go
 * through the same one session boundary; the caller lists exactly which methods are authenticated.
 */
export function withSessionRefresh<T extends object>(gateway: T, methods: readonly (keyof T)[], session: SessionStore, auth: Pick<AuthGateway, 'refresh'>): T {
  const wrapped = { ...gateway };
  for (const method of methods) {
    const original = gateway[method] as unknown as (...args: unknown[]) => Promise<unknown>;
    (wrapped[method] as unknown as (...args: unknown[]) => Promise<unknown>) = async (...args: unknown[]) => {
      const ownerGeneration = session.getAccountGeneration();
      await ensureFreshSession(session, auth);
      // A stale action must not run under whichever other account signed in
      // while the preceding async refresh was still awaiting its response.
      if (session.getAccountGeneration() !== ownerGeneration)
        throw new Error('SecurePay account changed during authentication');
      return original(...args);
    };
  }
  return wrapped;
}
