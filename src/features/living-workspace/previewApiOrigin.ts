/**
 * Client-side origin guard for preview relay requests.
 * This does NOT grant write authority; the Vercel server-side relay independently
 * checks the staging project, explicit operator confirmation and upstream host.
 */
export function requireApprovedPreviewApiOrigin(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch {
    throw new Error('A valid SecurePay API origin is required');
  }
  const host = url.hostname.toLowerCase();
  const isProduction = url.origin === 'https://securepay.ke';
  const isStaging = url.protocol === 'https:' && !url.port &&
    host.endsWith('.securepay.ke') &&
    /(?:^|[.-])(?:staging|sandbox|qa|test)(?:[.-]|$)/.test(host);
  if (!isProduction && !isStaging) {
    throw new Error('Unknown SecurePay API origin; preview transport is unavailable');
  }
  return url.origin;
}
