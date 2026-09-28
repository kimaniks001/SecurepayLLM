import type { AgentSourceArtifactView } from '../../api/securepay/agent/adapters';

/** Public Experience Convergence Phase 3 -- presentation helpers shared by the source UI. */
export const SPREADSHEET_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type DeclaredSourceKind = 'link' | 'place';

/**
 * Entry Perfection Phase 2 -- the ONE shared meaning of every backend source status, so no surface reinvents it:
 *  - 'progressed' READY: usable candidate understanding exists.
 *  - 'attention'  PARTIAL, or READY with open uncertainties: usable work exists AND something needs the person.
 *  - 'failed'     FAILED: this attempt produced nothing usable. Never shown as success; always offers Try again.
 *  - 'working'    RECEIVED/PROCESSING: not finished. Never "done". (The pipeline is synchronous, so the UI normally only
 *                 sees this when reconciling an interrupted request; see the controller's 'checking' phase.)
 *  - 'inactive'   REMOVED: no longer current evidence.
 */
export type SourceOutcome = 'progressed' | 'attention' | 'failed' | 'working' | 'inactive';
export function sourceOutcome(source: Pick<AgentSourceArtifactView, 'extractionStatus' | 'uncertainties'> & { stalled?: boolean }): SourceOutcome {
  // Entry Perfection Phase 9 -- a stalled read is a recoverable failure (Try again), never "still reading" forever.
  if (source.stalled && (source.extractionStatus === 'RECEIVED' || source.extractionStatus === 'PROCESSING')) return 'failed';
  switch (source.extractionStatus) {
    case 'READY': return source.uncertainties.length > 0 ? 'attention' : 'progressed';
    case 'PARTIAL': return 'attention';
    case 'RECEIVED':
    case 'PROCESSING': return 'working';
    case 'REMOVED': return 'inactive';
    default: return 'failed';
  }
}

/** Public Experience Convergence Phase 3 -- what each kind honestly is, in one quiet line. */
export function sourceKindNote(source: AgentSourceArtifactView): string | null {
  if (source.sourceKind === 'LINK') return 'Kept as the link you shared. SecurePay doesn’t open links.';
  if (source.sourceKind === 'PLACE') return 'In your words. SecurePay doesn’t look up locations.';
  if (source.mediaType === SPREADSHEET_MEDIA_TYPE) return 'Values only — formulas and formatting are not read.';
  return null;
}

/** Human states only -- never a raw extraction status. FAILED/REMOVED have no status line: the card itself says. */
export function sourceStatusText(source: Pick<AgentSourceArtifactView, 'extractionStatus'> & { stalled?: boolean }): string | null {
  if (source.stalled) return null;
  switch (source.extractionStatus) {
    case 'RECEIVED': return 'Received — reading next';
    case 'PROCESSING': return 'Reading this…';
    case 'READY': return 'Read — suggestions to check';
    case 'PARTIAL': return 'Partly read — suggestions to check';
    default: return null;
  }
}

/** Client-side hint only; the server is the authority and re-validates everything. */
export function declaredSourceProblem(kind: DeclaredSourceKind, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (kind === 'link') {
    if (!/^https?:\/\/\S+$/i.test(trimmed)) return 'Paste a web address that starts with http:// or https://.';
    if (trimmed.length > 2048) return 'This link is too long.';
  } else if (trimmed.length > 300) {
    return 'Keep the place to a short description.';
  }
  return null;
}
