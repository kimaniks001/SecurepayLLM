import { InlineCommunityHub } from './InlineCommunityHub';
import { UniversalSourceTray } from './UniversalSourceTray';
import { InlineVisionEditor } from './InlineVisionEditor';
import { InlineCircleBoard } from './InlineCircleBoard';
import { MockWorkspacePanel } from './MockWorkspacePanel';
import { SignInExperience } from '../public/SignInExperience';
import { WorkspaceContinuityPanel, type WorkspaceArea } from './WorkspaceContinuityPanel';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import type { FairTradeExaminationDto } from '../../api/securepay/agent/dto';
import { LiveWorkResultPanel } from './LiveWorkResultPanel';
import { createAgentController, deviceTimeZone, type AgentState } from '../agent/controller';
import { createFormationController, type FormationState } from '../formation/controller';
import { LiveKs001Session } from './LiveKs001Session';
import type { AgentGateway } from '../../api/securepay/agent';
import { QuickSupportPanel } from './QuickSupportPanel';
import { LivingCommunityPanel } from './LivingCommunityPanel';
import { LivingCirclePanel } from './LivingCirclePanel';
import { LivingVisionPanel } from './LivingVisionPanel';
import { LivingAgreementPanel } from './LivingAgreementPanel';
import { KS001_WORKSPACE_PERSONAS, recommendWorkspaceTool } from './personas';
import { useCallback, useEffect, useState, useSyncExternalStore, useRef } from 'react';
import { ArrowLeft, Camera, FileText, HeartHandshake, Landmark, Lightbulb, MapPin, MessageCircle, Plus, Store, UserRoundPlus, Wallet, X, Wrench, Users, Truck, BedDouble } from 'lucide-react';

type Mode = 'work' | 'vision' | 'circle' | 'community';
type Screen = 'chat' | 'result' | 'tools';
const tools = [
  { name: 'Photos', icon: Camera, description: 'Begin with a photo, preview and caption; it remains local until authorised upload.' },
  { name: 'Documents', icon: FileText, description: 'Select a document, preview its name and caption without claiming it has been interpreted.' },
  { name: 'Places', icon: MapPin, description: 'Prepare an address or place as unverified context.' },
  { name: 'People & Invitations', icon: UserRoundPlus, description: 'Find people, invite participants and clarify roles and permissions.' },
  { name: 'Stores', icon: Store, description: 'Find products, suppliers and services.' },
  { name: 'Money', icon: Wallet, description: 'See Agreement funding readiness and authorised next actions.' },
  { name: 'Financial Institutions', icon: Landmark, description: 'Find bank, finance and insurance options.' },
  { name: 'Quick Support', icon: BedDouble, description: 'Universal practical services: Short Stays, My Ride and Quick Documents.' },
  { name: 'Milestones', icon: Truck, description: 'Plan stages, evidence, completion and approval requirements.' },
  { name: 'Vision tools', icon: Lightbulb, description: 'Sketch, organise ideas, explore alternatives and develop a dream.' },
  { name: 'Community & Circles', icon: Users, description: 'Find people, groups, projects and shared work.' },
  { name: 'More tools', icon: Wrench, description: 'Additional SecurePay capabilities will appear here.' },
];
const scenarios: Record<Mode, { label: string; title: string; status: string; opening: string; facts: string[]; help: string[] }> = {
  work: { label: 'My Work · Agreement', title: 'Chair delivery', status: 'Draft', opening: 'I can help make a clear chair delivery agreement. Where should the chairs be delivered?', facts: ['200 chairs · proposed scope', 'Delivery location needed', 'Supplier and price to establish'], help: ['Stores and delivery providers', 'Plugs for coordination', 'Potential Community Saver, subject to Plug verification'] },
  vision: { label: 'Vision · Explore', title: 'My workshop idea', status: 'Exploring', opening: 'What would you most like your workshop to make possible?', facts: ['Explore purpose and layout', 'Collect inspiration and suppliers', 'No Agreement required'], help: ['Masters and skills', 'Stores and possible equipment', 'Community knowledge'] },
  circle: { label: 'Circle · Together', title: 'Our workshop vision', status: 'Discussing', opening: 'What might the group build together? Each proposal stays a proposal until the Circle decides.', facts: ['Collect members’ ideas', 'Explore places and supplies', 'Group decisions require authority'], help: ['Mentors and apprenticeships', 'Relevant Stores', 'Community projects'] },
  community: { label: 'Community · Trust Project', title: 'Good things happen together', status: 'LIVE', opening: 'Would you like to learn, contribute your skills or find a Circle?', facts: ['Conversations and belonging', 'Projects and events', 'Verified work and impact'], help: ['Discover Circles', 'Take part in a project', 'Learn from a Master'] },
};
const subscribeNever = (_listener: () => void) => () => {};
const noLiveState = (): AgentState | null => null;
const noFormationState = (): FormationState | null => null;

export function Phase1LivingWorkspacePreview({ gateway, workspaceGateways, session }: {
  gateway?: AgentGateway;
  workspaceGateways?: PreviewWorkspaceGateways;
  session: SessionStore;
}) {
  const initialMode=():Mode=>{
    if(typeof window==='undefined')return 'work';
    const match=/^#\/?preview\/living-workspace\/(work|vision|circle|community)\/?$/.exec(window.location.hash);
    return (match?.[1] as Mode | undefined)??'work';
  };
  const [mode, setMode] = useState<Mode>(initialMode);
  const [signInOpen,setSignInOpen]=useState(false);
  // Pure client-side illustration, intentionally separate from the real SessionStore.
  const [mockSignedIn,setMockSignedIn]=useState(false);
  const enterDemo=()=>{
    if (signedIn) return;
    setLiveWork(false);
    setLiveStarted(false);
    setSignInOpen(false);
    setMockSignedIn(true);
  };
  const exitDemo=()=>{ setMockSignedIn(false); setScreen('chat'); };
  const signedIn=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot).status==='signed-in';
  const [editingDreamId,setEditingDreamId]=useState<string|null>(null);
  const [workingCircleId,setWorkingCircleId]=useState<string|null>(null);
  const [dreamUnsaved,setDreamUnsaved]=useState(false);
  const noteUnsaved=useCallback((dirty:boolean)=>setDreamUnsaved(dirty),[]);
  const mayLeaveDream=()=>!dreamUnsaved || window.confirm('Your Dream has changes that have not been confirmed saved. Leave without saving?');
  const backToWorkspace=()=>{
    if(!mayLeaveDream())return;
    setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);
  };
  useEffect(()=>{
    if(!signedIn){setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);}
  },[signedIn]);

  useEffect(()=>{
    const sync=()=>{
      const next=initialMode();
      if(next!==mode && !mayLeaveDream()){
        window.location.hash='#/preview/living-workspace/'+mode;
        return;
      }
      if(next!==mode){
        setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);
      }
      setMode(next);
    };
    window.addEventListener('hashchange',sync);
    return ()=>window.removeEventListener('hashchange',sync);
  },[mode,dreamUnsaved]);
  const chooseMode=(next:Mode)=>{
    if(next!==mode && !mayLeaveDream())return;
    if(next!==mode){setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);}
    setMode(next);setScreen('chat');setToolsOpen(false);setSuggestedTool(null);
    window.location.hash='#/preview/living-workspace/'+next;
  };
  const [liveWork,setLiveWork] = useState(false);
  const [liveStarted,setLiveStarted] = useState(false);
  // One authoritative conversation is shared by the chat and the Living Result.
  // Never create a second conversation for My Work, and never derive terms from chat text.
  const [liveController] = useState(() => gateway ? createAgentController(gateway, undefined, { timeZone: deviceTimeZone }) : null);
  const [formationController] = useState(() => gateway ? createFormationController(gateway) : null);
  const liveState = useSyncExternalStore<AgentState | null>(liveController?.subscribe ?? subscribeNever, liveController?.getSnapshot ?? noLiveState);
  const formationState = useSyncExternalStore<FormationState | null>(formationController?.subscribe ?? subscribeNever, formationController?.getSnapshot ?? noFormationState);
  const liveConversationId = liveState?.conversationId ?? null;
  const liveContextVersion = liveState?.context.data?.version;
  const lastLiveTurnId = liveState?.turns.length ? liveState.turns[liveState.turns.length - 1].id : null;
  const liveBusy = liveState?.busy ?? false;
  const livePending = !!liveState?.pending;
  useEffect(() => {
    if (!liveStarted || !formationController || !liveConversationId || liveBusy || livePending) return;
    // Same reconciliation triggers as the existing AgentExperience:
    // real context changes and finished turns can both change the emerging Agreement.
    void formationController.load(liveConversationId);
  }, [liveStarted, formationController, liveConversationId, liveContextVersion, lastLiveTurnId, liveBusy, livePending]);

  const [examination, setExamination] = useState<{ status:'idle'|'loading'|'ready'|'unavailable'; data:FairTradeExaminationDto|null }>({status:'idle',data:null});
  const liveFormationVersion = formationState?.data?.conversationId === liveConversationId ? formationState.data.version : null;
  useEffect(() => {
    if (!liveStarted || !gateway || !liveConversationId || liveFormationVersion === null || liveBusy || livePending) {
      setExamination({status:'idle',data:null});
      return;
    }
    let cancelled = false;
    setExamination({status:'loading',data:null});
    let zone: string | undefined;
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined; } catch { /* optional */ }
    void gateway.readFairTradeExamination(liveConversationId,zone).then(reading => {
      if (cancelled) return;
      // No display unless this is exactly the conversation and Trade Context version being viewed.
      if (reading.conversationId !== liveConversationId || reading.tradeContextVersion !== liveFormationVersion
          || reading.status !== 'PARTIAL_ADVISORY') {
        setExamination({status:'unavailable',data:null});
      } else {
        setExamination({status:'ready',data:reading});
      }
    }).catch(() => { if (!cancelled) setExamination({status:'unavailable',data:null}); });
    return () => { cancelled = true; };
  }, [gateway, liveStarted, liveConversationId, liveFormationVersion, liveBusy, livePending]);

  const [screen, setScreen] = useState<Screen>('chat');
  const [toolsOpen, setToolsOpen] = useState(false);
  const previousScreen = useRef<Screen>('chat');
  const [activeTool, setActiveTool] = useState('Photos');
  const [toolSelected, setToolSelected] = useState(false);
  const [drafts, setDrafts] = useState<Record<Mode, string>>({ work:'', vision:'', circle:'', community:'' });
  const [messages, setMessages] = useState<Record<Mode, string[]>>({ work:[], vision:[], circle:[], community:[] });
  const current = scenarios[mode];
  const persona = KS001_WORKSPACE_PERSONAS[mode];
  const [suggestedTool, setSuggestedTool] = useState<string | null>(null);
  const tool = tools.find(t => t.name === activeTool) ?? tools[0];
  function openTool(name: string) {
    if (!toolsOpen) previousScreen.current = screen==='tools'?'chat':screen;
    setActiveTool(name); setToolSelected(true); setToolsOpen(true);
  }
  function closeTool() { setToolsOpen(false); setToolSelected(false); setScreen(previousScreen.current); }
  useEffect(()=>{
    if(!toolsOpen)return;
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setToolsOpen(false);setToolSelected(false);setScreen(previousScreen.current);}
    };
    window.addEventListener('keydown',onEscape);
    return ()=>window.removeEventListener('keydown',onEscape);
  },[toolsOpen]);
  function send() {
    const value = drafts[mode].trim();
    if (!value) return;
    setMessages(previous => ({ ...previous, [mode]: [...previous[mode], value] }));
    setDrafts(previous => ({ ...previous, [mode]: '' }));
    setSuggestedTool(recommendWorkspaceTool(mode, value));
  }
  const continueSavedConversation = async(conversationId:string)=>{
    if(!liveController)throw new Error('KS001 conversation service is not available');
    if(liveController.getSnapshot().busy || liveController.getSnapshot().pending) {
      throw new Error('Finish the current KS001 turn before switching conversations');
    }
    chooseMode('work');setLiveStarted(true);setLiveWork(true);
    await liveController.resumeConversation(conversationId);
  };
  if(signInOpen && workspaceGateways){
    return <SignInExperience
      auth={workspaceGateways.auth} session={session}
      onSignedIn={()=>setSignInOpen(false)} onCancel={()=>setSignInOpen(false)}
      onRecover={()=>{setSignInOpen(false);window.location.hash='#/recovery';}}
      onGetKsNumber={()=>{setSignInOpen(false);window.location.hash='#/sign-up';}}
    />;
  }
  return <main className="min-h-screen bg-cream-50 text-forest-800">
    <header className="border-b border-cream-200 bg-white/90 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div><strong className="text-xl tracking-tight">SecurePay</strong><p className="text-xs text-sand-600">Living Workspace · structural continuity preview</p></div>
        <nav aria-label="Workspace experience" className="flex max-w-full rounded-xl bg-cream-100 p-1">
          {([['work','My Work'],['vision','Vision'],['circle','Circle'],['community','Community']] as const).map(([id,label]) =>
            <button key={id} aria-current={mode===id?'page':undefined} onClick={()=>chooseMode(id)} className={`min-h-11 rounded-lg px-3 text-xs sm:px-5 sm:text-sm ${mode===id?'bg-white font-semibold shadow-sm':'text-sand-600'}`}>{label}</button>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {mockSignedIn ? <>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">DEMO ACCOUNT · NO REAL ACCESS</span>
            <button type="button" onClick={exitDemo} className="min-h-11 rounded-xl border border-cream-200 px-3 text-sm">Exit demo</button>
          </> : !signedIn ? <>
            <button type="button" onClick={enterDemo} className="min-h-11 rounded-xl bg-forest-800 px-3 text-sm text-white">Try mock sign-in</button>
            {workspaceGateways && <button type="button" onClick={()=>setSignInOpen(true)} className="min-h-11 rounded-xl border border-cream-200 px-3 text-sm">Real KS sign-in</button>}
          </> : <span className="rounded-full bg-cream-100 px-3 py-2 text-xs">Signed in with SecurePay</span>}
          <a className="inline-flex min-h-11 items-center gap-2 text-sm underline" href="#/" onClick={event=>{if(!mayLeaveDream())event.preventDefault();}}><ArrowLeft size={15}/> Exit preview</a>
        </div>
      </div>
    </header>
    {signedIn && !mockSignedIn && workspaceGateways && mode==='vision' && editingDreamId
      ? <div className="mx-auto w-full max-w-[1550px] px-3 py-5 sm:px-5">
          <InlineVisionEditor key={editingDreamId} id={editingDreamId} gateways={workspaceGateways}
            session={session} onBack={backToWorkspace} onUnsavedChange={noteUnsaved}/>
        </div>
      : signedIn && !mockSignedIn && workspaceGateways && mode==='circle' && workingCircleId
      ? <div className="mx-auto w-full max-w-[1550px] px-3 py-5 sm:px-5">
          <InlineCircleBoard key={workingCircleId} id={workingCircleId}
            gateways={workspaceGateways} session={session} onBack={backToWorkspace}/>
        </div>
      : <div className="mx-auto flex max-w-[1550px] gap-3 px-3 py-3 sm:px-5 sm:py-5">
      {toolsOpen && <>
        <button type="button" aria-label="Close photo workspace overlay" onClick={closeTool} className="fixed inset-0 z-40 cursor-default bg-forest-950/10" />
        <aside role="dialog" aria-modal="true" aria-label={toolSelected?activeTool+' tool':'Choose a tool'} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] min-w-0 flex-col overflow-hidden rounded-t-3xl border border-cream-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(94vw,560px)] sm:max-h-[min(82dvh,740px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl ring-1 ring-forest-900/10">
        <div className="flex items-center justify-between gap-2 border-b border-cream-100 p-4">
          {toolSelected
            ? <button type="button" onClick={()=>setToolSelected(false)} aria-label="Back to tools" className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-cream-100"><ArrowLeft size={18}/> Back to tools</button>
            : <strong>Tools</strong>}
          <button aria-label="Close tools" onClick={closeTool} className="rounded-lg p-2 hover:bg-cream-100"><X size={19}/></button>
        </div>
        {toolSelected
          ? <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5" aria-label={activeTool+' workspace'}>
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><tool.icon size={22}/>{tool.name}</div>
              {(['Photos','Documents','Places'] as const).some(name=>name===activeTool)
                ? <UniversalSourceTray tool={activeTool} area={mode} isDemo={mockSignedIn} gateway={gateway} conversationId={liveConversationId} onEnsureConversation={async()=>{
                  if(!gateway || !liveController)throw new Error('KS001 is unavailable');
                  const existing=liveController.getSnapshot().conversationId;
                  if(existing)return existing;
                  const created=await gateway.createConversation();
                  if(!created.conversationId)throw new Error('Could not create KS001 conversation');
                  await liveController.resumeConversation(created.conversationId);
                  setLiveStarted(true);setLiveWork(true);
                  return created.conversationId;
                }} onContinueTask={async(source,task)=>{
                  if(!liveController || !liveConversationId || source.conversationId!==liveConversationId)throw new Error('Open the matching KS001 conversation first');
                  const instructions:Record<string,string>={
                    contract:'Help me draft a Quick Contract using this photo. Extract only supported terms, clearly identify what must be confirmed, and show the Agreement review before any invitation or Money action.',
                    receipt:'Help me process this receipt. Extract the merchant, date, amounts and items where visible. Mark uncertain facts and do not claim payment was verified.',
                    invoice:'Help me review this invoice. Extract parties, items, totals, due date and payment terms where available. Do not treat it as an approved obligation.',
                    delivery:'Help me document delivery from this photo. Identify visible evidence and any missing delivery facts; do not mark delivery complete without proper review.',
                    location:'Help me assess any location clues available from this photo. Do not infer precise coordinates without reliable provenance or my consent.',
                    find:'Help me describe the items in this photo and determine useful Store or supplier search criteria. Do not invent available suppliers.',
                    vision:'Help me use this photo as inspiration for my Vision, without claiming it is saved to a Vision Board yet.',
                    qr:'Help me interpret the QR code I reviewed. Do not open links, accept an Agreement or initiate payment automatically.',
                    ask:'Please help me understand this photo and suggest the one most useful next step.',
                    correct:'That interpretation is not right. Please help me correct what the photo shows before doing anything else.',
                  };
                  closeTool();
                  setLiveStarted(true);
                  await liveController.send('For photo source '+source.sourceArtifactId+': '+(instructions[task]??'Help me understand this source.'));
                }}/>
                : activeTool==='Quick Support'?<QuickSupportPanel/>
                : <div className="rounded-xl bg-cream-100 p-4 text-sm"><p className="text-sand-700">{tool.description}</p><p className="mt-3 text-xs text-sand-600">Preview only: no external action or private data sharing is performed here.</p></div>}
            </div>
          : <nav aria-label="Choose a tool" className="max-h-[65dvh] overflow-auto p-3">
              {tools.map(t=><button key={t.name} onClick={()=>{setActiveTool(t.name);setToolSelected(true);}} className="flex min-h-11 w-full items-center gap-2 rounded-xl p-3 text-left text-sm hover:bg-cream-100"><t.icon size={18}/>{t.name}</button>)}
            </nav>}
        </aside>
      </>}
      {mode==='work' && gateway && <div className="sr-only" aria-live="polite">{liveWork?'Live KS001 Work mode active':'Preview Work mode active'}</div>}
      <section aria-label="KS001 conversation" className={`${screen==='chat'||toolsOpen?'flex':'hidden'} min-h-[72vh] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white md:flex`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 p-4"><div><p className="text-xs text-sand-600">{current.label} · {persona.label}</p><strong className="text-lg">KS001</strong></div><div className="flex flex-wrap gap-2">{mode==='work' && gateway && !mockSignedIn && <button type="button" onClick={()=>{setLiveStarted(true);setLiveWork(value=>!value);}} className="min-h-11 rounded-xl border border-cream-200 px-3 text-xs">{liveWork?'Return to demonstration':'Try real KS001 (Work only)'}</button>}<button onClick={()=>openTool(activeTool)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cream-100 px-4 text-sm"><Plus size={18}/> Add / Tools</button></div></div>
        {liveStarted && gateway && <div className={mode==='work' && liveWork?'flex min-h-0 flex-1 flex-col':'hidden'}><LiveKs001Session controller={liveController!}/></div>}
        {!(mode==='work' && liveWork && gateway) && <><div className="flex-1 space-y-4 p-5"><p className="max-w-[560px] text-sm leading-7">{mockSignedIn ? 'This is a sample conversation, not a real KS001 response. '+persona.opening : persona.opening}</p>{messages[mode].map((m,i)=><p key={i} className="ml-auto max-w-[80%] rounded-2xl bg-cream-100 p-4 text-sm">{m}</p>)}{suggestedTool && <div className="max-w-[560px] rounded-xl border border-cream-200 bg-cream-50 p-4"><p className="text-xs font-semibold text-forest-800">Suggested tool · {suggestedTool}</p><p className="mt-2 text-xs text-sand-700">{persona.questionPolicy}</p><button onClick={()=>openTool(suggestedTool)} className="mt-3 min-h-11 rounded-lg bg-white px-4 text-sm text-forest-800 shadow-sm">Open {suggestedTool}</button></div>}{messages[mode].length>0&&<p role="status" className="text-sm text-sand-600">Preview message only. Persona-specific live model replies are not yet connected.</p>}</div>
        <form className="flex gap-2 border-t border-cream-100 p-3" onSubmit={e=>{e.preventDefault();send();}}><input aria-label="Message KS001" className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-sm" value={drafts[mode]} onChange={e=>setDrafts(previous=>({...previous,[mode]:e.target.value}))} placeholder="Talk to KS001…"/><button aria-label="Send" className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white">Send</button></form>
</>}
      </section>
      <aside aria-label="Living result" className={`${screen==='result'?'flex':'hidden'} w-full min-w-0 flex-col rounded-2xl border border-cream-200 bg-white md:flex md:w-[35%] lg:max-w-[460px]`}>
        <div className="p-5">
        {mockSignedIn
          ? <MockWorkspacePanel key={mode} area={mode}/>
          : signedIn && workspaceGateways && mode==='community'
          ? <InlineCommunityHub gateways={workspaceGateways} session={session}
              onOpenFull={()=>{ window.location.hash='#/community'; }}/>
          : signedIn && workspaceGateways && mode!=='work'
          ? <WorkspaceContinuityPanel area={mode as WorkspaceArea} gateways={workspaceGateways}
              session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}
              onEditDream={setEditingDreamId} onOpenCircleBoard={setWorkingCircleId}/>
          : mode==='work' && liveWork?<LiveWorkResultPanel
          state={formationState} conversationId={liveConversationId} busy={liveBusy || livePending}
          examination={examination}
          onRefresh={() => { if (formationController && liveConversationId && !liveBusy && !livePending) void formationController.load(liveConversationId); }}
        />:mode==='work'?(signedIn?<div className="rounded-xl bg-cream-100 p-4"><p className="font-semibold text-sm">Your Agreement appears here</p><p className="mt-2 text-xs text-sand-700">Continue a saved conversation below, or select Try real KS001 on the left. SecurePay will show only the Agreement from that conversation.</p></div>:<LivingAgreementPanel/>):mode==='vision'?<LivingVisionPanel/>:mode==='circle'?<LivingCirclePanel/>:mode==='community'?<LivingCommunityPanel/>:<><p className="text-xs uppercase tracking-wider text-sand-600">Living result · {persona.label}</p><div className="mt-3 flex items-center justify-between gap-2"><h2 className="font-display text-xl">{current.title}</h2><span className="rounded-full bg-cream-100 px-2 py-1 text-xs">{current.status}</span></div><div className="mt-5 space-y-3">{current.facts.map(f=><p key={f} className="border-b border-cream-100 pb-3 text-sm">{f}</p>)}</div></>}
        {!mockSignedIn && mode==='work' && <div className="mt-4">
          <WorkspaceContinuityPanel area="work" gateways={workspaceGateways}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
        {!mockSignedIn && !signedIn && mode!=='work' && <div className="mt-4">
          <WorkspaceContinuityPanel area={mode as WorkspaceArea} gateways={workspaceGateways}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
        {!mockSignedIn && !signedIn && <>
          <div className="mt-8 rounded-xl bg-cream-100 p-4"><div className="flex items-center gap-2 font-semibold"><HeartHandshake size={17}/> SecurePay Helps · Examples only</div>{current.help.map(h=><p key={h} className="mt-3 text-sm text-sand-700">{h}</p>)}</div>
          <div className="mt-4 rounded-xl border border-cream-200 p-4"><strong className="text-sm">Community Saver · Example</strong><p className="mt-2 text-xs text-sand-600">A real Community Saver requires a Plug, verification and informed consent. These suggestions do not change Agreements.</p></div>
        </>}</div>
      </aside>
    </div>}
    {!editingDreamId && !workingCircleId && <nav aria-label="Mobile workspace panels" className="sticky bottom-0 flex justify-around gap-2 border-t border-cream-200 bg-white p-2 md:hidden">{([['chat','Chat',MessageCircle],['result','Your Work',Lightbulb],['tools','Tools',Wrench]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>id==='tools'?openTool(activeTool):setScreen(id)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs ${screen===id?'bg-forest-800 text-white':'bg-cream-100'}`}><Icon size={16}/>{label}</button>)}</nav>}
    <p className="px-5 pb-4 text-center text-xs text-sand-600">{mockSignedIn?'DEMO ACCOUNT: no authentication, real records, payments, invitations or membership. ':'Visual shell: the preview does not authorise financial or Agreement actions. '}No money, invitation, approval or booking authority is granted by this page.</p>
  </main>;
}
