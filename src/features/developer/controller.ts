import type {
  DeveloperApplicationDto, DeveloperGateway, DeveloperIntegrationCheckDto,
  IssuedApplicationCredentialDto, IssuedSecureCodeDto, IssuedWebhookEndpointDto, WebhookDeliveryDto,
} from '../../api/securepay/developer';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface DeveloperState {
  registerForm: { name: string; ownerBusinessKsNumber: string; environment: 'SANDBOX' | 'PRODUCTION' };
  application: Loadable<DeveloperApplicationDto>;
  integrationCheck: Loadable<DeveloperIntegrationCheckDto>;
  lifecycleBusy: boolean;
  lifecycleError: string | null;

  credentialScopesInput: string;
  /** One-time secret -- present only immediately after issue/rotate, never re-fetchable. */
  issuedCredential: IssuedApplicationCredentialDto | null;
  credentialBusy: boolean;
  credentialError: string | null;
  rotateRevokeCredentialIdInput: string;

  webhookUrlInput: string;
  webhookEventsInput: string;
  issuedWebhook: IssuedWebhookEndpointDto | null;
  webhookBusy: boolean;
  webhookError: string | null;
  deliveriesEndpointIdInput: string;
  deliveries: Loadable<WebhookDeliveryDto[]>;

  secureCodeAiToolInput: string;
  issuedSecureCode: IssuedSecureCodeDto | null;
  secureCodeBusy: boolean;
  secureCodeError: string | null;
}

const initial: DeveloperState = {
  registerForm: { name: '', ownerBusinessKsNumber: '', environment: 'SANDBOX' },
  application: idle(), integrationCheck: idle(), lifecycleBusy: false, lifecycleError: null,
  credentialScopesInput: '', issuedCredential: null, credentialBusy: false, credentialError: null, rotateRevokeCredentialIdInput: '',
  webhookUrlInput: '', webhookEventsInput: '', issuedWebhook: null, webhookBusy: false, webhookError: null,
  deliveriesEndpointIdInput: '', deliveries: idle(),
  secureCodeAiToolInput: '', issuedSecureCode: null, secureCodeBusy: false, secureCodeError: null,
};

/**
 * Phase 5 -- Developer/Connect. Covers exactly the part of the Developer Platform a signed-in KS
 * person can reach with their ordinary session, and only when that session's own KS Number is the
 * Business KS identity itself (`DeveloperPlatformAuthorization.requireOwnerOrInternalActor` checks
 * `actorKsNumber() == ownerBusinessKsNumber` -- Organization RBAC admin/membership is never
 * consulted, confirmed directly against current `SecurePayAPI main`; a Business admin acting from a
 * personal KS session does not qualify). Sandbox simulation and hosted Money-session creation are
 * deliberately NOT wired here -- both authenticate the caller as an APPLICATION (client-id/secret),
 * not a signed-in KS person, a structurally different mechanism this web app cannot perform. See
 * docs/PHASE5_LIFE_BUSINESS_WORLD.md section G.
 */
export function createDeveloperController(gateway: Pick<DeveloperGateway,
  'registerApplication' | 'getApplication' | 'integrationCheck' | 'suspendApplication' | 'reactivateApplication' | 'revokeApplication' |
  'issueCredential' | 'rotateCredential' | 'revokeCredential' |
  'registerWebhook' | 'rotateWebhookSecret' | 'webhookDeliveries' | 'replayWebhookDelivery' |
  'issueSecureCode' | 'revokeSecureCode'
>) {
  let state: DeveloperState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<DeveloperState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /**
     * Final correction -- a one-time secret from the backend ("shown exactly once, never
     * retrievable again") must not keep re-rendering from React state after the person navigates
     * away and back within the same app session. Called when leaving the Developer destination;
     * does not touch `application`/`integrationCheck`/form inputs, only the three secret values.
     */
    clearSensitiveTransientState() {
      update({ issuedCredential: null, issuedWebhook: null, issuedSecureCode: null });
    },

    setRegisterForm(patch: Partial<DeveloperState['registerForm']>) { update({ registerForm: { ...state.registerForm, ...patch } }); },

    async registerApplication() {
      const { name, ownerBusinessKsNumber, environment } = state.registerForm;
      if (!name.trim() || !ownerBusinessKsNumber.trim() || state.lifecycleBusy) return;
      update({ lifecycleBusy: true, lifecycleError: null });
      try {
        const application = await gateway.registerApplication({ name: name.trim(), ownerBusinessKsNumber: ownerBusinessKsNumber.trim(), environment, idempotencyKey: crypto.randomUUID() });
        update({ lifecycleBusy: false, application: { status: 'ready', data: application, error: null } });
      } catch (error) {
        update({ lifecycleBusy: false, lifecycleError: errorText(error) });
      }
    },

    async openApplication(applicationId: string) {
      // Switching which application is open must never leave a previous application's one-time
      // secret visible against the newly-opened one.
      update({ application: { status: 'loading', data: null, error: null }, integrationCheck: idle(), issuedCredential: null, issuedWebhook: null, issuedSecureCode: null });
      try {
        const application = await gateway.getApplication(applicationId);
        update({ application: { status: 'ready', data: application, error: null } });
      } catch (error) {
        update({ application: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    async runIntegrationCheck() {
      const applicationId = state.application.data?.id;
      if (!applicationId) return;
      update({ integrationCheck: { status: 'loading', data: null, error: null } });
      try {
        const check = await gateway.integrationCheck(applicationId);
        update({ integrationCheck: { status: 'ready', data: check, error: null } });
      } catch (error) {
        update({ integrationCheck: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    async setApplicationLifecycle(action: 'suspend' | 'reactivate' | 'revoke') {
      const applicationId = state.application.data?.id;
      if (!applicationId || state.lifecycleBusy) return;
      update({ lifecycleBusy: true, lifecycleError: null });
      try {
        const application = action === 'suspend' ? await gateway.suspendApplication(applicationId)
          : action === 'reactivate' ? await gateway.reactivateApplication(applicationId)
          : await gateway.revokeApplication(applicationId);
        update({
          lifecycleBusy: false, application: { status: 'ready', data: application, error: null },
          // A revoked application's previously-displayed secrets are no longer meaningfully valid;
          // continuing to show them would be misleading.
          ...(action === 'revoke' ? { issuedCredential: null, issuedWebhook: null, issuedSecureCode: null } : {}),
        });
      } catch (error) {
        update({ lifecycleBusy: false, lifecycleError: errorText(error) });
      }
    },

    setCredentialScopesInput(value: string) { update({ credentialScopesInput: value }); },
    setRotateRevokeCredentialIdInput(value: string) { update({ rotateRevokeCredentialIdInput: value }); },

    async issueCredential() {
      const applicationId = state.application.data?.id;
      const scopes = state.credentialScopesInput.split(',').map(s => s.trim()).filter(Boolean);
      if (!applicationId || scopes.length === 0 || state.credentialBusy) return;
      update({ credentialBusy: true, credentialError: null, issuedCredential: null });
      try {
        const credential = await gateway.issueCredential(applicationId, scopes, crypto.randomUUID());
        update({ credentialBusy: false, issuedCredential: credential });
      } catch (error) {
        update({ credentialBusy: false, credentialError: errorText(error) });
      }
    },

    async rotateCredential() {
      const credentialId = state.rotateRevokeCredentialIdInput.trim();
      if (!credentialId || state.credentialBusy) return;
      update({ credentialBusy: true, credentialError: null, issuedCredential: null });
      try {
        const credential = await gateway.rotateCredential(credentialId);
        update({ credentialBusy: false, issuedCredential: credential });
      } catch (error) {
        update({ credentialBusy: false, credentialError: errorText(error) });
      }
    },

    async revokeCredential() {
      const credentialId = state.rotateRevokeCredentialIdInput.trim();
      if (!credentialId || state.credentialBusy) return;
      update({ credentialBusy: true, credentialError: null });
      try {
        await gateway.revokeCredential(credentialId);
        update({ credentialBusy: false, rotateRevokeCredentialIdInput: '' });
      } catch (error) {
        update({ credentialBusy: false, credentialError: errorText(error) });
      }
    },

    setWebhookUrlInput(value: string) { update({ webhookUrlInput: value }); },
    setWebhookEventsInput(value: string) { update({ webhookEventsInput: value }); },

    async registerWebhook() {
      const applicationId = state.application.data?.id;
      const subscribedEventTypes = state.webhookEventsInput.split(',').map(s => s.trim()).filter(Boolean);
      if (!applicationId || !state.webhookUrlInput.trim() || subscribedEventTypes.length === 0 || state.webhookBusy) return;
      update({ webhookBusy: true, webhookError: null, issuedWebhook: null });
      try {
        const webhook = await gateway.registerWebhook(applicationId, { url: state.webhookUrlInput.trim(), subscribedEventTypes });
        update({ webhookBusy: false, issuedWebhook: webhook, deliveriesEndpointIdInput: webhook.id });
      } catch (error) {
        update({ webhookBusy: false, webhookError: errorText(error) });
      }
    },

    setDeliveriesEndpointIdInput(value: string) { update({ deliveriesEndpointIdInput: value }); },

    async loadDeliveries() {
      const webhookEndpointId = state.deliveriesEndpointIdInput.trim();
      if (!webhookEndpointId) return;
      update({ deliveries: { status: 'loading', data: null, error: null } });
      try {
        const deliveries = await gateway.webhookDeliveries(webhookEndpointId);
        update({ deliveries: { status: 'ready', data: deliveries, error: null } });
      } catch (error) {
        update({ deliveries: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    async replayDelivery(deliveryId: string) {
      const webhookEndpointId = state.deliveriesEndpointIdInput.trim();
      if (!webhookEndpointId) return;
      try {
        await gateway.replayWebhookDelivery(deliveryId);
        const deliveries = await gateway.webhookDeliveries(webhookEndpointId);
        update({ deliveries: { status: 'ready', data: deliveries, error: null } });
      } catch (error) {
        update({ deliveries: { status: 'error', data: state.deliveries.data, error: errorText(error) } });
      }
    },

    setSecureCodeAiToolInput(value: string) { update({ secureCodeAiToolInput: value }); },

    async issueSecureCode() {
      const applicationId = state.application.data?.id;
      if (!applicationId || state.secureCodeBusy) return;
      update({ secureCodeBusy: true, secureCodeError: null, issuedSecureCode: null });
      try {
        const code = await gateway.issueSecureCode(applicationId, { aiTool: state.secureCodeAiToolInput.trim() || undefined });
        update({ secureCodeBusy: false, issuedSecureCode: code });
      } catch (error) {
        update({ secureCodeBusy: false, secureCodeError: errorText(error) });
      }
    },

    async revokeSecureCode(secureCodeId: string) {
      if (state.secureCodeBusy) return;
      update({ secureCodeBusy: true, secureCodeError: null });
      try {
        await gateway.revokeSecureCode(secureCodeId);
        update({ secureCodeBusy: false, issuedSecureCode: null });
      } catch (error) {
        update({ secureCodeBusy: false, secureCodeError: errorText(error) });
      }
    },
  };
}
export type DeveloperController = ReturnType<typeof createDeveloperController>;
