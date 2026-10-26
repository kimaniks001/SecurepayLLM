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
 * Media bytes cannot use the JSON-only preview relay. Restrict direct connections
 * to the independently authorised HTTPS SecurePay staging API and only these
 * exact paths; the backend must enforce participant permissions and CORS.
 */
export type StagingEvidenceGateway = Pick<AgreementGateway,
  'obligations' | 'obligationEvidence' | 'uploadVerifiedMedia' |
  'submitVerifiedMediaEvidence' | 'readVerifiedMedia'>;

export function createStagingEvidenceGateway(
  baseUrl: string, getAccessToken: AccessTokenProvider,
): StagingEvidenceGateway | null {
  const origin = requireApprovedPreviewApiOrigin(baseUrl);
  if (origin === 'https://securepay.ke') return null;
  const uuid = String.raw`[0-9a-fA-F-]{36}`;
  const agreementPath = String.raw`/api/v1/agreements/` + uuid;
  const permittedGet = new RegExp('^' + agreementPath +
    '(?:/obligations|/obligations/' + uuid + '/evidence(?:/' + uuid + '/media)?)$');
  const permittedPost = new RegExp('^' + agreementPath +
    '/obligations/' + uuid + '/(?:evidence-media|verified-media-evidence)$');
  const permittedQuery = new RegExp('^\\?expectedAgreementVersionId=' + uuid +
    '&expectedObligationVersion=[0-9]{1,16}$');
  const stagingFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const allowed = url.origin === origin &&
      ((method === 'GET' && permittedGet.test(url.pathname) && url.search === '') ||
      (method === 'POST' && permittedPost.test(url.pathname) &&
        (url.search === '' || (url.pathname.endsWith('/evidence-media') && permittedQuery.test(url.search)))));
    if (!allowed) return Promise.reject(new Error('Private media request is outside isolated staging'));
    return fetch(url.href, { ...init, credentials: 'omit', cache: 'no-store', redirect: 'error' });
  };
  const candidate = createAgreementGateway(createHttpClient(origin, getAccessToken, stagingFetch));
  return {
    obligations: candidate.obligations,
    obligationEvidence: candidate.obligationEvidence,
    uploadVerifiedMedia: candidate.uploadVerifiedMedia,
    submitVerifiedMediaEvidence: candidate.submitVerifiedMediaEvidence,
    readVerifiedMedia: candidate.readVerifiedMedia,
  };
}


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
