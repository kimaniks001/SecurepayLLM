import { InlineCommunityHub } from './InlineCommunityHub';
import { UniversalSourceTray } from './UniversalSourceTray';
import { InlineVisionEditor } from './InlineVisionEditor';
import { InlineCircleBoard } from './InlineCircleBoard';
import { MockWorkspacePanel } from './MockWorkspacePanel';
import { SignInExperience } from '../public/SignInExperience';
import { WorkspaceContinuityPanel, type WorkspaceArea } from './WorkspaceContinuityPanel';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { FairTradeExaminationDto } from '../../api/securepay/agent/dto';
import { LiveWorkResultPanel } from './LiveWorkResultPanel';
import { createAgentController, deviceTimeZone, type AgentState } from '../agent/controller';
import { createFormationController, type FormationState } from '../formation/controller';
import { LiveKs001Session } from './LiveKs001Session';
import type { AgentGateway } from '../../api/securepay/agent';
import { QuickSupportPanel, type QuickAssistId } from './QuickSupportPanel';
import { PeopleInvitationsTool } from './PeopleInvitationsTool';
import { StoresTool } from './StoresTool';
import { UnifiedMoneyTool } from './UnifiedMoneyTool';
import { openMoneyFor, setMoneyRailPreference } from '../money/handoff';
import { storeAgreementEntry, storeWorkspaceMoneyReturn, consumeWorkspaceMoneyReturn, consumeLivingWorkspaceEntry, storeKs001ConversationReturn } from '../experience/entryIntent';
import { LivingCommunityPanel } from './LivingCommunityPanel';
import { LivingCirclePanel } from './LivingCirclePanel';
import { LivingVisionPanel } from './LivingVisionPanel';
import { LivingAgreementPanel } from './LivingAgreementPanel';
import { KS001_WORKSPACE_PERSONAS, recommendWorkspaceTool } from './personas';
import { useCallback, useEffect, useState, useSyncExternalStore, useRef } from 'react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { ArrowLeft, Camera, FileText, HeartHandshake, Lightbulb, MapPin, MessageCircle, Plus, Store, UserRoundPlus, Wallet, X, BedDouble } from 'lucide-react';

type Mode = 'work' | 'vision' | 'circle' | 'community';
type Screen = 'chat' | 'result' | 'tools';
// The launch tray contains functioning entries only. Vision/Circle/Community are
// workspace areas, while milestones live within Agreements.
const tools = [
  { name: 'Photos', icon: Camera, description: 'Show a photo', group: 'add' },
  { name: 'Documents', icon: FileText, description: 'Add a document', group: 'add' },
  { name: 'Places', icon: MapPin, description: 'Use a place', group: 'add' },
  { name: 'Quick Assist', icon: BedDouble, description: 'Short Stays & My Ride', group: 'do' },
  { name: 'Stores', icon: Store, description: 'Find goods & services', group: 'do' },
  { name: 'People & Invitations', icon: UserRoundPlus, description: 'Bring people in', group: 'do' },
  { name: 'Money', icon: Wallet, description: 'Review Agreement money', group: 'do' },
] as const;
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
  const [returnError,setReturnError] = useState<string|null>(null);
  useEffect(()=>{
    const moneyHint=consumeWorkspaceMoneyReturn();
    const fromKs001=consumeLivingWorkspaceEntry();
    if(!moneyHint && !fromKs001)return;
    const conversationId=moneyHint ? moneyHint.conversationId : fromKs001;
    if(!conversationId)return;
    if(!signedIn || !liveController){
      setReturnError('Sign in and open your conversation from Saved Work. No Agreement was changed.');
      return;
    }
    let active=true;
    setLiveStarted(true);setLiveWork(true);
    void liveController.resumeConversation(conversationId).then(()=>{
      // resumeConversation deliberately catches history/read errors for ordinary
      // presentation. A resolved promise is NOT proof that server access passed.
      const current=liveController.getSnapshot();
      if(current.conversationId!==conversationId || current.context.status!=='ready' || !current.context.data)
        throw new Error('Conversation context not authorised or available');
    }).catch(()=>{
      if(active){
        setLiveStarted(false);
        setLiveWork(false);
        setReturnError('SecurePay could not reopen this conversation as your current identity. Open it from Saved Work; no Agreement was changed.');
      }
    });
    return()=>{active=false;};
  },[liveController,signedIn]);
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
  const [activeTool, setActiveTool] = useState<(typeof tools)[number]['name']>('Photos');
  const [toolSelected, setToolSelected] = useState(false);
  const [drafts, setDrafts] = useState<Record<Mode, string>>({ work:'', vision:'', circle:'', community:'' });
  const [messages, setMessages] = useState<Record<Mode, string[]>>({ work:[], vision:[], circle:[], community:[] });
  const current = scenarios[mode];
  const persona = KS001_WORKSPACE_PERSONAS[mode];
  const [suggestedTool, setSuggestedTool] = useState<(typeof tools)[number]['name'] | null>(null);
  const [quickAssistCollection, setQuickAssistCollection] = useState<QuickAssistId[]>(['stays', 'ride']);
  const [quickAssistSeed, setQuickAssistSeed] = useState('');
  const [storeServiceQuery, setStoreServiceQuery] = useState('');
  const [storeQuickAssistNeed, setStoreQuickAssistNeed] = useState('');
  // A source added while editing a fact must retain the originating conversation.
  // This hint changes only the explicit KS001 request, never Agreement authority.
  const [supportingFact, setSupportingFact] = useState<{label:string;conversationId:string}|null>(null);
  const tool = tools.find(t => t.name === activeTool) ?? tools[0];
  function openTool(name: (typeof tools)[number]['name'], request = '') {
    if (name === 'Quick Assist') setQuickAssistSeed(request);
    if (name === 'Stores') { setStoreServiceQuery('');setStoreQuickAssistNeed(''); }
    if (!toolsOpen) previousScreen.current = screen==='tools'?'chat':screen;
    setActiveTool(name); setToolSelected(true); setToolsOpen(true);
  }
  function openToolPicker() {
    setSupportingFact(null);
    if (!toolsOpen) previousScreen.current = screen==='tools'?'chat':screen;
    setToolSelected(false);
    setToolsOpen(true);
  }
  function openFactSourcePicker(label: string) {
    if (!liveConversationId || !label.trim()) return;
    setSupportingFact({label,conversationId:liveConversationId});
    if (!toolsOpen) previousScreen.current = screen==='tools'?'chat':screen;
    setToolSelected(false);
    setToolsOpen(true);
  }
  function closeTool() { setSupportingFact(null);setToolsOpen(false); setToolSelected(false); setScreen(previousScreen.current); }
  useEffect(()=>{
    if(!toolsOpen)return;
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setSupportingFact(null);setToolsOpen(false);setToolSelected(false);setScreen(previousScreen.current);}
    };
    window.addEventListener('keydown',onEscape);
    return ()=>window.removeEventListener('keydown',onEscape);
  },[toolsOpen]);
  function send() {
    const value = drafts[mode].trim();
    if (!value) return;
    setMessages(previous => ({ ...previous, [mode]: [...previous[mode], value] }));
    setDrafts(previous => ({ ...previous, [mode]: '' }));
    const suggestion = recommendWorkspaceTool(mode, value);
    // Avoid suggesting unfinished or duplicate tool entry points.
    setSuggestedTool(tools.find(item=>item.name===suggestion)?.name??null);
    if (suggestion === 'Quick Assist') setQuickAssistSeed(value);
  }
  const returnToKs001=()=>{
    if(!mayLeaveDream())return false;
    // Only a signed-in, settled, server-owned conversation may be resumed.
    // The canonical KS001 controller independently re-reads and authorises it.
    const snapshot=liveController?.getSnapshot();
    if(signedIn && liveWork && snapshot?.conversationId && !snapshot.busy && !snapshot.pending)
      storeKs001ConversationReturn(snapshot.conversationId);
    return true;
  };
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
  return <main className="sp-type-signature sp-brand-shell min-h-screen bg-cream-50 text-forest-800" data-sp-area={mode} data-typography-study="Afacad-Flux-and-Bricolage">
    <header className="sp-brand-header border-b border-cream-200 bg-white/90 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><img src={securepayWordmark} alt="SecurePay" className="h-9 w-auto max-w-[164px] object-contain" /><p className="text-xs text-sand-600">Living Workspace · preview</p></div>
        <nav aria-label="Workspace experience" className="sp-brand-nav flex max-w-full rounded-xl bg-cream-100 p-1">
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
          <a className="inline-flex min-h-11 items-center gap-2 text-sm underline" href="#/" onClick={event=>{if(!returnToKs001())event.preventDefault();}}><ArrowLeft size={15}/> Back to SecurePay</a>
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
      : <div className="mx-auto flex max-w-[1550px] min-h-0 gap-3 px-3 py-3 sm:px-5 sm:py-5 md:h-[calc(100dvh-170px)] md:overflow-hidden">
      {toolsOpen && <>
        <button type="button" aria-label="Close tools overlay" onClick={closeTool} className="fixed inset-0 z-40 cursor-default bg-forest-950/10" />
        <aside role="dialog" aria-modal="true" aria-label={toolSelected?activeTool+' tool':'Choose a tool'} className={'fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] min-w-0 flex-col overflow-hidden rounded-t-3xl border border-cream-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(88dvh,900px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl ring-1 ring-forest-900/10 '+(toolSelected&&activeTool==='Stores'?'sm:w-[min(96vw,1060px)]':'sm:w-[min(94vw,560px)]')}>
        <div className="flex items-center justify-between gap-2 border-b border-cream-100 p-4">
          {toolSelected
            ? <button type="button" onClick={()=>setToolSelected(false)} aria-label="Back to tools" className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-cream-100"><ArrowLeft size={18}/> Back to tools</button>
            : <strong className="sp-type-display text-lg">Add or use a tool</strong>}
          <button aria-label="Close tools" onClick={closeTool} className="rounded-lg p-2 hover:bg-cream-100"><X size={19}/></button>
        </div>
        {toolSelected
          ? <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5" aria-label={activeTool+' workspace'}>
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><tool.icon size={22}/>{tool.name}</div>
              {(['Photos','Documents','Places'] as const).some(name=>name===activeTool)
                ? <UniversalSourceTray agreementPlaces={formationState?.data?.conversationId===liveConversationId
                  ? [...formationState.data.what,...formationState.data.when,...formationState.data.conditions]
                      .filter(term=>/location|address|place|site|deliver|entrance|destination/i.test(term.label)&&term.value.trim())
                      .map(term=>term.value).slice(0,6)
                  : []} tool={activeTool} area={mode} isDemo={mockSignedIn} gateway={gateway} conversationId={liveConversationId} dreamsGateway={signedIn&&!mockSignedIn?workspaceGateways?.dreams:undefined} ensureSignedIn={async()=>{
                  if(!workspaceGateways||!signedIn||mockSignedIn)throw new Error('Sign in first');
                  await ensureFreshSession(session,workspaceGateways.auth);
                  if(session.getSnapshot().status!=='signed-in')throw new Error('Sign in again');
                }} onEnsureConversation={async()=>{
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
                    decisions:'Extract decisions, responsibilities and deadlines from this document, identifying what requires confirmation.',
                    review:'Review the document terms, obligations, dates and risks. Distinguish proposed from agreed facts.',
                    summary:'Give a short practical summary of this document and suggest the one most useful next step.',
                  };
                  const supportingLabel=supportingFact?.conversationId===liveConversationId ? supportingFact.label : null;
                  closeTool();
                  setLiveStarted(true);
                  const placeInstructions:Record<string,string>={
                    location:'Use this supplied place as an unverified location clue for my current Agreement. Ask me to confirm its purpose and precise entrance before relying on it.',
                    delivery:'Help me specify the delivery destination and entrance for this place. Do not claim it has been verified.',
                    ask:'Help me understand this place or Plus Code, identify what is missing, and ask one useful question.',
                  };
                  const taskInstruction=source.sourceKind==='PLACE'
                    ? (placeInstructions[task]??placeInstructions.ask)
                    : (instructions[task]??'Help me understand this source.');
                  const factInstruction=supportingLabel
                    ? 'I supplied this source while editing the '+supportingLabel+' detail in my draft Agreement. Please assess it as possible supporting material for that detail. Only propose changes supported by the source, ask for confirmation where necessary, and show an updated draft. Do not silently change accepted terms, verify a party merely from a photo, or treat this upload as Agreement approval. '
                    : '';
                  await liveController.send('For source '+source.sourceArtifactId+': '+factInstruction+taskInstruction);
                }}/>
                : activeTool==='People & Invitations'?<PeopleInvitationsTool
                    onCheckKs={gateway?async ksNumber=>{
                      if(!liveController)throw new Error('KS001 is unavailable');
                      let id=liveController.getSnapshot().conversationId;
                      if(!id){
                        const created=await gateway.createConversation();
                        if(!created.conversationId)throw new Error('No KS001 conversation');
                        await liveController.resumeConversation(created.conversationId);
                        setLiveStarted(true);setLiveWork(true);
                        id=created.conversationId;
                      }
                      return gateway.selectKsIdentity(id,{ksNumber});
                    }:undefined}
                    agreementPeople={formationState?.data?.conversationId===liveConversationId?formationState.data.who.map(p=>p.name):[]}
                    onPrepare={async text=>{
                      if(!liveController)throw new Error('KS001 unavailable');
                      setLiveStarted(true);setLiveWork(true);
                      await liveController.send(text);
                      if(liveController.getSnapshot().error||liveController.getSnapshot().pending)throw new Error('Unconfirmed turn');
                      closeTool();
                    }}/>
                : activeTool==='Stores'?<StoresTool
                    key={storeServiceQuery || 'general-store'} initialServiceQuery={storeServiceQuery || undefined} initialQuickAssistNeed={storeQuickAssistNeed || undefined}
                    gateways={workspaceGateways} signedIn={signedIn&&!mockSignedIn} onOpenPhoto={()=>openTool('Photos')}
                    agreementNeeds={formationState?.data?.conversationId===liveConversationId
                      ? [...formationState.data.what,...formationState.data.conditions].map(term=>term.value).filter(Boolean)
                      : []}
                    onContinue={async message=>{
                      if(!liveController)throw new Error('KS001 is unavailable');
                      setLiveStarted(true);setLiveWork(true);
                      await liveController.send(message);
                      if(liveController.getSnapshot().error||liveController.getSnapshot().pending)throw new Error('Unconfirmed turn');
                      closeTool();
                    }}/>
                : activeTool==='Money'?<UnifiedMoneyTool
                    gateways={workspaceGateways} signedIn={signedIn&&!mockSignedIn}
                    onOpenMoney={()=>{storeWorkspaceMoneyReturn(liveConversationId);closeTool();window.location.hash='#/money';}}
                    onOpenAgreementMoney={(agreement,railCode)=>{
                      if(railCode)setMoneyRailPreference({agreementId:agreement.agreementId,railCode});
                      storeWorkspaceMoneyReturn(liveConversationId);
                      closeTool();
                      openMoneyFor({agreementId:agreement.agreementId,title:agreement.title,
                        versionLabel:null,currentVersionId:agreement.currentAgreementVersionId});
                    }}
                    onReviewAgreement={agreementId=>{
                      storeAgreementEntry(agreementId);
                      closeTool();
                      window.location.hash='';
                    }}
                    onAskKs001={async message=>{
                      if(!liveController)throw new Error('KS001 is unavailable');
                      setLiveStarted(true);setLiveWork(true);
                      await liveController.send(message);
                      if(liveController.getSnapshot().error||liveController.getSnapshot().pending)throw new Error('Unconfirmed turn');
                      closeTool();
                    }}/>
                : activeTool==='Quick Assist'?<QuickSupportPanel
                    collection={quickAssistCollection} onCollectionChange={setQuickAssistCollection} initialRequest={quickAssistSeed}
                    onFindStoreOffers={(service,requestedTask)=>{setStoreServiceQuery(service==='stays'?'accommodation':'transport');setStoreQuickAssistNeed(requestedTask);setActiveTool('Stores');setToolSelected(true);}}
                    onContinue={mode==='work' && gateway && !mockSignedIn ? async message=>{
                      if(!liveController)throw new Error('KS001 is unavailable');
                      const snapshot=liveController.getSnapshot();
                      if(snapshot.busy || snapshot.pending)throw new Error('Finish your current KS001 message first');
                      setLiveStarted(true);setLiveWork(true);
                      await liveController.send(message);
                      if(liveController.getSnapshot().error || liveController.getSnapshot().pending)throw new Error('KS001 has not confirmed the request. Please retry safely in the conversation.');
                      closeTool();
                    }:undefined}/>
                : <p role="alert" className="text-sm text-sand-600">This tool is unavailable. Return to your tools.</p>}
              {supportingFact?.conversationId===liveConversationId&&
                <p role="status" className="mt-3 rounded-lg bg-cream-100 p-3 text-xs leading-5">
                  Supporting <strong>{supportingFact.label}</strong> in this draft. Choose and review a source. It is not automatically accepted into the Agreement.
                </p>}
            </div>
          : <nav aria-label="Choose a tool" className="max-h-[65dvh] space-y-5 overflow-y-auto p-4 sm:p-5">
              {supportingFact?.conversationId===liveConversationId ? <>
                <h4 className="sp-type-display text-base">Add to {supportingFact.label}</h4>
                <p className="text-xs leading-5 text-sand-600">Add a photo, document, place, or a KS Number for KS001 to review. Nothing changes the Agreement automatically.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['Photos','Documents','Places',...(supportingFact.label==='People'?['People & Invitations']:[])] as Array<(typeof tools)[number]['name']>)
                    .map(name=>{
                      const item=tools.find(tool=>tool.name===name)!;
                      const label=name==='People & Invitations'?'KS Number':name==='Photos'?'Photo':name==='Documents'?'Document':'Place';
                      return <button key={name} type="button" onClick={()=>openTool(item.name)}
                        className="flex min-h-16 items-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-left text-sm font-semibold hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
                        <item.icon size={19} aria-hidden="true"/>{label}
                      </button>;
                    })}
                </div>
              </> : <>
                <p className="text-sm text-sand-600">Choose one thing. KS001 stays right here.</p>
              <section aria-label="Add something">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-600">Add something</h4>
                <div className="grid grid-cols-3 gap-2">
                  {tools.filter(t=>t.group==='add').map(t=><button type="button" key={t.name} onClick={()=>openTool(t.name)}
                    className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white px-2 py-3 text-center hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
                    <t.icon size={23} aria-hidden="true"/><span className="text-xs font-semibold">{t.name}</span>
                  </button>)}
                </div>
              </section>
              <section aria-label="Get something done">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-600">Get something done</h4>
                <div className="grid grid-cols-2 gap-2">
                  {tools.filter(t=>t.group==='do').map(t=><button type="button" key={t.name} onClick={()=>openTool(t.name)}
                    className="flex min-h-24 min-w-0 items-start gap-2 rounded-xl border border-cream-200 bg-white p-3 text-left hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
                    <t.icon size={20} className="mt-0.5 shrink-0" aria-hidden="true"/>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{t.name}</span><span className="mt-1 block text-xs text-sand-600">{t.description}</span></span>
                  </button>)}
                </div>
              </section>
              </>}
            </nav>}
        </aside>
      </>}
      {mode==='work' && gateway && <div className="sr-only" aria-live="polite">{liveWork?'Live KS001 Work mode active':'Preview Work mode active'}</div>}
      {returnError&&<p role="alert" className="mx-4 mt-2 rounded-xl bg-amber-50 p-3 text-sm">{returnError}</p>}
      <section aria-label="KS001 conversation" className={`${screen==='chat'||toolsOpen?'flex':'hidden'} sp-brand-conversation min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden md:min-h-0 rounded-2xl border border-cream-200 bg-white md:flex`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 p-4"><div><p className="text-xs text-sand-600">{current.label} · {persona.label}</p><strong className="sp-type-display text-xl">KS001</strong></div><div className="flex flex-wrap gap-2">{mode==='work' && gateway && !mockSignedIn && <button type="button" onClick={()=>{setLiveStarted(true);setLiveWork(value=>!value);}} className="min-h-11 rounded-xl border border-cream-200 px-3 text-xs">{liveWork?'Return to demonstration':'Try real KS001 (Work only)'}</button>}<button type="button" onClick={openToolPicker} aria-label="Add or use a tool" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cream-100 px-4 text-sm font-semibold"><Plus size={18}/> Add</button></div></div>
        {liveStarted && gateway && <div className={mode==='work' && liveWork?'flex min-h-0 flex-1 flex-col':'hidden'}><LiveKs001Session controller={liveController!} nextQuestion={formationState?.data?.conversationId===liveConversationId?formationState.data.question?.text:null}/></div>}
        {!(mode==='work' && liveWork && gateway) && <><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"><p className="sp-type-statement max-w-[560px] text-base leading-7">{mockSignedIn ? 'This is a sample conversation, not a real KS001 response. '+persona.opening : persona.opening}</p>{messages[mode].map((m,i)=><p key={i} className="ml-auto max-w-[80%] rounded-2xl bg-cream-100 p-4 text-sm">{m}</p>)}{suggestedTool && <div className="max-w-[560px] rounded-xl border border-cream-200 bg-cream-50 p-4"><p className="text-xs font-semibold text-forest-800">Suggested tool · {suggestedTool}</p><p className="mt-2 text-xs text-sand-700">{persona.questionPolicy}</p><button onClick={()=>openTool(suggestedTool,suggestedTool==='Quick Assist'?quickAssistSeed:'')} className="mt-3 min-h-11 rounded-lg bg-white px-4 text-sm text-forest-800 shadow-sm">Open {suggestedTool}</button></div>}{messages[mode].length>0&&<p role="status" className="text-sm text-sand-600">Preview message only. Persona-specific live model replies are not yet connected.</p>}</div>
        <form className="flex gap-2 border-t border-cream-100 p-3" onSubmit={e=>{e.preventDefault();send();}}><input aria-label="Message KS001" className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-sm" value={drafts[mode]} onChange={e=>setDrafts(previous=>({...previous,[mode]:e.target.value}))} placeholder="Talk to KS001…"/><button aria-label="Send" className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white">Send</button></form>
</>}
      </section>
      <aside aria-label="Living result" className={`${screen==='result'?'flex':'hidden'} sp-brand-result w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white md:flex md:w-[35%] lg:max-w-[460px]`}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
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
          onAddToFact={openFactSourcePicker}
          onCorrectFact={async (label,previous,replacement)=>{
            if(!liveController||!liveConversationId||liveBusy||livePending)throw new Error('KS001 is not ready');
            // A proposed correction, not a local mutation of backend-owned Agreement facts.
            await liveController.send('Please correct the '+label+' in this draft Agreement. Previously shown: "'+previous+'". My correction is: "'+replacement+'". Check whether this changes other terms and show me the updated draft. Do not treat any accepted Agreement as silently amended.');
            if(liveController.getSnapshot().pending||liveController.getSnapshot().error)throw new Error('Correction outcome not yet confirmed');
            if(formationController)await formationController.load(liveConversationId);
          }}
          onRefresh={() => { if (formationController && liveConversationId && !liveBusy && !livePending) void formationController.load(liveConversationId); }}
        />:mode==='work'?(signedIn?<div className="rounded-xl bg-cream-100 p-4"><p className="font-semibold text-sm">Your Agreement appears here</p><p className="mt-2 text-xs text-sand-700">Continue a saved conversation below, or select Try real KS001 on the left. SecurePay will show only the Agreement from that conversation.</p></div>:<LivingAgreementPanel/>):mode==='vision'?<LivingVisionPanel/>:mode==='circle'?<LivingCirclePanel/>:mode==='community'?<LivingCommunityPanel/>:<><p className="text-xs uppercase tracking-wider text-sand-600">Living result · {persona.label}</p><div className="mt-3 flex items-center justify-between gap-2"><h2 className="font-display text-xl">{current.title}</h2><span className="rounded-full bg-cream-100 px-2 py-1 text-xs">{current.status}</span></div><div className="mt-5 space-y-3">{current.facts.map(f=><p key={f} className="border-b border-cream-100 pb-3 text-sm">{f}</p>)}</div></>}
        {!mockSignedIn && mode==='work' && !liveWork && <div className="mt-4">
          <WorkspaceContinuityPanel area="work" gateways={workspaceGateways}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
        {!mockSignedIn && !signedIn && mode!=='work' && <div className="mt-4">
          <WorkspaceContinuityPanel area={mode as WorkspaceArea} gateways={workspaceGateways}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
        {!mockSignedIn && !signedIn && !liveWork && <>
          <div className="mt-8 rounded-xl bg-cream-100 p-4"><div className="flex items-center gap-2 font-semibold"><HeartHandshake size={17}/> SecurePay Helps · Examples only</div>{current.help.map(h=><p key={h} className="mt-3 text-sm text-sand-700">{h}</p>)}</div>
          <div className="mt-4 rounded-xl border border-cream-200 p-4"><strong className="text-sm">Community Saver · Example</strong><p className="mt-2 text-xs text-sand-600">A real Community Saver requires a Plug, verification and informed consent. These suggestions do not change Agreements.</p></div>
        </>}</div>
      </aside>
    </div>}
    {!editingDreamId && !workingCircleId && <nav aria-label="Mobile workspace panels" className="sticky bottom-0 flex justify-around gap-2 border-t border-cream-200 bg-white p-2 md:hidden">{([['chat','Chat',MessageCircle],['result','Your Work',Lightbulb],['tools','Tools',Plus]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>id==='tools'?openToolPicker():setScreen(id)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs ${screen===id?'bg-forest-800 text-white':'bg-cream-100'}`}><Icon size={16}/>{label}</button>)}</nav>}
    <p className="px-5 pb-4 text-center text-xs text-sand-600">{mockSignedIn?'DEMO ACCOUNT: no authentication, real records, payments, invitations or membership. ':'Visual shell: the preview does not authorise financial or Agreement actions. '}No money, invitation, approval or booking authority is granted by this page.</p>
  </main>;
}
