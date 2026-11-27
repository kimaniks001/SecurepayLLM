import type { AuthGateway } from './auth';
import type { SessionStore } from './session';
export function miniEnsureFreshSession(
  session: SessionStore,
  auth: Pick<AuthGateway,'refresh'>,
): Promise<void>;
