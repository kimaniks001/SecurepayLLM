/** Read-only real public Store offer context. This is NOT an order or checkout authorisation. */
export interface MiniRealOfferRecord {
  id: 'STORE-OFFER-REVIEW';
  source: 'STORE';
  reviewOnly: true;
  publishedStoreOffer: true;
  sellerKsNumber: string;
  offerId: string;
  offerUpdatedAt: string;
  merchant: string;
  title: string;
  itemDescription: string;
  details: string;
  quantity: string;
  unit: string;
  amountMinor: number;
  currency: 'KES';
  availabilityState: string;
  terms: string;
  hostReturnPath: '/checkout-store-offer-preview.html';
  reference: string;
}

export interface MiniRealOfferReview {
  record: MiniRealOfferRecord;
  expiresAt: number;
  previewSource: 'SECUREPAY_PUBLIC_STORE_OFFER';
  simulationOnly: true;
  orderCreated: false;
  agreementAccepted: false;
  inventoryReserved: false;
  paymentEnabled: false;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knownAvailability = new Set(['AVAILABLE','LOW_AVAILABILITY','NEEDS_CONFIRMATION','TAKING_WORK','LIMITED']);

export function validateStoreOfferReview(value: unknown): MiniRealOfferReview | null {
  if (!value || typeof value !== 'object') return null;
  const o=value as Record<string,unknown>;
  const record=o.record as Record<string,unknown> | null;
  if(!record || typeof record!=='object' ||
    o.previewSource!=='SECUREPAY_PUBLIC_STORE_OFFER' ||
    o.simulationOnly!==true || o.orderCreated!==false || o.agreementAccepted!==false ||
    o.inventoryReserved!==false || o.paymentEnabled!==false ||
    typeof o.expiresAt!=='number' || !Number.isSafeInteger(o.expiresAt) ||
    o.expiresAt<=Date.now() ||
    record.id!=='STORE-OFFER-REVIEW' || record.source!=='STORE' ||
    record.reviewOnly!==true || record.publishedStoreOffer!==true ||
    typeof record.sellerKsNumber!=='string' || !/^KS\d{3,12}$/.test(record.sellerKsNumber) ||
    typeof record.offerId!=='string' || !uuid.test(record.offerId) ||
    typeof record.offerUpdatedAt!=='string' || Number.isNaN(Date.parse(record.offerUpdatedAt)) ||
    typeof record.merchant!=='string' || record.merchant.length>120 || !record.merchant.trim() ||
    typeof record.itemDescription!=='string' || !record.itemDescription.trim() || record.itemDescription.length>160 ||
    typeof record.details!=='string' || record.details.length>340 ||
    typeof record.quantity!=='string' || !/^(?:[1-9]|1\d|20)$/.test(record.quantity) ||
    typeof record.unit!=='string' || record.unit.length>40 ||
    typeof record.amountMinor!=='number' || !Number.isSafeInteger(record.amountMinor) || record.amountMinor<=0 ||
    record.currency!=='KES' ||
    typeof record.availabilityState!=='string' || !knownAvailability.has(record.availabilityState) ||
    typeof record.terms!=='string' || record.terms.length>450 ||
    record.hostReturnPath!=='/checkout-store-offer-preview.html' ||
    typeof record.reference!=='string' || record.reference.length>130) return null;
  return value as MiniRealOfferReview;
}

export async function loadRealStoreOfferPreview(session: string, signal: AbortSignal): Promise<
  {status:'ready';data:MiniRealOfferReview} | {status:'expired'|'changed'|'unavailable'}> {
  if (typeof session!=='string' || session.length>1024 ||
      !/^[A-Za-z0-9_-]{10,256}\.[A-Za-z0-9_-]{30,850}\.[A-Za-z0-9_-]{10,128}$/.test(session))
    return {status:'expired'};
  try{
    const response=await fetch('/api/mini-store-offer-preview?session='+encodeURIComponent(session),{
      method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',
      headers:{Accept:'application/json'},signal
    });
    if(!response.ok){
      return {status:response.status===410?'expired':response.status===409?'changed':'unavailable'};
    }
    const payload=validateStoreOfferReview(await response.json());
    if(!payload) return {status:'changed'};
    return {status:'ready',data:payload};
  }catch{return {status:'unavailable'};}
}
