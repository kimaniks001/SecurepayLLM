import type { AgentGateway } from '../../api/securepay/agent';
import { agentResponseView, tradeContextView } from '../../api/securepay/agent/adapters';
import type { AdoptFactRequest, ExternalFactRequest, SelectedCommercialSourceDto, TurnRequest } from '../../api/securepay/agent/dto';
import { ApiError } from '../../api/securepay/http';

export type ContextView = ReturnType<typeof tradeContextView>;
export type ResponseView = ReturnType<typeof agentResponseView>;
export type Turn = { id: string; sender: 'user'; text: string } | { id: string; sender: 'agent'; response: ResponseView };
type Pending = { kind: 'turn'; body: TurnRequest } | { kind: 'adopt'; body: AdoptFactRequest } | { kind: 'external-amount'; body: ExternalFactRequest & { amount: string; currency?: string } };
export type OfferFact = { amount?: string; currency?: string; sourceDescription: string; sourceId?: string; sourceOwnerKsNumber?: string };
export interface AgentState {
  conversationId: string | null;
  turns: Turn[];
  busy: boolean;
  pending: Pending | null;
  error: string | null;
  context: { status: 'idle' | 'loading' | 'ready' | 'error'; data: ContextView | null; error: string | null };
  // Final Phase 4 Economy Turn 2 (Section 10) -- the real commercial source this conversation is
  // currently proceeding from, if any (e.g. a selected Store offer). Provenance only, shown before
  // progression so the person can see "started from X" -- never Agreement/CONFIRMED truth.
  source: SelectedCommercialSourceDto | null;
  /**
   * Final Phase 4 Economy Turn 3 (Section 5) -- a Store "Use this" whose `selectCommercialSource`
   * call failed. Held here, untouched, until an explicit `retryOfferSelection` or
   * `continueOfferWithoutSource` -- never auto-resolved, and the amount/context the offer carried
   * is never submitted while this is set, so a failed source selection can never silently become a
   * DIRECT trade that still looks like it came from the Store.
   */
  offerSelectionFailure: { fact: OfferFact; error: string } | null;
}
/**
 * The outcome of ONE attempted "Use this" / retry, returned by the operation itself so no caller ever has to
 * infer it from a state snapshot (a source that was ALREADY selected earlier must never be mistaken for a
 * fresh success).
 *  - selected   : `selectCommercialSource` succeeded THIS time. `amount` says what happened to the source-derived
 *                 price afterwards: 'submitted' (as a CANDIDATE), 'none' (the offer had no price), or 'failed'
 *                 (the source is selected but the candidate amount did not reach SecurePay -- the conversation
 *                 shows its own retry; the source is never rolled back or re-selected).
 *  - failed     : selection failed; NOTHING derived from the offer was submitted; `offerSelectionFailure` holds it
 *                 for Retry / Continue without this source.
 *  - busy       : the Agent was already working; NOTHING happened (no selection, no amount).
 *  - no-source  : the offer carried no real source pointer (id + owner KS), so no source was selected.
 */
export type SourceSelectionResult =
  | { status: 'selected'; source: SelectedCommercialSourceDto; amount: 'submitted' | 'none' | 'failed' }
  | { status: 'failed'; error: string }
  | { status: 'busy' }
  | { status: 'no-source' };
/** Truthful wording for retrying whatever is pending -- an amount submission is not a conversational turn. */
export function retryLabel(pending: AgentState['pending']): string {
  return pending?.kind === 'adopt' ? 'Retry Use this' : pending?.kind === 'external-amount' ? 'Retry amount' : 'Retry message';
}
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'This conversation or candidate could not be found. You can retry or start a new conversation.';
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request. Your message is still here.';
    if (error.status === 409) return 'The source or request has changed. Refresh what SecurePay understands before continuing.';
    if (error.status === 410) return 'This reference has expired. Refresh what SecurePay understands.';
    // CLIENT FAILURE != PROOF OF NON-DELIVERY: a timeout/network error/5xx can happen AFTER SecurePay committed the step.
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay could not confirm whether this step completed. Your message is kept — retry to check; the same step is never applied twice.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
/**
 * Why linking a chosen Store listing to the conversation did not work -- in terms of the LISTING, not a chat
 * turn. Selecting a source is an idempotent replace on the backend, so trying again is always safe.
 */
export function sourceErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'That listing may have been unpublished or removed, so SecurePay couldn’t find it.';
    if (error.status === 401 || error.status === 403) return 'SecurePay couldn’t allow this just now.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay couldn’t reach the Store just now. Trying again is safe.';
    return error.message;
  }
  return 'SecurePay couldn’t link this listing just now. Trying again is safe.';
}
/** Session-local orchestration. No identity, Agreement or financial authority. No automatic POST retries. */
export function createAgentController(gateway: Pick<AgentGateway, 'createConversation' | 'submitTurn' | 'readContext' | 'adoptFact' | 'submitAmount' | 'selectCommercialSource'>, id = () => crypto.randomUUID()) {
  let state: AgentState = { conversationId: null, turns: [], busy: false, pending: null, error: null, context: { status: 'idle', data: null, error: null }, source: null, offerSelectionFailure: null };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<AgentState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  async function readContext() {
    if (!state.conversationId) return;
    update({ context: { status: 'loading', data: state.context.data, error: null } });
    try {
      const data = tradeContextView(await gateway.readContext(state.conversationId));
      update({ context: { status: 'ready', data, error: null } });
    } catch (error) { update({ context: { status: 'error', data: null, error: errorText(error) } }); }
  }
  async function run(pending: Pending): Promise<boolean> {
    const contextBefore = state.context;
    // Phase 1: the last-known Trade Context stays visible while it is being re-read (`data` is
    // retained), so UNDERSTOOD never blanks between turns. `status` still says 'loading' -- it is
    // never presented as fresh -- and a FAILED read still clears it (never stale-as-current).
    update({ busy: true, pending, error: null, context: { status: 'loading', data: state.context.data, error: null } });
    try {
      let conversationId = state.conversationId;
      if (!conversationId) {
        const conversation = await gateway.createConversation();
        if (!conversation?.conversationId) throw new ApiError('invalid-response', 'SecurePay did not return a conversation.');
        conversationId = conversation.conversationId;
        update({ conversationId });
      }
      if (pending.kind === 'turn') {
        const response = agentResponseView(await gateway.submitTurn(conversationId, pending.body));
        update({ turns: [...state.turns, { id: id(), sender: 'agent', response }] });
      } else if (pending.kind === 'adopt') {
        await gateway.adoptFact(conversationId, pending.body);
      } else {
        await gateway.submitAmount(conversationId, pending.body);
      }
      // A failed GET never causes an already completed POST to be repeated.
      update({ pending: null });
      await readContext();
      return true;
    } catch (error) {
      // The request itself failed, so SecurePay's understanding is exactly what it was: keep showing it.
      update({ error: errorText(error), context: contextBefore });
      return false;
    } finally { update({ busy: false }); }
  }
  /**
   * Final Phase 3 correction (Section 9/13): the ONE persistent SecurePay conversation, made
   * available to a caller (e.g. Agreement Workspace's Ask panel) that needs the real
   * conversationId BEFORE it can submit a turn -- e.g. to create/switch an Agreement access
   * grant on it first. Creates the conversation if one does not exist yet; otherwise returns the
   * existing one. Never creates a second, separate conversation. A standalone function (not an
   * object-literal method relying on `this`) so it can be called safely from other methods below.
   */
  async function ensureConversationId(): Promise<string> {
    if (state.conversationId) return state.conversationId;
    const conversation = await gateway.createConversation();
    if (!conversation?.conversationId) throw new ApiError('invalid-response', 'SecurePay did not return a conversation.');
    update({ conversationId: conversation.conversationId });
    return conversation.conversationId;
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    ensureConversationId,
    async send(text: string) {
      if (state.busy || state.pending || !text.trim()) return;
      const clientTurnId = id();
      update({ turns: [...state.turns, { id: clientTurnId, sender: 'user', text: text.trim() }] });
      await run({ kind: 'turn', body: { message: text.trim(), clientTurnId } });
    },
    async retry() { if (!state.busy && state.pending) await run(state.pending); },
    /**
     * Phase 1 Interaction Instruments. An instrument finishes by saying ONE ordinary sentence to
     * the real Agent -- exactly the authority of the person typing it. It appears in the
     * transcript like any turn (the conversation stays the single record of what was said) and
     * goes through the same clientTurnId / retry / no-auto-repeat rules as `send`.
     *
     * DELIVERY CAN BE UNCERTAIN. If the request fails, SecurePay may still have committed the turn
     * (timeout, dropped response). The transcript entry is therefore NEVER removed, the same
     * clientTurnId is kept for `retry()` (the backend replays an already-processed turn instead of
     * applying it twice), and while that earlier step is unresolved (`pending` set) no different
     * statement is sent.
     * Resolves with the Trade Context read back AFTER the turn, so a caller can check that the
     * backend really recorded what was said instead of assuming it.
     */
    async sendStatement(text: string): Promise<{ ok: true; context: ContextView | null } | { ok: false; error: string }> {
      const statement = text.trim();
      if (state.busy || state.pending || !statement) return { ok: false, error: 'SecurePay is still working on the previous step.' };
      const clientTurnId = id();
      update({ turns: [...state.turns, { id: clientTurnId, sender: 'user', text: statement }] });
      const ok = await run({ kind: 'turn', body: { message: statement, clientTurnId } });
      if (!ok) return { ok: false, error: state.error ?? 'SecurePay could not complete this step.' };
      return { ok: true, context: state.context.status === 'ready' ? state.context.data : null };
    },
    async review() {
      if (state.busy) return;
      update({ busy: true });
      try { await readContext(); } finally { update({ busy: false }); }
    },
    async adopt(targetId: string, targetKind: AdoptFactRequest['targetKind']) {
      if (state.busy || state.pending || state.context.status !== 'ready') return;
      if (!state.context.data?.candidates.some(fact => fact.id === targetId && fact.targetKind === targetKind)) return;
      await run({ kind: 'adopt', body: { targetId, targetKind, clientTurnId: id() } });
    },
    /**
     * The Store "Use this" -> Trade Taking Shape convergence (task section 5). If the Offer carries a
     * determinate numeric price, it is submitted as a real CANDIDATE external fact tagged
     * `sourceKind: 'STORE_LISTING'` (the exact enum value verified on the backend's
     * ExternalFactSourceKind) — this is real backend-recorded provenance, not a fabricated adoption.
     * The backend's own TradeEntityView/TradeRelationshipView strip sourceKind/sourceDescription
     * before they reach the wire (verified: no provenance read endpoint exists), so this method never
     * claims the resulting candidate fact will render with that source description attached — only that
     * SecurePay's own record of the submission carries it. If the Offer has no determinate price
     * (priceType 'unlisted'), no fact is fabricated; a conversation still starts so the customer can
     * describe the trade in their own words.
     *
     * Final Phase 4 Economy Turn 2 (Section 3/9): when the offer's stable id and owner KS Number are
     * known (real Store data, never fabricated), this ALSO records the real commercial source
     * pointer via `selectCommercialSource` before the conversational fact is submitted, so the
     * eventual Agreement (if one forms) can carry immutable source provenance.
     *
     * Final Phase 4 Economy Turn 3 (Section 5) correction: a failed `selectCommercialSource` no
     * longer fails silently into an ordinary DIRECT trade that still carries the Store's amount and
     * description -- that would retain source-derived facts while discarding the provenance that
     * justified them. Instead this stops here and records `offerSelectionFailure`, so the person
     * must explicitly `retryOfferSelection` or `continueOfferWithoutSource` before anything from
     * this offer is submitted to the conversation. Ordinary free-text conversation is unaffected --
     * it never goes through this method at all.
     */
    async useOffer(fact: OfferFact): Promise<SourceSelectionResult> {
      if (state.busy || state.pending) return { status: 'busy' };
      return attemptOfferSelection(fact);
    },
    /** Section 5 -- re-attempts the exact same "Use this" the person already chose. */
    async retryOfferSelection(): Promise<SourceSelectionResult> {
      const failure = state.offerSelectionFailure;
      if (state.busy || state.pending) return { status: 'busy' };
      if (!failure) return { status: 'no-source' };
      return attemptOfferSelection(failure.fact);
    },
    /**
     * Section 5 -- the explicit, visible choice to proceed without the Store source: clears any
     * provenance so the eventual Agreement is understood as DIRECT, never silently attributed to a
     * Store offer that was never actually confirmed.
     */
    async continueOfferWithoutSource(): Promise<'continued' | 'busy' | 'nothing'> {
      const failure = state.offerSelectionFailure;
      if (state.busy || state.pending) return 'busy';
      if (!failure) return 'nothing';
      update({ offerSelectionFailure: null, source: null });
      await submitOfferFact(failure.fact);
      return 'continued';
    },
  };

  async function attemptOfferSelection(fact: OfferFact): Promise<SourceSelectionResult> {
    update({ offerSelectionFailure: null });
    if (!(fact.sourceId && fact.sourceOwnerKsNumber)) { await submitOfferFact(fact); return { status: 'no-source' }; }
    let selection: SelectedCommercialSourceDto;
    try {
      const conversationId = await ensureConversationId();
      selection = await gateway.selectCommercialSource(conversationId, {
        sourceType: 'STORE_LISTING', sourceId: fact.sourceId, sourceOwnerKsNumber: fact.sourceOwnerKsNumber,
      });
    } catch (error) {
      const message = sourceErrorText(error);
      update({ offerSelectionFailure: { fact, error: message } });
      return { status: 'failed', error: message };
    }
    update({ source: selection });
    // Only AFTER the source is really selected may the offer's price become a candidate fact.
    const amount = fact.amount ? ((await submitOfferFact(fact)) ? 'submitted' : 'failed') : (await submitOfferFact(fact), 'none');
    return { status: 'selected', source: selection, amount };
  }

  /** Returns whether the offer's amount (if any) / conversation seed reached SecurePay. */
  async function submitOfferFact(fact: OfferFact): Promise<boolean> {
    if (fact.amount) {
      return run({ kind: 'external-amount', body: { sourceKind: 'STORE_LISTING', sourceDescription: fact.sourceDescription, amount: fact.amount, currency: fact.currency } });
    }
    if (state.conversationId) return true;
    update({ busy: true, error: null });
    try {
      const conversation = await gateway.createConversation();
      if (!conversation?.conversationId) throw new ApiError('invalid-response', 'SecurePay did not return a conversation.');
      update({ conversationId: conversation.conversationId });
      await readContext();
      return true;
    } catch (error) {
      update({ error: errorText(error) });
      return false;
    } finally { update({ busy: false }); }
  }
}
export type AgentController = ReturnType<typeof createAgentController>;
