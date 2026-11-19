import type { GovernanceDraft } from './governanceDraft.mjs';
export type SourceCategory = 'existing-bill' | 'store-offer' | 'document' | 'purpose-only';
export interface SourceOption { readonly id: SourceCategory; readonly label: string; readonly hint: string }
export interface CyclePeriodSelection {
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly timeZoneId: 'Africa/Nairobi';
  readonly sourceCategory: SourceCategory | null;
}
export interface CycleAssessment {
  readonly reviewComplete: boolean;
  readonly missing: readonly string[];
  readonly backendAgreementCreated: false;
  readonly periodPersisted: false;
  readonly payerObligationsVerified: false;
  readonly debtEstablished: false;
  readonly paymentAuthorized: false;
  readonly recurringDebitAuthorized: false;
  readonly refundsAuthorized: false;
}
export interface CanonicalTypeTerms {
  readonly typeId: string;
  readonly kind: GovernanceDraft['kind'];
  readonly cadence: 'ONE_TIME' | 'MONTHLY' | 'SCHOOL_TERM' | 'AGREED_CYCLE' | 'INSTALMENTS';
}
export const SOURCE_OPTIONS: readonly SourceOption[];
export function canonicalCollectionTypeTerms(draft: GovernanceDraft): CanonicalTypeTerms | null;
export function assessCyclePeriod(draft: GovernanceDraft, selection: CyclePeriodSelection, todayIso: string): CycleAssessment;
export function canSubmitFinancialCycle(): false;
