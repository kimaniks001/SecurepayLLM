import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AgentController } from '../agent/controller';
import { humanNextQuestion } from './livingLanguage';
import { MiniContextInput, type MiniKind } from './MiniContextInput';
import { WorkspaceWelcome } from './WorkspaceWelcome';
import { answerActions } from './answerActions';
import { readDraft, writeDraft } from '../conversation/drafts';

/** Present the final explicit question prominently, without changing server wording.
 * Replies without a clear question stay exactly as written.
 */
export function lastQuestion(text: string): { before: string; question: string } | null {
  const clean=text.trimEnd();
  if(!clean.endsWith('?'))return null;
  // Prefer the LAST explicit sentence or line boundary: a greedy start-of-string
  // alternative would incorrectly bold the entire KS001 reply.
  const breaks=/[.!?:]\s+|\n+/g;
  let start=0;
  for(const match of clean.matchAll(breaks))start=(match.index??0)+match[0].length;
  const question=clean.slice(start).trim();
  return question.endsWith('?')?{before:clean.slice(0,start),question}:null;
}
function Ks001Reply({ text, nextQuestion }: { text: string; nextQuestion?: string | null }) {
  const result=lastQuestion(text);
  if(result)return <><span>{result.before}</span><strong className="font-semibold text-forest-900">{result.question}</strong></>;
  const action=nextQuestion?.trim()?humanNextQuestion(nextQuestion ?? ''):'';
  if(!action)return <>{text}</>;
  const pos=text.lastIndexOf(action);
  if(pos>=0)return <><span>{text.slice(0,pos)}</span><strong className="font-semibold text-forest-900">{action}</strong><span>{text.slice(pos+action.length)}</span></>;
  return <><span>{text.trimEnd()}</span><strong className="mt-2 block font-semibold text-forest-900">{action}</strong></>;
}

/**
 * Phase 7 opt-in backend smoke experience. Uses the SAME authenticated/anonymous
 * conversation gateway and controller as AgentExperience: server conversation IDs,
 * clientTurnId idempotency, canonical context reads and unknown-outcome retry.
 *
 * No persona is injected into the user's text. Until the backend accepts a
 * first-class, permission-checked workspace intent, only My Work is enabled.
 * This intentionally does not replace the full AgentExperience source/review UI.
 */
export function LiveKs001Session({ controller, nextQuestion, opening, onOpenTool, draftRevision=0 }: { controller: AgentController; nextQuestion?: string | null; opening?: string; onOpenTool?:(name:'Photos'|'Places'|'People & Invitations')=>void; draftRevision?:number }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [draft, setDraft] = useState('');
  // Review handoffs only populate the existing conversation's unsent composer.
  // Rehydrate whenever the authorised conversation or the explicit handoff
  // revision changes; do NOT submit a message on behalf of the human.
  useEffect(()=>{
    setDraft(readDraft(state.conversationId??undefined));
  },[state.conversationId,draftRevision]);
  const [mini,setMini] = useState<{kind:MiniKind;question:string}|null>(null);
  const historyEnd=useRef<HTMLDivElement|null>(null);
  const lastTurn=state.turns[state.turns.length-1]?.id;
  useEffect(()=>{historyEnd.current?.scrollIntoView({block:'end',behavior:'smooth'});},[lastTurn]);
  const canSend = !state.busy && !state.pending && !state.sourceContinuationPending && !!draft.trim();
  return <section aria-label="Live KS001 backend conversation" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-white via-white to-[#fcfcf8] p-4" aria-live="polite">
      {state.turns.length===0 && !state.conversationId && !draft.trim() && <WorkspaceWelcome area="work" onExample={value=>{
        if(value.prompt)setDraft(existing=>{
          const next=existing.trim()?existing:value.prompt;
          writeDraft(state.conversationId??undefined,next);
          return next;
        });
        document.getElementById('live-work-ks001-input')?.focus();
      }}/>}
      {state.turns.length>0 && opening && <span className="sr-only">{opening}</span>}
      {state.turns.map(turn=><div key={turn.id} className={`max-w-[95%] rounded-xl p-3 text-sm whitespace-pre-wrap ${turn.sender==='user'?'ml-auto bg-cream-100':'border border-cream-200 bg-white'}`}>
        <p className="mb-1 text-xs font-semibold text-sand-600">{turn.sender==='user'?'You':'KS001'}</p>
        {turn.sender==='user'?turn.text:<Ks001Reply text={turn.response.message.text} nextQuestion={turn.id===lastTurn&&!state.busy&&!state.pending?nextQuestion:null}/>}
      </div>)}
      {state.busy && <p role="status" className="text-sm text-sand-700">KS001 is working on your message…</p>}
      {state.sourceContinuationPending && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3">
        <p className="text-sm">{state.sourceContinuationPending.error}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={state.busy} onClick={()=>void controller.retrySourceContinuation()} className="min-h-11 rounded-lg border border-amber-400 bg-white px-3 text-xs font-medium disabled:opacity-50">Retry KS001 reply</button>
          <button type="button" disabled={state.busy} onClick={()=>controller.continueWithoutSourceReply()} className="min-h-11 rounded-lg px-3 text-xs font-medium underline disabled:opacity-50">Continue without that reply</button>
        </div>
      </div>}
      {state.error && !state.sourceContinuationPending && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="text-sm">{state.error}</p><p className="mt-1 text-xs">A previous turn may already have reached SecurePay. Retry uses the same turn ID.</p></div>}
      <div ref={historyEnd} aria-hidden="true"/>
      {state.pending && !state.busy && <button type="button" onClick={()=>void controller.retry()} className="min-h-11 rounded-xl bg-cream-100 px-4 text-sm">Retry this turn safely</button>}
    </div>
    {state.turns.length>0&&!state.busy&&!state.pending&&!state.sourceContinuationPending&&(()=>{
      const last=[...state.turns].reverse().find(turn=>turn.sender!=='user');
      if(!last)return null;
      const question=lastQuestion(last.response.message.text);
      const currentQuestion=question?.question ?? nextQuestion ?? '';
      const actions=answerActions(currentQuestion);
      if(!actions.length)return null;
      return <div className="flex flex-wrap gap-2 px-4 pb-3" aria-label="Suggested replies">
        {actions.map(action=><button key={action.label} type="button"
          onClick={()=>{
            if(action.type==='mini'){setMini({kind:action.kind,question:currentQuestion});return;}
            if(action.type==='tool'){
              if(onOpenTool)onOpenTool(action.tool);
              else document.getElementById('live-work-ks001-input')?.focus();
              return;
            }
            if(action.type==='focus'){document.getElementById('live-work-ks001-input')?.focus();return;}
            if(state.busy||state.pending||state.sourceContinuationPending)return;
            if(action.type==='local-day'){
              const date=new Date(); date.setDate(date.getDate()+action.days);
              const iso=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
              void controller.send('The date is '+iso+'. I have not specified a time.');
              return;
            }
            void controller.send(action.value);
          }}
          className="min-h-11 rounded-full border border-cream-200 bg-white px-3 text-xs font-medium hover:bg-cream-100">{action.label}</button>)}
      </div>;
    })()}
    {mini && <div className="shrink-0 border-t border-cream-200 bg-[#f9faf7] px-4 py-3" data-ks001-mini-answer>
      <MiniContextInput kind={mini.kind} label={mini.kind==='date'?'When?':mini.kind==='time'?'What time?':mini.kind==='money'?'Amount':mini.kind==='person'?'Who?':'Where?'}
        onCancel={()=>setMini(null)}
        onSubmit={async value=>{
          if(state.busy||state.pending||state.sourceContinuationPending)throw new Error('Resolve the pending KS001 source reply first');
          const answer = mini.kind==='date' ? 'The date is '+value+'.' : mini.kind==='time' ? 'The local time is '+value+'.' : mini.kind==='money' ? value+'.' : mini.kind==='person' ? 'The person is '+value+'.' : 'The place is '+value+'.';
          await controller.send(answer);
          const latest=controller.getSnapshot();
          if(latest.error||latest.pending)throw new Error('Awaiting confirmation');
          setMini(null);
        }}/>
    </div>}
    <form className="shrink-0 flex gap-2 border-t border-cream-200 bg-white p-3" onSubmit={e=>{
      e.preventDefault();const next=draft.trim();if(!next||state.busy||state.pending||state.sourceContinuationPending)return;
      void (async()=>{await controller.send(next);const current=controller.getSnapshot();
        if(!current.error&&!current.pending){
          setDraft(text=>text.trim()===next?'':text);
          if(draft.trim()===next)writeDraft(state.conversationId??undefined,'');
        }
      })();
    }}>
      <label htmlFor="live-work-ks001-input" className="sr-only">Message live KS001</label>
      <input id="live-work-ks001-input" value={draft} onChange={e=>{setDraft(e.target.value);writeDraft(state.conversationId??undefined,e.target.value);}} disabled={state.busy||!!state.pending||!!state.sourceContinuationPending} className="min-w-0 flex-1 rounded-xl border border-cream-200 p-3 text-sm" placeholder="Tell KS001 what you would like to make clear…"/>
      <button type="submit" disabled={!canSend} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-50">Send</button>
    </form>
  </section>;
}
