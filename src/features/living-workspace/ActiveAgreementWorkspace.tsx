import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, ArrowLeft, ClipboardCheck, RefreshCw, Wallet } from 'lucide-react';
import type { AgreementDetailResponse } from '../../api/securepay/agreements/dto';
import type { NextActionDto, ObligationDto } from '../../api/securepay/agreements';
import type { AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot';
import { MoneyRailCeremony } from './MoneyRailCeremony';
import { AgreementWorkProgress } from './AgreementWorkProgress';
import { ProjectOutcomeComposer } from './ProjectOutcomeComposer';
import { AgreementMediaEvidenceTool } from './AgreementMediaEvidenceTool';
import { describeMoneyTruth } from './executionTruth';
import { ensureFreshSession, type SessionStore } from '../../api/securepay/session';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';

type Loaded={
 phase:'loading'|'ready'|'error'; detail:AgreementDetailResponse|null;
 actions:NextActionDto[]|null; obligations:ObligationDto[]|null;
};
const empty=():Loaded=>({phase:'loading',detail:null,actions:null,obligations:null});
/**
 * One task-first pane inside the approved three-column shell.
 * Backend owns participant next actions and actual evidence status. Written
 * statements use the canonical API. Verified media is only available against
 * the isolated staging media gateway, never by an ordinary production relay.
 */
export function ActiveAgreementWorkspace({agreementId,gateways,session,onBack,onAskKs001,onOpenMoney,onGoCommunity}:{
 agreementId:string;gateways:PreviewWorkspaceGateways;session:SessionStore;
 onBack:()=>void;onAskKs001:(reference:string)=>Promise<void>;onOpenMoney:(detail:AgreementDetailResponse,railCode?:string)=>void;
 onGoCommunity:()=>void;
}){
 const identity=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
 const [record,setRecord]=useState<Loaded>(empty);
 const [version,setVersion]=useState(0);
 const [selectedAction,setSelectedAction]=useState<string|null>(null);
 const [caption,setCaption]=useState('');
 const [sending,setSending]=useState(false);
 const [notice,setNotice]=useState('');
 const [uncertain,setUncertain]=useState(false);
 const [moneyState,setMoneyState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [moneySnapshot,setMoneySnapshot]=useState<AgreementMoneySnapshotResponse|null>(null);
 const submitting=useRef<{key:string;agreementVersionId:string;obligationId:string;stateVersion:number;description:string}|null>(null);

 useEffect(()=>{setUncertain(false);submitting.current=null;setMoneyState('idle');setMoneySnapshot(null);},[agreementId,identity]);
 useEffect(()=>{
  let active=true;
  setRecord(empty());setSelectedAction(null);setCaption('');setNotice('');
  void (async()=>{
   try{
    await ensureFreshSession(session,gateways.auth);
    if(!active||identity!==session.getSnapshot()||identity.status!=='signed-in')throw Error('Session unavailable');
    const [detail,actionResponse,obligations]=await Promise.all([
      gateways.agreements.detail(agreementId),
      gateways.agreements.myNextActions(agreementId),
      gateways.agreements.obligations(agreementId)
    ]);
    if(!active||identity!==session.getSnapshot())return;
    if(detail.overview.agreementId!==agreementId)throw Error('Record mismatch');
    const exact=detail.currentVersion?.versionId??null;
    const actions=actionResponse.actions.filter(a=>a.agreementId===agreementId &&
      !!exact && a.currentAgreementVersionId===exact);
    setRecord({phase:'ready',detail,actions,obligations:obligations.filter(o=>o.agreementId===agreementId &&
      !!exact && o.agreementVersionId===exact)});
   }catch{
    if(active)setRecord({phase:'error',detail:null,actions:null,obligations:null});
   }
  })();
  return()=>{active=false;};
 },[agreementId,gateways,session,identity,version]);

 const detail=record.phase==='ready'?record.detail:null;
 const actions=record.actions??[];
 const requested=selectedAction?actions.find(a=>a.targetObligationId===selectedAction &&
   (a.actionType==='SUBMIT_EVIDENCE')):null;
 const obligation=requested?record.obligations?.find(o=>o.id===requested.targetObligationId):null;
 const validEvidence=!!requested&&!!obligation&&!!detail?.currentVersion &&
   requested.currentAgreementVersionId===detail.currentVersion.versionId &&
   obligation.agreementVersionId===detail.currentVersion.versionId;
 const refresh=()=>{setVersion(x=>x+1);setMoneyState('idle');setMoneySnapshot(null);};
 const inspectMoney=async()=>{
  if(!detail?.currentVersion?.versionId)return;
  setMoneyState('loading');setMoneySnapshot(null);
  try {
   await ensureFreshSession(session,gateways.auth);
   if(identity!==session.getSnapshot()||identity.status!=='signed-in')throw Error('Session changed');
   const snapshot=await gateways.moneySnapshot.read(agreementId);
   if(snapshot.agreementId!==agreementId||snapshot.currentVersionId!==detail.currentVersion.versionId)
    throw Error('Money version changed');
   if(identity!==session.getSnapshot())throw Error('Session changed');
   setMoneySnapshot(snapshot);setMoneyState('ready');
  }catch{setMoneySnapshot(null);setMoneyState('error');}
 };
 const submit=async()=>{
  if(sending||uncertain||!validEvidence||!obligation||!detail?.currentVersion)return;
  const text=caption.trim();
  if(text.length<3||text.length>2000){setNotice('Write a clear caption/statement of 3–2000 characters.');return;}
  const attempt={key:crypto.randomUUID(),agreementVersionId:detail.currentVersion.versionId,
    obligationId:obligation.id,stateVersion:obligation.stateVersion,description:text};
  submitting.current=attempt;setSending(true);setNotice('');
  try{
   await ensureFreshSession(session,gateways.auth);
   if(session.getSnapshot()!==identity||identity.status!=='signed-in')throw Error('Session changed');
   await gateways.agreements.submitEvidence(agreementId,attempt.obligationId,{
     idempotencyKey:attempt.key,expectedAgreementVersionId:attempt.agreementVersionId,
     expectedObligationVersion:attempt.stateVersion,evidenceType:'TEXT_STATEMENT',
     description:attempt.description
   });
   submitting.current=null;setSelectedAction(null);setCaption('');
   setNotice('Written evidence received by SecurePay. The beneficiary still needs to review it; this does not complete an obligation.');
   setVersion(x=>x+1);
  }catch{
   setUncertain(true);
   setNotice('SecurePay has not confirmed the outcome. Do not submit a second statement. Return to the authorised Agreement record to inspect the evidence before retrying.');
  }finally{setSending(false);}
 };
 return <section aria-label="Active Agreement workspace" data-gate-b-active-agreement className="min-h-0 flex-1 overflow-y-auto bg-[#fcfcf8] p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 bg-white px-3 text-xs font-semibold"><ArrowLeft size={16}/> Back to KS001</button>
   <button type="button" onClick={refresh} disabled={sending} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cream-200 bg-white px-3 text-xs"><RefreshCw size={15}/> Refresh</button>
  </div>
  {record.phase==='loading'&&<p role="status" className="mt-5 text-sm">Checking your current Agreement, permissions and next actions…</p>}
  {record.phase==='error'&&<p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">SecurePay could not verify this Agreement and your actions. Nothing here is assumed current. Refresh or sign in again.</p>}
  {detail&&<div className="mt-5 space-y-4">
    <header className="rounded-2xl border border-cream-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-forest-700">Your living Agreement · {detail.overview.publicReference}</p>
      <h1 className="mt-2 font-display text-2xl text-forest-900">{detail.overview.title}</h1>
      <p className="mt-2 text-sm text-sand-700">{detail.overview.description||detail.overview.purpose||'Read the Agreement details for its purpose.'}</p>
      <p className="mt-3 text-xs text-sand-600">Server status: {detail.overview.status} · Current version: {detail.currentVersion?.versionNumber??'Not established'} · Money: {detail.money.status}</p>
    </header>
    <div className="rounded-2xl border border-forest-200 bg-[#f1f5ed] p-4">
      <div className="flex items-center gap-2 text-forest-800"><ClipboardCheck size={18}/><h2 className="text-base font-semibold">What needs your attention</h2></div>
      {actions.length===0?<p className="mt-2 text-sm text-sand-700">SecurePay returned no current participant actions. This is not a declaration that the Agreement is complete.</p>:
      <div className="mt-3 space-y-2">{actions.slice(0,8).map((a,i)=><article key={a.actionType+':'+(a.targetObligationId||i)} className="rounded-xl border border-cream-200 bg-white p-3">
        <p className="text-xs font-semibold text-forest-900">{a.actionReason||a.actionType.replace(/_/g,' ')}</p>
        <p className="mt-1 text-xs text-sand-600">{a.urgency}{a.deadline?' · Deadline '+new Date(a.deadline).toLocaleDateString():''}{a.prerequisiteStatus?' · '+a.prerequisiteStatus:''}</p>
        {(a.actionType==='SUBMIT_EVIDENCE')&&a.targetObligationId&&
          <button type="button" onClick={()=>{setSelectedAction(a.targetObligationId);setNotice('');}}
            className="mt-2 min-h-11 rounded-lg border border-forest-200 px-3 text-xs font-semibold">Add written evidence & caption</button>}
      </article>)}</div>}
    </div>
    {detail.currentVersion?.versionId&&<AgreementWorkProgress
      key={agreementId+':'+detail.currentVersion.versionId}
      agreementId={agreementId} versionId={detail.currentVersion.versionId}
      obligations={record.obligations??[]} actions={actions}
      gateways={gateways} session={session}/>}
    {selectedAction&&!uncertain&&<section aria-label="Written evidence and caption" className="space-y-3 rounded-2xl border border-forest-200 bg-white p-4" data-gate-b-evidence>
      <h3 className="text-base font-semibold">Written evidence & caption</h3>
      <p className="text-xs text-sand-700">This is a first written statement for the exact obligation and Agreement version. Replacing earlier evidence requires a separate reference to that specific evidence record, available through the authorised Progress journey. No photo or file is uploaded, and this does not mean beneficiary acceptance or completion.</p>
      {validEvidence&&obligation&&detail.currentVersion&&gateways.media&&
        <AgreementMediaEvidenceTool
          key={agreementId+':'+detail.currentVersion.versionId+':'+obligation.id+':'+obligation.stateVersion}
          agreementId={agreementId} versionId={detail.currentVersion.versionId}
          obligation={obligation} media={gateways.media}
          gateways={gateways} session={session}
          onSubmitted={()=>{setSelectedAction(null);setNotice('Verified photo/document evidence submitted to SecurePay for beneficiary review. No completion or payment was claimed.');setVersion(x=>x+1);}}/>}
      {validEvidence?<><label className="block text-xs font-semibold">Describe the evidence
        <textarea rows={4} maxLength={2000} value={caption} onChange={e=>setCaption(e.target.value)}
          className="mt-2 w-full rounded-xl border border-cream-200 p-3 text-sm" placeholder="What happened, where, when, and what can the other party verify?"/></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>void submit()} disabled={sending||caption.trim().length<3} className="min-h-11 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white disabled:opacity-40">{sending?'Submitting…':'Submit written evidence to SecurePay'}</button>
          <button type="button" disabled={sending} onClick={()=>setSelectedAction(null)} className="min-h-11 rounded-xl border border-cream-200 px-3 text-xs">Cancel</button>
        </div></>:<p role="alert" className="text-sm text-amber-800">Your current permissions or obligation version cannot be verified. Refresh before submitting.</p>}
    </section>}
    {uncertain&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">Evidence status is unconfirmed. Refresh the authorised record; never retry with a new key without reconciliation.</p>}
    {notice&&<p role="status" className="rounded-xl bg-cream-50 p-3 text-xs">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>{void onAskKs001(detail.overview.publicReference).catch(()=>setNotice('KS001 could not securely reopen a conversation. Your Agreement remains unchanged.'));}}
        className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-xs font-semibold">Ask KS001 for help</button>
      <button type="button" disabled={!detail.currentVersion} onClick={()=>void inspectMoney()}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-forest-200 bg-white px-4 text-xs font-semibold disabled:opacity-40"><Wallet size={15}/> Connect Agreement Money</button>
    </div>
    {moneyState==='loading'&&<p role="status" className="rounded-xl bg-cream-50 p-3 text-xs">Checking real Agreement-version Money and eligible rails…</p>}
    {moneyState==='error'&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">Money options are not verified for the current Agreement version. No rail can be selected here; refresh or use the authorised Money journey.</p>}
    {moneyState==='ready'&&moneySnapshot&&<div data-gate-b-work-money-chooser>
      <div data-gate5-money-truth role="status" className="mb-3 rounded-xl border border-cream-200 bg-white p-3 space-y-1">
        <p className="text-xs font-semibold text-forest-900">{describeMoneyTruth(moneySnapshot).title}</p>
        <p className="text-xs leading-5 text-sand-700">{describeMoneyTruth(moneySnapshot).detail}</p>
        <p className="text-xs text-sand-600">PaymentReady: {moneySnapshot.paymentReady.state}
          · Movement: {moneySnapshot.movement.state}
          · Release request authority: {moneySnapshot.releaseRequest.authorityGranted?'Server says granted; separate action still required':'Not granted'}</p>
      </div>
      <MoneyRailCeremony agreementTitle={detail.overview.title} options={moneySnapshot.fundingOptions}
        sample={false} quoteAllowed={moneySnapshot.feeQuoteRequestsPermitted}
        onProceed={railCode=>onOpenMoney(detail,railCode)}/>
      <p className="mt-2 text-xs text-sand-600">The rail choice is a preference; the existing authorised Money journey must obtain a current quote, show exact charges and obtain separate payer consent. No money is moved here.</p>
    </div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-xl border border-cream-200 bg-white p-3"><h3 className="text-sm font-semibold">Milestones</h3>
        <p className="mt-2 text-xs text-sand-700">{detail.milestones.length?detail.milestones.map(m=>m.title+' · '+m.status).join(' | '):'No milestones returned.'}</p></section>
      <section className="rounded-xl border border-cream-200 bg-white p-3"><h3 className="text-sm font-semibold">Evidence record</h3>
        <p className="mt-2 text-xs text-sand-700">{detail.documents.length?detail.documents.length+' recorded item(s). Open the full Agreement to inspect them.':'No evidence documents returned in this detail projection.'}</p></section>
    </div>
    <ProjectOutcomeComposer key={agreementId} agreementId={agreementId} gateways={gateways}
      session={session} onGoCommunity={onGoCommunity}/>
    <div className="flex gap-2 rounded-xl bg-cream-50 p-3 text-xs text-sand-700"><AlertCircle size={18} className="shrink-0"/> Media evidence is available only through the separately authorised isolated staging upload gateway. Uploads are not accepted evidence until explicitly submitted, reviewed and considered under the current Agreement version. Circle coordination and Money remain separate.</div>
  </div>}
 </section>;
}
