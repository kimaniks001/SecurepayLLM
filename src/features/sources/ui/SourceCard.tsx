import { FileText, RefreshCw, X } from 'lucide-react';
import type { AgentSourceArtifactView } from '../controller';

const KIND_LABEL: Record<string, string> = { PASTED_TEXT: 'Pasted plan', DOCUMENT: 'Document', PHOTO: 'Photo' };

/**
 * KS001 Upgrade Phase 3 (Section 41) -- a calm, first-class source card. Never exposes provider JSON,
 * confidence decimals, internal entity ids, or model names -- only the bounded, safe projection the
 * backend already returns (originalName/label/documentType/summary/uncertainties/status).
 */
export function SourceCard({ source, onRetry, onRemove, busy, factCount }: {
  source: AgentSourceArtifactView;
  onRetry: () => void;
  onRemove: () => void;
  busy: boolean;
  /**
   * KS001 Upgrade Phase 3 completion correction (item 9) -- how many BUILD rows currently trace back to
   * THIS exact source (computed live by the caller from the workbench's own `item.source.sourceArtifactId`
   * -- see AgentExperience -- never a stale count captured only at ingestion time, so it stays honest
   * after an adoption/correction/removal changes what is actually still attributed to this source).
   * Omitted (not shown) rather than a fabricated 0 when the caller cannot compute it yet.
   */
  factCount?: number;
}) {
  if (source.extractionStatus === 'REMOVED') return null;
  const title = source.originalName || KIND_LABEL[source.sourceKind] || 'Source';
  const isReadable = source.extractionStatus === 'READY' || source.extractionStatus === 'PARTIAL';
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/80 shadow-soft px-4 py-3 space-y-1.5 animate-fade-in-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-forest-500 shrink-0" aria-hidden="true" />
          <span className="text-[0.85rem] font-medium text-forest-800 truncate">{title}</span>
          {source.documentType && <span className="text-[0.7rem] text-sand-500 shrink-0">· {source.documentType}</span>}
        </div>
        <button
          type="button" disabled={busy} onClick={onRemove} aria-label={`Remove ${title}`}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sand-400 hover:text-ember-700 hover:bg-ember-50 disabled:opacity-40"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {source.extractionStatus === 'RECEIVED' || source.extractionStatus === 'PROCESSING' ? (
        <p className="text-[0.8rem] text-sand-500">Reading this into BUILD…</p>
      ) : source.extractionStatus === 'FAILED' ? (
        <div className="space-y-1.5">
          <p className="text-[0.8rem] text-ember-700">{source.failureReason || 'SecurePay couldn’t read this yet.'}</p>
          <button type="button" disabled={busy} onClick={onRetry} className="inline-flex items-center gap-1 text-[0.78rem] text-forest-700 underline disabled:opacity-40">
            <RefreshCw className="w-3 h-3" aria-hidden="true" />Try again
          </button>
        </div>
      ) : (
        <>
          {source.summary && <p className="text-[0.82rem] text-forest-700 leading-snug">{source.summary}</p>}
          {/* KS001 Upgrade Phase 3 completion correction (item 9) -- "N useful detail(s) added to BUILD /
              N thing(s) need clarification," a bounded summary of REAL counts, never a debug screen. The
              workbench itself remains primary; this card only says how much and points there. */}
          {isReadable && (typeof factCount === 'number' || source.uncertainties.length > 0) && (
            <p className="text-[0.78rem] text-sand-600">
              {typeof factCount === 'number' && (factCount > 0
                ? `${factCount} useful ${factCount === 1 ? 'detail' : 'details'} added to BUILD`
                : 'Nothing from this reached BUILD yet')}
              {typeof factCount === 'number' && source.uncertainties.length > 0 ? ' · ' : ''}
              {source.uncertainties.length > 0
                ? `${source.uncertainties.length} ${source.uncertainties.length === 1 ? 'thing needs' : 'things need'} clarification`
                : ''}
            </p>
          )}
          {source.uncertainties.length > 0 && (
            <div className="pt-1">
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Needs clarification</p>
              <ul className="mt-0.5 space-y-0.5">
                {source.uncertainties.map((uncertainty, i) => (
                  <li key={i} className="text-[0.8rem] text-sand-600">{uncertainty}</li>
                ))}
              </ul>
            </div>
          )}
          {source.extractionStatus === 'PARTIAL' && source.uncertainties.length === 0 && (
            <p className="text-[0.78rem] text-sand-500">Some of this could not be reliably read.</p>
          )}
        </>
      )}
    </div>
  );
}

export function SourcesList({ sources, busy, onRetry, onRemove, factCountsBySourceId }: {
  sources: AgentSourceArtifactView[];
  busy: boolean;
  onRetry: (sourceArtifactId: string) => void;
  onRemove: (sourceArtifactId: string) => void;
  /** KS001 Upgrade Phase 3 completion correction (item 9) -- see SourceCard's own `factCount` doctrine. */
  factCountsBySourceId?: Record<string, number>;
}) {
  const visible = sources.filter(source => source.extractionStatus !== 'REMOVED');
  if (visible.length === 0) return null;
  return (
    <div className="space-y-2">
      {visible.map(source => (
        <SourceCard
          key={source.sourceArtifactId} source={source} busy={busy}
          onRetry={() => onRetry(source.sourceArtifactId)}
          onRemove={() => onRemove(source.sourceArtifactId)}
          factCount={factCountsBySourceId?.[source.sourceArtifactId]}
        />
      ))}
    </div>
  );
}
