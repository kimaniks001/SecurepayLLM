import type { AppView } from '../../types';

let pendingView: AppView | null = null;
let pendingKs001Message: string | null = null;
let pendingAgreementId: string | null = null;

/**
 * One-shot in-memory navigation hints for leaving the dedicated Money route and re-entering
 * the main application shell. These are UX continuity only: never persisted, never URL encoded,
 * never authority, and consumed immediately by AgentExperience.
 */
export function storeEntryView(view: AppView) {
  pendingView = view;
}

export function consumeEntryView(): AppView | null {
  const value = pendingView;
  pendingView = null;
  return value;
}

export function storeKs001EntryMessage(message: string) {
  pendingKs001Message = message.trim() || null;
}

export function consumeKs001EntryMessage(): string | null {
  const value = pendingKs001Message;
  pendingKs001Message = null;
  return value;
}

export function storeAgreementEntry(agreementId: string) {
  pendingView = 'agreement-detail';
  pendingAgreementId = agreementId.trim() || null;
}

export function consumeAgreementEntry(): string | null {
  const value = pendingAgreementId;
  pendingAgreementId = null;
  return value;
}
