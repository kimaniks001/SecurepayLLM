import { ChevronDown, Circle, Check, HelpCircle } from 'lucide-react';
import type { AgentController, AgentState } from './controller';

export function TradeContext({ state, controller, expanded, onToggle }: { state: AgentState; controller: AgentController; expanded: boolean; onToggle: () => void }) {
  const { context } = state;
  const entityName = (id: string) => {
    const value = context.data?.facts.find(fact => fact.targetKind === 'ENTITY' && fact.id === id)?.value;
    return typeof value === 'string' ? value : id;
  };
  return <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
    <button onClick={onToggle} aria-expanded={expanded} className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream-50 transition-colors">
      <span className="text-[0.825rem] font-medium text-forest-700">What SecurePay understands</span>
      <ChevronDown className={`w-4 h-4 text-sand-400 ${expanded ? 'rotate-180' : ''}`} />
    </button>
    {expanded && <div className="px-4 pb-3 animate-fade-in-down">
      {context.status === 'loading' && <p role="status">Updating understanding…</p>}
      {context.status === 'error' && <p role="alert" className="text-sm text-sand-600">{context.error}</p>}
      {context.status === 'idle' && <p className="text-sm text-sand-500">Start talking and details will appear here.</p>}
      {/* Final Phase 4 Economy Turn 2 (Section 10) -- provenance, never authority: seeing this
          never means the source was accepted, joined, or purchased; it only shows where this
          conversation is currently proceeding from, before any Agreement review/progression. */}
      {state.source && (
        <div className="mb-2 rounded-lg bg-cream-50 border border-cream-200 px-3 py-2">
          <p className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide">Started from</p>
          <p className="text-[0.8rem] text-forest-800">{state.source.sourceTitle}{state.source.sourceOwnerKsNumber ? ` · ${state.source.sourceOwnerKsNumber}` : ''}</p>
        </div>
      )}
      {context.status === 'ready' && <>
        <p className="text-[0.75rem] text-sand-500 mb-2">Trade Context only — known in this conversation, not canonical Agreement terms.</p>
        {context.data?.facts.length === 0 && <p className="text-sm text-sand-500">No facts yet.</p>}
        {context.data?.facts.map(fact => <div key={`${fact.targetKind}:${fact.id}`} className="flex items-start gap-2.5 py-2.5 border-b border-cream-100 last:border-0">
          <span className="pt-0.5 shrink-0">{fact.state === 'CONFIRMED' ? <Check className="w-3.5 h-3.5 text-forest-500" /> : fact.state === 'CANDIDATE' ? <Circle className="w-3 h-3 text-ember-400" /> : <HelpCircle className="w-3.5 h-3.5 text-sand-400" />}</span>
          <div className="min-w-0 flex-1 break-words">
            {/* Final Phase 3 question-focused pass (Section 6, truth vocabulary): these are
                conversation-confirmed facts, never canonical Agreement/Home truth -- the whole
                card lives under STILL TO DECIDE, so the inner label must never say "Confirmed",
                which would visually contradict that heading and imply promoted Agreement terms. */}
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase">{fact.label} · {fact.state === 'CONFIRMED' ? 'Known in this conversation' : fact.state === 'CANDIDATE' ? 'Candidate' : `Unknown state (${fact.state})`}</div>
            <p className="text-[0.875rem] text-forest-800">{typeof fact.value === 'string' ? fact.value : `${entityName(fact.value.subjectId)} → ${entityName(fact.value.objectId)}`}</p>
            {Object.entries(fact.provenance).map(([key, value]) => <p key={key} className="text-[0.75rem] text-sand-500">{key}: {value}</p>)}
            {fact.state === 'CANDIDATE' && <button disabled={state.busy || !!state.pending} onClick={() => void controller.adopt(fact.id, fact.targetKind)} className="mt-2 rounded-lg bg-forest-50 border border-forest-200 px-3 py-1.5 text-sm text-forest-700 disabled:opacity-40">Use this</button>}
          </div>
        </div>)}
      </>}
      <button disabled={state.busy} onClick={() => void controller.review()} className="mt-3 text-sm text-forest-700 underline disabled:opacity-40">Refresh understanding</button>
    </div>}
  </div>;
}
