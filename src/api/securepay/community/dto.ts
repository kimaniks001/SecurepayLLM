/**
 * Phase 6 (Community Life) Slice 1 -- real, backend-persisted Community objects. Matches
 * `CommunityObjectController.CommunityObjectResponse` exactly. Author identity fields are always
 * server-resolved -- never sent by the client.
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
