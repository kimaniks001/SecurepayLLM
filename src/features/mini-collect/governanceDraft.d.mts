export type CollectionKind = 'buy' | 'paid' | 'regular' | 'group' | 'give' | 'goal';
export type Capacity = 'self' | 'organization' | 'representative';
export type TargetMode = 'fixed' | 'open';
export type StopRule = 'target-or-date' | 'date-only';
export type SurplusRule = 'refund' | 'new-consent';
export type ChangeRule = 'affected-consent' | 'existing-quorum';
export type PayoutRule = 'verified-beneficiary' | 'two-approvers' | 'existing-mandate';
export interface GovernanceDraft {
  readonly kind: CollectionKind;
  readonly capacity: Capacity | null;
  readonly contributorScope: 'one' | 'invited' | 'open' | null;
  readonly beneficiaryRule: string | null;
  readonly targetMode: TargetMode | null;
  readonly targetAmountKes: number | null;
  readonly stopRule: StopRule | null;
  readonly surplusRule: SurplusRule | null;
  readonly deadline: string | null;
  readonly failureRule: string | null;
  readonly changeRule: ChangeRule | null;
  readonly payoutRule: PayoutRule | null;
}
export interface AnswerOption { readonly id: string; readonly label: string; readonly hint: string }
export interface GovernanceAssessment {
  readonly draftComplete: boolean;
  readonly missing: readonly string[];
  readonly activationAllowed: false;
  readonly authorityVerified: false;
}
export const COLLECTION_KINDS: readonly CollectionKind[];
export const ACTOR_CAPACITIES: readonly AnswerOption[];
export const CONTRIBUTOR_SCOPES: readonly AnswerOption[];
export function beneficiaryOptions(kind: CollectionKind): readonly AnswerOption[];
export const TARGET_MODES: readonly AnswerOption[];
export const STOP_RULES: readonly AnswerOption[];
export const SURPLUS_RULES: readonly AnswerOption[];
export const CHANGE_RULES: readonly AnswerOption[];
export const PAYOUT_RULES: readonly AnswerOption[];
export const SERVER_GATES: readonly string[];
export function failureOptions(kind: CollectionKind): readonly AnswerOption[];
export function newGovernanceDraft(kind: CollectionKind): GovernanceDraft;
export function withGovernanceAnswer<K extends keyof Omit<GovernanceDraft, 'kind'>>(draft: GovernanceDraft, key: K, value: GovernanceDraft[K]): GovernanceDraft;
export function isCalendarDate(value: unknown): boolean;
export function assessGovernanceDraft(draft: GovernanceDraft, todayIso: string): GovernanceAssessment;
export function canExecuteCollection(): false;
