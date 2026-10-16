import { InlineCommunityHub } from './InlineCommunityHub';
import { UniversalSourceTray } from './UniversalSourceTray';
import { DateTimeTool } from './DateTimeTool';
import { InlineVisionEditor } from './InlineVisionEditor';
import { InlineCircleBoard } from './InlineCircleBoard';
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
import { storeAgreementEntry, storeWorkspaceMoneyReturn, consumeWorkspaceMoneyReturn, consumeLivingWorkspaceEntry, storeKs001ConversationReturn, authorisedResumedConversation } from '../experience/entryIntent';
import { KS001_WORKSPACE_PERSONAS } from './personas';
import { useCallback, useEffect, useState, useSyncExternalStore, useRef } from 'react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { ArrowLeft, CalendarDays, Camera, FileText, Lightbulb, MapPin, MessageCircle, Plus, Store, UserRoundPlus, Wallet, X, BedDouble } from 'lucide-react';

type Mode = 'work' | 'vision' | 'circle' | 'community';
type Screen = 'chat' | 'result' | 'tools';
// The launch tray contains functioning entries only. Vision/Circle/Community are
// workspace areas, while milestones live within Agreements.
const tools = [
  { name: 'Photos', icon: Camera, description: 'Show a photo', group: 'add' },
  { name: 'Documents', icon: FileText, description: 'Add a document', group: 'add' },
  { name: 'Places', icon: MapPin, description: 'Use a place', group: 'add' },
  { name: 'Date & Time', icon: CalendarDays, description: 'Set a day, range, repeat or condition', group: 'add' },
  { name: 'Quick Assist', icon: BedDouble, description: 'Short Stays & My Ride', group: 'do' },
  { name: 'Stores', icon: Store, description: 'Find goods & services', group: 'do' },
  { name: 'People & Invitations', icon: UserRoundPlus, description: 'Bring people in', group: 'do' },
  { name: 'Money', icon: Wallet, description: 'Review Agreement money', group: 'do' },
] as const;
const areaLabels: Record<Mode,string> = {
  work: 'My Work · Agreement',
  vision: 'Vision',
  circle: 'Circle',
  community: 'Community',
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
  // Retired mock sign-in is deliberately inaccessible in this production candidate.
  // The historical screenshot preview remains preserved at its original commit.
  const mockSignedIn = false;
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
    setMode(next);setScreen('chat');setToolsOpen(false);
    window.location.hash='#/preview/living-workspace/'+next;
  };
  // Start in the real KS001 Work conversation when a verified gateway is available.
  // No mock conversation is presented as a successful human turn.
  const [liveWork,setLiveWork] = useState(Boolean(gateway));
  const [liveStarted,setLiveStarted] = useState(Boolean(gateway));
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
      if(!authorisedResumedConversation(conversationId,current))
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
  const persona = KS001_WORKSPACE_PERSONAS[mode];
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
  return <main className="sp-type-signature sp-brand-shell min-h-screen bg-gradient-to-br from-[#fbfaf5] via-[#f7f7f1] to-[#eef2eb] text-forest-800" data-sp-area={mode} data-typography-study="Afacad-Flux-and-Bricolage" data-workspace-frozen-layout>
    <header className="sp-brand-header border-b border-cream-200/80 bg-white/95 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><img src={securepayWordmark} alt="SecurePay" className="h-9 w-auto max-w-[164px] object-contain" /><p className="text-xs text-sand-600">KS001 · Your space to make progress</p></div>
        <nav aria-label="Workspace experience" className="sp-brand-nav flex max-w-full rounded-xl bg-cream-100 p-1">
          {([['work','My Work'],['vision','Vision'],['circle','Circle'],['community','Community']] as const).map(([id,label]) =>
            <button key={id} aria-current={mode===id?'page':undefined} onClick={()=>chooseMode(id)} className={`min-h-11 rounded-lg px-3 text-xs sm:px-5 sm:text-sm ${mode===id?'bg-white font-semibold shadow-sm':'text-sand-600'}`}>{label}</button>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {!signedIn && workspaceGateways
            ? <button type="button" onClick={()=>setSignInOpen(true)}
                className="min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-sm font-medium text-forest-800 hover:bg-cream-50">Sign in</button>
            : signedIn ? <span className="rounded-full bg-[#eaf2e9] px-3 py-2 text-xs font-medium text-forest-800">Your SecurePay workspace</span> : null}
          <a className="inline-flex min-h-11 items-center gap-2 text-sm underline" href="#/" onClick={event=>{if(!returnToKs001())event.preventDefault();}}><ArrowLeft size={15}/> SecurePay</a>
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
              {activeTool==='Date & Time'
                ? <DateTimeTool context={supportingFact?.conversationId===liveConversationId ? supportingFact.label : ''}
                    onClose={closeTool}
                    onPrepare={mode==='work' && gateway && !mockSignedIn && liveWork ? async message=>{
                      if(!liveController)throw new Error('KS001 is not ready');
                      const snapshot=liveController.getSnapshot();
                      if(snapshot.busy || snapshot.pending)throw new Error('Finish the previous KS001 turn before adding dates.');
                      if(supportingFact?.conversationId && supportingFact.conversationId!==snapshot.conversationId)
                        throw new Error('Return to the original Agreement before supplying its dates.');
                      setLiveStarted(true);
                      await liveController.send(message);
                      const outcome=liveController.getSnapshot();
                      if(outcome.error || outcome.pending || outcome.busy)
                        throw new Error('SecurePay has not confirmed the message. Review your KS001 conversation before trying again.');
                    } : undefined}/>
                : (['Photos','Documents','Places'] as const).some(name=>name===activeTool)
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
                <p className="text-xs leading-5 text-sand-600">Add a photo, document, place, date or KS Number for KS001 to review. Nothing changes the Agreement automatically.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['Photos','Documents','Places','Date & Time',...(supportingFact.label==='People'?['People & Invitations']:[])] as Array<(typeof tools)[number]['name']>)
                    .map(name=>{
                      const item=tools.find(tool=>tool.name===name)!;
                      const label=name==='People & Invitations'?'KS Number':name==='Photos'?'Photo':name==='Documents'?'Document':name==='Date & Time'?'Date & Time':'Place';
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
      {returnError&&<p role="alert" className="mx-4 mt-2 rounded-xl bg-amber-50 p-3 text-sm">{returnError}</p>}
      <section aria-label="KS001 conversation" className={`${screen==='chat'||toolsOpen?'flex':'hidden'} sp-brand-conversation min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden md:min-h-0 rounded-2xl border border-cream-200 bg-white md:flex`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 p-4"><div><p className="text-xs text-sand-600">{areaLabels[mode]} · {persona.label}</p><strong className="sp-type-display text-xl">KS001</strong></div><div className="flex flex-wrap gap-2"><button type="button" onClick={openToolPicker} aria-label="Add or use a tool" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cream-100 px-4 text-sm font-semibold"><Plus size={18}/> Add</button></div></div>
        {liveStarted && gateway && <div className={mode==='work' && liveWork?'flex min-h-0 flex-1 flex-col':'hidden'}><LiveKs001Session controller={liveController!} opening={persona.opening} nextQuestion={formationState?.data?.conversationId===liveConversationId?formationState.data.question?.text:null}/></div>}
        {!(mode==='work' && liveWork && gateway) && <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <p className="sp-type-statement max-w-[560px] text-base leading-7">{persona.opening}</p>
          <div className="max-w-xl rounded-2xl border border-forest-100 bg-[#f8faf6] p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-forest-700">{persona.label} · Guidance</p>
            <p className="mt-2 text-sm leading-6 text-forest-900">{persona.objective}</p>
            <p className="mt-2 text-xs leading-5 text-sand-700">{persona.dataBoundary}</p>
          </div>
          {mode==='work' && !gateway
            ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">KS001 is temporarily unavailable here. Your words will not be sent or mistaken for an Agreement. Please return when the connection is ready.</p>
            : <div className="rounded-2xl border border-forest-100 bg-white p-4">
                <p className="text-sm font-semibold text-forest-900">Explore here. Work with KS001 when you need to.</p>
                <p className="mt-2 text-xs leading-5 text-sand-700">This area shows guidance and your authorised records. Personalised KS001 replies for {mode==='vision'?'Vision':mode==='circle'?'Circles':'Community'} require a permission-checked connection; we won't invent them.</p>
                {gateway && <button type="button" onClick={()=>chooseMode('work')}
                  className="mt-3 min-h-11 rounded-xl border border-forest-200 bg-[#ecf3ea] px-4 text-sm font-semibold text-forest-800">Talk to KS001 in My Work</button>}
              </div>}
        </div>}
      </section>
      <aside aria-label="Living result" className={`${screen==='result'?'flex':'hidden'} sp-brand-result w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white md:flex md:w-[35%] lg:max-w-[460px]`}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
        {signedIn && workspaceGateways && mode==='community'
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
        />:mode==='work'
          ? <div className="rounded-xl border border-forest-100 bg-cream-50 p-4 text-sm">
              Your Agreement will appear here when KS001 has confirmed the conversation.
            </div>
          : <div className="space-y-3 rounded-xl border border-forest-100 bg-[#f9faf7] p-4">
              <h2 className="font-display text-xl text-forest-900">{persona.label}</h2>
              <p className="text-sm leading-6 text-sand-700">{persona.objective}</p>
              <p className="text-xs leading-5 text-sand-600">{persona.dataBoundary}</p>
            </div>}
        {mode==='work' && !liveConversationId && <div className="mt-4">
          <WorkspaceContinuityPanel area="work" gateways={workspaceGateways}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
        {!signedIn && mode!=='work' && <div className="mt-4">
          <WorkspaceContinuityPanel area={mode as WorkspaceArea} gateways={workspaceGateways}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
</div>
      </aside>
    </div>}
    {!editingDreamId && !workingCircleId && <nav aria-label="Mobile workspace panels" className="sticky bottom-0 flex justify-around gap-2 border-t border-cream-200 bg-white p-2 md:hidden">{([['chat','Chat',MessageCircle],['result','Your Work',Lightbulb],['tools','Tools',Plus]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>id==='tools'?openToolPicker():setScreen(id)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs ${screen===id?'bg-forest-800 text-white':'bg-cream-100'}`}><Icon size={16}/>{label}</button>)}</nav>}
    <p className="px-5 pb-4 text-center text-xs text-sand-600">KS001 helps you explore. Agreements require review and acceptance; bookings, invitations and money require their own authorisation.</p>
  </main>;
}
