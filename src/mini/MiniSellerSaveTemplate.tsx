import {useState} from 'react';
import {Bookmark,CheckCircle2} from 'lucide-react';
import type {MiniTradeMemoryGateway,MiniRepeatCadence,MiniStopRule} from '../api/securepay/mini-trade-memory';
import {miniSellerRepeatTemplate} from './miniSellerRepeatPolicy.mjs';

/** An intentional private text template, never a live scheduled Agreement. */
export function MiniSellerSaveTemplate({gateway,title,terms}:{gateway?:MiniTradeMemoryGateway;
  title:string;terms:string}){
  const [open,setOpen]=useState(false);
  const [cadence,setCadence]=useState<MiniRepeatCadence>('ONE_TIME');
  const [stopRule,setStopRule]=useState<MiniStopRule>('EACH_CYCLE_CONFIRM');
  const [untilDate,setUntilDate]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [message,setMessage]=useState('');
  const [key]=useState(()=>crypto.randomUUID());
  const save=async()=>{
    if(!gateway||busy||done)return;
    const body=miniSellerRepeatTemplate({title:title.slice(0,160),termsHint:terms,
      referenceKey:key,cadence,stopRule,untilDate:stopRule==='UNTIL_DATE'?untilDate:null});
    if(!body){setMessage('Check the title and the proposed end date. Nothing has been saved.');return;}
    setBusy(true);setMessage('');
    try{
      const existing=await gateway.mine();
      if(!Array.isArray(existing))throw Error('Private list unavailable');
      const saved=await gateway.save(body);
      if(saved.kind!=='TEMPLATE'||saved.referenceKey!==key||
          saved.label!==body.label||saved.cadence!==body.cadence||
          saved.stopRule!==body.stopRule||saved.untilDate!==body.untilDate||
          saved.termsHint!==body.termsHint)throw Error('Private note not confirmed');
      setDone(true);setMessage('Saved privately in My People & Favourite Stores. No Agreement was renewed.');
    }catch{
      setMessage('Cannot confirm whether the private template saved. Check your saved items before trying again.');
    }finally{setBusy(false);}
  };
  if(!gateway)return null;
  return <section data-mini-phase6-template className="spm-sell-review-enrich">
    <button type="button" className="spm-quiet-button"
      onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <Bookmark size={16}/>{open?'Close repeat options':'Keep reusable terms for next time'}
    </button>
    {open&&<div className="spm-sell-clarification-help">
      <strong>Keep only the seller's written terms</strong>
      <p>Save a private reference to this offer. Price, buyer, stock, permissions,
        photographs and Money are never saved into the template.</p>
      <p className="spm-sell-hint">Saved title: {title.slice(0,160)}</p>
      <strong>Would you expect to offer this again?</strong>
      <div className="spm-sell-pill-row">
        {(['ONE_TIME','WEEKLY','MONTHLY','ON_REQUEST'] as const).map(value=>
          <button type="button" key={value}
            className={'spm-sell-answer-pill'+(cadence===value?' selected':'')}
            aria-pressed={cadence===value} disabled={done}
            onClick={()=>{setCadence(value);setMessage('')}}>
            {value==='ONE_TIME'?'Maybe later':value==='WEEKLY'?'Every week':
              value==='MONTHLY'?'Every month':'When asked'}
          </button>)}
      </div>
      {cadence!=='ONE_TIME'&&<>
        <strong>When should the proposal stop?</strong>
        <div className="spm-sell-pill-row">
          <button type="button" className={'spm-sell-answer-pill'+
            (stopRule==='EACH_CYCLE_CONFIRM'?' selected':'')}
            disabled={done} onClick={()=>{setStopRule('EACH_CYCLE_CONFIRM');setUntilDate('')}}>
            Agree each time
          </button>
          <button type="button" className={'spm-sell-answer-pill'+
            (stopRule==='UNTIL_DATE'?' selected':'')}
            disabled={done} onClick={()=>setStopRule('UNTIL_DATE')}>
            Choose an end date
          </button>
        </div>
        {stopRule==='UNTIL_DATE'&&<label className="spm-sell-label">
          <span>Last proposed date (not an automatic expiry of an Agreement)</span>
          <input type="date" className="spm-field" value={untilDate} disabled={done}
            onChange={e=>setUntilDate(e.target.value)}/>
        </label>}
      </>}
      <p className="spm-sell-hint">This is only a reusable proposal. Every new trade
        requires fresh terms and each participant's own confirmation. Repeating
        never gives SecurePay permission to debit or pay automatically.</p>
      {!done&&<div className="spm-sell-pill-row">
        <button type="button" className="spm-sell-answer-pill"
          onClick={()=>void save()} disabled={busy}>
          <Bookmark size={15}/>{busy?'Saving…':'Yes, save privately'}
        </button>
        <button type="button" className="spm-sell-answer-pill"
          onClick={()=>setOpen(false)}>Not now</button>
      </div>}
      {done&&<p role="status"><CheckCircle2 size={15}/> Your reusable terms are saved.</p>}
      {message&&<p role="status" className="spm-sell-hint">{message}</p>}
    </div>}
  </section>;
}
