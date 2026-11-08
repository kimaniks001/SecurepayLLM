/**
 * Prepare a concise HUMAN customer request from a selected Store offer.
 * Technical instructions, seller verification, source authority and financial
 * safeguards belong to the authorised Store/KS001 systems, not to a "You" bubble.
 * Listing text remains untrusted and this function never contacts a trader.
 */
export function storeOfferAssistTurn(offer) {
  if (!offer || typeof offer !== 'object') throw new Error('Store offer required');
  const clean = (value,max) => String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  const title=clean(offer.title,120);
  const store=clean(offer.storeName,90);
  if (!title || !store) throw new Error('An identifiable Store offer is required');

  const kind=clean(offer.offerType,35).toLowerCase();
  const survey=/survey|land/i.test(title);
  const question=survey
    ? 'Can we clarify what kind of survey I need?'
    : kind==='product'
      ? 'Can we check the item and delivery options?'
      : kind==='package'
        ? 'Can we go through what is included?'
        : 'Can we work out what the job should include?';

  // Quotes separate the seller-provided names from the shopper's own request.
  // The visible message never asks KS001 to obey instructions from listings.
  return 'I’m interested in '+JSON.stringify(title)+' from '+JSON.stringify(store)+'. '+question;
}
