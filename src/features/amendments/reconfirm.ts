import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AgreementConfirmationResponse, AgreementVersionResponse } from '../../api/securepay/agreements/dto';
import { ApiError } from '../../api/securepay/http';
import { pickCurrentVersion } from '../recipient/controller';

export type ReconfirmPhase = 'idle' | 'loading' | 'ready' | 'confirming' | 'confirmed' | 'uncertain' | 'error';
export interface ReconfirmState {
  phase: ReconfirmPhase;
  version: AgreementVersionResponse | null;
  confirmation: AgreementConfirmationResponse | null;
  /** True once the version shown replaced one that stopped being current while the person was looking at it. */
  changed: boolean;
  error: string | null;
}
const initial: ReconfirmState = { phase: 'idle', version: null, confirmation: null, changed: false, error: null };
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
export const UNCERTAIN = 'SecurePay couldn’t confirm whether that went through.';

type Gateway = Pick<AgreementGateway, 'versions' | 'version' | 'confirmVersion'>;

/**
 * Re-review of the CURRENT version by an existing participant. It is the SAME authority as the recipient's Phase 4
 * confirmation -- the same endpoint bound to the exact version id, number and content hash -- not a second mechanism.
 * Reviewing never confirms; confirming is its own explicit press; nothing here is automatic.
 */
export function createReconfirmController(gateway: Gateway, agreementId: string, onConfirmed: () => void = () => {}, id = () => crypto.randomUUID()) {
  let state: ReconfirmState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<ReconfirmState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  let key: string | null = null;

  async function loadCurrent(changed: boolean) {
    const versions = await gateway.versions(agreementId);
    const current = pickCurrentVersion(versions);
    if (!current) throw new Error('ambiguous');
    const version = await gateway.version(agreementId, current.id);
    if (version.versionStatus !== 'CURRENT') throw new Error('moved');
    update({ version, phase: 'ready', changed, error: null });
  }

  return {
    getSnapshot: (): ReconfirmState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** "Review version N": reads the canonical current version. Confirms nothing. */
    async open() {
      if (!['idle', 'error'].includes(state.phase)) return;
      update({ phase: 'loading', error: null });
      try { await loadCurrent(false); }
      catch (error) { update({ phase: 'error', error: error instanceof ApiError && error.status === 401 ? 'Your session ended before SecurePay could show this. Nothing was confirmed.' : 'SecurePay couldn’t load the current version just now. Nothing was confirmed.' }); }
    },

    /** Only an explicit press. Bound to the exact reviewed version; an uncertain retry re-sends the SAME request. */
    async confirm() {
      if (!['ready', 'uncertain'].includes(state.phase) || !state.version || state.version.versionStatus !== 'CURRENT') return;
      const version = state.version;
      key = key ?? id();
      update({ phase: 'confirming', error: null });
      try {
        const confirmation = await gateway.confirmVersion(agreementId, version.id, { idempotencyKey: key, expectedVersionNumber: version.versionNumber, expectedContentHash: version.contentHash });
        key = null;
        update({ confirmation, phase: 'confirmed' });
        onConfirmed();
      } catch (error) {
        if (isUncertain(error)) { update({ phase: 'uncertain', error: UNCERTAIN }); return; }
        if (error instanceof ApiError && error.status === 401) { key = null; update({ phase: 'ready', error: 'Your session ended before SecurePay could act on this. Nothing was confirmed. Sign in again, then confirm.' }); return; }
        if (error instanceof ApiError && error.status === 403) { key = null; update({ phase: 'ready', error: 'The signed-in account can’t confirm this Agreement. Nothing was confirmed.' }); return; }
        // 422 covers a stale number/hash, a superseded version and other confirmation failures: settle by re-reading.
        try {
          const versions = await gateway.versions(agreementId);
          const current = pickCurrentVersion(versions);
          if (current && (current.id !== version.id || current.contentHash !== version.contentHash)) {
            key = null;
            const fresh = await gateway.version(agreementId, current.id);
            update({ version: fresh, phase: 'ready', changed: true, error: null });
            return;
          }
        } catch { /* fall through to the definite failure below */ }
        key = null;
        update({ phase: 'ready', error: 'SecurePay couldn’t record that confirmation. Nothing was confirmed.' });
      }
    },
    reset() { key = null; update({ ...initial }); },
  };
}
export type ReconfirmController = ReturnType<typeof createReconfirmController>;
