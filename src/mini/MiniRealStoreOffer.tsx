import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, LoaderCircle, MessageCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { MiniDraft, MiniLanguage } from './miniModel';
import { MiniFundingPreview } from './MiniFundingPreview';
import { MiniGuestChat } from './MiniGuestChat';
import { COMMERCE_EXPERIENCE } from '../features/agreement-commerce/experienceContract';
import { loadRealStoreOfferPreview, type MiniRealOfferReview } from './realStoreOfferPreview';

type Status='loading'|'expired'|'changed'|'unavailable'|'ready';
type Screen='review'|'simulation'|'chat';

/** This is a sourced OFFER review, deliberately not an accepted Store ORDER. */
export function MiniRealStoreOffer({session,language}:{
  session:string;language:MiniLanguage;
}) {
  const sw=language==='sw';
  const [status,setStatus]=useState<Status>('loading');
  const [source,setSource]=useState<MiniRealOfferReview|null>(null);
  const [screen,setScreen]=useState<Screen>('review');
  const [chatWasOpened,setChatWasOpened]=useState(false);
  const [previousScreen,setPreviousScreen]=useState<'review'|'simulation'>('review');

  useEffect(()=>{
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),8000);
    void loadRealStoreOfferPreview(session,controller.signal).then(result=>{
      if(controller.signal.aborted)return;
      if(result.status==='ready'){setSource(result.data);setStatus('ready');}
      else setStatus(result.status);
    }).finally(()=>window.clearTimeout(timeout));
    return ()=>{window.clearTimeout(timeout);controller.abort();};
  },[session]);

  useEffect(()=>{
    if(!source || status!=='ready')return;
    const ms=source.expiresAt-Date.now();
    if(ms<=0){setStatus('expired');return;}
    const id=window.setTimeout(()=>setStatus('expired'),ms);
    return ()=>window.clearTimeout(id);
  },[source,status]);

  useEffect(()=>{
    window.scrollTo(0,0);
    document.querySelector<HTMLElement>('.spm-frame')?.scrollTo(0,0);
  },[screen,status]);

  const reviewUrl='/checkout-store-offer-preview.html';
  const returnToStore = () => {
    if(window.parent !== window) {
      window.parent.postMessage({type:'SECUREPAY_MINI_STORE_OFFER_REVIEW_CLOSED',reviewOnly:true},window.location.origin);
      return;
    }
    window.location.assign(reviewUrl);
  };

  if(status!=='ready' || !source){
    return <section className="spm-content spm-server-wait" role="status" aria-live="polite">
      {status==='loading'?<LoaderCircle size={24}/>:<CircleAlert size={24}/>}
      <h1 className="spm-question">{status==='loading'
        ? (sw?'Inaangalia bidhaa…':'Checking published offer…')
        : status==='changed'
          ? (sw?'Bei au upatikanaji umebadilika':'Offer has changed')
          : status==='expired'
            ? (sw?'Muda wa ukaguzi umeisha':'Review expired')
            : (sw?'Ofa haipatikani':'Offer unavailable')}</h1>
      <p className="spm-lead">{sw?'Hakuna oda au malipo yaliyofanyika.':
        'No order was placed and no money moved. Check the Store listing again.'}</p>
      <a className="spm-quiet-link" href={reviewUrl}><ArrowLeft size={16}/>Back to Store offer lookup</a>
    </section>;
  }
  const r=source.record;
  const draft:MiniDraft={
    intent:'pay',
    description:r.itemDescription,
    amount:(r.amountMinor/100).toFixed(2),
    quantity:r.quantity,
    unit:r.unit,
    note:'Published offer: '+r.reference+'. Listing updated '+r.offerUpdatedAt+'. Seller must confirm terms.',
    counterparty:'',
  };
  const showChat=()=>{
    setPreviousScreen(screen==='simulation'?'simulation':'review');
    setChatWasOpened(true);setScreen('chat');
  };
  return <section className="spm-hosted-demo spm-live-offer" data-real-store-source="read-only">
    {screen==='review'&&<div className="spm-hosted-review">
      <div className="spm-demo-flag">SIMULATION ONLY · No purchase</div>
      <div className="spm-hosted-source"><ShoppingBag size={17}/>
        <span>{sw?'Duka halisi · taarifa za bidhaa':'Published Store offer · verified source'}</span>
      </div>
      <h1 className="spm-question">{sw?'Kagua ofa':'Review this offer'}</h1>
      <div className="spm-hosted-summary">
        <small>{r.sellerKsNumber} · {r.offerId.slice(0,8)}</small>
        <strong>{r.itemDescription}</strong>
        <span>{r.merchant}</span>
        <div className="spm-hosted-price">{'KSh ' + (r.amountMinor / 100).toLocaleString('en-KE', {maximumFractionDigits:2})}</div>
        <span>{r.details}</span>
        <div className="spm-hosted-rule">
          {sw?'Bei iliyochapishwa, si oda au mkataba.':COMMERCE_EXPERIENCE.sourceOnly}
          <small> · Updated {r.offerUpdatedAt.slice(0,10)}</small>
        </div>
      </div>
      <p className="spm-hosted-safety"><ShieldCheck size={16}/>
        {sw?'Hatujaweka oda wala kutoa malipo.':'No order, accepted agreement, reserved stock or payment exists.'}
      </p>
      <button type="button" className="spm-primary" onClick={()=>setScreen('simulation')}>
        {sw?'Tazama njia za malipo (jaribio)':'Explore payment methods (simulation)'}<ArrowRight size={17}/>
      </button>
      <button className="spm-quiet-button" type="button" onClick={showChat}>
        <MessageCircle size={16}/>Need help? Ask KS001
      </button>
      <button type="button" className="spm-quiet-button" onClick={returnToStore}>Back to Store lookup</button>
    </div>}

    <div className="spm-hosted-finance" hidden={screen!=='simulation'}>
      <MiniFundingPreview draft={draft} language={language}
        guidedDemo onBack={()=>setScreen('review')}
        onReturnToHost={returnToStore}
        returnLabel={sw?'Rudi dukani':'Return to Store lookup'}/>
    </div>

    {chatWasOpened && <div hidden={screen!=='chat'}>
      <MiniGuestChat draft={draft} language={language}
        onBack={()=>setScreen(previousScreen)}/>
    </div>}
  </section>;
}
