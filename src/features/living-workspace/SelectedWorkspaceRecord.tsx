import { useEffect, useState } from 'react';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';

export type PrivateRecordArea = 'work'|'vision'|'circle';
type RecordState = {
  phase:'loading'|'ready'|'error';
  title:string;
  facts:string[];
  error:string|null;
};
const initial:RecordState={phase:'loading',title:'',facts:[],error:null};

/**
 * S2 record detail is read ONLY after an explicit click, using its existing
 * authenticated backend. No side effects, version writes, role grants or
 * adoption of this snapshot as an Agreement or Circle decision.
 */
export function SelectedWorkspaceRecord({area,id,gateways,session,onClose}:{
  area:PrivateRecordArea;
  id:string;
  gateways:PreviewWorkspaceGateways;
  session:SessionStore;
  onClose:()=>void;
}){
  const [state,setState]=useState<RecordState>(initial);
  useEffect(()=>{
    let active=true;
    setState(initial);
    void (async()=>{
      try{
        await ensureFreshSession(session,gateways.auth);
        if(session.getSnapshot().status!=='signed-in')throw new Error('Sign in required');
        let title:string;
        let facts:string[];
        if(area==='work'){
          const result=await gateways.agreements.detail(id);
          if(result.overview.agreementId!==id)throw new Error('Wrong Agreement returned');
          title=result.overview.title;
          facts=[
            'Reference: '+result.overview.publicReference,
            'Status: '+result.overview.status,
            'Purpose: '+result.overview.purpose,
            'Version: '+(result.currentVersion?.versionNumber??'not established'),
            'Participants: '+result.participants.length,
            'Money authority: '+result.money.status,
          ];
        }else if(area==='vision'){
          const dream=await gateways.dreams.get(id);
          if(dream.dreamId!==id)throw new Error('Wrong Dream returned');
          title=dream.title;
          facts=[
            'Revision: '+dream.version,
            dream.locked?'Locked for editing':'Editable according to your Vision permissions',
            dream.content?.trim()||'No additional notes saved',
          ];
        }else{
          const circle=await gateways.community.circles.get(id);
          if(circle.id!==id)throw new Error('Wrong Circle returned');
          title=circle.name;
          facts=[
            circle.purpose,
            'Lifecycle: '+circle.status,
            'Visibility: '+circle.visibility,
            'Members reported by SecurePay: '+circle.memberCount,
            'This is a read-only summary. Governance and Circle-only content require the real Circle permissions.',
          ];
        }
        if(active && session.getSnapshot().status==='signed-in')setState({phase:'ready',title,facts,error:null});
      }catch{
        if(active)setState({phase:'error',title:'',facts:[],error:'This record could not be verified for your current identity. Try again in the real SecurePay experience.'});
      }
    })();
    return ()=>{active=false;};
  },[area,id,gateways,session]);
  return <section aria-label="Selected SecurePay record" className="rounded-xl border border-cream-200 bg-cream-50 p-4" data-structural-record-detail>
    <div className="flex items-center justify-between gap-2"><p className="text-xs uppercase tracking-wider text-sand-600">Verified server record · Read only</p><button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-white px-3 text-xs">Close</button></div>
    {state.phase==='loading'&&<p role="status" className="mt-2 text-sm">Checking access and current details…</p>}
    {state.phase==='error'&&<p role="alert" className="mt-2 text-sm">{state.error}</p>}
    {state.phase==='ready'&&<><p className="mt-2 text-sm font-semibold">{state.title}</p>
      {state.facts.map((f,i)=><p key={i} className="mt-2 text-xs leading-5 text-sand-700">{f}</p>)}
      <p className="mt-3 text-xs text-sand-600">Open the full existing journey to edit or act. No Agreement, Vision or Circle changes occur in this preview.</p>
    </>}
  </section>;
}
