import { useEffect, useState, useSyncExternalStore } from 'react';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import { createVisionDreamController } from '../visionboard/dreams/controller';

/** Reuses the exact first-party Dream lifecycle and its uncertain-save retry.
 * No second conversation, storage implementation or fabricated save. */
export function VisionCreatePanel({gateways, session, onCreated}: {
  gateways: PreviewWorkspaceGateways;
  session: SessionStore;
  onCreated: (id:string)=>void;
}) {
  const [controller] = useState(() => createVisionDreamController(gateways.dreams, gateways.agent));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [thought,setThought] = useState('');
  const [confirmation,setConfirmation] = useState(false);

  useEffect(() => {
    // Session changes are handled by the existing signed-in gating and server.
    return () => controller.cancelPending();
  },[controller]);

  async function start() {
    try {
      await ensureFreshSession(session,gateways.auth);
      if(session.getSnapshot().status !== 'signed-in') throw Error('Please sign in.');
      const created = await controller.start(thought);
      if(created) onCreated(created.dreamId);
    } catch {
      setConfirmation(true);
    }
  }

  return <section aria-label="Start a private Vision" data-phase5-start-vision
      className="rounded-2xl border border-forest-100 bg-[#f8faf6] p-4 space-y-3">
    <div>
      <h3 className="font-display text-xl text-forest-900">What would you love to make happen?</h3>
      <p className="mt-1 text-xs leading-5 text-sand-600">Start with a thought. SecurePay keeps your Dream private and
        opens the existing creative board after confirming it was saved. Ideas are not Agreements.</p>
    </div>
    <label htmlFor="phase5-vision-thought" className="sr-only">Describe your dream</label>
    <textarea id="phase5-vision-thought" rows={3} maxLength={4000}
      value={thought} onChange={event => setThought(event.target.value)}
      placeholder="I want to build a home, start a bakery, plan a trip…"
      className="w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={!thought.trim() || !!state.pending || state.phase==='loading'}
        onClick={()=>void start()} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">
        {state.phase==='saving'?'Saving privately…':'Start this Vision'}
      </button>
      <span className="text-xs text-sand-600">No automatic sharing, invitations or payments</span>
    </div>
    {(state.error || confirmation) && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">
      {state.error || 'SecurePay could not confirm your identity. The Dream has not been claimed saved.'}
    </p>}
    {state.pending?.conversationId && <div className="space-y-2 rounded-xl border border-cream-200 bg-white p-3">
      <p className="text-xs text-sand-700">SecurePay could have saved your Vision before the connection was interrupted.
        Check the same attempt before retrying; do not create a duplicate.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={state.phase==='saving'||state.phase==='reconciling'}
          onClick={()=>void controller.reconcilePending().then(d => {if(d)onCreated(d.dreamId);})}
          className="min-h-11 rounded-lg border border-forest-200 px-3 text-xs">Check if it saved</button>
        <button type="button" disabled={state.phase==='saving'||state.phase==='reconciling'}
          onClick={()=>void controller.retry().then(d=>{if(d)onCreated(d.dreamId);})}
          className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Retry same save</button>
      </div>
    </div>}
    {state.pending && !state.pending.conversationId &&
      <button type="button" onClick={()=>controller.cancelPending()} className="min-h-11 text-xs underline">
        Edit this thought
      </button>}
  </section>;
}
