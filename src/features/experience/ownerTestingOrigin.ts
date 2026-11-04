/** Current architectural decision: an explicitly configured, same-origin temporary
 * owner-testing deployment may use its isolated identity API. Production and
 * cross-origin previews never acquire this permission from the flag alone. */
export function isOwnerTestingOrigin(apiBaseUrl: string, pageOrigin: string, configuredOrigin?: string): boolean {
  if (!configuredOrigin) return false;
  try {
    const api = new URL(apiBaseUrl);
    const page = new URL(pageOrigin);
    const configured = new URL(configuredOrigin);
    return [api, page, configured].every(url => url.protocol === 'https:' &&
      url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password) &&
      api.origin === page.origin && page.origin === configured.origin &&
      configured.hostname.endsWith('.trycloudflare.com');
  } catch { return false; }
}
export function isOwnerTestingWorkspaceEntry(hash: string): boolean {
  return hash === '' || hash === '#' || hash === '#/' || /^#\/?sign-(?:in|up)\/?$/.test(hash);
}
