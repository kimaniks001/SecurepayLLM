/**
 * The smallest production route seam for a real public Offer link, mirroring
 * features/recipient/route.ts's invitation hash route. There is no dedicated Offer SecureLink/
 * share-token contract on the backend (verified: no offer_share/offer_link table, controller, or
 * endpoint exists) — the public offer URL (`GET /api/v1/stores/{ks}/offers/{offerId}`) is the only
 * authoritative share mechanism, so this hash route carries exactly those two real identifiers and
 * nothing else. It is never reused for, or confused with, the separate `#/invitation/{token}` route:
 * opening it grants no Agreement authority (task section 7).
 */
export function parseStoreOfferRoute(hash: string): { canonicalKsNumber: string; offerId: string } | null {
  const match = /^#\/store\/([^/?#]+)\/offer\/([^/?#]+)$/.exec(hash);
  if (!match) return null;
  try {
    const canonicalKsNumber = decodeURIComponent(match[1]);
    const offerId = decodeURIComponent(match[2]);
    return canonicalKsNumber && offerId ? { canonicalKsNumber, offerId } : null;
  } catch {
    return null;
  }
}
