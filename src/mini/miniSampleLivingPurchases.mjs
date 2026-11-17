/**
 * Owner-preview-only Living Purchase fixture.
 * It is deliberately NOT a SecurePayAPI Agreement DTO, Money ledger, receipt or
 * a replacement for MiniMyAgreements. Storage is limited to this browser tab.
 * Never import into any production AgreementGateway or payment provider.
 */
export const SAMPLE_PURCHASE_KEY='securepay.mini.owner-only-living-purchases.v1';
export const SAMPLE_RAILS=['CHOICE_KS_ACCOUNT','MPESA_STK','PESALINK'];
const MAX_STORED=12;
const DEMOS=[
 {id:'DEMO-ESTATE-041',title:'Garden lighting for home',amountMinor:640000,
  rail:'MPESA_STK',createdAt:'2026-11-12T10:00:00.000Z',fundedAt:'2026-11-12T10:01:00.000Z',
  delivery:'Collection arranged',items:[{sellerKsNumber:'KS90001',sellerName:'Kamakis Traders · Sample',
  title:'Solar wall light',quantity:2,amountMinor:640000}],
  progress:[{title:'Example funding confirmed',status:'done'},
    {title:'Trader preparing your lights',status:'current'},
    {title:'Collection and handover',status:'upcoming'}]},
 {id:'DEMO-SERVICE-042',title:'Garden care arrangement',amountMinor:350000,
  rail:'CHOICE_KS_ACCOUNT',createdAt:'2026-11-11T09:00:00.000Z',fundedAt:'2026-11-11T09:05:00.000Z',
  delivery:'Appointment to be arranged',items:[{sellerKsNumber:'KS90006',
   sellerName:'Ruiru Field Services · Sample',title:'Garden maintenance visit',quantity:1,amountMinor:350000}],
  progress:[{title:'Example funding confirmed',status:'done'},
    {title:'Agree visit time with provider',status:'current'},
    {title:'Service and evidence of completion',status:'upcoming'}]}
];
function validTerm(t){
 return t&&typeof t.sellerKsNumber==='string'&&/^KS\d{3,12}$/.test(t.sellerKsNumber)&&
  typeof t.offerId==='string'&&/^[0-9a-f-]{36}$/i.test(t.offerId)&&
  typeof t.offerUpdatedAt==='string'&&t.offerUpdatedAt.length<=70&&
  typeof t.label==='string'&&t.label.length>0&&t.label.length<=180&&
  typeof t.value==='string'&&t.value.length>0&&t.value.length<=240&&
  ['BUYER_PROPOSED','PROVIDER_SAMPLE_REVIEWED'].includes(t.origin);
}
function validItem(x){
 return x&&typeof x.sellerKsNumber==='string'&&/^KS\d{3,12}$/.test(x.sellerKsNumber)&&
  typeof x.sellerName==='string'&&x.sellerName.length<130&&
  typeof x.title==='string'&&x.title.length<180&&
  Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.quantity<=20&&
  Number.isSafeInteger(x.amountMinor)&&x.amountMinor>=0;
}
export function validSamplePurchase(x){
 return !!(x&&typeof x==='object'&&/^DEMO-[\w-]{3,70}$/.test(x.id)&&
 typeof x.title==='string'&&x.title.length<200&&SAMPLE_RAILS.includes(x.rail)&&
 Number.isSafeInteger(x.amountMinor)&&x.amountMinor>=0&&
 typeof x.fundedAt==='string'&&Number.isFinite(Date.parse(x.fundedAt))&&
 typeof x.createdAt==='string'&&Number.isFinite(Date.parse(x.createdAt))&&
 typeof x.delivery==='string'&&x.delivery.length<240&&
 (!x.agreementKind||['PURCHASE','DELIVERY'].includes(x.agreementKind))&&
 (!x.parentId||/^DEMO-[\w-]{3,70}$/.test(x.parentId))&&
 (!x.deliveryTerms||(typeof x.deliveryTerms==='object'&&
   typeof x.deliveryTerms.destination==='string'&&x.deliveryTerms.destination.length<200&&
   typeof x.deliveryTerms.window==='string'&&x.deliveryTerms.window.length<200&&
   Array.isArray(x.deliveryTerms.pickupStores)&&x.deliveryTerms.pickupStores.length<=20&&
   x.deliveryTerms.pickupStores.every(v=>typeof v==='string'&&v.length<180)))&&
 (!x.terms||(Array.isArray(x.terms)&&x.terms.length<=40&&x.terms.every(validTerm)))&&
 Array.isArray(x.items)&&x.items.length>0&&x.items.length<=40&&x.items.every(validItem)&&
 Array.isArray(x.progress)&&x.progress.length<=20&&x.progress.every(p=>
 p&&typeof p.title==='string'&&p.title.length<160&&['done','current','upcoming'].includes(p.status)));
}
export function sampleAgreementTitle(lines){
 if(!Array.isArray(lines)||!lines.length)return 'Your purchase';
 return lines.length===1?lines[0].title:lines[0].title+' + '+(lines.length-1)+' more';
}
export function makeSampleLivingPurchase({lines,rail,delivery,deliveryFeeMinor=0,deliveryProvider=null,deliveryContracts=[],terms=[],now=new Date()}){
 if(!Array.isArray(lines)||!lines.length||lines.length>20||!SAMPLE_RAILS.includes(rail)||
    !Number.isSafeInteger(deliveryFeeMinor)||deliveryFeeMinor<0||
    !lines.every(x=>validItem({...x,amountMinor:x.priceMinor})))return null;
 if(!Array.isArray(terms)||terms.length>40||!terms.every(t=>
     validTerm(t)&&lines.some(l=>l.sellerKsNumber===t.sellerKsNumber&&
       l.offerId===t.offerId&&l.offerUpdatedAt===t.offerUpdatedAt)))return null;
 const items=lines.map(l=>({
  sellerKsNumber:l.sellerKsNumber,sellerName:l.sellerName,title:l.title,
  offerId:l.offerId,offerUpdatedAt:l.offerUpdatedAt,
  quantity:l.quantity,amountMinor:l.priceMinor*l.quantity,
 }));
 if(deliveryProvider==='KS90004'&&deliveryFeeMinor>0){
  const carrier=deliveryContracts.find(c=>c.providerKsNumber==='KS90004');
  if(!carrier)return null;
  items.push({sellerKsNumber:carrier.providerKsNumber,sellerName:carrier.providerName,
    title:'One example delivery',quantity:1,amountMinor:carrier.feeMinor});
 }
 if(deliveryProvider==='SELLERS'&&deliveryFeeMinor>0){
  if(!deliveryContracts.length)return null;
  // Only the contracted delivery providers receive an allocation;
  // purchasing a service from a different merchant does not make them a carrier.
  deliveryContracts.forEach(c=>items.push({
    sellerKsNumber:c.providerKsNumber,sellerName:c.providerName,
    title:'Separate example delivery by this Store',quantity:1,amountMinor:c.feeMinor,
  }));
 }
 if(!Array.isArray(deliveryContracts)||deliveryContracts.length>20||
   (deliveryFeeMinor>0&&!deliveryContracts.length))return null;
 if(deliveryContracts.length&&
   (deliveryContracts.some(c=>!c.providerAccepted||!c.customerApproved||!c.customerApprovalRequired||
     !c.providerKsNumber||!c.destination||!c.window||
     !Array.isArray(c.goods)||!c.goods.length||!Number.isSafeInteger(c.feeMinor))||
    deliveryContracts.reduce((sum,c)=>sum+c.feeMinor,0)!==deliveryFeeMinor))return null;
 const total=items.reduce((acc,l)=>acc+l.amountMinor,0);
 if(!Number.isSafeInteger(total))return null;
 const ts=now instanceof Date&&Number.isFinite(now.getTime())?now.toISOString():new Date().toISOString();
 const ref='DEMO-'+ts.replace(/[-:.TZ]/g,'').slice(0,14)+'-'+String(Math.floor(Math.random()*1e7)).padStart(7,'0');
 const linkedDeliveryAgreements=deliveryContracts.map((c,i)=>({
   id:ref+'-D'+String(i+1),agreementKind:'DELIVERY',parentId:ref,
   title:'Delivery by '+c.providerName.replace(/\s*·\s*Sample$/,''),
   amountMinor:c.feeMinor,rail,createdAt:ts,fundedAt:ts,
   delivery:c.destination,
   deliveryTerms:{destination:c.destination,window:c.window,
     pickupStores:c.pickupStores},
   items:[{sellerKsNumber:c.providerKsNumber,sellerName:c.providerName,
     title:'Delivery of '+c.goods.map(g=>g.quantity+' × '+g.title).join(', ').slice(0,160),
     quantity:1,amountMinor:c.feeMinor}],
   progress:[{title:'Mini delivery Agreement accepted in sample',status:'done'},
     {title:'Provider to confirm the delivery window',status:'current'},
     {title:'Pickup, handover and proof of delivery',status:'upcoming'}],
 }));
 const purchase={id:ref,title:sampleAgreementTitle(lines),amountMinor:total,rail,createdAt:ts,
  fundedAt:ts,delivery:String(delivery||'To be arranged').slice(0,220),
  agreementKind:'PURCHASE',
  linkedDeliveryIds:linkedDeliveryAgreements.map(c=>c.id),
  linkedDeliveryAgreements,
  terms,items,progress:[
    {title:'Mock payment confirmation received',status:'done'},
    ...[...new Set(lines.map(x=>x.sellerKsNumber))].map(seller=>({
      title:'Fulfilment by '+lines.find(x=>x.sellerKsNumber===seller).sellerName.replace(/\s*·\s*Sample$/,''),
      status:'current',
    })),
    ...(deliveryContracts.length?[{title:'Delivery has its own linked Agreement',status:'upcoming'}]:[]),
    {title:'Confirm handover or service completion',status:'upcoming'},
  ]};
 return validSamplePurchase(purchase)&&linkedDeliveryAgreements.every(validSamplePurchase)?purchase:null;
}
export function readMiniSamplePurchases(storage){
 let rows=[];
 try{
  const raw=storage?.getItem(SAMPLE_PURCHASE_KEY);
  const parsed=raw?JSON.parse(raw):[];
  if(Array.isArray(parsed))rows=parsed.filter(validSamplePurchase).slice(0,MAX_STORED);
 }catch {/* empty on denied/corrupt storage */}
 return [...rows,...DEMOS.filter(x=>!rows.some(p=>p.id===x.id))];
}
export function recordMiniSamplePurchase(storage,record){
 if(!validSamplePurchase(record))return readMiniSamplePurchases(storage);
 const previously=readMiniSamplePurchases(storage).filter(x=>x.id!==record.id&&
  !DEMOS.some(d=>d.id===x.id));
 const children=Array.isArray(record.linkedDeliveryAgreements)?
   record.linkedDeliveryAgreements.filter(c=>validSamplePurchase(c)&&
     c.agreementKind==='DELIVERY'&&c.parentId===record.id):[];
 const current=[record,...children,...previously.filter(x=>!children.some(c=>c.id===x.id))]
   .slice(0,MAX_STORED);
 try{storage?.setItem(SAMPLE_PURCHASE_KEY,JSON.stringify(current));}catch{/* tab may deny storage */}
 return [...current,...DEMOS];
}
