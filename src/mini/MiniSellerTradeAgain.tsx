import {useEffect,useRef,useState} from 'react';
import {ArrowRight, RefreshCcw} from 'lucide-react';
import type {AgreementGateway} from '../api/securepay/agreements';
import type {CurrentUserAgreementSummaryResponse} from '../api/securepay/agreements/dto';
import {miniSellerRecentTradeReferences,miniSellerReadTradeAgainTitle} from './miniSellerTradeAgain.mjs';

type ReadOnlyAgreementGateway=Pick<AgreementGateway,'currentUserAgreements'|'detail'>;

/**
 * Phase 6A: people may start a *new offer* inspired by their own past trades.
 * Only a checked title crosses into the local composer. No amount, identity,
 * dates, permissions, SecureLink, consent or Agreement is reused.
 */
export function MiniSellerTradeAgain({gateway,onStart}:{gateway?:ReadOnlyAgreementGateway;
  onStart:(title:string)=>void}){
  const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [items,setItems]=useState<CurrentUserAgreementSummaryResponse[]>([]);
  const [choosing,setChoosing]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const alive=useRef(true);
  useEffect(()=>()=>{alive.current=false;},[]);
  const load=async()=>{
    if(!gateway||state==='loading'||choosing)return;
    setState('loading');setNotice('');setItems([]);
    try{
      // Page is caller-scoped on the server. Bounded to 20 most recent.
      const page=await gateway.currentUserAgreements(0,20);
      if(!Array.isArray(page?.items))throw Error('Unavailable');
      if(!alive.current)return;
      setItems(miniSellerRecentTradeReferences(page));
      setState('ready');
    }catch{
      if(alive.current){setState('error');setNotice('Could not check your completed Agreements. Nothing has been reused.');}
    }
  };
  const select=async(reference:CurrentUserAgreementSummaryResponse)=>{
    if(!gateway||choosing||state!=='ready')return;
    setChoosing(reference.agreementId);setNotice('');
    try{
      // Re-read before copying ANY field. No client-side inference of seller
      // authority from a previous buyer/seller role.
      const detail=await gateway.detail(reference.agreementId);
      if(!alive.current)return;
      const title=miniSellerReadTradeAgainTitle(reference,detail);
      if(!title){
        setNotice('That Agreement has changed or is unavailable. Refresh your past trades and choose again.');
        return;
      }
      onStart(title);
    }catch{
      if(alive.current)setNotice('Could not verify this Agreement. No new offer was prepared.');
    }finally{
      if(alive.current)setChoosing(null);
    }
  };
  if(!gateway)return <p className="spm-sell-hint">
    Trade again from a verified personal account will be available after sign-in.
    A Business needs separate Agreement authority.
  </p>;
  return <section aria-label="Trade again from my Agreements" data-mini-phase6-trade-again>
    <p className="spm-sell-hint">Use one of your completed Agreements as a starting point.
      You will set today's price, availability, people and terms again.</p>
    <button type="button" className="spm-secondary spm-sell-wide"
      onClick={()=>void load()} disabled={state==='loading'||!!choosing}>
      <RefreshCcw size={16}/>{state==='loading'?'Checking…':
        state==='idle'?'Find my completed trades':'Refresh my completed trades'}
    </button>
    {state==='ready'&&items.length===0&&<p className="spm-sell-hint" role="status">
      No completed Agreements were found in your latest 20 records. You can still start with a person.</p>}
    {state==='ready'&&items.map(item=><div className="spm-sell-data-row" key={item.agreementId}>
      <span><strong>{item.title}</strong>
        <small>Completed Agreement · {item.counterparty?.displayName||'Earlier trade'}</small></span>
      <button type="button" aria-label={'Start a new offer about '+item.title}
        disabled={!!choosing} onClick={()=>void select(item)}>
        {choosing===item.agreementId?'Checking…':<>Trade again <ArrowRight size={15}/></>}
      </button>
    </div>)}
    {notice&&<p className="spm-sell-hint" role="status">{notice}</p>}
    <p className="spm-sell-hint">The previous Agreement stays unchanged. This does not invite the old
      buyer, reserve stock, issue a SecureLink, sign terms or authorize Money.</p>
  </section>;
}
