/**
 * Public Experience Convergence Phase 3 (Slice 3A) -- anonymous conversation continuity, tab-scoped.
 *
 * `POST /api/agent/conversations` returns a one-time possession secret. This module is the ONLY place the
 * browser keeps it, and only as a convenience (authority stays on the server):
 *
 * - `sessionStorage` only, under one versioned key. Never persistent cross-tab storage, a cookie or the URL, so a new tab,
 *   another browser or a shared link carries no access.
 * - A same-tab reload can resume the conversation until `anonymousExpiresAt`.
 * - The record is forgotten on claim (save / signed-in handoff), on the server's non-leaking 404, and on
 *   expiry. A malformed record is discarded, never trusted.
 * - If `sessionStorage` is unavailable (private mode, blocked storage) the record lives in memory for this
 *   page only.
 */
export const ANONYMOUS_CONVERSATION_KEY = 'securepay.agent.anonymous.v1';
export const CONVERSATION_TOKEN_HEADER = 'X-SecurePay-Conversation-Token';

export interface ConversationAccessRecord {
  conversationId: string;
  secret: string;
  anonymousExpiresAt: string;
}

export interface ConversationAccessStore {
  current(): ConversationAccessRecord | null;
  remember(record: ConversationAccessRecord): void;
  /** Forgets the record; with an id, only if it is that conversation's record. */
  forget(conversationId?: string): void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{43,256}$/;

function valid(value: unknown, now: number): value is ConversationAccessRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.conversationId !== 'string' || !UUID.test(record.conversationId)) return false;
  if (typeof record.secret !== 'string' || !SECRET.test(record.secret)) return false;
  if (typeof record.anonymousExpiresAt !== 'string') return false;
  const expires = Date.parse(record.anonymousExpiresAt);
  return Number.isFinite(expires) && expires > now;
}

function sessionStorageOrNull(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function createConversationAccessStore(
  storage: Storage | null = sessionStorageOrNull(),
  now: () => number = () => Date.now(),
): ConversationAccessStore {
  let memory: ConversationAccessRecord | null = null;
  const read = (): unknown => {
    if (!storage) return memory;
    try {
      const raw = storage.getItem(ANONYMOUS_CONVERSATION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const clear = () => {
    memory = null;
    try { storage?.removeItem(ANONYMOUS_CONVERSATION_KEY); } catch { /* storage blocked -- memory already cleared */ }
  };
  return {
    current() {
      const value = read();
      if (value === null || value === undefined) return null;
      if (!valid(value, now())) { clear(); return null; }
      return { conversationId: value.conversationId, secret: value.secret, anonymousExpiresAt: value.anonymousExpiresAt };
    },
    remember(record) {
      if (!valid(record, now())) return;
      const clean = { conversationId: record.conversationId, secret: record.secret, anonymousExpiresAt: record.anonymousExpiresAt };
      memory = clean;
      try { storage?.setItem(ANONYMOUS_CONVERSATION_KEY, JSON.stringify(clean)); } catch { /* memory fallback */ }
    },
    forget(conversationId) {
      if (conversationId !== undefined) {
        const value = read();
        if (value && typeof value === 'object' && (value as Record<string, unknown>).conversationId !== conversationId) return;
      }
      clear();
    },
  };
}

/** The one store the app uses (gateway + resume). Tests create their own. */
export const conversationAccess: ConversationAccessStore = createConversationAccessStore();
