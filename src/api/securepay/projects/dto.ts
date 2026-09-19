// SecurePay Final Completion Phase 5A -- Projects & Agreement Organization.
// A Project is a private organizational folder for exactly one canonical KS owner. It is NOT an
// Agreement, a shared workspace, a group, a wallet, or a source of contractual authority -- see
// docs/phase5a/PHASE_5A_COMPLETION_REPORT.md on the backend. There is deliberately no share/invite/
// participant/member field anywhere in this file, because no such capability exists on the backend.
import type { AgreementCalendarEventResponse, CurrentUserAgreementSummaryResponse } from '../agreements/dto';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface ProjectDto {
  projectId: string;
  ownerKsNumber: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  version: number;
}

export interface ProjectListDto { items: ProjectDto[] }

export interface CreateProjectRequest { ownerKsNumber: string; name: string; description?: string }
export interface UpdateProjectRequest { name: string; description?: string; expectedVersion: number }
export interface ProjectLifecycleRequest { expectedVersion: number }

export interface ProjectAgreementListDto { items: CurrentUserAgreementSummaryResponse[] }

export interface ProjectNominalTotalDto { currency: string; totalAmountMinor: number; agreementCount: number }
export interface ProjectMoneyByCurrencyDto {
  currency: string; fundedTotalMinor: number; exercisedOrSettledMinor: number;
  releasedTotalMinor: number; remainingFundedMinor: number; positionCount: number;
}

export interface ProjectSummaryDto {
  projectId: string;
  ownerKsNumber: string;
  name: string;
  description: string | null;
  status: string;
  agreementCount: number;
  agreementsByStatus: Record<string, number>;
  needsAttentionCount: number;
  waitingOnOthersCount: number;
  takingShapeCount: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  expiredCount: number;
  nominalTotalsByCurrency: ProjectNominalTotalDto[];
  fundedTotalsByCurrency: ProjectMoneyByCurrencyDto[];
  nextUpcomingEventAt: string | null;
}

export interface ProjectCalendarDto { events: AgreementCalendarEventResponse[] }
