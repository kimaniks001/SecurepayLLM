import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AgentController } from '../agent/controller';
import { humanNextQuestion } from './livingLanguage';
import { MiniContextInput, type MiniKind } from './MiniContextInput';
import { WorkspaceWelcome } from './WorkspaceWelcome';

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
function Ks001Reply({ text }: { text: string }) {
  const result=lastQuestion(text);
  if(!result)return <>{text}</>;
  return <><span>{result.before}</span><strong className="font-semibold text-forest-900">{result.question}</strong></>;
}
function replyPills(question:string):string[] {
  const lower=question.toLowerCase();
  if(/where|location|address|deliver to/.test(lower))return ["I'll type the place",'Not sure yet'];
  if(/when|date|deadline|time/.test(lower))return ["I'll enter the date",'To be agreed','Not sure yet'];
  if(/who|which person|responsible|supplier|buyer|seller/.test(lower))return ["I'll name the person",'Not decided yet'];
  if(/how much|price|amount|cost|budget|payment/.test(lower))return ["I'll enter an amount",'To be agreed'];
  if(/confirm|is that correct|does this look right|agree/.test(lower))return ['Yes, that is correct','I need to correct something'];
  return ["I'll answer",'Help me decide','Not sure yet'];
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
export function LiveKs001Session({ controller, nextQuestion, opening }: { controller: AgentController; nextQuestion?: string | null; opening?: string }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [draft, setDraft] = useState('');
  const [mini,setMini] = useState<{kind:MiniKind;question:string}|null>(null);
  const historyEnd=useRef<HTMLDivElement|null>(null);
  const lastTurn=state.turns[state.turns.length-1]?.id;
  useEffect(()=>{historyEnd.current?.scrollIntoView({block:'end',behavior:'smooth'});},[lastTurn]);
  const canSend = !state.busy && !state.pending && !!draft.trim();
  return <section aria-label="Live KS001 backend conversation" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-white via-white to-[#fcfcf8] p-4" aria-live="polite">
      {state.turns.length===0 && <WorkspaceWelcome area="work" onExample={value=>{
        if(value.prompt)setDraft(existing=>existing.trim()?existing:value.prompt);
        document.getElementById('live-work-ks001-input')?.focus();
      }}/>}
      {state.turns.length>0 && opening && <span className="sr-only">{opening}</span>}
      {state.turns.map(turn=><div key={turn.id} className={`max-w-[95%] rounded-xl p-3 text-sm whitespace-pre-wrap ${turn.sender==='user'?'ml-auto bg-cream-100':'border border-cream-200 bg-white'}`}>
        <p className="mb-1 text-xs font-semibold text-sand-600">{turn.sender==='user'?'You':'KS001'}</p>
        {turn.sender==='user'?turn.text:<Ks001Reply text={turn.response.message.text}/>}
      </div>)}
      {state.busy && <p role="status" className="text-sm text-sand-700">KS001 is working on your message…</p>}
      {state.error && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="text-sm">{state.error}</p><p className="mt-1 text-xs">A previous turn may already have reached SecurePay. Retry uses the same turn ID.</p></div>}
      <div ref={historyEnd} aria-hidden="true"/>
      {state.pending && !state.busy && <button type="button" onClick={()=>void controller.retry()} className="min-h-11 rounded-xl bg-cream-100 px-4 text-sm">Retry this turn safely</button>}
    </div>
    {state.turns.length>0&&!state.busy&&!state.pending&&nextQuestion&&!lastQuestion([...state.turns].reverse().find(turn=>turn.sender!=='user')?.response.message.text ?? '')&&<div className="px-4 pb-2"><p className="text-xs text-sand-600">Next to clarify</p><p className="text-sm font-semibold">{humanNextQuestion(nextQuestion)}</p></div>}
    {state.turns.length>0&&!state.busy&&!state.pending&&(()=>{
      const last=[...state.turns].reverse().find(turn=>turn.sender!=='user');
      if(!last)return null;
      const question=lastQuestion(last.response.message.text);
      const pills=replyPills(question?.question ?? nextQuestion ?? '');
      return <div className="flex flex-wrap gap-2 px-4 pb-3" aria-label="Suggested replies">
        {pills.map(answer=><button key={answer} type="button"
          onClick={()=>{
            const kind:MiniKind|null=answer==="I'll enter the date"?'date':answer==="I'll enter an amount"?'money':
              answer==="I'll name the person"?'person':answer==="I'll type the place"?'place':null;
            if(kind){setMini({kind,question:question?.question??nextQuestion??''});return;}
            if(answer==="I'll answer"){document.getElementById('live-work-ks001-input')?.focus();return;}
            void controller.send(answer);
          }}
          className="min-h-11 rounded-full border border-cream-200 bg-white px-3 text-xs font-medium hover:bg-cream-100">{answer}</button>)}
      </div>;
    })()}
    {mini && <div className="shrink-0 border-t border-cream-200 bg-[#f9faf7] px-4 py-3" data-ks001-mini-answer>
      <MiniContextInput kind={mini.kind} label={mini.kind==='date'?'When?':mini.kind==='money'?'Amount':mini.kind==='person'?'Who?':'Where?'}
        onCancel={()=>setMini(null)}
        onSubmit={async value=>{
          if(state.busy||state.pending)throw new Error('Previous turn not finished');
          await controller.send('For your question "'+mini.question+'", I propose: '+value+'. Please incorporate it into my current draft after checking for contradictions. This is not an accepted term.');
          const latest=controller.getSnapshot();
          if(latest.error||latest.pending)throw new Error('Awaiting confirmation');
          setMini(null);
        }}/>
    </div>}
    <form className="shrink-0 flex gap-2 border-t border-cream-200 bg-white p-3" onSubmit={e=>{
      e.preventDefault();const next=draft.trim();if(!next||state.busy||state.pending)return;
      void (async()=>{await controller.send(next);const current=controller.getSnapshot();
        if(!current.error&&!current.pending)setDraft(text=>text.trim()===next?'':text);
      })();
    }}>
      <label htmlFor="live-work-ks001-input" className="sr-only">Message live KS001</label>
      <input id="live-work-ks001-input" value={draft} onChange={e=>setDraft(e.target.value)} disabled={state.busy||!!state.pending} className="min-w-0 flex-1 rounded-xl border border-cream-200 p-3 text-sm" placeholder="Tell KS001 what you would like to make clear…"/>
      <button type="submit" disabled={!canSend} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-50">Send</button>
    </form>
  </section>;
}
