import type { AgentGateway } from '../../../api/securepay/agent';
import type { VisionDreamGateway } from '../../../api/securepay/visiondreams';
import type { VisionDreamDto } from '../../../api/securepay/visiondreams/dto';
import { errorText } from '../../agent/controller';

export const MAX_INITIAL_THOUGHT = 4000;

/** Use the person's own first sentence, not a model-invented title or plan. */
export function dreamTitle(initialThought: string): string {
  const first = initialThought.trim().split(/\r?\n/, 1)[0].replace(/\s+/g, ' ').trim();
  return first.length > 200 ? first.slice(0, 197).trimEnd() + '…' : first;
}
export interface VisionDreamState {
  phase: 'idle' | 'loading' | 'ready' | 'saving' | 'editing' | 'error';
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
  agent: Pick<AgentGateway, 'createConversation' | 'resumableConversationId'>,
) {
  let state: VisionDreamState = { phase: 'idle', dreams: [], selected: null, error: null, pending: null };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<VisionDreamState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  async function savePending(): Promise<VisionDreamDto | null> {
    const pending = state.pending;
    if (!pending || state.phase === 'saving') return null;
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
      if (state.phase === 'loading' || state.phase === 'saving') return;
      update({ phase: 'loading', error: null });
      try {
        update({ phase: 'ready', dreams: await dreams.mine(), error: null });
      } catch (error) {
        update({ phase: 'error', error: errorText(error) });
      }
    },
    async start(thought: string): Promise<VisionDreamDto | null> {
      if (state.phase === 'saving' || state.pending) return null;
      const clean = thought.trim();
      if (!clean || clean.length > MAX_INITIAL_THOUGHT) {
        update({ phase: 'error', error: 'Write something to explore (up to 4,000 characters).' });
        return null;
      }
      update({ pending: { conversationId: null, thought: clean }, error: null });
      return savePending();
    },
    retry: () => savePending(),
    cancelPending() {
      // If an actual server conversation exists, keep its ID for a safe retry.
      if (state.pending?.conversationId) return;
      update({ pending: null, error: null, phase: 'ready' });
    },
    select(dreamId: string) {
      update({ selected: state.dreams.find(d => d.dreamId === dreamId) ?? null, error: null });
    },
    close() { update({ selected: null, error: null }); },
    async saveSummary(title: string, content: string, expectedVersion: number): Promise<boolean> {
      const selected = state.selected;
      if (!selected || state.phase === 'editing' || selected.locked) return false;
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
        update({ phase: 'error', error: errorText(error) });
        return false;
      }
    },
  };
}
export type VisionDreamController = ReturnType<typeof createVisionDreamController>;