import type { AgreementFormation } from '../formation/view';
import type { FairTradeExaminationDto } from '../../api/securepay/agent/dto';

export type ReadinessIndicator = {
  label: 'Draft' | 'Fair Trade' | 'Parties' | 'Money';
  value: string;
};

/**
 * A small, read-only projection of what this exact FORMATION VERSION can say.
 *
 * Never turn a reviewable draft into a passed SecurePay Check, acceptance by
 * another person, payment eligibility or the authority to release money. Those
 * truths are held by different server-owned lifecycle/financial services and
 * are NOT available in this formation-only preview.
 */
export function workspaceReadinessIndicators(
  formation: Pick<AgreementFormation, 'conversationId' | 'version' | 'reviewable' | 'readingSources'>,
  examination: { status: 'idle' | 'loading' | 'ready' | 'unavailable'; data: FairTradeExaminationDto | null },
): ReadinessIndicator[] {
  const current = examination.status === 'ready'
    && examination.data?.status === 'PARTIAL_ADVISORY'
    && examination.data.conversationId === formation.conversationId
    && examination.data.tradeContextVersion === formation.version
    ? examination.data : null;

  const draft = formation.readingSources.length > 0
    ? 'Sources still being read'
    : formation.reviewable ? 'Available to inspect' : 'Still forming';
  const fairTrade = current
    ? current.hasMaterialConcern ? 'Concern needs attention' : 'Partial examination'
    : examination.status === 'loading' ? 'Reading current version' : 'Not confirmed here';

  return [
    { label: 'Draft', value: draft },
    { label: 'Fair Trade', value: fairTrade },
    { label: 'Parties', value: 'Acceptance not shown' },
    { label: 'Money', value: 'Not authorised here' },
  ];
}
