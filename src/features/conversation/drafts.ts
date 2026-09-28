/**
 * Entry Perfection Phase 9 -- unsent composer text, per conversation, kept in THIS tab's memory only. It survives the composer
 * being re-mounted (Review and back, a new card, an in-app navigation) but deliberately NOT a reload: the security doctrine allows
 * only the anonymous possession record in browser storage (see the security hardening test "C."), and unsent words are not
 * worth weakening that. Cleared on sign-out and on "Start new conversation".
 */
const drafts = new Map<string, string>();
const MAX_DRAFT_CHARS = 1200;

export function readDraft(key?: string): string {
  return key ? drafts.get(key) ?? '' : '';
}

export function writeDraft(key: string | undefined, value: string) {
  if (!key) return;
  if (value.trim()) drafts.set(key, value.slice(0, MAX_DRAFT_CHARS)); else drafts.delete(key);
}

/** Signing out or starting fresh forgets every unsent draft in this tab. */
export function clearComposerDrafts() {
  drafts.clear();
}
