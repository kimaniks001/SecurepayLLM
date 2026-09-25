import type { StoreSearchResult } from '../../api/securepay/store/adapters';
import type { CommunityHelpResponseView, CommunityObjectResponse, CommunityReplyResponse } from '../../api/securepay/community/dto';
import type { CommunityObject, CommunityObjectType, CommunityResponse } from '../../types';

const REAL_OBJECT_TYPE: Record<CommunityObjectResponse['objectType'], CommunityObjectType> = {
  QUESTION: 'question',
  NEED: 'need',
  OPPORTUNITY: 'opportunity',
  WORK_STORY: 'work_story',
  DISCUSSION: 'discussion',
};

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

/**
 * Phase 6 (Community Life) Slice 1 -- a real, backend-persisted Community object. No fabricated
 * `responses` (replies/"I can help" are Slice 2), no invented capabilities/budget/timing fields the
 * backend does not yet carry. `provenance` states plainly that this is a real Community post, never
 * a reputation/rating claim (Section 4/20's own "never reputation scoring" doctrine).
 *
 * <p>Slice 1 correction (The Trust Project doctrine): `visibility` is `'community'`, never `'public'`
 * -- the backend now fails closed behind authentication for every real Community read (see
 * `createCommunityGateway`'s own doctrine comment), pending Trust Project invitation/membership
 * authority in a later slice. `'public'` remains reserved for genuinely internet-public content (a
 * Store offer reference, below) -- this UI model never claims a real Community post is that.
 */
export function realObjectToCommunityObject(dto: CommunityObjectResponse, responses: CommunityResponse[] = []): CommunityObject {
  return {
    id: dto.id,
    objectType: REAL_OBJECT_TYPE[dto.objectType],
    author: dto.authorDisplayName ?? dto.authorCanonicalKsNumber ?? 'A SecurePay member',
    authorCapacity: 'personal',
    createdAt: relativeTime(dto.createdAt),
    title: dto.title,
    body: dto.body,
    generalLocation: dto.locationLabel ?? undefined,
    status: dto.status === 'ACTIVE' ? 'active' : dto.status === 'CLOSED' ? 'closed' : 'withdrawn',
    responses,
    provenance: dto.authorCanonicalKsNumber ? `Posted by ${dto.authorCanonicalKsNumber}` : 'Posted to Community',
    visibility: 'community',
  };
}

/**
 * Phase 6 (Community Life) Slice 2 -- merges real replies and real "I can help" signals into the
 * chronological `responses` list `CommunityObjectDetail` already knows how to render. No fabricated
 * text for a help signal -- it plainly states what happened, since it carries no free-text body of
 * its own (a willingness SIGNAL, never a message).
 *
 * <p>Correction (Slice 2 pre-merge): `canWithdraw` is carried straight through from each DTO's own
 * server-derived field -- never recomputed here, never sourced from session-scoped "did this
 * session create it" tracking. This is what lets Withdraw-eligibility survive a page refresh.
 */
export function combineRealResponses(replies: CommunityReplyResponse[], help: CommunityHelpResponseView[]): CommunityResponse[] {
  type Timed = CommunityResponse & { createdAtIso: string };
  const replyResponses: Timed[] = replies
    .filter(r => r.status === 'ACTIVE')
    .map(r => ({
      id: r.id,
      author: r.authorDisplayName ?? r.authorCanonicalKsNumber ?? 'A SecurePay member',
      authorCapacity: 'personal',
      text: r.body,
      date: relativeTime(r.createdAt),
      kind: 'reply',
      canWithdraw: r.canWithdraw,
      createdAtIso: r.createdAt,
    }));
  const helpResponses: Timed[] = help
    .filter(h => h.status === 'ACTIVE')
    .map(h => ({
      id: h.id,
      author: h.authorDisplayName ?? h.authorCanonicalKsNumber ?? 'A SecurePay member',
      authorCapacity: 'personal',
      text: 'Offered to help with this.',
      date: relativeTime(h.createdAt),
      kind: 'i_can_help',
      canWithdraw: h.canWithdraw,
      createdAtIso: h.createdAt,
    }));
  return [...replyResponses, ...helpResponses]
    .sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso))
    .map(({ createdAtIso: _createdAtIso, ...response }) => response);
}

/**
 * Correction (Slice 2 pre-merge): whether the caller currently has an ACTIVE "I can help" signal on
 * this object -- and, if so, which response id to withdraw -- derived directly from the real,
 * server-returned help list's own `canWithdraw` field (never from session-scoped "did this session
 * just create it" state). An ACTIVE help response can only be `canWithdraw: true` for its own
 * author, so finding one here IS "the caller already offered help," surviving a page refresh.
 */
export function myActiveHelpResponseId(help: CommunityHelpResponseView[]): string | null {
  return help.find(h => h.status === 'ACTIVE' && h.canWithdraw)?.id ?? null;
}

/**
 * The only real Community content source this phase has: Store Offers, via the already-productionized
 * Store search (features/store/view.ts `searchRequests`/`mergeSearchResults`, reused unchanged here).
 * This is a plain offer-id *reference* to canonical Store truth, never a copy (task section 7/9) — the
 * synthetic id embeds both real identifiers so `onOpenObject` can recover them without a second lookup.
 * `responses` is always empty and no discussion/"I can help" affordance ever applies to this object type
 * (CommunityObjectDetail only renders those for `need`/`opportunity`/`question`), so this composition
 * cannot be mistaken for user-authored content.
 */
export function storeResultToCommunityObject(result: StoreSearchResult): CommunityObject {
  return {
    id: `store-offer:${encodeURIComponent(result.canonicalKsNumber)}:${encodeURIComponent(result.offer.id)}`,
    objectType: 'store_offer_reference',
    author: result.displayName,
    // PublicSearchResultView carries no identityType (unlike the full PublicStoreView) and this field is
    // never rendered for a top-level CommunityObject (only per-response authorCapacity is) — see
    // docs/PRODUCTION_MIGRATION_LEDGER.md section 17 for the exact gap.
    authorCapacity: 'business',
    createdAt: `Updated ${result.offer.version}`,
    title: result.offer.title,
    body: result.offer.description,
    generalLocation: result.locationLabel ?? undefined,
    status: 'active',
    responses: [],
    relatedStoreId: result.canonicalKsNumber,
    relatedOfferId: result.offer.id,
    provenance: `From ${result.displayName} Store — offer updated ${result.offer.version}`,
    visibility: 'public',
  };
}

export function parseStoreOfferCommunityObjectId(id: string): { canonicalKsNumber: string; offerId: string } | null {
  const match = /^store-offer:([^:]+):([^:]+)$/.exec(id);
  if (!match) return null;
  return { canonicalKsNumber: decodeURIComponent(match[1]), offerId: decodeURIComponent(match[2]) };
}
