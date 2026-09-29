import type { AgentGateway } from '../../api/securepay/agent';
import { sourceArtifactView, type AgentSourceArtifactView } from '../../api/securepay/agent/adapters';
import { ApiError } from '../../api/securepay/http';
import { sourceOutcome } from './presentation';

export type { AgentSourceArtifactView };

/**
 * Entry Perfection Phase 2 -- whether a failed request left the outcome UNKNOWN: the server may still have
 * finished (a timeout, a dropped connection, a 5xx after commit). Such a result is never shown as "failed".
 */
export function isOutcomeUnknown(error: unknown): boolean {
  return error instanceof ApiError
    && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);
}

/**
 * Entry Perfection Phase 2 -- the ONE customer-safe wording for every input refusal/failure. Never shows server,
 * Java, MIME or HTTP text (the old fallback returned `error.message`, which could be e.g. "uploaded content does
 * not match its declared type (application/pdf)").
 */
export function sourceIngestionErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'AGENT_SOURCE_UNSUPPORTED_MEDIA_TYPE': return 'SecurePay doesn’t support this file type yet. Try a PDF, Word, Excel, text or CSV file, or a JPEG or PNG photo.';
      case 'AGENT_SOURCE_CONTENT_MISMATCH': return 'This file doesn’t look like the kind of file it says it is, or it may be damaged. Try the original file, or paste the text here.';
      case 'AGENT_SOURCE_TOO_LARGE': return 'This file is too large for SecurePay to read. Try a smaller file, or paste the important part.';
      case 'AGENT_SOURCE_IMAGE_TOO_LARGE': return 'This photo is too large for SecurePay to read. Try a smaller photo or a screenshot.';
      case 'AGENT_SOURCE_NOT_FOUND': return 'This source could not be found. It may have been removed — you can add it again.';
      case 'AGENT_SOURCE_CAPABILITY_UNAVAILABLE': return 'This kind of source isn’t available yet.';
      case 'AGENT_CONVERSATION_NOT_FOUND': return 'This conversation is no longer available here. Start a new one to continue.';
      case 'AGENT_CONFLICT': return 'The conversation changed while SecurePay was working on this. Trying again is safe — nothing will be added twice.';
      case 'AGENT_INVALID_INPUT': return 'SecurePay couldn’t use this as it is. Check it and try again.';
      default: break;
    }
    if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') return 'SecurePay needs a short pause before taking more. Try again in a little while.';
    if (error.status === 401 || error.status === 403) return 'SecurePay couldn’t allow this just now.';
    if (isOutcomeUnknown(error)) return OUTCOME_UNKNOWN_TEXT;
  }
  return 'SecurePay couldn’t add this just now. Trying again is safe.';
}

export const OUTCOME_UNKNOWN_TEXT = 'The connection was interrupted, so SecurePay couldn’t confirm whether it read this. Trying again is safe — it won’t be added twice.';
export const STILL_READING_TEXT = 'SecurePay is still reading this. It will appear here as soon as it’s done.';
const FAILED_FALLBACK_TEXT = 'SecurePay couldn’t read this. Nothing from it has been added — you can try again.';

/**
 * Entry Perfection Phase 2 -- 'checking': a request's outcome was unknown (or the attempt is still being read), so
 * the controller is reconciling against the server by the SAME content (the server de-duplicates by digest) or by
 * artifact id. Never presented as failure.
 */
export type SourcesPhase = 'idle' | 'listing' | 'list-ready' | 'submitting' | 'checking' | 'error';
export interface SourcesState {
  phase: SourcesPhase;
  sources: AgentSourceArtifactView[];
  error: string | null;
  /**
   * User-Ready Beta Gate 1 (EP-CERT-014) -- the source whose own card already shows this failure (with Try again / Remove),
   * so the page never repeats the same message a second time. Null when no card carries it (refused before reading,
   * a connection problem): then the page-level notice is the only place it appears.
   */
  errorSourceId: string | null;
}
const initial: SourcesState = { phase: 'idle', sources: [], error: null, errorSourceId: null };

/**
 * Entry Perfection Phase 2 -- the terminal result of ONE source action, returned only after the UI knows the truth:
 *  - ok:true          READY or PARTIAL, and the canonical conversation has been reconciled (`onSourceIngested` awaited).
 *                     `attention` is true for PARTIAL or when uncertainties remain.
 *  - outcome 'failed' the attempt ran and FAILED (HTTP 201 is transport success only). The card shows the reason.
 *  - outcome 'refused' SecurePay refused the input before reading it (type, size, damaged file...).
 *  - outcome 'unknown' the server's outcome could not be confirmed even after reconciling; trying again is safe.
 */
export type SourceActionResult =
  | { ok: true; source: AgentSourceArtifactView; attention: boolean }
  | { ok: false; error: string; outcome: 'failed' | 'refused' | 'unknown'; source?: AgentSourceArtifactView };

/**
 * `onSourceIngested` -- a source attempt produced usable understanding (READY/PARTIAL). AWAITED before the action
 * resolves, so the caller can reconcile the canonical Trade Context and surface KS001's canonical acknowledgement
 * (`source.acknowledgement`) before anything reports success. `onSourceChanged` -- the list/Trade Context changed for
 * another reason (removal): a canonical re-read only, never a fabricated reply. Both may be async.
 */
export interface SourceControllerCallbacks {
  onSourceIngested?: (source: AgentSourceArtifactView) => void | Promise<void>;
  onSourceChanged?: () => void | Promise<void>;
}
export interface SourceControllerOptions {
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Poll schedule (ms) while an attempt is still RECEIVED/PROCESSING on the server. */
  pollScheduleMs?: number[];
}
const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const DEFAULT_POLL_SCHEDULE_MS = [1500, 2500, 4000, 6000, 8000, 10000];

export function createSourceController(
    gateway: Pick<AgentGateway, 'createPastedTextSource' | 'uploadSource' | 'listSources' | 'getSource' | 'retrySource' | 'removeSource'> & Partial<Pick<AgentGateway, 'createLinkSource' | 'createPlaceSource'>>,
    ensureConversationId: () => Promise<string>,
    callbacks?: SourceControllerCallbacks,
    options?: SourceControllerOptions,
) {
  const { onSourceIngested, onSourceChanged } = callbacks ?? {};
  const sleep = options?.sleep ?? defaultSleep;
  const pollSchedule = options?.pollScheduleMs ?? DEFAULT_POLL_SCHEDULE_MS;
  let state: SourcesState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<SourcesState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  function upsert(artifact: AgentSourceArtifactView) {
    const withoutExisting = state.sources.filter(s => s.sourceArtifactId !== artifact.sourceArtifactId);
    update({ sources: [...withoutExisting, artifact] });
  }

  /** Classify one returned artifact truthfully, reconciling first if it is still being read. */
  async function settle(conversationId: string, artifact: AgentSourceArtifactView): Promise<SourceActionResult> {
    let current = artifact;
    upsert(current);
    for (let i = 0; sourceOutcome(current) === 'working' && i < pollSchedule.length; i++) {
      update({ phase: 'checking', error: null, errorSourceId: null });
      await sleep(pollSchedule[i]);
      try {
        current = sourceArtifactView(await gateway.getSource(conversationId, current.sourceArtifactId));
        upsert(current);
      } catch (error) {
        if (!isOutcomeUnknown(error)) return fail(sourceIngestionErrorText(error), 'refused', current);
      }
    }
    switch (sourceOutcome(current)) {
      case 'progressed':
      case 'attention':
        await onSourceIngested?.(current);
        update({ phase: 'list-ready', error: null, errorSourceId: null });
        return { ok: true, source: current, attention: sourceOutcome(current) === 'attention' };
      case 'failed':
        return fail(current.failureReason || FAILED_FALLBACK_TEXT, 'failed', current);
      case 'working':
        return fail(STILL_READING_TEXT, 'unknown', current);
      default:
        return fail(FAILED_FALLBACK_TEXT, 'failed', current);
    }
  }

  /** Entry Perfection Phase 9 -- quietly follows a source found still being read (e.g. after a reload). Never re-submits. */
  const resuming = new Set<string>();
  async function resume(conversationId: string, source: AgentSourceArtifactView) {
    if (resuming.has(source.sourceArtifactId)) return;
    resuming.add(source.sourceArtifactId);
    let current = source;
    try {
      for (let i = 0; sourceOutcome(current) === 'working' && i < pollSchedule.length; i++) {
        const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        await sleep(hidden ? pollSchedule[i] * 3 : pollSchedule[i]);
        try {
          current = sourceArtifactView(await gateway.getSource(conversationId, current.sourceArtifactId));
          upsert(current);
        } catch {
          // an unknown read is not a result: keep what we showed and try on the next step
        }
      }
      if (sourceOutcome(current) === 'progressed' || sourceOutcome(current) === 'attention') await onSourceIngested?.(current);
    } finally {
      resuming.delete(source.sourceArtifactId);
    }
  }

  function fail(error: string, outcome: 'failed' | 'refused' | 'unknown', source?: AgentSourceArtifactView): SourceActionResult {
    const shownOnCard = !!source && (sourceOutcome(source) === 'failed' || source.extractionStatus === 'FAILED');
    update({ phase: 'error', error, errorSourceId: shownOnCard ? source!.sourceArtifactId : null });
    return { ok: false, error, outcome, source };
  }

  /**
   * Submit -> classify -> reconcile -> surface, and only then resolve. A request whose outcome is unknown is re-sent
   * ONCE with the same content: the server de-duplicates by content digest (an already-read source comes back as it
   * is; one still being read is polled; one that failed is read again), so this can never add anything twice.
   */
  async function run(call: (conversationId: string) => Promise<Parameters<typeof sourceArtifactView>[0]>, knownConversationId?: string): Promise<SourceActionResult> {
    if (state.phase === 'submitting' || state.phase === 'checking') return { ok: false, error: 'SecurePay is still working on the previous step.', outcome: 'refused' };
    update({ phase: 'submitting', error: null, errorSourceId: null });
    let conversationId: string;
    try {
      conversationId = knownConversationId ?? await ensureConversationId();
    } catch (error) {
      return fail(sourceIngestionErrorText(error), isOutcomeUnknown(error) ? 'unknown' : 'refused');
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const artifact = sourceArtifactView(await call(conversationId));
        return await settle(conversationId, artifact);
      } catch (error) {
        if (!isOutcomeUnknown(error)) return fail(sourceIngestionErrorText(error), 'refused');
        if (attempt === 0) update({ phase: 'checking', error: null, errorSourceId: null });
      }
    }
    return fail(OUTCOME_UNKNOWN_TEXT, 'unknown');
  }

  return {
    getSnapshot: (): SourcesState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Section 39 -- refreshes the list for the CURRENT conversation, once one exists; never creates one. */
    async list(conversationId: string | null) {
      if (!conversationId || state.phase === 'listing') return;
      update({ phase: 'listing', error: null, errorSourceId: null });
      try {
        const response = await gateway.listSources(conversationId);
        const sources = response.sources.map(sourceArtifactView);
        update({ phase: 'list-ready', sources });
        // Entry Perfection Phase 9 -- after a reload a source may still be being read on the server: follow it to its true end
        // (bounded backoff, slower while the tab is hidden) instead of showing "reading" forever or forgetting it.
        for (const source of sources) if (sourceOutcome(source) === 'working') void resume(conversationId, source);
      } catch (error) {
        update({ phase: 'error', error: sourceIngestionErrorText(error), errorSourceId: null });
      }
    },

    /** Section 17 -- "Bring your plan": pasted text is its own first-class source. */
    async addPastedText(text: string, label?: string): Promise<SourceActionResult> {
      if (!text.trim()) return { ok: false, error: 'Nothing to add yet.', outcome: 'refused' };
      return run(conversationId => gateway.createPastedTextSource(conversationId, { text: text.trim(), label }));
    },

    /** Phase 3 (Slice 3B) -- "a link you shared": kept as the words the person typed; never opened. */
    async addLink(url: string, label?: string): Promise<SourceActionResult> {
      if (!gateway.createLinkSource) return { ok: false, error: 'This kind of source isn’t available yet.', outcome: 'refused' };
      if (!url.trim()) return { ok: false, error: 'Nothing to add yet.', outcome: 'refused' };
      const create = gateway.createLinkSource;
      return run(conversationId => create(conversationId, { url: url.trim(), label: label?.trim() || undefined }));
    },

    /** Phase 3 (Slice 3B) -- a place in the person's own words; never a device location or coordinates. */
    async addPlace(text: string): Promise<SourceActionResult> {
      if (!gateway.createPlaceSource) return { ok: false, error: 'This kind of source isn’t available yet.', outcome: 'refused' };
      if (!text.trim()) return { ok: false, error: 'Nothing to add yet.', outcome: 'refused' };
      const create = gateway.createPlaceSource;
      return run(conversationId => create(conversationId, { text: text.trim() }));
    },

    /** Section 6/19/20/65 -- a real upload; resolves only after SecurePay has really received and read (or failed) it. */
    async addUpload(sourceKind: 'DOCUMENT' | 'PHOTO', file: File, label?: string): Promise<SourceActionResult> {
      return run(conversationId => gateway.uploadSource(conversationId, sourceKind, file, label));
    },

    /** Section 33 -- an explicit retry re-reads the SAME source as its next attempt; never a duplicate. */
    async retry(conversationId: string, sourceArtifactId: string): Promise<SourceActionResult> {
      return run(() => gateway.retrySource(conversationId, sourceArtifactId), conversationId);
    },

    /**
     * Removal retires this source's unadopted candidates server-side; `onSourceChanged` (a plain canonical re-read,
     * never a fabricated KS001 reply) is awaited so the change is visible before this resolves.
     */
    async remove(conversationId: string, sourceArtifactId: string) {
      update({ phase: 'submitting', error: null, errorSourceId: null });
      try {
        const artifact = sourceArtifactView(await gateway.removeSource(conversationId, sourceArtifactId));
        upsert(artifact);
        await onSourceChanged?.();
        update({ phase: 'list-ready' });
      } catch (error) {
        update({ phase: 'error', error: sourceIngestionErrorText(error), errorSourceId: null });
      }
    },

    /** Dismiss a shown error without losing any source. */
    clearError() { if (state.phase === 'error') update({ phase: 'list-ready', error: null, errorSourceId: null }); },
    reset() { update({ ...initial }); },
  };
}
export type SourceController = ReturnType<typeof createSourceController>;
