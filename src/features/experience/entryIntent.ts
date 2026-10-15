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

/**
 * Structural S2: an ID-only, one-shot bridge into the EXISTING authorised
 * Dream and named-Circle screens. No private title/content/token is stored,
 * no URL exposes the ID, and the receiving service independently rechecks
 * ownership / membership. Never infer authority from an entry hint.
 */
let pendingDreamId: string | null = null;
let pendingCircleId: string | null = null;

export function storeDreamEntry(dreamId: string): void {
  const clean = dreamId.trim();
  if (!clean) throw new Error('A Dream ID is required');
  pendingDreamId = clean;
  pendingView = 'vision-board';
}
export function consumeDreamEntry(): string | null {
  const id = pendingDreamId;
  pendingDreamId = null;
  return id;
}
export function storeCircleEntry(circleId: string): void {
  const clean = circleId.trim();
  if (!clean) throw new Error('A Circle ID is required');
  pendingCircleId = clean;
  pendingView = 'community';
}
export function consumeCircleEntry(): string | null {
  const id = pendingCircleId;
  pendingCircleId = null;
  return id;
}

/** One-shot tab-memory-only return from SecurePay Money to the Living Workspace.
 * Only the server conversation ID is kept, never in URL or persistent storage.
 * Re-entry must re-authorise with the real KS001 controller. */
let workspaceMoneyReturn: {conversationId:string|null} | null = null;
export function storeWorkspaceMoneyReturn(conversationId:string|null):void {
  workspaceMoneyReturn={conversationId:conversationId?.trim() || null};
}
export function hasWorkspaceMoneyReturn():boolean { return workspaceMoneyReturn!==null; }
export function consumeWorkspaceMoneyReturn():{conversationId:string|null}|null {
  const hint=workspaceMoneyReturn;workspaceMoneyReturn=null;return hint;
}
export function clearWorkspaceMoneyReturn():void { workspaceMoneyReturn=null; }
