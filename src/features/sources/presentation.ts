import type { AgentSourceArtifactView } from './controller';

/** Public Experience Convergence Phase 3 -- presentation helpers shared by the source UI. */
export const SPREADSHEET_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type DeclaredSourceKind = 'link' | 'place';

/** Public Experience Convergence Phase 3 -- what each kind honestly is, in one quiet line. */
export function sourceKindNote(source: AgentSourceArtifactView): string | null {
  if (source.sourceKind === 'LINK') return 'Kept as the link you shared. SecurePay doesn’t open links.';
  if (source.sourceKind === 'PLACE') return 'In your words. SecurePay doesn’t look up locations.';
  if (source.mediaType === SPREADSHEET_MEDIA_TYPE) return 'Values only — formulas and formatting are not read.';
  return null;
}

/** Human states only -- never a raw extraction status. */
export function sourceStatusText(source: AgentSourceArtifactView): string | null {
  switch (source.extractionStatus) {
    case 'RECEIVED': return 'Received';
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
