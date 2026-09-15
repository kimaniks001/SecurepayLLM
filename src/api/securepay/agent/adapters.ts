import { discoveryView, type DiscoveryView } from './discovery';
import type { MessageResponse } from '../../../types';
import { ApiError } from '../http';
import type { AgentResponseDto, ComponentDto, HandoffDto, HandoffStatus, TradeContextDto } from './dto';

export interface PreviewView {
  type: 'AGREEMENT_PREVIEW';
  what: string[]; who: string[]; money: string[]; when: string[];
  stillToSettle: string[]; disclaimer: string;
}
export type AgentComponentView = MessageResponse | PreviewView | DiscoveryView;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

/** A presentation adapter, never an Agreement or action dispatcher. Unsupported cards preserve the surrounding text. */
export function agentComponentView(component: ComponentDto): AgentComponentView | null {
  if (!component || typeof component.data !== 'object' || component.data === null) return null;
  const data = component.data;
  if (component.type === 'MESSAGE' && typeof data.text === 'string') return { type: 'MESSAGE', text: data.text };
  if (component.type === 'AGREEMENT_PREVIEW' && strings(data.what) && strings(data.who) && strings(data.money) && strings(data.when) && strings(data.stillWorthSettling) && typeof data.disclaimer === 'string') {
    return { type: 'AGREEMENT_PREVIEW', what: data.what, who: data.who, money: data.money, when: data.when, stillToSettle: data.stillWorthSettling, disclaimer: data.disclaimer };
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
