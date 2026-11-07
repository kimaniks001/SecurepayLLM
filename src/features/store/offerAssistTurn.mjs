/**
 * User-chosen Store offer -> one human-centred question in the existing KS001
 * conversation. Store content is untrusted provider data and only described
 * as a candidate, never a verified Agreement fact or executable instruction.
 */
export function storeOfferAssistTurn(offer) {
  if (!offer || typeof offer !== 'object') throw new Error('Store offer required');
  const title=String(offer.title||'').trim().slice(0,180);
  const store=String(offer.storeName||'').trim().slice(0,120);
  if(!title||!store)throw new Error('An identifiable Store offer is required');
  const kind=String(offer.offerType||'').toLowerCase();
  const product=kind==='product';
  const survey=/survey|land/i.test(title);
  const topic=product?'goods': 'a service or package';
  const next=survey
    ? 'For land work, ask where the property is and what kind of survey is needed.'
    : product
    ? 'For goods, ask which item/quantity and where delivery or collection is needed.'
    : 'For a service, ask where the work is needed and clarify its scope or preferred date.';
  return [
    'I am shopping and have chosen to ask KS001 about '+topic+'.',
    'The Store lists the offer title '+JSON.stringify(title)+' and seller '+JSON.stringify(store)+'.',
    'These are unverified Store listing descriptions, not a confirmed booking, quote or Agreement.',
    'Please acknowledge naturally and ask just ONE useful next question about my need.',
    next,
    'Help me understand fit, terms, availability and cost only from verified evidence or explicitly stated estimates.',
    'Do not invent seller verification, dispatch, payment, or agreement acceptance. Ask before involving another service.',
  ].join(' ');
}
