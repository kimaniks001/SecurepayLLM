import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AgreementConfirmationResponse, AgreementVersionResponse, JoinAgreementResponse, PublicInvitationViewResponse } from '../../api/securepay/agreements/dto';
import { ApiError } from '../../api/securepay/http';
import { errorText as agentErrorText } from '../agent/controller';

/**
 * The shared Agent errorText bakes in Agent-conversation-specific wording for several statuses (401/403
 * "your message is still here"; 409 "refresh what SecurePay understands"; 404 "conversation or
 * candidate") that does not apply to invitation/Join/confirm and would misrepresent a real
 * confirmation/join failure as something it is not (e.g. presenting a genuine `AGREEMENT_CONFIRMATION_ERROR`
 * as a generic "this changed" prompt). Any real backend HTTP failure keeps its own message here; only
 * network/timeout/abort/invalid-response kinds fall back to the shared, kind-based generic wording.
 */
function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.kind === 'http') return error.message;
  }
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

  /**
   * Selects the single authoritative CURRENT version from a /versions read. Backend versionStatus is
   * the only authority consulted here — never a numeric inference from versionNumber. Zero or more
   * than one CURRENT entry is treated as ambiguous authority and fails closed (the caller renders
   * that as an error rather than guessing).
   */
  function findCurrentVersion(versions: AgreementVersionResponse[]): AgreementVersionResponse | null {
    const current = versions.filter(v => v.versionStatus === 'CURRENT');
    return current.length === 1 ? current[0] : null;
  }

  /** Re-reads which version is authoritative-current and fetches it fresh; never reuses a stale confirm key. */
  async function recoverCurrentVersion(agreementId: string) {
    try {
      const versions = await gateway.versions(agreementId);
      const current = findCurrentVersion(versions);
      if (!current) { update({ phase: 'error', error: 'SecurePay could not identify a single current Agreement version.' }); return; }
      const version = await gateway.version(agreementId, current.id);
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

  /**
   * A 422/409 confirm failure is not proof by itself that the Agreement changed:
   * AgreementConfirmationException uses one generic 422 code for stale number/hash, superseded
   * version, and other confirmation failures (e.g. "cannot confirm for another participant"), and 409
   * also covers idempotency-key/agreement conflicts unrelated to version drift. Re-read authoritative
   * versions and compare identity (id/versionNumber/contentHash) against the exact version that was
   * reviewed before deciding which of those this is.
   */
  async function handleConfirmFailure(agreementId: string, reviewedVersion: AgreementVersionResponse, error: unknown) {
    if (!(error instanceof ApiError) || (error.status !== 422 && error.status !== 409)) {
      // Network/timeout/etc: safe for the person to retry the same explicit action unchanged.
      update({ phase: 'confirm-error', error: errorText(error) });
      return;
    }
    let versions: AgreementVersionResponse[];
    try {
      versions = await gateway.versions(agreementId);
    } catch (readError) {
      update({ phase: 'error', error: errorText(readError) });
      return;
    }
    const current = findCurrentVersion(versions);
    if (!current) { update({ phase: 'error', error: 'SecurePay could not identify a single current Agreement version.' }); return; }
    const sameVersion = current.id === reviewedVersion.id && current.versionNumber === reviewedVersion.versionNumber && current.contentHash === reviewedVersion.contentHash;
    if (sameVersion) {
      // Not a version change: the real confirmation failure stands, never auto-retried, but the same
      // explicit action against the same unchanged body may still be retried, so its key is kept.
      update({ phase: 'confirm-error', error: errorText(error) });
      return;
    }
    // Genuine supersession: never reuse the old confirm key against the newly current version.
    try {
      const version = await gateway.version(agreementId, current.id);
      update({ version, phase: 'version-ready', changed: true, confirmIdempotencyKey: null, error: null });
    } catch (readError) {
      update({ phase: 'error', error: errorText(readError) });
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
        await handleConfirmFailure(agreementId, version, error);
      }
    },

    /** Returns to the initial idle-equivalent state. A fresh load() is required to view an invitation again. */
    reset() { update({ ...initial }); },
  };
}
export type RecipientController = ReturnType<typeof createRecipientController>;
