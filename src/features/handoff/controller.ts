import type { AgentGateway } from '../../api/securepay/agent';
import { agreementReviewView, handoffView } from '../../api/securepay/agent/adapters';
import type { HandoffDto } from '../../api/securepay/agent/dto';
import { ApiError } from '../../api/securepay/http';
import { errorText } from '../agent/controller';

export type HandoffView = ReturnType<typeof handoffView>;
export type HandoffReviewView = ReturnType<typeof agreementReviewView>;
export type HandoffPhase =
  | 'idle' | 'creating' | 'identity-required' | 'adopting' | 'needs-resolution'
  | 'review-loading' | 'review-ready' | 'review-stale' | 'progressing' | 'progress-uncertain' | 'progressed'
  | 'expired' | 'error';

export interface HandoffState {
  phase: HandoffPhase;
  handoff: HandoffView | null;
  review: HandoffReviewView | null;
  error: string | null;
  /**
   * True only when, after signing in, the handoff's exact version (Trade Context version +
   * candidate digest) differs from the one the person read before signing in: what they see now
   * is NOT what they reviewed, so it needs a fresh look.
   */
  changedDuringSignIn: boolean;
}
const initial: HandoffState = { phase: 'idle', handoff: null, review: null, error: null, changedDuringSignIn: false };

/** A client timeout / network failure / 5xx is not proof the step failed: SecurePay may have committed it. */
const isUncertain = (error: unknown) => error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);

type Gateway = Pick<AgentGateway, 'createHandoff' | 'readHandoff' | 'adoptHandoff' | 'reviewHandoff' | 'continueHandoff' | 'useCurrentSource'>;

function phaseFor(view: HandoffView): HandoffPhase {
  switch (view.status) {
    case 'IDENTITY_REQUIRED': return 'identity-required';
    case 'NEEDS_RESOLUTION': return 'needs-resolution';
    case 'REVIEW_STALE': return 'review-stale';
    case 'READY_FOR_REVIEW':
    case 'READY_TO_PROGRESS': return 'review-loading';
    case 'PROGRESSED': return 'progressed';
    case 'EXPIRED': return 'expired';
    default: return 'error';
  }
}
const reviewEligible = (view: HandoffView) => view.status === 'READY_FOR_REVIEW' || view.status === 'READY_TO_PROGRESS';

/**
 * Narrow handoff orchestration only. No Agreement establishment, recipient confirmation, or
 * Money authority lives here — this only tracks the handoff id, authoritative server state,
 * the exact reviewed snapshot, and progression result.
 */
export function createHandoffController(gateway: Gateway, id = () => crypto.randomUUID()) {
  let state: HandoffState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<HandoffState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  /**
   * A create is retried with the SAME clientActionId until one succeeds, so an uncertain failure
   * can never mint a second handoff. Keyed by what it is created from (a conversation, or a stale
   * handoff for "use current source"); success releases the key so a new explicit action gets a fresh id.
   */
  const actionIds = new Map<string, string>();
  const actionId = (key: string) => { let value = actionIds.get(key); if (!value) { value = id(); actionIds.set(key, value); } return value; };

  /**
   * Fetches the canonical review, then re-reads authoritative handoff state: the backend records
   * that the review happened, so the next GET may already report READY_TO_PROGRESS. Creating the draft
   * must reflect that backend truth immediately, never a locally inferred status.
   */
  async function loadReview(handoffId: string) {
    update({ phase: 'review-loading' });
    let review: HandoffReviewView;
    try {
      review = agreementReviewView(await gateway.reviewHandoff(handoffId));
    } catch (error) {
      update({ phase: 'error', error: errorText(error) });
      return;
    }
    update({ review });
    try {
      const dto = await gateway.readHandoff(handoffId);
      await applyHandoff(dto, { fetchReview: false });
    } catch (error) {
      update({ phase: 'error', error: errorText(error) });
    }
  }

  async function applyHandoff(dto: HandoffDto, options: { fetchReview?: boolean } = {}) {
    const { fetchReview = true } = options;
    const view = handoffView(dto);
    update({ handoff: view, error: null });
    if (fetchReview && reviewEligible(view)) {
      await loadReview(view.id);
    } else {
      update({ phase: reviewEligible(view) ? 'review-ready' : phaseFor(view) });
    }
  }

  return {
    getSnapshot: (): HandoffState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Only an explicit user action may reach this; re-entrant calls while a handoff is live are no-ops. */
    async start(conversationId: string) {
      if (!['idle', 'error', 'expired'].includes(state.phase)) return;
      update({ phase: 'creating', error: null, handoff: null, review: null });
      try {
        const dto = await gateway.createHandoff(conversationId, actionId(`conversation:${conversationId}`));
        actionIds.delete(`conversation:${conversationId}`);
        await applyHandoff(dto);
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /** Re-reads authoritative handoff state; never used to fabricate progress locally. */
    async refresh() {
      if (!state.handoff) return;
      try {
        const dto = await gateway.readHandoff(state.handoff.id);
        await applyHandoff(dto);
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /**
     * Called once a real session exists after IDENTITY_REQUIRED. Adoption is its own backend
     * call and re-read; a successful sign-in alone never implies adoption or progression.
     */
    async continueAfterIdentity() {
      if (state.phase !== 'identity-required' || !state.handoff) return;
      const before = state.handoff.reviewSnapshot;
      update({ phase: 'adopting', error: null });
      try {
        await gateway.adoptHandoff(state.handoff.id);
        const dto = await gateway.readHandoff(state.handoff.id);
        // The SAME handoff, conversation and source continue across sign-in. If its exact version
        // moved meanwhile, say so: the canonical review that follows is then new to this person.
        update({ changedDuringSignIn: dto.tradeContextVersion !== before.expectedTradeContextVersion || dto.candidateDigest !== before.expectedCandidateDigest });
        await applyHandoff(dto);
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /**
     * Echoes only the exact reviewed snapshot already captured from authoritative handoff state.
     * The backend creates a DRAFT Agreement (idempotent per handoff), so an uncertain outcome is
     * retried by re-sending the SAME snapshot -- never a fresh one.
     */
    async createDraft() {
      if (!['review-ready', 'progress-uncertain'].includes(state.phase) || !state.handoff) return;
      if (state.phase === 'review-ready' && state.handoff.status !== 'READY_TO_PROGRESS') return;
      const handoffId = state.handoff.id;
      const snapshot = state.handoff.reviewSnapshot;
      update({ phase: 'progressing', error: null });
      try {
        const dto = await gateway.continueHandoff(handoffId, snapshot);
        await applyHandoff(dto);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 409 || error.status === 410)) {
          try {
            const dto = await gateway.readHandoff(handoffId);
            await applyHandoff(dto);
            return;
          } catch (refreshError) {
            update({ phase: 'error', error: errorText(refreshError) });
            return;
          }
        }
        if (isUncertain(error)) { update({ phase: 'progress-uncertain', error: errorText(error) }); return; }
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /** After an uncertain create: ask SecurePay what happened rather than guess (a PROGRESSED read is the proof). */
    async checkOutcome() {
      if (state.phase !== 'progress-uncertain' || !state.handoff) return;
      try {
        const dto = await gateway.readHandoff(state.handoff.id);
        if (dto.status === 'PROGRESSED' || dto.progressedAgreementId) { await applyHandoff(dto); return; }
        update({ error: 'SecurePay shows no draft Agreement for this yet. You can try again — it will not be created twice.' });
      } catch (error) {
        update({ error: errorText(error) });
      }
    },

    /**
     * Final Phase 4 Economy Turn 3 (Section 7) -- the explicit "review/use current source" choice
     * for a stale, source-changed handoff. Never mutates the old, frozen snapshot; the backend mints
     * a brand new handoff bound to a freshly re-captured source selection, which this then adopts as
     * the new authoritative handoff in place of the stale one.
     */
    async useCurrentSource() {
      if (state.phase !== 'review-stale' || !state.handoff) return;
      const staleId = state.handoff.id;
      update({ phase: 'creating', error: null });
      try {
        const dto = await gateway.useCurrentSource(staleId, actionId(`source:${staleId}`));
        actionIds.delete(`source:${staleId}`);
        await applyHandoff(dto);
      } catch (error) {
        // Stay on the stale review with the same stable id, so trying again can never mint a second handoff.
        update({ phase: 'review-stale', error: errorText(error) });
      }
    },

    acknowledgeChange() { update({ changedDuringSignIn: false }); },

    /** Returns to idle. A new handoff can only be created by a fresh explicit user action. */
    reset() { update({ ...initial }); },
  };
}
export type HandoffController = ReturnType<typeof createHandoffController>;
