import { apiBaseUrl } from '../../config/securepay';
import { createHttpClient, type AccessTokenProvider } from './http';
import { createAgentGateway } from './agent';
import { createAuthGateway } from './auth';
import { createAgreementGateway } from './agreements';
import { createMoneyGateway } from './money';
import { createStoreGateway } from './store';
export function createSecurePayApi(baseUrl: string | undefined, getAccessToken: AccessTokenProvider, fetcher?: typeof fetch) {
  const validatedBaseUrl = apiBaseUrl(baseUrl);
  const http = createHttpClient(validatedBaseUrl, getAccessToken, fetcher);
  return {
    mode: 'real' as const, baseUrl: validatedBaseUrl,
    agent: createAgentGateway(http), auth: createAuthGateway(http), agreements: createAgreementGateway(http), money: createMoneyGateway(http), store: createStoreGateway(http),
  };
}
