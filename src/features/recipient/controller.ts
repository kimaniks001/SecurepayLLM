import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AgreementConfirmationResponse, AgreementVersionResponse, JoinAgreementResponse, PublicInvitationViewResponse } from '../../api/securepay/agreements/dto';
import { ApiError } from '../../api/securepay/http';
import { errorText as agentErrorText } from '../agent/controller';

/** errorText's 401/403 copy is written for the Agent turn flow ("your message is still here"), which
 * does not apply to invitation/Join/confirm. Recipient-specific wording replaces only that case. */
function errorText(error: unknown): string {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return 'SecurePay could not allow this request.';
  return agentErrorText(error);
}

export type RecipientPhase =
  | 'idle' | 'loading-invitation' | 'invitation-ready' | 'invitation-error'
  | 'identity-required'
  | 'join-prompt' | 'joining' | 'join-error'
  | 'version-loading' | 'version-ready'
  | 'confirming' | 'confirm-error' | 'confirmed'
  | 'error';

export interface RecipientState {
  phase: RecipientPhase;
  invitation: PublicInvitationViewResponse | null;
  join: JoinAgreementResponse | null;
  version: AgreementVersionResponse | null;
  confirmation: AgreementConfirmationResponse | null;
  /** True once the version being shown was re-fetched after the previously joined/reviewed one stopped being current. */
  changed: boolean;
  joinIdempotencyKey: string | null;
  confirmIdempotencyKey: string | null;
  error: string | null;
}
const initial: RecipientState = {
  phase: 'idle', invitation: null, join: null, version: null, confirmation: null,
  changed: false, joinIdempotencyKey: null, confirmIdempotencyKey: null, error: null,
};

type Gateway = Pick<AgreementGateway, 'invitation' | 'join' | 'versions' | 'version' | 'confirmVersion'>;

/**
 * Narrow recipient orchestration only: invitation -> identity (owned by the shared identity
 * controller) -> explicit Join -> exact-version review -> explicit confirmation. Never derives
 * Agreement lifecycle, participant, or confirmation truth locally — every phase transition follows
 * an authoritative backend response.
 */
export function createRecipientController(gateway: Gateway, token: string, id = () => crypto.randomUUID()) {
  let state: RecipientState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<RecipientState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  /** Re-reads which version is authoritative-current and fetches it fresh; never reuses a stale confirm key. */
  async function recoverCurrentVersion(agreementId: string) {
    try {
      const summaries = await gateway.versions(agreementId);
      if (summaries.length === 0) { update({ phase: 'error', error: 'SecurePay has no version to show for this Agreement.' }); return; }
      const current = summaries.reduce((a, b) => (b.versionNumber > a.versionNumber ? b : a));
      const version = await gateway.version(agreementId, current.versionId);
      update({ version, phase: 'version-ready', changed: true, confirmIdempotencyKey: null });
    } catch (error) {
      update({ phase: 'error', error: errorText(error) });
    }
  }

  async function loadVersion(agreementId: string, versionId: string, changed: boolean) {
    update({ phase: 'version-loading' });
    try {
      const version = await gateway.version(agreementId, versionId);
      if (version.versionStatus !== 'CURRENT') {
        await recoverCurrentVersion(agreementId);
        return;
      }
      update({ version, phase: 'version-ready', changed });
    } catch (error) {
      update({ phase: 'error', error: errorText(error) });
    }
  }

  return {
    getSnapshot: (): RecipientState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Public review only. Never authenticates, joins, or confirms anything. */
    async load() {
      if (state.phase !== 'idle' && state.phase !== 'invitation-error') return;
      update({ ...initial, phase: 'loading-invitation' });
      try {
        const invitation = await gateway.invitation(token);
        update({ invitation, phase: 'invitation-ready' });
      } catch (error) {
        update({ phase: 'invitation-error', error: errorText(error) });
      }
    },

    /** Called once a real session exists. Moves only to the explicit Join boundary — never joins by itself. */
    afterIdentitySignedIn() {
      if (state.phase !== 'identity-required') return;
      update({ phase: 'join-prompt' });
    },

    /** From the invitation review: routes to identity if needed, or straight to the explicit Join boundary. */
    proceed(alreadySignedIn: boolean) {
      if (state.phase !== 'invitation-ready') return;
      update({ phase: alreadySignedIn ? 'join-prompt' : 'identity-required' });
    },

    /** Only an explicit user action may reach this. Reuses the same idempotency key on a deliberate retry. */
    async join() {
      if (state.phase !== 'join-prompt' && state.phase !== 'join-error') return;
      const idempotencyKey = state.joinIdempotencyKey ?? id();
      update({ phase: 'joining', error: null, joinIdempotencyKey: idempotencyKey });
      try {
        const result = await gateway.join(token, idempotencyKey);
        update({ join: result });
        await loadVersion(result.agreementId, result.joinedVersionId, false);
      } catch (error) {
        update({ phase: 'join-error', error: errorText(error) });
      }
    },

    /** Only the locked explicit "Yes, this is what I agree to" action may reach this. */
    async confirm() {
      if (state.phase !== 'version-ready' && state.phase !== 'confirm-error') return;
      if (!state.join || !state.version || state.version.versionStatus !== 'CURRENT') return;
      const { agreementId } = state.join;
      const version = state.version;
      const idempotencyKey = state.confirmIdempotencyKey ?? id();
      update({ phase: 'confirming', error: null, confirmIdempotencyKey: idempotencyKey });
      try {
        const confirmation = await gateway.confirmVersion(agreementId, version.id, {
          idempotencyKey,
          expectedVersionNumber: version.versionNumber,
          expectedContentHash: version.contentHash,
        });
        update({ confirmation, phase: 'confirmed' });
      } catch (error) {
        if (error instanceof ApiError && (error.status === 422 || error.status === 409)) {
          // Stale/superseded/conflict: never retried automatically and never reused against a new version.
          update({ confirmIdempotencyKey: null });
          await recoverCurrentVersion(agreementId);
          return;
        }
        // Network/timeout/etc: safe for the person to retry the same explicit action unchanged.
        update({ phase: 'confirm-error', error: errorText(error) });
      }
    },

    /** Returns to the initial idle-equivalent state. A fresh load() is required to view an invitation again. */
    reset() { update({ ...initial }); },
  };
}
export type RecipientController = ReturnType<typeof createRecipientController>;
