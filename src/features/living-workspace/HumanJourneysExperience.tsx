import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft, CalendarDays, ChevronDown, ClipboardList,
  FileText, ImagePlus, MapPin, Minus, Plus, Send, ShieldCheck,
  ShoppingBag, Store, Trash2, Users, Wallet, X,
} from 'lucide-react';
import type { StoreOffer } from '../../types';
import type { SelectionItem } from '../store/shopSelection.mjs';
import { collectOffer, removeSelected, selectionToKs001, updateSelectedQuantity } from '../store/shopSelection.mjs';
import { CompactStoreBrowser, initialStoreBrowserState, type StoreBrowserState, type StoreBrowserTarget } from './CompactStoreBrowser';
import { StoreMasterpieceLayoutReview } from '../store/StoreMasterpieceLayoutReview';
import { storeOfferAssistTurn } from '../store/offerAssistTurn.mjs';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';

/**
 * Gate 3 OWNER EXPERIENCE REVIEW — a deliberately isolated preview of the
 * existing Living Workspace.  It calls NO agent, Agreement, identity or money API.
 * All stores come from existing demonstration fixtures; all responses are
 * scripted and are labelled as such.  The server remains sole source of truth.
 * This route exists only on Vercel preview hosts.
 */
type WorkId = 'cctv' | 'security-light' | 'repairs' | 'resident-project' | 'busy-day';
type Field = 'where' | 'when' | 'who' | 'money' | 'evidence' | 'changes';
type SourceKind = 'photo' | 'document' | 'place' | 'person' | 'date';
type Turn = { id: number; by: 'person' | 'example'; text: string };
type Source = { id: number; kind: SourceKind; label: string };
type Milestone = { id: string; title: string; owner: string; date: string; proof: string };
type Work = {
  title: string;
  introduction: string;
  draft: string;
  facts: Partial<Record<Field, string>>;
  deferred: Field[];
  turns: Turn[];
  sources: Source[];
  milestones: Milestone[];
  cart: SelectionItem[];
};
type Scenario = {
  id: WorkId; title: string; description: string; purpose: string;
  initial: string; questions: { field: Field; question: string; label: string }[];
  milestones: Milestone[];
};
const QUESTION_LABELS: Record<Field, string> = {
  where: 'Place', when: 'Timing', who: 'People', money: 'Amounts and funding',
  evidence: 'Proof of completion', changes: 'If plans change',
};
const SCENARIOS: Scenario[] = [
  {
    id: 'cctv', title: 'Install home CCTV', description: 'One buyer, one supplier', purpose: 'SecureLink',
    initial: 'I want to buy CCTV cameras from a Digital Store and have them installed at home.',
    questions: [
      { field:'where',label:'Place',question:'Where should the cameras be installed?' },
      { field:'when',label:'Timing',question:'When would you like the installation completed?' },
      { field:'who',label:'People',question:'Who will supply and install the cameras, and who will inspect the work?' },
      { field:'money',label:'Price',question:'What has the supplier quoted, and what is included?' },
      { field:'evidence',label:'Proof',question:'How would you know the cameras were properly installed and working?' },
      { field:'changes',label:'Changes',question:'What should happen if installation is delayed or a camera fails inspection?' },
    ],
    milestones: [
      {id:'c1',title:'Agree on cameras and installation scope',owner:'Buyer and supplier',date:'To agree',proof:'Itemised quotation and agreed specifications'},
      {id:'c2',title:'Install cameras and test coverage',owner:'Installer',date:'To agree',proof:'Installation photos and working test'},
      {id:'c3',title:'Inspect and confirm the work',owner:'Buyer',date:'To agree',proof:'Buyer review and accepted results'},
    ],
  },
  {
    id: 'security-light', title: 'Shared security light', description: 'Many contributors, one purpose', purpose: 'GroupSecureLink',
    initial: 'Several neighbours want to contribute towards one security light from a supplier.',
    questions: [
      {field:'where',label:'Location',question:'Where will the shared security light be installed?'},
      {field:'who',label:'Contributors',question:'Who is organising the project, and how will contributors approve the supplier?'},
      {field:'money',label:'Contributions',question:'What is the target amount, and how much is each person proposing to contribute?'},
      {field:'when',label:'Deadline',question:'By when do you want the contribution and installation completed?'},
      {field:'evidence',label:'Proof',question:'What evidence should everyone see before confirming installation?'},
      {field:'changes',label:'Disagreement',question:'What happens if the target is not reached or a contributor disagrees?'},
    ],
    milestones: [
      {id:'g1',title:'Review the purpose and contribution rules',owner:'Organiser and contributors',date:'To agree',proof:'Approved purpose and contribution plan'},
      {id:'g2',title:'Confirm installation with supplier',owner:'Supplier',date:'To agree',proof:'Installed light and test record'},
      {id:'g3',title:'Group reviews completed work',owner:'Authorised group reviewers',date:'To agree',proof:'Contributor-accessible review'},
    ],
  },
  {
    id: 'repairs', title: 'Gate and drainage repairs', description: 'One budget, two contractors', purpose: 'SecureFlow',
    initial: 'I have one budget for repairing a gate and drainage, using two different contractors.',
    questions: [
      {field:'where',label:'Sites',question:'Where is each repair needed?'},
      {field:'money',label:'Budget',question:'What budget is proposed, and how much should go to each contractor?'},
      {field:'who',label:'Contractors',question:'Who is responsible for the gate and who will work on the drainage?'},
      {field:'when',label:'Dates',question:'When should each job be completed and inspected?'},
      {field:'evidence',label:'Independent proof',question:'What separate evidence will show that each job was completed well?'},
      {field:'changes',label:'Problems',question:'If one contractor has a dispute, what should happen to the other job?'},
    ],
    milestones: [
      {id:'f1',title:'Inspect gate repairs',owner:'Gate contractor and client',date:'To agree',proof:'Gate functions and inspection record'},
      {id:'f2',title:'Inspect drainage works',owner:'Drainage contractor and client',date:'To agree',proof:'Drainage test and site photographs'},
      {id:'f3',title:'Review separate outcomes',owner:'Client',date:'To agree',proof:'Independent acceptance of each obligation'},
    ],
  },
  {
    id: 'resident-project', title: 'Residents’ CCTV project', description: 'Many contributors, several suppliers', purpose: 'GroupSecureFlow',
    initial: 'Residents want to contribute to CCTV equipment, installation and maintenance from different providers.',
    questions: [
      {field:'who',label:'People',question:'Who contributes, who approves the plan, and which providers will do each job?'},
      {field:'money',label:'Allocations',question:'How should the contributions be divided between equipment, installation and maintenance?'},
      {field:'where',label:'Area',question:'Where is the equipment going to be installed and maintained?'},
      {field:'when',label:'Dates',question:'When should the different parts of the project be done?'},
      {field:'evidence',label:'Separate checks',question:'What proof is required before each provider can be considered for payment?'},
      {field:'changes',label:'Governance',question:'Who must agree again if the distribution plan or supplier changes?'},
    ],
    milestones: [
      {id:'r1',title:'Review contribution and allocation plan',owner:'Contributors and authorised organisers',date:'To agree',proof:'Versioned approved distribution plan'},
      {id:'r2',title:'Receive and inspect equipment',owner:'Equipment provider and reviewers',date:'To agree',proof:'Count and condition of cameras'},
      {id:'r3',title:'Install and commission cameras',owner:'Installer and reviewers',date:'To agree',proof:'Commissioning and coverage tests'},
      {id:'r4',title:'Confirm maintenance arrangement',owner:'Maintenance provider and reviewers',date:'To agree',proof:'Scope and future evidence conditions'},
    ],
  },
  {
    id: 'busy-day', title: 'A customer’s busy day', description: 'Store enquiry and unrelated work', purpose: 'Multiple Work',
    initial: 'I need a few products from a Store, but I am also working on CCTV and drainage projects.',
    questions: [
      {field:'who',label:'Stores',question:'Which Store or supplier would you like to discuss first?'},
      {field:'where',label:'Delivery',question:'Where would you want these products delivered or collected?'},
      {field:'when',label:'Timing',question:'When will you need them?'},
      {field:'money',label:'Budget',question:'Do you have a proposed budget or are you still comparing prices?'},
      {field:'evidence',label:'Conditions',question:'What needs checking before you would agree to buy?'},
      {field:'changes',label:'Other work',question:'Would you like to return to CCTV or drainage, or keep working on these Store choices?'},
    ],
    milestones: [
      {id:'b1',title:'Compare selected Store offers',owner:'Buyer',date:'To agree',proof:'Actual published offer details'},
      {id:'b2',title:'Clarify fulfilment and delivery',owner:'Buyer and seller',date:'To agree',proof:'Individually reviewed terms'},
    ],
  },
];
const STORAGE_KEY = 'securepay-gate3-human-journeys-preview-v1';
const labels = (field: Field) => QUESTION_LABELS[field];
function initialWork(s: Scenario): Work {
  return {
    title:s.title, introduction:s.initial, draft:'', facts:{}, deferred:[], cart:[], sources:[],
    turns: [
      {id:1,by:'person',text:s.initial},
      {id:2,by:'example',text:'I can help you organise this as a clear proposal. ' + s.questions[0].question},
    ],
    milestones:s.milestones.map(m=>({...m})),
  };
}
function initialWorks(): Record<WorkId, Work> {
  return Object.fromEntries(SCENARIOS.map(s=>[s.id,initialWork(s)])) as Record<WorkId, Work>;
}
function validWork(value: unknown): value is Work {
  if (!value || typeof value !== 'object') return false;
  const w=value as Partial<Work>;
  return typeof w.title==='string' && typeof w.draft==='string'
    && !!w.facts && Array.isArray(w.deferred) && Array.isArray(w.turns) && Array.isArray(w.sources)
    && Array.isArray(w.milestones) && Array.isArray(w.cart);
}
function restoredWorks():Record<WorkId,Work> {
  const defaults=initialWorks();
  try {
    const raw=window.sessionStorage.getItem(STORAGE_KEY);
    if(!raw)return defaults;
    const saved=JSON.parse(raw) as Partial<Record<WorkId, Work>>;
    for(const s of SCENARIOS)if(validWork(saved[s.id]))defaults[s.id]=saved[s.id]!;
  }catch{/* Review works without browser storage. */}
  return defaults;
}
function nextQuestion(work:Work,scenario:Scenario) {
  return scenario.questions.find(q=>!work.facts[q.field] && !work.deferred.includes(q.field));
}
const srcNames:Record<SourceKind,string>={photo:'Photo',document:'Document',place:'Place',person:'Person',date:'Date / time'};
const TOOL_ACTIONS: {id: SourceKind; title:string; icon:typeof MapPin}[] = [
  {id:'photo',title:'Photo',icon:ImagePlus},
  {id:'document',title:'Document',icon:FileText},
  {id:'place',title:'Place',icon:MapPin},
  {id:'person',title:'Person',icon:Users},
  {id:'date',title:'Date & Time',icon:CalendarDays},
];

export function HumanJourneysExperience() {
  const [works,setWorks]=useState<Record<WorkId,Work>>(restoredWorks);
  const [workId,setWorkId]=useState<WorkId>('cctv');
  const [activeTool,setActiveTool]=useState<'overview'|'stores'|SourceKind>('overview');
  const [middle,setMiddle]=useState<'chat'|'store'>('chat');
  const [mobilePanel,setMobilePanel]=useState<'chat'|'tools'|'summary'>('chat');
  const [sourceText,setSourceText]=useState('');
  const [browser,setBrowser]=useState<StoreBrowserState>(initialStoreBrowserState);
  const [storeNavigation,setStoreNavigation]=useState<StoreBrowserTarget|null>(null);
  const [notice,setNotice]=useState('');
  const [showPrinciples,setShowPrinciples]=useState(false);
  const current=works[workId];
  const scenario=SCENARIOS.find(s=>s.id===workId)!;
  const next=nextQuestion(current,scenario);
  const count=current.cart.filter(item=>item.destination==='agreement').reduce((n,item)=>n+item.quantity,0);
  const mentioned=Object.entries(current.facts).filter(([,value])=>Boolean(value?.trim()));
  useEffect(()=>{
    try{window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(works));}catch{/* No persistence guarantee. */}
  },[works]);
  const update=(id:WorkId,change:(current:Work)=>Work)=>{
    setWorks(prev=>({...prev,[id]:change(prev[id])}));
  };
  const addSource=(kind:SourceKind,label:string)=>{
    const text=label.trim().slice(0,250);
    if(!text)return;
    update(workId,w=>({...w,sources:[...w.sources,{kind,label:text,id:Date.now()}]}));
    setNotice(srcNames[kind]+' noted for '+current.title+'. Local example only; nothing uploaded or verified.');
    setSourceText('');
  };
  const appendConversation=(message:string,fromStore=false)=>{
    const clean=message.trim().slice(0,1100);
    if(!clean)return;
    const prompt=next;
    update(workId,w=>{
      const facts=fromStore||!prompt?w.facts:{...w.facts,[prompt.field]:clean};
      const updated={...w,facts,draft:''};
      const q=nextQuestion(updated,scenario);
      const answer=fromStore
        ?'I have added that Store request as a proposal, not an order. ' + (q?.question??'Would you like to review the proposed terms?')
        :q?'I have noted that as a proposal. '+q.question:
          'You have the main proposed details. The next step is to review them with the other people. Nothing has been accepted or funded.';
      const n=w.turns.length;
      return {...updated,turns:[...w.turns,{id:n+1,by:'person',text:clean},{id:n+2,by:'example',text:answer}]};
    });
    setMiddle('chat');setMobilePanel('chat');
  };
  const deferCurrentQuestion=()=>{
    if(!next)return;
    update(workId,w=>{
      const updated={...w,deferred:[...w.deferred,next.field]};
      const following=nextQuestion(updated,scenario);
      const answer='No problem. That stays open for later. '+(following?.question??'You can review what is proposed, then return to the questions still open.');
      const n=w.turns.length;
      return {...updated,turns:[...w.turns,{id:n+1,by:'person',text:'I am not sure yet.'},{id:n+2,by:'example',text:answer}]};
    });
  };
  const onSend=(e:FormEvent)=>{
    e.preventDefault();
    if(!current.draft.trim())return;
    appendConversation(current.draft);
  };
  const switchWork=(id:WorkId)=>{
    setWorkId(id);setMiddle('chat');setActiveTool('overview');setMobilePanel('chat');
    setBrowser(initialStoreBrowserState);setStoreNavigation(null);setNotice('');
  };
  const addCart=(offer:StoreOffer)=>{
    try{
      const cart=collectOffer(current.cart,offer,'agreement',true);
      update(workId,w=>({...w,cart}));
      setNotice('Added to the '+current.title+' collection. It is not an order.');
    }catch(err){setNotice(err instanceof Error?err.message:'This offer cannot be added.');}
  };
  const setCart=(items:SelectionItem[])=>update(workId,w=>({...w,cart:items}));
  const discussOffer=(offer:StoreOffer)=>appendConversation(storeOfferAssistTurn(offer),true);
  const discussCart=()=>{if(count>0)appendConversation(selectionToKs001(current.cart,'agreement'),true);};
  const expandStore=(target:Omit<StoreBrowserTarget,'requestId'>)=>{
    setStoreNavigation({...target,requestId:Date.now()});
    setMiddle('store');setMobilePanel('chat');
  };
  const editMilestone=(id:string,field:'owner'|'date'|'proof',value:string)=>
    update(workId,w=>({...w,milestones:w.milestones.map(m=>m.id===id?{...m,[field]:value.slice(0,140)}:m)}));
  const reset=()=>{
    setWorks(initialWorks());setNotice('All sample notes in this browser tab have been cleared.');
    setMiddle('chat');setBrowser(initialStoreBrowserState);setMobilePanel('chat');
  };
  const toolClass='flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition-colors hover:bg-cream-50 focus-visible:outline-2 focus-visible:outline-forest-700';
  return <main data-gate3-human-journeys data-workspace-frozen-layout
      className="sp-type-signature sp-brand-shell flex min-h-screen flex-col bg-gradient-to-br from-[#fbfaf5] via-[#f7f7f1] to-[#eef2eb] text-forest-800">
    <header className="sp-brand-header shrink-0 border-b border-cream-200/80 bg-white/95 px-3 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src={securepayWordmark} alt="SecurePay" className="h-9 w-auto max-w-[145px] object-contain"/>
          <span className="hidden text-xs text-sand-600 sm:block">KS001 · Your space to make progress</span>
        </div>
        <nav aria-label="Workspace experience" className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-cream-100 p-1">
          <span aria-current="page" className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm">My Work</span>
          {(['vision','circle','community'] as const).map(area=>
            <a key={area} href={'#/preview/living-workspace/'+area} className="min-h-10 shrink-0 rounded-lg px-3 py-2.5 text-xs text-sand-600 hover:bg-white">
              {area[0].toUpperCase()+area.slice(1)}
            </a>)}
        </nav>
        <a href="#/preview/living-workspace/work" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-forest-800 underline underline-offset-4"><ArrowLeft size={15}/> Original workspace</a>
      </div>
    </header>
    <div className="mx-auto flex w-full max-w-[1550px] flex-1 flex-col px-3 py-2.5 sm:px-5 sm:py-4 lg:min-h-0 lg:max-h-[calc(100dvh-95px)]">
      <div role="status" className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-forest-100 bg-[#edf2e9] px-3 py-2 text-xs text-forest-900">
        <span><strong>Human journey review</strong> · Scripted KS001 examples. No live AI, real Store publication, Agreement acceptance or Money movement.</span>
        <button type="button" onClick={reset} className="min-h-9 rounded-lg px-2 font-medium underline underline-offset-2">Reset samples</button>
      </div>
      {notice&&<div role="status" className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-cream-200 bg-white p-2.5 text-xs text-sand-700">
        <span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={()=>setNotice('')} className="shrink-0 p-1"><X size={15}/></button></div>}
      <div className="flex min-h-0 flex-1 gap-3" data-workspace-shell>
        <aside aria-label="Workspace tools" data-gate3-tools
          className={(mobilePanel==='tools'?'flex':'hidden')+' min-h-[66dvh] w-full shrink-0 flex-col overflow-y-auto rounded-2xl border border-cream-200 bg-white p-3 shadow-sm lg:flex lg:min-h-0 lg:w-[290px]'}>
          <div className="mb-3 flex items-center justify-between"><h2 className="sp-type-display text-lg">Tools</h2>
            <button type="button" onClick={()=>{setMobilePanel('chat');setActiveTool('overview');}} className="min-h-10 rounded-lg px-2 text-xs lg:hidden">Back to KS001</button></div>
          <button className={toolClass+(activeTool==='overview'?' bg-cream-100 font-semibold':'')} onClick={()=>setActiveTool('overview')}><ClipboardList size={17}/> My work and examples</button>
          <button className={toolClass+(activeTool==='stores'?' bg-cream-100 font-semibold':'')} onClick={()=>setActiveTool('stores')}><Store size={17}/> Digital Stores <ChevronDown size={14} className="ml-auto"/></button>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {TOOL_ACTIONS.map(({id,title,icon:Icon})=><button key={id} type="button" onClick={()=>setActiveTool(id)}
              className={'flex min-h-11 items-center gap-1.5 rounded-xl border px-2 text-xs '+(activeTool===id?'border-forest-400 bg-forest-50 font-semibold':'border-cream-200 bg-white')}><Icon size={15}/>{title}</button>)}
          </div>
          <div className="my-3 border-b border-cream-100"/>
          {activeTool==='overview'&&<div className="min-h-0 space-y-2 overflow-y-auto">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sand-600">Your separate work</p>
            {SCENARIOS.map(s=><button key={s.id} type="button" onClick={()=>switchWork(s.id)} aria-current={workId===s.id?'true':undefined}
              className={'w-full rounded-xl border p-3 text-left '+(workId===s.id?'border-forest-300 bg-forest-50':'border-cream-200 hover:bg-cream-50')}>
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="mt-1 block text-[0.72rem] text-sand-600">{s.description}</span>
              <span className="mt-1 block text-[0.68rem] text-sand-500">{works[s.id].turns.length-2} additional conversation messages · {works[s.id].cart.length} Store selections</span>
            </button>)}
            <p className="rounded-xl bg-cream-50 p-2.5 text-xs text-sand-600">Switch projects freely. Each keeps its own draft, sources, questions, milestones and cart in this browser tab.</p>
          </div>}
          {activeTool==='stores'&&<div className="min-h-0 flex-1 overflow-y-auto">
            <p className="mb-2 text-xs text-sand-600">Search existing sample Store offers, or expand a shop into the middle panel. Your KS001 conversation is kept.</p>
            <CompactStoreBrowser key={workId} browser={browser} onBrowserChange={setBrowser}
              example selection={current.cart} onAddCart={addCart} onSaveVision={()=>setNotice('Vision is separate. Nothing is saved from this sample.')}
              onDiscuss={discussOffer} onDiscussCart={discussCart} onExpand={expandStore}
              onPhotoSearch={()=>setActiveTool('photo')} onManage={()=>expandStore({kind:'manage'})}/>
          </div>}
          {activeTool!=='overview'&&activeTool!=='stores'&&<div className="space-y-3 rounded-xl bg-cream-50 p-3">
            <p className="text-sm font-semibold">Add {srcNames[activeTool].toLowerCase()}</p>
            {(activeTool==='photo'||activeTool==='document')&&
              <label className="block cursor-pointer rounded-xl border border-dashed border-forest-300 bg-white p-3 text-xs">
                Choose a {activeTool==='photo'?'photo':'document'} · sample only
                <input type="file" className="mt-2 block w-full text-xs" accept={activeTool==='photo'?'image/*':'.pdf,.doc,.docx,.txt,.xls,.xlsx'}
                  onChange={e=>{const file=e.target.files?.[0];if(file){addSource(activeTool,file.name);e.target.value='';}}}/>
              </label>}
            <form onSubmit={e=>{e.preventDefault();addSource(activeTool,sourceText);}}>
              <label htmlFor="gate3-source-detail" className="mb-2 block text-xs text-sand-600">
                {activeTool==='place'?'Describe the place and entrance':activeTool==='person'?'Name the proposed person and their role':activeTool==='date'?'Proposed date and time':'Add a short note or caption'}
              </label>
              <textarea id="gate3-source-detail" rows={3} value={sourceText} onChange={e=>setSourceText(e.target.value)}
                placeholder="Your proposed details" maxLength={250}
                className="w-full resize-y rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
              <button type="submit" disabled={!sourceText.trim()} className="mt-2 min-h-11 w-full rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-50">Add to this work</button>
            </form>
            <p className="text-xs leading-5 text-sand-600">Nothing is uploaded or independently checked. The live API will own source identity and understanding later.</p>
          </div>}
        </aside>
        <section aria-label={middle==='store'?'Digital Stores middle view':'KS001 conversation'} data-gate3-middle
          className={(mobilePanel==='chat'?'flex':'hidden')+' sp-brand-conversation min-h-[69dvh] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm lg:flex lg:min-h-0'}>
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-cream-200 px-3 py-3 sm:px-4">
            <div className="min-w-0"><p className="text-[0.67rem] font-semibold uppercase tracking-widest text-sand-500">{middle==='store'?'Digital Stores · sample view':'KS001 · sample conversation'}</p>
              <h1 className="sp-type-display truncate text-base font-semibold text-forest-900">{middle==='store'?'Browse and choose':current.title}</h1>
            </div>
            {middle==='store'?<button onClick={()=>setMiddle('chat')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-forest-200 px-3 text-xs font-semibold"><ArrowLeft size={16}/> Back to KS001</button>:
              <span className="rounded-full bg-cream-100 px-2 py-1.5 text-[0.68rem] text-sand-700">Draft · not agreed</span>}
          </header>
          {middle==='store'?<div className="min-h-0 flex-1 overflow-y-auto" data-store-expanded-middle>
            <StoreMasterpieceLayoutReview key={workId} shopFocused={false} externalNavigation={storeNavigation}
              workspaceSelection={current.cart} onSelectionChange={setCart}
              onOpenKs001Preview={(message)=>{if(message)appendConversation(message,true);else setMiddle('chat');}}/>
          </div>:<>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5" data-gate3-transcript>
              {current.turns.map(turn=><div key={turn.id} className={turn.by==='person'?'flex justify-end':'flex justify-start'}>
                <article className={'max-w-[94%] rounded-2xl p-3 text-sm leading-6 sm:max-w-[86%] '+(turn.by==='person'?'rounded-br-md bg-forest-800 text-white':'rounded-bl-md border border-cream-200 bg-cream-50 text-forest-900')}>
                  <span className={'mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide '+(turn.by==='person'?'text-cream-100':'text-forest-700')}>{turn.by==='person'?'You':'KS001 · scripted example'}</span>
                  <p className="whitespace-pre-wrap break-words">{turn.text}</p>
                </article>
              </div>)}
              {current.sources.length>0&&<div className="rounded-xl border border-cream-200 bg-white p-3 text-xs">
                <strong>Added to this example</strong>
                <div className="mt-2 flex flex-wrap gap-1.5">{current.sources.map(source=><span key={source.id} className="rounded-full bg-cream-100 px-2.5 py-1">{srcNames[source.kind]} · {source.label}</span>)}</div>
                <p className="mt-2 text-sand-600">Local notes only. No source reading has taken place.</p>
              </div>}
              {!next&&<div role="status" className="rounded-xl bg-[#edf2e9] p-3 text-sm text-forest-900">
                <strong>{current.deferred.length>0?'Some questions remain open.':'Ready to review the proposal.'}</strong> The live API must still verify facts, parties, the twelve Fair Trade principles and every approval. This is not a signed Agreement.
              </div>}
            </div>
            <div className="shrink-0 border-t border-cream-200 bg-white p-3 sm:p-4">
              {next&&<div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-sand-700">
                <span className="font-semibold">Next useful question:</span><span>{next.question}</span>
                <button type="button" onClick={deferCurrentQuestion} className="ml-auto min-h-9 rounded-full border border-cream-200 px-2.5">Not sure yet</button>
              </div>}
              <form onSubmit={onSend} className="flex items-end gap-2">
                <label htmlFor="gate3-work-draft" className="sr-only">Your message to the sample KS001 conversation</label>
                <textarea id="gate3-work-draft" rows={2} maxLength={1100} value={current.draft}
                  onChange={e=>update(workId,w=>({...w,draft:e.target.value}))}
                  placeholder="Tell KS001 what you need…" className="min-h-12 max-h-36 min-w-0 flex-1 resize-y rounded-xl border border-cream-200 bg-cream-50 p-3 text-sm focus-visible:outline-2 focus-visible:outline-forest-600"/>
                <button type="submit" disabled={!current.draft.trim()}
                  className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-forest-800 text-white disabled:opacity-50" aria-label="Add proposal to sample conversation"><Send size={18}/></button>
              </form>
              <p className="mt-2 text-[0.7rem] text-sand-500">Try the flow here. This scripted example does not talk to a model or create a SecurePay record.</p>
            </div>
          </>}
        </section>
        <aside aria-label="SecurePay Check" data-gate3-summary
          className={(mobilePanel==='summary'?'block':'hidden')+' min-h-[66dvh] w-full shrink-0 overflow-y-auto rounded-2xl border border-cream-200 bg-white p-3 shadow-sm lg:block lg:min-h-0 lg:w-[318px]'}>
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[0.65rem] font-semibold uppercase tracking-widest text-sand-500">SecurePay Check</p><h2 className="sp-type-display text-lg text-forest-900">Your running summary</h2></div>
            <button type="button" onClick={()=>setMobilePanel('chat')} className="min-h-10 px-2 text-xs lg:hidden">Back to KS001</button>
          </div>
          <p className="mb-3 rounded-xl bg-cream-50 p-3 text-xs leading-5 text-sand-700">Working on <strong>{current.title}</strong>. Everything below is proposed and kept separately for this example.</p>
          <div className="space-y-4 text-sm">
            <section><h3 className="text-xs font-semibold uppercase tracking-wide text-sand-600">What's being planned</h3>
              <p className="mt-1.5 text-sm leading-6">{current.introduction}</p>
              {mentioned.map(([key,value])=><div key={key} className="mt-2 rounded-lg bg-cream-50 p-2">
                <p className="text-[0.68rem] font-semibold text-sand-600">{labels(key as Field)}</p>
                <p className="break-words text-xs leading-5">{value}</p>
              </div>)}
              {next&&<p className="mt-2 text-xs text-sand-600"><strong>Still needed:</strong> {next.question}</p>}
              {current.deferred.length>0&&<p className="mt-2 text-xs text-sand-600"><strong>To clarify later:</strong> {current.deferred.map(labels).join(', ')}. These are not agreed facts.</p>}
            </section>
            <section className="border-t border-cream-200 pt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sand-600"><ClipboardList size={15}/> Milestones · proposed</h3>
              <div className="mt-2 space-y-2">
                {current.milestones.map(m=><details key={m.id} className="rounded-xl border border-cream-200 p-2.5">
                  <summary className="cursor-pointer text-xs font-semibold leading-5">{m.title}<span className="mt-1 block text-[0.68rem] font-normal text-sand-600">Who: {m.owner} · {m.date}</span></summary>
                  <div className="mt-3 space-y-2 text-xs">
                    {([['owner','Responsible'],['date','When'],['proof','Proof required']] as const).map(([field,label])=>
                      <label key={field} className="block"><span className="mb-1 block text-sand-600">{label}</span>
                        <input value={m[field]} maxLength={140} onChange={e=>editMilestone(m.id,field,e.target.value)}
                          className="min-h-10 w-full rounded-lg border border-cream-200 bg-cream-50 px-2.5 text-xs"/></label>)}
                    <p className="text-[0.69rem] text-sand-600">Editing here changes only this local proposal. No milestone can be completed or approved in this preview.</p>
                  </div>
                </details>)}
              </div>
            </section>
            <section className="border-t border-cream-200 pt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sand-600"><ShoppingBag size={15}/> Store choices · {count} items</h3>
              {current.cart.filter(x=>x.destination==='agreement').length>0
                ?<div className="mt-2 space-y-2">
                  {current.cart.filter(x=>x.destination==='agreement').map(item=><div key={item.key} className="rounded-lg border border-cream-200 p-2">
                    <p className="text-xs font-semibold">{item.title}</p><p className="text-[0.7rem] text-sand-600">{item.sellerName} · {item.priceLabel||'Price to ask'}</p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <button type="button" aria-label={'Remove one '+item.title} onClick={()=>setCart(updateSelectedQuantity(current.cart,item.key,item.quantity-1))}
                        className="min-h-10 min-w-10 rounded-lg border border-cream-200"><Minus size={14} className="mx-auto"/></button>
                      <span className="min-w-5 text-center text-xs">{item.quantity}</span>
                      <button type="button" aria-label={'Add one '+item.title} onClick={()=>setCart(updateSelectedQuantity(current.cart,item.key,item.quantity+1))}
                        className="min-h-10 min-w-10 rounded-lg border border-cream-200"><Plus size={14} className="mx-auto"/></button>
                      <button type="button" aria-label={'Remove '+item.title} onClick={()=>setCart(removeSelected(current.cart,item.key))}
                        className="min-h-10 min-w-10 text-sand-600"><Trash2 size={15} className="mx-auto"/></button>
                    </div>
                  </div>)}
                  <button type="button" onClick={discussCart} className="min-h-11 w-full rounded-xl border border-forest-300 bg-forest-50 px-3 text-xs font-semibold">Discuss these items with KS001</button>
                </div>
                :<p className="mt-2 text-xs text-sand-600">No items for this work. Open Stores in the left tool to compare sample offers.</p>}
            </section>
            <section className="border-t border-cream-200 pt-3">
              <button type="button" onClick={()=>setShowPrinciples(x=>!x)} aria-expanded={showPrinciples}
                className="flex min-h-11 w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-sand-600">
                <span className="flex items-center gap-1.5"><ShieldCheck size={15}/> Fair Trade · 12 principles</span><ChevronDown size={15}/>
              </button>
              <p className="text-xs leading-5 text-sand-600">Not examined. Real findings must come from the canonical, evidence-bound SecurePay API.</p>
              {showPrinciples&&<p className="mt-2 rounded-xl bg-cream-50 p-3 text-xs leading-5 text-sand-700">
                We should check what each person is promising, whether the amounts and completion conditions are clear, how disputes will be handled, and which facts still need confirming. A scripted answer cannot certify fairness or lawfulness.
              </p>}
            </section>
            <section className="border-t border-cream-200 pt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sand-600"><Wallet size={15}/> Money follows the Agreement</h3>
              <p className="mt-2 rounded-xl bg-cream-50 p-2.5 text-xs leading-5 text-sand-700"><strong>Not funded.</strong> No bank, M-Pesa, escrow, quote, release, invitation or approval is connected. The backend will establish separate Money authority later.</p>
            </section>
          </div>
        </aside>
      </div>
      <nav aria-label="Mobile workspace panels" className="sticky bottom-0 mt-2 flex shrink-0 justify-around gap-1 rounded-2xl border border-cream-200 bg-white p-1 shadow-sm lg:hidden">
        {([['tools','Tools'],['chat','KS001'],['summary','Summary']] as const).map(([id,title])=>
          <button key={id} type="button" onClick={()=>setMobilePanel(id)} aria-current={mobilePanel===id?'page':undefined}
            className={'min-h-12 flex-1 rounded-xl px-3 text-xs font-semibold '+(mobilePanel===id?'bg-forest-800 text-white':'text-sand-700')}>{title}</button>)}
      </nav>
    </div>
  </main>;
}
