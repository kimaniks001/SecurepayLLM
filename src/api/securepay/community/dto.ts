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
  status: 'INVITED' | 'ACTIVE' | 'DECLINED' | 'REVOKED' | null;
  invitedByCanonicalKsNumber: string | null;
  invitedByDisplayName: string | null;
  invitedAt: string | null;
  respondedAt: string | null;
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
  status: 'ACTIVE' | 'CLOSED';
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
 */
export interface CircleMemberView {
  membershipId: string;
  canonicalKsNumber: string | null;
  displayName: string | null;
}
