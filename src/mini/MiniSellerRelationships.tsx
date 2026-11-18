import {useState} from 'react';
import {Bookmark,Heart,ShoppingBag,RefreshCcw,ArrowRight,X} from 'lucide-react';
import type {AgreementGateway} from '../api/securepay/agreements';
import type {StoreGateway} from '../api/securepay/store';
import type {CurrentUserAgreementSummaryResponse} from '../api/securepay/agreements/dto';
import type {MiniTradeMemoryEntry,MiniTradeMemoryGateway} from '../api/securepay/mini-trade-memory';
import {miniSellerRecentTradeReferences,miniSellerReadTradeAgainTitle} from './miniSellerTradeAgain.mjs';
import {miniSellerRepeatTiming} from './miniSellerRepeatPolicy.mjs';

type Agreements=Pick<AgreementGateway,'currentUserAgreements'|'detail'>;
type Stores=Pick<StoreGateway,'store'>;
type ReturnFromTemplate=(title:string,terms:string,timing:string)=>void;

/**
 * My People and Favourite Stores are explicit, private account notes.
 * No contacts imported, no public community, no trading permission inferred.
 */
export function MiniSellerRelationships({memory,agreements,stores,onStart}:{memory?:MiniTradeMemoryGateway;
  agreements?:Agreements;stores?:Stores;onStart:ReturnFromTemplate}){
  const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [items,setItems]=useState<MiniTradeMemoryEntry[]>([]);
  const [prior,setPrior]=useState<CurrentUserAgreementSummaryResponse[]>([]);
  const [priorVisible,setPriorVisible]=useState(false);
  const [storeKs,setStoreKs]=useState('');
  const [storePreview,setStorePreview]=useState<{ks:string;name:string;offers:number}|null>(null);
  const [pending,setPending]=useState<{kind:'PERSON'|'STORE';reference:string;label:string}|null>(null);
  const [removeCandidate,setRemoveCandidate]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const read=async()=>{
    if(!memory||busy)return;
    setBusy(true);setState('loading');setNotice('');
    try{
      const records=await memory.mine();
      if(!Array.isArray(records)||records.some(x=>!x?.id||!x.kind||!x.referenceKey))
        throw Error('Invalid private list');
      setItems(records);setState('ready');
    }catch{
      setItems([]);setState('error');
      setNotice('Your private saved items could not be verified. Nothing is shared or changed.');
    }finally{setBusy(false);}
  };
  // No account data is retained in a browser's localStorage or sessionStorage.
  const past=async()=>{
    if(!agreements||busy)return;
    setBusy(true);setNotice('');setPriorVisible(true);
    try{
      const result=await agreements.currentUserAgreements(0,20);
      if(!Array.isArray(result?.items))throw Error('Unavailable');
      setPrior(miniSellerRecentTradeReferences(result)
        .filter(x=>!!x.counterparty?.displayName));
    }catch{
      setPrior([]);setNotice('Past trading people could not be checked.');
    }finally{setBusy(false);}
  };
  const reviewPerson=async(r:CurrentUserAgreementSummaryResponse)=>{
    if(!agreements||busy)return;
    setBusy(true);setNotice('');
    try{
      const fresh=await agreements.detail(r.agreementId);
      const verified=miniSellerReadTradeAgainTitle(r,fresh);
      if(!verified||!r.counterparty?.displayName?.trim())
        throw Error('Past Agreement changed');
      setPending({kind:'PERSON',reference:r.agreementId,
        label:r.counterparty.displayName.slice(0,160)});
      setStorePreview(null);
    }catch{setNotice('This person could not be verified from your completed trade. No one was saved.');}
    finally{setBusy(false);}
  };
  const checkStore=async()=>{
    if(!stores||busy)return;
    const ks=storeKs.trim().toUpperCase();
    if(!/^KS[0-9]{3,12}$/.test(ks)){
      setNotice('Enter a Store KSNumber, for example KS001.');return;
    }
    setBusy(true);setNotice('');setStorePreview(null);setPending(null);
    try{
      const s=await stores.store(ks);
      if(s.canonicalKsNumber!==ks||s.status!=='ACTIVE'||!s.displayName?.trim())
        throw Error('Store not currently available');
      setStorePreview({ks,name:s.displayName.slice(0,160),offers:s.offers?.length||0});
      setPending({kind:'STORE',reference:ks,label:s.displayName.slice(0,160)});
    }catch{setNotice('The Store could not be verified as active. No favourite was saved.');}
    finally{setBusy(false);}
  };
  const save=async()=>{
    if(!memory||!pending||busy)return;
    setBusy(true);setNotice('');
    try{
      // Re-read the source immediately before saving a private label.
      if(pending.kind==='STORE'){
        if(!stores)throw Error('Store unavailable');
        const source=await stores.store(pending.reference);
        if(source.status!=='ACTIVE'||source.canonicalKsNumber!==pending.reference||
           source.displayName!==pending.label)throw Error('Store changed');
      }else{
        if(!agreements)throw Error('Agreement unavailable');
        const source=await agreements.detail(pending.reference);
        const reference=prior.find(x=>x.agreementId===pending.reference);
        if(!reference||!miniSellerReadTradeAgainTitle(reference,source) ||
           !source.participants?.some(p=>p.displayName===pending.label))
          throw Error('Person no longer confirmed');
      }
      const saved=await memory.save({kind:pending.kind,referenceKey:pending.reference,
        label:pending.label,termsHint:null,cadence:'ONE_TIME',
        stopRule:'EACH_CYCLE_CONFIRM',untilDate:null,ownerConfirms:true});
      if(saved.kind!==pending.kind||saved.referenceKey!==pending.reference)
        throw Error('Private save unconfirmed');
      const records=await memory.mine();
      if(!Array.isArray(records)||!records.some(x=>x.id===saved.id))
        throw Error('Readback unavailable');
      setItems(records);setState('ready');setPending(null);
      setNotice('Saved privately. No one was invited or notified.');
    }catch{setNotice('Could not verify the private save. Refresh before trying again.');}
    finally{setBusy(false);}
  };
  const remove=async(item:MiniTradeMemoryEntry)=>{
    if(!memory||busy)return;
    setBusy(true);setNotice('');
    try{
      const fresh=await memory.mine();
      const current=fresh.find(x=>x.id===item.id);
      if(!current||current.version!==item.version)throw Error('Changed');
      await memory.remove(item.id,current.version);
      const newer=await memory.mine();
      if(!Array.isArray(newer)||newer.some(x=>x.id===item.id))
        throw Error('Deletion not verified');
      setItems(newer);setRemoveCandidate(null);setNotice('Removed from your private list.');
    }catch{setNotice('Cannot confirm removal. Refresh the list and check again.');}
    finally{setBusy(false);}
  };
  const useTemplate=async(item:MiniTradeMemoryEntry)=>{
    if(!memory||busy)return;
    setBusy(true);setNotice('');
    try{
      const latest=await memory.mine();
      const fresh=latest.find(x=>x.id===item.id && x.kind==='TEMPLATE');
      if(!fresh||fresh.version!==item.version||fresh.label!==item.label||
         fresh.termsHint!==item.termsHint||fresh.cadence!==item.cadence||
         fresh.stopRule!==item.stopRule||fresh.untilDate!==item.untilDate)
        throw Error('Template changed');
      onStart(fresh.label,fresh.termsHint||'',miniSellerRepeatTiming(fresh));
    }catch{setNotice('The saved template changed or could not be checked. Nothing was reused.');}
    finally{setBusy(false);}
  };
  if(!memory)return <p className="spm-sell-hint">
    Sign in to your personal SecurePay account to keep favourites privately.
    Business trading relationships will need their own authority checks.
  </p>;
  return <section data-mini-phase6-relationships aria-label="Private trading relationships">
    <p className="spm-sell-hint">Only you can see your private favourites and reusable
      terms. Saving does not contact someone or publish anything.</p>
    <button type="button" className="spm-secondary spm-sell-wide"
      onClick={()=>void read()} disabled={busy}>
      <RefreshCcw size={16}/>{busy?'Checking…':'Open my saved people, stores & terms'}
    </button>
    {state==='ready'&&<>
      {items.length===0&&<p className="spm-sell-hint" role="status">
        Nothing saved yet. You can save a person from a completed trade,
        a verified Store, or reusable terms from your own offer.</p>}
      {items.map(item=><div key={item.id} className="spm-sell-data-row">
        {item.kind==='STORE'?<ShoppingBag size={17}/>:item.kind==='PERSON'?<Heart size={17}/>:<Bookmark size={17}/>}
        <span><strong>{item.label}</strong><small>{
          item.kind==='PERSON'?'Private reference to an earlier trade · not an invitation':
          item.kind==='STORE'?'Favourite Store · check current offers before buying':
          (item.cadence==='ONE_TIME'?'Offer wording to reuse':
            'Repeat idea: '+item.cadence.toLowerCase()+' · no automatic renewal')
        }</small></span>
        {item.kind==='TEMPLATE'&&<button type="button" disabled={busy}
          onClick={()=>void useTemplate(item)}>Use <ArrowRight size={14}/></button>}
        {item.kind==='STORE'&&<button type="button" disabled={busy}
          onClick={()=>{setStoreKs(item.referenceKey);
            void (async()=>{try{const s=await stores?.store(item.referenceKey);
              if(!s||s.status!=='ACTIVE')throw Error('Unavailable');
              setStorePreview({ks:s.canonicalKsNumber,name:s.displayName,offers:s.offers.length});
              setNotice('This is a fresh public Store check, not a reserved order.');
            }catch{setNotice('This Store is not currently verified.');}})();}}>
          Check</button>}
        <button type="button" aria-label={'Remove private item '+item.label}
          disabled={busy} onClick={()=>setRemoveCandidate(removeCandidate===item.id?null:item.id)}>
          <X size={16}/></button>
        {removeCandidate===item.id&&<div className="spm-sell-pill-row">
          <button className="spm-sell-answer-pill" disabled={busy}
            onClick={()=>void remove(item)}>Yes, remove</button>
          <button className="spm-sell-answer-pill" onClick={()=>setRemoveCandidate(null)}>Keep</button>
        </div>}
      </div>)}
    </>}
    <div className="spm-sell-clarification-help">
      <strong>Save someone you have traded with</strong>
      <p>Choose from your completed Agreements. No device contacts are imported.</p>
      <button type="button" className="spm-secondary" disabled={busy||!agreements}
        onClick={()=>void past()}>My completed trades</button>
      {priorVisible&&prior.slice(0,6).map(r=><div className="spm-sell-data-row" key={r.agreementId}>
        <span><strong>{r.counterparty?.displayName}</strong><small>{r.title}</small></span>
        <button type="button" disabled={busy} onClick={()=>void reviewPerson(r)}>Save person</button>
      </div>)}
      <strong>Keep a favourite Store</strong>
      <label className="spm-sell-label"><span>Store KSNumber</span>
        <input type="text" className="spm-field" value={storeKs}
          placeholder="KS001" maxLength={16} onChange={e=>{setStoreKs(e.target.value);setPending(null)}}/>
      </label>
      <button type="button" className="spm-secondary" disabled={busy||!stores}
        onClick={()=>void checkStore()}>Check Store</button>
      {storePreview&&<p className="spm-sell-hint">
        {storePreview.name} · {storePreview.offers} current public offers · not reserved</p>}
      {pending&&<div className="spm-sell-clarification-help">
        <p>Keep <strong>{pending.label}</strong> in your private {pending.kind==='STORE'?'Stores':'People'} list?</p>
        <div className="spm-sell-pill-row">
          <button type="button" className="spm-sell-answer-pill" disabled={busy}
            onClick={()=>void save()}>Yes, keep privately</button>
          <button type="button" className="spm-sell-answer-pill"
            onClick={()=>setPending(null)}>Not now</button>
        </div>
      </div>}
    </div>
    {notice&&<p role="status" className="spm-sell-hint">{notice}</p>}
  </section>;
}
