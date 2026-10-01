/**
 * Phase 6 (Community Life) Slice 1 -- real, backend-persisted Community objects. Matches
 * `CommunityObjectController.CommunityObjectResponse` exactly. Author identity fields are always
 * server-resolved -- never sent by the client.
 *
 * <p>Slice 3 addition: `circleId` is `null` for a Community LIVE object (every pre-existing Slice
 * 1/2 object) or a real Circle id when the object is scoped to exactly that Circle.
 *
 * <p>Correction (Slice 3 pre-merge completion pass): `canClose` is server-derived (`status ==
 * ACTIVE && authorIdentityId == authenticated requester`, the same pattern as `CommunityReplyResponse
 * .canWithdraw`), present on every create/feed/mine/get/close response for BOTH Community LIVE and
 * Circle-scoped objects -- never inferred client-side from a LIVE-only owned-id set.
 */
export interface CommunityObjectResponse {
  id: string;
  objectType: 'QUESTION' | 'NEED' | 'OPPORTUNITY' | 'WORK_STORY' | 'DISCUSSION';
  status: 'ACTIVE' | 'CLOSED' | 'REMOVED';
  title: string;
  body: string;
  locationLabel: string | null;
  authorCanonicalKsNumber: string | null;
  authorDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  circleId: string | null;
  canClose: boolean;
}

/**
 * Phase 6 (Community Life) Slice 2 -- The Trust Project membership. Matches
 * `TrustProjectMembershipController.MembershipResponse` exactly. `status` is `null` only when the
 * caller has no membership record at all (an authenticated non-member) -- never fabricated as any
 * other status.
 */
export interface MembershipResponse {
  /** Omitted (undefined) on the wire when absent -- the backend uses `non_null` inclusion. */
  status?: 'INVITED' | 'ACTIVE' | 'DECLINED' | 'REVOKED' | null;
  invitedByCanonicalKsNumber: string | null;
  invitedByDisplayName: string | null;
  invitedAt: string | null;
  respondedAt: string | null;
  /** Public Experience Convergence Phase 4 -- provenance only; never referral, reward, rank or capacity. */
  origin?: 'FOUNDING_BOOTSTRAP' | 'INVITATION' | 'DIRECT_JOIN' | 'DIRECT_JOIN_AFTER_DECLINE' | null;
  /** The exact 12 Principles version accepted on becoming ACTIVE (null for memberships that predate recording it). */
  principlesVersion?: string | null;
  joinedAt?: string | null;
  declinedAt?: string | null;
}

/**
 * Phase 4C (API ADR-0023) -- a Business's own Trust Project membership, as seen by a person who acts for it.
 * `membership` is the BUSINESS KS's record, never the person's. `canManage` says whether this person may make the
 * Business's Join decision now; it is decided by SecurePay, never inferred here.
 */
export interface BusinessMembershipResponse {
  businessKsNumber: string;
  businessDisplayName?: string | null;
  canManage: boolean;
  membership: MembershipResponse;
}

/**
 * Phase 4D (API ADR-0024) -- a represented Organization KS's OWN membership, plus whether this person may make its
 * decision now. Never a role, permission or RBAC id.
 */
export interface OrganizationMembershipResponse {
  organizationKsNumber: string;
  organizationDisplayName?: string | null;
  canManage: boolean;
  membership: MembershipResponse;
}

/** Phase 4 -- `GET /api/v1/community/principles/current`: the exact version a Join must accept. */
export interface CurrentPrinciplesResponse {
  version: string;
  label: string;
  principles: FairTradePrincipleResponse[];
}

/**
 * Matches `CommunityConversationController.ReplyResponse` exactly.
 *
 * <p>Correction (Slice 2 pre-merge): `canWithdraw` is server-derived (`authorIdentityId ==
 * authenticated requester identity`, computed backend-side), present on every list/create/withdraw
 * response -- never inferred client-side, so ownership survives a page refresh.
 */
export interface CommunityReplyResponse {
  id: string;
  objectId: string;
  authorCanonicalKsNumber: string | null;
  authorDisplayName: string | null;
  body: string;
  status: 'ACTIVE' | 'WITHDRAWN';
  createdAt: string;
  withdrawnAt: string | null;
  canWithdraw: boolean;
}

/**
 * Matches `CommunityConversationController.HelpResponseView` exactly -- a signal, never a message.
 *
 * <p>Correction (Slice 2 pre-merge): `canWithdraw` is server-derived the same way as
 * `CommunityReplyResponse.canWithdraw` -- see that field's own doctrine comment.
 */
export interface CommunityHelpResponseView {
  id: string;
  objectId: string;
  authorCanonicalKsNumber: string | null;
  authorDisplayName: string | null;
  status: 'ACTIVE' | 'WITHDRAWN';
  createdAt: string;
  withdrawnAt: string | null;
  canWithdraw: boolean;
}

/** Matches `CommunityPrinciplesController.PrincipleResponse` exactly -- read-only reference to the
 * one canonical Fair Trade principles source, never re-typed here. */
export interface FairTradePrincipleResponse {
  number: number;
  title: string;
  text: string;
}

/**
 * Phase 6 (Community Life) Slice 3 -- a named Circle: "a home inside The Trust Project." Matches
 * `CommunityCircleController.CircleResponse` exactly. Discovery-safe fields only -- a Circle's own
 * content (posts/replies/help) is a completely separate, membership-gated read (see
 * `circles.objects`). `memberCount` is a plain count, never a ranking/engagement signal.
 *
 * <p>Correction (Slice 3 pre-merge completion pass): `visibility` is a SEPARATE authority from
 * `membershipMode` -- `membershipMode` answers "how does someone become a member?"; `visibility`
 * answers "who can discover this Circle exists?". A PRIVATE Circle never appears in general
 * discovery regardless of its membership mode.
 */
export interface CircleResponse {
  id: string;
  name: string;
  purpose: string;
  membershipMode: 'OPEN' | 'REQUEST_TO_JOIN' | 'INVITE_ONLY';
  visibility: 'PUBLIC' | 'PRIVATE';
  categoryLabel: string | null;
  locationLabel: string | null;
  status: 'ACTIVE' | 'QUIET' | 'ARCHIVED' | 'CLOSED';
  creatorCanonicalKsNumber: string | null;
  creatorDisplayName: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

/**
 * Matches `CommunityCircleController.CircleMembershipResponse` exactly -- the caller's own
 * relationship to one Circle. `status` is `null` only when they have no membership record at all
 * (and are not the owner, whose own membership is implicitly ACTIVE from creation).
 */
export interface CircleMembershipResponse {
  status: 'INVITED' | 'REQUESTED' | 'ACTIVE' | 'DECLINED' | 'LEFT' | 'REMOVED' | null;
  isOwner: boolean;
  isSteward: boolean;
  invitedByDisplayName: string | null;
  createdAt: string | null;
  respondedAt: string | null;
}

/** Matches `CommunityCircleController.PendingRequestView` exactly -- an owner's own pending
 * REQUEST_TO_JOIN review queue. `membershipId` is the opaque reference used to approve/decline. */
export interface CirclePendingRequestView {
  membershipId: string;
  requesterCanonicalKsNumber: string | null;
  requesterDisplayName: string | null;
  requestedAt: string;
}

/**
 * Matches `CommunityCircleController.MemberView` exactly -- community-safe identity fields only,
 * for an ACTIVE Circle member's own view of who else is in the Circle. `membershipId` is the opaque
 * reference an owner's Remove action targets -- never identity-revealing beyond the fields above.
 *
 * <p>Correction (final pre-merge correction pass): `isSelf` is server-derived (never inferred
 * locally) so the UI can hide the owner's own Remove button -- the backend already rejects
 * self-removal (`CannotRemoveOwnerException`); this field only lets the client avoid offering an
 * action that will always fail.
 */
export interface CircleMemberView {
  membershipId: string;
  canonicalKsNumber: string | null;
  displayName: string | null;
  isSelf: boolean;
}

/**
 * Correction (final pre-merge correction pass) -- matches
 * `CommunityCircleController.PendingInvitationView` exactly. One of the caller's own pending Circle
 * invitations: the one legitimate route to discover a PRIVATE Circle they cannot otherwise find
 * through general discovery. Opening one routes into the existing Circle detail experience -- this
 * is never a second accept/decline engine, just enough to identify and open the invitation.
 */
export interface CirclePendingInvitationView {
  circleId: string;
  circleName: string;
  circlePurpose: string;
  circleVisibility: 'PUBLIC' | 'PRIVATE';
  circleMembershipMode: 'OPEN' | 'REQUEST_TO_JOIN' | 'INVITE_ONLY';
  invitedByDisplayName: string | null;
  invitedAt: string;
}


export interface CircleStewardView {
  membershipId: string;
  canonicalKsNumber: string;
  displayName: string | null;
  founder: boolean;
  active: boolean;
}


export interface CommunityEventDto {
  id: string;
  circleId: string | null;
  organizerIdentityId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string | null;
  capacity: number | null;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  goingCount: number;
}

export interface CommunityServiceOpportunityDto {
  id: string;
  circleId: string | null;
  creatorIdentityId: string;
  title: string;
  description: string;
  locationLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  skillsNeeded: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  interestedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityProjectDto {
  id: string;
  circleId: string | null;
  sourceServiceOpportunityId: string | null;
  creatorIdentityId: string;
  title: string;
  purpose: string;
  locationLabel: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  groupId: string | null;
  visionItemId: string | null;
  agreementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprenticeshipProjectDto {
  id: string;
  communityProjectId: string | null;
  circleId: string | null;
  masterIdentityId: string;
  apprenticeKsNumber: string;
  title: string;
  learningGoal: string;
  status: 'PROPOSED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  sponsorshipReference: string | null;
  createdAt: string;
  updatedAt: string;
}


export type CommunityReportReason = 'SAFETY' | 'HARASSMENT' | 'SPAM' | 'MISLEADING' | 'PRIVACY' | 'OTHER';
export type CommunityReportStatus = 'OPEN' | 'REVIEWED' | 'ESCALATED' | 'DISMISSED';

export interface CommunityMutedMemberDto {
  canonicalKsNumber: string;
  displayName: string | null;
  mutedAt: string;
}

export interface CommunityObjectReportDto {
  id: string;
  objectId: string;
  circleId: string | null;
  reporterKsNumber: string;
  reason: CommunityReportReason;
  details: string | null;
  status: CommunityReportStatus;
  reviewedByKsNumber: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface CommunityVisionTransitionDto {
  sourceId: string;
  sourceKind: 'COMMUNITY_OBJECT' | 'COMMUNITY_PROJECT';
  visionItemId: string;
  title: string;
}

export interface CommunityTransitionIntentDto {
  id: string;
  sourceKind: 'COMMUNITY_OBJECT' | 'COMMUNITY_PROJECT';
  sourceId: string;
  targetDomain: 'GROUP' | 'AGREEMENT' | 'STORE' | 'PLUG' | 'MASTER';
  createdByIdentityId: string;
  status: 'PREPARED' | 'CONSUMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}


export interface CommunityKnowledgeCandidateDto {
  id: string;
  circleId: string | null;
  sourceType: 'MEMBER_DISCUSSION' | 'CIRCLE_LEARNING' | 'MASTER_GUIDANCE' | 'PROJECT_LESSON' | 'APPRENTICESHIP_LESSON';
  sourceReference: string;
  title: string;
  lessonText: string;
  status: 'CAPTURED' | 'SUBMITTED_FOR_REVIEW' | 'LINKED_TO_KNOWLEDGE_RECORD' | 'REJECTED';
  knowledgeRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}
