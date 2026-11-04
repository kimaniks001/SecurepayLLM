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

/**
 * A Digital Store address is a public, human-readable alias.
 * Never infer owner KS or grant Agreement authority from the URL: the server
 * resolves the slug against reserved historical aliases and active published Stores.
 */
/** New, unambiguous public Store URL. The old #/s/ alias is resolved by
 * the shared short-link router because #/s/ also belongs to SecureLinks. */
export function parseDigitalStoreAddressRoute(hash: string): string | null {
  const match = /^#\/(?:shop|s)\/([a-z0-9][a-z0-9-]{1,46}[a-z0-9])$/.exec(hash);
  return match ? match[1] : null;
}
export function parseLegacySharedShortLink(hash: string): string | null {
  const match = /^#\/s\/([a-z0-9][a-z0-9-]{1,46}[a-z0-9])$/.exec(hash);
  return match ? match[1] : null;
}

/**
 * Gate 4: notification deep-link to an actual self-scoped enquiry. No token,
 * contact details or secret travels in the URL. The role is only a display
 * hint; server-side authentication and (Business) representation decide reads.
 */
export function parseStoreEnquiryRoute(hash: string): { enquiryId: string; audience: 'buyer' | 'trader' } | null {
  const match = /^#\/store\/enquiry\/([0-9a-f-]{36})\/(buyer|trader)$/.exec(hash);
  if (!match || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match[1]))
    return null;
  return { enquiryId: match[1], audience: match[2] as 'buyer' | 'trader' };
}
