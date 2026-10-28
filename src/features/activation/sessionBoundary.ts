import type { SessionState, SessionStore } from '../../api/securepay/session';

/**
 * Exact in-memory session snapshot, NOT merely its signed-in status.
 * A same-tab KS account swap or refresh invalidates a previous owner's
 * outstanding activation/funding reads and actions.
 */
export function isCurrentActivationSession(
  session: Pick<SessionStore, 'getSnapshot'>,
  identity: SessionState,
): boolean {
  return identity.status === 'signed-in' && session.getSnapshot() === identity;
}
