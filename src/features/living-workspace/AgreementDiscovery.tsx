import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ChevronRight, FolderOpen, LockKeyhole, RefreshCw, X } from 'lucide-react';
import { ensureFreshSession, type SessionStore, type SessionState } from '../../api/securepay/session';
import type { AgreementDetailResponse, CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import { AgreementStatementEvidence } from './AgreementStatementEvidence';
import { AgreementInviteInsideWorkspace } from './AgreementInviteInsideWorkspace';

type IndexState = { owner: SessionState | null; phase: 'idle'|'loading'|'ready'|'error'; items: CurrentUserAgreementSummaryResponse[]; total: number };
type DetailState = { owner: SessionState | null; id: string | null; phase: 'idle'|'loading'|'ready'|'error'; value: AgreementDetailResponse | null };
type Tab = 'Overview'|'People'|'Terms'|'Milestones'|'Evidence'|'Money'|'History';
const tabs: Tab[] = ['Overview','People','Terms','Milestones','Evidence','Money','History'];
const emptyIndex = ():IndexState => ({owner:null,phase:'idle',items:[],total:0});
const emptyDetail = ():DetailState => ({owner:null,id:null,phase:'idle',value:null});
const safeDate = (value:string|null|undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString() : null;
const money = (amount:string|number|null|undefined,currency:string) => {
  if (amount===null || amount===undefined || !/^-?\d+$/.test(String(amount))) return 'Not stated';
  const numeric=Number(amount);
  return Number.isSafeInteger(numeric) ? currency+' '+(numeric/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : 'See official Agreement';
};
const message = 'SecurePay could not verify this record for your current identity. Reload or sign in again.';

/**
 * One read-only route into the SAME server-owned Agreements.
 * Idle -> peek -> full is disclosure only. The KS001 controller, draft, tool shelf and
 * existing Agreement authority never unmount, mutate, or switch route on open/close.
 */
export function AgreementDiscovery({gateways,session,onSignIn,openAgreementId,onAgreementClosed,onConnectMoney}:{
  gateways?:PreviewWorkspaceGateways;
  session:SessionStore;
  onSignIn:()=>void;
  /** Only a confirmed server-generated draft ID from canonical handoff may be passed here. */
  openAgreementId?:string|null;
  onAgreementClosed?:()=>void;
  /** Opens the contextual, separately authorised Agreement Money tool, not payment execution. */
  onConnectMoney?:(agreementId:string)=>void;
}){
  const identity=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const signedIn=identity.status==='signed-in';
  const [expanded,setExpanded]=useState(false);
  const [index,setIndex]=useState<IndexState>(emptyIndex);
  const [revision,setRevision]=useState(0);
  const [detailRevision,setDetailRevision]=useState(0);
  const [hoverId,setHoverId]=useState<string|null>(null);
  const [chosenId,setChosenId]=useState<string|null>(null);
  const [fullId,setFullId]=useState<string|null>(null);
  const [tab,setTab]=useState<Tab>('Overview');
  const [detail,setDetail]=useState<DetailState>(emptyDetail);
  useEffect(()=>{
    if(openAgreementId && signedIn) {
      // Read-only opening still requires the server's current identity, details and permissions.
      setExpanded(true);setChosenId(openAgreementId);setFullId(openAgreementId);setTab('Overview');
    }
  },[openAgreementId,signedIn]);
  const closeButton=useRef<HTMLButtonElement>(null);
  const dialogRef=useRef<HTMLDivElement>(null);
  const returnFocus=useRef<HTMLElement|null>(null);
  const openDetail=fullId ?? chosenId ?? hoverId;
  // Hover is a cheap summary from the list; detail is fetched only after deliberate selection.
  const requestedDetail=fullId ?? chosenId;
  const canUse=index.owner===identity && index.phase==='ready';
  const current=canUse ? index.items.find(a=>a.agreementId===openDetail) : undefined;
  const verified=detail.owner===identity && detail.id===requestedDetail && detail.phase==='ready' ? detail.value : null;

  useEffect(()=>{
    let active=true;
    setIndex({owner:identity,phase:signedIn&&gateways?'loading':'idle',items:[],total:0});
    setDetail(emptyDetail());
    setHoverId(null);setChosenId(null);setFullId(null);setExpanded(false);
    if(signedIn&&gateways){
      void (async()=>{
        try{
          await ensureFreshSession(session,gateways.auth);
          if(!active || session.getSnapshot()!==identity)return;
          const page=await gateways.agreements.currentUserAgreements(0,20);
          if(active && session.getSnapshot()===identity)
            setIndex({owner:identity,phase:'ready',items:page.items,total:page.totalElements});
        }catch{
          if(active && session.getSnapshot()===identity)
            setIndex({owner:identity,phase:'error',items:[],total:0});
        }
      })();
    }
    return ()=>{active=false;};
  },[identity,signedIn,gateways,session,revision]);

  useEffect(()=>{
    let active=true;
    setDetail({owner:identity,id:requestedDetail,phase:requestedDetail?'loading':'idle',value:null});
    if(requestedDetail && signedIn && gateways && canUse && (index.items.some(a=>a.agreementId===requestedDetail) || openAgreementId===requestedDetail)){
      void (async()=>{
        try{
          await ensureFreshSession(session,gateways.auth);
          if(!active || session.getSnapshot()!==identity)return;
          const value=await gateways.agreements.detail(requestedDetail);
          if(value.overview.agreementId!==requestedDetail)throw new Error('Mismatched Agreement');
          if(active && session.getSnapshot()===identity)
            setDetail({owner:identity,id:requestedDetail,phase:'ready',value});
        }catch{
          if(active && session.getSnapshot()===identity)
            setDetail({owner:identity,id:requestedDetail,phase:'error',value:null});
        }
      })();
    }
    return ()=>{active=false;};
  },[identity,requestedDetail,signedIn,gateways,session,canUse,index.items,openAgreementId,detailRevision]);

  useEffect(()=>{
    if(!fullId)return;
    closeButton.current?.focus();
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setFullId(null);onAgreementClosed?.();window.requestAnimationFrame(()=>returnFocus.current?.focus());return;}
      if(event.key!=='Tab')return;
      const focusable=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')||[]);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    window.addEventListener('keydown',onEscape);
    return ()=>window.removeEventListener('keydown',onEscape);
  },[fullId]);

  const showFull=(id:string)=>{
    returnFocus.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setHoverId(null);setChosenId(id);setFullId(id);setTab('Overview');
  };
  const closeFull=()=>{
    setFullId(null);setChosenId(null);setHoverId(null);
    onAgreementClosed?.();
    window.requestAnimationFrame(()=>returnFocus.current?.focus());
  };
  const peek=(id:string)=>{
    if(chosenId===id){showFull(id);return;}
    setChosenId(id);setHoverId(null);
  };
  const label=canUse ? String(index.total) : null;
  const rows=canUse ? index.items : [];
  return <section className="relative mb-3 rounded-xl border border-cream-200 bg-cream-50/90" aria-label="My Agreements" data-agreement-discovery>
    <div className="flex items-center gap-2 p-2">
      <button type="button" aria-expanded={expanded} aria-controls="workspace-my-agreements-list"
        onClick={()=>{setExpanded(v=>!v);setChosenId(null);setHoverId(null);}}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><FolderOpen size={17} aria-hidden="true"/> My Agreements {label!==null&&<span className="rounded-full bg-white px-2 py-0.5 text-xs" data-agreement-count>{label}</span>}</span>
        <ChevronRight size={16} className={expanded?'rotate-90':''} aria-hidden="true"/>
      </button>
      {signedIn&&gateways&&<button type="button" onClick={()=>setRevision(n=>n+1)} aria-label="Refresh My Agreements" title="Refresh My Agreements" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white"><RefreshCw size={15}/></button>}
    </div>
    {expanded&&<div id="workspace-my-agreements-list" className="border-t border-cream-200 px-3 py-3" data-agreement-list>
      {!signedIn&&<div className="space-y-2"><p className="flex gap-2 text-xs"><LockKeyhole size={14}/> Sign in with your KS Number to see your private Agreements.</p><button type="button" onClick={onSignIn} className="min-h-11 rounded-lg bg-forest-800 px-3 text-xs text-white">Sign in</button></div>}
      {signedIn&&!gateways&&<p role="status" className="text-xs">Agreement services are unavailable in this preview.</p>}
      {signedIn&&gateways&&!canUse&&<p role={index.owner===identity&&index.phase==='error'?'alert':'status'} className="text-xs">{index.owner===identity&&index.phase==='error'?message:'Loading your Agreements…'}</p>}
      {canUse&&rows.length===0&&<p className="text-xs text-sand-700">No established Agreements returned for this identity. Saved KS001 drafts are separate.</p>}
      {canUse&&rows.length>0&&<div className="max-h-52 space-y-1 overflow-y-auto" aria-label="Established Agreement records">
        {rows.map(a=><button key={a.agreementId} type="button" aria-pressed={chosenId===a.agreementId}
          onMouseEnter={()=>{if(!chosenId)setHoverId(a.agreementId);}}
          onMouseLeave={()=>setHoverId(null)}
          onFocus={()=>{if(!chosenId)setHoverId(a.agreementId);}}
          onClick={()=>peek(a.agreementId)}
          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-cream-200 bg-white p-2 text-left hover:border-forest-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
          <span className="min-w-0"><span className="block truncate text-xs font-semibold">{a.title||a.publicReference}</span><span className="block text-[11px] text-sand-700">{a.status} · {a.publicReference}</span></span><ChevronRight className="shrink-0" size={15}/>
        </button>)}
      </div>}
      {canUse&&index.total>rows.length&&<p className="mt-2 text-xs text-sand-600">Showing the first {rows.length} of {index.total} Agreements. Use the existing Agreements list for the rest.</p>}
      {current&&<section className="mt-3 rounded-xl border border-forest-200 bg-white p-3 shadow-sm" aria-label="Agreement quick peek" data-agreement-peek>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-600">Quick peek · {current.publicReference}</p>
        <p className="mt-1 text-sm font-semibold">{current.title}</p>
        <p className="mt-1 text-xs">{current.status} · {money(current.proposedAmountMinor,current.currency)}</p>
        <p className="mt-1 text-xs text-sand-700">With: {current.counterparty?.displayName||'See Agreement people'}</p>
        <p className="mt-1 text-xs text-sand-700">{current.nextActions[0]?.reason||'No next action reported'}</p>
        {detail.owner===identity&&detail.id===current.agreementId&&detail.phase==='ready'&&verified&&
          <p className="mt-1 text-xs text-sand-700">{verified.participants.length} people · {verified.milestones.length} milestones · version {verified.currentVersion?.versionNumber??'not established'}</p>}
        {detail.owner===identity&&detail.id===current.agreementId&&detail.phase==='error'&&<p role="alert" className="mt-1 text-xs">{message}</p>}
        <button type="button" onClick={()=>showFull(current.agreementId)} className="mt-3 min-h-11 w-full rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white">Open Agreement</button>
      </section>}
      <p className="mt-2 text-[11px] text-sand-600">Hover or focus to peek; tap once to select and again to open. No Agreement is changed.</p>
    </div>}
    {fullId && signedIn && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-forest-950/60 p-2 sm:p-5" data-agreement-full>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Living Agreement" className="flex max-h-[94dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-cream-200 p-3 sm:p-5">
          <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-sand-600">Living Agreement · Read-only record</p><h2 className="truncate font-display text-xl">{verified?.overview.title||current?.title||'Agreement'}</h2></div>
          <button ref={closeButton} type="button" onClick={closeFull} aria-label="Close Agreement and return to KS001" className="flex min-h-11 items-center gap-2 rounded-lg bg-cream-100 px-3 text-xs"><ArrowLeft size={16}/> Back to My Work <X size={16}/></button>
        </div>
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-cream-200 p-2" role="tablist" aria-label="Living Agreement sections">
          {tabs.map(name=><button key={name} type="button" role="tab" aria-selected={tab===name} onClick={()=>setTab(name)} className={'min-h-10 shrink-0 rounded-lg px-3 text-xs '+(tab===name?'bg-forest-800 text-white':'bg-cream-100 text-forest-800')}>{name}</button>)}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" role="tabpanel">
          {(!verified) && <p role={detail.phase==='error'?'alert':'status'} className="text-sm">{detail.owner===identity&&detail.phase==='error'?message:'Checking current Agreement details and access…'}</p>}
          {verified&&<>
            {tab==='Overview'&&<section data-gate-b-active-attention aria-label="What needs attention in this Agreement" className="space-y-3 rounded-xl border border-forest-200 bg-cream-50 p-4">
              <h3 className="font-display text-lg text-forest-900">What needs you now?</h3>
              <p className="text-xs text-sand-600">Actions below come from this Agreement's current backend summary. They are not approvals, verified completion or permission to move Money.</p>
              {current?.nextActions?.length ? <div className="space-y-2">
                {current.nextActions.slice(0,4).map((action,index)=><div key={action.actionCode+':'+index} className="rounded-lg border border-cream-200 bg-white p-3">
                  <p className="text-sm font-semibold">{action.reason}</p>
                  <p className="text-xs text-sand-600">SecurePay action · {action.actionCode}</p>
                </div>)}
              </div> : <p className="text-sm text-sand-700">No immediate action was returned for this identity. Check milestones, evidence and Money before assuming the Agreement is complete.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={()=>setTab('Milestones')} className="min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-xs font-semibold">Milestones</button>
                <button type="button" onClick={()=>setTab('Evidence')} className="min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-xs font-semibold">Evidence</button>
                <button type="button" onClick={()=>setTab('Money')} className="min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-xs font-semibold">Money status</button>
                <button type="button" onClick={closeFull} className="min-h-11 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">Return to KS001 for help</button>
              </div>
            </section>}
            {tab==='Overview'&&<div className="space-y-3"><h3 className="text-lg font-semibold">{verified.overview.title}</h3>
              <p className="text-sm">{verified.overview.description||verified.overview.purpose||'No description recorded.'}</p>
              <p className="text-sm">Reference: {verified.overview.publicReference} · Status: {verified.overview.status}</p>
              <p className="text-sm">Proposed amount: {money(verified.overview.proposedAmountMinor,verified.overview.currency)}</p>
              <p className="text-sm">Current version: {verified.currentVersion?.versionNumber??'Not established'}</p>
              <p className="text-xs text-sand-600">Status and completeness are determined by SecurePay, not by this reader.</p></div>}
            {tab==='People'&&<div className="space-y-2">{verified.participants.length?verified.participants.map(p=><article key={p.participantId} className="rounded-lg border border-cream-200 p-3 text-sm"><strong>{p.displayName||p.ksNumber||'Participant'}</strong><p>{p.roleCode} · {p.participantStatus}</p></article>):<p>No participants returned.</p>}
              {gateways&&<AgreementInviteInsideWorkspace key={verified.overview.agreementId}
                gateway={gateways.agreements} auth={gateways.auth} session={session}
                agreementId={verified.overview.agreementId} status={verified.overview.status}
                onChanged={()=>setDetailRevision(n=>n+1)}/>}
            </div>}
            {tab==='Terms'&&<div className="space-y-2">{verified.terms.length?verified.terms.map(t=><article key={t.obligationId} className="rounded-lg border border-cream-200 p-3 text-sm"><strong>{t.title}</strong><p>{t.description||t.obligationType}</p><p className="text-xs text-sand-600">Status: {t.status}{t.amountMinor!==null?' · '+money(t.amountMinor,t.currency):''}</p></article>):<p>No terms returned.</p>}</div>}
            {tab==='Milestones'&&<div className="space-y-2">{verified.milestones.length?verified.milestones.map(m=><article key={m.milestoneId} className="rounded-lg border border-cream-200 p-3 text-sm"><strong>{m.title}</strong><p>{m.description}</p><p className="text-xs text-sand-600">{m.status}{m.dueAt?' · Due '+safeDate(m.dueAt):''}</p></article>):<p>No milestones returned.</p>}</div>}
            {tab==='Evidence'&&<div className="space-y-3">
              {verified.documents.length?verified.documents.map(d=><article key={d.evidenceId} className="rounded-lg border border-cream-200 p-3 text-sm">
                <strong>{d.description||d.originalFilename}</strong><p className="text-xs text-sand-600">{d.status} · {safeDate(d.submittedAt)||'No date'}</p>
              </article>):<p className="text-sm">No Agreement documents returned by SecurePay.</p>}
              {gateways&&verified.currentVersion?.versionId
                ? <AgreementStatementEvidence gateway={gateways.agreements} auth={gateways.auth}
                    session={session} agreementId={verified.overview.agreementId}
                    versionId={verified.currentVersion.versionId} />
                : <p className="text-xs text-sand-700">A verified current Agreement version is required before submitting evidence.</p>}
              <p className="text-xs text-sand-600">Photo and document uploads are not currently supported by the Agreement evidence API. A written caption is submitted only as a TEXT_STATEMENT; no media file is implied or attached.</p>
            </div>}
            {tab==='Money'&&<div className="space-y-3"><h3 className="font-semibold">Agreement money</h3><p className="text-sm">Server status: {verified.money.status}</p><p className="text-sm">Money records: {verified.money.moneyRecordCount}</p>
              {verified.money.outstandingReasons.map((r,i)=><p key={i} className="text-xs">{r.gateCode}: {r.reasonCode}</p>)}
              <p className="text-xs text-sand-600">No funding, quotation, release or payment can be authorised from this reader.</p>
              {onConnectMoney&&<button type="button" onClick={()=>{const id=verified.overview.agreementId;closeFull();onConnectMoney(id);}}
                className="min-h-11 rounded-xl border border-forest-300 bg-cream-50 px-4 text-sm font-semibold text-forest-900" data-gate-d-connect-money>
                Explore Agreement Money choices
              </button>}</div>}
            {tab==='History'&&<div className="space-y-3"><h3 className="font-semibold">Version history</h3>{verified.versionHistory.length?verified.versionHistory.map(v=><p key={v.versionId} className="rounded-lg border border-cream-200 p-3 text-sm">Version {v.versionNumber} · {safeDate(v.createdAt)||'Date unavailable'}{v.amendmentReason?' · '+v.amendmentReason:''}</p>):<p>No version history returned.</p>}
              <h3 className="font-semibold">Activity</h3>{verified.activity.length?verified.activity.map(a=><p key={a.id} className="text-sm">{a.activityType} · {safeDate(a.occurredAt)||'Date unavailable'}</p>):<p>No activity returned.</p>}</div>}
          </>}
        </div>
        <div className="border-t border-cream-200 p-3 text-xs text-sand-600">Verified detail is scoped to your current identity. Close to resume the same KS001 conversation and unsent draft.</div>
      </div>
    </div>}
  </section>;
}
