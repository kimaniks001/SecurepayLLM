import { createHttpClient, type AccessTokenProvider } from '../../api/securepay/http';
import { createAuthGateway } from '../../api/securepay/auth';
import { createAgentGateway } from '../../api/securepay/agent';
import { createVisionDreamGateway } from '../../api/securepay/visiondreams';
import { createCommunityGateway } from '../../api/securepay/community';
import { createAgreementGateway, type AgreementGateway } from '../../api/securepay/agreements';
import { createStoreGateway } from '../../api/securepay/store';
import { createFinancialPartnerGateway } from '../../api/securepay/financial-partners';
import { createMoneySnapshotGateway } from '../../api/securepay/money-snapshot';
import { requireApprovedPreviewApiOrigin } from './previewApiOrigin';

/**
 * Do not route private media through Vercel's JSON-only, small-body Gate 3 relay.
 * A direct STAGING-only bearer request avoids proxying uploaded customer bytes.
 * Only the exact six Agreement read/write media journey endpoints are permitted,
 * and the backend must independently enforce participant permissions and CORS.
 */
export type StagingEvidenceGateway = Pick<AgreementGateway,
  'obligations' | 'obligationEvidence' | 'uploadVerifiedMedia' |
  'submitVerifiedMediaEvidence' | 'readVerifiedMedia'>;
export function createStagingEvidenceGateway(baseUrl: string, getAccessToken: AccessTokenProvider): StagingEvidenceGateway | null {
  const origin = requireApprovedPreviewApiOrigin(baseUrl);
  if (origin === 'https://securepay.ke') return null;
  const pathBase = String.raw`/api/v1/agreements/[0-9a-fA-F-]{36}`;
  const allowedGet = new RegExp('^' + pathBase +
    '(?:/obligations|/obligations/[0-9a-fA-F-]{36}/evidence(?:/[0-9a-fA-F-]{36}/media)?)

/**
 * One preview-only transport for existing SecurePay authorities.
 * Not a second database, token store, membership grant, or generic API proxy.
 */
export function createPreviewWorkspaceGateways(baseUrl: string, getAccessToken: AccessTokenProvider) {
  const approvedOrigin = requireApprovedPreviewApiOrigin(baseUrl);
  const media = createStagingEvidenceGateway(baseUrl, getAccessToken);
  const previewFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== approvedOrigin || !url.pathname.startsWith('/api/')) {
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
    financialPartners: createFinancialPartnerGateway(http),
    moneySnapshot: createMoneySnapshotGateway(http),
    media,
  };
}
export type PreviewWorkspaceGateways = ReturnType<typeof createPreviewWorkspaceGateways>;
);
  const allowedPost = new RegExp('^' + pathBase +
    '/obligations/[0-9a-fA-F-]{36}/(?:evidence-media|verified-media-evidence)

/**
 * One preview-only transport for existing SecurePay authorities.
 * Not a second database, token store, membership grant, or generic API proxy.
 */
export function createPreviewWorkspaceGateways(baseUrl: string, getAccessToken: AccessTokenProvider) {
  const approvedOrigin = requireApprovedPreviewApiOrigin(baseUrl);
  const previewFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== approvedOrigin || !url.pathname.startsWith('/api/')) {
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
    financialPartners: createFinancialPartnerGateway(http),
    moneySnapshot: createMoneySnapshotGateway(http),
  };
}
export type PreviewWorkspaceGateways = ReturnType<typeof createPreviewWorkspaceGateways>;
);
  const stagingFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method || 'GET').toUpperCase();
    const allowed = url.origin === origin &&
      ((method === 'GET' && allowedGet.test(url.pathname) && !url.search) ||
       (method === 'POST' && allowedPost.test(url.pathname) &&
        (!url.search || /^\\?expectedAgreementVersionId=[0-9a-fA-F-]{36}&expectedObligationVersion=\\d{1,16}$/.test(url.search))));
    if (!allowed) return Promise.reject(new Error('Private evidence request is outside isolated staging'));
    return fetch(url.href, { ...init, credentials: 'omit', redirect: 'error', cache: 'no-store' });
  };
  const full = createAgreementGateway(createHttpClient(origin, getAccessToken, stagingFetch));
  return {
    obligations: full.obligations,
    obligationEvidence: full.obligationEvidence,
    uploadVerifiedMedia: full.uploadVerifiedMedia,
    submitVerifiedMediaEvidence: full.submitVerifiedMediaEvidence,
    readVerifiedMedia: full.readVerifiedMedia,
  };
}


/**
 * One preview-only transport for existing SecurePay authorities.
 * Not a second database, token store, membership grant, or generic API proxy.
 */
export function createPreviewWorkspaceGateways(baseUrl: string, getAccessToken: AccessTokenProvider) {
  const approvedOrigin = requireApprovedPreviewApiOrigin(baseUrl);
  const previewFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== approvedOrigin || !url.pathname.startsWith('/api/')) {
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
    financialPartners: createFinancialPartnerGateway(http),
    moneySnapshot: createMoneySnapshotGateway(http),
  };
}
export type PreviewWorkspaceGateways = ReturnType<typeof createPreviewWorkspaceGateways>;
