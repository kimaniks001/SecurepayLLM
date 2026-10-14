import { useState, useSyncExternalStore } from 'react';
import type { AgentController } from '../agent/controller';

/**
 * Phase 7 opt-in backend smoke experience. Uses the SAME authenticated/anonymous
 * conversation gateway and controller as AgentExperience: server conversation IDs,
 * clientTurnId idempotency, canonical context reads and unknown-outcome retry.
 *
 * No persona is injected into the user's text. Until the backend accepts a
 * first-class, permission-checked workspace intent, only My Work is enabled.
 * This intentionally does not replace the full AgentExperience source/review UI.
 */
export function LiveKs001Session({ controller }: { controller: AgentController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [draft, setDraft] = useState('');
  const canSend = !state.busy && !state.pending && !!draft.trim();
  return <section aria-label="Live KS001 backend conversation" className="flex min-h-[65vh] flex-1 flex-col">
    <div className="flex-1 space-y-3 overflow-auto p-4" aria-live="polite">
      {state.turns.length===0 && <p className="text-sm text-sand-700">Describe what you want to agree. Real replies will appear here; they are not scripted preview messages.</p>}
      {state.turns.map(turn=><div key={turn.id} className={`max-w-[95%] rounded-xl p-3 text-sm whitespace-pre-wrap ${turn.sender==='user'?'ml-auto bg-cream-100':'border border-cream-200 bg-white'}`}>
        <p className="mb-1 text-xs font-semibold text-sand-600">{turn.sender==='user'?'You':'KS001'}</p>
        {turn.sender==='user'?turn.text:turn.response.message.text}
      </div>)}
      {state.busy && <p role="status" className="text-sm text-sand-700">KS001 is working on your message…</p>}
      {state.error && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="text-sm">{state.error}</p><p className="mt-1 text-xs">A previous turn may already have reached SecurePay. Retry uses the same turn ID.</p></div>}
      {state.pending && !state.busy && <button type="button" onClick={()=>void controller.retry()} className="min-h-11 rounded-xl bg-cream-100 px-4 text-sm">Retry this turn safely</button>}
    </div>
    <form className="flex gap-2 border-t border-cream-200 p-3" onSubmit={e=>{e.preventDefault();const next=draft.trim();if(!next||state.busy||state.pending)return;setDraft('');void controller.send(next);}}>
      <label htmlFor="live-work-ks001-input" className="sr-only">Message live KS001</label>
      <input id="live-work-ks001-input" value={draft} onChange={e=>setDraft(e.target.value)} disabled={state.busy||!!state.pending} className="min-w-0 flex-1 rounded-xl border border-cream-200 p-3 text-sm" placeholder="Tell KS001 what you need to agree…"/>
      <button type="submit" disabled={!canSend} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-50">Send</button>
    </form>
  </section>;
}
