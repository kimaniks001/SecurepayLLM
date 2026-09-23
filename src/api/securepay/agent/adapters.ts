import { discoveryView, type DiscoveryView } from './discovery';
import { instrumentComponentView, type InstrumentPromptView, type UnavailableInputView } from './instruments';
import type { MessageResponse } from '../../../types';
import { ApiError } from '../http';
import type { AgentAgreementsHomeFocus, AgentAgreementsHomeViewDto, AgentAgreementWorkspaceFocus, AgentAgreementWorkspaceViewDto, AgentResponseDto, AgreementReviewResponseDto, AgreementSufficiencyDto, AgreementSufficiencyState, ComponentDto, HandoffDto, HandoffOpenMatterDto, HandoffStatus, OpenMatterDto, ReviewedSourceDto, ReviewFactDto, SavedBuildDto, TradeContextDto } from './dto';

export interface PreviewView {
  type: 'AGREEMENT_PREVIEW';
  what: string[]; who: string[]; money: string[]; when: string[];
  stillToSettle: string[]; disclaimer: string;
}
export interface AgreementWorkspaceComponentView { type: 'AGREEMENT_WORKSPACE'; workspace: AgentAgreementWorkspaceViewDto }
export interface AgreementsHomeComponentView { type: 'AGREEMENTS_HOME'; home: AgentAgreementsHomeViewDto }
// KS001 Upgrade Phase 1 final integration fix -- DISCOVERY OFFERED (KS001 said it can help find this
// specific, real entity), never DISCOVERY INVITED (the person's own explicit accept -- see
// AgentState#offeredDiscoveryEntityIds / ContextView#interactionState). The backend already verified
// targetEntityId names a real, currently active entity before this component ever reached the wire.
export interface DiscoveryOfferComponentView { type: 'DISCOVERY_OFFER'; targetEntityId: string }
export type AgentComponentView = MessageResponse | PreviewView | DiscoveryView | AgreementWorkspaceComponentView | AgreementsHomeComponentView | DiscoveryOfferComponentView | InstrumentPromptView | UnavailableInputView;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

// Final Phase 3 question-focused pass: the server is the sole owner of which focus was actually
// applied -- the frontend never infers focus from the question text. It only validates that the
// server's echoed value is one of the known enum members, falling back to FULL (the always-safe,
// fully-populated shape) on anything else, matching the backend's own safe-fallback doctrine.
const WORKSPACE_FOCUS_VALUES = new Set<AgentAgreementWorkspaceFocus>(
  ['FULL', 'OVERVIEW', 'NEXT_ACTIONS', 'MILESTONES', 'EVIDENCE', 'CALENDAR', 'MONEY', 'PROBLEMS', 'TAGS', 'ACTIVITY']);
const HOME_FOCUS_VALUES = new Set<AgentAgreementsHomeFocus>(
  ['FULL', 'NEEDS_ATTENTION', 'WAITING', 'PROBLEMS', 'RECENTLY_COMPLETED', 'UPCOMING', 'RECENT_ACTIVITY', 'MONEY', 'TAGGED']);
const workspaceFocus = (value: unknown): AgentAgreementWorkspaceFocus =>
  typeof value === 'string' && WORKSPACE_FOCUS_VALUES.has(value as AgentAgreementWorkspaceFocus) ? (value as AgentAgreementWorkspaceFocus) : 'FULL';
const homeFocus = (value: unknown): AgentAgreementsHomeFocus =>
  typeof value === 'string' && HOME_FOCUS_VALUES.has(value as AgentAgreementsHomeFocus) ? (value as AgentAgreementsHomeFocus) : 'FULL';

/**
 * Final Phase 3 correction (Section 17): parses the raw, server-composed AGREEMENT_WORKSPACE/
 * AGREEMENTS_HOME component data into the SAME typed shapes AgentUnderstoodCard already renders --
 * this is a presentation adapter only; it validates shape, it never fabricates a value. A
 * malformed/unexpected shape falls through to the "unsupported card, keep the surrounding text"
 * doctrine, matching every other component type here.
 */
function agreementWorkspaceView(data: Record<string, unknown>): AgentAgreementWorkspaceViewDto | null {
  if (typeof data.title !== 'string' || typeof data.status !== 'string' || typeof data.version !== 'number'
    || !isArray(data.milestones) || !isArray(data.moneyPositions) || !isArray(data.upcomingEvents)
    || !strings(data.tags) || !isArray(data.problems) || !isArray(data.evidence) || !isArray(data.activity)) {
    return null;
  }
  return {
    focus: workspaceFocus(data.focus),
    title: data.title, status: data.status, version: data.version,
    milestones: data.milestones as AgentAgreementWorkspaceViewDto['milestones'],
    moneyPositions: data.moneyPositions as AgentAgreementWorkspaceViewDto['moneyPositions'],
    upcomingEvents: data.upcomingEvents as AgentAgreementWorkspaceViewDto['upcomingEvents'],
    tags: data.tags,
    problems: data.problems as AgentAgreementWorkspaceViewDto['problems'],
    evidence: data.evidence as AgentAgreementWorkspaceViewDto['evidence'],
    activity: data.activity as AgentAgreementWorkspaceViewDto['activity'],
  };
}
function agreementsHomeView(data: Record<string, unknown>): AgentAgreementsHomeViewDto | null {
  if (!isArray(data.needsAttention) || !isArray(data.waitingOnOthers) || !isArray(data.problems)
    || !isArray(data.recentlyCompleted) || !isArray(data.upcoming) || !isArray(data.recentActivity)
    || !isArray(data.moneyByCurrency)) {
    return null;
  }
  return {
    focus: homeFocus(data.focus),
    needsAttention: data.needsAttention as AgentAgreementsHomeViewDto['needsAttention'],
    waitingOnOthers: data.waitingOnOthers as AgentAgreementsHomeViewDto['waitingOnOthers'],
    problems: data.problems as AgentAgreementsHomeViewDto['problems'],
    recentlyCompleted: data.recentlyCompleted as AgentAgreementsHomeViewDto['recentlyCompleted'],
    upcoming: data.upcoming as AgentAgreementsHomeViewDto['upcoming'],
    recentActivity: data.recentActivity as AgentAgreementsHomeViewDto['recentActivity'],
    moneyByCurrency: data.moneyByCurrency as AgentAgreementsHomeViewDto['moneyByCurrency'],
  };
}

/** A presentation adapter, never an Agreement or action dispatcher. Unsupported cards preserve the surrounding text. */
export function agentComponentView(component: ComponentDto): AgentComponentView | null {
  if (!component || typeof component.data !== 'object' || component.data === null) return null;
  const data = component.data;
  if (component.type === 'MESSAGE' && typeof data.text === 'string') return { type: 'MESSAGE', text: data.text };
  if (component.type === 'AGREEMENT_PREVIEW' && strings(data.what) && strings(data.who) && strings(data.money) && strings(data.when) && strings(data.stillWorthSettling) && typeof data.disclaimer === 'string') {
    return { type: 'AGREEMENT_PREVIEW', what: data.what, who: data.who, money: data.money, when: data.when, stillToSettle: data.stillWorthSettling, disclaimer: data.disclaimer };
  }
  if (component.type === 'AGREEMENT_WORKSPACE') {
    const workspace = agreementWorkspaceView(data);
    return workspace ? { type: 'AGREEMENT_WORKSPACE', workspace } : null;
  }
  if (component.type === 'AGREEMENTS_HOME') {
    const home = agreementsHomeView(data);
    return home ? { type: 'AGREEMENTS_HOME', home } : null;
  }
  if (component.type === 'DISCOVERY_OFFER') {
    return typeof data.targetEntityId === 'string' && data.targetEntityId.length > 0
      ? { type: 'DISCOVERY_OFFER', targetEntityId: data.targetEntityId }
      : null;
  }
  // Phase 1: the safe, model-proposable input affordances (PERSON_PICKER, DATE_PICKER, AMOUNT_INPUT, ...).
  const instrument = instrumentComponentView(component);
  if (instrument) return instrument;
  return discoveryView(component);
}
export function agentResponseView(dto: AgentResponseDto) {
  if (typeof dto?.message !== 'string') throw new ApiError('invalid-response', 'Agent response is missing its message');
  const components = (values: unknown) => (Array.isArray(values) ? values : []).map(agentComponentView).filter((value): value is AgentComponentView => value !== null);
  const parsedComponents = components(dto.components ?? []);
  return {
    message: { type: 'MESSAGE', text: dto.message } satisfies MessageResponse,
    components: parsedComponents,
    panel: dto.contextualPanel && typeof dto.contextualPanel.title === 'string' ? { title: dto.contextualPanel.title, components: components(dto.contextualPanel.components ?? []) } : null,
    contextUpdates: dto.contextUpdates,
    // Guidance only; never forward these to a consequential endpoint automatically.
    suggestedActions: dto.suggestedActions,
    // KS001 Upgrade Phase 1 final integration fix -- every real, server-verified DISCOVERY_OFFER this
    // turn, so the controller can record DISCOVERY OFFERED as session-local state (never DISCOVERY
    // INVITED -- only the person's own explicit accept ever transitions that).
    offeredDiscoveryEntityIds: parsedComponents
      .filter((component): component is DiscoveryOfferComponentView => component.type === 'DISCOVERY_OFFER')
      .map(component => component.targetEntityId),
  };
}

/**
 * Retain IDs, qualifiers/provenance and the original state; unknown state is never confirmed.
 *
 * The backend serialises with `default-property-inclusion: non_null`, so a relationship with no
 * object entity (every ROLE, PAYMENT_CONDITION and CONDITION the Agent produces) OMITS
 * `objectEntityId`. Requiring it to be a string rejected every real Trade Context that held one.
 */
export function tradeContextView(dto: TradeContextDto) {
  const stringMap = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(item => typeof item === 'string');
  if (!dto || typeof dto.conversationId !== 'string' || !Number.isSafeInteger(dto.version)
    || !Array.isArray(dto.entities) || !Array.isArray(dto.relationships)
    || dto.entities.some(entity => !entity || typeof entity.id !== 'string' || typeof entity.type !== 'string' || typeof entity.name !== 'string' || typeof entity.state !== 'string' || !stringMap(entity.attributes))
    || dto.relationships.some(relation => !relation || typeof relation.id !== 'string' || typeof relation.kind !== 'string' || typeof relation.subjectEntityId !== 'string' || (relation.objectEntityId != null && typeof relation.objectEntityId !== 'string') || typeof relation.state !== 'string' || !stringMap(relation.qualifiers))) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Trade Context. Please refresh.');
  }
  const facts = [
    ...dto.entities.map(entity => ({ id: entity.id, targetKind: 'ENTITY' as const, label: entity.type, value: entity.name, state: entity.state, provenance: entity.attributes })),
    ...dto.relationships.map(relation => ({ id: relation.id, targetKind: 'RELATIONSHIP' as const, label: relation.kind, value: { subjectId: relation.subjectEntityId, objectId: relation.objectEntityId ?? null }, state: relation.state, provenance: relation.qualifiers })),
  ];
  // KS001 Upgrade Phase 1 final integration fix -- bounded discovery interaction state (never a Trade
  // Context attribute). Absent/malformed is treated the same as an empty list (a legacy conversation
  // persisted before this field existed, or an unrecognized shape), never an error -- this is presentation
  // state, not a fact SecurePay is asserting.
  const discoveryInvitedEntityIds = dto.interactionState && Array.isArray(dto.interactionState.discoveryInvitedEntityIds)
    && dto.interactionState.discoveryInvitedEntityIds.every(id => typeof id === 'string')
    ? dto.interactionState.discoveryInvitedEntityIds
    : [];
  // Phase 1: the raw (already validated) records are retained for the workbench projection, which
  // needs entity types, relationship kinds and qualifiers -- not the flattened `facts` list.
  return { conversationId: dto.conversationId, version: dto.version, facts,
    entities: dto.entities, relationships: dto.relationships.map(relation => ({ ...relation, objectEntityId: relation.objectEntityId ?? null })),
    candidates: facts.filter(fact => fact.state === 'CANDIDATE'),
    confirmed: facts.filter(fact => fact.state === 'CONFIRMED'),
    interactionState: { discoveryInvitedEntityIds },
    // KS001 Upgrade Phase 2 (Section 5/8/23) -- the server-owned sufficiency projection driving
    // Review/Save/Set gating and the "Still to decide" workbench section.
    sufficiency: agreementSufficiencyView(dto.sufficiency),
  };
}
const handoffStatuses: readonly string[] = ['IDENTITY_REQUIRED', 'NEEDS_RESOLUTION', 'REVIEW_STALE', 'READY_FOR_REVIEW', 'READY_TO_PROGRESS', 'PROGRESSED', 'EXPIRED'];
const sufficiencyStates: readonly string[] = ['BUILDING', 'REVIEWABLE_WITH_OPEN_ITEMS', 'UNDERSTOOD'];

/**
 * KS001 Upgrade Phase 2 (Section 5/8/23) -- the ONE place this projection is parsed. A missing/malformed
 * `sufficiency` (a legacy conversation persisted before this field existed) degrades to the same safe
 * default the model's own "no endless questioning" doctrine assumes worst-case: BUILDING, review not yet
 * offered, save always allowed, set never allowed until the server actually says so. This is presentation
 * defensiveness only -- it never overrides a real, present server value.
 */
function agreementSufficiencyView(dto: AgreementSufficiencyDto | undefined) {
  const openMatter = (matter: OpenMatterDto) => ({ code: matter.code, description: matter.description });
  if (!dto || typeof dto.canReview !== 'boolean' || typeof dto.canSave !== 'boolean' || typeof dto.canSet !== 'boolean') {
    return { state: 'BUILDING' as AgreementSufficiencyState, canReview: false, canSave: true, canSet: false, mustResolve: [], stillToDecide: [], guidanceNotes: [] };
  }
  return {
    state: (sufficiencyStates.includes(dto.state) ? dto.state : 'BUILDING') as AgreementSufficiencyState,
    canReview: dto.canReview, canSave: dto.canSave, canSet: dto.canSet,
    mustResolve: Array.isArray(dto.mustResolve) ? dto.mustResolve.map(openMatter) : [],
    stillToDecide: Array.isArray(dto.stillToDecide) ? dto.stillToDecide.map(openMatter) : [],
    guidanceNotes: Array.isArray(dto.guidanceNotes) ? dto.guidanceNotes.filter((note): note is string => typeof note === 'string') : [],
  };
}
export type AgreementSufficiencyView = ReturnType<typeof agreementSufficiencyView>;

function reviewFactsView(facts: unknown): { description: string; confirmed: boolean }[] {
  if (!Array.isArray(facts)) return [];
  return (facts as ReviewFactDto[])
    .filter((fact): fact is ReviewFactDto => !!fact && typeof fact.description === 'string' && typeof fact.state === 'string')
    .map(fact => ({ description: fact.description, confirmed: fact.state === 'CONFIRMED' }));
}

/** KS001 Upgrade Phase 2 (Sections 14-17) -- the saved-build list/resume view. */
export function savedBuildView(dto: SavedBuildDto) {
  return {
    savedBuildId: dto.savedBuildId, conversationId: dto.conversationId, title: dto.title,
    sufficiencyState: (sufficiencyStates.includes(dto.sufficiencyState) ? dto.sufficiencyState : 'BUILDING') as AgreementSufficiencyState,
    openMatterCount: dto.openMatterCount, savedAt: dto.savedAt, buildUpdatedAt: dto.buildUpdatedAt,
  };
}
export type SavedBuildView = ReturnType<typeof savedBuildView>;

/**
 * Final Phase 4 Economy Turn 3 (Section 6/7) -- the reviewed commercial source is presentation/
 * provenance only (never Agreement/participant/payment authority — see the response's own
 * doctrine). Passed through as-is; the view layer decides how to render `sourceStatus`.
 */
export function reviewedSourceView(dto: ReviewedSourceDto | null) {
  return dto;
}
export type ReviewedSourceView = ReturnType<typeof reviewedSourceView>;

export function agreementReviewView(dto: AgreementReviewResponseDto) {
  return {
    candidate: dto.agreementCandidateSummary,
    // KS001 Upgrade Phase 2 (Section 10), broadened by the final convergence correction (item 5) --
    // confirmed-vs-candidate truth across every review-worthy fact, structurally separate from the
    // authoritative `candidate` fields (title/amount/currency) that Set Up Agreement actually reads.
    who: reviewFactsView(dto.who), responsibilities: reviewFactsView(dto.responsibilities),
    money: reviewFactsView(dto.money), when: reviewFactsView(dto.when),
    conditions: reviewFactsView(dto.conditions), authority: reviewFactsView(dto.authority),
    reviewedSource: reviewedSourceView(dto.reviewedSource),
  };
}

function openMatterDescriptions(matters: unknown): string[] {
  if (!Array.isArray(matters)) return [];
  return (matters as HandoffOpenMatterDto[])
    .filter((matter): matter is HandoffOpenMatterDto => !!matter && typeof matter.description === 'string')
    .map(matter => matter.description);
}

export function handoffView(dto: HandoffDto) {
  return {
    id: dto.handoffId,
    status: handoffStatuses.includes(dto.status) ? dto.status as HandoffStatus : 'UNKNOWN' as const,
    candidate: dto.agreementCandidateSummary,
    reviewedSource: reviewedSourceView(dto.reviewedSource),
    // KS001 Upgrade Phase 2 final convergence correction (item 1/2) -- mustResolve is the ONLY thing that
    // may ever disable Set Up Agreement; stillToDecide is always visible, never blocking (Section 8).
    mustResolve: openMatterDescriptions(dto.mustResolve), stillToDecide: openMatterDescriptions(dto.stillToDecide),
    guidanceNotes: dto.guidanceNotes,
    reviewSnapshot: { expectedTradeContextVersion: dto.tradeContextVersion, expectedCandidateDigest: dto.candidateDigest },
    expiresAt: dto.expiresAt, progressedAgreementId: dto.progressedAgreementId,
  };
}
