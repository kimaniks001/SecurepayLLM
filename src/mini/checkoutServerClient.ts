import type { MiniCheckoutDemoRecord } from './checkoutDemoFixtures';

export interface MiniPreviewCheckoutPayload {
  record: MiniCheckoutDemoRecord;
  expiresAt: number;
  simulationOnly: true;
  agreementAccepted: false;
  reservationHeld: false;
  financialAuthority: false;
  source: 'SERVER_PREVIEW_FIXTURE_NOT_LIVE_ORDER';
}

export function readMiniPreviewCheckout(value: unknown): MiniPreviewCheckoutPayload | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  const record = payload.record as Record<string, unknown> | null;
  if (!record || typeof record !== 'object' ||
      payload.simulationOnly !== true ||
      payload.agreementAccepted !== false ||
      payload.reservationHeld !== false ||
      payload.financialAuthority !== false ||
      payload.source !== 'SERVER_PREVIEW_FIXTURE_NOT_LIVE_ORDER' ||
      typeof payload.expiresAt !== 'number' || !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt <= Date.now() ||
      (record.id !== 'STORE-DEMO-01' && record.id !== 'STAY-DEMO-01') ||
      record.fixtureOnly !== true ||
      record.currency !== 'KES' ||
      typeof record.amountMinor !== 'number' || !Number.isSafeInteger(record.amountMinor) ||
      record.amountMinor <= 0 ||
      typeof record.reference !== 'string' || record.reference.length > 80 ||
      typeof record.itemDescription !== 'string' || record.itemDescription.length > 160 ||
      typeof record.details !== 'string' || record.details.length > 300 ||
      typeof record.merchant !== 'string' || record.merchant.length > 120 ||
      typeof record.terms !== 'string' || record.terms.length > 400 ||
      typeof record.quantity !== 'string' || record.quantity.length > 40 ||
      typeof record.unit !== 'string' || record.unit.length > 40 ||
      typeof record.orderVersion !== 'string' || record.orderVersion.length > 80) return null;
  if (record.id === 'STORE-DEMO-01' &&
      (record.source !== 'STORE' ||
      record.hostReturnPath !== '/checkout-demo-store.html')) return null;
  if (record.id === 'STAY-DEMO-01' &&
      (record.source !== 'SHORTSTAYS' ||
      record.hostReturnPath !== '/checkout-demo-shortstays.html')) return null;
  return payload as unknown as MiniPreviewCheckoutPayload;
}

export async function fetchMiniPreviewCheckout(token: string, signal?: AbortSignal):
  Promise<{ status: 'ready'; value: MiniPreviewCheckoutPayload } |
    { status: 'unavailable' | 'expired' }> {
  if (!/^[A-Za-z0-9_-]{16,512}\.[A-Za-z0-9_-]{16,1024}\.[A-Za-z0-9_-]{16,64}$/.test(token) ||
      token.length > 1024) return { status: 'expired' };
  try {
    const response = await fetch('/api/mini-checkout-preview?session=' + encodeURIComponent(token), {
      method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal,
    });
    if (!response.ok) return { status: response.status === 410 ? 'expired' : 'unavailable' };
    const payload = readMiniPreviewCheckout(await response.json());
    if (!payload) return { status: 'expired' };
    return { status: 'ready', value: payload };
  } catch {
    return { status: 'unavailable' };
  }
}
