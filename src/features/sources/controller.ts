import type { AgentGateway } from '../../api/securepay/agent';
import { sourceArtifactView, type AgentSourceArtifactView } from '../../api/securepay/agent/adapters';
import { ApiError } from '../../api/securepay/http';

export type { AgentSourceArtifactView };

/**
 * KS001 Upgrade Phase 3 (Bring what you already have) -- source-specific error text, mirroring {@code
 * sourceErrorText}'s own "why, in terms of the THING, not a chat turn" doctrine. Distinguishes upload
 * failure, "couldn't read it," and "temporarily unavailable" (Section 32) -- never claims BUILD changed
 * when it did not.
 */
export function sourceIngestionErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'AGENT_SOURCE_UNSUPPORTED_MEDIA_TYPE') return 'SecurePay doesn’t support this file type yet.';
    if (error.code === 'AGENT_SOURCE_TOO_LARGE') return 'This file is too large for SecurePay to read.';
    if (error.code === 'AGENT_SOURCE_NOT_FOUND') return 'This source could not be found. It may have been removed.';
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this just now.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay received this, but couldn’t read it right now. Nothing from it has been added to your agreement yet.';
    }
    return error.message;
  }
  return 'SecurePay couldn’t read this just now. Trying again is safe.';
}

export type SourcesPhase = 'idle' | 'listing' | 'list-ready' | 'submitting' | 'error';
export interface SourcesState {
  phase: SourcesPhase;
  sources: AgentSourceArtifactView[];
  error: string | null;
}
const initial: SourcesState = { phase: 'idle', sources: [], error: null };

/**
 * KS001 Upgrade Phase 3 final merge-readiness correction (item 1) -- the SINGLE `onSourceApplied` callback
 * conflated two genuinely different events: "a source actually produced/changed real Trade Context facts,
 * and KS001 should say something about it" (ingestion/retry) versus "the canonical Trade Context needs a
 * fresh read because the server just changed it, with no continuation reply to surface" (removal, which
 * invalidates unadopted candidates server-side but never fabricates a chat message about it). Split into
 * two, so a caller (see {@code AgentExperience}) can wire each to the right real behaviour:
 * `onSourceIngested` -- extraction genuinely ran (create/retry) -- refresh context AND surface KS001's
 * real continuation reply; `onSourceChanged` -- the source list/Trade Context changed for some OTHER
 * reason (removal) -- refresh context only, never inventing a reply the backend did not produce.
 */
export interface SourceControllerCallbacks {
  onSourceIngested?: () => void;
  onSourceChanged?: () => void;
}
export function createSourceController(
    gateway: Pick<AgentGateway, 'createPastedTextSource' | 'uploadSource' | 'listSources' | 'getSource' | 'retrySource' | 'removeSource'>,
    ensureConversationId: () => Promise<string>,
    callbacks?: SourceControllerCallbacks,
) {
  const { onSourceIngested, onSourceChanged } = callbacks ?? {};
  let state: SourcesState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<SourcesState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  function upsert(artifact: AgentSourceArtifactView) {
    const withoutExisting = state.sources.filter(s => s.sourceArtifactId !== artifact.sourceArtifactId);
    update({ sources: [...withoutExisting, artifact] });
  }

  return {
    getSnapshot: (): SourcesState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Section 39 -- refreshes the list for the CURRENT conversation, once one exists; never creates one. */
    async list(conversationId: string | null) {
      if (!conversationId || state.phase === 'listing') return;
      update({ phase: 'listing', error: null });
      try {
        const response = await gateway.listSources(conversationId);
        update({ phase: 'list-ready', sources: response.sources.map(sourceArtifactView) });
      } catch (error) {
        update({ phase: 'error', error: sourceIngestionErrorText(error) });
      }
    },

    /** Section 17 -- "Bring your plan": a pasted plan is its own first-class source. */
    async addPastedText(text: string, label?: string): Promise<{ ok: true; source: AgentSourceArtifactView } | { ok: false; error: string }> {
      if (state.phase === 'submitting' || !text.trim()) return { ok: false, error: 'Nothing to add yet.' };
      update({ phase: 'submitting', error: null });
      try {
        const conversationId = await ensureConversationId();
        const artifact = sourceArtifactView(await gateway.createPastedTextSource(conversationId, { text: text.trim(), label }));
        upsert(artifact);
        update({ phase: 'list-ready' });
        onSourceIngested?.();
        return { ok: true, source: artifact };
      } catch (error) {
        const message = sourceIngestionErrorText(error);
        update({ phase: 'error', error: message });
        return { ok: false, error: message };
      }
    },

    /** Section 6/19/20/65 -- a real upload; resolves only after SecurePay has really received the bytes. */
    async addUpload(sourceKind: 'DOCUMENT' | 'PHOTO', file: File, label?: string): Promise<{ ok: true; source: AgentSourceArtifactView } | { ok: false; error: string }> {
      if (state.phase === 'submitting') return { ok: false, error: 'SecurePay is still working on the previous step.' };
      update({ phase: 'submitting', error: null });
      try {
        const conversationId = await ensureConversationId();
        const artifact = sourceArtifactView(await gateway.uploadSource(conversationId, sourceKind, file, label));
        upsert(artifact);
        update({ phase: 'list-ready' });
        onSourceIngested?.();
        return { ok: true, source: artifact };
      } catch (error) {
        const message = sourceIngestionErrorText(error);
        update({ phase: 'error', error: message });
        return { ok: false, error: message };
      }
    },

    /** Section 33 -- retrying reuses the SAME source, never creates a duplicate. */
    async retry(conversationId: string, sourceArtifactId: string) {
      update({ phase: 'submitting', error: null });
      try {
        const artifact = sourceArtifactView(await gateway.retrySource(conversationId, sourceArtifactId));
        upsert(artifact);
        update({ phase: 'list-ready' });
        onSourceIngested?.();
      } catch (error) {
        update({ phase: 'error', error: sourceIngestionErrorText(error) });
      }
    },

    /**
     * KS001 Upgrade Phase 3 final merge-readiness correction (item 1) -- removal never rewrites already-
     * adopted Agreement/BUILD truth, but it DOES retire this source's own unadopted candidates server-side
     * (see `AgentSourceIngestionService#remove`/`SourceCandidateInvalidator`), which can genuinely change
     * the real Trade Context. `onSourceChanged` (a plain context re-read, never a fabricated KS001 reply --
     * the backend records no continuation message for a removal) is what makes that visible immediately,
     * rather than leaving a now-invalid candidate on screen until some unrelated later refresh.
     */
    async remove(conversationId: string, sourceArtifactId: string) {
      update({ phase: 'submitting', error: null });
      try {
        const artifact = sourceArtifactView(await gateway.removeSource(conversationId, sourceArtifactId));
        upsert(artifact);
        update({ phase: 'list-ready' });
        onSourceChanged?.();
      } catch (error) {
        update({ phase: 'error', error: sourceIngestionErrorText(error) });
      }
    },

    reset() { update({ ...initial }); },
  };
}
export type SourceController = ReturnType<typeof createSourceController>;
