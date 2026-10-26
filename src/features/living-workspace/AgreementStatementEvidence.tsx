import { useEffect, useState } from 'react';
import type { AgreementGateway, ObligationDto, EvidenceDto } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';

type State={phase:'loading'|'ready'|'error'; obligations:ObligationDto[]; message:string};
type Pending={obligationId:string; text:string; idempotencyKey:string; expectedAgreementVersionId:string; expectedObligationVersion:number};
/** Actual canonical statement evidence, not a substitute for an image/document upload.
 * Submit uses the existing idempotent, version-pinned API and lets the SERVER identify
 * the responsible participant. Unknown outcomes are NOT locally treated as saved. */
export function AgreementStatementEvidence({gateway,auth,session,agreementId,versionId,onRecorded}:{
  gateway:Pick<AgreementGateway,'obligations'|'submitEvidence'|'obligationEvidence'>;
  auth:AuthGateway;
  session:SessionStore;
  agreementId:string;versionId:string;
  onRecorded?:()=>void;
}){
  const [state,setState]=useState<State>({phase:'loading',obligations:[],message:''});
  const [selected,setSelected]=useState('');
  const [description,setDescription]=useState('');
  const [pending,setPending]=useState<Pending|null>(null);
  const [busy,setBusy]=useState(false);
  const [outcome,setOutcome]=useState('');
  const [knownEvidence,setKnownEvidence]=useState<EvidenceDto[]>([]);
  useEffect(()=>{
    let live=true;
    setState({phase:'loading',obligations:[],message:''});setSelected('');setDescription('');setPending(null);setOutcome('');setKnownEvidence([]);
    void (async()=>{
      try{
        await ensureFreshSession(session,auth);
        const all=await gateway.obligations(agreementId);
        if(!live)return;
        const valid=all.filter(o=>o.agreementId===agreementId&&o.agreementVersionId===versionId);
        setState({phase:'ready',obligations:valid,message:''});
      }catch{if(live)setState({phase:'error',obligations:[],message:'Could not verify current obligations. Refresh or sign in again.'});}
    })();
    return()=>{live=false;};
  },[agreementId,versionId,gateway,auth,session]);
  const current=state.obligations.find(o=>o.id===selected);
  async function send(request:Pending) {
    if(busy)return;
    setBusy(true);setOutcome('');
    try{
      const result=await gateway.submitEvidence(agreementId,request.obligationId,{
        idempotencyKey:request.idempotencyKey,
        expectedAgreementVersionId:request.expectedAgreementVersionId,
        expectedObligationVersion:request.expectedObligationVersion,
        evidenceType:'TEXT_STATEMENT',description:request.text});
      if(!result?.id||result.obligationId!==request.obligationId)
        throw new Error('SecurePay did not confirm which obligation received the statement.');
      setPending(null);setDescription('');setOutcome('Statement submitted to SecurePay. It is awaiting the applicable review; this has not completed the obligation or released Money.');
      const fresh=await gateway.obligationEvidence(agreementId,request.obligationId).catch(()=>null);
      if(fresh)setKnownEvidence(fresh);
      onRecorded?.();
    }catch(e){
      // Timeout, stale version or authentication failure cannot be diagnosed from a missing response.
      // Keep the exact pending payload and key for the next explicit retry. Never pretend acceptance.
      setPending(request);
      setOutcome(e instanceof Error?e.message:'SecurePay could not confirm the statement. Retry uses the same request and key.');
    }finally{setBusy(false);}
  }
  const submit=()=> {
    if(!current||!versionId||!description.trim()||pending||busy)return;
    const request:Pending={obligationId:current.id,text:description.trim(),idempotencyKey:crypto.randomUUID(),
      expectedAgreementVersionId:versionId,expectedObligationVersion:current.stateVersion};
    setPending(request);void send(request);
  };
  return <section data-gate-d-authorised-statement-evidence aria-label="Add written evidence to an Agreement obligation" className="space-y-3 rounded-xl border border-forest-200 bg-cream-50 p-4">
    <h3 className="font-display text-lg text-forest-900">Add evidence about work done</h3>
    <p className="text-xs leading-5 text-sand-700">SecurePay currently accepts a written statement against an obligation. This is not a photo or document upload. A caption alone cannot prove a photograph was received; evidence review, completion and payment release are separate.</p>
    {state.phase!=='ready'?<p role="status" className="text-sm">{state.phase==='loading'?'Checking your obligations…':state.message}</p>:<>
      <label className="block space-y-1 text-sm font-medium">Which obligation does this concern?
        <select aria-label="Agreement obligation" disabled={!!pending||busy} value={selected} onChange={e=>{setSelected(e.target.value);setOutcome('');setKnownEvidence([]);}}
          className="min-h-11 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm">
          <option value="">Choose the actual obligation</option>
          {state.obligations.map(o=><option value={o.id} key={o.id}>{o.title} · {o.status}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-sm font-medium">Written description / caption
        <textarea value={description} maxLength={4000} rows={4} disabled={!!pending||busy} onChange={e=>setDescription(e.target.value)}
          placeholder="Describe what was done, what can be inspected, and what still needs attention."
          className="w-full resize-y rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
      </label>
      <p className="text-xs text-sand-600">Only SecurePay's authorised participant may submit this statement. It is bound to the current Agreement and obligation versions, not a new Agreement.</p>
      {!pending?<button type="button" disabled={!current||!description.trim()||busy} onClick={submit}
        className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-50">Submit written evidence</button>:
        <button type="button" disabled={busy} onClick={()=>void send(pending)}
          className="min-h-11 rounded-xl border border-forest-300 bg-white px-4 text-sm font-semibold text-forest-900 disabled:opacity-50">Retry exact submission</button>}
      {outcome&&<p role="status" className="rounded-lg bg-white p-3 text-sm">{outcome}</p>}
      {knownEvidence.length>0&&<p className="text-xs text-sand-700">SecurePay returned {knownEvidence.length} evidence record(s) for this obligation. Review status and approval are separate.</p>}
    </>}
  </section>;
}
