/**
 * The smallest production route seam for a real public invitation link: a hash fragment, so the raw
 * token never reaches a server access log and no host-level rewrite rule is required. This is not the
 * Bolt `#/demo/...` fixture convention and is never used to select fixture state.
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
