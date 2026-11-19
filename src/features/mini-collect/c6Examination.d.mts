import type { GovernanceDraft } from './governanceDraft.mjs';
import type { CyclePeriodSelection } from './c5bPreparation.mjs';

export interface AnswerPill {
  readonly id: string;
  readonly label: string;
}
export interface HumanQuestion {
  readonly id: string;
  readonly title: string;
  readonly why: string;
  readonly calendar: boolean;
  readonly options: readonly AnswerPill[];
}
export interface LocalExamination {
  readonly questions: readonly HumanQuestion[];
  readonly unanswered: readonly string[];
  readonly localClarificationsCaptured: boolean;
  readonly disputed: boolean;
  readonly pendingIndependentEvidence: readonly string[];
  readonly sourceVerified: false;
  readonly collectorAuthorityVerified: false;
  readonly recipientAuthorityVerified: false;
  readonly providerCertified: false;
  readonly legalDebtEstablished: false;
  readonly agreementAccepted: false;
  readonly paymentAuthorized: false;
  readonly recurringDebitAuthorized: false;
  readonly refundAuthorized: false;
  readonly financialExecutionAllowed: false;
}
export function questionsForCollection(
  draft: GovernanceDraft, period: CyclePeriodSelection
): readonly HumanQuestion[];
export function assessCollectionExamination(
  draft: GovernanceDraft, period: CyclePeriodSelection,
  answers?: Readonly<Record<string,string>>, dateProposal?: string | null
): LocalExamination;
export function canExaminationAuthorizeMoney(): false;
