import { segment, type HttpClient } from '../http';

/**
 * Real SecurePayAPI Phase 3 checkout INTENTION: not yet an accepted order,
 * legally signed Agreement, reserved inventory or payable obligation.
 * This gateway NEVER calls a payment rail or infers acceptance from status.
 */
export interface CreateStoreCheckoutIntent {
  idempotencyKey: string;
  sellerKsNumber: string;
  offerId: string;
  quantity: number;
  expectedOfferUpdatedAt: string;
}

export interface StoreCheckoutIntent {
  id: string;
  status: 'REQUESTED_NOT_ACCEPTED';
  sellerKsNumber: string;
  offerId: string;
  itemTitle: string;
  quantity: number;
  unitPriceMinor: number;
  amountMinor: number;
  currency: 'KES';
  offerUpdatedAt: string;
  expiresAt: string;
  orderAccepted: false;
  agreementAccepted: false;
  inventoryReserved: false;
  paymentEnabled: false;
  paymentVerified: false;
  mayFulfil: false;
}

export interface StoreAgreementReadiness {
  checkoutIntentId: string;
  agreementId: string;
  currentAgreementVersionId: string | null;
  sourceMatched: boolean;
  amountMatched: boolean;
  bothPartiesConfirmedCurrentVersion: boolean;
  agreementReviewConsistent: boolean;
  orderAccepted: false;
  inventoryReserved: false;
  paymentReady: false;
  paymentVerified: false;
  mayFulfil: false;
  status: 'CURRENT_AGREEMENT_REVIEW_CONSISTENT_NOT_PAYABLE' | 'AGREEMENT_REVIEW_NOT_READY';
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ks = /^KS\d{3,}$/;

function assertCreate(input: CreateStoreCheckoutIntent): void {
  if (!input || !/^[A-Za-z0-9_.:-]{8,100}$/.test(input.idempotencyKey) ||
      !ks.test(input.sellerKsNumber) || !uuid.test(input.offerId) ||
      !Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 100 ||
      !Number.isFinite(Date.parse(input.expectedOfferUpdatedAt))) {
    throw new Error('Invalid Store checkout source. Review the listing again.');
  }
}

export function verifiedStoreCheckoutIntent(value: unknown): StoreCheckoutIntent {
  if (!value || typeof value !== 'object') throw new Error('Invalid SecurePay checkout response');
  const x = value as Record<string, unknown>;
  if (typeof x.id !== 'string' || !uuid.test(x.id) ||
      x.status !== 'REQUESTED_NOT_ACCEPTED' ||
      typeof x.sellerKsNumber !== 'string' || !ks.test(x.sellerKsNumber) ||
      typeof x.offerId !== 'string' || !uuid.test(x.offerId) ||
      typeof x.itemTitle !== 'string' || !x.itemTitle.trim() || x.itemTitle.length > 160 ||
      !Number.isSafeInteger(x.quantity) || (x.quantity as number) < 1 ||
      !Number.isSafeInteger(x.unitPriceMinor) || (x.unitPriceMinor as number) <= 0 ||
      !Number.isSafeInteger(x.amountMinor) ||
      (x.amountMinor as number) !== (x.unitPriceMinor as number) * (x.quantity as number) ||
      x.currency !== 'KES' ||
      typeof x.offerUpdatedAt !== 'string' ||
      !Number.isFinite(Date.parse(x.offerUpdatedAt)) ||
      typeof x.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(x.expiresAt)) ||
      Date.parse(x.expiresAt) <= Date.now() ||
      x.orderAccepted !== false || x.agreementAccepted !== false ||
      x.inventoryReserved !== false || x.paymentEnabled !== false ||
      x.paymentVerified !== false || x.mayFulfil !== false)
    throw new Error('SecurePay checkout is not a verified non-payable intention');
  return value as StoreCheckoutIntent;
}

export function verifiedStoreAgreementReadiness(value: unknown): StoreAgreementReadiness {
  if (!value || typeof value !== 'object') throw new Error('Invalid Agreement readiness response');
  const x=value as Record<string, unknown>;
  if (typeof x.checkoutIntentId !== 'string' || !uuid.test(x.checkoutIntentId) ||
      typeof x.agreementId !== 'string' || !uuid.test(x.agreementId) ||
      (x.currentAgreementVersionId !== null &&
        (typeof x.currentAgreementVersionId !== 'string' || !uuid.test(x.currentAgreementVersionId))) ||
      !['CURRENT_AGREEMENT_REVIEW_CONSISTENT_NOT_PAYABLE','AGREEMENT_REVIEW_NOT_READY'].includes(String(x.status)) ||
      typeof x.sourceMatched !== 'boolean' ||
      typeof x.amountMatched !== 'boolean' ||
      typeof x.bothPartiesConfirmedCurrentVersion !== 'boolean' ||
      typeof x.agreementReviewConsistent !== 'boolean' ||
      (x.agreementReviewConsistent === true &&
        (!x.sourceMatched || !x.amountMatched || !x.bothPartiesConfirmedCurrentVersion)) ||
      x.orderAccepted !== false || x.inventoryReserved !== false ||
      x.paymentReady !== false || x.paymentVerified !== false || x.mayFulfil !== false)
    throw new Error('Agreement review may not grant payment authority');
  return value as StoreAgreementReadiness;
}

export function createStoreCheckoutGateway(http: HttpClient) {
  const route = '/api/v1/store-checkout-intents';
  return {
    /** Buyer identity and server-priced value always come from real SecurePayAPI. */
    createIntent: async (input: CreateStoreCheckoutIntent) => {
      assertCreate(input);
      const body: CreateStoreCheckoutIntent = {
        idempotencyKey: input.idempotencyKey,
        sellerKsNumber: input.sellerKsNumber,
        offerId: input.offerId,
        quantity: input.quantity,
        expectedOfferUpdatedAt: input.expectedOfferUpdatedAt
      };
      return verifiedStoreCheckoutIntent(await http.request<StoreCheckoutIntent>(
        route,{method:'POST',body,auth:'required'}));
    },
    getIntent: async (intentId: string) => {
      if(!uuid.test(intentId))throw new Error('Invalid checkout reference');
      return verifiedStoreCheckoutIntent(await http.request<StoreCheckoutIntent>(
        route+'/'+segment(intentId),{auth:'required'}));
    },
    /** Read-only comparison. Even two real confirmations do NOT unlock funds. */
    agreementReadiness: async (intentId: string, agreementId: string) => {
      if(!uuid.test(intentId)||!uuid.test(agreementId))
        throw new Error('Invalid agreement or checkout reference');
      return verifiedStoreAgreementReadiness(await http.request<StoreAgreementReadiness>(
        route+'/'+segment(intentId)+'/agreement-readiness/'+segment(agreementId),
        {auth:'required'}));
    }
  };
}
