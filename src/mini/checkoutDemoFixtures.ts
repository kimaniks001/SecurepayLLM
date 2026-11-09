/**
 * PHASE 1 CHECKOUT DEMONSTRATION ONLY.
 *
 * These are checked-in FICTIONAL immutable order/booking examples; there is no
 * server-created checkout session, available inventory, Agreement, authenticated
 * participant, real quote, bank instruction, trusted webhook or payment.
 *
 * A production host must NEVER use query parameters or bundled client fixtures
 * as a trusted amount, merchant, booking or money authority.
 */
export type MiniCheckoutDemoId = 'STORE-DEMO-01' | 'STAY-DEMO-01';
export type MiniDemoHost = 'STORE' | 'SHORTSTAYS';
export type MiniDemoStatus =
  | 'NOT_STARTED'
  | 'SELECT_METHOD'
  | 'AWAITING_FAKE_PROVIDER'
  | 'SIMULATED_UNKNOWN'
  | 'SIMULATED_CONFIRMED'
  | 'SIMULATED_FAILED';

export interface MiniCheckoutDemoRecord {
  id: MiniCheckoutDemoId;
  fixtureOnly: true;
  source: MiniDemoHost;
  title: string;
  merchant: string;
  itemDescription: string;
  details: string;
  quantity: string;
  unit: string;
  amountMinor: number;
  currency: 'KES';
  orderVersion: string;
  terms: string;
  hostReturnPath: '/checkout-demo-store.html' | '/checkout-demo-shortstays.html';
  reference: string;
}

const records: Readonly<Record<MiniCheckoutDemoId, Readonly<MiniCheckoutDemoRecord>>> = {
  'STORE-DEMO-01': Object.freeze({
    id: 'STORE-DEMO-01', fixtureOnly: true, source: 'STORE',
    title: 'Store order', merchant: 'Sample Digital Store',
    itemDescription: 'Everyday goods', details: '3 packs · collection at the shop',
    quantity: '3', unit: 'packs', amountMinor: 180000, currency: 'KES',
    orderVersion: 'fixture-store-v1', terms: 'Illustrative collection terms. No inventory is reserved.',
    hostReturnPath: '/checkout-demo-store.html', reference: 'DEMO-STORE-1001',
  }),
  'STAY-DEMO-01': Object.freeze({
    id: 'STAY-DEMO-01', fixtureOnly: true, source: 'SHORTSTAYS',
    title: 'ShortStays booking', merchant: 'Sample Stay Host',
    itemDescription: 'Cabin stay · 2 nights', details: '2 guests · illustration only; no dates or room held',
    quantity: '2', unit: 'nights', amountMinor: 900000, currency: 'KES',
    orderVersion: 'fixture-stay-v1', terms: 'Illustrative booking only. Availability, cancellations and check-in are not confirmed.',
    hostReturnPath: '/checkout-demo-shortstays.html', reference: 'DEMO-STAY-2001',
  }),
};

export const MINI_DEMO_CHECKOUTS = Object.freeze(records);

export function getMiniDemoCheckout(id: string | null): MiniCheckoutDemoRecord | null {
  if (id !== 'STORE-DEMO-01' && id !== 'STAY-DEMO-01') return null;
  return records[id];
}

export function getMiniDemoAmount(record: MiniCheckoutDemoRecord): string {
  return (record.amountMinor / 100).toFixed(2);
}

export function isMiniDemoStatus(value: string): value is MiniDemoStatus {
  return [
    'NOT_STARTED', 'SELECT_METHOD', 'AWAITING_FAKE_PROVIDER',
    'SIMULATED_UNKNOWN','SIMULATED_CONFIRMED','SIMULATED_FAILED',
  ].includes(value);
}

export function miniDemoStatusLabel(status: MiniDemoStatus): string {
  switch (status) {
    case 'SIMULATED_CONFIRMED': return 'Test result: simulated confirmation — NOT PAID';
    case 'SIMULATED_FAILED': return 'Test result: simulated failure — NOT PAID';
    case 'SIMULATED_UNKNOWN': return 'Test result: unknown — NOT PAID';
    case 'AWAITING_FAKE_PROVIDER': return 'Test pending — NOT PAID';
    case 'SELECT_METHOD': return 'Test method chosen — NOT PAID';
    case 'NOT_STARTED': return 'Payment not started';
  }
}
