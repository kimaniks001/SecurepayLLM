import { apiBaseUrl } from '../../config/securepay';
import { createHttpClient, type AccessTokenProvider } from './http';
import { createAgentGateway } from './agent';
import { createAuthGateway } from './auth';
import { createAgreementGateway } from './agreements';
import { createMoneyGateway } from './money';
import { createStoreGateway } from './store';
import { createCircleGateway } from './circle';
import { createMasterGateway } from './master';
import { createMarketNetworkGateway } from './marketnetwork';
import { createReferralGateway } from './referral';
import { createSubscriptionGateway } from './subscription';
import { createSettlementDestinationGateway } from './settlement-destinations';
import { createFinancialPartnerGateway } from './financial-partners';
import { createMoneyAuthorityGateway } from './money-authority';
import { createMoneySessionGateway } from './money-session';
import { createPaymentIntentGateway } from './payment-intent';
import { createMoneyOperationsGateway } from './money-operations';
import { createCurrencyCapabilityGateway } from './currency-capability';
import { createFxApplicationGateway } from './fx-application';
import { createRegulatedAccountsGateway } from './regulated-accounts';
import { createBusinessCurrencyCapabilityGateway } from './business-currency-capability';
import { createBusinessFxApplicationGateway } from './business-fx-application';
export function createSecurePayApi(baseUrl: string | undefined, getAccessToken: AccessTokenProvider, fetcher?: typeof fetch) {
  const validatedBaseUrl = apiBaseUrl(baseUrl);
  const http = createHttpClient(validatedBaseUrl, getAccessToken, fetcher);
  return {
    mode: 'real' as const, baseUrl: validatedBaseUrl,
    agent: createAgentGateway(http), auth: createAuthGateway(http), agreements: createAgreementGateway(http), money: createMoneyGateway(http), store: createStoreGateway(http),
    circle: createCircleGateway(http),
    master: createMasterGateway(http), marketNetwork: createMarketNetworkGateway(http), referral: createReferralGateway(http), subscription: createSubscriptionGateway(http),
    settlementDestinations: createSettlementDestinationGateway(http), financialPartners: createFinancialPartnerGateway(http), moneyAuthority: createMoneyAuthorityGateway(http),
    moneySession: createMoneySessionGateway(http), paymentIntent: createPaymentIntentGateway(http), moneyOperations: createMoneyOperationsGateway(http),
    currencyCapability: createCurrencyCapabilityGateway(http), fxApplication: createFxApplicationGateway(http),
    regulatedAccounts: createRegulatedAccountsGateway(http),
    businessCurrencyCapability: createBusinessCurrencyCapabilityGateway(http), businessFxApplication: createBusinessFxApplicationGateway(http),
  };
}
