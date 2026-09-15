import type { HttpClient } from '../http';
import type { CircleProfileResponse } from './dto';

/**
 * Verified against SecurePayAPI feat/securepay-phase10-community-circles @ b371a906. Self-scoped only —
 * `CircleController` exposes no arbitrary KSNumber lookup, so this gateway does not add one (task
 * section 4: "Do not add arbitrary KSNumber lookup if the controller does not expose one.").
 */
export function createCircleGateway(http: HttpClient) {
  return {
    me: () => http.request<CircleProfileResponse>('/api/v1/circle/me', { auth: 'required' }),
  };
}
export type CircleGateway = ReturnType<typeof createCircleGateway>;
