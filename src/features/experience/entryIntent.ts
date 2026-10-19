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

/** One-shot ID-only navigation to a real Community LIVE object.
 * No post body, author identity or permission travels with the hint. */
let pendingCommunityObjectId:string|null=null;
export function storeCommunityObjectEntry(objectId:string):void {
  const id=objectId.trim();
  if(!id)throw Error('A Community object ID is required');
  pendingCommunityObjectId=id;
  pendingView='community';
}
export function consumeCommunityObjectEntry():string|null {
  const id=pendingCommunityObjectId;
  pendingCommunityObjectId=null;
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

/**
 * Deliberate, reversible bridge between the existing KS001 work screen and
 * the opt-in Living Workspace. An ID-only hint is held for a single immediate
 * navigation in this tab: no local/session storage, query string, token, user
 * data, participant or Agreement authority is transferred.
 *
 * The receiver MUST read the server as the current signed-in identity. A
 * consumed hint cannot confer access or create/accept an Agreement.
 */
let pendingLivingWorkspaceConversation: string | null = null;
let pendingKs001ConversationReturn: string | null = null;

export function storeLivingWorkspaceEntry(conversationId: string): void {
  const id = conversationId.trim();
  if (!id) throw new Error('An existing KS001 conversation is required');
  pendingLivingWorkspaceConversation = id;
}
export function consumeLivingWorkspaceEntry(): string | null {
  const id = pendingLivingWorkspaceConversation;
  pendingLivingWorkspaceConversation = null;
  return id;
}
export function storeKs001ConversationReturn(conversationId: string): void {
  const id = conversationId.trim();
  if (!id) throw new Error('An existing KS001 conversation is required');
  pendingKs001ConversationReturn = id;
}
export function consumeKs001ConversationReturn(): string | null {
  const id = pendingKs001ConversationReturn;
  pendingKs001ConversationReturn = null;
  return id;
}

/**
 * A promise resolving from resumeConversation is NOT proof of authorisation:
 * history/context errors are converted into an error snapshot by the canonical
 * controller. The UI must see a fresh, non-null, matching server context.
 */
export function authorisedResumedConversation(
  expectedId: string,
  state: { conversationId: string | null; context: {status: string; data: unknown} },
): boolean {
  return !!expectedId && state.conversationId === expectedId
      && state.context.status === 'ready' && state.context.data !== null && state.context.data !== undefined;
}
