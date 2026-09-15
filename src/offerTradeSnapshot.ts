import type { OfferTradeSnapshot, StoreOffer } from './types';

/**
 * Pure presentation logic, not demo data — kept out of storeData.ts (which also holds fabricated
 * Store/Offer fixture records) so the locked OfferToTradeHandoff component, reachable from the real
 * Store route, never pulls storeData.ts's fixtures into the production bundle merely to render Trade
 * Taking Shape. This is a client-side informational snapshot of the real fetched Offer's own facts —
 * there is no backend "SourceReference" read endpoint (verified) to source this from instead.
 */
export function createOfferTradeSnapshot(offer: StoreOffer): OfferTradeSnapshot {
  const sellerOfRecord = offer.isExternalReference && offer.externalSellerName
    ? offer.externalSellerName
    : offer.storeName;
  const sellerOfRecordIdentity = offer.isExternalReference && offer.externalSellerIdentity
    ? offer.externalSellerIdentity
    : 'Business KS identity — authoritative';

  return {
    offerId: offer.id,
    offerVersion: offer.version,
    sellerOfRecord,
    sellerOfRecordIdentity,
    storeId: offer.storeId,
    storeName: offer.storeName,
    displaySource: offer.isExternalReference ? `Displayed in ${offer.storeName} Store` : 'Store-owned offer',
    adoptedFacts: [
      { label: 'Title', value: offer.title },
      { label: 'Price', value: offer.price },
      ...(offer.scope.included.length > 0 ? [{ label: 'Included', value: offer.scope.included.join(', ') }] : []),
      ...(offer.scope.excluded.length > 0 ? [{ label: 'Not included', value: offer.scope.excluded.join(', ') }] : []),
      ...(offer.serviceArea ? [{ label: 'Service area', value: offer.serviceArea }] : []),
      ...(offer.timing ? [{ label: 'Timing', value: offer.timing }] : []),
      ...(offer.warrantyTerms ? [{ label: 'Warranty', value: offer.warrantyTerms }] : []),
    ],
    provenanceLabel: offer.isExternalReference
      ? `Started from ${offer.storeName} Store offer — seller of record: ${sellerOfRecord}`
      : `Started from ${offer.storeName} Store offer`,
    isExternalReference: offer.isExternalReference,
    externalSellerName: offer.externalSellerName,
    timestamp: new Date().toISOString(),
  };
}
