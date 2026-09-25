import type { AgreementGateway } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) — the PRE-ACTIVATION doorway's own lifecycle
 * management, mirroring `manageController.ts`'s established shape exactly (same load/replace/revoke
 * idempotency discipline) but calling the separate doorway endpoints — never the ACTIVE-product
 * SecureLink ones. Kept as its own controller (rather than a parameterized generic) matching this
 * codebase's own existing precedent of separate controllers per SecureLink flavor (individual vs Group).
 */
export type DoorwayManageState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'no-doorway' }
  | { phase: 'has-doorway'; locatorId: string; status: string; issuedAt: string; expiresAt: string | null }
  | { phase: 'confirm-replace'; locatorId: string }
  | { phase: 'replacing'; locatorId: string; busy: boolean; error: string | null }
  | { phase: 'replace-uncertain'; locatorId: string; error: string }
  | { phase: 'replaced'; slug: string; publicUrl: string | null }
  | { phase: 'confirm-revoke'; locatorId: string }
  | { phase: 'revoking'; locatorId: string; busy: boolean; error: string | null }
  | { phase: 'revoke-uncertain'; locatorId: string; error: string }
  | { phase: 'revoked' };

type Gateway = Pick<AgreementGateway, 'activeDoorway' | 'rotatePublicDoorway' | 'revokePublicDoorway'>;

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

export function createDoorwayManageController(
  gateway: Gateway,
  agreementId: string,
  id = () => crypto.randomUUID(),
) {
  let state: DoorwayManageState = { phase: 'loading' };
  const listeners = new Set<() => void>();
  const update = (next: DoorwayManageState) => { state = next; listeners.forEach(listener => listener()); };

  let replaceKey: string | null = null;
  let revokeKey: string | null = null;

  async function load() {
    update({ phase: 'loading' });
    try {
      const summary = await gateway.activeDoorway(agreementId);
      if (!summary.hasActiveLocator || !summary.locatorId) {
        update({ phase: 'no-doorway' });
        return;
      }
      update({
        phase: 'has-doorway',
        locatorId: summary.locatorId,
        status: summary.status ?? '',
        issuedAt: summary.issuedAt ?? '',
        expiresAt: summary.expiresAt,
      });
    } catch (error) {
      update({ phase: 'error', message: errorMessage(error) });
    }
  }

  function startReplace() {
    if (state.phase !== 'has-doorway') return;
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
      const result = await gateway.rotatePublicDoorway(agreementId, locatorId, replaceKey);
      replaceKey = null;
      update({ phase: 'replaced', slug: result.slug, publicUrl: result.publicUrl });
    } catch (error) {
      if (isUncertain(error)) {
        update({ phase: 'replace-uncertain', locatorId, error: errorMessage(error) });
        return;
      }
      replaceKey = null;
      await load();
    }
  }

  function startRevoke() {
    if (state.phase !== 'has-doorway') return;
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
      await gateway.revokePublicDoorway(agreementId, locatorId, revokeKey);
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
    update({ phase: 'no-doorway' });
  }

  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: (): DoorwayManageState => state,
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

export type DoorwayManageController = ReturnType<typeof createDoorwayManageController>;
