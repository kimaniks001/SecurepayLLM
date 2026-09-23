import type { AgentGateway } from '../../api/securepay/agent';
import { savedBuildView } from '../../api/securepay/agent/adapters';
import { ApiError } from '../../api/securepay/http';
import { errorText } from '../agent/controller';

export type SavedBuildView = ReturnType<typeof savedBuildView>;
export type SavedBuildPhase = 'idle' | 'saving' | 'identity-required' | 'saved' | 'listing' | 'list-ready' | 'resuming' | 'error';
export interface SavedBuildState {
  phase: SavedBuildPhase;
  builds: SavedBuildView[];
  error: string | null;
  /** The conversationId a `save()` call is waiting to save once identity is available. */
  pendingConversationId: string | null;
}
const initial: SavedBuildState = { phase: 'idle', builds: [], error: null, pendingConversationId: null };

/**
 * KS001 Upgrade Phase 2 (Sections 14-17) -- "Save for later" / "Continue Building" orchestration only.
 * No Agreement, Money, or identity-lifecycle authority lives here -- every ownership/idempotency rule is
 * enforced server-side by AgentSavedBuildService; this controller is a thin, honest UI adapter over it,
 * mirroring HandoffController's own identity-required pattern.
 */
export function createSavedBuildController(gateway: Pick<AgentGateway, 'saveBuild' | 'listSavedBuilds' | 'resumeSavedBuild'>) {
  let state: SavedBuildState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<SavedBuildState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  async function attemptSave(conversationId: string) {
    update({ phase: 'saving', error: null, pendingConversationId: conversationId });
    try {
      await gateway.saveBuild(conversationId);
      update({ phase: 'saved', pendingConversationId: null });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        update({ phase: 'identity-required', pendingConversationId: conversationId, error: null });
        return;
      }
      update({ phase: 'error', error: errorText(error), pendingConversationId: null });
    }
  }

  return {
    getSnapshot: (): SavedBuildState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Section 14/21 -- the only entry point. Signed out, this surfaces identity-required; never a wall in front of BUILD itself. */
    async save(conversationId: string) {
      if (!['idle', 'saved', 'error'].includes(state.phase)) return;
      await attemptSave(conversationId);
    },

    /** Called once a real session exists after identity-required (mirrors HandoffController#continueAfterIdentity). */
    async continueAfterIdentity() {
      if (state.phase !== 'identity-required' || !state.pendingConversationId) return;
      await attemptSave(state.pendingConversationId);
    },

    /** Section 16 -- "List my saved builds." Server-derived, newest real-activity first (view layer already sorts). */
    async list() {
      if (state.phase === 'listing') return;
      update({ phase: 'listing', error: null });
      try {
        const builds = (await gateway.listSavedBuilds()).map(savedBuildView);
        update({ phase: 'list-ready', builds });
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },

    /**
     * Section 16/17 -- "Continue building." Returns the conversationId to resume, or null on failure;
     * the caller (AgentExperience) drives the actual AgentController#resumeConversation switch so the
     * SAME conversation reopens in the SAME UI, never a clone.
     */
    async resume(savedBuildId: string): Promise<string | null> {
      if (state.phase === 'resuming') return null;
      update({ phase: 'resuming', error: null });
      try {
        const resumed = savedBuildView(await gateway.resumeSavedBuild(savedBuildId));
        update({ phase: 'list-ready' });
        return resumed.conversationId;
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
        return null;
      }
    },

    reset() { update({ ...initial }); },
  };
}
export type SavedBuildController = ReturnType<typeof createSavedBuildController>;
