import { segment, type HttpClient } from '../http';
import type { CommunityObjectResponse } from './dto';

/**
 * Phase 6 (Community Life) Slice 1 -- real Community object create/feed/mine/get/close, against
 * `CommunityObjectController` (`/api/v1/community`). The feed and a single object's detail are
 * readable signed-out (`auth: 'optional'`) since browsing Community never itself requires an
 * account; creating, listing one's own objects, and closing an object require the real signed-in
 * identity.
 */
export function createCommunityGateway(http: HttpClient) {
  const obj = (id: string) => `/api/v1/community/objects/${segment(id)}`;
  return {
    create: (objectType: string, title: string, body: string, locationLabel: string | null, idempotencyKey: string) =>
      http.request<CommunityObjectResponse>('/api/v1/community/objects', {
        method: 'POST',
        body: { objectType, title, body, locationLabel },
        auth: 'required',
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    feed: (limit = 50, offset = 0) =>
      http.request<CommunityObjectResponse[]>(`/api/v1/community/objects?limit=${limit}&offset=${offset}`, { auth: 'optional' }),
    mine: (limit = 50, offset = 0) =>
      http.request<CommunityObjectResponse[]>(`/api/v1/community/objects/mine?limit=${limit}&offset=${offset}`, { auth: 'required' }),
    get: (id: string) => http.request<CommunityObjectResponse>(obj(id), { auth: 'optional' }),
    close: (id: string) => http.request<CommunityObjectResponse>(`${obj(id)}/close`, { method: 'POST', auth: 'required' }),
  };
}
export type CommunityGateway = ReturnType<typeof createCommunityGateway>;
