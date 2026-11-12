/**
 * A deliberate, low-disclosure shopping-intent recogniser. It operates only on
 * a customer's own latest sent words, never an agreement, hidden conversation
 * context, inferred age, private address or model-generated Store claim.
 * If we cannot identify a short specific item/service, show no suggestions.
 */
export function suggestedStoreSearchTerm(message) {
  if (typeof message !== 'string' || message.length > 900) return null;
  const clean = message.trim().toLowerCase();
  const triggers = [
    /^(?:hi[,. ]+)?(?:where (?:can|could|may|do) i (?:buy|find|get)|where (?:can|could) we (?:buy|find|get)|where to (?:buy|find)|i (?:want|need|would like) to (?:buy|find|get|order)|(?:i am|i'm) looking for|looking for|find me|find (?:a|some) (?:store|shop) (?:for|selling)|show me (?:stores|shops) (?:for|selling)|(?:buy|purchase) (?:me )?)/i,
    /^(?:any (?:stores|shops) (?:with|selling)|(?:stores|shops) (?:nearby|around|selling|for))/i,
  ];
  let remainder = null;
  for (const match of triggers) {
    const found = clean.match(match);
    if (found) { remainder = clean.slice(found[0].length); break; }
  }
  if (!remainder) return null;
  let product = remainder.trim()
    .replace(/^(?:me |a |an |some |the |a shop (?:selling|for) |a store (?:selling|for) )+/,'')
    .replace(/^\d+\s*(?:bags?|pieces?|packets?|kilograms?|kg|litres?|tons?|crates?|units?)\s+(?:of\s+)?/, '')
    .replace(/\s+(?:near|around|in|at|from|for delivery to)\s+[a-z0-9, .'-]+$/,'')
    .replace(/\s+(?:today|tomorrow|this week|please|right now)[?.!]*$/,'')
    .replace(/[?.!,]+$/,'').trim();
  product = product.split(/\s+/).slice(0,4).join(' ').slice(0,65).trim();
  if (!product || product.length < 2 || /\b(?:someone|anything|something|anything else|help|advice|money)\b/.test(product)) return null;
  // No personal contacts, coordinates, URLs, payment identifiers or prose sent to public search.
  if (/\d{5,}|[@:/\\]|\b(?:ks\d{3,}|pin|otp|password|account|phone)\b/.test(product)) return null;
  return product;
}

