import {useState} from 'react';
import {EyeOff, ShieldCheck} from 'lucide-react';
import type {StoreGateway} from '../api/securepay/store';
import type {StoreOfferResponse} from '../api/securepay/store/dto';
import type {BusinessGateway} from '../api/securepay/business';
import {miniSellerVisibilityFresh,miniSellerVisibilityReceipt} from './miniSellerVisibilityPolicy.mjs';

type Props={
  offers:StoreOfferResponse[];
  businessKsNumber:string|null;
  storeGateway:Pick<StoreGateway,
    'myOffers'|'businessOffers'|'makeMyOfferPrivate'|'makeBusinessOfferPrivate'>;
  businessGateway:Pick<BusinessGateway,'representation'>;
  prepare:()=>Promise<unknown>;
  onRefresh:()=>Promise<void>;
};

/** Only an explicit seller decision changes PUBLIC visibility.
 * Other discovery channels (estate directory, community network, KS001
 * recommendations) require separately consented and enforced backend policy.
 */
export function MiniSellerVisibilityControls({
  offers,businessKsNumber,storeGateway,businessGateway,prepare,onRefresh
}:Props){
  const [chosen,setChosen]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const visible=offers.filter(o=>o.published===true);
  const offer=visible.find(o=>o.id===chosen)??null;
  const makePrivate=async()=>{
    if(busy||!offer)return;
    const selected=offer;
    const ks=businessKsNumber;
    setBusy(true);setMessage('');
    try{
      await prepare();
      if(ks){
        const authority=await businessGateway.representation(ks);
        if(authority.businessKsNumber!==ks||authority.identityType!=='BUSINESS'||
           authority.relationship!=='ADMINISTRATOR'||!authority.canActFor)
          throw new Error('Business authority changed');
      }
      const currentList=ks?await storeGateway.businessOffers(ks):await storeGateway.myOffers();
      const matching=currentList.filter(o=>o.id===selected.id);
      if(matching.length!==1||!miniSellerVisibilityFresh(selected,matching[0]).ok)
        throw new Error('Listing changed since review');
      const result=ks
        ?await storeGateway.makeBusinessOfferPrivate(ks,selected.id,{
            expectedUpdatedAt:selected.updatedAt,sellerConfirmsHide:true
          })
        :await storeGateway.makeMyOfferPrivate(selected.id,{
            expectedUpdatedAt:selected.updatedAt,sellerConfirmsHide:true
          });
      if(!miniSellerVisibilityReceipt(result,selected.id).ok)
        throw new Error('Missing canonical privacy receipt');
      setChosen(null);
      await onRefresh();
      setMessage('SecurePay confirmed this listing is private. It is no longer offered in public Store search. Existing Agreements remain unchanged.');
    }catch{
      setMessage('SecurePay could not confirm the visibility change. Check My Store before trying again. No existing Agreement was changed.');
      try{await onRefresh();}catch{/* Keep the uncertain result explicit. */}
    }finally{setBusy(false);}
  };
  return <div className="spm-sell-review-card" data-mini-seller-visibility="verified">
    <strong><EyeOff size={16}/> Who can see my listings?</strong>
    <p>Only offers you publish are visible in Store search. You can make a published listing private without deleting it.</p>
    <small>Changing visibility does not cancel a buyer's Agreement or automatically remove links already shared elsewhere.</small>
    {!visible.length&&<small>No published offers in this Store.</small>}
    {!!visible.length&&<div className="spm-sell-visibility-offers">
      {visible.map(o=><div key={o.id} className="spm-sell-visibility-offer">
        <div><strong>{o.title}</strong><small>Currently public · {o.availabilityState.replace(/_/g,' ').toLowerCase()}</small></div>
        {chosen!==o.id&&<button type="button" className="spm-secondary"
          disabled={busy} onClick={()=>{setChosen(o.id);setMessage('');}}>
          Make private
        </button>}
      </div>)}
    </div>}
    {offer&&<div className="spm-sell-visibility-confirm">
      <strong><ShieldCheck size={15}/> Make “{offer.title}” private?</strong>
      <p>Buyers will no longer find this listing through public Store search. It stays in My Store. You must review it separately before publishing again. Existing Agreements are not cancelled.</p>
      <div className="spm-sell-pill-row">
        <button type="button" className="spm-secondary" disabled={busy} onClick={()=>setChosen(null)}>Keep public</button>
        <button type="button" className="spm-secondary" disabled={busy} onClick={()=>void makePrivate()}>
          {busy?'Checking…':'Yes, make private'}
        </button>
      </div>
    </div>}
    {message&&<p className="spm-sell-hint" role="status">{message}</p>}
    <small>Community directories, other apps, QR distribution and eTIMS are separate settings. This control changes only this Store offer's public status.</small>
  </div>;
}
