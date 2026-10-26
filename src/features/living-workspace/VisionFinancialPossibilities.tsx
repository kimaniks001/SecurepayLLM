import { useState } from 'react';
import { ArrowRight, Landmark, PiggyBank, ShieldCheck, HandCoins } from 'lucide-react';

type Route='savings'|'borrow'|'protect'|'sacco';
const possibilities=[
 {id:'savings',name:'Money Market Funds',icon:PiggyBank,description:'Explore saving towards a milestone, including liquidity, charges and risks.'},
 {id:'borrow',name:'Banks and borrowing',icon:Landmark,description:'Compare possible borrowing costs, conditions and repayment.'},
 {id:'sacco',name:'SACCOs',icon:HandCoins,description:'Explore savings and financing subject to membership and eligibility.'},
 {id:'protect',name:'Insurance',icon:ShieldCheck,description:'Consider protection, premiums, exclusions and when cover may begin.'},
] as const;
/** Vision has possibilities, not payment rails. Deliberate read-only model with no
 * provider, return, approval or payment authority. There is no fabricated quote. */
export function VisionFinancialPossibilities({onExplore}:{
 onExplore:(prompt:string)=>void;
}){
 const [selected,setSelected]=useState<Route>('savings');
 const current=possibilities.find(p=>p.id===selected)!;
 return <section aria-label="Vision financial possibilities" data-gate-b-vision-money
   className="mt-5 space-y-3 rounded-2xl border border-forest-200 bg-white p-4">
  <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">Vision · Financial possibilities</p>
  <h2 className="font-display text-xl text-forest-900">What could help fund your dream?</h2>
  <p className="text-sm leading-6 text-sand-700">Explore the bigger picture before you make an Agreement. These are ideas to examine, not offers or rails that can move Money.</p>
  <div className="grid grid-cols-2 gap-2">
   {possibilities.map(p=><button type="button" key={p.id} onClick={()=>setSelected(p.id)} aria-pressed={selected===p.id}
     className={'flex min-h-14 items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold '+(selected===p.id?'border-forest-500 bg-forest-50':'border-cream-200 bg-white')}>
     <p.icon size={18} aria-hidden="true" />{p.name}</button>)}
  </div>
  <div className="space-y-2 rounded-xl bg-cream-50 p-3">
   <p className="text-sm font-semibold">{current.name}</p>
   <p className="text-xs leading-5 text-sand-700">{current.description}</p>
   <p className="text-xs leading-5 text-sand-600">Ask about contribution schedule, fees, restrictions and possible total costs. No return, policy, offer, lender or institution is implied or guaranteed.</p>
   <button type="button" onClick={()=>onExplore('In my Vision, help me evaluate '+current.name+' as a possible way to fund a long-term dream. Ask me for my target, timeline and saving capacity first. Distinguish assumptions from verified providers, fees, risk and eligibility. Do not create an Agreement, apply for a product or execute Money.')}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">
      Explore with KS001 <ArrowRight size={15} aria-hidden="true"/></button>
  </div>
  <p className="text-xs text-sand-600">A possibility becomes part of an actual Dream only through a separately confirmed, authorised Dream save. Exploring here saves nothing and moves no money.</p>
 </section>;
}
