import { useState, useRef, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { SignedOutHome } from './components/SignedOutHome';
import { SignedInHome } from './components/SignedInHome';
import { ConversationWorkspace } from './components/ConversationWorkspace';
import { ContextPanel } from './components/ContextPanel';
import { AgreementHub } from './components/AgreementHub';
import { AgreementDetail } from './components/AgreementDetail';
import { DisputeWorkspace } from './components/DisputeWorkspace';
import { AgreementBuilderView } from './components/AgreementBuilderView';
import { MoneyHome } from './components/MoneyHome';
import { MoneyWorkspace } from './components/MoneyWorkspace';
import { StoreHome } from './components/StoreHome';
import { StoreProfileView } from './components/StoreProfileView';
import { OfferDetail } from './components/OfferDetail';
import { SecureLinkShareSheet } from './components/SecureLinkShareSheet';
import { StoreManagementHome } from './components/StoreManagementHome';
import { OfferBuilderView, type OfferDraftFields } from './components/OfferBuilderView';
import { availabilityOptionsFor, emptyOfferDraft } from './features/store/view';
import { ExternalOfferPreview } from './components/ExternalOfferPreview';
import { OfferToTradeHandoff } from './components/OfferToTradeHandoff';
import { OfferChangedState } from './components/OfferChangedState';
import { CommunityHome } from './components/CommunityHome';
import { CommunityObjectDetail } from './components/CommunityObjectDetail';
import { CommunityPersonProfile } from './components/CommunityPersonProfile';
import { CommunityBusinessProfile } from './components/CommunityBusinessProfile';
import { CommunityComposer } from './components/CommunityComposer';
import { CommunityToTradeHandoff } from './components/CommunityToTradeHandoff';
import { CommunitySourceChanged } from './components/CommunitySourceChanged';
import { CircleDiscoveryList } from './components/CircleDiscoveryList';
import { CircleHome } from './components/CircleHome';
import { CircleMemberDirectory } from './components/CircleMemberDirectory';
import { CircleEconomicSummary } from './components/CircleEconomicSummary';
import { CircleCreateFlow } from './components/CircleCreateFlow';
import { CircleJoinFlow } from './components/CircleJoinFlow';
import { SourceToTradeHandoff } from './components/SourceToTradeHandoff';
import { TradeHelpPanel } from './components/TradeHelpPanel';
import { ReferralHistoryView } from './components/ReferralHistoryView';
import { PlugProfileCard } from './components/PlugProfileCard';
import { MasterProfileCard } from './components/MasterProfileCard';
import { MasterRequestView } from './components/MasterRequestView';
import { MasterOpinionView } from './components/MasterOpinionView';
import { PartnerProfileCard } from './components/PartnerProfileCard';
import { SolutionCard } from './components/SolutionCard';

import { AgentIcon } from './components/AgentIcon';
import type { ConversationTurn, Understanding, AgentResponse, AgentState, AppView, SourceReference } from './types';
import {
  mockAgent,
  emptyUnderstanding,
  type ConversationContext,
  type PanelMode,
} from './mockAgent';
import {
  demoAgreements,
  demoAttentionItems,
  demoWaitingItems,
  demoRecentActivity,
  getDemoAgreementDetail,
} from './demoData';
import {
  getDemoDispute,
  disputeAttentionItems,
} from './disputeData';
import {
  getDemoStructure,
  actionAttentionItems,
} from './milestoneData';
import {
  getDemoMoney,
  moneyAttentionItems,
  demoMoneyStates,
} from './moneyData';
import {
  getStoreById,
  getOfferById,
  getOffersByStore,
  demoStoreActivity,
  demoEnquiries,
  searchOffers,
  demoStores,
} from './storeData';
import {
  getCommunityObjectById,
  getPersonById,
  getBusinessById,
  communityAttentionItems,
} from './communityData';
import {
  getCircleById,
  createSourceFromOffer,
  createSourceFromCommunityObject,
} from './circleData';
import {
  demoMasterRequest, demoMasterOpinion,
  getPlugById, getMasterById, getPartnerById, getSolutionById,
  createSourceFromSolution, createSourceFromMasterOpinion,
  ecosystemAttentionItems,
} from './ecosystemData';

let turnId = 0;
const nextId = () => `t${++turnId}`;

function App() {
  const [view, setView] = useState<AppView>('signed-out');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [understanding, setUnderstanding] = useState<Understanding>(emptyUnderstanding);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>('resting');
  const [lastRichResponses, setLastRichResponses] = useState<AgentResponse[]>([]);
  const [panelTitle, setPanelTitle] = useState('What SecurePay understands');
  const [panelMode, setPanelMode] = useState<PanelMode>('understanding');
  const [openAgreementId, setOpenAgreementId] = useState<string | null>(null);
  const [agentResponses, setAgentResponses] = useState<{ text: string }[]>([]);
  const [agentThinking, setAgentThinking] = useState(false);
  const [staleViewedVersion, setStaleViewedVersion] = useState<string | null>(null);
  const [openDisputeId, setOpenDisputeId] = useState<string | null>(null);
  const [openMoneyId, setOpenMoneyId] = useState<string | null>(null);
  const [openOfferId, setOpenOfferId] = useState<string | null>(null);
  const [openStoreId, setOpenStoreId] = useState<string | null>(null);
  const [storeSubView, setStoreSubView] = useState<'home' | 'profile' | 'offer' | 'manage' | 'create' | 'share' | 'external' | 'to-agreement' | 'comparison' | 'changed'>('home');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [offerDraft, setOfferDraft] = useState<OfferDraftFields>(emptyOfferDraft);
  const [storeQuery, setStoreQuery] = useState('');
  const [openCommunityId, setOpenCommunityId] = useState<string | null>(null);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [communitySubView, setCommunitySubView] = useState<'home' | 'object' | 'person' | 'business' | 'create' | 'to-trade' | 'source-changed' | 'circles' | 'circle-home' | 'circle-members' | 'circle-economic' | 'circle-create' | 'circle-join' | 'source-to-trade'>('home');
  const [openCircleId, setOpenCircleId] = useState<string | null>(null);
  const [currentSource, setCurrentSource] = useState<SourceReference | null>(null);
  const [ecoSubView, setEcoSubView] = useState<'help' | 'referrals' | 'plug' | 'master' | 'master-request' | 'master-opinion' | 'partner' | 'solution' | 'solution-to-trade'>('help');
  const [openPlugId, setOpenPlugId] = useState<string | null>(null);
  const [openMasterId, setOpenMasterId] = useState<string | null>(null);
  const [openPartnerId, setOpenPartnerId] = useState<string | null>(null);
  const [openSolutionId, setOpenSolutionId] = useState<string | null>(null);

  const contextRef = useRef<ConversationContext>({
    intent: null,
    step: -1,
    selectedProviderId: null,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isThinking]);

  // Demo route detection
  useEffect(() => {
    const hash = window.location.hash;
    const routeMap: Record<string, AppView> = {
      '#/demo/signed-in-home': 'signed-in',
      '#/demo/agreements': 'agreements',
      '#/demo/agreement/waiting': 'agreement-detail',
      '#/demo/agreement/needs-me': 'agreement-detail',
      '#/demo/agreement/completed': 'agreement-detail',
      '#/demo/agreement/changed': 'agreement-detail',
      '#/demo/agreement/cancelled': 'agreement-detail',
      '#/demo/agreement/expired': 'agreement-detail',
      '#/demo/agreement/empty': 'agreements',
      '#/demo/agreement/stale': 'agreement-detail',
      '#/demo/dispute/isolate': 'dispute',
      '#/demo/dispute/match': 'dispute',
      '#/demo/dispute/master': 'dispute',
      '#/demo/dispute/master-cost': 'dispute',
      '#/demo/dispute/unresolved': 'dispute',
      '#/demo/agreement-builder/milestones': 'agreement-builder',
      '#/demo/agreement-builder/simple': 'agreement-builder',
      '#/demo/agreement-builder/actions': 'agreement-builder',
      '#/demo/agreement-builder/reminders': 'agreement-builder',
      '#/demo/agreement-builder/whatsapp-preview': 'agreement-builder',
      '#/demo/agreement-builder/dependency': 'agreement-builder',
      '#/demo/agreement-builder/evidence': 'agreement-builder',
      '#/demo/agreement-builder/dispute-isolation': 'dispute',
      '#/demo/money': 'money',
      '#/demo/money/not-ready': 'money',
      '#/demo/money/ready': 'money',
      '#/demo/money/payment-review': 'money',
      '#/demo/money/pending': 'money',
      '#/demo/money/confirmed': 'money',
      '#/demo/money/unknown': 'money',
      '#/demo/money/failed': 'money',
      '#/demo/money/milestone': 'money',
      '#/demo/money/dispute': 'money',
      '#/demo/money/group': 'money',
      '#/demo/money/stale': 'money',
      '#/demo/money/partially-ready': 'money',
      '#/demo/money/blocked': 'money',
      '#/demo/money/no-evaluation': 'money',
      '#/demo/money/ready-no-action': 'money',
      '#/demo/store': 'store',
      '#/demo/store/keyman-security': 'store',
      '#/demo/store/offer/cctv': 'store',
      '#/demo/store/offer/painting': 'store',
      '#/demo/store/offer/iphone': 'store',
      '#/demo/store/offer/external': 'store',
      '#/demo/store/offer/unavailable': 'store',
      '#/demo/store/securelink': 'store',
      '#/demo/store/securelink/customize': 'store',
      '#/demo/store/share': 'store',
      '#/demo/store/external-site': 'store',
      '#/demo/store/manage': 'store',
      '#/demo/store/manage/new-offer': 'store',
      '#/demo/store/manage/publish': 'store',
      '#/demo/store/offer-changed': 'store',
      '#/demo/store/to-agreement': 'store',
      '#/demo/community': 'community',
      '#/demo/community/explore': 'community',
      '#/demo/community/search': 'community',
      '#/demo/community/question': 'community',
      '#/demo/community/need': 'community',
      '#/demo/community/opportunity': 'community',
      '#/demo/community/work-story': 'community',
      '#/demo/community/discussion': 'community',
      '#/demo/community/person': 'community',
      '#/demo/community/business': 'community',
      '#/demo/community/store-offer': 'community',
      '#/demo/community/create': 'community',
      '#/demo/community/privacy-review': 'community',
      '#/demo/community/to-trade': 'community',
      '#/demo/community/source-changed': 'community',
      '#/demo/community/empty': 'community',
      '#/demo/community/circles': 'community',
      '#/demo/circle/construction': 'circle',
      '#/demo/circle/construction/members': 'circle',
      '#/demo/circle/construction/work': 'circle',
      '#/demo/circle/construction/opportunities': 'circle',
      '#/demo/circle/construction/economic-story': 'circle',
      '#/demo/circle/create': 'circle',
      '#/demo/circle/join': 'circle',
      '#/demo/circle/external-work': 'circle',
      '#/demo/circle/work-passed': 'circle',
      '#/demo/circle/no-match': 'circle',
      '#/demo/circle/source-to-trade': 'circle',
      '#/demo/circle/referral-provenance': 'circle',
      '#/demo/circle/source-chain': 'circle',
      '#/demo/trade/source-reference': 'community',
      '#/demo/trade/source-changed': 'community',
      '#/demo/help': 'ecosystem',
      '#/demo/referrals': 'ecosystem',
      '#/demo/referral/detail': 'ecosystem',
      '#/demo/plug': 'ecosystem',
      '#/demo/plug/introduction': 'ecosystem',
      '#/demo/master': 'ecosystem',
      '#/demo/master/request': 'ecosystem',
      '#/demo/master/opinion': 'ecosystem',
      '#/demo/partner': 'ecosystem',
      '#/demo/solution': 'ecosystem',
      '#/demo/solution/to-trade': 'ecosystem',
      '#/demo/agreement/solutions': 'ecosystem',
    };
    if (routeMap[hash]) {
      setView(routeMap[hash]);
      if (hash === '#/demo/agreement/waiting') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement/needs-me') setOpenAgreementId('agr-iphone');
      if (hash === '#/demo/agreement/completed') setOpenAgreementId('agr-kitchen');
      if (hash === '#/demo/agreement/changed') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement/cancelled') setOpenAgreementId('agr-cancelled');
      if (hash === '#/demo/agreement/expired') setOpenAgreementId('agr-expired');
      if (hash === '#/demo/agreement/stale') {
        setOpenAgreementId('agr-bathroom');
        setStaleViewedVersion('v1');
      }
      if (hash === '#/demo/dispute/isolate') setOpenDisputeId('dispute-a');
      if (hash === '#/demo/dispute/match') setOpenDisputeId('dispute-b');
      if (hash === '#/demo/dispute/master') setOpenDisputeId('dispute-c');
      if (hash === '#/demo/dispute/master-cost') setOpenDisputeId('dispute-d');
      if (hash === '#/demo/dispute/unresolved') setOpenDisputeId('dispute-e');
      if (hash === '#/demo/agreement-builder/milestones') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement-builder/simple') setOpenAgreementId('agr-iphone');
      if (hash === '#/demo/agreement-builder/actions') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement-builder/reminders') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement-builder/whatsapp-preview') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement-builder/dependency') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement-builder/evidence') setOpenAgreementId('agr-bathroom');
      if (hash === '#/demo/agreement-builder/dispute-isolation') setOpenDisputeId('dispute-a');
      if (hash === '#/demo/money') setOpenMoneyId(null);
      if (hash === '#/demo/money/not-ready') setOpenMoneyId('money-not-ready');
      if (hash === '#/demo/money/ready') setOpenMoneyId('money-ready');
      if (hash === '#/demo/money/payment-review') setOpenMoneyId('money-ready');
      if (hash === '#/demo/money/pending') setOpenMoneyId('money-pending');
      if (hash === '#/demo/money/confirmed') setOpenMoneyId('money-confirmed');
      if (hash === '#/demo/money/unknown') setOpenMoneyId('money-unknown');
      if (hash === '#/demo/money/failed') setOpenMoneyId('money-failed');
      if (hash === '#/demo/money/milestone') setOpenMoneyId('money-milestone');
      if (hash === '#/demo/money/dispute') setOpenMoneyId('money-dispute');
      if (hash === '#/demo/money/group') setOpenMoneyId('money-group');
      if (hash === '#/demo/money/stale') setOpenMoneyId('money-stale');
      if (hash === '#/demo/money/partially-ready') setOpenMoneyId('money-partially-ready');
      if (hash === '#/demo/money/blocked') setOpenMoneyId('money-blocked');
      if (hash === '#/demo/money/no-evaluation') setOpenMoneyId('money-no-evaluation');
      if (hash === '#/demo/money/ready-no-action') setOpenMoneyId('money-ready-no-action');
      if (hash === '#/demo/store') { setStoreSubView('home'); setOpenOfferId(null); setOpenStoreId(null); }
      if (hash === '#/demo/store/keyman-security') { setStoreSubView('profile'); setOpenStoreId('store-keyman'); }
      if (hash === '#/demo/store/offer/cctv') { setStoreSubView('offer'); setOpenOfferId('offer-cctv'); }
      if (hash === '#/demo/store/offer/painting') { setStoreSubView('offer'); setOpenOfferId('offer-painting'); }
      if (hash === '#/demo/store/offer/iphone') { setStoreSubView('offer'); setOpenOfferId('offer-iphone'); }
      if (hash === '#/demo/store/offer/external') { setStoreSubView('offer'); setOpenOfferId('offer-external'); }
      if (hash === '#/demo/store/offer/unavailable') { setStoreSubView('offer'); setOpenOfferId('offer-unavailable'); }
      if (hash === '#/demo/store/securelink') { setStoreSubView('offer'); setOpenOfferId('offer-cctv'); }
      if (hash === '#/demo/store/securelink/customize') { setStoreSubView('to-agreement'); setOpenOfferId('offer-cctv'); }
      if (hash === '#/demo/store/share') { setStoreSubView('offer'); setOpenOfferId('offer-cctv'); setShowShareSheet(true); }
      if (hash === '#/demo/store/external-site') { setStoreSubView('external'); setOpenOfferId('offer-cctv'); }
      if (hash === '#/demo/store/manage') { setStoreSubView('manage'); setOpenStoreId('store-keyman'); }
      if (hash === '#/demo/store/manage/new-offer') { setStoreSubView('create'); setOpenStoreId('store-painter'); }
      if (hash === '#/demo/store/manage/publish') { setStoreSubView('create'); setOpenStoreId('store-painter'); }
      if (hash === '#/demo/store/offer-changed') { setStoreSubView('changed'); setOpenOfferId('offer-cctv'); }
      if (hash === '#/demo/store/to-agreement') { setStoreSubView('to-agreement'); setOpenOfferId('offer-cctv'); }
      if (hash === '#/demo/community') { setCommunitySubView('home'); setOpenCommunityId(null); setOpenPersonId(null); setOpenBusinessId(null); }
      if (hash === '#/demo/community/explore') { setCommunitySubView('home'); }
      if (hash === '#/demo/community/search') { setCommunitySubView('home'); }
      if (hash === '#/demo/community/question') { setCommunitySubView('object'); setOpenCommunityId('co-question-1'); }
      if (hash === '#/demo/community/need') { setCommunitySubView('object'); setOpenCommunityId('co-need-1'); }
      if (hash === '#/demo/community/opportunity') { setCommunitySubView('object'); setOpenCommunityId('co-opp-1'); }
      if (hash === '#/demo/community/work-story') { setCommunitySubView('object'); setOpenCommunityId('co-story-1'); }
      if (hash === '#/demo/community/discussion') { setCommunitySubView('object'); setOpenCommunityId('co-disc-1'); }
      if (hash === '#/demo/community/person') { setCommunitySubView('person'); setOpenPersonId('person-peter'); }
      if (hash === '#/demo/community/business') { setCommunitySubView('business'); setOpenBusinessId('biz-keyman'); }
      if (hash === '#/demo/community/store-offer') { setCommunitySubView('object'); setOpenCommunityId('co-offer-ref-1'); }
      if (hash === '#/demo/community/create') { setCommunitySubView('create'); }
      if (hash === '#/demo/community/privacy-review') { setCommunitySubView('create'); }
      if (hash === '#/demo/community/to-trade') { setCommunitySubView('to-trade'); setOpenCommunityId('co-need-1'); }
      if (hash === '#/demo/community/source-changed') { setCommunitySubView('source-changed'); setOpenCommunityId('co-need-1'); }
      if (hash === '#/demo/community/empty') { setCommunitySubView('home'); }
      if (hash === '#/demo/community/circles') { setCommunitySubView('circles'); }
      if (hash === '#/demo/circle/construction') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-home'); }
      if (hash === '#/demo/circle/construction/members') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-members'); }
      if (hash === '#/demo/circle/construction/work') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-home'); }
      if (hash === '#/demo/circle/construction/opportunities') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-home'); }
      if (hash === '#/demo/circle/construction/economic-story') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-economic'); }
      if (hash === '#/demo/circle/create') { setView('circle'); setCommunitySubView('circle-create'); }
      if (hash === '#/demo/circle/join') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-join'); }
      if (hash === '#/demo/circle/external-work') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-home'); }
      if (hash === '#/demo/circle/work-passed') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-economic'); }
      if (hash === '#/demo/circle/no-match') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-home'); }
      if (hash === '#/demo/circle/source-to-trade') { setView('circle'); setOpenCircleId('circle-construction'); setCurrentSource(createSourceFromCommunityObject('co-opp-1', 'circle-construction', 'Peter Mwangi')); setCommunitySubView('source-to-trade'); }
      if (hash === '#/demo/circle/referral-provenance') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-economic'); }
      if (hash === '#/demo/circle/source-chain') { setView('circle'); setOpenCircleId('circle-construction'); setCommunitySubView('circle-economic'); }
      if (hash === '#/demo/trade/source-reference') { setCommunitySubView('source-to-trade'); setCurrentSource(createSourceFromOffer('offer-cctv', 'Peter Mwangi')); }
      if (hash === '#/demo/trade/source-changed') { setCommunitySubView('source-changed'); setOpenCommunityId('co-need-1'); }
      if (hash === '#/demo/help') { setView('ecosystem'); setEcoSubView('help'); }
      if (hash === '#/demo/referrals') { setView('ecosystem'); setEcoSubView('referrals'); }
      if (hash === '#/demo/referral/detail') { setView('ecosystem'); setEcoSubView('referrals'); }
      if (hash === '#/demo/plug') { setView('ecosystem'); setEcoSubView('plug'); setOpenPlugId('plug-peter'); }
      if (hash === '#/demo/plug/introduction') { setView('ecosystem'); setEcoSubView('plug'); setOpenPlugId('plug-peter'); }
      if (hash === '#/demo/master') { setView('ecosystem'); setEcoSubView('master'); setOpenMasterId('master-amani'); }
      if (hash === '#/demo/master/request') { setView('ecosystem'); setEcoSubView('master-request'); setOpenMasterId('master-amani'); }
      if (hash === '#/demo/master/opinion') { setView('ecosystem'); setEcoSubView('master-opinion'); }
      if (hash === '#/demo/partner') { setView('ecosystem'); setEcoSubView('partner'); setOpenPartnerId('partner-abc-inspection'); }
      if (hash === '#/demo/solution') { setView('ecosystem'); setEcoSubView('solution'); setOpenSolutionId('sol-inspection-construction'); }
      if (hash === '#/demo/solution/to-trade') { setView('ecosystem'); setEcoSubView('solution-to-trade'); setOpenSolutionId('sol-inspection-construction'); setCurrentSource(createSourceFromSolution('sol-inspection-construction')); }
      if (hash === '#/demo/agreement/solutions') { setView('ecosystem'); setEcoSubView('help'); }
    }
  }, []);

  const applyAgentReply = (reply: ReturnType<typeof mockAgent.respond>) => {
    setUnderstanding(reply.understanding);
    setAgentState(reply.agentState);
    setPanelTitle(reply.panelTitle);
    setPanelMode(reply.panelMode);
    if (reply.selectedProviderId !== undefined) {
      setSelectedProviderId(reply.selectedProviderId);
      contextRef.current.selectedProviderId = reply.selectedProviderId;
    }
    setLastRichResponses(reply.responses);

    const agentTurn: ConversationTurn = {
      id: nextId(),
      sender: 'agent',
      responses: reply.responses,
    };
    setTurns((prev) => [...prev, agentTurn]);
  };

  const handleStart = (text: string) => {
    setView('conversation');
    setAgentState('listening');

    const userTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'MESSAGE', text }],
    };
    setTurns([userTurn]);

    const intent = mockAgent.detectIntent(text);
    contextRef.current = { intent, step: 0, selectedProviderId: null };

    setIsThinking(true);
    setAgentState('thinking');

    const delay = intent === 'open' ? 700 : 1100;
    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respond(text, { intent, step: -1, selectedProviderId: null });
      applyAgentReply(reply);
    }, delay);
  };

  const handleSend = (text: string) => {
    const userTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'MESSAGE', text }],
    };
    setTurns((prev) => [...prev, userTurn]);

    setIsThinking(true);
    setAgentState('thinking');

    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respond(text, contextRef.current);
      contextRef.current.step += 1;
      applyAgentReply(reply);
    }, 900);
  };

  const handlePhotoUpload = (url: string) => {
    const photoTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'PHOTO', url, caption: 'Your bathroom' }],
    };
    setTurns((prev) => [...prev, photoTurn]);

    setIsThinking(true);
    setAgentState('finding');

    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respondToPhotoUpload(contextRef.current);
      contextRef.current.step += 1;
      applyAgentReply(reply);
    }, 1600);
  };

  const handlePhotoSkip = () => {
    const skipTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'MESSAGE', text: "I don't have one right now" }],
    };
    setTurns((prev) => [...prev, skipTurn]);

    setIsThinking(true);
    setAgentState('thinking');

    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respondToSkipPhoto(contextRef.current);
      contextRef.current.step += 1;
      applyAgentReply(reply);
    }, 800);
  };

  const handleChoice = (value: string) => {
    const choiceTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'MESSAGE', text: value.replace(/_/g, ' ') }],
    };
    setTurns((prev) => [...prev, choiceTurn]);

    setIsThinking(true);
    setAgentState('thinking');

    const isSearching = value === 'show_providers' || value === 'show_price' || value === 'compare_all';
    const baseDelay = isSearching ? 1200 : 800;

    setTimeout(() => {
      setIsThinking(false);
      if (isSearching) setAgentState('finding');
      const reply = mockAgent.respondToChoice(value, contextRef.current);
      applyAgentReply(reply);

      if (value === 'talk_to_peter') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 9;
            const quoteReply = mockAgent.advanceToQuote(contextRef.current);
            applyAgentReply(quoteReply);
            setTimeout(() => {
              setIsThinking(true);
              setAgentState('thinking');
              setTimeout(() => {
                setIsThinking(false);
                contextRef.current.step = 10;
                const agreementReply = mockAgent.advanceToAgreement(contextRef.current);
                applyAgentReply(agreementReply);
              }, 1400);
            }, 2400);
          }, 1200);
        }, 1800);
      }

      if (value === 'continue_with_this') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 11;
            const transitionReply = mockAgent.respondToChoice('continue_with_this', contextRef.current);
            applyAgentReply(transitionReply);
          }, 1100);
        }, 1600);
      }

      if (value === 'continue_securely') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            const authReply = mockAgent.advanceToIdentity(contextRef.current);
            applyAgentReply(authReply);
          }, 1100);
        }, 1300);
      }

      if (value === 'confirm_identity') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            if (contextRef.current.intent === 'recipient') {
              contextRef.current.step = 2;
              const joinReply = mockAgent.respondToChoice('confirm_identity', contextRef.current);
              applyAgentReply(joinReply);
            } else {
              contextRef.current.step = 13;
              const reviewReply = mockAgent.respondToChoice('confirm_identity', contextRef.current);
              applyAgentReply(reviewReply);
            }
          }, 1100);
        }, 1300);
      }

      if (value === 'set_securely') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 14;
            const sendReply = mockAgent.respondToChoice('set_securely', contextRef.current);
            applyAgentReply(sendReply);
          }, 1100);
        }, 1300);
      }

      if (value === 'send_to_peter') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 15;
            const sentReply = mockAgent.respondToChoice('send_to_peter', contextRef.current);
            applyAgentReply(sentReply);
          }, 1100);
        }, 1300);
      }

      if (value === 'join_agreement') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 3;
            const joinedReply = mockAgent.respondToChoice('join_agreement', contextRef.current);
            applyAgentReply(joinedReply);
          }, 1100);
        }, 1300);
      }

      if (value === 'confirm_acceptance') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 4;
            const establishedReply = mockAgent.respondToChoice('confirm_acceptance', contextRef.current);
            applyAgentReply(establishedReply);
          }, 1100);
        }, 1300);
      }

      if (value === 'need_change') {
        setTimeout(() => {
          setIsThinking(true);
          setAgentState('thinking');
          setTimeout(() => {
            setIsThinking(false);
            contextRef.current.step = 5;
            const changeReply = mockAgent.respondToChoice('need_change', contextRef.current);
            applyAgentReply(changeReply);
          }, 1100);
        }, 1300);
      }
    }, baseDelay);
  };

  const handleDateSelect = () => {
    const dateTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'MESSAGE', text: 'Before 20 October.' }],
    };
    setTurns((prev) => [...prev, dateTurn]);

    setIsThinking(true);
    setAgentState('thinking');

    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respond('date selected', contextRef.current);
      contextRef.current.step += 1;
      applyAgentReply(reply);
    }, 800);
  };

  const handleSelectProvider = (id: string) => {
    setSelectedProviderId(id);
    contextRef.current.selectedProviderId = id;

    setIsThinking(true);
    setAgentState('thinking');

    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respondToProviderSelect(id, contextRef.current);
      const intent = contextRef.current.intent || 'tiling';
      contextRef.current.step = intent === 'tiling' ? 7 : intent === 'plumbing' ? 3 : 2;
      applyAgentReply(reply);
    }, 900);
  };

  const handleOpenAgreement = (id: string) => {
    setOpenAgreementId(id);
    setView('agreement-detail');
    setAgentResponses([]);
    setStaleViewedVersion(null);
  };

  const handleOpenTakingShape = (_id: string) => {
    setView('conversation');
    setAgentState('listening');
    const userTurn: ConversationTurn = {
      id: nextId(),
      sender: 'user',
      responses: [{ type: 'MESSAGE', text: 'Continue talking to Grace about the solar installation' }],
    };
    setTurns([userTurn]);
    contextRef.current = { intent: 'open', step: 0, selectedProviderId: null };
    setIsThinking(true);
    setAgentState('thinking');
    setTimeout(() => {
      setIsThinking(false);
      const reply = mockAgent.respond('Continue talking to Grace about the solar installation', { intent: 'open', step: -1, selectedProviderId: null });
      applyAgentReply(reply);
    }, 900);
  };

  const handleViewCurrent = () => {
    setStaleViewedVersion(null);
  };

  const handleRaiseIssue = () => {
    setOpenDisputeId('dispute-a');
    setView('dispute');
    setAgentResponses([]);
  };

  const handleDisputeAgentAsk = (text: string) => {
    setAgentThinking(true);
    setTimeout(() => {
      setAgentThinking(false);
      const dispute = openDisputeId ? getDemoDispute(openDisputeId) : null;
      const response = answerDisputeQuery(text, dispute);
      setAgentResponses((prev) => [...prev, { text: response }]);
    }, 900);
  };

  const handleAgreementAgentAsk = (text: string) => {
    setAgentThinking(true);
    setTimeout(() => {
      setAgentThinking(false);
      const response = answerAgreementQuery(text, openAgreementId);
      setAgentResponses((prev) => [...prev, { text: response }]);
    }, 900);
  };

  const handleNavigate = (newView: AppView) => {
    if (newView === 'signed-in') {
      setView('signed-in');
      setTurns([]);
      setAgentState('resting');
    } else {
      setView(newView);
    }
  };

  if (view === 'signed-out') {
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <SignedOutHome onStart={handleStart} />
      </div>
    );
  }

  if (view === 'signed-in') {
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <SignedInHome
          onStart={handleStart}
          attentionItems={[...demoAttentionItems, ...disputeAttentionItems, ...actionAttentionItems, ...moneyAttentionItems, ...communityAttentionItems, ...ecosystemAttentionItems]}
          waitingItems={demoWaitingItems}
          recentActivity={demoRecentActivity}
          onOpenAgreement={handleOpenAgreement}
          onNavigateAgreements={() => setView('agreements')}
        />
      </div>
    );
  }

  if (view === 'agreements') {
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <AgreementHub agreements={demoAgreements} onOpenAgreement={handleOpenAgreement} onOpenTakingShape={handleOpenTakingShape} />
      </div>
    );
  }

  if (view === 'agreement-detail') {
    const detail = openAgreementId ? getDemoAgreementDetail(openAgreementId) : null;
    const structure = openAgreementId ? getDemoStructure(openAgreementId) : null;
    const moneyState = getDemoMoney('money-not-ready');
    const moneyForAgreement = detail && moneyState ? { ...moneyState, agreementLink: { ...moneyState.agreementLink, agreementId: detail.id, agreementTitle: detail.title, agreementVersion: detail.version, amount: detail.amount } } : null;
    if (!detail) {
      return (
        <div className="min-h-screen flex flex-col bg-cream-100">
          <NavBar view={view} onNavigate={handleNavigate} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[0.9rem] text-sand-500">Agreement unavailable.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <AgreementDetail
          detail={detail}
          onBack={() => setView('agreements')}
          onAskAgent={handleAgreementAgentAsk}
          isThinking={agentThinking}
          agentResponses={agentResponses}
          isStale={staleViewedVersion !== null}
          viewedVersion={staleViewedVersion || undefined}
          onViewCurrent={handleViewCurrent}
          onRaiseIssue={detail.status === 'active' || detail.status === 'change_requested' || detail.status === 'completed' ? handleRaiseIssue : undefined}
          onOpenMoney={(_id) => { setOpenMoneyId('money-not-ready'); setView('money'); }}
          money={moneyForAgreement}
          progress={structure ?? null}
        />
      </div>
    );
  }

  if (view === 'ecosystem') {
    const currentPlug = openPlugId ? getPlugById(openPlugId) : null;
    const currentMaster = openMasterId ? getMasterById(openMasterId) : null;
    const currentPartner = openPartnerId ? getPartnerById(openPartnerId) : null;
    const currentSolution = openSolutionId ? getSolutionById(openSolutionId) : null;

    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        {ecoSubView === 'help' && (
          <TradeHelpPanel
            onBack={() => setView('signed-in')}
            onPlugs={() => { setOpenPlugId('plug-peter'); setEcoSubView('plug'); }}
            onMasters={() => { setOpenMasterId('master-mwiti'); setEcoSubView('master'); }}
            onSolutions={() => { setOpenSolutionId('sol-inspection-construction'); setEcoSubView('solution'); }}
            onPartners={() => { setOpenPartnerId('partner-abc-inspection'); setEcoSubView('partner'); }}
            onAskAgent={() => setView('conversation')}
          />
        )}
        {ecoSubView === 'referrals' && (
          <ReferralHistoryView onBack={() => setEcoSubView('help')} />
        )}
        {ecoSubView === 'plug' && currentPlug && (
          <PlugProfileCard
            plug={currentPlug}
            onBack={() => setEcoSubView('help')}
            onIntroduce={() => setView('conversation')}
          />
        )}
        {ecoSubView === 'master' && currentMaster && (
          <MasterProfileCard
            master={currentMaster}
            onBack={() => setEcoSubView('help')}
            onRequest={() => setEcoSubView('master-request')}
          />
        )}
        {ecoSubView === 'master-request' && currentMaster && (
          <MasterRequestView
            master={currentMaster}
            request={demoMasterRequest}
            onBack={() => setEcoSubView('master')}
            onAppoint={() => setEcoSubView('master-opinion')}
          />
        )}
        {ecoSubView === 'master-opinion' && (
          <MasterOpinionView
            opinion={demoMasterOpinion}
            onBack={() => setEcoSubView('help')}
            onUseDirection={() => { setCurrentSource(createSourceFromMasterOpinion('mo-1')); setEcoSubView('solution-to-trade'); }}
          />
        )}
        {ecoSubView === 'partner' && currentPartner && (
          <PartnerProfileCard
            partner={currentPartner}
            onBack={() => setEcoSubView('help')}
            onOpenSolution={(solId) => { setOpenSolutionId(solId); setEcoSubView('solution'); }}
          />
        )}
        {ecoSubView === 'solution' && currentSolution && (
          <SolutionCard
            solution={currentSolution}
            onBack={() => { if (currentPartner) setEcoSubView('partner'); else setEcoSubView('help'); }}
            onUse={() => { setCurrentSource(createSourceFromSolution(currentSolution.solutionId)); setEcoSubView('solution-to-trade'); }}
          />
        )}
        {ecoSubView === 'solution-to-trade' && currentSource && (
          <SourceToTradeHandoff
            source={currentSource}
            onBack={() => setEcoSubView('solution')}
            onProceed={() => setView('conversation')}
          />
        )}
      </div>
    );
  }

  if (view === 'circle') {
    const currentCircle = openCircleId ? getCircleById(openCircleId) : null;

    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        {communitySubView === 'circle-home' && currentCircle && (
          <CircleHome
            circle={currentCircle}
            onBack={() => { setView('community'); setCommunitySubView('circles'); setOpenCircleId(null); }}
            onOpenMembers={() => setCommunitySubView('circle-members')}
            onOpenEconomicStory={() => setCommunitySubView('circle-economic')}
            onOpenObject={(id) => { setOpenCommunityId(id); setView('community'); setCommunitySubView('object'); }}
            onCreate={() => setCommunitySubView('circle-create')}
            onJoin={() => setCommunitySubView('circle-join')}
            onAskAgent={() => setView('conversation')}
          />
        )}
        {communitySubView === 'circle-members' && currentCircle && (
          <CircleMemberDirectory
            circle={currentCircle}
            onBack={() => setCommunitySubView('circle-home')}
            onOpenPerson={(personId) => { setOpenPersonId(personId); setView('community'); setCommunitySubView('person'); }}
          />
        )}
        {communitySubView === 'circle-economic' && currentCircle && (
          <CircleEconomicSummary circle={currentCircle} onBack={() => setCommunitySubView('circle-home')} />
        )}
        {communitySubView === 'circle-create' && (
          <CircleCreateFlow
            onBack={() => { setView('community'); setCommunitySubView('circles'); }}
            onPublish={() => { setView('community'); setCommunitySubView('circles'); }}
          />
        )}
        {communitySubView === 'circle-join' && currentCircle && (
          <CircleJoinFlow
            circle={currentCircle}
            onBack={() => setCommunitySubView('circle-home')}
            onJoin={() => { setCommunitySubView('circle-home'); }}
          />
        )}
        {communitySubView === 'source-to-trade' && currentSource && (
          <SourceToTradeHandoff
            source={currentSource}
            onBack={() => { setView('community'); setCommunitySubView('circle-home'); }}
            onProceed={() => setView('conversation')}
          />
        )}
      </div>
    );
  }

  if (view === 'community') {
    const currentObject = openCommunityId ? getCommunityObjectById(openCommunityId) : null;
    const currentPerson = openPersonId ? getPersonById(openPersonId) : null;
    const currentBusiness = openBusinessId ? getBusinessById(openBusinessId) : null;

    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        {communitySubView === 'home' && (
          <CommunityHome
            onOpenObject={(id) => { setOpenCommunityId(id); setCommunitySubView('object'); }}
            onOpenPerson={(id) => { setOpenPersonId(id); setCommunitySubView('person'); }}
            onOpenBusiness={(id) => { setOpenBusinessId(id); setCommunitySubView('business'); }}
            onCreate={() => setCommunitySubView('create')}
            onStartConversation={() => setView('conversation')}
            onOpenCircles={() => setCommunitySubView('circles')}
          />
        )}
        {communitySubView === 'circles' && (
          <CircleDiscoveryList
            onBack={() => setCommunitySubView('home')}
            onOpenCircle={(id) => { setOpenCircleId(id); setView('circle'); setCommunitySubView('circle-home'); }}
            onCreate={() => setCommunitySubView('circle-create')}
          />
        )}
        {communitySubView === 'object' && currentObject && (
          <CommunityObjectDetail
            object={currentObject}
            onBack={() => { setCommunitySubView('home'); setOpenCommunityId(null); }}
            onICanHelp={() => setView('conversation')}
            onDiscuss={() => setView('conversation')}
            onViewOffer={(offerId) => { setOpenOfferId(offerId); setView('store'); setStoreSubView('offer'); }}
            onToTrade={() => { setCommunitySubView('to-trade'); }}
          />
        )}
        {communitySubView === 'person' && currentPerson && (
          <CommunityPersonProfile
            person={currentPerson}
            onBack={() => { setCommunitySubView('home'); setOpenPersonId(null); }}
            onViewBusiness={(_id) => { setOpenBusinessId('biz-keyman'); setCommunitySubView('business'); }}
            onMessage={() => setView('conversation')}
          />
        )}
        {communitySubView === 'business' && currentBusiness && (
          <CommunityBusinessProfile
            business={currentBusiness}
            onBack={() => { setCommunitySubView('home'); setOpenBusinessId(null); }}
            onViewStore={(storeId) => { setOpenStoreId(storeId); setView('store'); setStoreSubView('profile'); }}
            onMessage={() => setView('conversation')}
          />
        )}
        {communitySubView === 'create' && (
          <CommunityComposer
            onBack={() => { setCommunitySubView('home'); }}
            onPublish={() => { setCommunitySubView('home'); }}
          />
        )}
        {communitySubView === 'to-trade' && currentObject && (
          <CommunityToTradeHandoff
            object={currentObject}
            helperName={currentObject.responses.find((r) => r.kind === 'i_can_help')?.author}
            onBack={() => { setCommunitySubView('object'); }}
            onProceed={() => setView('conversation')}
          />
        )}
        {communitySubView === 'source-changed' && currentObject && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
              <button onClick={() => setCommunitySubView('home')} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
                ← Back to Community
              </button>
              <CommunitySourceChanged oldText="Budget KES 50,000" newText="Budget KES 65,000" onRefresh={() => setCommunitySubView('object')} />
            </div>
          </div>
        )}
        {communitySubView === 'source-to-trade' && currentSource && (
          <SourceToTradeHandoff
            source={currentSource}
            onBack={() => setCommunitySubView('home')}
            onProceed={() => setView('conversation')}
          />
        )}
      </div>
    );
  }

  if (view === 'store') {
    const currentOffer = openOfferId ? getOfferById(openOfferId) : null;
    const currentStore = openStoreId ? getStoreById(openStoreId) : null;

    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        {storeSubView === 'home' && (
          <StoreHome
            onOpenOffer={(id) => { setOpenOfferId(id); setStoreSubView('offer'); }}
            onOpenStore={(id) => { setOpenStoreId(id); setStoreSubView('profile'); }}
            onManageStore={() => { setOpenStoreId('store-keyman'); setStoreSubView('manage'); }}
            onCreateOffer={() => { setOpenStoreId('store-painter'); setStoreSubView('create'); }}
            onStartConversation={() => setView('conversation')}
            offers={searchOffers(storeQuery).filter((o) => o.lifecycle === 'published')}
            stores={demoStores}
            query={storeQuery}
            onQueryChange={setStoreQuery}
          />
        )}
        {storeSubView === 'profile' && currentStore && (
          <StoreProfileView
            store={currentStore}
            offers={getOffersByStore(currentStore.id)}
            onBack={() => { setStoreSubView('home'); setOpenStoreId(null); }}
            onOpenOffer={(id) => { setOpenOfferId(id); setStoreSubView('offer'); }}
          />
        )}
        {storeSubView === 'offer' && currentOffer && (
          <>
            <OfferDetail
              offer={currentOffer}
              onBack={() => { setStoreSubView('home'); setOpenOfferId(null); }}
              onInterested={() => setView('conversation')}
              onUseThis={() => { setStoreSubView('to-agreement'); }}
              onAskSecurePay={() => setView('conversation')}
              onShare={() => setShowShareSheet(true)}
              onViewStore={(id) => { setOpenStoreId(id); setStoreSubView('profile'); }}
            />
            {showShareSheet && (
              <SecureLinkShareSheet offer={currentOffer} onClose={() => setShowShareSheet(false)} />
            )}
          </>
        )}
        {storeSubView === 'manage' && currentStore && (
          <StoreManagementHome
            store={currentStore}
            offers={getOffersByStore(currentStore.id)}
            activity={demoStoreActivity}
            enquiries={demoEnquiries}
            onBack={() => { setStoreSubView('home'); setOpenStoreId(null); }}
            onCreateOffer={() => setStoreSubView('create')}
          />
        )}
        {storeSubView === 'create' && (
          <OfferBuilderView
            draft={offerDraft}
            availabilityOptions={availabilityOptionsFor(offerDraft.kind)}
            busy={false}
            error={null}
            isEditing={false}
            onChange={(patch) => setOfferDraft((prev) => ({ ...prev, ...patch }))}
            onBack={() => { setOfferDraft(emptyOfferDraft); setStoreSubView('manage'); }}
            onSubmit={() => { setOfferDraft(emptyOfferDraft); setStoreSubView('manage'); }}
          />
        )}
        {storeSubView === 'external' && currentOffer && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
              <button onClick={() => setStoreSubView('offer')} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
                ← Back to offer
              </button>
              <ExternalOfferPreview offer={currentOffer} />
            </div>
          </div>
        )}
        {storeSubView === 'to-agreement' && currentOffer && (
          <OfferToTradeHandoff
            offer={currentOffer}
            onBack={() => setStoreSubView('offer')}
            onProceed={() => setView('conversation')}
          />
        )}
        {storeSubView === 'changed' && currentOffer && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
              <button onClick={() => setStoreSubView('offer')} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
                ← Back to offer
              </button>
              <OfferChangedState oldPrice="KES 85,000" newPrice="KES 90,000" hasAdopted={false} onRefresh={() => setStoreSubView('offer')} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'money') {
    if (openMoneyId) {
      const money = getDemoMoney(openMoneyId);
      if (!money) {
        return (
          <div className="min-h-screen flex flex-col bg-cream-100">
            <NavBar view={view} onNavigate={handleNavigate} />
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[0.9rem] text-sand-500">Money state unavailable.</p>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex flex-col bg-cream-100">
          <NavBar view={view} onNavigate={handleNavigate} />
          <MoneyWorkspace detail={money} onBack={() => { setOpenMoneyId(null); setView('money'); }} />
        </div>
      );
    }
    const moneyItems = Object.values(demoMoneyStates).filter((m) => m.agreementLink.agreementTitle);
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <MoneyHome
          items={moneyItems}
          onOpenMoney={(id) => { setOpenMoneyId(id); }}
          onStartConversation={() => setView('conversation')}
        />
      </div>
    );
  }

  if (view === 'agreement-builder') {
    const structure = openAgreementId ? getDemoStructure(openAgreementId) : null;
    const detail = openAgreementId ? getDemoAgreementDetail(openAgreementId) : null;
    if (!structure || !detail) {
      return (
        <div className="min-h-screen flex flex-col bg-cream-100">
          <NavBar view={view} onNavigate={handleNavigate} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[0.9rem] text-sand-500">Agreement structure unavailable.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <AgreementBuilderView
          structure={structure}
          agreementTitle={detail.title}
          onBack={() => setView('agreements')}
        />
      </div>
    );
  }

  if (view === 'dispute') {
    const dispute = openDisputeId ? getDemoDispute(openDisputeId) : null;
    if (!dispute) {
      return (
        <div className="min-h-screen flex flex-col bg-cream-100">
          <NavBar view={view} onNavigate={handleNavigate} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[0.9rem] text-sand-500">Dispute unavailable.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col bg-cream-100">
        <NavBar view={view} onNavigate={handleNavigate} />
        <DisputeWorkspace
          dispute={dispute}
          onBack={() => setView('agreement-detail')}
          onAskAgent={handleDisputeAgentAsk}
          isThinking={agentThinking}
          agentResponses={agentResponses}
        />
      </div>
    );
  }

  // Conversation view
  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <NavBar view={view} onNavigate={handleNavigate} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 md:flex-[1.35] flex flex-col min-w-0 bg-cream-50">
          <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-cream-200/60">
            <AgentIcon state={agentState} size={28} />
            <div>
              <div className="font-display text-sm text-forest-800">SecurePay</div>
              <div className="text-[0.7rem] text-sand-500 capitalize">
                {isThinking
                  ? agentState === 'finding' ? 'looking' : 'thinking'
                  : agentState === 'needs_you' ? 'needs you' : agentState}
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-hidden">
            <ConversationWorkspace
              turns={turns}
              understanding={understanding}
              isThinking={isThinking}
              onSend={handleSend}
              selectedProviderId={selectedProviderId}
              onSelectProvider={handleSelectProvider}
              onPhotoUpload={handlePhotoUpload}
              onPhotoSkip={handlePhotoSkip}
              onDateSelect={handleDateSelect}
              onChoice={handleChoice}
            />
          </div>
        </div>

        <div className="hidden md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-100/50 min-w-0">
          <ContextPanel
            lastRichResponses={lastRichResponses}
            understanding={understanding}
            selectedProviderId={selectedProviderId}
            onSelectProvider={handleSelectProvider}
            panelTitle={panelTitle}
            panelMode={panelMode}
            onChoice={handleChoice}
          />
        </div>
      </div>
    </div>
  );
}

function answerAgreementQuery(query: string, agreementId: string | null): string {
  const detail = agreementId ? getDemoAgreementDetail(agreementId) : null;
  if (!detail) return 'I can\'t find that agreement right now.';

  const q = query.toLowerCase();

  if (q.includes('defect')) {
    const defectCondition = detail.conditions.find((c) => c.toLowerCase().includes('defect'));
    return defectCondition
      ? `For this agreement: ${defectCondition}.`
      : 'Defect correction has not been settled in this agreement yet.';
  }
  if (q.includes('quote') || q.includes('quotation')) {
    const quoteDoc = detail.documents.find((d) => d.type === 'Quotation');
    return quoteDoc
      ? `${quoteDoc.filename} was added by ${quoteDoc.source} on ${quoteDoc.date}.`
      : 'No quotation has been added to this agreement.';
  }
  if (q.includes('change') || q.includes('version') || q.includes('v1') || q.includes('v2')) {
    if (detail.changes.length > 0) {
      const c = detail.changes[0];
      return `${c.field} changed from ${c.from} to ${c.to}, requested by ${c.requestedBy} on ${c.date}. Status: ${c.status}.`;
    }
    return 'No changes have been requested for this agreement.';
  }
  if (q.includes('confirm') || q.includes('who') || q.includes('people')) {
    const confirmed = detail.people.filter((p) => p.confirmationStatus === 'confirmed_current');
    const unconfirmed = detail.people.filter((p) => p.confirmationStatus !== 'confirmed_current');
    return `${confirmed.map((p) => p.name).join(' and ')} confirmed the current version. ${unconfirmed.length > 0 ? unconfirmed.map((p) => `${p.name} has not yet confirmed.`).join(' ') : ''}`;
  }
  if (q.includes('completion') || q.includes('date') || q.includes('when')) {
    return `The completion date is ${detail.completion}.`;
  }
  if (q.includes('price') || q.includes('amount') || q.includes('money') || q.includes('pay')) {
    return `The agreed amount is ${detail.price}.`;
  }
  if (q.includes('document')) {
    return detail.documents.length > 0
      ? `There are ${detail.documents.length} documents: ${detail.documents.map((d) => d.filename).join(', ')}.`
      : 'No documents are connected to this agreement.';
  }
  if (q.includes('activity') || q.includes('history') || q.includes('happen')) {
    const recent = detail.activity.slice(-3).reverse();
    return recent.map((a) => `${a.date}: ${a.text}`).join(' · ');
  }

  return `This is the ${detail.title} agreement. Current version: ${detail.version}. Status: ${detail.statusLabel}.`;
}

function answerDisputeQuery(query: string, dispute: { scope: { disputedArea: string; disputedObligation: string; disputedAmount: string }; masterOpinion?: string; resolution?: string; step: string } | null | undefined): string {
  if (!dispute) return 'I can\'t find that dispute right now.';
  const q = query.toLowerCase();
  if (q.includes('scope') || q.includes('disputed') || q.includes('what') || q.includes('isolat')) {
    return `The disputed scope is: ${dispute.scope.disputedObligation} — ${dispute.scope.disputedArea}. Amount connected: ${dispute.scope.disputedAmount}.`;
  }
  if (q.includes('master') || q.includes('expert') || q.includes('opinion')) {
    return dispute.masterOpinion || 'No Master opinion has been issued yet.';
  }
  if (q.includes('resolut') || q.includes('settle') || q.includes('agreed')) {
    return dispute.resolution || 'No resolution has been reached yet.';
  }
  if (q.includes('amount') || q.includes('money') || q.includes('pay')) {
    return `The disputed amount is ${dispute.scope.disputedAmount}. The rest of the agreement is separate from this dispute.`;
  }
  if (q.includes('agent') || q.includes('securepay') || q.includes('help')) {
    return 'I can help explain the agreement, isolate the issue, summarize positions, and explain the Master process. I cannot decide who is right, force a resolution, or alter Money state.';
  }
  return `This dispute is about ${dispute.scope.disputedArea}. Current step: ${dispute.step}.`;
}

export default App;
