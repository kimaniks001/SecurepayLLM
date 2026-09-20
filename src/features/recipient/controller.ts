import type { AgreementGateway, AgreementParticipantDto } from '../../api/securepay/agreements';
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
    if (isUncertain(error)) return UNCERTAIN;
    if (error.status === 401) return 'Your session ended before SecurePay could act on this. Nothing was joined or confirmed.';
    if (error.status === 403) return 'This invitation isn’t linked to the account you’re signed in with. Nothing was joined. Sign in with the account it was sent to.';
    if (error.kind === 'http') return error.message;
  }
  return agentErrorText(error);
}

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may already have recorded it. */
export const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';

/**
 * SecurePay answers every unusable invitation with ONE status (422 AGREEMENT_INVITATION_ERROR) and tells the
 * cases apart only in its message. Known messages get plain words; anything else gets a calm generic line and is
 * never echoed, so an unexpected backend string is not shown to a stranger. Nothing here reveals whether a
 * private Agreement exists beyond what SecurePay itself already said.
 */
export function invitationProblem(error: unknown): string {
  if (error instanceof ApiError) {
    if (isUncertain(error)) return 'SecurePay couldn’t open this invitation right now. Nothing has changed — try again in a moment.';
    const said = error.kind === 'http' ? error.message.toLowerCase() : '';
    if (said.includes('revoked')) return 'This invitation is no longer available. The person who sent it withdrew it.';
    if (said.includes('expired')) return 'This invitation has expired. You can ask the person who sent it for a new one.';
    if (said.includes('already joined')) return 'This invitation has already been used to join. If that was you, open the Agreement from your Agreements.';
    if (said.includes('no longer available')) return 'This Agreement is no longer available.';
    if (said.includes('not found') || said.includes('invalid')) return 'SecurePay can’t find this invitation. Check the link you were sent.';
  }
  return 'This invitation couldn’t be opened. Nothing has changed.';
}

export type RecipientPhase =
  | 'idle' | 'loading-invitation' | 'invitation-ready' | 'invitation-error'
  | 'identity-required'
  | 'join-prompt' | 'joining' | 'join-error' | 'join-uncertain'
  | 'version-loading' | 'version-ready'
  | 'confirming' | 'confirm-error' | 'confirm-uncertain' | 'confirmed'
  | 'error';

export interface RecipientState {
  phase: RecipientPhase;
  invitation: PublicInvitationViewResponse | null;
  join: JoinAgreementResponse | null;
  version: AgreementVersionResponse | null;
  confirmation: AgreementConfirmationResponse | null;
  /** True once the version being shown was re-fetched after the previously joined/reviewed one stopped being current. */
  changed: boolean;
  /** Who else is on the Agreement, as SecurePay lists them (role + status only -- it exposes no name or KS Number). null = not loaded. */
  participants: AgreementParticipantDto[] | null;
  /** Where to go once the person has signed in again mid-journey (never assumes the interrupted step happened). */
  resume: 'join-prompt' | 'version-ready' | null;
  joinIdempotencyKey: string | null;
  confirmIdempotencyKey: string | null;
  error: string | null;
}
const initial: RecipientState = {
  phase: 'idle', invitation: null, join: null, version: null, confirmation: null,
  changed: false, participants: null, resume: null, joinIdempotencyKey: null, confirmIdempotencyKey: null, error: null,
};

type Gateway = Pick<AgreementGateway, 'invitation' | 'join' | 'versions' | 'version' | 'confirmVersion' | 'participants'>;

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
      void loadParticipants(agreementId);
    } catch (error) {
      update({ phase: 'error', error: errorText(error) });
    }
  }

  /** Best-effort: roles and statuses are context for the review, never a precondition for it. */
  async function loadParticipants(agreementId: string) {
    try { update({ participants: await gateway.participants(agreementId) }); } catch { /* the review stands without it */ }
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
      void loadParticipants(agreementId);
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
    if (isUncertain(error)) {
      // Not proof it failed. The SAME request (same key, same exact version) is safe to send again: SecurePay replays it.
      update({ phase: 'confirm-uncertain', error: UNCERTAIN });
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      update({ phase: 'identity-required', resume: 'version-ready', error: null });
      return;
    }
    if (!(error instanceof ApiError) || (error.status !== 422 && error.status !== 409)) {
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
      // Not a version change: the real confirmation failure stands and is never auto-retried.
      // A same-version 422 may still be retried with the same body, so its key is kept. A same-version
      // 409 is AgreementConflictException("idempotency key reused with different request") — the
      // backend has that exact key permanently bound to a different request digest, so reusing it
      // would deterministically fail forever; it must be cleared so the next explicit click mints a
      // fresh key for this same still-current reviewed version.
      update({ phase: 'confirm-error', error: errorText(error), confirmIdempotencyKey: error.status === 409 ? null : state.confirmIdempotencyKey });
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
        update({ phase: 'invitation-error', error: invitationProblem(error) });
      }
    },

    /** Called once a real session exists. Moves only to the explicit Join boundary — never joins by itself. */
    afterIdentitySignedIn() {
      if (state.phase !== 'identity-required') return;
      update({ phase: state.resume ?? 'join-prompt', resume: null });
    },

    /** From the invitation review: routes to identity if needed, or straight to the explicit Join boundary. */
    proceed(alreadySignedIn: boolean) {
      if (state.phase !== 'invitation-ready') return;
      update({ phase: alreadySignedIn ? 'join-prompt' : 'identity-required' });
    },

    /** Only an explicit user action may reach this. Reuses the same idempotency key on a deliberate retry. */
    async join() {
      if (!['join-prompt', 'join-error', 'join-uncertain'].includes(state.phase)) return;
      const idempotencyKey = state.joinIdempotencyKey ?? id();
      update({ phase: 'joining', error: null, joinIdempotencyKey: idempotencyKey });
      try {
        const result = await gateway.join(token, idempotencyKey);
        update({ join: result });
        await loadVersion(result.agreementId, result.joinedVersionId, false);
      } catch (error) {
        if (isUncertain(error)) { update({ phase: 'join-uncertain', error: UNCERTAIN }); return; }
        if (error instanceof ApiError && error.status === 401) { update({ phase: 'identity-required', resume: 'join-prompt', error: null }); return; }
        update({ phase: 'join-error', error: errorText(error) });
      }
    },

    /** Only the locked explicit "Yes, this is what I agree to" action may reach this. */
    async confirm() {
      if (!['version-ready', 'confirm-error', 'confirm-uncertain'].includes(state.phase)) return;
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

    /** After Join succeeded but the version could not be loaded: the person IS joined, so only the read is retried. */
    async reloadVersion() {
      if (!state.join || state.phase !== 'error') return;
      await loadVersion(state.join.agreementId, state.join.joinedVersionId, false);
    },

    /** Returns to the initial idle-equivalent state. A fresh load() is required to view an invitation again. */
    reset() { update({ ...initial }); },
  };
}
export type RecipientController = ReturnType<typeof createRecipientController>;
