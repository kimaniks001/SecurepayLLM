import type { AgentGateway } from '../../api/securepay/agent';
import { agentResponseView, conversationHistoryView, tradeContextView } from '../../api/securepay/agent/adapters';
import type { AdoptFactRequest, ExternalFactRequest, KsIdentitySelectionRequest, KsIdentitySelectionResult, SelectedCommercialSourceDto, StructuredInputRequest, StructuredInputResult, TurnRequest } from '../../api/securepay/agent/dto';
import { ApiError } from '../../api/securepay/http';
import type { MessageResponse } from '../../types';

export type ContextView = ReturnType<typeof tradeContextView>;
export type ResponseView = ReturnType<typeof agentResponseView>;
export type Turn = { id: string; sender: 'user'; text: string } | { id: string; sender: 'agent'; response: ResponseView };
type Pending = { kind: 'turn'; body: TurnRequest } | { kind: 'adopt'; body: AdoptFactRequest } | { kind: 'external-amount'; body: ExternalFactRequest & { amount: string; currency?: string } };
export type OfferFact = { amount?: string; currency?: string; sourceDescription: string; sourceId?: string; sourceOwnerKsNumber?: string };
/**
 * Phase 6 Slice 4 (Community → Trade) -- "Use this" from a real Community NEED/OPPORTUNITY/
 * WORK_STORY/QUESTION/DISCUSSION object. `sourceType` is derived by the CALLER from the object's own
 * real `objectType` (OPPORTUNITY → 'OPPORTUNITY', everything else → 'COMMUNITY_POST') -- the backend
 * independently re-verifies this against the real object regardless. `candidateParticipantKsNumber`
 * is present only for "Start a trade with Peter" (an owner choosing one of their own object's ACTIVE
 * "I can help" responders as trade CONTEXT, never Agreement participant authority).
 * `openingMessage` is the real object's own title/body, never fabricated -- seeded as the first
 * conversational turn so KS001's very next reply already has this context.
 */
export type CommunitySourceFact = {
  sourceType: 'COMMUNITY_POST' | 'OPPORTUNITY';
  sourceId: string;
  sourceOwnerKsNumber: string;
  candidateParticipantKsNumber?: string;
  openingMessage: string;
};
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
  /**
   * Phase 6 Slice 4 -- the SAME "held until explicit retry/continue" discipline as
   * `offerSelectionFailure`, for a Community "Use this" whose `selectCommercialSource` call failed.
   * A failed selection never silently seeds the opening conversational turn either -- the person
   * must explicitly retry or continue without the source first.
   */
  communitySourceSelectionFailure: { fact: CommunitySourceFact; error: string } | null;
  /**
   * KS001 Upgrade Phase 1 final integration fix -- DISCOVERY OFFERED: every real, server-verified entity
   * id KS001 has offered to help find so far this session (via a DISCOVERY_OFFER response component).
   * Session-local presentation state ONLY, never DISCOVERY INVITED -- the person's own explicit
   * `requestDiscovery` accept is the sole thing that ever grants real eligibility (see {@code
   * ContextView#interactionState}, the server-owned, persisted truth). Deliberately never cleared once an
   * id is accepted: `interactionState.discoveryInvitedEntityIds` (persisted, authoritative) simply takes
   * display priority over this list once it contains the same id.
   */
  offeredDiscoveryEntityIds: string[];
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
/**
 * Phase 4 of the Agent/Trade-Context Convergence -- PART V, STALE / CONCURRENT EDIT UX: a version race is
 * normal, never a generic failure. `stale: true` means SecurePay's own understanding moved on between
 * reading it and submitting this action; the caller's draft is NEVER discarded here, and Trade Context is
 * always refreshed so a deliberate retry can succeed against the CURRENT version.
 */
export type StructuredInputOutcome =
  | { ok: true; result: StructuredInputResult; context: ContextView | null }
  | { ok: false; stale: true; error: string; context: ContextView | null }
  | { ok: false; stale: false; error: string };
export type KsIdentitySelectionOutcome =
  | { ok: true; result: KsIdentitySelectionResult; context: ContextView | null }
  | { ok: false; stale: true; error: string; context: ContextView | null }
  | { ok: false; stale: false; error: string };
const isStaleVersionError = (error: unknown): boolean => error instanceof ApiError && error.code === 'AGENT_STRUCTURED_INPUT_STALE_VERSION';
/**
 * KS001 Upgrade Phase 2 final acceptance correction (item 1) -- a historical KS001 reply, replayed as a
 * MESSAGE-ONLY presentation object: no components, no contextual panel, no suggested actions, no
 * offered-discovery ids. This is deliberately the cleanest option the mandate allows ("historical agent
 * turns may be message-only presentation objects") -- a past turn's buttons/instruments/discovery offers
 * are never reconstructed as live, actionable controls (they would act on stale state, or duplicate a
 * decision already made). No model call is made to produce this -- `text` is the real, previously
 * persisted reply, read back verbatim from `GET .../history`.
 */
function historyReplyResponseView(text: string): ResponseView {
  return {
    message: { type: 'MESSAGE', text } satisfies MessageResponse,
    components: [], panel: null, contextUpdates: [], suggestedActions: [], offeredDiscoveryEntityIds: [],
  };
}

/** Session-local orchestration. No identity, Agreement or financial authority. No automatic POST retries. */
export function createAgentController(gateway: Pick<AgentGateway, 'createConversation' | 'submitTurn' | 'readContext' | 'conversationHistory' | 'adoptFact' | 'submitAmount' | 'selectCommercialSource' | 'submitStructuredInput' | 'selectKsIdentity'>, id = () => crypto.randomUUID()) {
  let state: AgentState = { conversationId: null, turns: [], busy: false, pending: null, error: null, context: { status: 'idle', data: null, error: null }, source: null, offerSelectionFailure: null, communitySourceSelectionFailure: null, offeredDiscoveryEntityIds: [] };
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
        // KS001 Upgrade Phase 1 final integration fix -- record DISCOVERY OFFERED (never DISCOVERY
        // INVITED) for every real, server-verified target this turn offered, deduplicated.
        const offeredDiscoveryEntityIds = response.offeredDiscoveryEntityIds.length > 0
          ? Array.from(new Set([...state.offeredDiscoveryEntityIds, ...response.offeredDiscoveryEntityIds]))
          : state.offeredDiscoveryEntityIds;
        update({ turns: [...state.turns, { id: id(), sender: 'agent', response }], offeredDiscoveryEntityIds });
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
  /**
   * Phase 4 of the Agent/Trade-Context Convergence -- the SECOND legitimate Trade Context write path,
   * factored out (KS001 Upgrade Phase 1 review correction, item 2) so both `submitStructuredInput` (the
   * general-purpose entry point instruments use) and `requestDiscovery` below share the SAME
   * idempotency, stale-version handling, and error text -- never two drifting implementations of the
   * same POST. A standalone function (not `this`-based), matching `ensureConversationId`'s own reasoning.
   */
  async function doSubmitStructuredInput(
      body: Omit<StructuredInputRequest, 'clientActionId'> & { clientActionId: string }): Promise<StructuredInputOutcome> {
    if (state.busy) return { ok: false, stale: false, error: 'SecurePay is still working on the previous step.' };
    update({ busy: true, error: null });
    try {
      const conversationId = await ensureConversationId();
      const result = await gateway.submitStructuredInput(conversationId, body);
      await readContext();
      return { ok: true, result, context: state.context.status === 'ready' ? state.context.data : null };
    } catch (error) {
      if (isStaleVersionError(error)) {
        await readContext();
        return { ok: false, stale: true, error: 'What SecurePay understands has changed. Refreshed — check the current values and try again.', context: state.context.status === 'ready' ? state.context.data : null };
      }
      return { ok: false, stale: false, error: errorText(error) };
    } finally { update({ busy: false }); }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    ensureConversationId,
    /**
     * KS001 Upgrade Phase 2 (Sections 16/17), fixed by the final acceptance correction (item 1) --
     * "Continue building": switches this SAME controller onto an already-existing conversationId (a
     * saved build's own), never creating a clone or a second conversation, and now ALSO restores the
     * real, previously-persisted HUMAN/KS001 dialogue via `GET .../history` -- the person resumes into
     * what looks like the same conversation they left, not an apparently empty chat. This is a pure
     * historical read: no model call is repeated, no action is re-executed, and a past KS001 reply is
     * rendered as a message-only presentation object (see `historyReplyResponseView`) rather than a live
     * actionable turn. The canonical understanding itself (Trade Context) is separately, always re-read
     * in full via `readContext` regardless of whether history loads (see AgentSavedBuild's own javadoc:
     * the pointer never copies/mutates Trade Context, so resuming re-opens the real thing). A history
     * read failure never blocks resume -- it degrades to an empty transcript (today's prior behaviour),
     * never a fatal resume error, since the transcript is presentation only.
     */
    async resumeConversation(conversationId: string) {
      if (state.busy || state.pending) return;
      update({ conversationId, turns: [], error: null, pending: null, source: null, offerSelectionFailure: null, communitySourceSelectionFailure: null, offeredDiscoveryEntityIds: [], context: { status: 'idle', data: null, error: null } });
      let turns: Turn[] = [];
      try {
        const entries = conversationHistoryView(await gateway.conversationHistory(conversationId));
        turns = entries.map(entry => entry.sender === 'HUMAN'
          ? { id: entry.id, sender: 'user' as const, text: entry.text }
          : { id: entry.id, sender: 'agent' as const, response: historyReplyResponseView(entry.text) });
      } catch { /* presentation-only; Trade Context (read below) remains the canonical understanding */ }
      update({ turns });
      await readContext();
    },
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
    /**
     * KS001 Upgrade Phase 3 completion correction (item 7) -- called after a source (a pasted plan/
     * uploaded document/photo) has actually been ingested. Unlike `review()` (a plain Trade Context
     * refresh), this ALSO re-reads the real conversation history and appends any genuinely NEW KS001
     * reply -- the server-composed, deterministic continuation `AgentSourceIngestionService` records
     * (see `SourceIngestionContinuationComposer`'s own javadoc) -- so the person actually sees KS001
     * react to what was brought in, never only a silent BUILD refresh. Existing turns are never touched
     * or duplicated (matched by id); a history read failure degrades to the same behaviour `review()`
     * already has (BUILD itself still refreshes via readContext below).
     */
    async refreshAfterSourceIngestion() {
      if (state.busy || !state.conversationId) return;
      update({ busy: true });
      try {
        try {
          const entries = conversationHistoryView(await gateway.conversationHistory(state.conversationId));
          const existingIds = new Set(state.turns.map(turn => turn.id));
          const newReplies: Turn[] = entries
            .filter(entry => entry.sender === 'KS001' && !existingIds.has(entry.id))
            .map(entry => ({ id: entry.id, sender: 'agent' as const, response: historyReplyResponseView(entry.text) }));
          if (newReplies.length > 0) update({ turns: [...state.turns, ...newReplies] });
        } catch { /* presentation-only; the Trade Context refresh below remains the canonical understanding */ }
        await readContext();
      } finally { update({ busy: false }); }
    },
    async adopt(targetId: string, targetKind: AdoptFactRequest['targetKind']) {
      if (state.busy || state.pending || state.context.status !== 'ready') return;
      if (!state.context.data?.candidates.some(fact => fact.id === targetId && fact.targetKind === targetKind)) return;
      await run({ kind: 'adopt', body: { targetId, targetKind, clientTurnId: id() } });
    },
    /**
     * Phase 4 of the Agent/Trade-Context Convergence -- the SECOND legitimate Trade Context write path:
     * an EXPLICIT UI ACTION (an instrument submission or a direct UNDERSTOOD edit). Deliberately NOT
     * routed through `run()`/`pending` (that machinery is turn/adopt/amount-shaped and assumes a single
     * "the current pending thing"); the caller (the instruments controller) already owns its own
     * draft/retry state and supplies a STABLE `clientActionId` it reuses across a retry itself, so a
     * network retry can never duplicate the action. Never appends a conversational turn -- a calendar
     * click or a money edit is not something the person "said."
     */
    submitStructuredInput: doSubmitStructuredInput,
    /**
     * KS001 Upgrade Phase 1 review correction (item 2) -- the preferred, most authority-safe
     * discovery-invitation path: a genuine, explicit, user-originated action (the person choosing to
     * accept KS001's own offer to help find a specific thing), never a fabricated chat sentence and
     * never the model inferring consent from free text. Reuses the SAME structured-input machinery
     * (idempotency via a fresh `clientActionId` per call, stale-version handling, error text) every
     * other UI action already uses -- never a bespoke second write path. `targetEntityId` is the exact
     * entity (from UNDERSTOOD/Trade Context) discovery is being requested for; the current Trade
     * Context version is read from state, exactly like the instruments controller's own
     * `currentVersion()` convention.
     */
    async requestDiscovery(targetEntityId: string): Promise<StructuredInputOutcome> {
      const expectedTradeContextVersion = state.context.status === 'ready' ? state.context.data!.version : 0;
      return doSubmitStructuredInput({
        type: 'REQUEST_DISCOVERY', targetEntityId, expectedTradeContextVersion, clientActionId: id(),
      });
    },
    /**
     * Phase 4, Part C -- the Who instrument's "I have their KS Number" trusted-user-action path.
     * Omitting `expectedTradeContextVersion` performs a PURE lookup (a preview: "Maua Shoes / KS003 /
     * Business" before the person confirms it) with no Trade Context effect; supplying it also binds the
     * resolved identity. Never a fabricated chat turn.
     */
    async selectKsIdentity(body: KsIdentitySelectionRequest): Promise<KsIdentitySelectionOutcome> {
      if (state.busy) return { ok: false, stale: false, error: 'SecurePay is still working on the previous step.' };
      update({ busy: true, error: null });
      try {
        const conversationId = await ensureConversationId();
        const result = await gateway.selectKsIdentity(conversationId, body);
        if (body.expectedTradeContextVersion !== undefined) await readContext();
        return { ok: true, result, context: state.context.status === 'ready' ? state.context.data : null };
      } catch (error) {
        if (isStaleVersionError(error)) {
          await readContext();
          return { ok: false, stale: true, error: 'What SecurePay understands has changed. Refreshed — check the current values and try again.', context: state.context.status === 'ready' ? state.context.data : null };
        }
        return { ok: false, stale: false, error: errorText(error) };
      } finally { update({ busy: false }); }
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
    /**
     * Phase 6 Slice 4 (Community → Trade) -- "Use this" from a real Community object. Mirrors
     * `useOffer`'s own discipline exactly: the source is selected FIRST (server-verified, never a
     * fabricated title/owner), and only after that succeeds does the object's own real title/body
     * seed the opening conversational turn -- never the reverse, so a failed selection can never
     * silently become a DIRECT trade that still looks like it came from Community.
     */
    async useCommunitySource(fact: CommunitySourceFact): Promise<SourceSelectionResult> {
      if (state.busy || state.pending) return { status: 'busy' };
      return attemptCommunitySourceSelection(fact);
    },
    /** Re-attempts the exact same "Use this" the person already chose. */
    async retryCommunitySourceSelection(): Promise<SourceSelectionResult> {
      const failure = state.communitySourceSelectionFailure;
      if (state.busy || state.pending) return { status: 'busy' };
      if (!failure) return { status: 'no-source' };
      return attemptCommunitySourceSelection(failure.fact);
    },
    /**
     * The explicit, visible choice to proceed without the Community source: clears any provenance so
     * the eventual Agreement is understood as DIRECT, never silently attributed to a Community object
     * that was never actually confirmed. The opening message is still worth saying -- it is the
     * person's own real words about what they want -- so it is still seeded as an ordinary turn.
     */
    async continueCommunitySourceWithoutSource(): Promise<'continued' | 'busy' | 'nothing'> {
      const failure = state.communitySourceSelectionFailure;
      if (state.busy || state.pending) return 'busy';
      if (!failure) return 'nothing';
      update({ communitySourceSelectionFailure: null, source: null });
      await seedOpeningTurnIfFirst(failure.fact.openingMessage);
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

  /**
   * Phase 6 Slice 4 -- selects the real Community source FIRST (server-verified against the real
   * object; never trusts the caller's own title/owner claims), then seeds the object's own real
   * title/body as the opening conversational turn (only on a genuinely fresh conversation -- never
   * repeated on a retry that already has turns). A failed selection is held in
   * `communitySourceSelectionFailure`, untouched, until an explicit retry/continue -- the opening
   * message is never sent while a selection failure is outstanding.
   */
  async function attemptCommunitySourceSelection(fact: CommunitySourceFact): Promise<SourceSelectionResult> {
    update({ communitySourceSelectionFailure: null });
    let selection: SelectedCommercialSourceDto;
    try {
      const conversationId = await ensureConversationId();
      selection = await gateway.selectCommercialSource(conversationId, {
        sourceType: fact.sourceType, sourceId: fact.sourceId, sourceOwnerKsNumber: fact.sourceOwnerKsNumber,
        candidateParticipantKsNumber: fact.candidateParticipantKsNumber,
      });
    } catch (error) {
      const message = sourceErrorText(error);
      update({ communitySourceSelectionFailure: { fact, error: message } });
      return { status: 'failed', error: message };
    }
    update({ source: selection });
    await seedOpeningTurnIfFirst(fact.openingMessage);
    return { status: 'selected', source: selection, amount: 'none' };
  }

  /** Seeds the person's own real opening words as an ordinary turn -- only when the conversation has
   * no turns yet, so this never re-says anything on a retry or a later "Use this" mid-conversation. */
  async function seedOpeningTurnIfFirst(openingMessage: string): Promise<void> {
    if (state.turns.length > 0 || !openingMessage.trim()) return;
    const clientTurnId = id();
    update({ turns: [...state.turns, { id: clientTurnId, sender: 'user', text: openingMessage.trim() }] });
    await run({ kind: 'turn', body: { message: openingMessage.trim(), clientTurnId } });
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
