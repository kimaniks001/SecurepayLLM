import { segment, type HttpClient } from '../http';

/**
 * Phase 5 -- the Developer Platform surfaces a signed-in Business owner/administrator can reach
 * with their ordinary KS session (`CurrentActorProvider.currentActor()`): application registration/
 * lifecycle, credential issuance/rotation/revocation, webhook registration/deliveries/replay, and
 * SecureCode issuance for a low/no-code AI-tool handoff (Section 33/34).
 *
 * Deliberately NOT wired here: `DeveloperSandboxController` and `DeveloperMoneySessionController`.
 * Both authenticate the caller as an APPLICATION via its own client-id/secret
 * (`DeveloperApiScopeGuard`/`ApiKeyAuthenticationFilter`), not as a signed-in KS person -- a
 * structurally different authentication mechanism this KS-session-authenticated web app cannot
 * perform. Sandbox simulation and hosted Money-session creation genuinely happen from the
 * developer's OWN backend, using the credential this screen issues -- see
 * docs/PHASE5_LIFE_BUSINESS_WORLD.md section G.
 */
export interface DeveloperApplicationDto {
  id: string; name: string; ownerBusinessKsNumber: string; environment: string;
  status: string; productionAccessState: string; createdAt: string;
}
export interface DeveloperIntegrationCheckDto {
  applicationId: string; applicationName: string; businessKsNumber: string; environment: string;
  applicationConnected: boolean; identityConnected: boolean; credentialsWorking: boolean;
  statusUpdatesConnected: boolean; callbacksConnected: boolean; readyToTestTrade: boolean; checkedAt: string;
}
/** `secret` is present exactly once, on issuance or rotation -- there is no read-it-again endpoint. */
export interface IssuedApplicationCredentialDto { id: string; clientId: string; secret: string; scopes: string[]; status: string }
/** `signingSecret` is present exactly once, on registration or rotation. */
export interface IssuedWebhookEndpointDto { id: string; url: string; subscribedEventTypes: string[]; status: string; signingSecret: string }
export interface WebhookDeliveryDto {
  id: string; eventId: string; eventType: string; status: string; attemptCount: number;
  responseStatus: number | null; failureReason: string | null; createdAt: string;
}
export interface IssuedSecureCodeDto { id: string; applicationId: string; secureCode: string; expiresAt: string }

export function createDeveloperGateway(http: HttpClient) {
  const applications = '/api/v1/developer/applications';
  const application = (id: string) => `${applications}/${segment(id)}`;
  return {
    registerApplication: (body: { name: string; ownerBusinessKsNumber: string; environment: 'SANDBOX' | 'PRODUCTION'; idempotencyKey: string }) =>
      http.request<DeveloperApplicationDto>(applications, { method: 'POST', body, auth: 'required' }),
    getApplication: (applicationId: string) => http.request<DeveloperApplicationDto>(application(applicationId), { auth: 'required' }),
    integrationCheck: (applicationId: string) => http.request<DeveloperIntegrationCheckDto>(`${application(applicationId)}/integration-check`, { auth: 'required' }),
    suspendApplication: (applicationId: string) => http.request<DeveloperApplicationDto>(`${application(applicationId)}/suspend`, { method: 'POST', auth: 'required' }),
    reactivateApplication: (applicationId: string) => http.request<DeveloperApplicationDto>(`${application(applicationId)}/reactivate`, { method: 'POST', auth: 'required' }),
    revokeApplication: (applicationId: string) => http.request<DeveloperApplicationDto>(`${application(applicationId)}/revoke`, { method: 'POST', auth: 'required' }),

    issueCredential: (applicationId: string, scopes: string[], idempotencyKey: string) =>
      http.request<IssuedApplicationCredentialDto>(`${application(applicationId)}/credentials`, { method: 'POST', body: { scopes, idempotencyKey }, auth: 'required' }),
    rotateCredential: (credentialId: string) => http.request<IssuedApplicationCredentialDto>(`/api/v1/developer/credentials/${segment(credentialId)}/rotate`, { method: 'POST', auth: 'required' }),
    revokeCredential: (credentialId: string) => http.request<void>(`/api/v1/developer/credentials/${segment(credentialId)}/revoke`, { method: 'POST', auth: 'required' }),

    registerWebhook: (applicationId: string, body: { url: string; description?: string; subscribedEventTypes: string[] }) =>
      http.request<IssuedWebhookEndpointDto>(`${application(applicationId)}/webhooks`, { method: 'POST', body, auth: 'required' }),
    rotateWebhookSecret: (webhookEndpointId: string) => http.request<IssuedWebhookEndpointDto>(`/api/v1/developer/webhooks/${segment(webhookEndpointId)}/rotate-secret`, { method: 'POST', auth: 'required' }),
    webhookDeliveries: (webhookEndpointId: string) => http.request<WebhookDeliveryDto[]>(`/api/v1/developer/webhooks/${segment(webhookEndpointId)}/deliveries`, { auth: 'required' }),
    replayWebhookDelivery: (deliveryId: string) => http.request<WebhookDeliveryDto>(`/api/v1/developer/webhooks/deliveries/${segment(deliveryId)}/replay`, { method: 'POST', auth: 'required' }),

    issueSecureCode: (applicationId: string, body: { buildType?: string; moneyFlow?: string; appLocation?: string; aiTool?: string }) =>
      http.request<IssuedSecureCodeDto>(`${application(applicationId)}/secure-codes`, { method: 'POST', body, auth: 'required' }),
    revokeSecureCode: (secureCodeId: string) => http.request<void>(`${applications}/secure-codes/${segment(secureCodeId)}/revoke`, { method: 'POST', auth: 'required' }),
  };
}
export type DeveloperGateway = ReturnType<typeof createDeveloperGateway>;
