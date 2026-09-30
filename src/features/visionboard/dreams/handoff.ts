import type { AgentController } from '../../agent/controller';
import { readDraft, writeDraft } from '../../conversation/drafts';
import { MAX_KS001_DRAFT } from './controller';

export type DreamHandoff = { conversationId: string; draftText: string };
export type DreamHandoffResult = { ok: true } | { ok: false; error: string };

/**
 * An explicit human-reviewed handoff, not an AI message or Trade Context mutation.
 *
 * Re-open and authorize the original saved conversation before placing words into its
 * local composer. Never overwrite a different unsent message in that conversation.
 * If a conversation is missing/not owned or the read fails, the Dream is still
 * private and the draft is NOT written to another conversation.
 */
export async function prepareDreamHandoff(
  agent: Pick<AgentController, 'getSnapshot' | 'resumeConversation'>,
  handoff: DreamHandoff,
): Promise<DreamHandoffResult> {
  const id = handoff.conversationId;
  const draft = handoff.draftText.trim();
  if (!id || !draft || draft.length > MAX_KS001_DRAFT) {
    return { ok: false, error: 'Review a message of up to 1,200 characters before opening KS001.' };
  }
  const before = agent.getSnapshot();
  if (before.busy || before.pending) {
    return { ok: false, error: 'KS001 is finishing another action. Return to this Dream after it completes.' };
  }
  const existing = readDraft(id);
  if (existing.trim() && existing.trim() !== draft) {
    return { ok: false, error: 'You have an unsent KS001 message in this conversation. Finish it before opening the Dream draft.' };
  }
  try {
    await agent.resumeConversation(id);
  } catch {
    return { ok: false, error: 'SecurePay could not reopen this Dream conversation. Your private note has not been sent.' };
  }
  const current = agent.getSnapshot();
  if (current.conversationId !== id || current.context.status !== 'ready') {
    return { ok: false, error: 'SecurePay could not verify this Dream conversation. Your private note has not been sent.' };
  }
  writeDraft(id, draft);
  return { ok: true };
}
