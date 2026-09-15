import { ApiError, type RemoteState } from '../../api/securepay/http';
import { circleProfileView, type CircleProfileView } from '../../api/securepay/circle/adapters';
import type { CircleGateway } from '../../api/securepay/circle';

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

export interface CircleState {
  profile: RemoteState<CircleProfileView>;
}
const initial: CircleState = { profile: { status: 'idle' } };

/**
 * Owns only the real self-scoped `GET /api/v1/circle/me` read (task section 4). This deliberately has no
 * named-Circle group/membership/feed/economic-timeline state — that authority does not exist on the
 * backend (docs/PRODUCTION_MIGRATION_LEDGER.md section 17); CircleExperience.tsx renders that gap as a
 * truthful notice rather than this controller fabricating it.
 */
export function createCircleController(gateway: Pick<CircleGateway, 'me'>) {
  let state: CircleState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<CircleState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  return {
    getSnapshot: (): CircleState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async load() {
      update({ profile: { status: 'loading' } });
      try {
        const dto = await gateway.me();
        update({ profile: { status: 'ready', data: circleProfileView(dto) } });
      } catch (error) {
        update({ profile: { status: 'error', error: asApiError(error) } });
      }
    },

    reset() { update({ ...initial }); },
  };
}
export type CircleController = ReturnType<typeof createCircleController>;
