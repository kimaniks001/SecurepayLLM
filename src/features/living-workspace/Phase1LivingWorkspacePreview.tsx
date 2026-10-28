import { InlineCommunityHub } from './InlineCommunityHub';
import { CommunityCheckPanel } from './CommunityCheckPanel';
import { UniversalSourceTray, type LocalSourceProposal } from './UniversalSourceTray';
import { DateTimeTool } from './DateTimeTool';
import { InlineVisionEditor } from './InlineVisionEditor';
import { useVisionNorthJourney, TrueNorthVisionChat, TrueNorthVisionSummary } from './TrueNorthVision';
import { prepareDreamHandoff, type DreamHandoff } from '../visionboard/dreams/handoff';
import { readDraft, writeDraft } from '../conversation/drafts';
import { InlineCircleBoard } from './InlineCircleBoard';
import { WorkspaceIdentityOverlay } from './WorkspaceIdentityOverlay';
import { WorkspaceContinuityPanel, type WorkspaceArea } from './WorkspaceContinuityPanel';
import { AgreementDiscovery } from './AgreementDiscovery';
import { ActiveAgreementWorkspace } from './ActiveAgreementWorkspace';
import { SelectedWorkspaceRecord } from './SelectedWorkspaceRecord';
import type { AgreementDetailResponse } from '../../api/securepay/agreements/dto';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { FairTradeExaminationDto } from '../../api/securepay/agent/dto';
import { LiveWorkResultPanel } from './LiveWorkResultPanel';
import { createAgentController, deviceTimeZone, type AgentState } from '../agent/controller';
import { createFormationController, type FormationState } from '../formation/controller';
import { AgreementReview } from '../formation/AgreementReview';
import { createHandoffController } from '../handoff/controller';
import { HandoffPanel } from '../handoff/HandoffPanel';
import { createIdentityController } from '../identity/controller';
import { retryPending, submitCorrection } from '../formation/correction';
import { LiveKs001Session } from './LiveKs001Session';
import { PreviewWorkComposer, PreviewWorkBoard, type PreviewWorkNote } from './PreviewWorkNotes';
import { type Phase2ExampleId } from './phase2Examples';
import type { AgentGateway } from '../../api/securepay/agent';
import { QuickSupportPanel, type QuickAssistId } from './QuickSupportPanel';
import { PeopleInvitationsTool } from './PeopleInvitationsTool';
import { StoresTool } from './StoresTool';
import type { LocalStoreBuyingPlan } from './StoreBuyingPlan';
import { UnifiedMoneyTool } from './UnifiedMoneyTool';
import { openMoneyFor, setMoneyRailPreference } from '../money/handoff';
import { storeAgreementEntry, storeCircleEntry, storeCommunityObjectEntry, storeWorkspaceMoneyReturn, consumeWorkspaceMoneyReturn, consumeLivingWorkspaceEntry, storeKs001ConversationReturn, authorisedResumedConversation } from '../experience/entryIntent';
import { KS001_WORKSPACE_PERSONAS } from './personas';
import { WorkspaceWelcome } from './WorkspaceWelcome';
import { WorkspacePurposeGuide } from './WorkspacePurposeGuide';
import { useCallback, useEffect, useState, useSyncExternalStore, useRef } from 'react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { ArrowLeft, CalendarDays, Camera, FileText, Lightbulb, MapPin, MessageCircle, Plus, Store, UserRoundPlus, Wallet, X, BedDouble, PanelLeftClose, PanelLeftOpen, Pin, PinOff } from 'lucide-react';

type Mode = 'work' | 'vision' | 'circle' | 'community';
type Screen = 'chat' | 'result' | 'tools';
// The launch tray contains functioning entries only. Vision/Circle/Community are
// workspace areas, while milestones live within Agreements.
const tools = [
  { name: 'People & Invitations', icon: UserRoundPlus, description: 'Add a proposed person', group: 'add' },
  { name: 'Photos', icon: Camera, description: 'Show a photo', group: 'add' },
  { name: 'Documents', icon: FileText, description: 'Add a document', group: 'add' },
  { name: 'Places', icon: MapPin, description: 'Use a place', group: 'add' },
  { name: 'Date & Time', icon: CalendarDays, description: 'Set a day, range, repeat or condition', group: 'add' },
  { name: 'Quick Assist', icon: BedDouble, description: 'Short Stays & My Ride', group: 'do' },
  { name: 'Stores', icon: Store, description: 'Find goods & services', group: 'do' },
  { name: 'Money', icon: Wallet, description: 'Fund Agreements in My Work; plan possibilities in Vision', group: 'do' },
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

export function Phase1LivingWorkspacePreview({ gateway, workspaceGateways, session, identityStagingReady=false }: {
  gateway?: AgentGateway;
  workspaceGateways?: PreviewWorkspaceGateways;
  session: SessionStore;
  /** Identity write operations must be backed by isolated, configured staging. */
  identityStagingReady?: boolean;
}) {
  const initialMode=():Mode=>{
    if(typeof window==='undefined')return 'work';
    const match=/^#\/?preview\/living-workspace\/(work|vision|circle|community)\/?$/.exec(window.location.hash);
    return (match?.[1] as Mode | undefined)??'work';
  };
  const [mode, setMode] = useState<Mode>(initialMode);
  const [signInOpen,setSignInOpen]=useState(()=>typeof window!=='undefined' && /^#\/?sign-(?:in|up)\/?$/.test(window.location.hash));
  const [identityIntent,setIdentityIntent]=useState<'signin'|'signup'>(()=>typeof window!=='undefined' && /^#\/?sign-up\/?$/.test(window.location.hash)?'signup':'signin');
  const openIdentity=(intent:'signin'|'signup'='signin')=>{setIdentityIntent(intent);setSignInOpen(true);};
  // Pure client-side illustration, intentionally separate from the real SessionStore.
  // Retired mock sign-in is deliberately inaccessible in this production candidate.
  // The historical screenshot preview remains preserved at its original commit.
  const mockSignedIn = false;
  const signedIn=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot).status==='signed-in';
  const visionNorth=useVisionNorthJourney({signedIn,gateway,gateways:workspaceGateways,session});
  // Read-only Vercel preview: local interaction must never call the production-backed relay.
  // Signed-in users retain the existing authoritative controllers and permission gates.
  const uiOnlyPreview=!signedIn && (!gateway || (typeof window!=='undefined' && window.location.hostname.endsWith('.vercel.app')));
  const [previewNotes,setPreviewNotes]=useState<PreviewWorkNote[]>([]);
  const [phase2ExampleId,setPhase2ExampleId]=useState<Phase2ExampleId|null>(null);
  const [sampleBuyingPlan,setSampleBuyingPlan]=useState<LocalStoreBuyingPlan|null>(null);
  const previewNoteId=useRef(0);
  const addPreviewNote=(text:string)=>{
    if(!text.trim())return;
    previewNoteId.current+=1;
    const id=previewNoteId.current;
    setPreviewNotes(notes=>[...notes,{id,text:text.trim(),exampleId:phase2ExampleId}]);
  };
  // Each local demonstration keeps its own draft notes. Switching examples never discards them.
  const addPreviewSource=(proposal:LocalSourceProposal)=>{
    if(!proposal.text.trim())return;
    previewNoteId.current+=1;
    setPreviewNotes(notes=>[...notes,{id:previewNoteId.current,exampleId:phase2ExampleId,
      text:proposal.text,filename:proposal.filename,mime:proposal.mime,size:proposal.size,
      thumbnail:proposal.thumbnail,snippet:proposal.snippet}]);
    closeTool();
    focusPreviewComposer();
  };
  /** The one local buying proposal uses the existing work preview, not a second Agreement. */
  const continueSampleBuyingPlan=(proposal:LocalStoreBuyingPlan)=>{
    const plan={lines:proposal.lines.map(line=>({...line})),draft:{...proposal.draft}};
    setSampleBuyingPlan(plan);
    setPhase2ExampleId(null);
    previewNoteId.current+=1;
    const id=previewNoteId.current;
    setPreviewNotes(current=>[
      ...current.filter(note=>!(note.storePlan&&note.exampleId===null)),
      {id,exampleId:null,text:'Buying plan: '+plan.lines.length+' proposed item(s) from '+new Set(plan.lines.map(line=>line.storeKsNumber||line.storeName)).size+' sample Store(s).',storePlan:plan}
    ]);
    closeTool();
    setScreen('chat');
  };
  const activePreviewNotes=previewNotes.filter(note=>note.exampleId===phase2ExampleId);
  const focusPreviewComposer=()=>{
    setScreen('chat');
    // Desktop is already visible; mobile becomes visible on the next paint.
    document.getElementById('phase1-local-note')?.focus();
    window.requestAnimationFrame(()=>document.getElementById('phase1-local-note')?.focus());
  };
  const [editingDreamId,setEditingDreamId]=useState<string|null>(null);
  const [workingCircleId,setWorkingCircleId]=useState<string|null>(null);
  const [openedAgreementId,setOpenedAgreementId]=useState<string|null>(null);
  const [dreamUnsaved,setDreamUnsaved]=useState(false);
  const noteUnsaved=useCallback((dirty:boolean)=>setDreamUnsaved(dirty),[]);
  const mayLeaveDream=()=>!dreamUnsaved || window.confirm('Your Dream has changes that have not been confirmed saved. Leave without saving?');
  const backToWorkspace=()=>{
    if(!mayLeaveDream())return;
    setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);
  };
  useEffect(()=>{
    if(!signedIn){setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);setOpenedAgreementId(null);}
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
    if(next!=='work')setOpenedAgreementId(null);
    if(next!==mode){setEditingDreamId(null);setWorkingCircleId(null);setDreamUnsaved(false);}
    setMode(next);setScreen('chat');setToolSelected(false);setToolsOpen(shelfPinned);
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
  const [draftRevision,setDraftRevision]=useState(0);
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
  // Reuse the existing Agreement handoff and identity authorities. An inspected draft does
  // not become a formal Agreement until the separate canonical version-bound ceremony passes.
  // Reuse the canonical, idempotent Agreement handoff. No second Agreement engine.
  const [handoffController] = useState(() => gateway ? createHandoffController(gateway) : null);
  const [handoffIdentity] = useState(() => workspaceGateways ? createIdentityController(workspaceGateways.auth,session) : null);
  const handoffState=useSyncExternalStore(handoffController?.subscribe??subscribeNever,
    handoffController?.getSnapshot??(()=>null));
  const [createdAgreementId,setCreatedAgreementId]=useState<string|null>(null);
  const liveState = useSyncExternalStore<AgentState | null>(liveController?.subscribe ?? subscribeNever, liveController?.getSnapshot ?? noLiveState);
  const formationState = useSyncExternalStore<FormationState | null>(formationController?.subscribe ?? subscribeNever, formationController?.getSnapshot ?? noFormationState);
  const liveConversationId = liveState?.conversationId ?? null;
  // Explicit claim: preserve the exact anonymous KS001 conversation by the backend's
  // existing owner-binding saved-build authority, never by copying its turns.
  const [guestClaim,setGuestClaim]=useState<{id:string;phase:'offered'|'saving'|'saved'|'error'|'dismissed';message:string}|null>(null);
  useEffect(()=>{
    const resumable=gateway?.resumableConversationId?.();
    if(signedIn && resumable && resumable===liveConversationId){
      setGuestClaim(current=>current?.id===resumable?current:{id:resumable,phase:'offered',message:''});
    }else if(!signedIn){setGuestClaim(null);}
  },[signedIn,gateway,liveConversationId]);
  const claimGuestConversation=async()=>{
    if(!signedIn||!gateway||!liveController||!guestClaim||guestClaim.phase==='saving')return;
    const id=guestClaim.id;
    if(gateway.resumableConversationId?.()!==id||liveController.getSnapshot().conversationId!==id){
      setGuestClaim({id,phase:'error',message:'This is no longer the same temporary conversation. Open Saved Work instead.'});return;
    }
    setGuestClaim({id,phase:'saving',message:''});
    try{
      const record=await gateway.saveBuild(id); // the canonical server claim; retriable, never client-owned
      if(record.conversationId!==id||!record.savedBuildId)
        throw new Error('SecurePay did not confirm that your original conversation was saved.');
      await liveController.resumeConversation(id);
      if(!authorisedResumedConversation(id,liveController.getSnapshot()))
        throw new Error('Saved successfully, but SecurePay cannot verify access yet. Check Saved Work.');
      setGuestClaim({id,phase:'saved',message:'Your original KS001 conversation is now saved to your identity. Your work has not been sent or accepted as an Agreement.'});
    }catch(e){
      setGuestClaim({id,phase:'error',message:e instanceof Error?e.message:'Could not confirm the save. Check Saved Work before retrying.'});
    }
  };

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
  // The same canonical Agreement reader opens inside the masterpiece, never on a legacy route.
  // The existing live KS001 controller stays mounted and retains the original conversation.
  const [draftReviewOpen, setDraftReviewOpen] = useState(false);
  // If server truth changes or a refresh fails, do not leave a blank centre behind a stale reader.
  const showDraftReview = draftReviewOpen && !createdAgreementId && mode==='work' && liveStarted && !uiOnlyPreview &&
    !!liveController && !!formationController && formationState?.status==='ready' &&
    !formationState.error && formationState.data?.conversationId===liveConversationId &&
    !!formationState.data.reviewable;
  useEffect(() => {
    setDraftReviewOpen(false);
    // Old handoffs may never be used to create a draft for a different conversation.
    handoffController?.reset();
    setCreatedAgreementId(null);
  }, [mode, liveConversationId, handoffController]);
  // Shelf presentation is remembered while this workspace stays mounted; no browser
  // storage is used for private preferences, tokens, identity or Agreement work.
  const [shelfPinned,setShelfPinned] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(shelfPinned);
  const contextTools = tools.filter(tool => mode==='work' || (mode==='vision'
    ? ['Photos','Documents','Places'].includes(tool.name)
    : mode==='circle' ? ['Photos','Documents','Places'].includes(tool.name)
    : ['Photos','Documents','Places','Stores'].includes(tool.name)));
  const contextHint: Record<Mode,string> = {
    work:'Choose something useful for your work.',
    vision:'Collect inspiration and ideas.',
    circle:'Bring material to your shared work.',
    community:'Explore ways to contribute.',
  };
  const previousScreen = useRef<Screen>('chat');
  const [activeTool, setActiveTool] = useState<(typeof tools)[number]['name']>('Photos');
  const [toolSelected, setToolSelected] = useState(false);
  const persona = KS001_WORKSPACE_PERSONAS[mode];
  const [quickAssistCollection, setQuickAssistCollection] = useState<QuickAssistId[]>(['stays', 'ride']);
  const [quickAssistSeed, setQuickAssistSeed] = useState('');
  const [storeServiceQuery, setStoreServiceQuery] = useState('');
  const [storeQuickAssistNeed, setStoreQuickAssistNeed] = useState('');
  const [phase4Journey,setPhase4Journey]=useState<'chairs'|'solomon'|'plug'|'master'|'stays'|null>(null);
  // A source added while editing a fact must retain the originating conversation.
  // This hint changes only the explicit KS001 request, never Agreement authority.
  const [supportingFact, setSupportingFact] = useState<{label:string;conversationId:string}|null>(null);
  const tool = tools.find(t => t.name === activeTool) ?? tools[0];
  function openTool(name: (typeof tools)[number]['name'], request = '') {
    setPhase4Journey(null);
    if (name === 'Quick Assist') setQuickAssistSeed(request);
    if (name === 'Stores') { setStoreServiceQuery('');setStoreQuickAssistNeed(''); }
    if (!toolsOpen) previousScreen.current = screen==='tools'?'chat':screen;
    setActiveTool(name); setToolSelected(true); setToolsOpen(true);
  }
  function startPhase4Journey(id:'chairs'|'solomon'|'plug'|'master'|'stays') {
    setPhase4Journey(id);
    if (!toolsOpen) previousScreen.current=screen==='tools'?'chat':screen;
    const needsStore=id==='chairs'||id==='plug'||id==='master';
    setActiveTool(needsStore?'Stores':'Quick Assist');
    setToolSelected(true);setToolsOpen(true);
    setStoreServiceQuery(id==='chairs'?'chairs':'');
    setStoreQuickAssistNeed('');
    setQuickAssistSeed(id==='solomon'?'I have goods at my shop and need someone to deliver them nearby.':id==='stays'?'I need a short stay near tomorrow’s meeting and transport to get there.':'');
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
  function closeTool() {
    setSupportingFact(null);setToolsOpen(shelfPinned);setToolSelected(false);setScreen(previousScreen.current);
  }
  function toggleShelfPin() {
    const next=!shelfPinned;
    setShelfPinned(next);
    setToolsOpen(next || toolsOpen);
    // Mode changes keep this preference in React state; leaving the app resets it.
  }
  useEffect(()=>{
    if(!toolsOpen)return;
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeTool();}
    };
    window.addEventListener('keydown',onEscape);
    return ()=>window.removeEventListener('keydown',onEscape);
  },[toolsOpen,shelfPinned]);
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
  const askKs001FromAgreement = async(reference:string)=>{
    if(!signedIn || !gateway || !liveController)throw new Error('Sign in to ask KS001.');
    if(liveBusy || livePending)throw new Error('Finish your current KS001 action first.');
    // A new Agreement question gets a fresh conversation; another Agreement's chat is never
    // silently amended. The person must press Send themselves after reading the unsent draft.
    const started=await gateway.createConversation();
    if(!started?.conversationId)throw new Error('Could not start a verified conversation.');
    await liveController.resumeConversation(started.conversationId);
    if(!authorisedResumedConversation(started.conversationId,liveController.getSnapshot()))
      throw new Error('The new conversation was not authorised.');
    writeDraft(started.conversationId,'I am looking at Agreement '+reference+'. Help me understand what needs attention. Check my authority and the exact Agreement before using private facts or suggesting actions. No changes or payments are authorised by this question.');
    setOpenedAgreementId(null);setDraftRevision(x=>x+1);setLiveWork(true);setLiveStarted(true);setScreen('chat');
  };
  const openActiveAgreementMoney = (detail:AgreementDetailResponse,railCode?:string)=>{
    if(!detail.currentVersion?.versionId) return;
    if(railCode)setMoneyRailPreference({agreementId:detail.overview.agreementId,railCode});
    storeWorkspaceMoneyReturn(liveConversationId);
    openMoneyFor({agreementId:detail.overview.agreementId,title:detail.overview.title,
      versionLabel:'version '+detail.currentVersion.versionNumber,currentVersionId:detail.currentVersion.versionId});
  };
  const continueVisionToWork = async(handoff:DreamHandoff)=>{
    if(!signedIn || !liveController || !gateway)
      throw new Error('Sign in and connect KS001 before continuing this private Vision.');
    const result=await prepareDreamHandoff(liveController,handoff);
    if(!result.ok)throw new Error(result.error);
    // The original Dream conversation is reopened and an unsent draft has been
    // placed in its canonical composer. No turn, Agreement or Money was created.
    chooseMode('work');
    setDraftRevision(value=>value+1);
    setLiveStarted(true);setLiveWork(true);
  };
  // Local, unsigned proposals are retained after sign-in, never silently sent or
  // imported as facts. The user explicitly chooses which text to review with KS001.
  const prepareLocalNoteForKs001=async(text:string)=>{
    if(!signedIn || !liveController || !gateway)throw new Error('Sign in and connect KS001 first.');
    if(liveController.getSnapshot().busy || liveController.getSnapshot().pending)
      throw new Error('Finish the previous KS001 action before bringing in a local note.');
    let id=liveController.getSnapshot().conversationId;
    if(!id){
      const created=await gateway.createConversation();
      if(!created?.conversationId)throw new Error('Could not start your KS001 conversation.');
      await liveController.resumeConversation(created.conversationId);
      if(!authorisedResumedConversation(created.conversationId,liveController.getSnapshot()))
        throw new Error('The KS001 conversation has not been authorised for your identity.');
      id=created.conversationId;
    }
    if(readDraft(id).trim())throw new Error('Your KS001 composer already contains unsent work. Review it first.');
    writeDraft(id,text);
    setLiveStarted(true);setLiveWork(true);setScreen('chat');setDraftRevision(n=>n+1);
    setReturnError('Your earlier local note is ready in KS001. Review it before sending. Images and attachments have not been uploaded.');
  };
  const continueCircleToWork = async(text:string)=>{
    if(!signedIn || !liveController || !gateway)
      throw new Error('Sign in and connect KS001 before bringing a Circle proposal into My Work.');
    const current=liveController.getSnapshot();
    if(current.busy || current.pending)throw new Error('Complete the current KS001 action first.');
    if(current.conversationId && readDraft(current.conversationId).trim())
      throw new Error('You have an unsent My Work message. Finish it before starting this Circle proposal.');
    // A Circle proposal starts a fresh server-owned KS001 conversation. It never
    // mutates an existing Agreement, imports Circle membership or sends a turn.
    const created=await gateway.createConversation();
    if(!created?.conversationId)throw new Error('SecurePay could not start a verified conversation.');
    await liveController.resumeConversation(created.conversationId);
    const opened=liveController.getSnapshot();
    if(!authorisedResumedConversation(created.conversationId,opened))
      throw new Error('SecurePay could not reauthorise this new conversation.');
    if(readDraft(created.conversationId).trim())
      throw new Error('An unsent message already exists in the new conversation.');
    writeDraft(created.conversationId,text);
    chooseMode('work');setDraftRevision(value=>value+1);setLiveStarted(true);setLiveWork(true);
  };
  const closeIdentity=()=>{
    setSignInOpen(false);
    // A direct identity deep-link returns to the same masterpiece, not the retired homepage.
    if(typeof window!=='undefined' && /^#\/?sign-(?:in|up)\/?$/.test(window.location.hash))
      window.location.hash='#/preview/living-workspace/work';
  };
  return <main className="sp-type-signature sp-brand-shell min-h-screen bg-gradient-to-br from-[#fbfaf5] via-[#f7f7f1] to-[#eef2eb] text-forest-800" data-sp-area={mode} data-typography-study="Afacad-Flux-and-Bricolage" data-workspace-frozen-layout>
    <header className="sp-brand-header border-b border-cream-200/80 bg-white/95 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><img src={securepayWordmark} alt="SecurePay" className="h-9 w-auto max-w-[164px] object-contain" /><p className="text-xs text-sand-600">KS001 · Your space to make progress</p></div>
        <nav aria-label="Workspace experience" className="sp-brand-nav flex w-full min-w-0 max-w-full overflow-x-auto rounded-xl bg-cream-100 p-1 sm:w-auto">
          {([['work','My Work'],['vision','Vision'],['circle','Circle'],['community','Community']] as const).map(([id,label]) =>
            <button key={id} aria-current={mode===id?'page':undefined} onClick={()=>chooseMode(id)} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs sm:px-5 sm:text-sm ${mode===id?'bg-white font-semibold shadow-sm':'text-sand-600'}`}>{label}</button>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {!signedIn
            ? <><button type="button" onClick={()=>openIdentity('signin')}
                className="min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-sm font-medium text-forest-800 hover:bg-cream-50">Sign in</button>
              <button type="button" onClick={()=>openIdentity('signup')} data-gate-d-get-ks-number
                className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white">Get KS Number</button></>
            : signedIn ? <span className="rounded-full bg-[#eaf2e9] px-3 py-2 text-xs font-medium text-forest-800">Your SecurePay workspace</span> : null}
          <a className="inline-flex min-h-11 items-center gap-2 text-sm underline" href="#/" onClick={event=>{if(!returnToKs001())event.preventDefault();}}><ArrowLeft size={15}/> SecurePay</a>
        </div>
      </div>
    </header>
    {signedIn && !mockSignedIn && workspaceGateways && mode==='circle' && workingCircleId
      ? <div className="mx-auto w-full max-w-[1550px] px-3 py-5 sm:px-5">
          <InlineCircleBoard key={workingCircleId} id={workingCircleId}
            gateways={workspaceGateways} session={session} onBack={backToWorkspace}
             onContinueToWork={continueCircleToWork}
             onOpenMyWork={()=>{setWorkingCircleId(null);chooseMode('work');}}/>
        </div>
      : <div className="mx-auto flex max-w-[1550px] min-h-0 gap-3 px-3 py-3 sm:px-5 sm:py-5 md:h-[calc(100dvh-170px)] md:overflow-hidden" data-workspace-shell>
      <nav aria-label="Workspace tool rail" data-tool-rail className="hidden w-[62px] shrink-0 flex-col items-center gap-1 rounded-2xl border border-cream-200 bg-white/95 p-1.5 shadow-sm xl:flex">
        <button type="button" onClick={()=>{setToolSelected(false);if(toolsOpen){setToolsOpen(false);setShelfPinned(false);}else setToolsOpen(true);}}
          aria-label={toolsOpen?'Collapse tool shelf':'Expand tool shelf'} aria-expanded={toolsOpen}
          className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-cream-100 text-forest-800">
          {toolsOpen?<PanelLeftClose size={19}/>:<PanelLeftOpen size={19}/>}
        </button>
        {contextTools.map(t=><button type="button" key={t.name} onClick={()=>openTool(t.name)}
          aria-label={t.name} title={t.name}
          className="flex min-h-11 w-11 items-center justify-center rounded-xl text-forest-700 hover:bg-cream-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700">
          <t.icon size={20} aria-hidden="true"/>
        </button>)}
      </nav>
      {toolsOpen && <>
        <button type="button" aria-label="Close tools drawer" onClick={closeTool} className="fixed inset-0 z-40 cursor-default bg-forest-950/10 xl:hidden" />
        <aside role="dialog" aria-modal={typeof window !== 'undefined' && window.innerWidth<1280}
          aria-label={toolSelected?activeTool+' tool':'Choose a tool'} data-tool-shelf
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] min-w-0 flex-col overflow-hidden rounded-t-3xl border border-cream-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(88dvh,900px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:w-[min(94vw,560px)] xl:static xl:inset-auto xl:max-h-none xl:h-full xl:w-[290px] xl:shrink-0 xl:translate-x-0 xl:translate-y-0 xl:rounded-2xl xl:shadow-sm xl:border-cream-200 ring-1 ring-forest-900/10">
        <div className="flex items-center justify-between gap-2 border-b border-cream-100 p-4">
          {toolSelected
            ? <button type="button" onClick={()=>setToolSelected(false)} aria-label="Back to tools" className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-cream-100"><ArrowLeft size={18}/> Back to tools</button>
            : <strong className="sp-type-display text-lg">Tools · {areaLabels[mode].split(' · ')[0]}</strong>}
          <div className="flex items-center gap-1">
            <button type="button" aria-label={shelfPinned?'Unpin tool shelf':'Pin tool shelf'} aria-pressed={shelfPinned}
              onClick={toggleShelfPin} className="hidden min-h-10 min-w-10 items-center justify-center rounded-lg hover:bg-cream-100 xl:flex">
              {shelfPinned?<PinOff size={18}/>:<Pin size={18}/>}
            </button>
            <button type="button" aria-label="Close tools" onClick={closeTool} className="min-h-11 min-w-11 rounded-lg p-2 hover:bg-cream-100"><X size={19}/></button>
          </div>
        </div>
        {toolSelected
          ? <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5" aria-label={activeTool+' workspace'}>
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><tool.icon size={22}/>{tool.name==='People & Invitations'?'People':tool.name}</div>
              {activeTool==='Date & Time'
                ? <DateTimeTool isLocalPreview={uiOnlyPreview} context={supportingFact?.conversationId===liveConversationId ? supportingFact.label : ''}
                    onClose={closeTool}
                    onPrepare={mode==='work' && gateway && !mockSignedIn && liveWork && !uiOnlyPreview ? async message=>{
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
                    } : uiOnlyPreview && mode==='work' ? async message=>{
                      const parsed=/^Proposed ([a-z-]+) timing \(not yet an agreed contractual commitment\): (.*?)\. Device time zone: ([^.]+)\./.exec(message);
                      addPreviewNote(parsed?'Date: '+parsed[1]+' · '+parsed[2]+' · '+parsed[3]+' (proposed, not agreed)':message);
                      closeTool();
                      focusPreviewComposer();
                    } : undefined}/>
                : (['Photos','Documents','Places'] as const).some(name=>name===activeTool)
                ? <UniversalSourceTray agreementPlaces={formationState?.data?.conversationId===liveConversationId
                  ? [...formationState.data.what,...formationState.data.when,...formationState.data.conditions]
                      .filter(term=>/location|address|place|site|deliver|entrance|destination/i.test(term.label)&&term.value.trim())
                      .map(term=>term.value).slice(0,6)
                  : []} tool={activeTool} area={mode} isDemo={mockSignedIn||uiOnlyPreview} onLocalProposal={uiOnlyPreview?addPreviewSource:undefined} gateway={mode==='work'&&!uiOnlyPreview?gateway:undefined} conversationId={mode==='work'?liveConversationId:null} dreamsGateway={signedIn&&!mockSignedIn?workspaceGateways?.dreams:undefined}
                  visionConversationGateway={mode==='vision'&&signedIn&&!mockSignedIn?gateway:undefined} ensureSignedIn={async()=>{
                  if(!workspaceGateways||!signedIn||mockSignedIn)throw new Error('Sign in first');
                  await ensureFreshSession(session,workspaceGateways.auth);
                  if(session.getSnapshot().status!=='signed-in')throw new Error('Sign in again');
                }} onEnsureConversation={async()=>{
                  if(mode!=='work')throw new Error('Use My Work to add Agreement sources. Other spaces do not share its conversation.');
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
                    localPreview={uiOnlyPreview} onLocalProposal={uiOnlyPreview?text=>{
                      addPreviewNote(text);closeTool();focusPreviewComposer();
                    }:undefined}
                    onCheckKs={gateway&&!uiOnlyPreview?async ksNumber=>{
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
                    agreementPeople={formationState?.data?.conversationId===liveConversationId
                      ?formationState.data.who.filter(p=>p.name!=='Not named yet').map(p=>({name:p.name,role:p.role})):[]}
                    onPrepare={async text=>{
                      if(!liveController)throw new Error('KS001 unavailable');
                      setLiveStarted(true);setLiveWork(true);
                      await liveController.send(text);
                      if(liveController.getSnapshot().error||liveController.getSnapshot().pending)throw new Error('Unconfirmed turn');
                      closeTool();
                    }}/>
                : activeTool==='Stores'?<StoresTool
                    key={phase4Journey || storeServiceQuery || 'general-store'} initialServiceQuery={storeServiceQuery || undefined} initialQuickAssistNeed={storeQuickAssistNeed || undefined}
                    initialAssistance={phase4Journey==='plug'||phase4Journey==='master'?phase4Journey:null}
                    onLocalProposal={uiOnlyPreview&&mode==='work'?text=>{addPreviewNote(text);closeTool();}:undefined}
                    onLocalBuyingPlan={uiOnlyPreview&&mode==='work'?continueSampleBuyingPlan:undefined}
                    initialSamplePlan={uiOnlyPreview?sampleBuyingPlan:undefined}
                    gateways={workspaceGateways} signedIn={signedIn&&!mockSignedIn} onOpenPhoto={()=>openTool('Photos')}
                    agreementNeeds={formationState?.data?.conversationId===liveConversationId
                      ? [...formationState.data.what,...formationState.data.conditions].map(term=>term.value).filter(Boolean)
                      : []}
                    onContinue={async message=>{
                      if(mode!=='work')throw new Error('Open My Work to discuss Agreement terms with KS001.');
                      if(!liveController)throw new Error('KS001 is unavailable');
                      setLiveStarted(true);setLiveWork(true);
                      await liveController.send(message);
                      if(liveController.getSnapshot().error||liveController.getSnapshot().pending)throw new Error('Unconfirmed turn');
                      closeTool();
                    }}/>
                : activeTool==='Money'?<UnifiedMoneyTool
                    gateways={workspaceGateways} signedIn={signedIn&&!mockSignedIn} context={mode==='vision'?'vision':'work'}
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
                    key={phase4Journey || quickAssistSeed || 'quick-assist'} collection={quickAssistCollection} onCollectionChange={setQuickAssistCollection} initialRequest={quickAssistSeed}
                    onLocalProposal={uiOnlyPreview&&mode==='work'?text=>{addPreviewNote(text);closeTool();}:undefined}
                    onFindStoreOffers={(service,requestedTask)=>{setStoreServiceQuery(service==='stays'?'accommodation':'transport');setStoreQuickAssistNeed(requestedTask);setActiveTool('Stores');setToolSelected(true);}}
                    onContinue={mode==='work' && gateway && !mockSignedIn && !uiOnlyPreview ? async message=>{
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
          : <nav aria-label="Choose a tool" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              <p className="text-xs leading-5 text-sand-600">{contextHint[mode]}</p>
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
                
              <section aria-label="Add something">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-600">Add something</h4>
                {uiOnlyPreview&&mode==='work'&&<details data-phase4-journeys className="mb-3 rounded-xl bg-cream-50 p-2">
                   <summary className="cursor-pointer py-1 text-xs font-semibold text-forest-800">Try five ways to get help</summary>
                   <div className="mt-2 space-y-1">
                     {([['chairs','Compare chairs for a school event'],['solomon','Solomon needs a rider'],['plug','Find practical help from a Plug'],['master','Ask a Master to review milestones'],['stays','Short Stay and My Ride']] as const).map(([id,label])=>
                       <button key={id} type="button" onClick={()=>startPhase4Journey(id)} className="block min-h-11 w-full rounded-lg px-2 text-left text-xs hover:bg-white">{label}</button>)}
                   </div>
                   <p className="mt-2 text-xs text-sand-600">Examples are local only. No real listings, people, rates, bookings or invitations are confirmed.</p>
                 </details>}
                {uiOnlyPreview&&mode==='work'&&<details data-phase3-journeys className="mb-3 rounded-xl bg-cream-50 p-2">
                  <summary className="cursor-pointer py-1 text-xs font-semibold text-forest-800">Try the five practical tool journeys</summary>
                  <div className="mt-2 space-y-1">
                    {([['People & Invitations','A · Add KS002 as recipient'],['Photos','B · Show 200 chairs'],['Documents','C · Bring minutes or quotation'],['Places','D · Identify a school entrance'],['Date & Time','E · Choose tomorrow at 10:00']] as const).map(([toolName,label])=>
                      <button key={toolName} type="button" onClick={()=>openTool(toolName)} className="block min-h-10 w-full rounded-lg px-2 text-left text-xs hover:bg-white">{label}</button>)}
                  </div>
                  <p className="mt-2 text-xs text-sand-600">Choose your own details. These local proposals are not uploaded, checked or accepted.</p>
                </details>}
                <div className="grid grid-cols-2 gap-2">
                  {contextTools.filter(t=>t.group==='add').map(t=><button type="button" key={t.name} onClick={()=>openTool(t.name)}
                    className="flex min-h-14 min-w-0 items-center gap-2.5 rounded-xl border border-cream-200 bg-white px-3 py-2 text-left hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
                    <t.icon size={19} className="shrink-0" aria-hidden="true"/><span className="text-xs font-semibold">{t.name==='People & Invitations'?'People':t.name}</span>
                  </button>)}
                </div>
              </section>
              <section aria-label="Get something done">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-600">Get something done</h4>
                <div className="grid grid-cols-2 gap-2">
                  {contextTools.filter(t=>t.group==='do').map(t=><button type="button" key={t.name} onClick={()=>openTool(t.name)}
                    className="flex min-h-14 min-w-0 items-center gap-2.5 rounded-xl border border-cream-200 bg-white px-3 py-2 text-left hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800">
                    <t.icon size={19} className="shrink-0" aria-hidden="true"/>
                    <span className="min-w-0 text-xs font-semibold">{t.name}</span>
                  </button>)}
                </div>
              </section>
              </>}
            </nav>}
        </aside>
      </>}
      {returnError&&<p role="alert" className="mx-4 mt-2 rounded-xl bg-amber-50 p-3 text-sm">{returnError}</p>}
      <section aria-label="KS001 conversation" className={`${screen==='chat'||toolsOpen?'flex':'hidden'} sp-brand-conversation min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden md:min-h-0 rounded-2xl border border-cream-200 bg-white md:flex`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 p-4"><div><p className="text-xs text-sand-600">{areaLabels[mode]} · {persona.label}</p><strong className="sp-type-display text-xl">KS001</strong></div><div className="flex flex-wrap gap-2">{(!uiOnlyPreview || mode!=='work')&&<button type="button" onClick={openToolPicker} aria-label="Expand tool shelf" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cream-100 px-4 text-sm font-semibold xl:hidden"><Plus size={18}/> Tools</button>}</div></div>
        {liveStarted && gateway && !uiOnlyPreview && <div className={mode==='work' && liveWork && !showDraftReview && !openedAgreementId && !createdAgreementId?'flex min-h-0 flex-1 flex-col':'hidden'}><LiveKs001Session controller={liveController!} opening={persona.opening} draftRevision={draftRevision} onOpenTool={name=>openTool(name)} nextQuestion={formationState?.data?.conversationId===liveConversationId?formationState.data.question?.text:null}/></div>}
        {!openedAgreementId && !createdAgreementId && showDraftReview && liveController && formationController && formationState?.data &&
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfcf8] px-4 py-4 sm:px-6" data-day1-workspace-review>
            <AgreementReview
              formation={formationState.data} changes={formationState.changes}
              busy={liveBusy||livePending} checking={formationState.checking} error={formationState.error}
              onBack={()=>setDraftReviewOpen(false)}
              onCheck={pointId=>{if(liveConversationId)void formationController.check(liveConversationId,pointId);}}
              onCorrect={text=>submitCorrection(liveController,text)}
              onRetryCorrection={()=>retryPending(liveController)}
              onOpenPoint={()=>setDraftReviewOpen(false)}
              onSetUp={version=>{
                if(!liveConversationId||!handoffController||!signedIn||liveBusy||livePending||!formationState?.data?.confirmable) return;
                void handoffController.start(liveConversationId,version);
              }}
              setUpAvailable={!!signedIn && !!handoffController && !!handoffIdentity}
              settingUpAs={signedIn?{signedIn:true,actingFor:null}:undefined}
              setUp={handoffController&&handoffIdentity&&handoffState?.phase!=='idle' ?
                <div data-gate-d-post-review-actions className="mt-3">
                  <HandoffPanel handoff={handoffController} identity={handoffIdentity}
                    onDone={()=>handoffController.reset()}
                    onOpenAgreement={id=>{setCreatedAgreementId(id);setOpenedAgreementId(id);setDraftReviewOpen(false);setScreen('chat');}}
                    agreementGateway={workspaceGateways?.agreements}/>
                </div>:null}
              onAcknowledgeChanges={()=>formationController.acknowledgeChanges()}
              onUnlink={partyKey=>{if(liveConversationId)void formationController.unlink(liveConversationId,partyKey);}}
            />
          </div>}
        {mode==='work' && openedAgreementId && signedIn && workspaceGateways &&
          <ActiveAgreementWorkspace key={openedAgreementId} agreementId={openedAgreementId} gateways={workspaceGateways}
            session={session} onBack={()=>setOpenedAgreementId(null)}
            onAskKs001={askKs001FromAgreement} onOpenMoney={openActiveAgreementMoney}/>}
        {mode==='vision' && !editingDreamId && <TrueNorthVisionChat journey={visionNorth} onAdd={name=>openTool(name)}/>}
        {signedIn && !mockSignedIn && workspaceGateways && mode==='vision' && editingDreamId &&
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5" data-gate-b-vision-inside-masterpiece>
            <InlineVisionEditor key={editingDreamId} id={editingDreamId} gateways={workspaceGateways}
              session={session} onBack={backToWorkspace} onUnsavedChange={noteUnsaved}
              onContinueToWork={continueVisionToWork}/>
          </div>}
        {mode==='work' && createdAgreementId && !openedAgreementId && <section data-gate-d-agreement-created
            className="flex-1 space-y-3 overflow-y-auto p-5">
            <h2 className="font-display text-2xl text-forest-900">Your draft Agreement is saved</h2>
            <p className="text-sm text-sand-700">SecurePay confirmed a draft. Nobody else has accepted it. Open My Agreements to review participants and invitations. Money remains unavailable until the separate backend checks permit it.</p>
            <p className="break-all text-xs text-sand-600">Agreement reference: {createdAgreementId}</p>
            <button type="button" onClick={()=>{setCreatedAgreementId(null);setDraftReviewOpen(false);setScreen('result');}}
              className="min-h-11 rounded-xl border border-forest-300 px-4 text-sm font-semibold text-forest-800">Open My Agreements</button>
          </section>}
        {uiOnlyPreview && mode==='work' && <PreviewWorkComposer notes={activePreviewNotes} exampleId={phase2ExampleId} onAdd={addPreviewNote} onOpenTools={openToolPicker}
          onSelectExample={id=>setPhase2ExampleId(id)}/>}
        {mode==='community' && (!signedIn || workspaceGateways) && <div data-phase6-community-main
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <InlineCommunityHub gateways={workspaceGateways} session={session}
            previewOnly={!signedIn}
            onPlanWithKs001={continueCircleToWork}
            onSignIn={()=>setSignInOpen(true)}
            onOpenFull={()=>{window.location.hash='#/community';}}
            onOpenCircle={circleId=>{
              storeCircleEntry(circleId);
              window.location.hash='#/community';
            }}
            onOpenObject={objectId=>{
              storeCommunityObjectEntry(objectId);
              window.location.hash='#/community';
            }}/>
        </div>}
       {!(mode==='community' && (!signedIn || workspaceGateways)) &&
         mode!=='vision' &&
         !(mode==='work' && openedAgreementId) &&
         !(mode==='work' && ((liveWork && gateway && !uiOnlyPreview) || uiOnlyPreview)) && <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <WorkspaceWelcome area={mode} onExample={example=>{
            if(example.tool)openTool(example.tool);
          }}/>
          {mode==='work' && !gateway && <p role="status" className="mx-auto mt-3 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">KS001 is temporarily unavailable. No Agreement will be created or changed.</p>}
          {mode!=='work' && gateway && <div className="mx-auto mt-5 max-w-lg text-center">
            <p className="text-xs leading-5 text-sand-600">The tools are available here. Personalised KS001 conversation in this space needs an authorised connection.</p>
            <button type="button" onClick={()=>chooseMode('work')} className="mt-3 min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm text-forest-800">Ask KS001 about an Agreement in My Work</button>
          </div>}
        </div>}
      </section>
      <aside aria-label="Living result" className={`${screen==='result'?'flex':'hidden'} sp-brand-result w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white md:flex md:w-[35%] lg:max-w-[460px]`}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
        {mode==='work' && signedIn && guestClaim && guestClaim.phase!=='dismissed' &&
          <section data-gate-d-authorised-anonymous-conversation-claim
            aria-label="Keep your KS001 conversation after signup"
            className="mb-3 space-y-2 rounded-xl border border-forest-200 bg-cream-50 p-3">
            <h3 className="font-display text-lg text-forest-900">Keep your earlier KS001 conversation?</h3>
            <p className="text-xs leading-5 text-sand-700">This conversation began before sign-in. SecurePay can save that exact conversation under your KS Number; no new Agreement, money action or automatic membership is created.</p>
            {guestClaim.phase==='saved'?<p role="status" className="text-xs text-forest-800">{guestClaim.message}</p>:
              <>
                {guestClaim.message&&<p role="alert" className="text-xs text-amber-900">{guestClaim.message}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={guestClaim.phase==='saving'} onClick={()=>{void claimGuestConversation();}}
                    className="min-h-11 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-50">
                    {guestClaim.phase==='saving'?'Verifying with SecurePay…':'Save this conversation to my KS Number'}
                  </button>
                  <button type="button" disabled={guestClaim.phase==='saving'}
                    onClick={()=>setGuestClaim({...guestClaim,phase:'dismissed'})}
                    className="min-h-11 rounded-xl border border-cream-200 px-3 text-xs">Not now</button>
                </div>
              </>}
          </section>}
        {mode==='work' && signedIn && previewNotes.length>0 && <section
          data-gate-d-no-loss-guest-proposals aria-label="Your notes from before signing in"
          className="mb-3 space-y-3 rounded-xl border border-forest-200 bg-cream-50 p-3">
          <h3 className="font-display text-lg text-forest-900">Your earlier notes are still here</h3>
          <p className="text-xs leading-5 text-sand-700">These were local proposals before sign-in, not server-saved Agreements. Choose a note to prepare in KS001. Nothing is sent automatically, and images must be uploaded separately.</p>
          {previewNotes.map(note=><div key={note.id} className="rounded-xl bg-white p-3">
            <p className="whitespace-pre-wrap break-words text-xs text-forest-900">{note.text}</p>
            <button type="button" onClick={()=>{void prepareLocalNoteForKs001(note.text).catch(error=>setReturnError(error instanceof Error?error.message:'Could not prepare the note'));}}
              className="mt-2 min-h-11 rounded-lg border border-forest-200 px-3 text-xs font-semibold text-forest-800">Prepare in KS001 (review before sending)</button>
          </div>)}
        </section>}
        {mode==='work' && workspaceGateways && <AgreementDiscovery gateways={workspaceGateways} session={session}
          mediaStagingReady={identityStagingReady && import.meta.env.VITE_SECUREPAY_MEDIA_EVIDENCE_STAGING_ENABLED === 'true'}
          openAgreementId={createdAgreementId} onAgreementClosed={()=>setCreatedAgreementId(null)}
          onOpenInWorkspace={id=>{setOpenedAgreementId(id);setCreatedAgreementId(null);setDraftReviewOpen(false);setScreen('chat');}}
          onConnectMoney={()=>openTool('Money')}
          onSignIn={()=>openIdentity('signin')}/>}
        {mode==='community' && <CommunityCheckPanel
          gateways={workspaceGateways} session={session} signedIn={signedIn}
          previewOnly={!signedIn} onSignIn={()=>setSignInOpen(true)}
          onOpenCommunity={()=>{window.location.hash='#/community';}}
          onOpenCommunityPost={objectId=>{
            storeCommunityObjectEntry(objectId);
            window.location.hash='#/community';
          }}
          onExploreCircle={circleId=>{
            storeCircleEntry(circleId);
            window.location.hash='#/community';
          }}/>}
        {mode!=='work' && mode!=='vision' && mode!=='community' &&
          <WorkspacePurposeGuide area={mode} onContinueToWork={()=>chooseMode('work')}/>}
        {mode==='work' && openedAgreementId && signedIn && workspaceGateways &&
          <SelectedWorkspaceRecord key={openedAgreementId} area="work" id={openedAgreementId}
            gateways={workspaceGateways} session={session} onClose={()=>setOpenedAgreementId(null)}/>}
        {mode==='vision' && <TrueNorthVisionSummary journey={visionNorth} signedIn={signedIn}
            onSignIn={()=>openIdentity('signin')}
            onOpenSaved={id=>{setEditingDreamId(id);setScreen('chat');}}>
          {signedIn && workspaceGateways && <WorkspaceContinuityPanel area='vision' gateways={workspaceGateways}
            session={session} onSignIn={()=>openIdentity('signin')} onResume={continueSavedConversation}
            onEditDream={id=>{setEditingDreamId(id);setScreen('chat');}}/>}
        </TrueNorthVisionSummary>}
        {signedIn && workspaceGateways && mode!=='work' && mode!=='community' && mode!=='vision'
          ? <WorkspaceContinuityPanel area={mode as WorkspaceArea} gateways={workspaceGateways}
              session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}
              onEditDream={id=>{setEditingDreamId(id);setScreen('chat');}} onOpenCircleBoard={setWorkingCircleId}/>
          : mode==='work' && uiOnlyPreview ? <PreviewWorkBoard notes={activePreviewNotes} exampleId={phase2ExampleId} onFocusComposer={focusPreviewComposer}
              onEditStorePlan={()=>openTool('Stores')}
              onUpdate={(id,text)=>setPreviewNotes(notes=>notes.map(n=>n.id===id?{...n,text}:n))}
              onRemove={id=>{if(previewNotes.some(note=>note.id===id&&note.storePlan))setSampleBuyingPlan(null);
                 setPreviewNotes(notes=>notes.filter(n=>n.id!==id));}}/>
          : mode==='work' && !openedAgreementId && liveWork?<LiveWorkResultPanel
          state={formationState} conversationId={liveConversationId} busy={liveBusy || livePending}
          examination={examination}
          selectedSource={liveState?.source??null}
          onPrepareFairTradeDraft={message=>{
            if(!liveConversationId || !liveController || liveBusy || livePending)
              throw new Error('Finish the current KS001 action before preparing another question.');
            // Never overwrite a person's existing unsent chat. This merely
            // prepares a visible draft in the SAME authorised conversation.
            if(readDraft(liveConversationId).trim())
              throw new Error('Your current message is unsent. Finish or clear it before preparing this question.');
            writeDraft(liveConversationId,message);
            setDraftRevision(value=>value+1);
            setScreen('chat');
          }}
          onAddToFact={openFactSourcePicker}
          onOpenPeople={()=>openTool('People & Invitations')}
          onReview={()=>{if(formationState?.status==='ready' && !formationState.error && formationState.data?.conversationId===liveConversationId && formationState.data.reviewable && !liveBusy && !livePending){setDraftReviewOpen(true);setScreen('chat');}}}
          onCorrectFact={async (label,previous,replacement,expectedVersion)=>{
            if(!liveController||!liveConversationId||liveBusy||livePending||!formationController)throw new Error('KS001 is not ready');
            // Re-read authoritative context immediately before proposing. A changed version is a
            // material conflict, NOT permission to overwrite someone else's latest correction.
            await formationController.load(liveConversationId);
            const latest=formationController.getSnapshot();
            if(latest.status!=='ready'||latest.data?.conversationId!==liveConversationId||latest.data.version!==expectedVersion)
              throw new Error('The Agreement changed. Review the latest version before correcting it.');
            await liveController.send('In draft Agreement version '+expectedVersion+', please review my proposed correction to '+label+'. It was shown as: "'+previous+'". I propose: "'+replacement+'". Check conflicts and ask for confirmation where needed. Do not amend accepted terms silently.');
            if(liveController.getSnapshot().pending||liveController.getSnapshot().error)
              throw new Error('Correction outcome not yet confirmed');
            await formationController.load(liveConversationId);
          }}
          onRefresh={() => { if (formationController && liveConversationId && !liveBusy && !livePending) void formationController.load(liveConversationId); }}
        />:mode==='work' && !openedAgreementId
          ? <div className="rounded-xl border border-forest-100 bg-cream-50 p-4 text-sm">
              Your Agreement will appear here when KS001 has confirmed the conversation.
            </div>
          : null}
        {mode==='work' && signedIn && !liveConversationId && <div className="mt-4">
          <WorkspaceContinuityPanel area="work" gateways={workspaceGateways} showEstablishedAgreements={false}
            session={session} onSignIn={()=>setSignInOpen(true)} onResume={continueSavedConversation}/>
        </div>}
        {!signedIn && mode!=='work' && mode!=='vision' && workspaceGateways && <button type="button" onClick={()=>setSignInOpen(true)}
          className="mt-5 min-h-11 rounded-lg text-left text-xs font-medium text-forest-800 underline underline-offset-4">
          Sign in to see your saved {mode==='circle'?'Circles':'community activity'}
        </button>}
</div>
      </aside>
    </div>}
    {!workingCircleId && <nav aria-label="Mobile workspace panels" className="sticky bottom-0 flex justify-around gap-2 border-t border-cream-200 bg-white p-2 md:hidden">{([['chat','Chat',MessageCircle],['result',mode==='work'?'Your Work':mode==='community'?'Community Check':'About '+areaLabels[mode],Lightbulb],['tools','Tools',Plus]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>id==='tools'?openToolPicker():setScreen(id)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs ${screen===id?'bg-forest-800 text-white':'bg-cream-100'}`}><Icon size={16}/>{label}</button>)}</nav>}
    {!uiOnlyPreview && <p className="px-5 pb-4 text-center text-xs text-sand-600">Agreements, invitations and Money require your review and authorisation.</p>}
    {signInOpen && !workspaceGateways && <div role="dialog" aria-modal="true"
      aria-label="SecurePay identity unavailable" data-gate-d-identity-not-connected
      className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-950/50 p-3">
      <section className="w-full max-w-md space-y-3 rounded-2xl border border-cream-200 bg-white p-5 shadow-2xl">
        <h2 className="font-display text-2xl text-forest-900">Identity is not connected in this preview</h2>
        <p className="text-sm leading-6 text-sand-700">The approved Workspace can be explored without creating a KS Number. Sign-in and verification require an authorised SecurePay staging connection. Nothing has been registered or sent.</p>
        <button type="button" onClick={closeIdentity} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white">Back to my work</button>
      </section>
    </div>}
    {signInOpen && workspaceGateways && <WorkspaceIdentityOverlay
      key={identityIntent} initialStage={identityIntent}
      auth={workspaceGateways.auth} session={session} identityStagingReady={identityStagingReady}
      onDone={closeIdentity}
      onChooseVision={()=>chooseMode('vision')}
      onJoin={()=>{window.location.hash='#/join';}}
      onBusiness={()=>{window.location.hash='#/business';}}
      onActivation={()=>{window.location.hash='#/activate';}}
    />}
  </main>;
}
