import {useState} from 'react';
import {
  ArrowLeft,ArrowRight,Check,MapPin,Minus,Plus,ShoppingBag,Store,ChevronRight
} from 'lucide-react';
import type {PublicOfferView,PublicStoreView,PublicSearchResultView} from '../api/securepay/store/dto';
import {MiniOfferPhoto,miniOfferPhotoAttribution,shopTone} from './MiniStoreVisuals';

const price=(minor:number|null,currency:string)=>
  minor===null?'Ask for a price':(currency==='KES'?'KSh ':currency+' ')+
  (minor/100).toLocaleString('en-KE',{maximumFractionDigits:0});

function nameOnly(name:string){return name.replace(/\s*·\s*Sample(?: Store)?$/i,'');}
export function MiniShopDiscovery({results,onOpen,playground,onBack,
  label,cartCount,onBasket}:{
  results:PublicSearchResultView[];onOpen:(ks:string)=>void;playground:boolean;
  onBack:()=>void;label:string;cartCount:number;onBasket:()=>void;
}){
 const sellers=[...new Set(results.map(r=>r.canonicalKsNumber))];
 return <div className="spm-shop-discovery">
   <div className="spm-shop-topline">
     <button type="button" className="spm-shop-back" onClick={onBack} aria-label="Back to Mini"><ArrowLeft size={19}/></button>
     <span>Discover</span>
     <button className="spm-shop-cart-icon" type="button" onClick={onBasket} aria-label={'Basket with '+cartCount+' items'}>
       <ShoppingBag size={19}/>{cartCount>0&&<b>{cartCount}</b>}
     </button>
   </div>
   <div className="spm-shop-discover-heading">
      <small>{playground?'THE SAMPLE MARKETPLACE':'EXPLORE STORES'}</small>
      <h1>Find something lovely. Find someone good.</h1>
      <p>Browse goods and services from independent Stores. Choose what you want first.</p>
   </div>
   {playground&&<p className="spm-shop-demo-flag">Sample Stores and prices only · No real stock or payment</p>}
   {!!label&&<h2 className="spm-shop-section-title">{label}</h2>}
   {sellers.length>0?<div className="spm-shop-store-list">
      {sellers.map(ks=>{
        const matches=results.filter(r=>r.canonicalKsNumber===ks);
        const first=matches[0];
        const sample={canonicalKsNumber:ks,profile:{storefrontTheme:'FOREST'}} as PublicStoreView;
        const tone=shopTone(sample);
        return <button type="button" className={'spm-shop-discovery-card spm-shop-tone-'+tone}
          key={ks} onClick={()=>onOpen(ks)}>
          <MiniOfferPhoto offer={first.offer} playground={playground}/>
          <span className="spm-shop-discovery-copy">
            <small>{first.locationLabel||'Location not listed'}</small>
            <strong>{nameOnly(first.displayName)}</strong>
            <span>{matches[0].offer.title}{matches.length>1?' + more':''}</span>
            <span className="spm-shop-discovery-explore">Explore Store <ChevronRight size={15}/></span>
          </span>
        </button>;
      })}
   </div>:<p className="spm-shop-no-results">No Store matches yet. Try another search.</p>}
 </div>;
}

export function MiniShopGallery({store,playground,onBack,cartCount,cartQty,onAdd,onBasket}:{
 store:PublicStoreView;playground:boolean;onBack:()=>void;cartCount:number;
 cartQty:(offerId:string)=>number;onAdd:(offer:PublicOfferView,quantity:number)=>void;
 onBasket:()=>void;
}){
 const [filter,setFilter]=useState<'ALL'|'PRODUCT'|'SERVICE'>('ALL');
 const [selected,setSelected]=useState<PublicOfferView|null>(null);
 const [qty,setQty]=useState(1);
 const [added,setAdded]=useState(false);
 const display=nameOnly(store.displayName);
 const tone=shopTone(store);
 const shown=store.offers.filter(o=>(filter==='ALL'||o.kind===filter)&&
    !['PAUSED','UNAVAILABLE','FULLY_BOOKED','RESTING'].includes(o.availabilityState));
 const open=(o:PublicOfferView)=>{setSelected(o);setQty(1);setAdded(false);};
 const goBack=()=>{if(selected){setSelected(null);setAdded(false);}else onBack();};
 const goods=store.offers.filter(o=>o.kind==='PRODUCT').length;
 const services=store.offers.filter(o=>o.kind==='SERVICE').length;
 const active=selected&&!['UNAVAILABLE','PAUSED','FULLY_BOOKED','RESTING'].includes(selected.availabilityState);
 return <div className={'spm-shop-visit spm-shop-tone-'+tone}>
    <div className="spm-shop-topline">
      <button className="spm-shop-back" type="button" onClick={goBack} aria-label={selected?'Back to this Store':'Back to Stores'}>
        <ArrowLeft size={19}/>
      </button>
      <span>{selected?'Product details':display}</span>
      <button className="spm-shop-cart-icon" type="button" onClick={onBasket} aria-label={'View basket with '+cartCount+' items'}>
        <ShoppingBag size={20}/>{cartCount>0&&<b>{cartCount}</b>}
      </button>
    </div>

    {!selected?<>
      <div className="spm-shop-hero">
        <div className="spm-shop-hero-copy">
          <span className="spm-shop-hero-eyebrow">{playground?'MEET A SAMPLE TRADER':'WELCOME TO THE STORE'}</span>
          <h1>{display}</h1>
          <p>{store.profile.heroHeadline||store.profile.tagline||'Thoughtfully chosen goods and services.'}</p>
          <small><MapPin size={12}/>{store.profile.locationLabel||'Location on request'}</small>
        </div>
        {store.offers[0]&&<div className="spm-shop-hero-visual">
          <MiniOfferPhoto offer={store.offers[0]} playground={playground}/>
        </div>}
      </div>
      <div className="spm-shop-hello">
        <span className="spm-shop-hello-icon"><Store size={17}/></span>
        <span><strong>Have a look around</strong>
          <small>{goods>0?goods+' goods':''}{goods>0&&services>0?' · ':''}{services>0?services+' services':''} · Choose what catches your eye</small>
        </span>
      </div>
      <div className="spm-shop-tabs" role="group" aria-label="Browse goods and services">
        {([['ALL','Everything'],['PRODUCT','Goods'],['SERVICE','Services']] as const).map(([id,label])=>
          <button type="button" key={id} aria-pressed={filter===id}
             onClick={()=>setFilter(id)}>{label}</button>)}
      </div>
      <div className="spm-shop-grid" aria-label="Browse this Store's offers">
        {shown.map(offer=><button className="spm-shop-tile" key={offer.id} type="button" onClick={()=>open(offer)}
          aria-label={offer.title+', '+price(offer.priceMinor,offer.currency)+'. View details'}>
          <MiniOfferPhoto offer={offer} playground={playground}/>
          {cartQty(offer.id)>0&&<span className="spm-shop-picked"><Check size={11}/>{cartQty(offer.id)} in basket</span>}
          <span className="spm-shop-tile-text">
            <small>{offer.kind==='PRODUCT'?'GOOD':'SERVICE'}</small>
            <strong>{offer.title}</strong>
            <b>{price(offer.priceMinor,offer.currency)}</b>
          </span>
        </button>)}
      </div>
      {shown.length===0&&<p className="spm-shop-no-results">Nothing in this category yet. Try Everything.</p>}
      <p className="spm-shop-gentle-note">Browse freely. Your choices remain yours until you review and proceed.</p>
    </>:<>
      <div className="spm-shop-detail">
        <MiniOfferPhoto offer={selected} playground={playground} large/>
        <div className="spm-shop-detail-copy">
          <small>{selected.kind==='SERVICE'?'SERVICE':'GOOD'} · {display}</small>
          <h1>{selected.title}</h1>
          <strong>{price(selected.priceMinor,selected.currency)}</strong>
          <p>{selected.description||'Ask the Store about this offer and the terms that matter to you.'}</p>
          <p className="spm-shop-detail-caution">{playground
            ? 'Illustrative sample: the seller has not accepted or reserved anything.'
            : 'Availability, scope and final terms are confirmed with the seller before an Agreement.'}</p>
          {playground&&miniOfferPhotoAttribution(selected,true)&&<small className="spm-shop-credit">Illustrative image: {miniOfferPhotoAttribution(selected,true)}</small>}
        </div>
        {active&&<>
          <div className="spm-shop-detail-actions">
            <span>Quantity</span>
            <div className="spm-shop-stepper" aria-label="Choose quantity">
              <button type="button" onClick={()=>setQty(Math.max(1,qty-1))} disabled={qty<=1}
                aria-label="Decrease quantity"><Minus size={17}/></button>
              <strong>{qty}</strong>
              <button type="button" onClick={()=>setQty(Math.min(20,qty+1))} disabled={qty>=20}
                aria-label="Increase quantity"><Plus size={17}/></button>
            </div>
          </div>
          <button type="button" className="spm-shop-add-button" onClick={()=>{
              onAdd(selected,qty);setAdded(true);
            }}><ShoppingBag size={18}/>{added?'Add more to basket':'Add to basket'}<ArrowRight size={17}/></button>
          {added&&<div className="spm-shop-added" role="status"><Check size={17}/>
            Added to your basket. <button type="button" onClick={onBasket}>View basket</button>
          </div>}
        </>}
        <button type="button" className="spm-shop-back-to-grid" onClick={goBack}>Keep browsing this Store</button>
      </div>
    </>}
    {cartCount>0&&<button type="button" className="spm-shop-bottom-basket" onClick={onBasket}>
      <span className="spm-shop-basket-count"><ShoppingBag size={18}/>{cartCount}</span>
      <span><strong>View your basket</strong><small>Your choices are adding up</small></span>
      <ArrowRight size={20}/>
    </button>}
  </div>;
}
