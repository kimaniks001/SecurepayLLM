import type { AgentController, ContextView } from '../agent/controller';
import type { KsIdentitySelectionResult } from '../../api/securepay/agent/dto';
import { emptyDraft, structuredInputFor, type InstrumentDraft, type InstrumentSpec, type WhoSpec } from './model';
import { isRecorded } from './verify';

/**
 * One instrument at a time. State lives HERE (not in a component) so that:
 *  - switching BUILD <-> UNDERSTOOD on mobile never loses the person's in-progress input;
 *  - a recoverable failure keeps exactly what was typed/selected;
 *  - the desktop panel and the mobile sheet are two renderings of the same state.
 *
 * phases:
 *   editing    -- the person is choosing/typing.
 *   sending    -- the structured action (or KS identity selection) is with SecurePay.
 *   failed     -- SecurePay did not receive it. Draft preserved. Retry / Cancel.
 *   unrecorded -- SecurePay received it but Trade Context does not (yet) show it. Draft preserved.
 *                 Never closed as a success.
 *
 * Phase 4 of the Agent/Trade-Context Convergence -- LOCKED PRINCIPLE: an instrument finishes with an
 * EXPLICIT structured action (`structuredInputFor` -> `/structured-inputs`, or, for a real KS Number,
 * `/identity-selections`) -- never a fabricated chat sentence sent through the conversational path.
 */
export type InstrumentPhase = 'editing' | 'sending' | 'failed' | 'unrecorded';
export interface InstrumentState {
  active: InstrumentSpec | null;
  draft: InstrumentDraft | null;
  phase: InstrumentPhase;
  error: string | null;
  /** Bumps on every open so views can (re)apply initial focus deliberately, not on every render. */
  openCount: number;
  /** The SAME client-controlled idempotency id across a submit and its own retry -- a network retry can
   *  never duplicate the action (see AgentController#submitStructuredInput/#selectKsIdentity). Fresh on
   *  every new submit attempt, never on a retry of a failed one. */
  clientActionId: string | null;
}
export type InstrumentAgent = Pick<AgentController, 'submitStructuredInput' | 'selectKsIdentity' | 'review' | 'getSnapshot'>;

/** Identity of "which fact this instrument is settling" -- origin (where it was summoned from) is presentation only. */
export const specKey = (spec: InstrumentSpec): string => JSON.stringify({ ...spec, origin: undefined });

const IDLE: InstrumentState = { active: null, draft: null, phase: 'editing', error: null, openCount: 0, clientActionId: null };

/** Precise, honest wording for every ordinary KS identity lookup outcome -- never a generic failure. */
function ksIdentityErrorText(status: KsIdentitySelectionResult['status']): string | null {
  switch (status) {
    case 'MALFORMED_KS_NUMBER': return 'That doesn’t look like a KS Number — it should be KS followed by at least three digits, like KS003.';
    case 'NOT_FOUND': return 'SecurePay doesn’t recognize that KS Number.';
    case 'NOT_AVAILABLE': return 'That KS Number can’t be used right now.';
    case 'NOT_PARTICIPANT_ELIGIBLE': return 'That KS Number can’t be added as a trade participant.';
    case 'UNSUPPORTED': return 'SecurePay can’t check KS Numbers right now.';
    default: return null; // RESOLVED / ASSOCIATED / ALREADY_ASSOCIATED are successes, not errors
  }
}

export function createInstrumentController(agent: InstrumentAgent, id: () => string = () => crypto.randomUUID()) {
  let state: InstrumentState = IDLE;
  // A typed KS Number is never lost when the person goes back to the conversation.
  const parked = new Map<string, InstrumentDraft>();
  const listeners = new Set<() => void>();
  const update = (patch: Partial<InstrumentState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const close = () => update({ active: null, draft: null, phase: 'editing', error: null, clientActionId: null });
  const currentVersion = (): number => { const snapshot = agent.getSnapshot(); return snapshot.context.status === 'ready' ? snapshot.context.data!.version : 0; };

  function settle(spec: InstrumentSpec, draft: InstrumentDraft, context: ContextView | null) {
    if (!context) {
      update({ phase: 'unrecorded', error: 'SecurePay received this, but the update could not be read back yet. Refresh what SecurePay understands to check.' });
      return;
    }
    if (isRecorded(spec, draft, context)) { close(); return; }
    update({ phase: 'unrecorded', error: 'SecurePay heard you, but its understanding does not show this yet. You can adjust it and try again, or tell KS001 directly.' });
  }

  async function submitStructured(spec: InstrumentSpec, draft: InstrumentDraft) {
    const body = structuredInputFor(spec, draft);
    if (!body) return;
    const clientActionId = state.clientActionId ?? id();
    update({ phase: 'sending', error: null, clientActionId });
    const outcome = await agent.submitStructuredInput({ ...body, expectedTradeContextVersion: currentVersion(), clientActionId });
    if (!outcome.ok) {
      // A stale version is a normal concurrency outcome, not a failure: SecurePay's own understanding
      // moved on. The draft is kept; the person deliberately retries against the (now refreshed) version.
      update(outcome.stale ? { phase: 'editing', error: outcome.error } : { phase: 'failed', error: outcome.error });
      return;
    }
    settle(spec, draft, outcome.context);
  }

  async function submitIdentitySelection(spec: WhoSpec, draft: Extract<InstrumentDraft, { kind: 'who' }>) {
    const clientActionId = state.clientActionId ?? id();
    update({ phase: 'sending', error: null, clientActionId });
    const outcome = await agent.selectKsIdentity({
      ksNumber: draft.ks.trim(), expectedTradeContextVersion: currentVersion(), clientActionId,
      role: draft.role.trim() || undefined, existingTradeEntityId: spec.targetEntityId,
    });
    if (!outcome.ok) {
      update(outcome.stale ? { phase: 'editing', error: outcome.error } : { phase: 'failed', error: outcome.error });
      return;
    }
    const errorText = ksIdentityErrorText(outcome.result.status);
    if (errorText) { update({ phase: 'editing', error: errorText }); return; }
    settle(spec, draft, outcome.context);
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(spec: InstrumentSpec, draft: InstrumentDraft = emptyDraft(spec)) {
      if (state.phase === 'sending') return;
      // Re-opening the SAME instrument for the same fact keeps what the person had already entered.
      if (state.active && specKey(state.active) === specKey(spec)) { update({ openCount: state.openCount + 1 }); return; }
      update({ active: spec, draft: parked.get(specKey(spec)) ?? draft, phase: 'editing', error: null, openCount: state.openCount + 1, clientActionId: null });
    },
    setDraft(draft: InstrumentDraft) {
      if (!state.active || state.phase === 'sending') return;
      // After a failed delivery the earlier action may already have been applied: the choice is frozen
      // until it is retried (same clientActionId) or the instrument is closed. A DIFFERENT action is never sent over it.
      if (state.phase === 'failed') return;
      update({ draft, phase: 'editing', error: null });
    },
    /**
     * Cancel closes the INSTRUMENT only. It never sends anything: an action whose delivery is uncertain
     * stays as its own 'failed'/'unrecorded' state with its own Retry, never silently discarded here.
     */
    cancel() {
      if (state.phase === 'sending') return;
      if (state.active && state.draft?.kind === 'who' && state.draft.ks.trim()) parked.set(specKey(state.active), state.draft);
      close();
    },
    async submit() {
      const { active, draft, phase } = state;
      if (!active || !draft || phase === 'sending') return;
      if (active.kind === 'who' && draft.kind === 'who' && draft.ks.trim()) { await submitIdentitySelection(active, draft); return; }
      await submitStructured(active, draft);
    },
    /** Re-sends the SAME action (same clientActionId, so an action SecurePay already applied is never duplicated). */
    async retry() {
      const { active, draft, phase } = state;
      if (!active || !draft || phase !== 'failed') return;
      if (active.kind === 'who' && draft.kind === 'who' && draft.ks.trim()) { await submitIdentitySelection(active, draft); return; }
      await submitStructured(active, draft);
    },
    /**
     * Ask SecurePay for its CURRENT understanding and re-check. Used for 'unrecorded' and for 'failed'
     * (uncertain delivery): if the fact is proven, the instrument closes; a failed delivery is otherwise
     * left exactly as it was -- still retryable with the same action identity, never rewritten.
     */
    async recheck() {
      const { active, draft, phase } = state;
      if (!active || !draft) return;
      await agent.review();
      const snapshot = agent.getSnapshot();
      const context = snapshot.context.status === 'ready' ? snapshot.context.data : null;
      if (phase === 'failed') {
        if (context && isRecorded(active, draft, context)) close();
        else update({ error: 'SecurePay’s understanding does not show this step yet. It may still be processing — retry to check the same step.' });
        return;
      }
      settle(active, draft, context);
    },
  };
}
export type InstrumentController = ReturnType<typeof createInstrumentController>;
