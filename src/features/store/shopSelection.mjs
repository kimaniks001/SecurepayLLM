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

/** Explicit human-selected collection; informative first-party draft only. */
export function selectionToKs001(items,destination) {
  const chosen=items.filter(x=>x.destination===destination);
  if (!['vision','agreement'].includes(destination) || !chosen.length)
    throw new Error('Select at least one item for that destination');
  const intent = destination==='vision'
    ? 'I would like to consider these Store offers for my Vision. This is inspiration only, not a saved Dream.'
    : 'I have chosen these Store offers to consider for a Fair Trade Agreement. This is a draft request, not acceptance.';
  const lines=chosen.map((item,i)=>{
    const listed=item.unitMinor===null?'price not established':item.priceLabel+' (seller-listed, unconfirmed)';
    return (i+1)+'. '+JSON.stringify(item.title)+' from '+JSON.stringify(item.sellerName)+
      ' (offer '+JSON.stringify(item.offerId)+', seller '+JSON.stringify(item.sellerKsNumber)+
      '), quantity '+item.quantity+', '+listed+'.';
  });
  const instruction = destination==='vision'
    ? 'Help me explore how these fit my Vision. Do not claim they were saved on my Vision Board.'
    : 'Help me clarify scope, prices, availability, delivery, separate sellers and necessary Agreement terms before anything is accepted.';
  const message = [intent,...lines,instruction,
    'Reverify every offer with the authorised Store source. The total is provisional, and no booking, agreement, payment or funding is authorised.'].join('\n');
  if(message.length > 1200)throw new Error('This selection is too long for one KS001 turn. Split the items into smaller groups.');
  return message;
}
