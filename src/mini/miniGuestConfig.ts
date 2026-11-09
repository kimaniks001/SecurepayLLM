/**
 * SecurePay Mini owner pilot configuration.
 *
 * A public, NON-SECRET siteId and sandbox API origin are intentionally required.
 * The site must already be registered and enabled by SecurePayAPI for the exact
 * browser Origin. No frontend env flag can grant identity or model authority.
 * This preview never uses production or a generic arbitrary API URL.
 */
export interface MiniPilotConfig {
  siteId: string;
  apiBaseUrl: string;
}
export function validateMiniPilotConfig(siteId: string, originValue: string): MiniPilotConfig | null {
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(siteId)) return null;
  try {
    const url = new URL(originValue);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    const host = url.hostname.toLowerCase();
    // Do not allow production API, arbitrary customer sites or a *.vercel.app proxy.
    if (!/^(?:staging|sandbox|qa|test)(?:[-.][a-z0-9-]+)*\.securepay\.ke$/.test(host)) return null;
    return { siteId, apiBaseUrl: url.origin };
  } catch {
    return null;
  }
}
export function getMiniPilotConfig(): MiniPilotConfig | null {
  return validateMiniPilotConfig(
    String(import.meta.env.VITE_MINI_GUEST_SITE_ID || ''),
    String(import.meta.env.VITE_MINI_GUEST_API_ORIGIN || '')
  );
}

export function miniDiscussionPrompt(description: string, amount: string, quantity: string, unit: string, note: string): string {
  // Prepared exclusively for explicit user review and send; does NOT include
  // counterparty identifiers, browser files, client account info or guest tokens.
  const fields = [
    description.trim() && 'I want to discuss this: ' + description.trim(),
    amount.trim() && 'Proposed amount KSh ' + amount.trim(),
    quantity.trim() && 'Quantity ' + quantity.trim() + (unit.trim() ? ' ' + unit.trim() : ''),
    note.trim() && 'Extra information: ' + note.trim(),
  ].filter(Boolean);
  return fields.join('\n').slice(0, 1200);
}
