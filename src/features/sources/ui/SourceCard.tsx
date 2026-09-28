import { FileSpreadsheet, FileText, Image, Link2, MapPin, Mic, RefreshCw, X } from 'lucide-react';
import type { AgentSourceArtifactView } from '../controller';
import { SPREADSHEET_MEDIA_TYPE, sourceKindNote, sourceStatusText } from '../presentation';

const KIND_LABEL: Record<string, string> = {
  PASTED_TEXT: 'Pasted text', DOCUMENT: 'Document', PHOTO: 'Photo', LINK: 'Link you shared', PLACE: 'Place', AUDIO: 'Voice note',
};



function KindIcon({ source }: { source: AgentSourceArtifactView }) {
  const className = 'w-3.5 h-3.5 text-forest-500 shrink-0';
  if (source.sourceKind === 'LINK') return <Link2 className={className} aria-hidden="true" />;
  if (source.sourceKind === 'PLACE') return <MapPin className={className} aria-hidden="true" />;
  if (source.sourceKind === 'PHOTO') return <Image className={className} aria-hidden="true" />;
  if (source.sourceKind === 'AUDIO') return <Mic className={className} aria-hidden="true" />;
  if (source.mediaType === SPREADSHEET_MEDIA_TYPE) return <FileSpreadsheet className={className} aria-hidden="true" />;
  return <FileText className={className} aria-hidden="true" />;
}

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
  const declared = source.sourceKind === 'LINK' || source.sourceKind === 'PLACE';
  const kindLabel = source.mediaType === SPREADSHEET_MEDIA_TYPE ? 'Spreadsheet' : KIND_LABEL[source.sourceKind];
  const title = declared
    ? (source.label || (source.sourceKind === 'PLACE' ? source.declaredText : '') || kindLabel || 'Source')
    : (source.originalName || source.label || kindLabel || 'Source');
  const note = sourceKindNote(source);
  const statusText = sourceStatusText(source);
  const isReadable = source.extractionStatus === 'READY' || source.extractionStatus === 'PARTIAL';
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/80 shadow-soft px-4 py-3 space-y-1.5 animate-fade-in-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <KindIcon source={source} />
          <span className="text-[0.85rem] font-medium text-forest-800 truncate">{title}</span>
          {source.documentType && <span className="text-[0.7rem] text-sand-600 shrink-0">· {source.documentType}</span>}
        </div>
        <button
          type="button" disabled={busy} onClick={onRemove} aria-label={`Remove ${title}`}
          className="shrink-0 w-11 h-11 -mr-3 -mt-3 -mb-2 rounded-full flex items-center justify-center text-sand-500 hover:text-ember-700 hover:bg-ember-50 disabled:opacity-40"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* A link is shown as plain text, never a clickable anchor: SecurePay has not checked where it goes. */}
      {source.sourceKind === 'LINK' && source.declaredText && (
        <p className="text-[0.78rem] text-forest-700 break-all" data-declared-link>{source.declaredText}</p>
      )}
      {note && <p className="text-[0.75rem] text-sand-600">{note}</p>}
      {statusText && source.extractionStatus !== 'PROCESSING' && source.extractionStatus !== 'RECEIVED' && (
        <p className="text-[0.72rem] font-medium text-forest-600" data-source-state>{statusText}</p>
      )}

      {/* Entry Perfection Phase 9 -- a stalled read (e.g. a restart) is the recoverable-failure branch, never "reading" forever. */}
      {(source.extractionStatus === 'RECEIVED' || source.extractionStatus === 'PROCESSING') && !source.stalled ? (
        <p className="text-[0.8rem] text-sand-600" data-source-state role="status">{statusText}</p>
      ) : source.extractionStatus === 'FAILED' || source.stalled ? (
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
                ? `${factCount} ${factCount === 1 ? 'detail' : 'details'} found to check`
                : 'Nothing useful found in this yet')}
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
