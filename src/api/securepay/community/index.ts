import { segment, type HttpClient } from '../http';
import type { BusinessMembershipResponse, CurrentPrinciplesResponse, OrganizationMembershipResponse,
  ApprenticeshipProjectDto, CircleMemberView, CircleMembershipResponse, CirclePendingInvitationView, CirclePendingRequestView, CircleResponse, CircleStewardView,
  CommunityEventDto, CommunityProjectDto, CommunityServiceOpportunityDto, CommunityMutedMemberDto, CommunityObjectReportDto, CommunityReportReason, CommunityReportStatus,
  CommunityTransitionIntentDto, CommunityVisionTransitionDto, CommunityKnowledgeCandidateDto,
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
    // Phase 6 Slice 5 (Discovery & Identity) -- Community LIVE search: factual matching only, never
    // recommendation (an exact title match sorts first, then recency -- see the backend's own
    // doctrine). `types` narrows to specific object types; empty/omitted searches every type.
    search: (q: string, types: string[] = [], limit = 50, offset = 0) => {
      const query = new URLSearchParams();
      if (q) query.set('q', q);
      types.forEach(type => query.append('types', type));
      query.set('limit', String(limit));
      query.set('offset', String(offset));
      return http.request<CommunityObjectResponse[]>(`/api/v1/community/objects/search?${query.toString()}`, { auth: 'required' });
    },
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
      // Public Experience Convergence Phase 4 -- invitation acceptance names the exact Principles version too.
      accept: (principlesVersion: string) => http.request<MembershipResponse>('/api/v1/community/membership/accept', {
        method: 'POST', body: { principlesVersion }, auth: 'required',
      }),
      /**
       * Phase 4 (ADR-0021) -- the explicit Join under the exact current 12 Principles. Membership only; idempotent
       * by state and by `Idempotency-Key`.
       */
      join: (principlesVersion: string, idempotencyKey: string) => http.request<MembershipResponse>('/api/v1/community/membership/join', {
        method: 'POST', body: { principlesVersion }, auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
      }),
      decline: () => http.request<MembershipResponse>('/api/v1/community/membership/decline', { method: 'POST', auth: 'required' }),
      /**
       * Phase 4C (ADR-0023) -- a represented Business's own membership. The KS Number only names the Business;
       * SecurePay proves the caller acts for it. Missing and not-yours are one 404.
       */
      business: (businessKsNumber: string) => http.request<BusinessMembershipResponse>(
        `/api/v1/community/membership/business/${segment(businessKsNumber)}`, { auth: 'required' }),
      /**
       * Phase 4C -- the explicit Join FOR a represented Business under the exact current 12 Principles. SecurePay
       * re-checks, every time, that the caller acts for this Business and may make its membership decision.
       */
      joinBusiness: (businessKsNumber: string, principlesVersion: string, idempotencyKey: string) =>
        http.request<BusinessMembershipResponse>(`/api/v1/community/membership/business/${segment(businessKsNumber)}/join`, {
          method: 'POST', body: { principlesVersion }, auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
        }),
      /**
       * Phase 4D (ADR-0024) -- a represented Organization KS's own membership. The KS Number only names the
       * Organization; SecurePay proves the caller acts for it. Missing, a person, a Business and not-yours are one 404.
       */
      organization: (organizationKsNumber: string) => http.request<OrganizationMembershipResponse>(
        `/api/v1/community/membership/organization/${segment(organizationKsNumber)}`, { auth: 'required' }),
      /**
       * Phase 4D -- the explicit Join FOR a represented Organization KS under the exact current 12 Principles. SecurePay
       * re-checks, every time, that the caller acts for this Organization and may make its membership decision.
       */
      joinOrganization: (organizationKsNumber: string, principlesVersion: string, idempotencyKey: string) =>
        http.request<OrganizationMembershipResponse>(`/api/v1/community/membership/organization/${segment(organizationKsNumber)}/join`, {
          method: 'POST', body: { principlesVersion }, auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
        }),
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
    /** Phase 4 -- the versioned canonical Principles (public). */
    currentPrinciples: () => http.request<CurrentPrinciplesResponse>('/api/v1/community/principles/current', { auth: 'none' }),

    events: {
      create: (body: { circleId?: string | null; title: string; description: string; startsAt: string; endsAt?: string | null; locationLabel?: string | null; capacity?: number | null }) =>
        http.request<CommunityEventDto>('/api/v1/community/events', { method: 'POST', body, auth: 'required' }),
      list: (limit = 20, offset = 0) =>
        http.request<CommunityEventDto[]>(`/api/v1/community/events?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      rsvp: (eventId: string, going: boolean) =>
        http.request<CommunityEventDto>(`/api/v1/community/events/${segment(eventId)}/rsvp`, { method: 'POST', body: { going }, auth: 'required' }),
    },
    serviceOpportunities: {
      create: (body: { circleId?: string | null; title: string; description: string; locationLabel?: string | null; startsAt?: string | null; endsAt?: string | null; skillsNeeded?: string[] }) =>
        http.request<CommunityServiceOpportunityDto>('/api/v1/community/service-opportunities', { method: 'POST', body, auth: 'required' }),
      list: (limit = 20, offset = 0) =>
        http.request<CommunityServiceOpportunityDto[]>(`/api/v1/community/service-opportunities?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      volunteer: (id: string, interested: boolean) =>
        http.request<CommunityServiceOpportunityDto>(`/api/v1/community/service-opportunities/${segment(id)}/volunteer`, { method: 'POST', body: { interested }, auth: 'required' }),
    },
    projects: {
      create: (body: { circleId?: string | null; sourceServiceOpportunityId?: string | null; title: string; purpose: string; locationLabel?: string | null }) =>
        http.request<CommunityProjectDto>('/api/v1/community/projects', { method: 'POST', body, auth: 'required' }),
      list: (limit = 20, offset = 0) =>
        http.request<CommunityProjectDto[]>(`/api/v1/community/projects?limit=${limit}&offset=${offset}`, { auth: 'required' }),
    },
    apprenticeships: {
      create: (body: { communityProjectId?: string | null; circleId?: string | null; apprenticeKsNumber: string; title: string; learningGoal: string; sponsorshipReference?: string | null }) =>
        http.request<ApprenticeshipProjectDto>('/api/v1/community/apprenticeship-projects', { method: 'POST', body, auth: 'required' }),
      list: (limit = 20, offset = 0) =>
        http.request<ApprenticeshipProjectDto[]>(`/api/v1/community/apprenticeship-projects?limit=${limit}&offset=${offset}`, { auth: 'required' }),
    },
    transitions: {
      objectToVision: (objectId: string) =>
        http.request<CommunityVisionTransitionDto>(
          `/api/v1/community/transitions/objects/${segment(objectId)}/vision`,
          { method: 'POST', auth: 'required' },
        ),
      projectToVision: (projectId: string) =>
        http.request<CommunityVisionTransitionDto>(
          `/api/v1/community/transitions/projects/${segment(projectId)}/vision`,
          { method: 'POST', auth: 'required' },
        ),
      prepareObject: (objectId: string, targetDomain: CommunityTransitionIntentDto['targetDomain']) =>
        http.request<CommunityTransitionIntentDto>(
          `/api/v1/community/transitions/objects/${segment(objectId)}/prepare`,
          { method: 'POST', body: { targetDomain }, auth: 'required' },
        ),
      prepareProject: (projectId: string, targetDomain: CommunityTransitionIntentDto['targetDomain']) =>
        http.request<CommunityTransitionIntentDto>(
          `/api/v1/community/transitions/projects/${segment(projectId)}/prepare`,
          { method: 'POST', body: { targetDomain }, auth: 'required' },
        ),
    },
    knowledge: {
      mine: () => http.request<CommunityKnowledgeCandidateDto[]>('/api/v1/community/knowledge-candidates/mine', { auth: 'required' }),
      capture: (body: {
        circleId?: string | null;
        sourceType: CommunityKnowledgeCandidateDto['sourceType'];
        sourceReference: string;
        title: string;
        lessonText: string;
      }) => http.request<CommunityKnowledgeCandidateDto>('/api/v1/community/knowledge-candidates', { method: 'POST', body, auth: 'required' }),
      submit: (candidateId: string) =>
        http.request<CommunityKnowledgeCandidateDto>(
          `/api/v1/community/knowledge-candidates/${segment(candidateId)}/submit`,
          { method: 'POST', auth: 'required' },
        ),
    },

        moderation: {
      mutes: () => http.request<CommunityMutedMemberDto[]>('/api/v1/community/moderation/mutes', { auth: 'required' }),
      mute: (canonicalKsNumber: string) =>
        http.request<CommunityMutedMemberDto>(`/api/v1/community/moderation/mutes/${segment(canonicalKsNumber)}`, { method: 'POST', auth: 'required' }),
      unmute: (canonicalKsNumber: string) =>
        http.request<void>(`/api/v1/community/moderation/mutes/${segment(canonicalKsNumber)}`, { method: 'DELETE', auth: 'required' }),
      report: (objectId: string, reason: CommunityReportReason, details?: string | null) =>
        http.request<CommunityObjectReportDto>(`/api/v1/community/moderation/objects/${segment(objectId)}/reports`, {
          method: 'POST', body: { reason, details: details ?? null }, auth: 'required',
        }),
      circleReports: (circleId: string) =>
        http.request<CommunityObjectReportDto[]>(`/api/v1/community/moderation/circles/${segment(circleId)}/reports`, { auth: 'required' }),
      reviewCircleReport: (circleId: string, reportId: string, status: Exclude<CommunityReportStatus,'OPEN'>, resolutionNote?: string | null) =>
        http.request<CommunityObjectReportDto>(
          `/api/v1/community/moderation/circles/${segment(circleId)}/reports/${segment(reportId)}/review`,
          { method: 'POST', body: { status, resolutionNote: resolutionNote ?? null }, auth: 'required' },
        ),
    },

    // Named Circles (Slice 3) -- "the homes inside The Trust Project", against
    // `CommunityCircleController` (`/api/v1/community/circles`). Every method requires the real
    // signed-in identity; the backend independently enforces ACTIVE Trust Project membership (and,
    // for content/membership actions, ACTIVE Circle membership) on top of authentication.
    circles: {
      create: (
        name: string, purpose: string, membershipMode: string, visibility: string, categoryLabel: string | null,
        locationLabel: string | null, idempotencyKey: string,
      ) =>
        http.request<CircleResponse>('/api/v1/community/circles', {
          method: 'POST',
          body: { name, purpose, membershipMode, visibility, categoryLabel, locationLabel },
          auth: 'required',
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      // Phase 6 Slice 5 (Discovery & Identity) -- `q` is optional and additive: omitted, this is the
      // exact original unfiltered discovery listing; supplied, it narrows to matching PUBLIC Circles
      // (never a PRIVATE one, regardless of name match -- see the backend's own doctrine).
      discover: (limit = 50, offset = 0, q?: string) => {
        const query = new URLSearchParams();
        if (q) query.set('q', q);
        query.set('limit', String(limit));
        query.set('offset', String(offset));
        return http.request<CircleResponse[]>(`/api/v1/community/circles?${query.toString()}`, { auth: 'required' });
      },
      mine: (limit = 50, offset = 0) =>
        http.request<CircleResponse[]>(`/api/v1/community/circles/mine?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      // Final pre-merge correction pass -- the caller's own pending Circle invitations, self-scoped
      // (their own INVITED rows only). The one legitimate route to discover a PRIVATE Circle they
      // cannot otherwise find through general discovery; opening one routes into the existing
      // Circle detail experience rather than a second accept/decline engine.
      myInvitations: (limit = 50, offset = 0) =>
        http.request<CirclePendingInvitationView[]>(`/api/v1/community/circles/invitations?limit=${limit}&offset=${offset}`, { auth: 'required' }),
      get: (circleId: string) => http.request<CircleResponse>(circle(circleId), { auth: 'required' }),
      close: (circleId: string) => http.request<CircleResponse>(`${circle(circleId)}/close`, { method: 'POST', auth: 'required' }),
      setLifecycle: (circleId: string, status: 'ACTIVE' | 'QUIET' | 'ARCHIVED') =>
        http.request<{ circleId: string; status: 'ACTIVE' | 'QUIET' | 'ARCHIVED' }>(
          `${circle(circleId)}/lifecycle`,
          { method: 'POST', body: { status }, auth: 'required' },
        ),
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
      stewards: {
        list: (circleId: string) =>
          http.request<CircleStewardView[]>(`${circle(circleId)}/stewards`, { auth: 'required' }),
        appoint: (circleId: string, membershipId: string) =>
          http.request<CircleStewardView>(`${circle(circleId)}/stewards/${segment(membershipId)}`, { method: 'POST', auth: 'required' }),
        remove: (circleId: string, membershipId: string) =>
          http.request<CircleStewardView>(`${circle(circleId)}/stewards/${segment(membershipId)}`, { method: 'DELETE', auth: 'required' }),
      },

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
