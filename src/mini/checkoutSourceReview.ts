import type { StoreCheckoutIntent } from '../api/securepay/store-checkout';

/**
 * Same read-only source review contract for a SecurePay Store and a ShortStays
 * booking. A browser source/hold is NEVER evidence of funding eligibility.
 *
 * When the canonical backend handoff is implemented it MUST issue its own
 * versioned, signed, host-bound checkout capability; this model cannot do it.
 */
export type MiniCheckoutSource = 'STORE' | 'SHORTSTAYS';
export type MiniReviewBlocker =
  | 'SELLER_ORDER_ACCEPTANCE_REQUIRED'
  | 'SERVER_ROOM_HOLD_AND_SIGNATURE_REQUIRED'
  | 'CANONICAL_AGREEMENT_VERSION_ACCEPTANCE_REQUIRED'
  | 'AUTHENTICATED_PROVIDER_FUNDING_REQUIRED';

export interface MiniCheckoutSourceReviewV1 {
  protocol: 'SECUREPAY_CHECKOUT_SOURCE_REVIEW_V1';
  source: MiniCheckoutSource;
  sourceReference: string;
  sourceVersion: string;
  sourceContext: 'SERVER_STORE_INTENT_UNACCEPTED' | 'BROWSER_BOOKING_PRECHECK';
  currency: 'KES';
  displayAmountMinor: number | null;
  sourceExpiresAt: string;
  nextAction: 'ACCEPT_ORDER_AND_AGREEMENT_ON_SERVER' | 'VERIFY_BOOKING_HOLD_ON_SERVER';
  blockers: MiniReviewBlocker[];
  checkoutSessionIssued: false;
  hostOrderAccepted: false;
  roomReserved: false;
  agreementAccepted: false;
  providerPaymentVerified: false;
  obligationFunded: false;
  paymentEnabled: false;
  mayFulfil: false;
}

const storeBlockers: MiniReviewBlocker[]=[
  'SELLER_ORDER_ACCEPTANCE_REQUIRED',
  'CANONICAL_AGREEMENT_VERSION_ACCEPTANCE_REQUIRED',
  'AUTHENTICATED_PROVIDER_FUNDING_REQUIRED'
];
const stayBlockers: MiniReviewBlocker[]=[
  'SERVER_ROOM_HOLD_AND_SIGNATURE_REQUIRED',
  'CANONICAL_AGREEMENT_VERSION_ACCEPTANCE_REQUIRED',
  'AUTHENTICATED_PROVIDER_FUNDING_REQUIRED'
];

/** Input MUST be validated by verifiedStoreCheckoutIntent on an authenticated API read. */
export function makeStoreSourceReview(intent: StoreCheckoutIntent):MiniCheckoutSourceReviewV1 {
  if(!intent||intent.status!=='REQUESTED_NOT_ACCEPTED'||
      intent.orderAccepted!==false||intent.agreementAccepted!==false||
      intent.paymentEnabled!==false||intent.paymentVerified!==false||
      intent.inventoryReserved!==false||intent.mayFulfil!==false||
      intent.currency!=='KES'||!Number.isSafeInteger(intent.amountMinor)||
      intent.amountMinor<=0||!intent.id||!intent.offerUpdatedAt||
      !Number.isFinite(Date.parse(intent.expiresAt))||
      Date.parse(intent.expiresAt)<=Date.now()){
    throw new Error('Store source is not a valid non-payable checkout intention');
  }
  return {
    protocol:'SECUREPAY_CHECKOUT_SOURCE_REVIEW_V1',
    source:'STORE',sourceReference:intent.id,sourceVersion:intent.offerUpdatedAt,
    sourceContext:'SERVER_STORE_INTENT_UNACCEPTED',
    currency:'KES',displayAmountMinor:intent.amountMinor,
    sourceExpiresAt:intent.expiresAt,
    nextAction:'ACCEPT_ORDER_AND_AGREEMENT_ON_SERVER',
    blockers:[...storeBlockers],
    checkoutSessionIssued:false,hostOrderAccepted:false,roomReserved:false,
    agreementAccepted:false,providerPaymentVerified:false,
    obligationFunded:false,paymentEnabled:false,mayFulfil:false
  };
}

/** A ShortStays browser preflight may be informative, never a signed handoff. */
export function makeShortStaysSourceReview(input:{
  bookingCode:string; bookingVersion:string; amountMinor:number|null;
  holdExpiresAt:string|null; browserPreflightPassed:boolean;
}):MiniCheckoutSourceReviewV1 {
  if(!input||typeof input.bookingCode!=='string'||
      !/^SS-KE-[A-Z0-9-]{4,48}$/.test(input.bookingCode)||
      typeof input.bookingVersion!=='string'||
      !Number.isFinite(Date.parse(input.bookingVersion))){
    throw new Error('Invalid ShortStays booking source');
  }
  const expires=typeof input.holdExpiresAt==='string'&&
      Number.isFinite(Date.parse(input.holdExpiresAt))?
      input.holdExpiresAt:new Date(0).toISOString();
  const currentHold=input.browserPreflightPassed===true&&
      Date.parse(expires)>Date.now();
  return {
    protocol:'SECUREPAY_CHECKOUT_SOURCE_REVIEW_V1',
    source:'SHORTSTAYS',sourceReference:input.bookingCode,
    sourceVersion:input.bookingVersion,sourceContext:'BROWSER_BOOKING_PRECHECK',
    currency:'KES',
    displayAmountMinor:currentHold&&Number.isSafeInteger(input.amountMinor)&&
      (input.amountMinor as number)>0?input.amountMinor:null,
    sourceExpiresAt:expires,
    nextAction:'VERIFY_BOOKING_HOLD_ON_SERVER',blockers:[...stayBlockers],
    checkoutSessionIssued:false,hostOrderAccepted:false,roomReserved:false,
    agreementAccepted:false,providerPaymentVerified:false,
    obligationFunded:false,paymentEnabled:false,mayFulfil:false
  };
}

export function isCheckoutLaunchAuthorized(review:MiniCheckoutSourceReviewV1):false {
  // No browser-only source review is ever a payment / agreement acceptance path.
  void review;
  return false;
}
