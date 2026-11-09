/**
 * Phase 3 Gate 2 preview protocol only. No accepted Agreement or live StoreOrder.
 * The server proves the fixture's exact amount and the *simulation* stage.
 */
export type SandboxGate2Source = 'STORE' | 'SHORTSTAYS';
export type SandboxGate2Stage = 'REVIEW' | 'TERMS_REVIEWED';

export interface SandboxGate2Snapshot {
  stage: SandboxGate2Stage;
  expiresAt: number;
  simulationOnly: true;
  source: 'SERVER_SANDBOX_FIXTURE';
  orderCreated: false;
  inventoryReserved: false;
  accommodationHeld: false;
  buyerVerified: false;
  sellerVerified: false;
  paymentEnabled: false;
  financialAuthority: false;
  agreementAccepted: false;
  order: {
    sandboxId: string;
    fixtureId: 'STORE-DEMO-01' | 'STAY-DEMO-01';
    source: SandboxGate2Source;
    orderVersion: string;
    reference: string;
    merchant: string;
    description: string;
    details: string;
    quantity: string;
    unit: string;
    amountMinor: number;
    currency: 'KES';
    hostReturnPath: '/checkout-gate2-store.html' | '/checkout-gate2-shortstays.html';
    status: 'NOT_PLACED_SANDBOX_ONLY';
  };
  agreement: {
    sandboxId: string;
    orderSandboxId: string;
    version: string;
    scope: string;
    sellerObligation: string;
    buyerObligation: string;
    terms: string;
    reviewStatus: 'AWAITING_SAMPLE_REVIEW' | 'TERMS_REVIEWED_IN_SANDBOX';
    signed: false;
    accepted: false;
    legallyBinding: false;
    mayExploreSimulatedRails: boolean;
  };
}

const tokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export function validGate2Token(token: unknown): token is string {
  return typeof token === 'string' && token.length >= 100 &&
    token.length <= 1200 && tokenPattern.test(token);
}

export function parseGate2Snapshot(value: unknown): SandboxGate2Snapshot | null {
  if (!value || typeof value !== 'object') return null;
  const d = value as Record<string, unknown>;
  const o = d.order as Record<string, unknown> | null;
  const a = d.agreement as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || !a || typeof a !== 'object' ||
      (d.stage !== 'REVIEW' && d.stage !== 'TERMS_REVIEWED') ||
      d.simulationOnly !== true || d.source !== 'SERVER_SANDBOX_FIXTURE' ||
      d.orderCreated !== false || d.inventoryReserved !== false ||
      d.accommodationHeld !== false || d.buyerVerified !== false ||
      d.sellerVerified !== false || d.paymentEnabled !== false ||
      d.financialAuthority !== false || d.agreementAccepted !== false ||
      typeof d.expiresAt !== 'number' || !Number.isSafeInteger(d.expiresAt) ||
      d.expiresAt <= Date.now() ||
      typeof o.sandboxId !== 'string' || !/^SIM-[A-F0-9]{20}$/.test(o.sandboxId) ||
      typeof o.orderVersion !== 'string' || o.orderVersion.length > 90 ||
      typeof o.reference !== 'string' || o.reference.length > 120 ||
      typeof o.merchant !== 'string' || o.merchant.length > 160 ||
      typeof o.description !== 'string' || !o.description.trim() || o.description.length > 200 ||
      typeof o.details !== 'string' || o.details.length > 420 ||
      typeof o.quantity !== 'string' || o.quantity.length > 40 ||
      typeof o.unit !== 'string' || o.unit.length > 40 ||
      typeof o.amountMinor !== 'number' || !Number.isSafeInteger(o.amountMinor) ||
      o.amountMinor <= 0 || o.currency !== 'KES' ||
      o.status !== 'NOT_PLACED_SANDBOX_ONLY' ||
      typeof a.sandboxId !== 'string' || a.sandboxId !== 'SIM-AG-' + o.sandboxId.slice(4) ||
      a.orderSandboxId !== o.sandboxId || a.version !== o.orderVersion ||
      typeof a.scope !== 'string' || a.scope.length > 500 ||
      typeof a.sellerObligation !== 'string' || a.sellerObligation.length > 300 ||
      typeof a.buyerObligation !== 'string' || a.buyerObligation.length > 300 ||
      typeof a.terms !== 'string' || a.terms.length > 650 ||
      a.signed !== false || a.accepted !== false || a.legallyBinding !== false)
    return null;
  if (o.source === 'STORE') {
    if (o.fixtureId !== 'STORE-DEMO-01' ||
        o.hostReturnPath !== '/checkout-gate2-store.html') return null;
  } else if (o.source === 'SHORTSTAYS') {
    if (o.fixtureId !== 'STAY-DEMO-01' ||
        o.hostReturnPath !== '/checkout-gate2-shortstays.html') return null;
  } else return null;

  const reviewed = d.stage === 'TERMS_REVIEWED';
  if (a.reviewStatus !== (reviewed ? 'TERMS_REVIEWED_IN_SANDBOX' : 'AWAITING_SAMPLE_REVIEW') ||
      a.mayExploreSimulatedRails !== reviewed) return null;
  return value as SandboxGate2Snapshot;
}

export async function getGate2Snapshot(session: string, signal?: AbortSignal): Promise<
  {kind:'ready';data:SandboxGate2Snapshot} | {kind:'expired'|'unavailable'}> {
  if (!validGate2Token(session)) return {kind:'expired'};
  try {
    const response = await fetch('/api/mini-gate2-sandbox?session=' + encodeURIComponent(session), {
      method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{Accept:'application/json'},signal
    });
    if (!response.ok) return {kind:response.status === 410 ? 'expired' : 'unavailable'};
    const parsed = parseGate2Snapshot(await response.json());
    return parsed ? {kind:'ready',data:parsed} : {kind:'unavailable'};
  } catch {return {kind:'unavailable'};}
}

export async function acknowledgeGate2Review(session: string, signal?: AbortSignal): Promise<
  {kind:'ready';session:string} | {kind:'expired'|'unavailable'}> {
  if (!validGate2Token(session)) return {kind:'expired'};
  try {
    const response = await fetch('/api/mini-gate2-sandbox', {
      method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({action:'REVIEW_TERMS',session,reviewed:true}),signal
    });
    if (!response.ok) return {kind:response.status === 409 ? 'expired' : 'unavailable'};
    const body = await response.json() as Record<string, unknown>;
    if (!body || body.simulationOnly !== true || body.orderCreated !== false ||
        body.acceptedAgreement !== false || body.paymentEnabled !== false ||
        !validGate2Token(body.session) || body.session === session ||
        typeof body.expiresAt !== 'number' || body.expiresAt <= Date.now())
      return {kind:'unavailable'};
    return {kind:'ready',session:body.session};
  } catch {return {kind:'unavailable'};}
}
