import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleHelp, Compass, FileCheck2, HandHeart, Lightbulb, MessageCircle, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';

/**
 * Gate 5B — independent, local-only owner review of four workspace purposes.
 * This is deliberately NOT a replacement for the approved Living Workspace.
 * No controllers, stores, real KS identities, requests, session state or Money.
 */
export type Gate5BSpace = 'vision' | 'circle' | 'community' | 'money';
type Journey = {
  title:string; invitation:string; situation:string; question:string;
  choices:ReadonlyArray<{label:string;effect:string}>; choiceLabel:string;
  boundary:string; next:string; whatPeopleSee:string;
};
export const GATE5B_SPACES: ReadonlyArray<{
  id:Gate5BSpace; label:string; purpose:string; action:string; icon:typeof Lightbulb;
  journey:Journey;
}> = [
  {id:'vision',label:'Vision',purpose:'Imagine what could be possible',action:'Explore an idea',icon:Lightbulb,
    journey:{
      title:'My workshop dream',invitation:'A safe place to wonder before making promises',
      situation:'I would like to build a workshop someday. I have a sketch, but no budget, site or builder yet.',
      question:'What would you like your workshop to help you do first?',
      choices:[
        {label:'Make furniture',effect:'Your idea now has a practical first purpose. KS001 could explore skills, tools and possible layouts.'},
        {label:'Train young people',effect:'The idea centres on teaching. KS001 could help explore space, mentors and apprenticeship needs.'},
        {label:'Still exploring',effect:'The dream can stay open. You do not need to choose a supplier or make a financial commitment.'},
      ],
      choiceLabel:'Your exploration',boundary:'A Dream is not an Agreement, confirmed quotation or payment obligation.',
      next:'When a plan is specific enough, choose what to bring into My Work and let KS001 examine the proposed trade.',
      whatPeopleSee:'Sketches, ideas, photos and alternatives — owned by the person until they choose to share.'
    }},
  {id:'circle',label:'Circle',purpose:'Decide and work together',action:'Explore a proposal',icon:Users,
    journey:{
      title:'Our neighbourhood workshop Circle',invitation:'A private shared space, governed by its actual members',
      situation:'A member proposes including an apprenticeship corner in the shared workshop.',
      question:'What should the Circle do with this idea next?',
      choices:[
        {label:'Discuss with members',effect:'The proposal remains under discussion. Members can add concerns, needs and evidence.'},
        {label:'Request a cost estimate',effect:'The Circle can seek information. This does not appoint a supplier or approve spending.'},
        {label:'Review decision rules',effect:'A steward should establish who may decide, quorum and how the decision is recorded.'},
      ],
      choiceLabel:'Circle proposal',boundary:'Support, reactions and membership never equal a formal decision or contractual acceptance.',
      next:'Only an authorised Circle decision can be prepared for My Work, where real parties agree to any external commitments.',
      whatPeopleSee:'Members, discussions, proposals, shared work and formal governance as separate stages.'
    }},
  {id:'community',label:'Community',purpose:'Meet people and find help',action:'Explore an opportunity',icon:HandHeart,
    journey:{
      title:'A community furniture repair project',invitation:'A welcoming public door to knowledge, people and useful work',
      situation:'A community school wants volunteers and experienced mentors to explore repairing damaged desks.',
      question:'How would you like to take part?',
      choices:[
        {label:'Offer practical help',effect:'An expression of interest can be prepared. No job, appointment or obligation has been accepted.'},
        {label:'Find a Master',effect:'The person may explore qualified guidance. No Master, rate or appointment is invented.'},
        {label:'Learn how projects work',effect:'Stories and Skills Institute resources can help before making a commitment.'},
      ],
      choiceLabel:'Community opportunity',boundary:'Public LIVE is not a Circle. Private Circle materials never appear here without permission.',
      next:'A genuine service opportunity may lead to a Circle or a separate Agreement after identities, responsibilities and consent are checked.',
      whatPeopleSee:'Public stories, opportunities, projects, events and learning — not somebody else’s private Circle.'
    }},
  {id:'money',label:'Money',purpose:'Understand the financial possibilities',action:'Explore your options',icon:Wallet,
    journey:{
      title:'Paying for an agreed delivery',invitation:'Money should follow the agreement',
      situation:'A buyer is considering KES 400 for delivery, but the goods, recipient and receiving entrance are still unspecified.',
      question:'What must happen before considering a way to pay?',
      choices:[
        {label:'Clarify the delivery',effect:'Correct first move: KS001 must learn exactly what is delivered and what counts as successful handover.'},
        {label:'Explore funding possibilities',effect:'General My money, Borrow, Invest or Protect information may be explored, without claiming eligibility or a provider quote.'},
        {label:'Review acceptance',effect:'Only real parties may accept versioned terms. Readiness to inspect is not authorisation to pay.'},
      ],
      choiceLabel:'Money readiness',boundary:'No bank or M-PESA connection, quote, funding, release or settlement is created in this prototype.',
      next:'Return to My Work for SecurePay Check, genuine party acceptance and a separate money preflight before any transaction.',
      whatPeopleSee:'My money, Borrow, Invest and Protect as relevant possibilities; provider offers only when real and permitted.'
    }},
] as const;

const choose=(id:Gate5BSpace)=>GATE5B_SPACES.find(s=>s.id===id)??GATE5B_SPACES[0];

export function Gate5BFourSpacesPrototype() {
  const [selected,setSelected]=useState<Gate5BSpace>('vision');
  const [answers,setAnswers]=useState<Partial<Record<Gate5BSpace,number>>>({});
  const space=choose(selected),choice=answers[selected];
  const Icon=space.icon;
  const pick=(id:Gate5BSpace)=>{
    setSelected(id);
    // Never transfer one area's synthetic "answer" to another area's authority.
  };
  return <main className="sp-type-signature sp-brand-shell min-h-screen bg-gradient-to-br from-[#fbfaf5] via-[#f7f7f1] to-[#eef2eb] text-forest-800"
      data-gate5b-prototype data-gate5b-no-network>
    <header className="sp-brand-header border-b border-cream-200/80 bg-white/95 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><img src={securepayWordmark} alt="SecurePay" className="h-9 w-auto max-w-[164px] object-contain"/>
          <span className="text-xs text-sand-600">KS001 · Four spaces, one purpose</span></div>
        <a href="#/preview/living-workspace/work" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 bg-white px-3 text-sm font-medium hover:bg-cream-50">
          <ArrowLeft size={16}/> Back to approved workspace
        </a>
      </div>
    </header>

    <div className="mx-auto max-w-[1550px] px-3 pt-4 sm:px-5">
      <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950">
        Gate 5B owner-review prototype · Local sample only · Nothing is saved, shared, approved, charged or sent to a real KS identity
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-sand-600">Walk through</span>
        {GATE5B_SPACES.map(item=><button key={item.id} type="button" onClick={()=>pick(item.id)} aria-pressed={selected===item.id}
          className={`min-h-11 rounded-xl px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800 ${selected===item.id?'bg-forest-800 text-white':'border border-cream-200 bg-white text-forest-800'}`}>{item.label}</button>)}
      </div>
    </div>

    {/* Preserve the recognised three-column grammar: navigation / KS001 / short truth summary. */}
    <div className="mx-auto grid w-full max-w-[1550px] gap-3 px-3 py-4 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:items-start"
      data-gate5b-three-column>
      <nav aria-label="Four SecurePay spaces" className="rounded-2xl border border-cream-200 bg-white p-3 shadow-sm">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-sand-600">Find your place</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {GATE5B_SPACES.map(item=><button type="button" key={item.id} onClick={()=>pick(item.id)}
            aria-current={selected===item.id?'page':undefined}
            className={`min-h-16 rounded-xl p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700 ${selected===item.id?'bg-forest-800 text-white':'bg-cream-50 hover:bg-cream-100'}`}>
            <span className="flex items-center gap-2 font-semibold text-sm"><item.icon size={18}/>{item.label}</span>
            <span className={`mt-1 block text-xs leading-5 ${selected===item.id?'text-white/85':'text-sand-600'}`}>{item.purpose}</span>
          </button>)}
        </div>
        <div className="mt-3 rounded-xl bg-cream-50 p-3 text-xs leading-5 text-sand-700">
          <Compass size={17} className="mb-2"/> One member may use all four. None quietly creates a different person's membership, consent or Agreement.
        </div>
      </nav>

      <section aria-label={space.label+' guided example'} data-gate5b-guided-example className="min-w-0 space-y-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-sand-600">{space.label} · {space.action}</p>
            <h1 className="mt-2 font-display text-2xl leading-tight">{space.journey.title}</h1>
            <p className="mt-2 text-sm leading-6 text-sand-700">{space.journey.invitation}</p></div>
          <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream-100"><Icon size={23}/></div>
        </div>
        <div className="rounded-xl bg-cream-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand-700"><MessageCircle size={16}/> Person's starting point</div>
          <p className="text-sm leading-6">{space.journey.situation}</p>
        </div>
        <div className="rounded-xl border border-forest-200 p-4" data-gate5b-ks001>
          <div className="flex items-center gap-2 text-xs font-semibold text-forest-800"><CircleHelp size={17}/> KS001 · Illustrative guidance, not a live AI response</div>
          <p className="mt-3 text-base font-semibold leading-6">{space.journey.question}</p>
          <div className="mt-4 flex flex-col gap-2" role="group" aria-label={space.label+' sample responses'}>
            {space.journey.choices.map((item,index)=><button key={item.label} type="button" onClick={()=>setAnswers(v=>({...v,[selected]:index}))}
              aria-pressed={choice===index}
              className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800 ${choice===index?'border-forest-700 bg-[#e9f0e7] font-semibold':'border-cream-200 bg-white hover:bg-cream-50'}`}>
                <span className="flex items-center gap-2">{choice===index?<Check size={16}/>:<ArrowRight size={16}/>} {item.label}</span>
              </button>)}
          </div>
          {choice!==undefined && <div role="status" className="mt-4 rounded-xl bg-[#eef3ec] p-3 text-sm leading-6" data-gate5b-outcome>
            <strong className="block text-xs uppercase tracking-wide">What this means</strong>
            {space.journey.choices[choice].effect}
          </div>}
        </div>
        <p className="text-xs leading-5 text-sand-600"><ShieldCheck size={15} className="mr-1 inline"/> This sample cannot publish a Circle post, send invitations, choose a bank or accept an Agreement.</p>
      </section>

      <aside aria-label={space.label+' meaning and next step'} className="min-w-0 space-y-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm" data-gate5b-summary>
        <h2 className="font-display text-lg">Where you are</h2>
        <div className="rounded-xl bg-cream-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sand-600">What belongs here</p>
          <p className="mt-2 text-sm leading-6">{space.journey.whatPeopleSee}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><ShieldCheck size={16}/> Boundary</p>
          <p className="mt-2 text-sm leading-6">{space.journey.boundary}</p>
        </div>
        <div className="rounded-xl border border-cream-200 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><FileCheck2 size={16}/> One useful next step</p>
          <p className="mt-2 text-sm leading-6">{space.journey.next}</p>
        </div>
        {selected==='money' && <div className="rounded-xl bg-cream-50 p-3 text-xs">
          <p className="font-semibold">My money · Borrow · Invest · Protect</p>
          <p className="mt-1 leading-5 text-sand-700">Information and possible partners, not a sale or automatic provider recommendation.</p>
        </div>}
        <a href="#/preview/living-workspace/work" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white">
          <BookOpen size={17}/> See My Work <ArrowRight size={16}/>
        </a>
        <p className="text-xs text-sand-600">This opens the existing workspace. Nothing from the sample is transferred or saved.</p>
      </aside>
    </div>
    <footer className="mx-auto max-w-[1550px] px-5 pb-8 text-xs text-sand-600">
      <button type="button" onClick={()=>{setAnswers({});setSelected('vision');}} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 bg-white px-3">
        <X size={15}/> Reset this walkthrough
      </button>
      <p className="mt-3">Gate 5B is a separate visual study for owner approval. The live SecurePay architecture and approved Living Workspace remain unchanged.</p>
    </footer>
  </main>;
}
