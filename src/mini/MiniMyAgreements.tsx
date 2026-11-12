import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardList, RefreshCcw } from 'lucide-react';
import type { AgreementGateway } from '../api/securepay/agreements';
import {miniAgreementHomePage,miniAgreementDetailView} from './miniAgreementHome.mjs';
import type {MiniAgreementItem,MiniAgreementDetail} from './miniAgreementHome.mjs';

const dateLabel = (iso:string|null) => {
  if(!iso)return null;
  const date=new Date(iso);
  return Number.isNaN(date.getTime())?null:
    date.toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'});
};

/**
 * M4: the owner-authorised existing Agreement layer inside frozen Mini.
 * No phantom Agreements, separate ledger, new Money rail or newly invented
 * "who must act" inference. The server's nextActions and attentionRequired
 * remain the only authority on this user's next work.
 */
export function MiniMyAgreements({gateway,prepare,onBack}:{
  gateway:Pick<AgreementGateway,'currentUserAgreements'|'detail'>;
  prepare:()=>Promise<unknown>;
  onBack:()=>void;
}) {
  const alive=useRef(true);
  const busy=useRef(false);
  const [items,setItems]=useState<MiniAgreementItem[]>([]);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [page,setPage]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  const [moreBusy,setMoreBusy]=useState(false);
  const [moreError,setMoreError]=useState('');
  const [chosen,setChosen]=useState<MiniAgreementItem|null>(null);
  const [details,setDetails]=useState<MiniAgreementDetail|null>(null);
  const [detailStatus,setDetailStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');

  const loadPage=async (nextPage:number,replace:boolean)=>{
    if(busy.current)return;
    busy.current=true;
    if(replace){setStatus('loading');setItems([]);setChosen(null);setDetails(null);
      setHasMore(false);setPage(0);}
    else {setMoreBusy(true);setMoreError('');}
    try{
      await prepare(); // same first-party in-memory SecurePay auth session
      const reply=await gateway.currentUserAgreements(nextPage,20);
      const view=miniAgreementHomePage(reply,nextPage);
      if(!view)throw Error('Agreement listing could not be verified');
      if(!alive.current)return;
      if(replace){setItems(view.items);}
      else {
        setItems(prior=>{
          const ids=new Set(prior.map(item=>item.id));
          // Duplicates across pages are a changed-page boundary: force a
          // deliberate refresh, not silent overwrite with a different version.
          if(view.items.some(item=>ids.has(item.id))) {
            setMoreError('The Agreement list changed. Recheck before continuing.');
            setHasMore(false);return prior;
          }
          return [...prior,...view.items];
        });
      }
      setPage(view.page);setHasMore(view.hasMore);setStatus('ready');
    }catch{
      if(!alive.current)return;
      if(replace){setItems([]);setHasMore(false);setStatus('error');}
      else setMoreError('More Agreements could not be verified. Nothing changed.');
    }finally{busy.current=false;if(alive.current)setMoreBusy(false);}
  };
  useEffect(()=>{
    alive.current=true;
    void loadPage(0,true);
    return ()=>{alive.current=false;};
    // Scoped to one stable gateway (one signed-in SecurePay account).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gateway]);

  const openDetails=async(item:MiniAgreementItem)=>{
    if(busy.current)return;
    setChosen(item);setDetails(null);setDetailStatus('loading');
    try{
      await prepare();
      const result=await gateway.detail(item.id);
      const view=miniAgreementDetailView(result,item.id,item.versionId);
      if(!view)throw Error('Agreement version changed or detail unavailable');
      if(alive.current){setDetails(view);setDetailStatus('ready');}
    }catch{
      if(alive.current){setDetails(null);setDetailStatus('error');}
    }
  };

  return <section className="spm-mini-owned-list spm-mini-my-agreements"
    aria-label="My SecurePay Agreements">
    <button type="button" className="spm-back" onClick={chosen?()=>{setChosen(null);
      setDetails(null);setDetailStatus('idle');}:onBack}>
      <ArrowLeft size={16}/>{chosen?'My Agreements':'Back to KS001'}
    </button>
    <div className="spm-persona"><ClipboardList size={16}/>My Agreements</div>
    {chosen ? <>
      <div className="spm-mini-agreement-intro">
        <strong>{chosen.title}</strong>
        <small>{chosen.reference||'SecurePay Agreement'} · {chosen.statusText}</small>
        {chosen.attentionRequired&&<small>SecurePay has flagged this for your attention</small>}
      </div>
      {chosen.actions.length>0&&<div className="spm-mini-agreement-section">
        <strong>Your next action{chosen.actions.length===1?'':'s'}</strong>
        {chosen.actions.map((a,i)=><div className="spm-mini-agreement-fact" key={a.actionCode+String(i)}>
          <p>{a.reason}</p>
          {a.deadline&&<small>Deadline provided by SecurePay: {dateLabel(a.deadline)||'Date needs checking'}</small>}
        </div>)}
      </div>}
      {chosen.actions.length===0&&<p className="spm-mini-owned-note">
        SecurePay has not supplied a next action for you in this summary.
        This does not prove that the Agreement has no outstanding work.
      </p>}
      {detailStatus==='loading'&&<p role="status">Checking the current Agreement…</p>}
      {detailStatus==='error'&&<div>
        <p role="alert">The current Agreement details cannot be verified or may have changed.
          No decision has been recorded.</p>
        <button type="button" className="spm-secondary"
          onClick={()=>void loadPage(0,true)}><RefreshCcw size={15}/>Refresh My Agreements</button>
      </div>}
      {detailStatus==='ready'&&details&&<>
        {details.purpose&&<p className="spm-mini-owned-note">{details.purpose}</p>}
        {details.currentVersion&&<p className="spm-mini-owned-note">
          Current Agreement version {details.currentVersion.number}. Check the full terms before confirming changes.
        </p>}
        {details.participants.length>0&&<details className="spm-mini-slot">
          <summary>People and participation <small>{details.participants.length}</small>
            <ArrowRight size={15}/></summary>
          <div className="spm-mini-slot-items">
            {details.participants.map(p=><div className="spm-mini-agreement-fact" key={p.id}>
              <strong>{p.name} · {p.role}</strong><small>SecurePay records: {p.status}</small>
            </div>)}
          </div>
        </details>}
        {details.milestones.length>0&&<details className="spm-mini-slot">
          <summary>Milestones <small>{details.milestones.length}</small><ArrowRight size={15}/></summary>
          <div className="spm-mini-slot-items">
            {details.milestones.map(m=><div className="spm-mini-agreement-fact" key={m.id}>
              <strong>{m.title}</strong><small>SecurePay records: {m.status}</small>
              {m.description&&<p>{m.description}</p>}
              {m.dueAt&&<small>Due: {dateLabel(m.dueAt)||'Date needs checking'}</small>}
            </div>)}
          </div>
        </details>}
        {details.terms.length>0&&<details className="spm-mini-slot">
          <summary>Responsibilities and terms <small>{details.terms.length}</small>
            <ArrowRight size={15}/></summary>
          <div className="spm-mini-slot-items">
            {details.terms.map(t=><div className="spm-mini-agreement-fact" key={t.id}>
              <strong>{t.title}</strong><small>SecurePay records: {t.status}</small>
              {t.description&&<p>{t.description}</p>}
            </div>)}
          </div>
        </details>}
        {details.moneyStatus&&<p className="spm-mini-owned-note">
          SecurePay Money record: {details.moneyStatus}.
          This screen does not verify a provider payment or release funds.
        </p>}
        <p className="spm-mini-owned-note">
          This is the server's read-only Agreement summary, not an approval,
          amendment, funding instruction or payment receipt.
        </p>
      </>}
    </> : <>
      <p>See your existing Agreements and what SecurePay says needs your attention.
        Unfinished conversations remain under My saved work.</p>
      {status==='loading'&&<p role="status">Checking your Agreements…</p>}
      {status==='error'&&<><p role="alert">SecurePay could not verify your Agreements.
        Nothing has been changed.</p>
        <button type="button" className="spm-secondary"
          onClick={()=>void loadPage(0,true)}><RefreshCcw size={15}/>Recheck</button></>}
      {status==='ready'&&items.length===0&&<p>No existing Agreements were returned for this account.</p>}
      {status==='ready'&&items.length>0&&<>
        {items.some(a=>a.attentionRequired)&&<strong>Needs your attention</strong>}
        {items.filter(a=>a.attentionRequired).map(item=><MiniAgreementRow key={item.id}
          item={item} onOpen={()=>void openDetails(item)}/>)}
        {items.some(a=>!a.attentionRequired)&&<strong>Other Agreements</strong>}
        {items.filter(a=>!a.attentionRequired).map(item=><MiniAgreementRow key={item.id}
          item={item} onOpen={()=>void openDetails(item)}/>)}
      </>}
      {moreError&&<p role="alert">{moreError}</p>}
      {status==='ready'&&hasMore&&<button type="button" className="spm-secondary"
        disabled={moreBusy} onClick={()=>void loadPage(page+1,false)}>
        {moreBusy?'Checking…':'More Agreements'}
      </button>}
      {status==='ready'&&<button type="button" className="spm-quiet-button"
        onClick={()=>void loadPage(0,true)} disabled={moreBusy}>
        <RefreshCcw size={14}/>Refresh statuses</button>}
    </>}
  </section>;
}
function MiniAgreementRow({item,onOpen}:{item:MiniAgreementItem;onOpen:()=>void}){
  return <div className="spm-mini-owned-item">
    <div>
      <strong>{item.title}</strong>
      <small>{item.reference||'SecurePay Agreement'} · {item.statusText}</small>
      <small>{item.role} · {item.participantStatus}</small>
      {item.actions.length>0&&<small>{item.actions[0].reason}</small>}
      {item.lastUpdated&&<small>Updated {dateLabel(item.lastUpdated)||'date needs checking'}</small>}
    </div>
    <button type="button" className="spm-secondary" onClick={onOpen}>
      Review <ArrowRight size={14}/>
    </button>
  </div>;
}
