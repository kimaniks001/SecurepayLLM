import type {BusinessDemo,Listing} from './MiniBusinessDemoModel';
import type {StoreGateway} from '../api/securepay/store';
import type {PublicOfferView,PublicStoreView,PublicSearchResultView} from '../api/securepay/store/dto';

/**
 * Owner-only sample Store catalogue. This is a local READ-ONLY replacement for
 * the StoreGateway public endpoints, not a seeded production database.
 * It deliberately has no API token, HTTP client, booking or payment handler.
 * The first store mirrors Mini Business Settings in-memory demo state so a
 * sample merchant can publish/edit an offer and then find it as a buyer.
 */
const DATE='2026-11-17T06:00:00.000Z';
const id=(serial:number)=>'00000000-0000-4000-8000-'+String(serial).padStart(12,'0');

function offer(serial:number,kind:'PRODUCT'|'SERVICE',title:string,description:string,
  amount:number|null,quantity:number|null=null):PublicOfferView {
  return {id:id(serial),kind,title,description,priceMinor:amount===null?null:amount*100,
    currency:'KES',quantityAvailable:quantity,
    availabilityState:kind==='PRODUCT'?'AVAILABLE':'TAKING_WORK',
    availabilityConfirmedAt:null,mediaRefs:[],updatedAt:DATE};
}
function store(ks:string,name:string,location:string,tagline:string,
  offers:PublicOfferView[]):PublicStoreView {
  return {canonicalKsNumber:ks,displayName:name,identityType:'BUSINESS',
    status:'ACTIVE',
    profile:{tagline,about:'Fictional sample merchant for SecurePay Mini testing only.',
      locationLabel:location,heroHeadline:null,
      storefrontPreset:'MERCHANT',storefrontTheme:'FOREST',updatedAt:DATE},
    offers};
}
const OTHERS:PublicStoreView[]=[
  store('KS90002','Ruiru Pump House · Sample','Kamakis, Kiambu','Water pumps and accessories',[
    offer(90021,'PRODUCT','Solar irrigation water pump',
      'Example pump. Installation and annual maintenance are separate services.',35000,4),
    offer(90022,'PRODUCT','Garden hose 20 metres','Sample water hose for gardening.',2200,15),
    offer(90023,'PRODUCT','500-litre water tank','Sample tank for domestic and garden water storage.',6800,6),
    offer(90024,'PRODUCT','Pump controller','Example controller; compatibility must be agreed.',3200,8),
    offer(90025,'PRODUCT','Drip irrigation kit','Sample drip kit for a small garden.',4800,10),
    offer(90026,'PRODUCT','Water pipe fittings set','Sample connectors for irrigation installations.',1250,20)]),
  store('KS90003','Pump Care Services · Sample','Ruiru, Kiambu','Installation and one-year maintenance',[
    offer(90031,'SERVICE','Pump installation','Installation appointment; final date to be agreed.',4000),
    offer(90032,'SERVICE','Water pump maintenance · 12 months',
      'Sample one-year service. Visits, start date and exclusions require agreement.',6000),
    offer(90033,'SERVICE','Pump inspection visit','Sample diagnostic appointment; repairs priced separately.',1800),
    offer(90034,'SERVICE','Irrigation system setup','Sample setup consultation with final scope to agree.',3500),
    offer(90035,'SERVICE','Emergency pump assessment','Illustrative call-out; site availability unverified.',2500)]),
  store('KS90004','Kamakis Transport · Sample','Ruiru, Kiambu','Transport offers need a verified quote',[
    offer(90041,'SERVICE','Collect items from several stores',
      'Example combined pickup and delivery; route and price need quotation.',null),
    offer(90042,'SERVICE','Local delivery of hardware','Route, load and timing need confirmation.',null),
    offer(90043,'SERVICE','Pickup and dispatch service','Fictional collection service; locations and licence eligibility to confirm.',null),
    offer(90044,'SERVICE','Small truck hire with driver','Example transport enquiry; rate depends on distance and load.',null)]),
  store('KS90005','Njeri Events · Sample','Ruiru, Kiambu','Chairs and event supplies',[
    offer(90051,'PRODUCT','Stacking event chair','Sample stackable event chair.',1600,25),
    offer(90052,'PRODUCT','Folding event table','Example six-person table.',3800,6),
    offer(90053,'PRODUCT','Garden event tent','Sample 4 × 4 metre tent. Setup is separate.',12000,3),
    offer(90054,'PRODUCT','Festoon string lights','Sample outdoor event lights for hire or purchase.',2500,8),
    offer(90055,'SERVICE','Event seating arrangement','Sample arrangement service, layout to agree.',3000)]),
  store('KS90006','Ruiru Field Services · Sample','Gatong’ora, Kiambu','Garden work and hourly equipment',[
    offer(90061,'SERVICE','Tractor hire · per hour','Example KSh 5,000 per hour, actual hours and minimum to agree.',5000),
    offer(90062,'SERVICE','Garden maintenance visit','Example garden work per visit, scope to agree.',3500),
    offer(90063,'SERVICE','Hedge and boundary trimming','Sample work per agreed visit.',2000),
    offer(90064,'SERVICE','Soil preparation by tractor','Example scope-to-agree soil preparation.',4500),
    offer(90065,'SERVICE','Irrigation assessment','Sample on-site consultation.',3000)]),
];

function localOfferId(listing:Listing):string{
  const match=/^(?:o)(\d{1,6})$/.exec(listing.id);
  // Stable preview-only identity; separate namespace from other sample Stores.
  const index=match?Number(match[1]):1;
  return id(91000+index);
}
function dynamicBusiness(demo:BusinessDemo):PublicStoreView{
  const items=demo.offers.filter(o=>o.visible&&o.stockChecked&&o.quantity>0)
    .map((o):PublicOfferView=>({
      id:localOfferId(o),kind:'PRODUCT',title:o.title,description:o.description,
      priceMinor:o.price===null?null:Math.round(o.price*100),currency:'KES',
      quantityAvailable:o.quantity,availabilityState:'AVAILABLE',
      availabilityConfirmedAt:DATE,mediaRefs:[],
      updatedAt:new Date(Date.parse(DATE)+o.version*1000).toISOString(),
    }));
  return store('KS90001',demo.name+' · Sample',demo.place,
    demo.summary||'Sample hardware and supplies',items);
}
export function createMiniTradingSampleStore(demo:BusinessDemo):Pick<StoreGateway,'search'|'store'|'offer'>{
  const catalog=():PublicStoreView[]=>[dynamicBusiness(demo),...OTHERS];
  const findStore=(ks:string)=>{
    const item=catalog().find(s=>s.canonicalKsNumber===ks);
    if(!item)throw new Error('Unknown fictional sample Store');
    return item;
  };
  return {
    search:async params=>{
      const query=(params.category||'').trim().toLowerCase();
      const kind=params.kind;
      const records=catalog().flatMap((item,storeIndex)=>
        item.offers.filter(o=>o.kind===kind&&(!query||
          (o.title+' '+(o.description||'')+' '+item.displayName+' '+item.profile.tagline).toLowerCase().includes(query)))
          .map((offer,offerIndex)=>({storeIndex,offerIndex,
            canonicalKsNumber:item.canonicalKsNumber,displayName:item.displayName,
            locationLabel:item.profile.locationLabel,offer:{...offer}})));
      // Discover different shops first instead of filling the page with a single
      // merchant's first ten offers. Explicit category searches stay relevant.
      if(!query)records.sort((a,b)=>a.offerIndex-b.offerIndex||a.storeIndex-b.storeIndex);
      const results:PublicSearchResultView[]=records.map(({canonicalKsNumber,displayName,locationLabel,offer})=>
        ({canonicalKsNumber,displayName,locationLabel,offer}));
      return results.slice(0,Math.min(10,Math.max(1,params.limit||10)));
    },
    store:async ks=>{
      const s=findStore(ks);
      return {...s,profile:{...s.profile},offers:s.offers.map(o=>({...o}))};
    },
    offer:async (ks,offerId)=>{
      const s=findStore(ks);
      const row=s.offers.find(o=>o.id===offerId);
      if(!row)throw new Error('This sample offer has been removed or unpublished');
      return {canonicalKsNumber:s.canonicalKsNumber,displayName:s.displayName,
        identityType:s.identityType,status:s.status,profile:{...s.profile},offer:{...row}};
    },
  };
}
export const miniTradeSampleSearches=[
  {label:'Solar lighting',query:'solar',kind:'PRODUCT' as const},
  {label:'Pump',query:'pump',kind:'PRODUCT' as const},
  {label:'Cement',query:'cement',kind:'PRODUCT' as const},
  {label:'Maintenance',query:'maintenance',kind:'SERVICE' as const},
  {label:'Delivery',query:'delivery',kind:'SERVICE' as const},
  {label:'Tractor hire',query:'tractor',kind:'SERVICE' as const},
];
