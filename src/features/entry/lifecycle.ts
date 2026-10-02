/**
 * User-Ready Beta Gate 1 -- the entry rules the person never has to think about, as pure functions (tested in
 * tests/user-ready-beta-gate1.test.mjs).
 *
 * START NEW = an unrelated intention (a fresh conversation). CONTINUE = explicitly return to earlier work.
 * REFRESH = re-read the current canonical state; it never resets anything.
 */

/**
 * The real turn transport boundary: SecurePayAPI `SubmitTurnRequest.message` is `@Size(max = 1200)`. Current architectural
 * decision (Gate 1, D2): at or under it the words are a conversational turn; over it they are automatically a pasted
 * SOURCE (`/sources/pasted-text`, which refuses rather than truncates and de-duplicates by content). No lower heuristic.
 */
export const TURN_MAX_CHARS = 1200;

export type InputRoute = 'turn' | 'source';

/** Measured on the trimmed text, exactly what is sent (the controller and the server both trim). */
export function routeInput(text: string): InputRoute {
  return text.trim().length > TURN_MAX_CHARS ? 'source' : 'turn';
}

/** Something the person would lose: their own words, a source they brought, or anything SecurePay already understood. */
export function hasMeaningfulWork(work: { turns: { sender: string }[]; sources: { extractionStatus: string }[]; factCount: number }): boolean {
  return work.turns.some(turn => turn.sender === 'user')
    || work.sources.some(source => source.extractionStatus !== 'REMOVED')
    || work.factCount > 0;
}

/**
 * Every conversation starts anonymous (a tab-scoped possession record). It is unsaved while that record still belongs to it;
 * "Save for later" claims it (the record is then forgotten and the work is reachable from Continue building).
 */
export function isUnsaved(conversationId: string | null, resumableConversationId: string | null): boolean {
  return !!conversationId && resumableConversationId === conversationId;
}

/**
 * none    -- nothing is open: use the current (empty) conversation.
 * proceed -- start fresh cleanly (nothing meaningful, or the work is safely saved).
 * confirm -- meaningful unsaved work would be left behind: ask first (Gate 1, D1).
 */
export type StartNewDecision = 'none' | 'proceed' | 'confirm';

export function startNewDecision(input: { conversationId: string | null; unsaved: boolean; meaningful: boolean }): StartNewDecision {
  if (!input.conversationId) return 'none';
  return input.unsaved && input.meaningful ? 'confirm' : 'proceed';
}

const MAX_TITLE = 60;

/** What the person would recognise this work as: the agreement's own "what", else their first words. Never an id. */
export function conversationTitle(what: string | null | undefined, turns: { sender: string; text?: string }[]): string {
  const fromAgreement = what?.trim();
  if (fromAgreement) return clip(fromAgreement);
  const first = turns.find(turn => turn.sender === 'user' && turn.text?.trim());
  return first?.text ? clip(first.text.trim()) : 'Your conversation';
}

function clip(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ');
  return oneLine.length > MAX_TITLE ? `${oneLine.slice(0, MAX_TITLE - 1).trimEnd()}…` : oneLine;
}
