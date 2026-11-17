import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { PublicOfferView, PublicStoreView } from '../api/securepay/store/dto';

type Visual={src:string;attribution:string;emoji:string;tone:string};
const commons=(file:string)=>'https://commons.wikimedia.org/wiki/Special:FilePath/'+file+'?width=700';
const photos: {match:RegExp;file:string;attribution:string;emoji:string;tone:string}[]=[
 {match:/solar irrigation water pump/i,file:'Solar_water_pump_and_well.jpg',attribution:'Shailsh Telang / Wikimedia Commons (CC BY-SA)',emoji:'💧',tone:'lagoon'},
 {match:/water pump maintenance|pump installation/i,file:'Mini_irrigation_system_for_gardens.jpg',attribution:'Chinmayee Mishra / Wikimedia Commons (CC BY-SA)',emoji:'🛠️',tone:'lagoon'},
 {match:/cement/i,file:'Cement_bags.jpg',attribution:'StaraBlazkova / Wikimedia Commons (CC BY-SA)',emoji:'🧱',tone:'clay'},
 {match:/garden hose/i,file:'Garden_hose.jpg',attribution:'Nandhp / Wikimedia Commons (CC BY-SA)',emoji:'🌿',tone:'meadow'},
 {match:/tractor/i,file:'Tractor_on_a_field.jpg',attribution:'Sanzzu / Wikimedia Commons (CC BY-SA)',emoji:'🚜',tone:'meadow'},
 {match:/chair/i,file:'Stacked_chairs_01.jpg',attribution:'Kritzolina / Wikimedia Commons (CC BY-SA)',emoji:'🪑',tone:'sunset'},
 {match:/garden maintenance/i,file:'Mini_irrigation_system_for_gardens.jpg',attribution:'Chinmayee Mishra / Wikimedia Commons (CC BY-SA)',emoji:'🌱',tone:'meadow'},
];
export function shopTone(store:Pick<PublicStoreView,'canonicalKsNumber'|'profile'>):string {
  if(store.canonicalKsNumber==='KS90002'||store.canonicalKsNumber==='KS90003')return 'lagoon';
  if(store.canonicalKsNumber==='KS90004')return 'marigold';
  if(store.canonicalKsNumber==='KS90005')return 'sunset';
  if(store.canonicalKsNumber==='KS90006')return 'meadow';
  if(store.canonicalKsNumber==='KS90001')return 'clay';
  const preset=(store.profile.storefrontTheme||'').toUpperCase();
  return preset==='SUNSET'?'sunset':preset==='OCEAN'?'lagoon':preset==='EARTH'?'clay':'meadow';
}
function trustedMedia(ref:string):boolean {
  try{
    const u=new URL(ref,window.location.origin);
    return (u.protocol==='https:'&&[
      'securepay.ke','www.securepay.ke','images.unsplash.com','upload.wikimedia.org',
      'commons.wikimedia.org'
    ].includes(u.hostname))||(u.origin===window.location.origin&&u.pathname.startsWith('/uploads/'));
  }catch {return false;}
}
function visualFor(offer:PublicOfferView,playground:boolean):Visual{
  // Product media only when an actual permitted Store URL was supplied.
  const direct=offer.mediaRefs.find(ref=>typeof ref==='string'&&trustedMedia(ref));
  const row=playground?photos.find(p=>p.match.test(offer.title)):undefined;
  return {
    src:direct|| (row?commons(row.file):''),
    attribution:direct?'Store-provided image':row?.attribution||'',
    emoji:row?.emoji || (/solar|light/i.test(offer.title)?'☀️':
      /deliver|transport/i.test(offer.title)?'🚚':
      /table/i.test(offer.title)?'🪑':
      /service|install|repair/i.test(offer.title)?'🛠️':
      offer.kind==='SERVICE'?'✨':'📦'),
    tone:row?.tone||'meadow'
  };
}
export function MiniOfferPhoto({offer,playground,large=false}:{
 offer:PublicOfferView;playground:boolean;large?:boolean;
}) {
 const [failed,setFailed]=useState(false);
 const v=visualFor(offer,playground);
 return <div className={'spm-shop-photo spm-shop-tone-'+v.tone+(large?' spm-shop-photo-large':'')}>
   {v.src&&!failed?<img src={v.src} alt={playground?'Illustrative sample photo for '+offer.title:offer.title}
     decoding="async" loading="lazy" referrerPolicy="no-referrer"
     onError={()=>setFailed(true)}/>:
     <span className="spm-shop-photo-emoji" role="img" aria-label={offer.title}>{v.emoji}</span>}
   {playground&&v.src&&!failed&&<small className="spm-shop-photo-flag">Illustrative</small>}
 </div>;
}
export function miniOfferPhotoAttribution(offer:PublicOfferView,playground:boolean){
 return visualFor(offer,playground).attribution;
}
