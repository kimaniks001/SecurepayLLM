import type { AgreementGateway } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 2, Sections 8/9/10) — the SecureLink lifecycle management
 * experience for an Agreement that may already have an active SecureLink. Loads the bounded existence
 * truth first, so "Create SecureLink" is never blindly re-offered for an Agreement that already has one
 * (Section 8). "Replace SecureLink" (Section 9) reuses the existing backend rotate authority as-is —
 * never a new locator algorithm — and requires an explicit human confirmation naming the exact
 * consequence (the old link stops working) before ever mutating anything. "Revoke SecureLink"
 * (Section 10) reuses the existing backend revoke authority the same way, with its own explicit
 * confirmation, and never implies the Agreement itself was cancelled.
 *
 * Idempotency discipline matches `createController.ts`'s own established idiom: a key is minted once
 * per logical attempt and reused across an uncertain-outcome retry, never re-minted per click.
 */
export type ManageState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'no-link' }
  | { phase: 'has-link'; locatorId: string; pathClass: string; status: string; issuedAt: string; expiresAt: string | null }
  | { phase: 'confirm-replace'; locatorId: string }
  | { phase: 'replacing'; locatorId: string; busy: boolean; error: string | null }
  | { phase: 'replace-uncertain'; locatorId: string; error: string }
  | { phase: 'replaced'; slug: string; publicUrl: string | null }
  | { phase: 'confirm-revoke'; locatorId: string }
  | { phase: 'revoking'; locatorId: string; busy: boolean; error: string | null }
  | { phase: 'revoke-uncertain'; locatorId: string; error: string }
  | { phase: 'revoked' };

type Gateway = Pick<AgreementGateway, 'activeLocator' | 'rotatePublicLocator' | 'revokePublicLocator'>;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay couldn’t confirm whether that went through. Try again — it’s safe to retry.';
    }
    return error.message;
  }
  return 'SecurePay could not complete this action.';
}

function isUncertain(error: unknown): boolean {
  return error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
}

export function createSecureLinkManageController(
  gateway: Gateway,
  agreementId: string,
  id = () => crypto.randomUUID(),
) {
  let state: ManageState = { phase: 'loading' };
  const listeners = new Set<() => void>();
  const update = (next: ManageState) => { state = next; listeners.forEach(listener => listener()); };

  // Minted once per logical replace/revoke attempt, reused across an uncertain-outcome retry.
  let replaceKey: string | null = null;
  let revokeKey: string | null = null;

  async function load() {
    update({ phase: 'loading' });
    try {
      const summary = await gateway.activeLocator(agreementId);
      if (!summary.hasActiveLocator || !summary.locatorId) {
        update({ phase: 'no-link' });
        return;
      }
      update({
        phase: 'has-link',
        locatorId: summary.locatorId,
        pathClass: summary.pathClass ?? '',
        status: summary.status ?? '',
        issuedAt: summary.issuedAt ?? '',
        expiresAt: summary.expiresAt,
      });
    } catch (error) {
      update({ phase: 'error', message: errorMessage(error) });
    }
  }

  // ---------------------------------------------------------------- Replace ("Replace SecureLink")

  function startReplace() {
    if (state.phase !== 'has-link') return;
    update({ phase: 'confirm-replace', locatorId: state.locatorId });
  }

  function cancelReplace() {
    if (state.phase !== 'confirm-replace') return;
    load();
  }

  async function confirmReplace() {
    if (state.phase !== 'confirm-replace' && state.phase !== 'replace-uncertain') return;
    const locatorId = state.locatorId;
    if (!replaceKey) replaceKey = id();
    update({ phase: 'replacing', locatorId, busy: true, error: null });
    try {
      const result = await gateway.rotatePublicLocator(agreementId, locatorId, replaceKey);
      replaceKey = null;
      update({ phase: 'replaced', slug: result.slug, publicUrl: result.publicUrl });
    } catch (error) {
      if (isUncertain(error)) {
        update({ phase: 'replace-uncertain', locatorId, error: errorMessage(error) });
        return;
      }
      // A definite failure means this logical attempt is over -- a fresh confirm mints a fresh key.
      // Re-load rather than fabricate stale/blank field values; backend truth wins.
      replaceKey = null;
      await load();
    }
  }

  // ---------------------------------------------------------------- Revoke ("Revoke SecureLink")

  function startRevoke() {
    if (state.phase !== 'has-link') return;
    update({ phase: 'confirm-revoke', locatorId: state.locatorId });
  }

  function cancelRevoke() {
    if (state.phase !== 'confirm-revoke') return;
    load();
  }

  async function confirmRevoke() {
    if (state.phase !== 'confirm-revoke' && state.phase !== 'revoke-uncertain') return;
    const locatorId = state.locatorId;
    if (!revokeKey) revokeKey = id();
    update({ phase: 'revoking', locatorId, busy: true, error: null });
    try {
      await gateway.revokePublicLocator(agreementId, locatorId, revokeKey);
      revokeKey = null;
      update({ phase: 'revoked' });
    } catch (error) {
      if (isUncertain(error)) {
        update({ phase: 'revoke-uncertain', locatorId, error: errorMessage(error) });
        return;
      }
      revokeKey = null;
      await load();
    }
  }

  function createNewAfterRevoke() {
    if (state.phase !== 'revoked') return;
    update({ phase: 'no-link' });
  }

  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: (): ManageState => state,
    load,
    startReplace,
    cancelReplace,
    confirmReplace,
    startRevoke,
    cancelRevoke,
    confirmRevoke,
    createNewAfterRevoke,
  };
}

export type SecureLinkManageController = ReturnType<typeof createSecureLinkManageController>;
