/**
 * B5 extra client guard. Backend participant authorization remains mandatory
 * and authoritative. Until a separately approved and named sandbox exists,
 * frontend previews must never send an Agreement message to a shared API.
 * Browsing original records is still allowed under normal session authority.
 */
export function canSendAgreementMessageInPreview({
  enabled, apiOrigin, pageHostname,
}: {
  enabled: unknown;
  apiOrigin: unknown;
  pageHostname: unknown;
}): boolean {
  if (enabled !== 'true' || typeof apiOrigin !== 'string' ||
      typeof pageHostname !== 'string' || !pageHostname.endsWith('.vercel.app')) return false;
  try {
    const url=new URL(apiOrigin);
    const host=url.hostname.toLowerCase();
    return url.protocol==='https:' && url.username==='' && url.password==='' &&
      url.search==='' && url.hash==='' && url.pathname==='/' &&
      host!=='api.securepay.ke' && host!=='www.securepay.ke' &&
      host!=='securepay.ke' &&
      /(^|[.-])(sandbox|staging|test)([.-]|$)/.test(host);
  } catch { return false; }
}
