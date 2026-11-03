import type { AgentGateway } from '../../api/securepay/agent';
import type { AgentController } from '../agent/controller';
import { authorisedResumedConversation } from '../experience/entryIntent';

/**
 * Day 4: switch between server-owned KS001 conversations, not between unsaved
 * React views. This is a navigation operation, never Agreement acceptance.
 *
 * A settled conversation is saved under the current identity BEFORE leaving it.
 * If the save fails we do not start/restore another conversation: the person's
 * current draft remains on screen for recovery.
 */
export interface WorkNavigationServices {
  gateway: Pick<AgentGateway, 'saveBuild' | 'createConversation'>;
  controller: Pick<AgentController, 'getSnapshot' | 'withNavigationLock'>;
  ensureIdentity: () => Promise<void>;
  unsentDraft: (conversationId?: string) => string;
}

function currentWork(services: WorkNavigationServices) {
  const state = services.controller.getSnapshot();
  if (state.busy || state.pending || state.sourceContinuationPending) {
    throw new Error('Finish or retry the current KS001 action before switching work.');
  }
  return state;
}

async function preserveCurrentWork(services: WorkNavigationServices, state: ReturnType<typeof currentWork>, nextId?: string): Promise<boolean> {
  const previousId = state.conversationId;
  if (services.unsentDraft(previousId ?? undefined).trim()) {
    throw new Error('Your KS001 message is not sent. Send or clear it before changing work.');
  }
  if (!previousId || previousId === nextId) return false;
  await services.ensureIdentity();
  const saved = await services.gateway.saveBuild(previousId);
  if (saved.conversationId !== previousId || !saved.savedBuildId) {
    throw new Error('SecurePay did not confirm your current work was saved. You are still in the same conversation.');
  }
  return true;
}

async function enterConversation(services: WorkNavigationServices, resume: (id: string) => Promise<void>, id: string, previousId: string | null) {
  try {
    await resume(id);
    if (!authorisedResumedConversation(id, services.controller.getSnapshot())) {
      throw new Error('SecurePay could not verify access to that conversation.');
    }
  } catch (error) {
    // If a new or resumed conversation cannot be read, attempt to restore the
    // prior conversation; do not claim the navigation succeeded.
    if (previousId && previousId !== id) {
      try { await resume(previousId); } catch { /* original failure is authoritative */ }
    }
    throw error;
  }
}

export async function beginNewWork(services: WorkNavigationServices): Promise<{ conversationId: string; previousSaved: boolean }> {
  const state = currentWork(services);
  return services.controller.withNavigationLock(async resume => {
    const previousSaved = await preserveCurrentWork(services, state);
    await services.ensureIdentity();
    const created = await services.gateway.createConversation();
    if (!created?.conversationId) throw new Error('SecurePay did not create a new conversation.');
    await enterConversation(services, resume, created.conversationId, state.conversationId);
    return { conversationId: created.conversationId, previousSaved };
  });
}

export async function returnToSavedWork(services: WorkNavigationServices, conversationId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error('Choose a saved conversation to continue.');
  const state = currentWork(services);
  if (state.conversationId === conversationId) return;
  await services.controller.withNavigationLock(async resume => {
    await preserveCurrentWork(services, state, conversationId);
    await services.ensureIdentity();
    await enterConversation(services, resume, conversationId, state.conversationId);
  });
}
