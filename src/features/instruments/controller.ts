import type { AgentController, ContextView } from '../agent/controller';
import { emptyDraft, statementFor, type InstrumentDraft, type InstrumentSpec } from './model';
import { isRecorded } from './verify';

/**
 * One instrument at a time. State lives HERE (not in a component) so that:
 *  - switching BUILD <-> UNDERSTOOD on mobile never loses the person's in-progress input;
 *  - a recoverable failure keeps exactly what was typed/selected;
 *  - the desktop panel and the mobile sheet are two renderings of the same state.
 *
 * phases:
 *   editing    -- the person is choosing/typing.
 *   sending    -- the statement is with SecurePay.
 *   failed     -- SecurePay did not receive it. Draft preserved. Retry / Cancel.
 *   unrecorded -- SecurePay received it but Trade Context does not (yet) show it. Draft preserved.
 *                 Never closed as a success.
 */
export type InstrumentPhase = 'editing' | 'sending' | 'failed' | 'unrecorded';
export interface InstrumentState {
  active: InstrumentSpec | null;
  draft: InstrumentDraft | null;
  phase: InstrumentPhase;
  error: string | null;
  /** Bumps on every open so views can (re)apply initial focus deliberately, not on every render. */
  openCount: number;
}
export type InstrumentAgent = Pick<AgentController, 'sendStatement' | 'retry' | 'discardFailedTurn' | 'review' | 'getSnapshot'>;

/** Identity of "which fact this instrument is settling" -- origin (where it was summoned from) is presentation only. */
export const specKey = (spec: InstrumentSpec): string => JSON.stringify({ ...spec, origin: undefined });

const IDLE: InstrumentState = { active: null, draft: null, phase: 'editing', error: null, openCount: 0 };

export function createInstrumentController(agent: InstrumentAgent) {
  let state: InstrumentState = IDLE;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<InstrumentState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const close = () => update({ active: null, draft: null, phase: 'editing', error: null });

  function settle(spec: InstrumentSpec, draft: InstrumentDraft, context: ContextView | null) {
    if (!context) {
      update({ phase: 'unrecorded', error: 'SecurePay received this, but the update could not be read back yet. Refresh what SecurePay understands to check.' });
      return;
    }
    if (isRecorded(spec, draft, context)) { close(); return; }
    update({ phase: 'unrecorded', error: 'SecurePay heard you, but its understanding does not show this yet. You can adjust it and try again, or tell KS001 directly.' });
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(spec: InstrumentSpec, draft: InstrumentDraft = emptyDraft(spec)) {
      if (state.phase === 'sending') return;
      // Re-opening the SAME instrument for the same fact keeps what the person had already entered.
      if (state.active && specKey(state.active) === specKey(spec)) { update({ openCount: state.openCount + 1 }); return; }
      if (state.phase === 'failed') agent.discardFailedTurn();
      update({ active: spec, draft, phase: 'editing', error: null, openCount: state.openCount + 1 });
    },
    setDraft(draft: InstrumentDraft) {
      if (!state.active || state.phase === 'sending') return;
      // Changing the input after a failure means "say something different": the unsent turn is withdrawn first.
      if (state.phase === 'failed') agent.discardFailedTurn();
      update({ draft, phase: 'editing', error: null });
    },
    /** Cancel never sends anything. A turn that never reached SecurePay is withdrawn with it. */
    cancel() {
      if (state.phase === 'sending') return;
      if (state.phase === 'failed') agent.discardFailedTurn();
      close();
    },
    async submit() {
      const { active, draft, phase } = state;
      if (!active || !draft || phase === 'sending') return;
      const statement = statementFor(active, draft, {
        previousAmount: active.kind === 'money' ? active.amount : undefined,
        previousCurrency: active.kind === 'money' ? active.currency : undefined,
        previousDateText: active.kind === 'when' ? active.currentText : undefined,
        previousPlace: active.kind === 'where' ? active.currentText : undefined,
      });
      if (!statement) return;
      update({ phase: 'sending', error: null });
      const result = await agent.sendStatement(statement);
      if (!result.ok) { update({ phase: 'failed', error: result.error }); return; }
      settle(active, draft, result.context);
    },
    /** Re-sends the SAME turn (same clientTurnId, so a turn SecurePay already processed is never duplicated). */
    async retry() {
      const { active, draft, phase } = state;
      if (!active || !draft || phase !== 'failed') return;
      update({ phase: 'sending', error: null });
      await agent.retry();
      const snapshot = agent.getSnapshot();
      if (snapshot.pending || snapshot.error) { update({ phase: 'failed', error: snapshot.error ?? 'SecurePay could not complete this step.' }); return; }
      settle(active, draft, snapshot.context.status === 'ready' ? snapshot.context.data : null);
    },
    /** For 'unrecorded' with an unreadable context: ask SecurePay for its current understanding and re-check. */
    async recheck() {
      const { active, draft } = state;
      if (!active || !draft) return;
      await agent.review();
      const snapshot = agent.getSnapshot();
      settle(active, draft, snapshot.context.status === 'ready' ? snapshot.context.data : null);
    },
  };
}
export type InstrumentController = ReturnType<typeof createInstrumentController>;
