import { segment, type HttpClient } from '../http';
import type {
  CircleMemberView, CircleMembershipResponse, CirclePendingRequestView, CircleResponse,
  CommunityHelpResponseView, CommunityObjectResponse, CommunityReplyResponse,
  FairTradePrincipleResponse, MembershipResponse,
} from './dto';

/**
 * Phase 6 (Community Life) Slice 1/2 -- real Community object create/feed/mine/get/close, against
 * `CommunityObjectController` (`/api/v1/community`), plus Slice 2's Trust Project membership
 * (`TrustProjectMembershipController`), Conversation & Help (`CommunityConversationController`),
 * and the read-only canonical Fair Trade principles (`CommunityPrinciplesController`).
 *
 * <p>Every Community object/reply/help method requires the real signed-in identity
 * (`auth: 'required'`) -- Community's product doctrine is "a community of invitation where people
 * choose to trade fairly" (The Trust Project). The backend independently enforces ACTIVE membership
 * on top of authentication for every one of these except `membership.me`/`principles` themselves
 * (which must be reachable by an authenticated non-member or an invitee who is not yet ACTIVE, so
 * they can see their own status and the principles before deciding to accept).
 */
export function createCommunityGateway(http: HttpClient) {
  const obj = (id: string) => `/api/v1/community/objects/${segment(id)}`;
  const circle = (id: string) => `/api/v1/community/circles/${segment(id)}`;
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

    // The Trust Project membership (Slice 2)
    membership: {
      me: () => http.request<MembershipResponse>('/api/v1/community/membership/me', { auth: 'required' }),
      invite: (inviteeCanonicalKsNumber: string, idempotencyKey: string) =>
        http.request<MembershipResponse>('/api/v1/community/membership/invite', {
          method: 'POST',
          body: { inviteeCanonicalKsNumber },
          auth: 'required',
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      accept: () => http.request<MembershipResponse>('/api/v1/community/membership/accept', { method: 'POST', auth: 'required' }),
      decline: () => http.request<MembershipResponse>('/api/v1/community/membership/decline', { method: 'POST', auth: 'required' }),
    },

    // Conversation & Help (Slice 2)
    replies: {
      create: (objectId: string, body: string, idempotencyKey: string) =>
        http.request<CommunityReplyResponse>(`${obj(objectId)}/replies`, {
          method: 'POST', body: { body }, auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
        }),
      list: (objectId: string, limit = 50, offset = 0) =>
        http.request<CommunityReplyResponse[]>(`${obj(objectId)}/replies?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      withdraw: (objectId: string, replyId: string) =>
        http.request<CommunityReplyResponse>(`${obj(objectId)}/replies/${segment(replyId)}/withdraw`, { method: 'POST', auth: 'required' }),
    },
    help: {
      offer: (objectId: string, idempotencyKey: string) =>
        http.request<CommunityHelpResponseView>(`${obj(objectId)}/help`, {
          method: 'POST', auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
        }),
      list: (objectId: string, limit = 50, offset = 0) =>
        http.request<CommunityHelpResponseView[]>(`${obj(objectId)}/help?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      withdraw: (objectId: string, helpResponseId: string) =>
        http.request<CommunityHelpResponseView>(`${obj(objectId)}/help/${segment(helpResponseId)}/withdraw`, { method: 'POST', auth: 'required' }),
    },

    // Our 12 Principles (Slice 2) -- read-only, unauthenticated: an invitee must be able to see
    // these before deciding whether to accept, and they are not private Community content.
    principles: () => http.request<FairTradePrincipleResponse[]>('/api/v1/community/principles', { auth: 'none' }),

    // Named Circles (Slice 3) -- "the homes inside The Trust Project", against
    // `CommunityCircleController` (`/api/v1/community/circles`). Every method requires the real
    // signed-in identity; the backend independently enforces ACTIVE Trust Project membership (and,
    // for content/membership actions, ACTIVE Circle membership) on top of authentication.
    circles: {
      create: (
        name: string, purpose: string, membershipMode: string, categoryLabel: string | null,
        locationLabel: string | null, idempotencyKey: string,
      ) =>
        http.request<CircleResponse>('/api/v1/community/circles', {
          method: 'POST',
          body: { name, purpose, membershipMode, categoryLabel, locationLabel },
          auth: 'required',
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      discover: (limit = 50, offset = 0) =>
        http.request<CircleResponse[]>(`/api/v1/community/circles?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      mine: (limit = 50, offset = 0) =>
        http.request<CircleResponse[]>(`/api/v1/community/circles/mine?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      get: (circleId: string) => http.request<CircleResponse>(circle(circleId), { auth: 'required' }),
      close: (circleId: string) => http.request<CircleResponse>(`${circle(circleId)}/close`, { method: 'POST', auth: 'required' }),
      membership: (circleId: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/membership`, { auth: 'required' }),

      join: (circleId: string, idempotencyKey: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/join`, {
          method: 'POST', auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
        }),
      request: (circleId: string, idempotencyKey: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/requests`, {
          method: 'POST', auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
        }),
      pendingRequests: (circleId: string, limit = 50, offset = 0) =>
        http.request<CirclePendingRequestView[]>(`${circle(circleId)}/requests?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      approveRequest: (circleId: string, membershipId: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/requests/${segment(membershipId)}/approve`, { method: 'POST', auth: 'required' }),
      declineRequest: (circleId: string, membershipId: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/requests/${segment(membershipId)}/decline`, { method: 'POST', auth: 'required' }),

      invite: (circleId: string, inviteeCanonicalKsNumber: string, idempotencyKey: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/invitations`, {
          method: 'POST',
          body: { inviteeCanonicalKsNumber },
          auth: 'required',
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      acceptInvitation: (circleId: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/invitations/accept`, { method: 'POST', auth: 'required' }),
      declineInvitation: (circleId: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/invitations/decline`, { method: 'POST', auth: 'required' }),

      leave: (circleId: string) => http.request<CircleMembershipResponse>(`${circle(circleId)}/leave`, { method: 'POST', auth: 'required' }),
      removeMember: (circleId: string, membershipId: string) =>
        http.request<CircleMembershipResponse>(`${circle(circleId)}/members/${segment(membershipId)}/remove`, { method: 'POST', auth: 'required' }),
      members: (circleId: string, limit = 50, offset = 0) =>
        http.request<CircleMemberView[]>(`${circle(circleId)}/members?limit=${limit}&offset=${offset}`, { auth: 'required' }),

      // Circle-scoped Community content -- reuses the same CommunityObjectResponse shape as
      // Community LIVE (`circleId` on the response tells them apart).
      objects: {
        create: (circleId: string, objectType: string, title: string, body: string, locationLabel: string | null, idempotencyKey: string) =>
          http.request<CommunityObjectResponse>(`${circle(circleId)}/objects`, {
            method: 'POST',
            body: { objectType, title, body, locationLabel },
            auth: 'required',
            headers: { 'Idempotency-Key': idempotencyKey },
          }),
        list: (circleId: string, limit = 50, offset = 0) =>
          http.request<CommunityObjectResponse[]>(`${circle(circleId)}/objects?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      },
    },
  };
}
export type CommunityGateway = ReturnType<typeof createCommunityGateway>;
