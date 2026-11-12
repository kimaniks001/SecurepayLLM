/**
 * Prove that Mini re-opened precisely the server's authorised conversation.
 * Never accept an empty transcript as "restored" based on turn count alone.
 * This is a client-side integrity check, not authentication: API access policy
 * must independently authorise every source request and each Agreement read.
 */
export function miniHistoryRestored(history, state, expectedConversationId) {
  if (!expectedConversationId ||
      state?.conversationId !== expectedConversationId ||
      state?.context?.status !== 'ready' ||
      state?.pending || state?.error ||
      !history || !Array.isArray(history.entries) ||
      !Array.isArray(state.turns)) return false;

  const entries = history.entries;
  const turns = state.turns;
  if (entries.length !== turns.length) return false;
  const ids = new Set();

  for (let i=0;i<entries.length;i++) {
    const e=entries[i];
    const turn=turns[i];
    if (!e || !turn || typeof e.id !== 'string' || !e.id ||
      ids.has(e.id) || typeof e.text !== 'string' || typeof e.occurredAt !== 'string' ||
      (e.sender !== 'HUMAN' && e.sender !== 'KS001') || turn.id !== e.id) return false;

    ids.add(e.id);
    if (e.sender === 'HUMAN') {
      if (turn.sender !== 'user' || turn.text !== e.text) return false;
    } else {
      if (turn.sender !== 'agent') return false;
      const message = turn.response?.message;
      const actual = typeof message === 'string' ? message : message?.text;
      if (actual !== e.text) return false;
    }
  }
  return true;
}
