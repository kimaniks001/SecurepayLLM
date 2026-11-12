import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, RefreshCcw, Store, ShieldCheck } from 'lucide-react';
import type { StoreGateway } from '../api/securepay/store';
import type { StoreOfferFulfilmentResponse } from '../api/securepay/store/dto';
import type { BusinessGateway, BusinessRepresentationDto } from '../api/securepay/business';
import { createStoreController } from '../features/store/controller';
import { availabilityOptionsFor } from '../features/store/view';

/**
 * M5B: the existing StoreController remains the sole Store update engine.
 * This is a compact on-demand view, never a seller quote acceptance or a
 * payment/Agreement version mutation. Business permission is checked by
 * the canonical BusinessGateway before loading and again before fulfilment.
 */
export function MiniSellerStore({storeGateway,businessGateway,prepare,onBack,onInvitations}:{
  storeGateway:StoreGateway;
  businessGateway:Pick<BusinessGateway,'mine'|'representation'>;
  prepare:()=>Promise<unknown>;
  onBack:()=>void;
  onInvitations:()=>void;
}){
  const controller=useMemo(()=>createStoreController(storeGateway),[storeGateway]);
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [businesses,setBusinesses]=useState<BusinessRepresentationDto[]>([]);
  const [chooser,setChooser]=useState<'loading'|'ready'|'error'>('loading');
  const [selectedOffer,setSelectedOffer]=useState<string|null>(null);
  const [fulfilment,setFulfilment]=useState<StoreOfferFulfilmentResponse|null>(null);
  const [deliveryBusy,setDeliveryBusy]=useState(false);
  const [deliveryError,setDeliveryError]=useState('');
  const [deliveryNotice,setDeliveryNotice]=useState('');
  const [deliveryAvailable,setDeliveryAvailable]=useState<'unknown'|'yes'|'no'>('unknown');
  const [leadHours,setLeadHours]=useState('');
  const [deliveryTerms,setDeliveryTerms]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      setChooser('loading');
      try{
        await prepare();
        const result=await businessGateway.mine();
        if(!Array.isArray(result))throw Error('Not a business list');
        if(alive){setBusinesses(result.filter(b=>b.canActFor && b.identityType==='BUSINESS'));
          setChooser('ready');}
      }catch{if(alive){setBusinesses([]);setChooser('error');}}
    };
    void load();
    return()=>{alive=false;};
  },[businessGateway,prepare]);

  const personal=async()=>{
    setSelectedOffer(null);setFulfilment(null);setNotice('');
    try{await prepare();await controller.enterManagement();}
    catch{setNotice('SecurePay could not verify your own Store. No offer was changed.');}
  };
  const business=async(b:BusinessRepresentationDto)=>{
    setSelectedOffer(null);setFulfilment(null);setNotice('');
    try{
      await prepare();
      const verified=await businessGateway.representation(b.businessKsNumber);
      if(verified.businessKsNumber!==b.businessKsNumber || !verified.canActFor ||
        verified.identityType!=='BUSINESS')throw Error('Representation not confirmed');
      await controller.enterBusinessManagement(verified.businessKsNumber,
        verified.displayName||verified.businessKsNumber);
    }catch{setNotice('SecurePay could not verify your authority for that business Store. Nothing was changed.');}
  };
  const opened=state.mine.status==='ready'?state.mine.data:null;
  const offer=opened?.raw.find(o=>o.id===selectedOffer)||null;
  const storeBusiness=state.managedBusiness;

  const openOffer=async(id:string)=>{
    const raw=opened?.raw.find(o=>o.id===id);
    if(!raw)return;
    setSelectedOffer(id);setDeliveryNotice('');setDeliveryError('');setFulfilment(null);
    controller.openBuilder(id);
    if(!storeBusiness)return;
    try{
      await prepare();
      const d=await storeGateway.businessOfferFulfilment(storeBusiness.ksNumber,id);
      if(!d||d.offerId!==id)throw Error('Unverified offer fulfilment');
      setFulfilment(d);
      setDeliveryAvailable(d.deliveryAvailable===true?'yes':d.deliveryAvailable===false?'no':'unknown');
      setLeadHours(d.leadTimeHours===null?'':String(d.leadTimeHours));
      setDeliveryTerms(d.fulfilmentConditions||'');
    }catch{
      setDeliveryError('Delivery details could not be verified. No delivery update can be submitted.');
    }
  };

  const savePublished=async()=>{
    if(!offer||!state.draft.title.trim()||state.draftBusy)return;
    setNotice('');
    try{
      await prepare();
      await controller.submitDraft();
      // The StoreController reloads server records; an update is not a
      // buyer quote or a revised Agreement version.
      setSelectedOffer(null);setFulfilment(null);
      setNotice('Check the refreshed published offer. This is not a buyer-approved order.');
    }catch{setNotice('SecurePay could not verify this update. Check the Store before relying on it.');}
  };
  const confirmAvailability=async(id:string)=>{
    setNotice('');
    try{await prepare();await controller.confirmAvailability(id);
      setNotice('SecurePay was asked to confirm the published availability. Recheck the latest Store record; no order was accepted.');
    }catch{setNotice('Availability could not be verified. No buyer commitment was made.');}
  };
  const publishDelivery=async()=>{
    if(!offer || !storeBusiness || !fulfilment || deliveryBusy)return;
    const hrs=leadHours.trim()===''?null:Number(leadHours);
    if(hrs!==null && (!Number.isInteger(hrs)||hrs<0||hrs>8760)){
      setDeliveryError('Enter a whole number of hours, up to 8760.');return;
    }
    setDeliveryBusy(true);setDeliveryError('');setDeliveryNotice('');
    try{
      await prepare();
      const actor=await businessGateway.representation(storeBusiness.ksNumber);
      if(!actor.canActFor||actor.businessKsNumber!==storeBusiness.ksNumber)
        throw Error('Business authority unavailable');
      const result=await storeGateway.updateBusinessOfferFulfilment(
        storeBusiness.ksNumber,offer.id,{
          deliveryAvailable:deliveryAvailable==='unknown'?null:deliveryAvailable==='yes',
          leadTimeHours:hrs,
          fulfilmentConditions:deliveryTerms.trim().slice(0,500)||null,
        });
      if(result.offerId!==offer.id)throw Error('Wrong offer returned');
      setFulfilment(result);
      setDeliveryNotice('Delivery information is published for this Store offer. The seller has NOT agreed to deliver this buyer’s order.');
    }catch{
      setDeliveryError('SecurePay could not confirm the delivery update. No buyer commitment was created.');
    }finally{setDeliveryBusy(false);}
  };

  return <section className="spm-mini-owned-list spm-mini-seller-store"
    aria-label="My Store: published offers and availability">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={16}/>Back to KS001</button>
    <div className="spm-persona"><Store size={16}/>My Store</div>
    <p>Manage what your Store publishes. This is separate from accepting a buyer’s Agreement.</p>
    {chooser==='loading'&&<p role="status">Checking the Stores you may manage…</p>}
    {chooser==='error'&&<p role="alert">Business ownership could not be verified. Business management is unavailable.</p>}
    <div className="spm-mini-owned-actions">
      <button type="button" className="spm-secondary" onClick={()=>void personal()}>
        My personal Store
      </button>
      {chooser==='ready'&&businesses.map(b=><button type="button" className="spm-secondary"
        key={b.businessKsNumber} onClick={()=>void business(b)}>
        {b.displayName||'Business Store'} · {b.businessKsNumber}
      </button>)}
    </div>
    {state.mine.status==='loading'&&<p role="status">Checking your Store offers…</p>}
    {state.mine.status==='error'&&<p role="alert">This Store could not be loaded or managed with your account.</p>}
    {notice&&<p role="status">{notice}</p>}
    {opened&&<>
      <strong>{storeBusiness?storeBusiness.displayName:'My personal Store'}</strong>
      {!opened.raw.length&&<p>This Store has no offers to review.</p>}
      {opened.raw.map(o=><div key={o.id} className="spm-mini-owned-item">
        <div><strong>{o.title}</strong>
          <small>{o.currency} {o.priceMinor===null?'Price to confirm':(o.priceMinor/100).toFixed(2)}
            {' · '}{o.quantityAvailable===null?'Quantity not published':o.quantityAvailable+' listed'}
          </small>
          <small>{o.availabilityState.replace(/_/g,' ')}
            {o.availabilityConfirmedAt?' · Availability last confirmed '+new Date(o.availabilityConfirmedAt).toLocaleDateString('en-KE'):''}
          </small>
        </div>
        <button type="button" className="spm-secondary" onClick={()=>void openOffer(o.id)}>
          Review <ArrowRight size={14}/>
        </button>
      </div>)}
      {offer&&state.view==='builder'&&<div className="spm-mini-seller-editor">
        <strong>Published offer · {offer.title}</strong>
        <label className="spm-label" htmlFor="m5b-price">Displayed price in {offer.currency}</label>
        <input id="m5b-price" className="spm-field" inputMode="decimal" type="number" min="0"
          step="0.01" disabled={state.draftBusy}
          value={state.draft.priceMinor===null?'':String(state.draft.priceMinor/100)}
          onChange={e=>{
            const n=e.target.value===''?null:Math.round(Number(e.target.value)*100);
            if(n===null||Number.isSafeInteger(n)&&n>=0)controller.setDraft({priceMinor:n});
          }}/>
        <label className="spm-label" htmlFor="m5b-quantity">Quantity published</label>
        <input id="m5b-quantity" className="spm-field" type="number" min="0" max="1000000"
          disabled={state.draftBusy} value={state.draft.quantityAvailable??''}
          onChange={e=>{
            const n=e.target.value===''?null:Number(e.target.value);
            if(n===null||Number.isInteger(n)&&n>=0&&n<=1000000)
              controller.setDraft({quantityAvailable:n});
          }}/>
        <label className="spm-label" htmlFor="m5b-availability">Published availability</label>
        <select id="m5b-availability" className="spm-field" disabled={state.draftBusy}
          value={state.draft.availabilityState}
          onChange={e=>controller.setDraft({
            availabilityState:e.target.value as typeof state.draft.availabilityState})}>
          {availabilityOptionsFor(state.draft.kind).map(v=>
            <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
        </select>
        {state.draftError&&<p role="alert">{state.draftError}</p>}
        <button type="button" className="spm-primary" disabled={state.draftBusy}
          onClick={()=>void savePublished()}>
          {state.draftBusy?'Checking…':'Update published offer'}
        </button>
        {storeBusiness&&fulfilment&&<div className="spm-mini-seller-editor">
          <strong>Delivery information · published, not booked</strong>
          <label className="spm-label" htmlFor="m5b-delivery">Delivery offered?</label>
          <select id="m5b-delivery" className="spm-field" value={deliveryAvailable}
            onChange={e=>setDeliveryAvailable(e.target.value as typeof deliveryAvailable)}>
            <option value="unknown">Not specified</option>
            <option value="yes">Yes, subject to agreement</option>
            <option value="no">No</option>
          </select>
          <label className="spm-label" htmlFor="m5b-lead">Estimated preparation hours</label>
          <input id="m5b-lead" className="spm-field" type="number" min="0" max="8760"
            value={leadHours} onChange={e=>setLeadHours(e.target.value)}/>
          <label className="spm-label" htmlFor="m5b-terms">Published delivery conditions</label>
          <textarea id="m5b-terms" className="spm-field" rows={2} maxLength={500}
            value={deliveryTerms} onChange={e=>setDeliveryTerms(e.target.value)}/>
          <button type="button" className="spm-secondary" disabled={deliveryBusy}
            onClick={()=>void publishDelivery()}>
            {deliveryBusy?'Checking…':'Publish delivery information'}
          </button>
        </div>}
        {deliveryError&&<p role="alert">{deliveryError}</p>}
        {deliveryNotice&&<p role="status">{deliveryNotice}</p>}
      </div>}
      <button type="button" className="spm-secondary"
        onClick={()=>void confirmAvailability(offer?.id||opened.raw[0]?.id)}
        disabled={!offer?.id}> <ShieldCheck size={15}/>Confirm this listing’s availability</button>
      <button type="button" className="spm-quiet-button"
        onClick={()=>{setSelectedOffer(null);setFulfilment(null);controller.refreshMine();}}>
        <RefreshCcw size={14}/>Recheck my Store
      </button>
    </>}
    <div className="spm-mini-seller-next">
      <strong>When a buyer asks to purchase</strong>
      <p>Review the invitation and exact Agreement version before agreeing. Updating a listing is not acceptance, and delivery is not booked.</p>
      <button type="button" className="spm-secondary" onClick={onInvitations}>
        Review my Agreement invitations <ArrowRight size={14}/>
      </button>
    </div>
  </section>;
}
