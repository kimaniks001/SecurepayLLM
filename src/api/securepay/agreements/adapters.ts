import type { AgreementDetailResponse } from './dto';
import { moneyHandoffView } from '../money/adapters';
/** Bolt section composition without deriving a lifecycle, completion, participant role or financial state. */
export function agreementDetailView(dto: AgreementDetailResponse) {
  return {
    id: dto.overview.agreementId, reference: dto.overview.publicReference,
    title: dto.overview.title, status: dto.overview.status,
    overview: dto.overview,
    version: dto.currentVersion ? { id: dto.currentVersion.versionId, number: dto.currentVersion.versionNumber, hash: dto.currentVersion.contentHash } : null,
    participants: dto.participants,
    milestones: dto.milestones,
    terms: dto.terms, documents: dto.documents,
    activity: dto.activity, versionHistory: dto.versionHistory,
    money: moneyHandoffView(dto.money),
  };
}
