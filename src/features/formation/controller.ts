import type { AgentGateway } from '../../api/securepay/agent';
import { errorText } from '../agent/controller';
import { agreementFormationView, whatChanged, type AgreementFormation } from './view';

export interface FormationState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: AgreementFormation | null;
  /** The material updates since the version the person last looked at (§40); cleared when they acknowledge. */
  changes: string[];
  error: string | null;
  checking: string | null;
}

const zone = (): string | undefined => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined; } catch { return undefined; }
};

/**
 * Entry Perfection Phase 6 -- reads the server-owned emerging agreement for the current conversation. Never computes a
 * term itself; "what changed" compares two SERVER projections by their semantic keys.
 */
export function createFormationController(gateway: Pick<AgentGateway, 'readAgreementFormation' | 'checkOpenPoint'>) {
  let state: FormationState = { status: 'idle', data: null, changes: [], error: null, checking: null };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<FormationState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  let seq = 0;

  return {
    getSnapshot: (): FormationState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async load(conversationId: string) {
      const mine = ++seq;
      update({ status: state.data ? 'ready' : 'loading', error: null });
      try {
        const next = agreementFormationView(await gateway.readAgreementFormation(conversationId, zone()));
        if (mine !== seq) return;
        const previous = state.data && state.data.conversationId === conversationId ? state.data : null;
        const changes = whatChanged(previous, next);
        update({ status: 'ready', data: next, changes: changes.length > 0 ? changes : state.changes, error: null });
      } catch (error) {
        if (mine !== seq) return;
        update({ status: 'error', error: errorText(error) });
      }
    },

    async check(conversationId: string, openPointId: string) {
      update({ checking: openPointId, error: null });
      try {
        const next = agreementFormationView(await gateway.checkOpenPoint(conversationId, openPointId, zone()));
        update({ status: 'ready', data: next, checking: null });
      } catch (error) {
        update({ checking: null, error: errorText(error) });
      }
    },

    acknowledgeChanges() { update({ changes: [] }); },
    reset() { seq++; update({ status: 'idle', data: null, changes: [], error: null, checking: null }); },
  };
}
export type FormationController = ReturnType<typeof createFormationController>;
