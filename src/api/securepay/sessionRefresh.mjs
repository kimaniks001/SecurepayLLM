/**
 * P2 account-safe access-token refresh.
 *
 * One refresh per expired access token. A late success or failure from an
 * earlier login cannot replace or revoke a newer KSNumber login. This module
 * never persists tokens, decodes JWTs or creates a browser SSO channel.
 */
const inFlight = new WeakMap();

export function miniEnsureFreshSession(session, auth) {
  const initial = session.getSnapshot();
  if (initial.status !== 'signed-in' || !session.isAccessTokenExpired()) {
    return Promise.resolve();
  }
  const running = inFlight.get(session);
  if (running && running.tokens === initial.tokens) return running.promise;

  const generation = session.getAccountGeneration();
  const stillSameLogin = () => {
    const now = session.getSnapshot();
    return now.status === 'signed-in' && now.tokens === initial.tokens &&
      session.getAccountGeneration() === generation;
  };
  const promise = (async () => {
    try {
      const refreshed = await auth.refresh(initial.tokens.refreshToken);
      if (stillSameLogin()) session.setRefreshedTokens(refreshed);
    } catch (error) {
      if (stillSameLogin()) session.clear();
      throw error;
    }
  })();

  inFlight.set(session, { tokens: initial.tokens, promise });
  // Observers handle both outcomes to avoid creating an unhandled rejection.
  void promise.then(
    () => { if (inFlight.get(session)?.promise === promise) inFlight.delete(session); },
    () => { if (inFlight.get(session)?.promise === promise) inFlight.delete(session); },
  );
  return promise;
}
