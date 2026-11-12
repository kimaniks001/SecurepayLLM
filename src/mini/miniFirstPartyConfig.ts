/**
 * First-party SecurePay Mini MAY use the SAME canonical Agent API as the
 * Workspace. This is a preview-only, non-secret origin configuration.
 * It never accepts the customer site's arbitrary Origin or production.
 */
export function validateMiniFirstPartyOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    const host = url.hostname.toLowerCase();
    // Real-money production must not be reached from this pre-certification pilot.
    if (!/^(?:staging|sandbox|qa|test)(?:[-.][a-z0-9-]+)*\.securepay\.ke$/.test(host))
      return null;
    return url.origin;
  } catch { return null; }
}
export function getMiniFirstPartyOrigin(): string | null {
  return validateMiniFirstPartyOrigin(
    String(import.meta.env.VITE_MINI_FIRST_PARTY_API_ORIGIN || '')
  );
}
