import { useState } from 'react';
import {
  ArrowRight, BookOpen, Check, CircleHelp, Compass, HeartHandshake,
  Lightbulb, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Users, Wallet,
} from 'lucide-react';
import {
  gate5BArea, gate5BExample, gate5BPreviewBoundary, gate5BAreas, gate5BExamples,
  type Gate5BArea, type Gate5BExample,
} from './gate5bConcept';

const icons={work:ShieldCheck,vision:Lightbulb,circle:Users,community:HeartHandshake,money:Wallet} as const;
const moneyChoices=[
  {id:'my',label:'My Money',explain:'See what is known about your actual Agreements, contributions and obligations. Nothing is inferred from a sample.'},
  {id:'borrow',label:'Borrow',explain:'Explore eligibility, repayments and cost. No institution has offered or approved a loan.'},
  {id:'invest',label:'Invest',explain:'Compare saving and investing possibilities, including risk and access to money. No returns are promised.'},
  {id:'protect',label:'Protect',explain:'Consider insurance cover, exclusions and premiums. Cover is not active without an insurer confirmation.'},
] as const;

export const gate5BReviewRoute=(area:Gate5BArea)=>'#/preview/living-workspace/gate5b/'+area;

/**
 * Purely local editorial view. In the approved Living Workspace's existing
 * centre column; no controller, saving, user identity or network request.
 */
export function Gate5BConceptJourney({area,example,prepared,onSelectArea,onSelectExample,onPrepare}:{
  area:Gate5BArea; example:Gate5BExample;prepared:Gate5BArea|null;
  onSelectArea:(area:Gate5BArea)=>void;
  onSelectExample:(example:Gate5BExample)=>void;
  onPrepare:(area:Gate5BArea)=>void;
}) {
  const [moneyChoice,setMoneyChoice]=useState<(typeof moneyChoices)[number]['id']>('my');
  const detail=gate5BArea(area),scenario=gate5BExample(example);
  const ActiveIcon=icons[area];
  const selectedMoney=moneyChoices.find(choice=>choice.id===moneyChoice)??moneyChoices[0];
  const nextArea:Gate5BArea=area==='work'?'money':'work';

  return <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
      data-gate5b-concept data-prototype-scope="LOCAL_CONCEPT_ONLY">
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-[#e5ece4] px-3 py-1 text-[11px] font-bold uppercase tracking-[.13em] text-[#35583c]">Gate 5B · For your review</span>
      <span className="rounded-full border border-cream-200 px-3 py-1 text-[11px] font-medium text-sand-600">Illustration only · No accounts or money</span>
    </div>
    <div className="relative overflow-hidden rounded-2xl border border-[#dfebdf] bg-gradient-to-br from-[#eff4e9] via-[#f9faf5] to-[#fffaf1] p-5 sm:p-7">
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full border-[25px] border-white/40" aria-hidden="true"/>
      <p className="relative text-xs font-semibold uppercase tracking-[.18em] text-forest-700">One SecurePay. Different reasons to come here.</p>
      <h1 className="relative sp-type-display mt-2 text-3xl leading-tight text-forest-900 sm:text-[2.4rem]">A place to plan, belong and get things done.</h1>
      <p className="relative mt-3 max-w-2xl text-sm leading-6 text-sand-700">
        You do not have to turn every dream into an Agreement, every discussion into a public post,
        or every Agreement into a payment. You choose what happens next.
      </p>
    </div>

    <section className="mt-6" aria-labelledby="gate5b-example-title">
      <p className="text-xs font-semibold uppercase tracking-[.15em] text-sand-600">Try one human situation across the spaces</p>
      <h2 id="gate5b-example-title" className="sp-type-display mt-1 text-xl text-forest-900">What would you like to explore?</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Choose example journey">
        {gate5BExamples.map(item=><button key={item.id} type="button" onClick={()=>onSelectExample(item.id)}
          aria-pressed={example===item.id}
          className={'flex min-h-16 flex-col justify-center rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-900 '+
            (example===item.id?'border-forest-700 bg-[#e9f0e6] shadow-sm':'border-cream-200 bg-white hover:bg-cream-50')}>
          <strong className="text-sm text-forest-900">{item.label}</strong>
          <span className="mt-1 text-[11px] text-sand-700">{item.amount}</span>
        </button>)}
      </div>
    </section>

    <section className="mt-6" aria-labelledby="gate5b-map-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-sand-600">Choose where you are in the journey</p>
          <h2 id="gate5b-map-title" className="sp-type-display mt-1 text-xl text-forest-900">Five doors, one home</h2>
        </div>
        <span className="text-xs text-sand-600">No required order</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="SecurePay purpose map">
        {gate5BAreas.map(item=>{
          const Icon=icons[item.id];
          return <button key={item.id} type="button" onClick={()=>onSelectArea(item.id)}
            aria-current={area===item.id?'step':undefined}
            className={'flex min-h-24 flex-col items-start justify-center gap-1 rounded-xl border p-3 text-left transition-colors '+
              (area===item.id?'border-[#244d37] bg-forest-800 text-white':'border-cream-200 bg-white text-forest-900 hover:bg-[#f2f5ef]')}>
            <Icon size={19} aria-hidden="true"/>
            <strong className="text-sm">{item.title}</strong>
            <span className={'text-[10px] leading-4 '+(area===item.id?'text-white/80':'text-sand-600')}>{item.eyebrow}</span>
          </button>;
        })}
      </div>
    </section>

    <section className="mt-5 overflow-hidden rounded-2xl border border-cream-200 bg-white" aria-label={detail.title+' explained'} key={area}>
      <div className="flex items-start gap-3 border-b border-cream-100 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf1e8] text-forest-800"><ActiveIcon size={23} aria-hidden="true"/></div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-[.12em] text-sand-600">{detail.eyebrow}</span>
          <h2 className="sp-type-display mt-1 text-2xl text-forest-900">{detail.question}</h2>
          <p className="mt-2 text-sm leading-6 text-sand-700">{detail.meaning}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-[#e5e5d8] bg-[#faf9f1] p-4">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#706142]"><BookOpen size={15}/> In your example</span>
          <p className="mt-2 text-sm leading-6 text-forest-900">{scenario[area]}</p>
        </div>
        {area==='money' && <div>
          <p className="mb-2 text-xs font-semibold text-sand-700">Money is there to support your choices</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Money choices">
            {moneyChoices.map(choice=><button key={choice.id} type="button" onClick={()=>setMoneyChoice(choice.id)}
              aria-pressed={moneyChoice===choice.id}
              className={'min-h-11 rounded-xl border px-2 text-xs font-semibold '+(moneyChoice===choice.id?'border-forest-700 bg-[#e6efe2] text-forest-900':'border-cream-200 bg-white text-sand-700')}>
              {choice.label}
            </button>)}
          </div>
          <p className="mt-2 rounded-lg bg-cream-50 px-3 py-3 text-xs leading-5 text-sand-700" role="status">{selectedMoney.explain}</p>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#edf4ec] p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-forest-800"><LockKeyhole size={16}/> Who sees it?</div>
            <p className="mt-2 text-xs leading-5 text-sand-700">{detail.privacy}</p>
          </div>
          <div className="rounded-xl bg-[#f8f2e9] p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#795738]"><ShieldCheck size={16}/> What does not happen?</div>
            <p className="mt-2 text-xs leading-5 text-sand-700">{detail.boundary}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-cream-100 pt-4">
          <button type="button" onClick={()=>onPrepare(area)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-forest-300 bg-white px-4 text-xs font-semibold text-forest-800 hover:bg-cream-50">
            {prepared===area?<Check size={16}/>:<Sparkles size={16}/>}
            {prepared===area?'Selected locally for review':'Preview a possible next step'}
          </button>
          <button type="button" onClick={()=>onSelectArea(nextArea)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white hover:bg-forest-900">
            {area==='work'?'Explore Money options':'See what My Work would need'} <ArrowRight size={16}/>
          </button>
        </div>
        <p role="status" className="text-xs leading-5 text-sand-600">
          {prepared===area?'Selected only in this illustration. No data was saved or sent.':'Nothing here saves, shares, invites, accepts or pays. This is a design review.'}
        </p>
      </div>
    </section>
  </div>;
}

/** Right-hand workspace summary, mounted inside the EXISTING result column. */
export function Gate5BConceptResult({area,example,prepared,onSelectArea,onClear}:{
  area:Gate5BArea;example:Gate5BExample;prepared:Gate5BArea|null;
  onSelectArea:(area:Gate5BArea)=>void;onClear:()=>void;
}) {
  const detail=gate5BArea(area);
  const scenario=gate5BExample(example);
  const truth=gate5BPreviewBoundary(area,example);
  return <section className="space-y-4" data-gate5b-result aria-label="Gate 5B example summary">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.13em] text-sand-600">Your example, at a glance</p>
      <h2 className="sp-type-display mt-2 text-2xl text-forest-900">{scenario.label}</h2>
      <p className="mt-1 text-xs leading-5 text-sand-600">{scenario.amount}</p>
    </div>

    <div className="rounded-2xl border border-[#dbe6d9] bg-[#f1f6ef] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-forest-800"><Compass size={17}/> You are exploring: {detail.title}</div>
      <p className="text-sm font-medium leading-6 text-forest-900">{detail.question}</p>
      <p className="mt-3 text-xs leading-5 text-sand-700">{detail.next}</p>
    </div>

    <div className="rounded-2xl border border-cream-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-forest-900">What has actually happened?</h3>
      <div className="mt-3 space-y-2.5 text-xs text-sand-700">
        <div className="flex items-center justify-between gap-2"><span>Idea in this preview</span><strong className="text-forest-800">Illustrated</strong></div>
        <div className="flex items-center justify-between gap-2"><span>Saved or shared</span><strong>Not done</strong></div>
        <div className="flex items-center justify-between gap-2"><span>Agreement checked</span><strong>Not done</strong></div>
        <div className="flex items-center justify-between gap-2"><span>Parties accepted</span><strong>Not done</strong></div>
        <div className="flex items-center justify-between gap-2"><span>Money connected or moved</span><strong>Not done</strong></div>
      </div>
    </div>

    <div className="rounded-2xl border border-[#e4e0d5] bg-[#faf9f4] p-4" aria-label="Optional next-step preview">
      <div className="flex items-center gap-2 text-xs font-semibold text-forest-900"><MessageCircle size={16}/> Your next move</div>
      {prepared ? <div className="mt-3 space-y-2">
        <p className="text-sm font-semibold text-forest-900">Possible handoff from {gate5BArea(prepared).title}</p>
        <p className="text-xs leading-5 text-sand-700">You would choose exactly which material to bring into KS001. It would remain a proposal until understood and checked.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>onSelectArea('work')} className="min-h-11 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">Examine in My Work <ArrowRight size={13} className="inline"/></button>
          <button type="button" onClick={onClear} className="min-h-11 rounded-xl border border-cream-200 bg-white px-3 text-xs font-semibold">Clear preview choice</button>
        </div>
      </div> : <p className="mt-2 text-xs leading-5 text-sand-700">Choose “Preview a possible next step” to understand the handoff. It does not send or save anything.</p>}
    </div>

    <div className="rounded-2xl border border-cream-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-forest-900"><CircleHelp size={16}/> How the parts fit</h3>
      <p className="mt-2 text-xs leading-5 text-sand-700">
        Vision is personal. Circles are shared with a specific group. Community helps you find knowledge and people.
        My Work handles Agreements. Money follows the real Agreement and its permissions.
      </p>
      <p className="mt-3 text-[11px] font-semibold text-sand-600">All permissions unchanged · {truth.scope.replace(/_/g,' ').toLowerCase()}</p>
    </div>
  </section>;
}
