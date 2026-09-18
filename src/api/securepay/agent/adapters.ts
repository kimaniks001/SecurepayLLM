import { discoveryView, type DiscoveryView } from './discovery';
import type { MessageResponse } from '../../../types';
import { ApiError } from '../http';
import type { AgentAgreementsHomeFocus, AgentAgreementsHomeViewDto, AgentAgreementWorkspaceFocus, AgentAgreementWorkspaceViewDto, AgentResponseDto, ComponentDto, HandoffDto, HandoffStatus, TradeContextDto } from './dto';

export interface PreviewView {
  type: 'AGREEMENT_PREVIEW';
  what: string[]; who: string[]; money: string[]; when: string[];
  stillToSettle: string[]; disclaimer: string;
}
export interface AgreementWorkspaceComponentView { type: 'AGREEMENT_WORKSPACE'; workspace: AgentAgreementWorkspaceViewDto }
export interface AgreementsHomeComponentView { type: 'AGREEMENTS_HOME'; home: AgentAgreementsHomeViewDto }
export type AgentComponentView = MessageResponse | PreviewView | DiscoveryView | AgreementWorkspaceComponentView | AgreementsHomeComponentView;
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
  if (typeof data.title !== 'string' || typeof data.status !== 'string'
    || !isArray(data.milestones) || !isArray(data.moneyPositions) || !isArray(data.upcomingEvents)
    || !strings(data.tags) || !isArray(data.problems) || !isArray(data.evidence)) {
    return null;
  }
  return {
    focus: workspaceFocus(data.focus),
    title: data.title, status: data.status,
    milestones: data.milestones as AgentAgreementWorkspaceViewDto['milestones'],
    moneyPositions: data.moneyPositions as AgentAgreementWorkspaceViewDto['moneyPositions'],
    upcomingEvents: data.upcomingEvents as AgentAgreementWorkspaceViewDto['upcomingEvents'],
    tags: data.tags,
    problems: data.problems as AgentAgreementWorkspaceViewDto['problems'],
    evidence: data.evidence as AgentAgreementWorkspaceViewDto['evidence'],
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
  return discoveryView(component);
}
export function agentResponseView(dto: AgentResponseDto) {
  if (typeof dto?.message !== 'string') throw new ApiError('invalid-response', 'Agent response is missing its message');
  const components = (values: unknown) => (Array.isArray(values) ? values : []).map(agentComponentView).filter((value): value is AgentComponentView => value !== null);
  return {
    message: { type: 'MESSAGE', text: dto.message } satisfies MessageResponse,
    components: components(dto.components ?? []),
    panel: dto.contextualPanel && typeof dto.contextualPanel.title === 'string' ? { title: dto.contextualPanel.title, components: components(dto.contextualPanel.components ?? []) } : null,
    contextUpdates: dto.contextUpdates,
    // Guidance only; never forward these to a consequential endpoint automatically.
    suggestedActions: dto.suggestedActions,
  };
}

/** Retain IDs, qualifiers/provenance and the original state; unknown state is never confirmed. */
export function tradeContextView(dto: TradeContextDto) {
  const stringMap = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(item => typeof item === 'string');
  if (!dto || typeof dto.conversationId !== 'string' || !Number.isSafeInteger(dto.version)
    || !Array.isArray(dto.entities) || !Array.isArray(dto.relationships)
    || dto.entities.some(entity => !entity || typeof entity.id !== 'string' || typeof entity.type !== 'string' || typeof entity.name !== 'string' || typeof entity.state !== 'string' || !stringMap(entity.attributes))
    || dto.relationships.some(relation => !relation || typeof relation.id !== 'string' || typeof relation.kind !== 'string' || typeof relation.subjectEntityId !== 'string' || typeof relation.objectEntityId !== 'string' || typeof relation.state !== 'string' || !stringMap(relation.qualifiers))) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Trade Context. Please refresh.');
  }
  const facts = [
    ...dto.entities.map(entity => ({ id: entity.id, targetKind: 'ENTITY' as const, label: entity.type, value: entity.name, state: entity.state, provenance: entity.attributes })),
    ...dto.relationships.map(relation => ({ id: relation.id, targetKind: 'RELATIONSHIP' as const, label: relation.kind, value: { subjectId: relation.subjectEntityId, objectId: relation.objectEntityId }, state: relation.state, provenance: relation.qualifiers })),
  ];
  return { conversationId: dto.conversationId, version: dto.version, facts,
    candidates: facts.filter(fact => fact.state === 'CANDIDATE'),
    confirmed: facts.filter(fact => fact.state === 'CONFIRMED'),
  };
}
const handoffStatuses: readonly string[] = ['IDENTITY_REQUIRED', 'NEEDS_RESOLUTION', 'REVIEW_STALE', 'READY_FOR_REVIEW', 'READY_TO_PROGRESS', 'PROGRESSED', 'EXPIRED'];
export function handoffView(dto: HandoffDto) {
  return {
    id: dto.handoffId,
    status: handoffStatuses.includes(dto.status) ? dto.status as HandoffStatus : 'UNKNOWN' as const,
    candidate: dto.agreementCandidateSummary,
    unresolvedMatters: dto.unresolvedMatters, guidanceNotes: dto.guidanceNotes,
    reviewSnapshot: { expectedTradeContextVersion: dto.tradeContextVersion, expectedCandidateDigest: dto.candidateDigest },
    expiresAt: dto.expiresAt, progressedAgreementId: dto.progressedAgreementId,
  };
}
