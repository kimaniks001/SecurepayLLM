import { segment, type HttpClient } from '../http';
import type { CommunityObjectResponse } from './dto';

/**
 * Phase 6 (Community Life) Slice 1 -- real Community object create/feed/mine/get/close, against
 * `CommunityObjectController` (`/api/v1/community`).
 *
 * <p>Slice 1 correction (The Trust Project doctrine): every method here, including the feed and a
 * single object's detail, now requires the real signed-in identity (`auth: 'required'`). Community's
 * product doctrine is "a community of invitation where people choose to trade fairly" -- Store's own
 * public-by-design visibility is not automatic precedent for Community, so this pass does not keep
 * reads public. This is the smallest fail-closed interim, not an invitation/membership model; read
 * visibility will converge on Trust Project invitation/membership authority in a later slice.
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
      http.request<CommunityObjectResponse[]>(`/api/v1/community/objects?limit=${limit}&offset=${offset}`, { auth: 'required' }),
    mine: (limit = 50, offset = 0) =>
      http.request<CommunityObjectResponse[]>(`/api/v1/community/objects/mine?limit=${limit}&offset=${offset}`, { auth: 'required' }),
    get: (id: string) => http.request<CommunityObjectResponse>(obj(id), { auth: 'required' }),
    close: (id: string) => http.request<CommunityObjectResponse>(`${obj(id)}/close`, { method: 'POST', auth: 'required' }),
  };
}
export type CommunityGateway = ReturnType<typeof createCommunityGateway>;
