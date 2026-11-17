/**
 * Explicit seller-authored KS001 input for the existing saved conversation.
 * Fails closed if the important proposal cannot fit the current server's
 * 1,200-character turn contract. Never silently clips or omits seller terms.
 */
const tidy=(s)=>typeof s==='string'?s.trim().replace(/\s+/g,' '):'';
export function miniSellerKs001Statement({prepared,maxChars=1200}){
  if(!prepared?.ok||!prepared.offerTerms)
    return {ok:false,reason:'OFFER_NOT_PREPARED'};
  const o=prepared.offerTerms, p=o.pricing, f=o.fulfilment;
  if(!o.title?.trim()||!p||!f)
    return {ok:false,reason:'MISSING_SELLER_TERMS'};
  const statement=[
    'I want to offer the following to a buyer for an Agreement. These are my unverified statements, not a completed sale.',
    'What: '+tidy(o.title)+'.',
    o.description?'Description: '+tidy(o.description)+'.':'',
    'Price: '+(p.priceMinor===null?'to agree':
      'KES '+(p.priceMinor/100).toFixed(2))+' per '+tidy(p.per||'item')+'.',
    o.quantityRequested!==null?'Proposed quantity: '+o.quantityRequested+'.':'',
    f.purpose?'Fulfilment method: '+tidy(f.purpose)+'.':'',
    f.placeLabel?'Place proposed: '+tidy(f.placeLabel)+'.':'',
    f.timingProposal?'Timing proposed: '+tidy(f.timingProposal)+'.':'',
    f.availabilityDeclaration?'Availability claimed by me: '+tidy(f.availabilityDeclaration)+'.':'',
    f.warranty?'Warranty I propose: '+tidy(f.warranty)+'.':'',
    f.limitations?'Limitations I propose: '+tidy(f.limitations)+'.':'',
    o.authorityDeclaration?'I declare my basis to sell: '+tidy(o.authorityDeclaration)+'.':'',
    'Buyer identity, final terms, obligations and permissions still need review. No one has accepted or paid.'
  ].filter(Boolean).join(' ');
  if(statement.length>maxChars) return {
    ok:false,reason:'TERMS_TOO_LONG_FOR_SINGLE_KS001_TURN',
    actualLength:statement.length,maxChars
  };
  return {ok:true,statement,unverified:true,
    agreementCreated:false,secureLinkIssued:false,moneyAuthorized:false};
}
