import { createHttpClient, type AccessTokenProvider } from '../../api/securepay/http';
import { createAuthGateway } from '../../api/securepay/auth';
import { createAgentGateway } from '../../api/securepay/agent';
import { createVisionDreamGateway } from '../../api/securepay/visiondreams';
import { createCommunityGateway } from '../../api/securepay/community';
import { createAgreementGateway } from '../../api/securepay/agreements';
import { createStoreGateway } from '../../api/securepay/store';

/**
 * One preview-only transport for existing SecurePay authorities.
 * Not a second database, token store, membership grant, or generic API proxy.
 */
export function createPreviewWorkspaceGateways(baseUrl: string, getAccessToken: AccessTokenProvider) {
  if (new URL(baseUrl).origin !== 'https://securepay.ke') {
    throw new Error('Unknown SecurePay API origin; private workspace data not available');
  }
  const previewFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== 'https://securepay.ke' || !url.pathname.startsWith('/api/')) {
      return Promise.reject(new Error('Workspace access is limited to SecurePay'));
    }
    return fetch('/api/preview-workspace?path=' + encodeURIComponent(url.pathname + url.search), {
      ...init, credentials:'same-origin',
    });
  };
  const http = createHttpClient(baseUrl,getAccessToken,previewFetch);
  return {
    auth: createAuthGateway(http),
    agent: createAgentGateway(http),
    dreams: createVisionDreamGateway(http),
    community: createCommunityGateway(http),
    agreements: createAgreementGateway(http),
    stores: createStoreGateway(http),
  };
}
export type PreviewWorkspaceGateways = ReturnType<typeof createPreviewWorkspaceGateways>;
