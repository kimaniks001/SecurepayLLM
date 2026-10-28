import { useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ObligationDto, EvidenceDto, ObligationCompletionStatusDto, NextActionDto } from '../../api/securepay/agreements';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import { describeExecutionTruth } from './executionTruth';

type Detail={phase:'idle'|'loading'|'ready'|'error'; evidence:EvidenceDto[]; completion:ObligationCompletionStatusDto|null};
const clear=():Detail=>({phase:'idle',evidence:[],completion:null});

/** Evidence is read from the existing participant-authorised Agreement authority,
 * never reconstructed from Circle quick replies or submitted as payment proof.
 * Nothing here can complete an obligation or release Money.
 */
export function AgreementWorkProgress({agreementId,versionId,obligations,actions,gateways,session}:{
  agreementId:string;versionId:string;obligations:ObligationDto[];actions:NextActionDto[];
  gateways:PreviewWorkspaceGateways;session:SessionStore;
}) {
  const [selected,setSelected]=useState<string|null>(null);
  const [detail,setDetail]=useState<Detail>(clear);
  const [refresh,setRefresh]=useState(0);
  const current=obligations.filter(item=>item.agreementId===agreementId && item.agreementVersionId===versionId);
  const focused=current.find(item=>item.id===selected)??null;
  useEffect(()=>{setSelected(null);setDetail(clear());},[agreementId,versionId,session]);
  useEffect(()=>{
    let active=true;
    setDetail(clear());
    if(!focused)return()=>{active=false;};
    setDetail({phase:'loading',evidence:[],completion:null});
    void (async()=>{
      try {
        await ensureFreshSession(session,gateways.auth);
        if(session.getSnapshot().status!=='signed-in')throw Error('Session is not active');
        const [evidence,completion]=await Promise.all([
          gateways.agreements.obligationEvidence(agreementId,focused.id),
          gateways.agreements.obligationCompletionStatus(agreementId,focused.id),
        ]);
        if(!active)return;
        if(!Array.isArray(evidence)||evidence.some(item=>item.obligationId!==focused.id))
          throw Error('Unrelated evidence received');
        setDetail({phase:'ready',evidence,completion});
      } catch {
        if(active)setDetail({phase:'error',evidence:[],completion:null});
      }
    })();
    return ()=>{active=false;};
  },[agreementId,versionId,focused?.id,gateways,session,refresh]);
  return <section data-gate5-agreement-work aria-label="Agreement work and evidence" className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3">
    <div className="flex items-center gap-2"><ClipboardCheck size={17} className="text-forest-700"/>
      <h2 className="text-sm font-semibold text-forest-900">Work & evidence</h2></div>
    <p className="text-xs leading-5 text-sand-700">These responsibilities and evidence belong to this Agreement version.
      Circle checkpoints coordinate people, but they cannot change these records.</p>
    {current.length===0?<p className="text-xs text-sand-600">No verified current-version obligations returned. This does not prove the work is finished.</p>:
      <div className="space-y-2">{current.map(item=>{
        const next=actions.filter(action=>action.targetObligationId===item.id);
        return <article key={item.id} className="rounded-xl border border-cream-200 p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-forest-900">{item.title}</p>
            <span className="text-xs text-sand-600">{item.status.replace(/_/g,' ').toLowerCase()}</span>
          </div>
          {item.description&&<p className="text-xs text-sand-700">{item.description}</p>}
          {next.length>0&&<p className="text-xs text-forest-700">{next.length} current action{next.length===1?'':'s'} for you</p>}
          <button type="button" onClick={()=>setSelected(value=>value===item.id?null:item.id)}
            aria-expanded={selected===item.id}
            className="min-h-11 text-xs font-semibold text-forest-700 underline">
            {selected===item.id?'Close evidence':'View evidence and completion conditions'}
          </button>
        </article>;
      })}</div>}
    {focused&&<div className="space-y-2 rounded-xl bg-cream-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">{focused.title} · current evidence</h3>
        <button type="button" onClick={()=>setRefresh(x=>x+1)}
          className="min-h-11 inline-flex items-center gap-1 text-xs underline"><RefreshCw size={13}/> Refresh</button>
      </div>
      {detail.phase==='loading'&&<p role="status" className="text-xs">Checking authorised evidence and completion…</p>}
      {detail.phase==='error'&&<p role="alert" className="text-xs text-amber-900">
        SecurePay could not verify current evidence. No completion or approval is assumed.</p>}
      {detail.phase==='ready'&&<>
        {detail.evidence.length===0?<p className="text-xs text-sand-600">No evidence entries returned for this obligation.</p>:
          detail.evidence.map(e=><div key={e.id} className="rounded-lg bg-white p-2 space-y-1">
            <p className="text-xs font-semibold">{e.evidenceType.replace(/_/g,' ')} · {e.status.replace(/_/g,' ')}</p>
            {e.description&&<p className="text-xs text-sand-700 whitespace-pre-wrap break-words">{e.description}</p>}
            <p className="text-xs text-sand-600">Beneficiary review: {e.reviewState?.replace(/_/g,' ').toLowerCase()??'Not confirmed'}</p>
          </div>)}
        <p className="text-xs font-semibold text-forest-800">{describeExecutionTruth(detail.completion).title}</p>
        <p className="text-xs leading-5 text-sand-700">{describeExecutionTruth(detail.completion).detail}</p>
        {!!detail.completion?.unmetRequirements?.length&&<ul className="list-disc pl-5 text-xs text-sand-700 space-y-1">
          {detail.completion.unmetRequirements.slice(0,6).map((requirement,i)=><li key={i}>{requirement.replace(/_/g,' ')}</li>)}
        </ul>}
      </>}
    </div>}
    <p className="flex items-start gap-2 text-xs leading-5 text-sand-600"><ShieldCheck size={15} className="shrink-0"/>
      A submitted photo, document or statement is evidence awaiting the appropriate review. Neither an uploaded file, a Circle response nor an approved evidence item independently authorises payment.</p>
  </section>;
}
