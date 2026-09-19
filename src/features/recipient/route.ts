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
