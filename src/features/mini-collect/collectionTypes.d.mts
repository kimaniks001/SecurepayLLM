export type CollectionKind = 'buy' | 'paid' | 'regular' | 'group' | 'give' | 'goal';
export type CollectionCadence = 'one-time' | 'monthly' | 'school-term' | 'agreed-cycle' | 'instalments';
export type ObligationKind = 'conditional' | 'amount-due' | 'group-rule' | 'voluntary';
export interface CollectionTypeProfile {
  readonly id: string;
  readonly kind: CollectionKind;
  readonly title: string;
  readonly hint: string;
  readonly example: string;
  readonly cadences: readonly CollectionCadence[];
  readonly obligation: ObligationKind;
  readonly recipient: string;
  readonly checks: readonly string[];
}
export interface CollectionTypeSelection {
  readonly kind: CollectionKind;
  readonly typeId: string | null;
  readonly cadence: CollectionCadence | null;
}
export interface CollectionTypeAssessment {
  readonly draftComplete: boolean;
  readonly missing: readonly string[];
  readonly agreementAccepted: false;
  readonly providerVerified: false;
  readonly paymentAuthorized: false;
  readonly recurringDebitAuthorized: false;
  readonly refundAuthorized: false;
}
export interface CadenceOption {
  readonly id: CollectionCadence;
  readonly title: string;
  readonly hint: string;
}
export const COLLECTION_TYPE_PROFILES: readonly CollectionTypeProfile[];
export const CADENCE_OPTIONS: readonly CadenceOption[];
export function collectionTypesFor(kind: CollectionKind): readonly CollectionTypeProfile[];
export function newCollectionTypeSelection(kind: CollectionKind): CollectionTypeSelection;
export function chooseCollectionType(selection: CollectionTypeSelection, typeId: string): CollectionTypeSelection;
export function chooseCollectionCadence(selection: CollectionTypeSelection, cadence: CollectionCadence): CollectionTypeSelection;
export function assessCollectionTypeSelection(selection: CollectionTypeSelection): CollectionTypeAssessment;
export function canExecuteTypeSelection(): false;
