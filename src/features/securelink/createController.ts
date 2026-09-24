import type { AgreementGateway } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/**
 * KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 3/6/7) — the deliberate, explicit
 * "Create SecureLink" continuation after a successful Agreement SET. NEVER automatic: the person must
 * explicitly choose this. Two idempotent backend calls in sequence:
 *
 * 1. `activateProduct` — the backend classifies SECURE_LINK vs KEY_CONTRACT itself from the Agreement's
 *    own obligations (the frontend never supplies or guesses a productType). The only real input this
 *    flow asks for is whether the amount should be publicly visible — a genuine privacy choice that
 *    defaults OFF (private) and is never silently assumed true.
 * 2. `issuePublicLocator` — issues the actual shareable slug/URL against the now-active product.
 *
 * A `publicUrl` of `null` in the result means the production public-facing base URL is not configured
 * yet (Pending external confirmation) — the caller must show the slug and an honest "sharing isn't
 * configured here yet" note, never fabricate a URL.
 *
 * On an uncertain (network/timeout/5xx) outcome, retrying reuses the SAME two idempotency keys minted
 * for this one logical attempt — never a fresh key per click, matching this codebase's own
 * "uncertain → retry the SAME request" idiom (see `features/handoff/controller.ts#createDraft`).
 */
export type CreateSecureLinkState =
  | { phase: 'form'; purposeSummary: string; publicAmountDisplay: boolean; busy: boolean; error: string | null }
  | { phase: 'created'; slug: string; publicUrl: string | null }
  | { phase: 'uncertain'; error: string };

type Gateway = Pick<AgreementGateway, 'activateProduct' | 'issuePublicLocator'>;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay couldn’t confirm whether that went through. Try again — it won’t create a duplicate.';
    }
    return error.message;
  }
  return 'SecurePay could not create the SecureLink.';
}

function isUncertain(error: unknown): boolean {
  return error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
}

export function createSecureLinkCreateController(
  gateway: Gateway,
  agreementId: string,
  defaultPurposeSummary: string,
  id = () => crypto.randomUUID(),
) {
  let state: CreateSecureLinkState = { phase: 'form', purposeSummary: defaultPurposeSummary, publicAmountDisplay: false, busy: false, error: null };
  const listeners = new Set<() => void>();
  const update = (next: CreateSecureLinkState) => { state = next; listeners.forEach(listener => listener()); };

  // Minted once per logical attempt, reused across an uncertain-outcome retry -- never a fresh key per click.
  let activateKey: string | null = null;
  let issueKey: string | null = null;
  let attemptedPurposeSummary = '';
  let attemptedPublicAmountDisplay = false;

  function setPurposeSummary(value: string) {
    if (state.phase !== 'form') return;
    update({ ...state, purposeSummary: value, error: null });
  }
  function setPublicAmountDisplay(value: boolean) {
    if (state.phase !== 'form') return;
    update({ ...state, publicAmountDisplay: value });
  }

  async function attempt(purposeSummary: string, publicAmountDisplay: boolean) {
    try {
      await gateway.activateProduct(agreementId, {
        idempotencyKey: activateKey as string,
        purposeSummary,
        publicAmountDisplay,
      });
      const locator = await gateway.issuePublicLocator(agreementId, issueKey as string);
      update({ phase: 'created', slug: locator.slug, publicUrl: locator.publicUrl });
    } catch (error) {
      if (isUncertain(error)) {
        update({ phase: 'uncertain', error: errorMessage(error) });
        return;
      }
      update({ phase: 'form', purposeSummary, publicAmountDisplay, busy: false, error: errorMessage(error) });
      // A definite failure (not merely uncertain) means this logical attempt is over -- a fresh click
      // mints fresh keys next time, never reuses a definitively-rejected pair.
      activateKey = null;
      issueKey = null;
    }
  }

  async function create() {
    if (state.phase !== 'form' || state.busy) return;
    const purposeSummary = state.purposeSummary.trim();
    if (!purposeSummary) {
      update({ ...state, error: 'Say what this SecureLink is for.' });
      return;
    }
    activateKey = id();
    issueKey = id();
    attemptedPurposeSummary = purposeSummary;
    attemptedPublicAmountDisplay = state.publicAmountDisplay;
    update({ ...state, purposeSummary, busy: true, error: null });
    await attempt(purposeSummary, attemptedPublicAmountDisplay);
  }

  async function retry() {
    if (state.phase !== 'uncertain' || !activateKey || !issueKey) return;
    update({ phase: 'form', purposeSummary: attemptedPurposeSummary, publicAmountDisplay: attemptedPublicAmountDisplay, busy: true, error: null });
    await attempt(attemptedPurposeSummary, attemptedPublicAmountDisplay);
  }

  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: (): CreateSecureLinkState => state,
    setPurposeSummary,
    setPublicAmountDisplay,
    create,
    retry,
  };
}

export type SecureLinkCreateController = ReturnType<typeof createSecureLinkCreateController>;
