export interface Protection {
  readonly id: string;
  readonly title: string;
  readonly reason: string;
}
export interface ProviderReadiness {
  readonly providerMandateCertified: boolean;
  readonly payerAuthorityCertified: boolean;
  readonly collectionCanExecute: boolean;
  readonly refundCanExecute: boolean;
  readonly contributionCallbacksCertified: boolean;
  readonly notificationsCanClaimDelivery: boolean;
  readonly pending: readonly string[];
}
export interface HumanReadiness {
  readonly providerVerified: boolean;
  readonly canCollect: false;
  readonly canRefund: false;
  readonly notificationsDelivered: false;
  readonly heading: string;
  readonly message: string;
  readonly waiting: readonly string[];
}
export const C7_PROTECTIONS: readonly Protection[];
export function describeC7Readiness(server?: ProviderReadiness | null): HumanReadiness;
export function canC7ReadinessTriggerMoney(): false;
