export interface Stage {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
}
export interface MoneyItem {
  readonly proposalId: string;
  readonly sourceItemReference: string;
  readonly sourceItemVersion: string;
  readonly proposedAmountMinor: number;
  readonly currency: string;
  readonly individualReview: string;
  readonly fairTradeStatus: string;
  readonly state: string;
  readonly explanation: string;
  readonly legallyDue: false;
  readonly paymentAuthorized: false;
}
export interface MoneyRecord {
  readonly contributionId: string;
  readonly contributionReference: string;
  readonly intendedAmountMinor: number;
  readonly verifiedFundedAmountMinor: number | null;
  readonly currency: string;
  readonly state: string;
  readonly explanation: string;
  readonly providerCertified: boolean;
  readonly refundableOrPaidBack: false;
}
export interface MoneyPage {
  readonly agreementId: string;
  readonly originalItems: readonly MoneyItem[];
  readonly contributionRecords: readonly MoneyRecord[];
  readonly returnStatus: {
    readonly status: string;
    readonly proposedReturnMinor: number | null;
    readonly currency: string;
    readonly instructed: boolean;
    readonly providerSettled: boolean;
    readonly explanation: string;
  };
  readonly totalIsComplete: boolean;
  readonly moreOriginalItems: boolean;
  readonly moreMoneyRecords: boolean;
}
export interface MoneySummary {
  readonly hasAuthoritativeRecords: boolean;
  readonly originalItems: readonly MoneyItem[];
  readonly funding: readonly MoneyRecord[];
  readonly proposedReturnMinor: number | null;
  readonly verifiedFundedMinor: number | null;
  readonly refundSettled: false;
  readonly recurringDebitAuthorized: false;
  readonly noticesDelivered: false;
  readonly noSourceProof: boolean;
}
export const C7_MONEY_STAGES: readonly Stage[];
export const C7_FUNDING_STATES: Readonly<Record<string,string>>;
export function summarizeC7Money(page?: MoneyPage | null): MoneySummary;
export function canCollectMoneyFromC7Preview(): false;
