import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, HeartHandshake, MessageCircle, ShieldCheck, Sparkles, Users, MapPin, ClipboardCheck } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

/**
 * H3 Mini human-useability design review only. No real KS001 run, API call,
 * provider search, message, dispute case, acceptance or Money transaction.
 */
type Journey = 'buy'|'sell'|'pay'|'collect';
type Need = 'understand'|'talk'|'concern'|'local'|'check';
type Stage = 'start'|'need'|'clarify'|'path';
const journeys: { id:Journey; title:string; hint:string }[] = [
  { id:'buy', title:'Buy something', hint:'A purchase, delivery or service' },
  { id:'sell', title:'Sell something', hint:'A customer, offer or fulfilment' },
  { id:'pay', title:'Pay someone', hint:'A bill, obligation or payment' },
  { id:'collect', title:'Collect money', hint:'A contribution, school fee or group' }
];
const needs: { id: Need; label: string; detail: string; Icon: typeof MessageCircle }[] = [
  { id:'understand',label:'Help me understand',detail:'Make sense of what was agreed',Icon:Sparkles },
  { id:'talk',label:'I want to talk to someone',detail:'A real person, even when nothing is wrong',Icon:MessageCircle },
  { id:'concern',label:'Something is not going right',detail:'A fair way to understand and resolve it',Icon:HeartHandshake },
  { id:'local',label:'I need someone local',detail:'Knowledge about a place, service or opportunity',Icon:MapPin },
  { id:'check',label:'Can someone check something?',detail:'Inspect, measure, count or document facts',Icon:ClipboardCheck }
];
const choices: Record<Need,string[]> = {
  understand:['What exactly did we agree?','When was it meant to happen?','What can I do next?'],
  talk:['I need reassurance','I want practical advice','Someone with specialist knowledge'],
  concern:['A delivery is late','The terms are unclear','We see things differently','I need to report a safety concern'],
  local:['Advice about this area','Help finding accommodation','Someone who understands the trade'],
  check:['Count or measure','Check a delivery','Photograph the condition with consent']
};
const samples: Record<Journey,{title:string;fact:string}> = {
  buy:{title:'Chair delivery',fact:'Sample: 200 chairs to arrive before noon on Saturday'},
  sell:{title:'Selling a service',fact:'Sample: a supplier promised a six-month maintenance period'},
  pay:{title:'Service payment',fact:'Sample: payment is due after the accepted service milestone'},
  collect:{title:'Group collection',fact:'Sample: contributors must know the purpose and return rules'}
};
const card = 'rounded-2xl border border-[#e0e9df] bg-white p-4 shadow-[0_5px_18px_rgba(24,58,37,0.04)]';
export function MiniH3Review() {
  const [stage,setStage]=useState<Stage>('start');
  const [journey,setJourney]=useState<Journey>('buy');
  const [need,setNeed]=useState<Need>('talk');
  const [answer,setAnswer]=useState<string|null>(null);
  const [choice,setChoice]=useState<'ks001'|'human'|'discuss'|null>(null);
  const selectedNeed=needs.find(x=>x.id===need)!;
  const start=(j:Journey)=>{setJourney(j);setStage('need');setChoice(null);setAnswer(null);};
  const choose=(n:Need)=>{setNeed(n);setAnswer(null);setChoice(null);setStage('clarify');};
  const back=()=>{if(stage==='path')setStage('clarify');else if(stage==='clarify')setStage('need');else setStage('start');setChoice(null)};
  return <div className="min-h-dvh bg-[#faf8f2] text-[#254735]" data-mini-h3-review>
    <header className="sticky top-0 z-20 border-b border-[#e3e9df] bg-[#fffefa]/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm">SecurePay Mini</strong>
          <span className="block text-xs text-[#647a6d]">Human Layer · H3 Help & Resolution</span>
        </div>
        <span className="rounded-full border border-[#c7dbca] bg-[#edf6ea] px-2.5 py-1 text-[11px] font-semibold text-[#33654a]">Design review</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-20 pt-5">
      {stage!=='start' && <button type="button" onClick={back}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#356849]">
        <ArrowLeft className="h-4 w-4"/> Back
      </button>}
      {stage==='start' && <>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0e4]"><HeartHandshake className="h-6 w-6 text-[#316e45]"/></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Need a hand?</h1>
            <p className="text-sm text-[#647767]">Someone to talk to. Someone who knows.</p>
          </div>
        </div>
        <p className="mb-4 text-sm leading-6 text-[#536b5b]">You don't need a problem to get help. Tell SecurePay what you're doing, and we'll find the right way forward.</p>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#718274]">What are you doing?</p>
        <div className="grid gap-2">{journeys.map(j=><button key={j.id} type="button" onClick={()=>start(j.id)}
          className={card+' flex min-h-16 items-center gap-3 text-left hover:border-[#9db99e]'}>
          <div className="min-w-0 flex-1"><span className="block text-sm font-semibold">{j.title}</span><span className="text-xs text-[#667a6b]">{j.hint}</span></div>
          <ArrowRight className="h-4 w-4 text-[#718c76]"/>
        </button>)}</div>
      </>}
      {stage==='need' && <>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d836f]">{journeys.find(j=>j.id===journey)?.title}</p>
        <h1 className="mb-2 mt-2 text-2xl font-semibold">What would help?</h1>
        <p className="mb-4 text-sm leading-6 text-[#637468]">It's fine to ask for a person, even if KS001 could answer.</p>
        <div className="grid gap-2">{needs.map(n=><button key={n.id} type="button" onClick={()=>choose(n.id)}
          className={card+' flex min-h-[72px] items-center gap-3 text-left hover:border-[#91b29b]'}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ecf3e9]"><n.Icon className="h-5 w-5 text-[#39734d]"/></div>
          <div className="min-w-0 flex-1"><span className="block text-sm font-semibold">{n.label}</span><span className="block text-xs leading-5 text-[#677a6a]">{n.detail}</span></div>
          <ArrowRight className="h-4 w-4 text-[#74927a]"/>
        </button>)}</div>
      </>}
      {stage==='clarify' && <>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d836f]">Let's understand first</p>
        <h1 className="mb-2 mt-2 text-2xl font-semibold">{selectedNeed.label}</h1>
        <p className="mb-4 text-sm leading-6 text-[#637468]">Pick what comes closest. No typing needed for the first step.</p>
        <div className="grid gap-2">{choices[need].map(opt=><button type="button" key={opt} onClick={()=>setAnswer(opt)}
          className={card+' flex min-h-14 items-center gap-3 text-left '+(answer===opt?'border-[#4a865b] bg-[#eff6ee]':'hover:border-[#9db99e]')}>
          <span className="flex-1 text-sm font-medium">{opt}</span>
          {answer===opt?<Check className="h-4 w-4 text-[#33724b]"/>:<ArrowRight className="h-4 w-4 text-[#78907b]"/>}
        </button>)}</div>
        <button type="button" disabled={!answer} onClick={()=>{setStage('path');setChoice(null);}}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#315e42] px-4 text-sm font-semibold text-white disabled:opacity-40">
          Continue <ArrowRight className="h-4 w-4"/>
        </button>
      </>}
      {stage==='path' && <>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d836f]">How SecurePay could help</p>
        <h1 className="mb-2 mt-2 text-2xl font-semibold">Here are your options</h1>
        <p className="mb-4 text-sm leading-6 text-[#647768]">You selected: <strong>{answer}</strong></p>
        <section className={card+' mb-3'}>
          <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#39724d]"/><h2 className="text-sm font-semibold">Sample Agreement context</h2></div>
          <p className="text-sm font-semibold">{samples[journey].title}</p>
          <p className="mt-1 text-xs leading-5 text-[#607568]">{samples[journey].fact}</p>
          <p className="mt-2 text-[11px] text-[#667669]">Example only. KS001 has not examined a real Agreement or heard the other party.</p>
        </section>
        <section className={card+' mb-3'} aria-label="Fair examination example">
          <h2 className="text-sm font-semibold text-[#315e42]">First, separate facts from claims</h2>
          <div className="mt-3 space-y-3 text-xs leading-5 text-[#596f60]">
            <div><span className="font-semibold text-[#386c49]">Verified source — sample</span>
              <p>Agreement version and agreed delivery terms would be checked against SecurePay's canonical record.</p>
            </div>
            <div><span className="font-semibold text-[#805f35]">Your position — not yet verified</span>
              <p>KS001 should ask for your account and distinguish it from evidence.</p>
            </div>
            <div><span className="font-semibold text-[#805f35]">Other party's position — not yet heard</span>
              <p>They need their own opportunity to explain or challenge what is being said.</p>
            </div>
            <div><span className="font-semibold text-[#805f35]">Evidence — not examined</span>
              <p>Dates, messages, images and actual-work findings must retain their source and permissions.</p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-[#f1f4ea] p-3 text-xs leading-5 text-[#4e6c56]">Any possible resolution remains a suggestion until the affected parties separately accept valid terms.</p>
        </section>
        <div className="grid gap-2">
          <button type="button" onClick={()=>setChoice('ks001')} className={card+' flex items-center gap-3 text-left hover:border-[#94b299]'}>
            <Sparkles className="h-5 w-5 shrink-0 text-[#31764a]"/><span className="flex-1"><strong className="block text-sm">Ask KS001</strong><small className="block text-xs text-[#617466]">Understand obligations and possible next steps</small></span><ArrowRight className="h-4 w-4"/>
          </button>
          <button type="button" onClick={()=>setChoice('discuss')} className={card+' flex items-center gap-3 text-left hover:border-[#94b299]'}>
            <MessageCircle className="h-5 w-5 shrink-0 text-[#31764a]"/><span className="flex-1"><strong className="block text-sm">Talk with the Agreement party</strong><small className="block text-xs text-[#617466]">Find common ground before any change</small></span><ArrowRight className="h-4 w-4"/>
          </button>
          <button type="button" onClick={()=>setChoice('human')} className={card+' flex items-center gap-3 text-left hover:border-[#94b299]'}>
            <Users className="h-5 w-5 shrink-0 text-[#31764a]"/><span className="flex-1"><strong className="block text-sm">Talk to the right person</strong><small className="block text-xs text-[#617466]">A qualified Plug, Master or knowledgeable local</small></span><ArrowRight className="h-4 w-4"/>
          </button>
        </div>
        {choice && <section className="mt-4 rounded-2xl border border-[#cce0cf] bg-[#f0f7ee] p-4" role="status">
          <h2 className="text-sm font-semibold">{choice==='human'?'Human help is your choice':choice==='ks001'?'KS001 can help you understand':'Talk it through together'}</h2>
          <p className="mt-1 text-xs leading-5 text-[#526f59]">
            {choice==='human'
              ? 'The next phase will verify qualifications, availability and service scope before recommending anyone. Optional paid help needs your separate agreement. No one has been contacted.'
              : choice==='ks001'
              ? 'KS001 should compare the accepted version with verified facts, hear each party fairly, and suggest—not impose—a solution. This preview has not run KS001.'
              : 'The original Agreement Conversation is where both authorized parties can discuss the concern. Only separately accepted terms can change the Agreement.'}
          </p>
        </section>}
        <p className="mt-5 text-center text-[11px] leading-5 text-[#78806c]">H3 Mini design review only · No real messages, human booking, case, deposit, Agreement change or payment.</p>
      </>}
    </main>
  </div>;
}
