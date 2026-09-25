import type { AgreementGateway } from '../../api/securepay/agreements';
import type { PublicProductViewDto } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

/**
 * KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 8) — the public SecureLink
 * review-first experience. Opening a SecureLink is REVIEW ONLY: it is never Join, confirmation,
 * acceptance, payment, or contribution. This controller's only two authoritative calls are the public
 * (no-auth) view read and, once the caller explicitly asks to join AND is signed in, the authenticated
 * join-authority bridge — which itself never joins anyone; it only hands back a fresh single-use
 * invitation token that the EXISTING `#/invitation/{token}` route (RecipientExperience, unchanged) then
 * carries through the SAME Join core. This never re-implements Join.
 */
export type SecureLinkPublicState =
  | { phase: 'loading' }
  | { phase: 'not-found' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; view: PublicProductViewDto }
  | { phase: 'identity-required'; view: PublicProductViewDto }
  | { phase: 'requesting-join-authority'; view: PublicProductViewDto }
  | { phase: 'join-authority-error'; view: PublicProductViewDto; message: string }
  | { phase: 'redirecting-to-join' };

type Gateway = Pick<AgreementGateway, 'viewSecureLink' | 'requestSecureLinkJoinAuthority'>;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay is unavailable. Please try again.';
    }
    if (error.status === 409) return error.message || 'This SecureLink cannot be joined right now.';
    return error.message;
  }
  return 'SecurePay could not complete this step.';
}

export function createSecureLinkPublicController(gateway: Gateway, slug: string, id = () => crypto.randomUUID()) {
  let state: SecureLinkPublicState = { phase: 'loading' };
  const listeners = new Set<() => void>();
  const update = (next: SecureLinkPublicState) => { state = next; listeners.forEach(listener => listener()); };

  async function load() {
    update({ phase: 'loading' });
    try {
      const view = await gateway.viewSecureLink(slug);
      update({ phase: 'ready', view });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        update({ phase: 'not-found' });
        return;
      }
      update({ phase: 'error', message: errorMessage(error) });
    }
  }

  /** Called once a real session exists (after identity-required). Never assumes signing in alone means joining. */
  async function requestJoinAuthority(signedIn: boolean) {
    if (state.phase !== 'ready' && state.phase !== 'identity-required') return;
    const view = state.view;
    if (!signedIn) {
      update({ phase: 'identity-required', view });
      return;
    }
    update({ phase: 'requesting-join-authority', view });
    try {
      const result = await gateway.requestSecureLinkJoinAuthority(slug, id());
      if (!result.invitationToken) {
        // A replay with no fresh token -- SecurePay never re-issues a raw token on replay. Fail closed,
        // never guess a stale one.
        update({ phase: 'join-authority-error', view, message: 'SecurePay could not confirm a fresh join link. Please try again.' });
        return;
      }
      update({ phase: 'redirecting-to-join' });
      if (typeof window !== 'undefined') {
        window.location.hash = `#/invitation/${encodeURIComponent(result.invitationToken)}`;
      }
    } catch (error) {
      update({ phase: 'join-authority-error', view, message: errorMessage(error) });
    }
  }

  function backToReview() {
    if (state.phase === 'identity-required' || state.phase === 'join-authority-error') {
      update({ phase: 'ready', view: state.view });
    }
  }

  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: (): SecureLinkPublicState => state,
    load,
    requestJoinAuthority,
    backToReview,
  };
}

export type SecureLinkPublicController = ReturnType<typeof createSecureLinkPublicController>;
