/**
 * Read-only shopper selection. A collection is NOT an Agreement, Vision Dream,
 * published enquiry, order or price quotation. Server-owned IDs/availability
 * must be revalidated on any later binding trade action.
 */
export const SHOP_COLLECTION_VERSION = 'store-selection.v1';
export const MAX_DISTINCT_ITEMS = 12;
export const MAX_QUANTITY = 99;

function safe(value, max = 150) {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

export function listedMinorPrice(offer) {
  if (offer?.priceType !== 'fixed') return null;
  const currency = safe(offer.currency, 3).toUpperCase();
  if (!['KES', 'USD', 'EUR', 'GBP'].includes(currency)) return null;
  const label = safe(offer.price, 80);
  const prefixes = {
    KES: /^(?:KSh|KES)\s*/,
    USD: /^(?:USD|\$)\s*/,
    EUR: /^(?:EUR|€)\s*/,
    GBP: /^(?:GBP|£)\s*/,
  };
  const replaced = label.replace(prefixes[currency], '');
  if (replaced === label) return null; // strict prefix, no ungrounded numbers
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(replaced)) return null;
  const clean = replaced.replace(/,/g, '');
  const [whole, cents = ''] = clean.split('.');
  const minor = Number(whole)*100 + Number(cents.padEnd(2,'0'));
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
}

export function itemFromOffer(offer, destination, demo = false) {
  if (!['vision','agreement'].includes(destination))
    throw new Error('Choose Vision or Agreement');
  if (!offer || !offer.id || !offer.storeId || !offer.title || !offer.storeName)
    throw new Error('Choose an identifiable Store offer');
  if (destination === 'agreement' && offer.lifecycle !== 'published')
    throw new Error('Only published offers can be considered for an Agreement');
  // A listing displayed by an intermediary is not necessarily that person's offer.
  // Without the actual external contracting party's canonical KS, never turn it
  // into an Agreement candidate merely by collecting it.
  if(destination==='agreement' && offer.isExternalReference)
    throw new Error('The actual external seller must be independently identified before this offer can be used for an Agreement.');
  return Object.freeze({
    key: safe(offer.storeId, 100)+'::'+safe(offer.id,100)+'::'+destination,
    destination,
    offerId: safe(offer.id, 100),
    sellerKsNumber: safe(offer.storeId, 100),
    sellerName: safe(offer.storeName, 120),
    title: safe(offer.title, 150),
    offerType: safe(offer.offerType, 40),
    currency: safe(offer.currency,3).toUpperCase(),
    priceLabel: safe(offer.price,80),
    unitLabel: safe(offer.priceUnit || '', 80),
    unitMinor: listedMinorPrice(offer),
    quantity: 1,
    buyerNote: '', // A shopper's own requirements, NOT a change to the trader's offer.
    offerContext: safe(offer.description, 220),
    included: Array.isArray(offer.scope?.included)?offer.scope.included.slice(0,3).map(value=>safe(value,90)):[],
    excluded: Array.isArray(offer.scope?.excluded)?offer.scope.excluded.slice(0,2).map(value=>safe(value,90)):[],
    timing: safe(offer.timing,120),
    demo: Boolean(demo),
  });
}

/** Add never opens a page or sends a KS001 message. */
export function collectOffer(previous, offer, destination, demo = false) {
  const item = itemFromOffer(offer, destination, demo);
  const items = Array.isArray(previous) ? previous : [];
  const existing = items.findIndex(entry => entry.key === item.key);
  if (existing >= 0) return items.map((entry,i) => i === existing
      ? {...entry, quantity:Math.min(MAX_QUANTITY, entry.quantity+1)} : entry);
  if (items.length >= MAX_DISTINCT_ITEMS)
    throw new Error('Review or remove some selected offers before adding more');
  return [...items,item];
}

export function updateSelectedQuantity(items,key,quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY)
    throw new Error('Quantity must be between 1 and 99');
  return items.map(x => x.key===key ? {...x,quantity} : x);
}

export function removeSelected(items,key) {return items.filter(x => x.key !== key);}

/** Shopping requirements are proposals; product price, scope and identity remain locked. */
export function updateSelectedBuyerNote(items,key,note) {
  const cleaned=safe(note,240);
  return items.map(item=>item.key===key?{...item,buyerNote:cleaned}:item);
}

export function groupSelectionBySeller(items) {
  const groups=new Map();
  for(const item of items){
    const key=item.sellerKsNumber;
    if(!groups.has(key))groups.set(key,{sellerReference:key,sellerName:item.sellerName,items:[]});
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

export function collectionTotals(items) {
  const destinations = {vision:[],agreement:[]};
  for(const item of items){
    if(destinations[item.destination]) destinations[item.destination].push(item);
  }
  const byDestination={vision:{subtotal:{},unpriced:0},agreement:{subtotal:{},unpriced:0}};
  for(const entry of items) {
    const bucket=byDestination[entry.destination];
    if(!bucket)continue;
    if(entry.unitMinor === null || entry.unitMinor === undefined ||
       !Number.isSafeInteger(entry.unitMinor) ||
       !Number.isSafeInteger(entry.quantity) || entry.quantity<1) {bucket.unpriced++;continue;}
    const code=entry.currency;
    const value=entry.unitMinor*entry.quantity;
    if (!Number.isSafeInteger(value)) {bucket.unpriced++;continue;}
    bucket.subtotal[code]=(bucket.subtotal[code]||0)+value;
  }
  return {destinations, byDestination, itemCount:items.length,
    quantityCount:items.reduce((sum,item)=>sum+item.quantity,0)};
}

export function formatListedMoney(minor,currency) {
  return (currency==='KES'?'KSh ':currency+' ')+(minor/100).toLocaleString('en-KE',{minimumFractionDigits:0,maximumFractionDigits:2});
}

/**
 * A customer's readable message about the selected Store items.
 *
 * The unmodified SelectionItem[] remains the parent-owned source for KS Cart,
 * including offer IDs, canonical seller references, notes and listed pricing.
 * A chat message is NOT an authoritative source, checkout or accepted Agreement.
 */
export function selectionToKs001(items,destination) {
  const chosen=items.filter(x=>x.destination===destination);
  if(!['vision','agreement'].includes(destination) || !chosen.length)
    throw new Error('Select at least one item for that destination');
  const stores=groupSelectionBySeller(chosen).length;
  const describe=(item)=>{
    const title=JSON.stringify(safe(item.title,90));
    const seller=JSON.stringify(safe(item.sellerName,55));
    const price=item.unitMinor===null ? 'price to confirm' : safe(item.priceLabel,40)+' listed';
    const note=item.buyerNote ? '; my note: '+safe(item.buyerNote,75) : '';
    return item.quantity+' × '+title+' from '+seller+' ('+price+')'+note;
  };
  const lines=chosen.map(describe);
  const header=destination==='vision'
    ? 'I’m thinking about these Store ideas for my Vision:'
    : chosen.length===1
      ? 'I’d like to talk about this item in my cart:'
      : 'I’d like to go over these items in my cart:';
  const question=destination==='vision'
    ? 'Can we explore how they fit my plans?'
    : stores>1 ? 'Can we look at what I need from each Store?'
      : 'Can we work out what I need?';
  const message=[header,...lines.map(line=>'• '+line),question].join('\n');
  if(message.length>3000)
    throw new Error('This cart has too much detail for one message. Review fewer items at a time.');
  return message;
}
