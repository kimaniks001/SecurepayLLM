/**
 * The smallest production route seam for a real public invitation link: a hash fragment, so the raw
 * token never reaches the frontend host's own URL/access log and no host-level rewrite rule is
 * required. SecurePayAPI itself still necessarily receives the raw token as a path segment in
 * `GET /api/v1/agreement-invitations/{token}` and its `/join` — that is the backend's own contract,
 * not something a frontend route choice can avoid. This is not the Bolt `#/demo/...` fixture
 * convention and is never used to select fixture state.
 */
export function parseInvitationRoute(hash: string): string | null {
  const match = /^#\/invitation\/([^/?#]+)$/.exec(hash);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/**
 * PHASE 4 NEXT SLICE (Section 7/8) — the authenticated-owner counterpart to {@link parseInvitationRoute}:
 * an invitation discovered through the self-scoped inbox (Home's "Invitations for you"), opened by its
 * id rather than a raw token. No secrecy requirement here (unlike the raw token, an invitation id proves
 * nothing by itself — ownership is re-checked server-side on every read/Join), so a plain path segment is
 * fine; it is kept in the hash only for routing consistency with every other in-app deep link.
 */
export function parseMyInvitationRoute(hash: string): string | null {
  const match = /^#\/my-invitations\/([^/?#]+)$/.exec(hash);
  if (!match) return null;
  try {
    const invitationId = decodeURIComponent(match[1]);
    return invitationId.length > 0 ? invitationId : null;
  } catch {
    return null;
  }
}
