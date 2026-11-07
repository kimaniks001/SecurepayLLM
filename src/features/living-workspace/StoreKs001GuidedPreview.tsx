import { useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { SelectionItem } from '../store/shopSelection.mjs';

type Turn={speaker:'shopper'|'example';text:string;id:number};

function firstQuestion(items:SelectionItem[]) {
  if(items.length>1) return 'Are these offers for the same project or different needs?';
  const item=items[0];
  if(!item) return 'What are you looking for in the Digital Stores today?';
  const text=item.title.toLowerCase();
  if(/survey|land|plot/.test(text))return 'Where is the property, and what kind of survey do you need?';
  if(/paint|install|service|repair|construction/.test(text))return 'Where will the work take place?';
  if(/camera|cctv|security/.test(text))return 'Where will the cameras be installed?';
  return 'Where should this item be delivered or collected?';
}

function followUp(items:SelectionItem[],answerIndex:number):string {
  if(answerIndex===1) return 'When would you ideally need this completed or delivered?';
  if(answerIndex===2) return 'Is there a budget you want us to keep in mind?';
  if(answerIndex===3) return 'Would you like to inspect each trader’s availability and what is included before discussing an Agreement?';
  if(answerIndex===4 && items.some(x=>x.unitMinor===null))
    return 'Some prices still need confirming. Would you like to ask the traders for a quote?';
  return 'Your choices are still only ideas. In the live KS001 conversation, the next step is to verify each trader, their available offers and the terms you actually agree to.';
}

/**
 * A deliberately scripted, local, interactive conversation for the Vercel
 * owner review only. Never described as live KS001. Never connects a model,
 * sends to a seller, creates a Dream/Agreement, claims real availability, or
 * writes anything to a backend. Authenticated visitors use LiveKs001Session.
 */
export function StoreKs001GuidedPreview({items}:{items:SelectionItem[]}) {
  const [turns,setTurns]=useState<Turn[]>([]);
  const [draft,setDraft]=useState('');
  const [index,setIndex]=useState(0);
  const [error,setError]=useState('');
  const send=(value:string)=>{
    const answer=value.trim().slice(0,400);
    if(!answer){setError('Write your answer or choose a suggestion.');return;}
    setError('');
    const next=index+1;
    setTurns(current=>[
      ...current,
      {speaker:'shopper',text:answer,id:current.length+1},
      {speaker:'example',text:followUp(items,next),id:current.length+2},
    ]);
    setIndex(next);
    setDraft('');
  };
  return <section data-store-guided-conversation aria-label="Interactive example of shopping with KS001" className="flex min-h-0 flex-1 flex-col">
    <header className="shrink-0 border-b border-cream-200 bg-forest-50 p-4">
      <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-forest-800"><MessageCircle size={15}/> KS001 · Guided shopping example</p>
      <p className="mt-1 text-xs leading-5 text-sand-700">
        This preview demonstrates a discussion; the replies are scripted, not live AI. Real KS001 needs a signed-in, connected SecurePay session.
      </p>
    </header>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      <div className="rounded-xl border border-cream-200 bg-white p-3">
        <p className="text-[0.7rem] font-semibold text-forest-900">What you've selected</p>
        {items.length ? items.map(item=><p key={item.key} className="mt-1 text-xs leading-5 text-sand-700">
          {item.quantity} × {item.title} · {item.sellerName} <span className="text-forest-700">({item.destination==='vision'?'Vision':'Agreement'})</span>
        </p>):<p className="mt-1 text-xs text-sand-600">Nothing selected yet. You can still ask what to look for.</p>}
        <p className="mt-2 text-[0.7rem] leading-5 text-sand-500">
          These are example seller listings, not verified quotes or reserved items.
        </p>
      </div>
      <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-forest-50 p-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-forest-700">KS001 · Scripted preview</p>
        <p className="mt-1 text-sm leading-6 text-forest-900">
          {items.length ? 'I can see your selection. We can work out what you need before contacting anyone.' : 'I can help you understand what you need.'}
          {' '}{firstQuestion(items)}
        </p>
      </div>
      {turns.map(turn=><div key={turn.id} className={turn.speaker==='shopper'?'ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-forest-800 p-3 text-white':'max-w-[95%] rounded-2xl rounded-tl-sm bg-forest-50 p-3 text-forest-900'}>
        <p className={'text-[0.66rem] font-semibold uppercase tracking-wide '+(turn.speaker==='shopper'?'text-white/80':'text-forest-700')}>
          {turn.speaker==='shopper'?'You':'KS001 · Scripted preview'}
        </p>
        <p className="mt-1 text-sm leading-6">{turn.text}</p>
      </div>)}
    </div>
    <form onSubmit={(event:FormEvent)=>{event.preventDefault();send(draft);}} className="shrink-0 border-t border-cream-200 bg-white p-3">
      <p className="mb-2 text-[0.7rem] text-sand-600">Your reply in this example</p>
      {index===0 && <div className="mb-2 flex flex-wrap gap-2">
        {['Same project','Different projects','Not sure yet'].map(label=><button type="button" key={label} onClick={()=>send(label)}
          className="min-h-9 rounded-full border border-forest-200 bg-forest-50 px-3 text-xs font-medium text-forest-800">{label}</button>)}
      </div>}
      <div className="flex items-end gap-2">
        <textarea aria-label="Your reply to KS001" rows={2} maxLength={400} value={draft}
          onChange={event=>setDraft(event.target.value)} placeholder="Tell KS001 in your own words…"
          className="min-h-12 min-w-0 flex-1 resize-none rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest-900"/>
        <button type="submit" disabled={!draft.trim()} aria-label="Send example reply"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-white disabled:opacity-40"><Send size={18}/></button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-ember-700">{error}</p>}
      <p className="mt-2 text-[0.69rem] text-sand-500">Example messages stay in this preview only; no real AI, trader or Agreement is contacted.</p>
    </form>
  </section>;
}
