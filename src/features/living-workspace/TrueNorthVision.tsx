import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowUp, Calculator, Check, ChevronDown, Compass, FileText, Image, MapPin, Plus, Save, Sparkles } from 'lucide-react';
import { createAgentController, deviceTimeZone, type AgentState } from '../agent/controller';
import { createVisionDreamController, type VisionDreamState } from '../visionboard/dreams/controller';
import { ensureFreshSession } from '../../api/securepay/session';
import type { SessionStore } from '../../api/securepay/session';
import type { AgentGateway } from '../../api/securepay/agent';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import { initialVisionNumbers, visionKes, visionScenario, type VisionNumbers } from './visionNorthMath';

type Thought={id:number;sender:'you'|'guide';text:string};
type SavedScenario={id:number;name:string;detail:string};
const subscribeNever=(_:()=>void)=>()=>{};
const noAgent=():AgentState|null=>null;
const noDream=():VisionDreamState|null=>null;
const suggestions=[
  'I have been thinking about a home for my parents.',
  'Could I become financially independent one day?',
  'I want to start something of my own.',
];
const money=(value:number)=>visionKes(value);
const monthWords=(months:number|null)=>months===null?'Not reached within 50 years':
  months===0?'Already covered':months<12?months+' months':
    Math.floor(months/12)+' years'+(months%12?' '+(months%12)+' months':'');
function guidingQuestion(text:string){
  const lower=text.toLowerCase();
  if(/house|home|build|renovat|land/i.test(lower))return 'What would you most like this place to give the people who live there?';
  if(/money|retire|free|invest|save|financial/i.test(lower))return 'When you imagine that freedom, what would a good ordinary day look like?';
  if(/business|shop|start|earn|work/i.test(lower))return 'Who would you like to help, and what problem could you solve for them?';
  if(/trip|travel|journey/i.test(lower))return 'What would make that journey meaningful to you?';
  if(/parent|family|community/i.test(lower))return 'Who would you want to share this possibility with, and why?';
  return 'What is the part of this possibility that excites you most?';
}
export function useVisionNorthJourney({signedIn,gateway,gateways,session}:{
  signedIn:boolean; gateway?:AgentGateway; gateways?:PreviewWorkspaceGateways; session:SessionStore;
}){
  // One existing conversation controller, scoped to this Vision Dream. It never
  // reuses the live My Work controller or grants Agreement/Money authority.
  const [agent]=useState(()=>gateway?createAgentController(gateway,undefined,{timeZone:deviceTimeZone}):null);
  const [dreams]=useState(()=>gateways?createVisionDreamController(gateways.dreams,gateways.agent):null);
  const agentState=useSyncExternalStore(agent?.subscribe??subscribeNever,agent?.getSnapshot??noAgent,agent?.getSnapshot??noAgent);
  const dreamState=useSyncExternalStore(dreams?.subscribe??subscribeNever,dreams?.getSnapshot??noDream,dreams?.getSnapshot??noDream);
  const [local,setLocal]=useState<Thought[]>([]);
  const [draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [showCalculator,setShowCalculator]=useState(false);
  const [numbers,setNumbers]=useState<VisionNumbers>(initialVisionNumbers);
  const [phaseShare,setPhaseShare]=useState(40);
  const [scenarios,setScenarios]=useState<SavedScenario[]>([]);
  const [savedNotice,setSavedNotice]=useState('');
  const counter=useRef(0);
  const real=!!signedIn&&!!agent&&!!dreams&&!!gateways;
  const messages:Thought[]=real&&(agentState?.turns.length??0)>0?(agentState?.turns??[]).map((turn,i)=>turn.sender==='user'
    ?{id:i+1,sender:'you',text:turn.text}
    :{id:i+1,sender:'guide',text:turn.response.message.text}):local;
  // The local preview is a guided interaction, not simulated live model intelligence.
  // We do not silently send any local text or scenario into a real account at sign-in.
  const firstThought=messages.find(m=>m.sender==='you')?.text??'';
  const moreThoughts=messages.filter(m=>m.sender==='you').slice(1,4);
  const plan=visionScenario(numbers);
  const dream=dreamState?.selected??null;
  async function send(text:string){
    const clean=text.trim();
    if(!clean||busy||agentState?.busy||agentState?.pending)return;
    setNotice('');
    if(!real){
      counter.current+=1;const id=counter.current;
      setLocal(items=>[...items,{id,sender:'you',text:clean},
        {id:id+0.5,sender:'guide',text:guidingQuestion(clean)}]);
      setDraft('');return;
    }
    setBusy(true);
    try{
      await ensureFreshSession(session,gateways!.auth);
      if(session.getSnapshot().status!=='signed-in')throw new Error('Please sign in again to continue this private Vision.');
      let record=dreams!.getSnapshot().selected;
      if(!record){
        record=await dreams!.start(clean);
        if(!record){
          setNotice(dreams!.getSnapshot().error||'This Dream could not be saved. Check the same attempt before retrying.');
          return;
        }
      }
      if(agent!.getSnapshot().conversationId!==record.conversationId)await agent!.resumeConversation(record.conversationId);
      if(agent!.getSnapshot().conversationId!==record.conversationId)throw new Error('Could not authorise this Dream conversation.');
      await agent!.send(clean);
      // A pending turn must be retried through its stable clientTurnId, never
      // by sending the person's words again.
      const result=agent!.getSnapshot();
      setDraft('');
      if(result.error)setNotice(result.error);
    }catch{
      setNotice('Could not confirm this Vision step. Review the saved Dream and conversation before retrying.');
    }finally{setBusy(false);}
  }
  function saveComparison(name:string,detail:string){
    counter.current+=1;
    setScenarios(items=>[...items,{id:counter.current,name,detail}].slice(-6));
    setSavedNotice('Comparison kept in this workspace. Save your Vision to keep it in SecurePay.');
  }
  async function saveDreamNotes(){
    if(!real||!dream||busy)return;
    setBusy(true);setSavedNotice('');
    try{
      await ensureFreshSession(session,gateways!.auth);
      const body=['Your intention:',firstThought,...moreThoughts.map(v=>v.text),
        ...scenarios.map(s=>s.name+': '+s.detail),
        'Scenario figures are illustrative assumptions, not a financial quote.'].join('\n');
      if(body.length>4000)throw new Error('Select fewer comparisons before saving.');
      const result=await dreams!.saveSummary(dream.title,body,dream.version);
      setSavedNotice(result?'Your selected notes and comparisons were saved to this private Dream.':
        dreams!.getSnapshot().error||'Could not confirm the save. Check your private Dream before retrying.');
    }catch{setSavedNotice('Save not confirmed. Check the Dream record before retrying.');}
    finally{setBusy(false);}
  }
  return {real,agent,agentState,dreams,dreamState,notice,setNotice,draft,setDraft,busy,
    earlierPreview:local.filter(m=>m.sender==='you'),
    send,messages,firstThought,moreThoughts,showCalculator,setShowCalculator,numbers,setNumbers,
    phaseShare,setPhaseShare,plan,scenarios,saveComparison,saveDreamNotes,savedNotice,
    retry:()=>agent?.retry(),retryDream:()=>dreams?.retry(),reconcileDream:()=>dreams?.reconcilePending()};
}
export type VisionNorthJourney=ReturnType<typeof useVisionNorthJourney>;

function NumberField({label,value,onChange,min=0,max=100000000,step=1000,suffix}:{
  label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number;suffix?:string;
}){
  return <label className="block space-y-1">
    <span className="text-xs font-medium text-forest-800">{label}</span>
    <div className="flex items-center rounded-xl border border-cream-200 bg-white">
      {suffix&&<span className="pl-3 text-xs text-sand-700">{suffix}</span>}
      <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
        onChange={event=>onChange(Math.max(min,Math.min(max,Number(event.target.value)||0)))}
        className="min-h-11 min-w-0 w-full rounded-xl bg-transparent p-2 text-sm text-forest-900"/>
    </div>
  </label>;
}
function ScenarioCalculator({journey}:{journey:VisionNorthJourney}){
  const {numbers,setNumbers,phaseShare,setPhaseShare,plan,saveComparison,setShowCalculator}=journey;
  const update=(key:keyof VisionNumbers,value:number)=>setNumbers(prev=>({...prev,[key]:value}));
  const firstPhase=plan.goal*phaseShare/100;
  const affordable=plan.saved+plan.loan;
  const practical=firstPhase<=affordable?'This first phase may be covered by your starting resources.':
    'The first phase still needs '+money(firstPhase-affordable)+'.';
  return <section aria-label="Vision Scenario Calculator" data-vision-scenario-calculator
    className="mt-3 space-y-4 rounded-[1.35rem] border border-forest-200 bg-[#f8faf6] p-4 shadow-[0_9px_27px_-24px_rgba(26,62,37,.7)]">
    <div className="flex items-start justify-between gap-3"><div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-forest-700"><Calculator size={16}/> Explore the numbers</p>
      <h3 className="mt-1 font-display text-xl text-forest-900">What could be possible?</h3>
    </div><button type="button" onClick={()=>setShowCalculator(false)} className="min-h-10 rounded-lg px-3 text-xs underline">Close</button></div>
    <p className="text-xs leading-5 text-sand-700">Change any assumption. These are illustrative calculations, not verified returns, borrowing offers or construction estimates.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <NumberField label="What might the goal cost?" suffix="KES" value={numbers.goal} onChange={n=>update('goal',n)}/>
      <NumberField label="What could you start with?" suffix="KES" value={numbers.saved} onChange={n=>update('saved',n)}/>
      <NumberField label="How much could you save monthly?" suffix="KES" value={numbers.monthly} onChange={n=>update('monthly',n)}/>
      <NumberField label="Assumed annual growth (%)" value={numbers.annualReturn} onChange={n=>update('annualReturn',n)} min={-50} max={50} step={0.5}/>
    </div>
    <div className="grid gap-3 rounded-xl border border-cream-200 bg-white p-3 sm:grid-cols-3">
      <div><p className="text-xs text-sand-700">Funding gap today</p><p className="font-display text-lg text-forest-900">{money(plan.gap)}</p></div>
      <div><p className="text-xs text-sand-700">Savings route</p><p className="font-display text-lg text-forest-900">{monthWords(visionScenario({...numbers,loan:0}).months)}</p></div>
      <div><p className="text-xs text-sand-700">With selected borrowing</p><p className="font-display text-lg text-forest-900">{monthWords(plan.months)}</p></div>
    </div>
    <button type="button" className="min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-xs font-semibold text-forest-800"
      onClick={()=>saveComparison('Save monthly',money(plan.monthly)+' per month; assumed growth '+plan.annualReturn+'%; target in '+monthWords(visionScenario({...numbers,loan:0}).months))}>
      <Plus size={15} className="mr-1 inline"/> Keep savings scenario
    </button>
    <details className="rounded-xl border border-cream-200 bg-white p-3">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">What if I borrowed part? <ChevronDown size={16}/></summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <NumberField label="Amount to borrow" suffix="KES" value={numbers.loan} onChange={n=>update('loan',n)}/>
        <NumberField label="Assumed annual rate (%)" value={numbers.annualLoanRate} onChange={n=>update('annualLoanRate',n)} max={50} step={0.5}/>
        <NumberField label="Years to repay" value={numbers.loanYears} onChange={n=>update('loanYears',n)} min={1} max={40} step={1}/>
      </div>
      <div className="mt-3 rounded-xl bg-cream-50 p-3 text-sm">Estimated repayment: <strong>{money(plan.monthlyRepayment)}/month</strong>. Estimated total repayment: <strong>{money(plan.totalLoanCost)}</strong>.</div>
      <p className="mt-2 text-xs text-sand-700">Excludes fees, insurance and variable-rate changes; lenders must confirm terms and eligibility.</p>
      <button type="button" onClick={()=>saveComparison('Borrow and save',money(plan.loan)+' borrowed; '+money(plan.monthlyRepayment)+'/month over '+plan.loanYears+' years; other savings '+money(plan.monthly)+'/month')}
        className="mt-2 min-h-11 rounded-xl border border-forest-200 px-3 text-xs font-semibold">Keep borrowing scenario</button>
    </details>
    <details className="rounded-xl border border-cream-200 bg-white p-3">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">What if I did it in phases? <ChevronDown size={16}/></summary>
      <label className="mt-3 block text-xs font-semibold">Illustrative first phase: {phaseShare}% of the goal
        <input type="range" min="10" max="90" step="5" value={phaseShare} onChange={e=>setPhaseShare(Number(e.target.value))} className="mt-2 w-full accent-[#244b35]"/>
      </label>
      <p className="mt-2 text-sm">First-phase assumption: <strong>{money(firstPhase)}</strong>. {practical}</p>
      <p className="mt-1 text-xs text-sand-700">This percentage is a chosen illustration, not a contractor's bill of quantities.</p>
      <button type="button" onClick={()=>saveComparison('Build or act in phases','Illustrative first phase '+phaseShare+'% ('+money(firstPhase)+'). '+practical)}
        className="mt-2 min-h-11 rounded-xl border border-forest-200 px-3 text-xs font-semibold">Keep phased scenario</button>
    </details>
  </section>;
}

export function TrueNorthVisionChat({journey,onAdd}:{journey:VisionNorthJourney;onAdd:(name:'Photos'|'Documents'|'Places')=>void}){
  const {draft,setDraft,send,messages,notice,busy,real,agentState,showCalculator,setShowCalculator,scenarios,dreamState,retry,retryDream,reconcileDream,earlierPreview}=journey;
  const end=useRef<HTMLDivElement|null>(null);
  const [addOpen,setAddOpen]=useState(false);
  const pending=!!agentState?.pending;
  const busyNow=busy||!!agentState?.busy;
  const lastResponse=messages[messages.length-1]?.sender==='guide'?messages[messages.length-1].text:'';
  return <div data-true-north-vision-chat className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-5 sm:px-6">
      {messages.length===0&&<div className="mx-auto max-w-xl py-5 sm:py-10">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[.16em] text-forest-700"><Sparkles size={16}/> VISION · DREAM COMPANION</p>
        <h1 className="sp-type-display text-[2.15rem] leading-tight tracking-tight text-forest-900 sm:text-[2.65rem]">What are you imagining?</h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-sand-700">Start anywhere. An unfinished idea, an impossible-sounding wish, something you keep returning to. We can explore before deciding what it should become.</p>
        <div className="mt-7 flex flex-wrap gap-2">{suggestions.map(prompt=><button key={prompt} type="button" onClick={()=>{setDraft(prompt);document.getElementById('vision-north-input')?.focus();}}
          className="min-h-11 rounded-full border border-cream-200 bg-white px-4 text-left text-xs text-forest-800 hover:border-forest-300">{prompt}</button>)}</div>
        <button type="button" onClick={()=>setShowCalculator(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-[#f7faf5] px-4 text-sm font-semibold text-forest-800"><Calculator size={17}/> Explore a financial scenario</button>
      </div>}
      {real&&earlierPreview.length>0&&(agentState?.turns.length??0)===0&&<section aria-label="Your earlier preview thoughts" className="mx-auto mb-4 max-w-2xl rounded-xl border border-forest-200 bg-[#f8faf6] p-3">
        <p className="text-xs font-semibold">Your earlier ideas are still on this device</p>
        <p className="mt-1 text-xs text-sand-700">They were not saved. Choose one to put back in your composer, then review and send it yourself.</p>
        <div className="mt-2 flex flex-wrap gap-2">{earlierPreview.map(thought=><button type="button" key={thought.id} onClick={()=>setDraft(thought.text)}
          className="min-h-10 max-w-full truncate rounded-full border border-forest-200 bg-white px-3 text-xs">{thought.text}</button>)}</div>
      </section>}
      {messages.length>0&&<div className="mx-auto max-w-2xl space-y-3">
        <p className="mb-4 text-xs text-sand-600">{real?'Private KS001 Vision conversation':'Guided Vision preview · no live AI, no saved Dream'}</p>
        {messages.map((m,i)=><article key={i} className={(m.sender==='you'?'ml-auto bg-cream-100':'border border-cream-200 bg-white')+' max-w-[94%] rounded-2xl p-4 text-sm leading-7 text-forest-900'}>
          <p className="mb-1 text-xs font-semibold text-sand-600">{m.sender==='you'?'You':real?'KS001':'Exploration prompt'}</p>
          <p className="whitespace-pre-wrap">{m.text}</p>
        </article>)}
        {lastResponse&&<div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>setShowCalculator(true)} className="min-h-10 rounded-full border border-forest-200 bg-[#f7faf5] px-3 text-xs font-semibold text-forest-800"><Calculator size={14} className="mr-1 inline"/> Explore the numbers</button>
          <button type="button" onClick={()=>{setDraft('What other possibilities or approaches could I consider?');document.getElementById('vision-north-input')?.focus();}} className="min-h-10 rounded-full border border-cream-200 bg-white px-3 text-xs">Explore alternatives</button>
        </div>}
      </div>}
      {showCalculator&&<div className="mx-auto max-w-2xl"><ScenarioCalculator journey={journey}/></div>}
      {scenarios.length>0&&<p className="mx-auto mt-4 max-w-2xl text-xs text-forest-800">{scenarios.length} comparison{scenarios.length===1?'':'s'} kept in this workspace; saving the Dream is a separate action.</p>}
      {(notice||dreamState?.error)&&<p role="alert" className="mx-auto mt-3 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">{notice||dreamState?.error}</p>}
      {dreamState?.pending?.conversationId&&<div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-white p-3 text-xs">
        <p>Vision save may have succeeded. Check the same attempt before retrying.</p>
        <button type="button" onClick={()=>void reconcileDream()} className="min-h-10 rounded-lg border border-cream-200 px-3">Check saved Dream</button>
        <button type="button" onClick={()=>void retryDream()} className="min-h-10 rounded-lg border border-cream-200 px-3">Retry same save</button>
      </div>}
      {agentState?.error&&pending&&<button type="button" onClick={()=>void retry()} className="mx-auto mt-3 block min-h-11 rounded-xl border border-forest-200 px-3 text-sm">Retry this same KS001 turn</button>}
      {busyNow&&<p role="status" className="mx-auto mt-3 max-w-2xl text-xs text-sand-700">KS001 is working…</p>}
      <div ref={end}/>
    </div>
    <form onSubmit={e=>{e.preventDefault();void send(draft);}} className="shrink-0 border-t border-cream-100 bg-white/95 px-3 py-3 sm:px-5">
      <div className="mx-auto max-w-2xl rounded-2xl border border-cream-200 bg-white p-2 shadow-[0_10px_25px_-22px_rgba(30,60,42,.5)]">
        <label htmlFor="vision-north-input" className="sr-only">Tell KS001 what you are imagining</label>
        <textarea id="vision-north-input" rows={2} maxLength={1200} value={draft}
          onChange={e=>setDraft(e.target.value)} placeholder="I've been thinking about…" disabled={busyNow||pending}
          className="min-h-16 w-full resize-none rounded-xl bg-white px-3 py-2 text-sm text-forest-900 outline-none placeholder:text-sand-500"/>
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex items-center gap-2">
            <button type="button" aria-label="Add inspiration" aria-expanded={addOpen} onClick={()=>setAddOpen(v=>!v)}
              className="flex min-h-10 items-center gap-1 rounded-xl bg-cream-50 px-3 text-xs text-forest-800"><Plus size={16}/> Add</button>
            {addOpen&&<div className="absolute bottom-11 left-0 z-20 w-48 rounded-xl border border-cream-200 bg-white p-1 shadow-lg">
              {([['Photos',Image],['Documents',FileText],['Places',MapPin]] as const).map(([name,Icon])=>
                <button key={name} type="button" onClick={()=>{onAdd(name);setAddOpen(false);}} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs hover:bg-cream-50"><Icon size={16}/>{name}</button>)}
            </div>}
            <button type="button" onClick={()=>setShowCalculator(true)} className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs text-forest-800 hover:bg-cream-50"><Calculator size={17}/> Scenarios</button>
          </div>
          <button type="submit" aria-label="Send Vision thought" disabled={!draft.trim()||busyNow||pending}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-forest-800 text-white disabled:opacity-40"><ArrowUp size={19}/></button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-sand-600">
        {real?'Private Dream record · A KS001 conversation is not an Agreement or payment.':
          'Exploration preview only. Sign in to start a private, saved KS001 Dream.'}
      </p>
    </form>
  </div>;
}
export function TrueNorthVisionSummary({journey,signedIn,onSignIn,onOpenSaved,children}:{
  journey:VisionNorthJourney;signedIn:boolean;onSignIn:()=>void;onOpenSaved?:(id:string)=>void;children?:ReactNode;
}){
  const {firstThought,moreThoughts,scenarios,dreamState,real,saveDreamNotes,savedNotice,busy,showCalculator,setShowCalculator}=journey;
  const dream=dreamState?.selected??null;
  return <div data-true-north-vision-summary className="space-y-5">
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.13em] text-forest-700"><Compass size={16}/> Your Vision</p>
      <h2 className="font-display text-xl text-forest-900">{firstThought?'Taking shape':'A place for what could be'}</h2>
      <p className="text-sm leading-6 text-sand-700">{firstThought||'Your first thought will appear here. There is nothing to prove, price or commit to before you begin.'}</p>
      {dream&&<p className="flex items-center gap-2 text-xs text-forest-800"><Check size={14}/> Private Dream record confirmed</p>}
      {!real&&<p className="text-xs text-sand-600">Preview thoughts are local to this workspace. They are not saved or analysed by live KS001.</p>}
    </div>
    {moreThoughts.length>0&&<section className="border-t border-cream-200 pt-4">
      <h3 className="mb-2 text-sm font-semibold">Ideas emerging</h3>
      {moreThoughts.map((thought,i)=><p className="mb-2 rounded-xl bg-cream-50 p-3 text-xs leading-5" key={i}>{thought.text}</p>)}
    </section>}
    <section className="border-t border-cream-200 pt-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Scenarios worth keeping</h3><Calculator size={17} className="text-forest-700"/></div>
      {scenarios.length===0?<p className="mt-2 text-xs leading-5 text-sand-700">What if you saved? Built in stages? Borrowed? Explore the alternatives before choosing a direction.</p>:
        <div className="mt-2 space-y-2">{scenarios.map(x=><article key={x.id} className="rounded-xl border border-cream-200 bg-[#fbfcf9] p-3">
          <p className="text-xs font-semibold text-forest-900">{x.name}</p><p className="mt-1 text-xs leading-5 text-sand-700">{x.detail}</p></article>)}</div>}
      <button type="button" onClick={()=>setShowCalculator(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-forest-200 px-3 text-xs font-semibold text-forest-800"><Calculator size={16}/>{showCalculator?'Continue comparing':'Compare possibilities'}</button>
    </section>
    <section className="border-t border-cream-200 pt-4">
      <h3 className="text-sm font-semibold">When you are ready</h3>
      <p className="mt-2 text-xs leading-5 text-sand-700">A promising idea can move into My Work only after you deliberately review what to take forward. No automatic Agreement, local introduction or Money action.</p>
      {real&&dream&&<button type="button" disabled={busy} onClick={()=>void saveDreamNotes()}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-40"><Save size={16}/> Save my selected notes</button>}
      {signedIn&&dream&&onOpenSaved&&<button type="button" onClick={()=>onOpenSaved(dream.dreamId)} className="mt-2 min-h-11 w-full rounded-xl border border-forest-200 px-3 text-xs font-semibold">Open saved Dream / review for My Work</button>}
      {!signedIn&&<button type="button" onClick={onSignIn} className="mt-3 min-h-11 w-full rounded-xl border border-forest-200 px-3 text-xs font-semibold">Sign in to save a private Dream</button>}
      {savedNotice&&<p role="status" className="mt-2 text-xs text-forest-800">{savedNotice}</p>}
    </section>
    {children&&<details className="border-t border-cream-200 pt-4"><summary className="cursor-pointer text-sm font-semibold">My saved Dreams</summary><div className="mt-3">{children}</div></details>}
    <p className="border-t border-cream-100 pt-4 text-[11px] leading-5 text-sand-600">The Scenario Calculator uses assumptions you choose. No prices, returns, jobs, loans or local people are independently verified here.</p>
  </div>;
}
