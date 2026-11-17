/**
 * Owner-preview-only Living Purchase fixture.
 * It is deliberately NOT a SecurePayAPI Agreement DTO, Money ledger, receipt or
 * a replacement for MiniMyAgreements. Storage is limited to this browser tab.
 * Never import into any production AgreementGateway or payment provider.
 */
export const SAMPLE_PURCHASE_KEY='securepay.mini.owner-only-living-purchases.v1';
export const SAMPLE_RAILS=['MPESA','CARD','BANK'];
const MAX_STORED=12;
const DEMOS=[
 {id:'DEMO-ESTATE-041',title:'Garden lighting for home',amountMinor:640000,
  rail:'MPESA',createdAt:'2026-11-12T10:00:00.000Z',fundedAt:'2026-11-12T10:01:00.000Z',
  delivery:'Collection arranged',items:[{sellerKsNumber:'KS90001',sellerName:'Kamakis Traders · Sample',
  title:'Solar wall light',quantity:2,amountMinor:640000}],
  progress:[{title:'Example funding confirmed',status:'done'},
    {title:'Trader preparing your lights',status:'current'},
    {title:'Collection and handover',status:'upcoming'}]},
 {id:'DEMO-SERVICE-042',title:'Garden care arrangement',amountMinor:350000,
  rail:'BANK',createdAt:'2026-11-11T09:00:00.000Z',fundedAt:'2026-11-11T09:05:00.000Z',
  delivery:'Appointment to be arranged',items:[{sellerKsNumber:'KS90006',
   sellerName:'Ruiru Field Services · Sample',title:'Garden maintenance visit',quantity:1,amountMinor:350000}],
  progress:[{title:'Example funding confirmed',status:'done'},
    {title:'Agree visit time with provider',status:'current'},
    {title:'Service and evidence of completion',status:'upcoming'}]}
];
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
 Array.isArray(x.items)&&x.items.length>0&&x.items.length<=21&&x.items.every(validItem)&&
 Array.isArray(x.progress)&&x.progress.length<=20&&x.progress.every(p=>
 p&&typeof p.title==='string'&&p.title.length<160&&['done','current','upcoming'].includes(p.status)));
}
export function sampleAgreementTitle(lines){
 if(!Array.isArray(lines)||!lines.length)return 'Your purchase';
 return lines.length===1?lines[0].title:lines[0].title+' + '+(lines.length-1)+' more';
}
export function makeSampleLivingPurchase({lines,rail,delivery,deliveryFeeMinor=0,deliveryProvider=null,now=new Date()}){
 if(!Array.isArray(lines)||!lines.length||lines.length>20||!SAMPLE_RAILS.includes(rail)||
    !Number.isSafeInteger(deliveryFeeMinor)||deliveryFeeMinor<0||
    !lines.every(x=>validItem({...x,amountMinor:x.priceMinor})))return null;
 const items=lines.map(l=>({
  sellerKsNumber:l.sellerKsNumber,sellerName:l.sellerName,title:l.title,
  quantity:l.quantity,amountMinor:l.priceMinor*l.quantity,
 }));
 if(deliveryProvider==='KS90004'&&deliveryFeeMinor>0)
  items.push({sellerKsNumber:'KS90004',sellerName:'Kamakis Transport · Sample',
    title:'One example delivery',quantity:1,amountMinor:deliveryFeeMinor});
 if(deliveryProvider==='SELLERS'&&deliveryFeeMinor>0){
  const sellers=[...new Set(lines.map(l=>l.sellerKsNumber))];
  const perSeller=Math.floor(deliveryFeeMinor/sellers.length);
  sellers.forEach((seller,i)=>items.push({
   sellerKsNumber:seller,sellerName:lines.find(l=>l.sellerKsNumber===seller).sellerName,
   title:'Separate example delivery by this Store',quantity:1,
   amountMinor:i===sellers.length-1?
     deliveryFeeMinor-perSeller*(sellers.length-1):perSeller,
  }));
 }
 const total=items.reduce((acc,l)=>acc+l.amountMinor,0);
 if(!Number.isSafeInteger(total))return null;
 const ts=now instanceof Date&&Number.isFinite(now.getTime())?now.toISOString():new Date().toISOString();
 const ref='DEMO-'+ts.replace(/[-:.TZ]/g,'').slice(0,14)+'-'+String(Math.floor(Math.random()*1e7)).padStart(7,'0');
 const purchase={id:ref,title:sampleAgreementTitle(lines),amountMinor:total,rail,createdAt:ts,
  fundedAt:ts,delivery:String(delivery||'To be arranged').slice(0,220),
  items,progress:[
    {title:'Mock payment confirmation received',status:'done'},
    ...[...new Set(items.map(x=>x.sellerKsNumber))].map(seller=>({
      title:'Fulfilment by '+items.find(x=>x.sellerKsNumber===seller).sellerName.replace(/\s*·\s*Sample$/,''),
      status:'current',
    })),
    {title:'Confirm delivery or service completion',status:'upcoming'},
  ]};
 return validSamplePurchase(purchase)?purchase:null;
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
 const current=[record,...previously].slice(0,MAX_STORED);
 try{storage?.setItem(SAMPLE_PURCHASE_KEY,JSON.stringify(current));}catch{/* tab may deny storage */}
 return [...current,...DEMOS];
}
