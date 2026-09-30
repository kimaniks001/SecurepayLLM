import type { AgentGateway } from '../../../api/securepay/agent';
import type { VisionDreamGateway } from '../../../api/securepay/visiondreams';
import type { VisionDreamDto } from '../../../api/securepay/visiondreams/dto';
import { errorText } from '../../agent/controller';
import { ApiError } from '../../../api/securepay/http';

/** Dream-specific recovery is about this editable note, not Trade Context. */
function dreamNoteErrorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 409)
    return 'This Dream changed elsewhere. Refresh note to see the latest version before saving again.';
  return errorText(error);
}

export const MAX_INITIAL_THOUGHT = 4000;

/** Use the person's own first sentence, not a model-invented title or plan. */
export function dreamTitle(initialThought: string): string {
  const first = initialThought.trim().split(/\r?\n/, 1)[0].replace(/\s+/g, ' ').trim();
  return first.length > 200 ? first.slice(0, 197).trimEnd() + '…' : first;
}
export interface VisionDreamState {
  phase: 'idle' | 'loading' | 'ready' | 'saving' | 'reconciling' | 'editing' | 'error';
  dreams: VisionDreamDto[];
  selected: VisionDreamDto | null;
  error: string | null;
  pending: { conversationId: string | null; thought: string } | null;
}
/**
 * Never changes Trade Context, executes money commands, or reuses an unrelated unsaved
 * conversation's possession secret. A failed save retries the SAME server conversation.
 */
export function createVisionDreamController(
  dreams: VisionDreamGateway,
  agent: Pick<AgentGateway, 'createConversation' | 'resumableConversationId' | 'forgetResumableConversation'>,
) {
  let state: VisionDreamState = { phase: 'idle', dreams: [], selected: null, error: null, pending: null };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<VisionDreamState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  async function savePending(): Promise<VisionDreamDto | null> {
    const pending = state.pending;
    if (!pending || state.phase === 'saving' || state.phase === 'reconciling') return null;
    update({ phase: 'saving', error: null });
    let id = pending.conversationId;
    try {
      if (!id) {
        // An existing unfinished conversation's token must never be silently overwritten.
        if (agent.resumableConversationId()) {
          update({ phase: 'error', error: 'You have another unsaved conversation on this tab. Save or finish it before starting a new Dream.' });
          return null;
        }
        const created = await agent.createConversation();
        if (!created?.conversationId) throw new Error('SecurePay did not create a conversation.');
        id = created.conversationId;
        update({ pending: { ...pending, conversationId: id } });
      }
      const created = await dreams.create({ conversationId: id, title: dreamTitle(pending.thought), initialThought: pending.thought });
      update({ phase: 'ready', selected: created,
        dreams: [created, ...state.dreams.filter(d => d.dreamId !== created.dreamId)],
        pending: null, error: null });
      return created;
    } catch (error) {
      // Do not clear a token or create a second conversation after an uncertain POST outcome.
      update({ phase: 'error', error: errorText(error) });
      return null;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async load() {
      // An uncertain create needs its own retry/reconciliation path. A background list refresh
      // must not race that path or change the phase while its possession token is still pending.
      if (state.pending || state.phase === 'loading' || state.phase === 'saving'
          || state.phase === 'reconciling' || state.phase === 'editing') return;
      update({ phase: 'loading', error: null });
      try {
        const latest = await dreams.mine();
        // Refresh an open note as well as the list, so an optimistic-lock conflict can
        // be resolved from server truth rather than trapping the editor at a stale version.
        const selectedId = state.selected?.dreamId;
        update({ phase: 'ready', dreams: latest,
          selected: selectedId ? latest.find(d => d.dreamId === selectedId) ?? null : null, error: null });
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },
    async start(thought: string): Promise<VisionDreamDto | null> {
      if (state.phase === 'loading' || state.phase === 'saving' || state.phase === 'reconciling' || state.pending) return null;
      const clean = thought.trim();
      if (!clean || clean.length > MAX_INITIAL_THOUGHT) {
        update({ phase: 'error', error: 'Write something to explore (up to 4,000 characters).' });
        return null;
      }
      update({ pending: { conversationId: null, thought: clean }, error: null });
      return savePending();
    },
    retry: () => savePending(),
    /** Network failure may follow a server commit. Check before trying the same POST again. */
    async reconcilePending(): Promise<VisionDreamDto | null> {
      const pending = state.pending;
      if (!pending?.conversationId || state.phase === 'saving' || state.phase === 'reconciling') return null;
      update({ phase: 'reconciling', error: null });
      try {
        const all = await dreams.mine();
        const found = all.find(d => d.conversationId === pending.conversationId);
        if (!found) {
          update({ dreams: all, phase: 'error', error: 'No saved Dream was found yet. Retry the same save.' });
          return null;
        }
        if (agent.resumableConversationId() === pending.conversationId) agent.forgetResumableConversation();
        update({ phase: 'ready', dreams: all, selected: found, pending: null, error: null });
        return found;
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
        return null;
      }
    },
    /**
     * Only called after the human explicitly confirms abandonment. This drops tab possession,
     * and never suggests that the temporary server conversation itself was deleted.
     */
    abandonPending() {
      const id = state.pending?.conversationId;
      if (state.phase === 'saving' || state.phase === 'reconciling') return;
      if (id && agent.resumableConversationId() === id) agent.forgetResumableConversation();
      update({ pending: null, phase: 'ready', error: null });
    },
    cancelPending() {
      // If an actual server conversation exists, keep its ID for a safe retry.
      if (state.pending?.conversationId) return;
      update({ pending: null, error: null, phase: 'ready' });
    },
    select(dreamId: string) {
      // Selecting another note cannot hide an unresolved temporary conversation/save.
      if (state.pending || state.phase === 'saving' || state.phase === 'reconciling'
          || state.phase === 'editing' || state.phase === 'loading') return;
      update({ selected: state.dreams.find(d => d.dreamId === dreamId) ?? null, error: null });
    },
    close() { update({ selected: null, error: null }); },
    async saveSummary(title: string, content: string, expectedVersion: number): Promise<boolean> {
      const selected = state.selected;
      if (!selected || state.phase !== 'ready' || selected.locked || selected.superseded) return false;
      if (!title.trim() || title.trim().length > 200 || content.length > MAX_INITIAL_THOUGHT) {
        update({ error: 'Please check the title and note lengths.' });
        return false;
      }
      update({ phase: 'editing', error: null });
      try {
        const saved = await dreams.update(selected.dreamId, { title: title.trim(), content, expectedVersion });
        update({ phase: 'ready', selected: saved, dreams: state.dreams.map(d => d.dreamId === saved.dreamId ? saved : d) });
        return true;
      } catch (error) {
        // The old note and version remain visible. Keep the editor actionable so the
        // person can refresh/retry instead of being permanently disabled by a failure.
        update({ phase: 'ready', error: dreamNoteErrorText(error) });
        return false;
      }
    },
  };
}
export type VisionDreamController = ReturnType<typeof createVisionDreamController>;