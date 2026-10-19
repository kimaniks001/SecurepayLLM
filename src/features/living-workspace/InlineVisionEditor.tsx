import { useEffect, useState, useSyncExternalStore } from 'react';
import { DreamBuilder } from '../visionboard/dreams/DreamBuilder';
import { VisionCircleShare, type VisionCircleExcerpt } from './VisionCircleShare';
import { createVisionDreamController } from '../visionboard/dreams/controller';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';

/** S3: the original, revision-aware DreamBuilder inside the approved workspace.
 * The backend validates ownership and the selected Dream ID before we show it.
 * We do not implement another canvas/save service or use a mock identity.
 */
export function InlineVisionEditor({ id, gateways, session, onBack, onUnsavedChange }: {
  id:string;
  gateways:PreviewWorkspaceGateways;
  session:SessionStore;
  onBack:()=>void;
  onUnsavedChange:(dirty:boolean)=>void;
}) {
  const [controller] = useState(()=>createVisionDreamController(gateways.dreams,gateways.agent));
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [authError,setAuthError]=useState<string|null>(null);
  const [shareExcerpt,setShareExcerpt]=useState<VisionCircleExcerpt|null>(null);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      try {
        await ensureFreshSession(session,gateways.auth);
        if(!active || session.getSnapshot().status!=='signed-in') return;
        const success=await controller.openOwnedById(id);
        if(active&&!success)setAuthError('Could not confirm access to this Dream. Return to your saved Dreams and try again.');
      } catch {
        if(active)setAuthError('Please sign in again before opening this Dream.');
      }
    })();
    return ()=>{active=false;onUnsavedChange(false);};
  },[id,gateways,session,controller,onUnsavedChange]);

  return <section data-inline-vision-editor aria-label="Your private Dream editor" className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-xs uppercase tracking-wider text-sand-600">Vision · Real SecurePay record</p>
        <h2 className="font-display text-xl">Build your Dream</h2></div>
      <button type="button" className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm" onClick={onBack}>Back to my Dreams</button>
    </div>
    <p className="text-xs text-sand-600">Private by default. Board saves use SecurePay's existing revision, identity and asset rules. This does not create an Agreement or authorise Money.</p>
    {(state.phase==='idle' || state.phase==='loading')&&!state.selected&&
      <p role="status" className="rounded-xl bg-cream-100 p-4 text-sm">Opening your private Dream…</p>}
    {(authError||state.error)&&!state.selected&&
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{authError||state.error}</p>}
    {state.selected?.dreamId===id && <DreamBuilder key={state.selected.dreamId}
      dream={state.selected} gateway={gateways.dreams} onBack={onBack}
      onSaveTitle={(title,content,version)=>controller.saveSummary(title,content,version)}
      onShareSelected={setShareExcerpt}
      onUnsavedChange={onUnsavedChange}/>}
    {shareExcerpt && <VisionCircleShare key={shareExcerpt.objectId + ':' + shareExcerpt.boardRevision}
      excerpt={shareExcerpt} gateways={gateways} session={session}
      onClose={()=>setShareExcerpt(null)}/>}
  </section>;
}
