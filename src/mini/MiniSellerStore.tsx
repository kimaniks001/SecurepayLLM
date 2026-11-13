import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, RefreshCcw, Store, ShieldCheck } from 'lucide-react';
import type { StoreGateway } from '../api/securepay/store';
import type { SellerQuoteRecord, StoreQuotationGateway } from '../api/securepay/store-quotations';
import { quotedRecordProof } from '../api/securepay/store-quotations';
import type { StoreOfferFulfilmentResponse } from '../api/securepay/store/dto';
import type { BusinessGateway, BusinessRepresentationDto } from '../api/securepay/business';
import { createStoreController } from '../features/store/controller';
import { availabilityOptionsFor } from '../features/store/view';
import { miniSellerQuotationDraft } from './miniSellerQuotationDraft.mjs';
import type { MiniSellerQuotationDraft } from './miniSellerQuotationDraft.mjs';
import { miniStoreOfferSnapshotFresh } from './miniStoreOfferFresh.mjs';

/**
 * M5B: the existing StoreController remains the sole Store update engine.
 * This is a compact on-demand view, never a seller quote acceptance or a
 * payment/Agreement version mutation. Business permission is checked by
 * the canonical BusinessGateway before loading and again before fulfilment.
 */
export function MiniSellerStore({storeGateway,businessGateway,quotationGateway,liveQuotes,prepare,onBack,onInvitations,onSellerDiscuss}:{
  storeGateway:StoreGateway;
  quotationGateway:StoreQuotationGateway;
  liveQuotes:boolean;
  businessGateway:Pick<BusinessGateway,'mine'|'representation'>;
  prepare:()=>Promise<unknown>;
  onBack:()=>void;
  onInvitations:()=>void;
  /** Seller's words travel to the SAME KS001 conversation, never to an order endpoint. */
  onSellerDiscuss:(proposal:MiniSellerQuotationDraft)=>Promise<boolean>;
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
  const [quoteBuyer,setQuoteBuyer]=useState('');
  const [quoteQty,setQuoteQty]=useState('1');
  const [quoteUnit,setQuoteUnit]=useState('');
  const [quoteWhere,setQuoteWhere]=useState('');
  const [quoteWhen,setQuoteWhen]=useState('');
  const [quoteDeliveryBy,setQuoteDeliveryBy]=useState<'SELLER'|'BUYER'|'TO_AGREE'>('TO_AGREE');
  const [quoteConditions,setQuoteConditions]=useState('');
  const [quoteBusy,setQuoteBusy]=useState(false);
  const [quoteError,setQuoteError]=useState('');
  const [recordedQuote,setRecordedQuote]=useState<SellerQuoteRecord|null>(null);
  const quoteAction=useRef<{fingerprint:string;key:string;expiresAt:string}|null>(null);
  // Changing any requested fact requires an entirely fresh seller action.
  // An identical retry keeps the original key; an ambiguous network outcome
  // must NEVER imply that the quote was not recorded by the server.
  const clearRecordedQuote=()=>{
    setRecordedQuote(null);quoteAction.current=null;setQuoteError('');
  };

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
    // The parent supplies a short-lived auth refresh callback; its identity
    // changes every render. Only the stable gateway owns this load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[businessGateway]);

  const personal=async()=>{
    setSelectedOffer(null);setFulfilment(null);setNotice('');
    try{
      await prepare();await controller.enterManagement();
      if(controller.getSnapshot().mine.status!=='ready')
        throw Error('Personal Store was not returned');
    }catch{setNotice('SecurePay could not verify your own Store. No offer was changed.');}
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
      if(controller.getSnapshot().mine.status!=='ready')
        throw Error('Business Store was not returned');
    }catch{setNotice('SecurePay could not verify your authority for that business Store. Nothing was changed.');}
  };
  const opened=state.mine.status==='ready'?state.mine.data:null;
  const offer=opened?.raw.find(o=>o.id===selectedOffer)||null;
  const storeBusiness=state.managedBusiness;

  const openOffer=async(id:string)=>{
    const raw=opened?.raw.find(o=>o.id===id);
    if(!raw)return;
    setSelectedOffer(id);setDeliveryNotice('');setDeliveryError('');setFulfilment(null);
    clearRecordedQuote();setQuoteQty('1');
    setQuoteUnit(raw.priceMinor===null?'':String(raw.priceMinor/100));
    setQuoteBuyer('');setQuoteWhere('');setQuoteWhen('');
    setQuoteDeliveryBy('TO_AGREE');setQuoteConditions('');
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
      if(storeBusiness){
        const verified=await businessGateway.representation(storeBusiness.ksNumber);
        if(!verified.canActFor||verified.businessKsNumber!==storeBusiness.ksNumber)
          throw Error('Business management permission lost');
      }
      await controller.submitDraft();
      const result=controller.getSnapshot();
      if(result.draftError || result.mine.status!=='ready' || result.view!=='manage')
        throw Error('Published offer was not verified after update');
      // The StoreController reloads server records; an update is not a
      // buyer quote or a revised Agreement version.
      setSelectedOffer(null);setFulfilment(null);
      setNotice('Published offer updated and refreshed. This is not a buyer-approved order.');
    }catch{setNotice('SecurePay could not verify this update. Check the Store before relying on it.');}
  };
  const confirmAvailability=async(id:string)=>{
    setNotice('');
    try{
      await prepare();
      if(storeBusiness){
        const verified=await businessGateway.representation(storeBusiness.ksNumber);
        if(!verified.canActFor||verified.businessKsNumber!==storeBusiness.ksNumber)
          throw Error('Business management permission lost');
      }
      await controller.confirmAvailability(id);
      const refreshed=controller.getSnapshot();
      const confirmed=refreshed.mine.status==='ready'
        ?refreshed.mine.data.raw.find(o=>o.id===id):null;
      if(!confirmed?.availabilityConfirmedAt)
        throw Error('No canonical availability confirmation');
      setNotice('SecurePay confirmed the published availability. This does not reserve stock or accept any buyer order.');
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

  // M5C slice 1: a seller can WRITE a buyer-specific proposal in the existing
  // conversation. Current API has only Store publication + Agreement amendments,
  // not a persisted, buyer/seller-bound quotation; never call this acceptance.
  const discussSellerQuotation=async()=>{
    if(!offer||!storeBusiness||quoteBusy||state.draftBusy)return;
    const proposal=miniSellerQuotationDraft({
      sellerKsNumber:storeBusiness.ksNumber,
      offerId:offer.id,title:offer.title,offerUpdatedAt:offer.updatedAt,
      publishedPriceMinor:offer.priceMinor,currency:offer.currency,
      buyerKsNumber:quoteBuyer,quantity:quoteQty,unitPrice:quoteUnit,
      deliveryPlace:quoteWhere,deliveryDate:quoteWhen,
      deliveryBy:quoteDeliveryBy,conditions:quoteConditions,
    });
    if(!proposal){
      setQuoteError('Add a valid buyer KS Number, quantity, price, delivery place and date. Nothing was sent.');
      return;
    }
    setQuoteBusy(true);setQuoteError('');
    try{
      await prepare();
      const authorised=await businessGateway.representation(storeBusiness.ksNumber);
      if(!authorised.canActFor||authorised.identityType!=='BUSINESS'||
        authorised.businessKsNumber!==storeBusiness.ksNumber) throw Error('No authority');
      // Re-read immediately before handing off. This is in addition to the
      // existing backend commercial-source check in AgentController.useOffer.
      const published=await storeGateway.offer(storeBusiness.ksNumber,offer.id);
      const matches=miniStoreOfferSnapshotFresh([{
        sellerKsNumber:storeBusiness.ksNumber,offerId:offer.id,
        sellerName:storeBusiness.displayName,availabilityState:offer.availabilityState,
        title:offer.title,offerUpdatedAt:offer.updatedAt,
        priceMinor:offer.priceMinor,currency:offer.currency,
        quantity:proposal.quantity,
      }],[published]);
      if(!matches)throw Error('Published Store source changed');
      if(!await onSellerDiscuss(proposal))throw Error('KS001 did not acknowledge the handoff');
    }catch{
      setQuoteError('Your Store authority, published offer or KS001 handoff could not be verified. Recheck the offer. No quotation was accepted or sent to a buyer.');
    }finally{setQuoteBusy(false);}
  };

  /**
   * M5C backend bridge: an explicit authenticated SELLER action, separate
   * from talking to KS001. Uses ONLY server-owned Store, identity and
   * quotation authority. Neither issue nor chat accepts for a buyer.
   * Not reachable in the synthetic Mini demo.
   */
  const issueRecordedQuotation=async()=>{
    if(!liveQuotes||!offer||!storeBusiness||quoteBusy||state.draftBusy)return;
    const proposal=miniSellerQuotationDraft({
      sellerKsNumber:storeBusiness.ksNumber,
      offerId:offer.id,title:offer.title,offerUpdatedAt:offer.updatedAt,
      publishedPriceMinor:offer.priceMinor,currency:offer.currency,
      buyerKsNumber:quoteBuyer,quantity:quoteQty,unitPrice:quoteUnit,
      deliveryPlace:quoteWhere,deliveryDate:quoteWhen,
      deliveryBy:quoteDeliveryBy,conditions:quoteConditions,
    });
    if(!proposal||proposal.totalMinor<=0){
      setQuoteError('Check the buyer, price, quantity, delivery place and date before recording.');return;
    }
    const fingerprint=JSON.stringify([storeBusiness.ksNumber,offer.id,offer.updatedAt,
      proposal.buyerKsNumber,proposal.quantity,proposal.unitPriceMinor,
      quoteWhere.trim(),quoteWhen,quoteDeliveryBy,quoteConditions.trim()]);
    if(quoteAction.current?.fingerprint!==fingerprint)
      quoteAction.current={
        fingerprint,key:'mini-seller-'+crypto.randomUUID(),
        // Expiry is a MATERIAL part of the backend idempotency fingerprint;
        // keep it unchanged on timeout/retry of an identical seller action.
        expiresAt:new Date(Date.now()+7*24*60*60*1000).toISOString(),
      };
    setQuoteBusy(true);setQuoteError('');
    try{
      await prepare();
      const authority=await businessGateway.representation(storeBusiness.ksNumber);
      if(!authority.canActFor||authority.identityType!=='BUSINESS'||
         authority.businessKsNumber!==storeBusiness.ksNumber)
        throw Error('Seller representation unavailable');
      const published=await storeGateway.offer(storeBusiness.ksNumber,offer.id);
      if(!miniStoreOfferSnapshotFresh([{
        sellerKsNumber:storeBusiness.ksNumber,offerId:offer.id,
        sellerName:storeBusiness.displayName,availabilityState:offer.availabilityState,
        title:offer.title,offerUpdatedAt:offer.updatedAt,
        priceMinor:offer.priceMinor,currency:offer.currency,quantity:proposal.quantity,
      }],[published]))throw Error('Listing changed');
      // This expiry is a proposal window, NOT an inventory hold.
      const expiresAt=quoteAction.current!.expiresAt;
      const response=await quotationGateway.issue(storeBusiness.ksNumber,offer.id,{
        idempotencyKey:quoteAction.current!.key,
        buyerKsNumber:proposal.buyerKsNumber,
        expectedOfferUpdatedAt:offer.updatedAt,
        quantity:proposal.quantity,unitPriceMinor:proposal.unitPriceMinor,
        currency:offer.currency,deliveryPlace:quoteWhere.trim(),
        deliveryDate:quoteWhen,deliveryBy:quoteDeliveryBy,
        conditions:quoteConditions.trim()||null,expiresAt,
      });
      if(!quotedRecordProof(response) ||
        response.offerId!==offer.id ||
        response.sellerKsNumber!==storeBusiness.ksNumber ||
        response.buyerKsNumber!==proposal.buyerKsNumber ||
        response.totalMinor!==proposal.totalMinor ||
        response.deliveryDate!==quoteWhen ||
        response.deliveryPlace!==quoteWhere.trim())
        throw Error('Quotation proof mismatch');
      setRecordedQuote(response);
    }catch{
      setRecordedQuote(null);
      setQuoteError('The quotation could not be verified. Its server outcome may be unknown. Recheck before retrying the SAME details; no buyer acceptance or payment is implied.');
    }finally{setQuoteBusy(false);}
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
        {storeBusiness&&<details className="spm-mini-seller-editor" data-m5c="proposal-only">
          <summary><strong>Prepare buyer-specific quotation with KS001</strong></summary>
          <p>These are proposed terms for your own KS001 conversation, not an issued quote, stock reservation or buyer approval. The buyer identity and terms must still be verified in the exact Agreement.</p>
          <label className="spm-label" htmlFor="m5c-buyer">Buyer's KS Number (seller-stated; not identity-verified)</label>
          <input id="m5c-buyer" className="spm-field" placeholder="KS001" autoComplete="off"
            value={quoteBuyer} maxLength={14} onChange={e=>{clearRecordedQuote();setQuoteBuyer(e.target.value.toUpperCase());}}/>
          <label className="spm-label" htmlFor="m5c-qty">Quantity you propose</label>
          <input id="m5c-qty" className="spm-field" inputMode="numeric" type="number" min="1" max="20"
            value={quoteQty} onChange={e=>{clearRecordedQuote();setQuoteQty(e.target.value);}}/>
          <label className="spm-label" htmlFor="m5c-unit">Proposed price per unit ({offer.currency})</label>
          <input id="m5c-unit" className="spm-field" inputMode="decimal" autoComplete="off"
            value={quoteUnit} onChange={e=>{clearRecordedQuote();setQuoteUnit(e.target.value);}} placeholder="0.00"/>
          <label className="spm-label" htmlFor="m5c-place">Delivery or collection place</label>
          <input id="m5c-place" className="spm-field" maxLength={100}
            value={quoteWhere} onChange={e=>{clearRecordedQuote();setQuoteWhere(e.target.value);}}/>
          <label className="spm-label" htmlFor="m5c-date">Proposed delivery or collection date</label>
          <input id="m5c-date" className="spm-field" type="date"
            value={quoteWhen} onChange={e=>{clearRecordedQuote();setQuoteWhen(e.target.value);}}/>
          <label className="spm-label" htmlFor="m5c-who">Who will arrange transport?</label>
          <select id="m5c-who" className="spm-field" value={quoteDeliveryBy}
            onChange={e=>{clearRecordedQuote();setQuoteDeliveryBy(e.target.value as typeof quoteDeliveryBy);}}>
            <option value="TO_AGREE">Still to agree</option>
            <option value="SELLER">Seller proposes to arrange it</option>
            <option value="BUYER">Buyer proposes to arrange it</option>
          </select>
          <label className="spm-label" htmlFor="m5c-terms">Exceptions or conditions (optional)</label>
          <textarea id="m5c-terms" className="spm-field" rows={2} maxLength={180}
            value={quoteConditions} onChange={e=>{clearRecordedQuote();setQuoteConditions(e.target.value);}}/>
          {quoteError&&<p role="alert">{quoteError}</p>}
          <button type="button" className="spm-secondary" disabled={quoteBusy||state.draftBusy}
            onClick={()=>void discussSellerQuotation()}>
            {quoteBusy?'Verifying…':'Discuss proposed quotation with KS001'}
          </button>
          {liveQuotes && <button type="button" className="spm-secondary"
            disabled={quoteBusy||state.draftBusy||!!recordedQuote}
            onClick={()=>void issueRecordedQuotation()}>
            {quoteBusy?'Verifying seller authority…':
              recordedQuote?'Quotation recorded':'Record seller quotation for buyer'}
          </button>}
          {recordedQuote && <div className="spm-mini-owned-item" role="status">
            <div>
              <strong>Seller quotation recorded — proposal only</strong>
              <small>Reference: {recordedQuote.id}</small>
              <small>{recordedQuote.currency} {(recordedQuote.totalMinor/100).toFixed(2)}
                {' · '}for {recordedQuote.buyerKsNumber}
                {' · '}valid until {recordedQuote.expiresAt.slice(0,10)}</small>
              <small>Give the reference privately to your buyer. They must review
                and create their own Agreement draft. This does not contact or
                bind them automatically.</small>
            </div>
            <button type="button" className="spm-secondary"
              onClick={()=>void navigator.clipboard?.writeText(recordedQuote.id)}>
              Copy reference
            </button>
          </div>}
          <small>{liveQuotes
            ? 'KS001 discussion and recording a seller quotation are separate actions. The buyer has not agreed; no inventory or Money is reserved.'
            : 'Sample demo: only KS001 discussion is simulated. No real seller quotation, Agreement, Money or stock hold.'}</small>
        </details>}
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
