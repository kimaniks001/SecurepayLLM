import type { AgreementGateway } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) — issues the PRE-ACTIVATION public Agreement
 * doorway (never an ACTIVE SecureLink product — see `issuePublicDoorway`'s own doctrine). A single
 * idempotent backend call, unlike the two-step `createSecureLinkCreateController` (activate + issue):
 * a doorway has no product to activate first. On an uncertain (network/timeout/5xx) outcome, retrying
 * reuses the SAME idempotency key minted for this one logical attempt.
 */
export type CreateDoorwayState =
  | { phase: 'idle'; busy: boolean; error: string | null }
  | { phase: 'created'; slug: string; publicUrl: string | null }
  | { phase: 'uncertain'; error: string };

type Gateway = Pick<AgreementGateway, 'issuePublicDoorway'>;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay couldn’t confirm whether that went through. Try again — it won’t create a duplicate.';
    }
    if (error.code === 'AGREEMENT_CONFLICT') {
      return 'This Agreement already has an active SecureLink doorway.';
    }
    if (error.status === 422 || error.status === 400) {
      return 'This Agreement has to be proposed before it can be shared.';
    }
    return error.message;
  }
  return 'SecurePay could not create the SecureLink.';
}

function isUncertain(error: unknown): boolean {
  return error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
}

export function createDoorwayCreateController(
  gateway: Gateway,
  agreementId: string,
  id = () => crypto.randomUUID(),
) {
  let state: CreateDoorwayState = { phase: 'idle', busy: false, error: null };
  const listeners = new Set<() => void>();
  const update = (next: CreateDoorwayState) => { state = next; listeners.forEach(listener => listener()); };

  let issueKey: string | null = null;

  async function attempt() {
    try {
      const locator = await gateway.issuePublicDoorway(agreementId, issueKey as string);
      update({ phase: 'created', slug: locator.slug, publicUrl: locator.publicUrl });
    } catch (error) {
      if (isUncertain(error)) {
        update({ phase: 'uncertain', error: errorMessage(error) });
        return;
      }
      update({ phase: 'idle', busy: false, error: errorMessage(error) });
      issueKey = null;
    }
  }

  async function create() {
    if (state.phase !== 'idle' || state.busy) return;
    issueKey = id();
    update({ phase: 'idle', busy: true, error: null });
    await attempt();
  }

  async function retry() {
    if (state.phase !== 'uncertain' || !issueKey) return;
    update({ phase: 'idle', busy: true, error: null });
    await attempt();
  }

  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: (): CreateDoorwayState => state,
    create,
    retry,
  };
}

export type DoorwayCreateController = ReturnType<typeof createDoorwayCreateController>;
