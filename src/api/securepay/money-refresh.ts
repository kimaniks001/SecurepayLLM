import type { createMoneyGateway } from './money';
import type { createMoneyAuthorityGateway } from './money-authority';
import type { createPaymentIntentGateway } from './payment-intent';
import type { createPaymentReleaseGateway } from './payment-release';
import type { createSettlementDestinationGateway } from './settlement-destinations';
import type { createMoneySessionGateway } from './money-session';
import type { createMoneyOperationsGateway } from './money-operations';
import type { createCurrencyCapabilityGateway } from './currency-capability';
import type { createFxApplicationGateway } from './fx-application';
import type { createRegulatedAccountsGateway } from './regulated-accounts';
import type { createBusinessCurrencyCapabilityGateway } from './business-currency-capability';
import type { createBusinessFxApplicationGateway } from './business-fx-application';
import type { createFinancialPartnerGateway } from './financial-partners';

type Methods<F extends (...args: never[]) => unknown> = readonly (keyof ReturnType<F>)[];

/**
 * Every Money-family gateway method whose contract is `auth: 'required'`, so the one session boundary refreshes an expired-but-refreshable
 * token BEFORE the call. RuntimeApp wraps each gateway from THIS table (no hand-copied lists), and `tests/ui-phase8.test.mjs` parses every
 * gateway source and fails loudly if an authenticated method is missing here (the drift the Agreement gateway already suffered once).
 */
export const MONEY_AUTHENTICATED_METHODS = {
  money: ['status', 'records'] as const satisfies Methods<typeof createMoneyGateway>,
  moneyAuthority: ['list', 'status', 'open', 'fund', 'exercise', 'release', 'transactions'] as const satisfies Methods<typeof createMoneyAuthorityGateway>,
  paymentIntent: ['fundingAuthority', 'fundingOptions', 'createQuote', 'createIntent', 'listIntents', 'get', 'listAttempts', 'initiate'] as const satisfies Methods<typeof createPaymentIntentGateway>,
  paymentRelease: ['releaseAuthority', 'instructions', 'settlementStatus'] as const satisfies Methods<typeof createPaymentReleaseGateway>,
  settlementDestinations: ['current', 'history', 'verificationStatus', 'register', 'replace'] as const satisfies Methods<typeof createSettlementDestinationGateway>,
  moneySession: ['create', 'resolve', 'redeem'] as const satisfies Methods<typeof createMoneySessionGateway>,
  moneyOperations: ['summary'] as const satisfies Methods<typeof createMoneyOperationsGateway>,
  currencyCapability: ['list', 'activate'] as const satisfies Methods<typeof createCurrencyCapabilityGateway>,
  fxApplication: ['create', 'get', 'list', 'capability'] as const satisfies Methods<typeof createFxApplicationGateway>,
  regulatedAccounts: ['listMine'] as const satisfies Methods<typeof createRegulatedAccountsGateway>,
  businessCurrencyCapability: ['list', 'activate'] as const satisfies Methods<typeof createBusinessCurrencyCapabilityGateway>,
  businessFxApplication: ['create', 'get', 'list'] as const satisfies Methods<typeof createBusinessFxApplicationGateway>,
  financialPartners: ['list'] as const satisfies Methods<typeof createFinancialPartnerGateway>,
};
