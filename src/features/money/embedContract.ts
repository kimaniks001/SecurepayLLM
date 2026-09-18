/**
 * Final Completion Phase 2 completion pass, Section 4 -- the actual embed contract for hosted
 * SecurePay Money pages loaded inside a developer's own iframe. The trusted-origin allow-list
 * (`allowedEmbedOrigins`) always comes from the backend's own pre-registered
 * ApplicationEmbedOriginRepository (see MoneySessionViewResponse) -- never a value supplied by the
 * page itself or by the embedding parent at runtime. A self-service session (empty allow-list)
 * is never treated as embeddable, even if it happens to be loaded inside a frame.
 */

export type EmbedOutboundMessage =
  | { type: 'securepay:ready'; sessionId: string }
  | { type: 'securepay:completed'; sessionId: string }
  | { type: 'securepay:cancelled'; sessionId: string };

export function isEmbedded(win: Window = window): boolean {
  try {
    return win.self !== win.top;
  } catch {
    // A cross-origin parent throws on access to `top` in some browsers -- that itself means embedded.
    return true;
  }
}

/**
 * Resolves the actual embedding parent's origin against the pre-registered allow-list, using the
 * frame's own `document.referrer` (set by the browser, not readable/writable by page script) as
 * the origin claim. Returns null whenever the claim cannot be verified -- never falls back to a
 * caller-supplied or wildcard origin.
 */
export function resolveEmbedOrigin(allowedOrigins: readonly string[], win: Window = window): string | null {
  if (allowedOrigins.length === 0) return null;
  if (!isEmbedded(win)) return null;
  let referrerOrigin: string;
  try {
    referrerOrigin = new URL(win.document.referrer).origin;
  } catch {
    return null;
  }
  return allowedOrigins.includes(referrerOrigin) ? referrerOrigin : null;
}

/**
 * Sends a completion/cancellation notice to the parent frame, but only once an origin has been
 * verified by {@link resolveEmbedOrigin} -- `postMessage`'s targetOrigin is always that exact
 * verified origin, never `'*'`.
 */
export function notifyEmbedParent(verifiedOrigin: string | null, message: EmbedOutboundMessage, win: Window = window): void {
  if (!verifiedOrigin) return;
  win.parent.postMessage(message, verifiedOrigin);
}
