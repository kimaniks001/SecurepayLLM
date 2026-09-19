import type { AgentGateway } from '../../api/securepay/agent';
import { agreementReviewView, handoffView } from '../../api/securepay/agent/adapters';
import type { HandoffDto } from '../../api/securepay/agent/dto';
import { ApiError } from '../../api/securepay/http';
import { errorText } from '../agent/controller';

export type HandoffView = ReturnType<typeof handoffView>;
export type HandoffReviewView = ReturnType<typeof agreementReviewView>;
export type HandoffPhase =
  | 'idle' | 'creating' | 'identity-required' | 'adopting' | 'needs-resolution'
  | 'review-loading' | 'review-ready' | 'review-stale' | 'progressing' | 'progressed'
  | 'expired' | 'error';

export interface HandoffState {
  phase: HandoffPhase;
  handoff: HandoffView | null;
  review: HandoffReviewView | null;
  error: string | null;
}
const initial: HandoffState = { phase: 'idle', handoff: null, review: null, error: null };

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
   * Fetches the canonical review, then re-reads authoritative handoff state: the backend records
   * that the review happened, so the next GET may already report READY_TO_PROGRESS. Set securely
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
        const dto = await gateway.createHandoff(conversationId, id());
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
      update({ phase: 'adopting', error: null });
      try {
        await gateway.adoptHandoff(state.handoff.id);
        const dto = await gateway.readHandoff(state.handoff.id);
        await applyHandoff(dto);
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /** Echoes only the exact reviewed snapshot already captured from authoritative handoff state. */
    async setSecurely() {
      if (state.phase !== 'review-ready' || !state.handoff || state.handoff.status !== 'READY_TO_PROGRESS') return;
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
        update({ phase: 'error', error: errorText(error) });
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
      update({ phase: 'creating', error: null });
      try {
        const dto = await gateway.useCurrentSource(state.handoff.id, id());
        await applyHandoff(dto);
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /** Returns to idle. A new handoff can only be created by a fresh explicit user action. */
    reset() { update({ ...initial }); },
  };
}
export type HandoffController = ReturnType<typeof createHandoffController>;
