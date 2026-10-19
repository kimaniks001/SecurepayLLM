import { useEffect, useState, useSyncExternalStore } from 'react';
import { DreamBuilder } from '../visionboard/dreams/DreamBuilder';
import { dreamContinuation } from '../visionboard/dreams/controller';
import type { DreamHandoff } from '../visionboard/dreams/handoff';
import { VisionCircleShare, type VisionCircleExcerpt } from './VisionCircleShare';
import { createVisionDreamController } from '../visionboard/dreams/controller';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';

/** S3: the original, revision-aware DreamBuilder inside the approved workspace.
 * The backend validates ownership and the selected Dream ID before we show it.
 * We do not implement another canvas/save service or use a mock identity.
 */
export function InlineVisionEditor({ id, gateways, session, onBack, onUnsavedChange, onContinueToWork }: {
  id:string;
  gateways:PreviewWorkspaceGateways;
  session:SessionStore;
  onBack:()=>void;
  onUnsavedChange:(dirty:boolean)=>void;
  onContinueToWork:(reviewed:DreamHandoff)=>Promise<void>;
}) {
  const [controller] = useState(()=>createVisionDreamController(gateways.dreams,gateways.agent));
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [authError,setAuthError]=useState<string|null>(null);
  const [shareExcerpt,setShareExcerpt]=useState<VisionCircleExcerpt|null>(null);
  const [reviewText,setReviewText]=useState<string|null>(null);
  const [handoffBusy,setHandoffBusy]=useState(false);
  const [handoffError,setHandoffError]=useState<string|null>(null);
  const [workConfirmed,setWorkConfirmed]=useState(false);
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
      onExploreKs001={text=>{setReviewText(text);setHandoffError(null);setWorkConfirmed(false);}}
      onUnsavedChange={onUnsavedChange}/>}
    {reviewText!==null && state.selected?.dreamId===id && <section data-vision-work-review
      role="dialog" aria-label="Review Vision material for My Work"
      className="space-y-3 rounded-2xl border border-forest-200 bg-white p-4">
      <h3 className="font-display text-lg">Review what KS001 will see</h3>
      <p className="text-sm text-sand-700">Only these reviewed words enter the original Dream's KS001
        conversation as an <strong>unsent draft</strong>. SecurePay must reauthorise the conversation.
        No Agreement, invitation or payment is created.</p>
      <label className="block text-xs font-medium">Selected Vision material
        <textarea value={reviewText} onChange={event=>{setReviewText(event.target.value);setWorkConfirmed(false);}}
          maxLength={1200} rows={4} className="mt-2 w-full rounded-xl border border-cream-200 p-3 text-sm"/>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={workConfirmed} onChange={event=>setWorkConfirmed(event.target.checked)}
          className="mt-1 size-4"/> I reviewed this draft and want to continue in My Work.
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!workConfirmed || !reviewText.trim() || handoffBusy}
          onClick={()=>void (async()=>{
            setHandoffBusy(true);setHandoffError(null);
            try { await onContinueToWork(dreamContinuation(state.selected!,reviewText)); }
            catch(error){setHandoffError(error instanceof Error ? error.message : 'KS001 could not open your saved Dream conversation.');}
            finally{setHandoffBusy(false);}
          })()} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">
          {handoffBusy?'Checking conversation…':'Continue in My Work'}
        </button>
        <button type="button" disabled={handoffBusy} onClick={()=>setReviewText(null)}
          className="min-h-11 rounded-xl border border-cream-200 px-4 text-sm">Keep exploring</button>
      </div>
      {handoffError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">{handoffError}</p>}
    </section>}
    {shareExcerpt && <VisionCircleShare key={shareExcerpt.objectId + ':' + shareExcerpt.boardRevision}
      excerpt={shareExcerpt} gateways={gateways} session={session}
      onClose={()=>setShareExcerpt(null)}/>}
  </section>;
}
