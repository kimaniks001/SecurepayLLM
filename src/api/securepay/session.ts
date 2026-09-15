import type { AuthGateway, SessionTokensDto } from './auth';

export type SessionTokens = SessionTokensDto;
export type SessionState = { status: 'signed-out' } | { status: 'signed-in'; tokens: SessionTokens };

/**
 * The single session boundary. Tokens live only in memory for this tab; nothing is persisted,
 * logged, or decoded. The HTTP token provider reads through here and nowhere else.
 */
export function createSessionStore() {
  let state: SessionState = { status: 'signed-out' };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: (): SessionState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getAccessToken: (): string | null => (state.status === 'signed-in' ? state.tokens.accessToken : null),
    setTokens: (tokens: SessionTokens) => { state = { status: 'signed-in', tokens }; notify(); },
    clear: () => { state = { status: 'signed-out' }; notify(); },
    isAccessTokenExpired: (skewMs = 15000): boolean =>
      state.status === 'signed-in' && Date.parse(state.tokens.accessTokenExpiresAt) - skewMs <= Date.now(),
  };
}
export type SessionStore = ReturnType<typeof createSessionStore>;

/** Refreshes only when the current access token is actually expired, per the real refresh contract. */
export async function ensureFreshSession(session: SessionStore, auth: Pick<AuthGateway, 'refresh'>): Promise<void> {
  const state = session.getSnapshot();
  if (state.status !== 'signed-in' || !session.isAccessTokenExpired()) return;
  try {
    session.setTokens(await auth.refresh(state.tokens.refreshToken));
  } catch (error) {
    session.clear();
    throw error;
  }
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
      await ensureFreshSession(session, auth);
      return original(...args);
    };
  }
  return wrapped;
}
