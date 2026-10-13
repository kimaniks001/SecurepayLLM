import { useState } from 'react';
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
export function SourceCard({ source, onRetry, onRemove, onStartFresh, onInterpretPhoto, previewUrl, busy, factCount }: {
  source: AgentSourceArtifactView;
  onRetry: () => void;
  onRemove: () => void;
  onInterpretPhoto?: (intent: 'confirm' | 'correct' | 'keep' | 'bill') => void;
  previewUrl?: string;
  /**
   * User-Ready Beta Gate 1 (EP-CERT-015) -- offered on a FAILED card only where it genuinely fits (e.g. the failed source is
   * the only thing in this conversation). A failure never blocks chatting, adding another source or + New.
   */
  onStartFresh?: () => void;
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
  const failed = source.extractionStatus === 'FAILED' || !!source.stalled;
  const [photoOpen, setPhotoOpen] = useState(false);
  const isPhoto = source.sourceKind === 'PHOTO';
  const isDocument = source.sourceKind === 'DOCUMENT' || source.mediaType === SPREADSHEET_MEDIA_TYPE;
  return (
    <div className={`${failed ? 'surface-decision' : isDocument ? 'rounded-2xl border-2 border-forest-200 bg-white shadow-soft' : 'rounded-2xl border border-cream-200 bg-white/80 shadow-soft'} px-4 py-3 space-y-1.5 animate-fade-in-up`} data-source-card={failed ? 'failed' : undefined} data-important-document={isDocument || undefined}>
      {isDocument && <div className="flex items-center justify-between gap-2 pb-1"><p className="text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-forest-700">Document you provided</p><span className="text-[0.68rem] text-sand-600">Source material · Not yet agreed</span></div>}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <KindIcon source={source} />
          <span className={`${isDocument ? "text-[1rem] font-semibold break-words" : "text-[0.85rem] font-medium truncate"} text-forest-800`}>{title}</span>
          {source.documentType && <span className="text-[0.7rem] text-sand-600 shrink-0">· {source.documentType}</span>}
        </div>
        {!failed && <button
          type="button" disabled={busy} onClick={onRemove} aria-label={`Remove ${title}`}
          className="shrink-0 w-11 h-11 -mr-3 -mt-3 -mb-2 rounded-full flex items-center justify-center text-sand-500 hover:text-ember-700 hover:bg-ember-50 disabled:opacity-40"
        >
          <X className="w-3.5 h-3.5" />
        </button>}
      </div>
      {/* A link is shown as plain text, never a clickable anchor: SecurePay has not checked where it goes. */}
      {source.sourceKind === 'LINK' && source.declaredText && (
        <p className="text-[0.78rem] text-forest-700 break-all" data-declared-link>{source.declaredText}</p>
      )}
      {isPhoto && previewUrl && <><button type="button" onClick={() => setPhotoOpen(true)} aria-label={`View full photograph ${title}`} className="block w-full overflow-hidden rounded-xl border border-forest-100"><img src={previewUrl} alt={`Original uploaded photo: ${title}`} className="max-h-72 w-full object-contain bg-cream-50" /></button><p className="text-xs text-sand-600">Tap the photograph to enlarge. This preview is available only in the current browser session.</p></>}
      {isPhoto && photoOpen && previewUrl && <div role="dialog" aria-modal="true" aria-label={`Full photograph ${title}`} className="fixed inset-0 z-[100] flex flex-col bg-black/90 p-4"><button type="button" onClick={() => setPhotoOpen(false)} className="self-end rounded-full bg-white px-5 py-3 text-sm font-semibold text-forest-900">Close photo</button><img src={previewUrl} alt={`Full uploaded photo: ${title}`} className="min-h-0 flex-1 object-contain" /></div>}
      {isPhoto && <div className="space-y-2 rounded-xl border border-forest-100 bg-cream-50/50 p-3" data-photo-intelligence>
        <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">Photo you shared</p>
        <p className="text-sm text-forest-800">{failed ? 'This photo could not be understood reliably.' : isReadable ? 'Here is what SecurePay could understand from the photo. Is that right?' : 'SecurePay is looking at your photo. Please wait for what it finds.'}</p>
        {isReadable && <div className="space-y-2">
          <p className="text-sm leading-6 text-forest-800">{source.summary || 'No reliable description was returned. You can explain what the photo shows.'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !source.summary} onClick={() => onInterpretPhoto?.('confirm')} className="min-h-11 rounded-full bg-forest-700 px-4 text-sm font-semibold text-white disabled:opacity-40">Yes, that’s right</button>
            <button type="button" disabled={busy} onClick={() => onInterpretPhoto?.('correct')} className="min-h-11 rounded-full border border-forest-200 px-4 text-sm text-forest-800">Correct it</button>
            <button type="button" disabled={busy} onClick={() => onInterpretPhoto?.('keep')} className="min-h-11 rounded-full border border-forest-200 px-4 text-sm text-forest-800">Just keep photo</button>
            <button type="button" disabled={busy} onClick={() => onInterpretPhoto?.('bill')} className="min-h-11 rounded-full border border-forest-200 px-4 text-sm text-forest-800">Organise bill or receipt</button>
          </div>
          <p className="text-xs text-sand-600">Confirming a description does not accept a delivery, prove completion or authorise payment.</p>
        </div>}
      </div>}
      {isDocument && <p className="text-[0.78rem] leading-5 text-forest-800">{failed ? 'This document could not be read reliably. Its contents must not be assumed.' : isReadable ? 'SecurePay has read this document. Check the details below before relying on them in your Agreement.' : 'SecurePay is receiving and reading your document. Its contents have not yet been confirmed.'}</p>}
      {note && <p className="text-[0.75rem] text-sand-600">{note}</p>}
      {statusText && source.extractionStatus !== 'PROCESSING' && source.extractionStatus !== 'RECEIVED' && (
        <p className="text-[0.72rem] font-medium text-forest-600" data-source-state>{statusText}</p>
      )}

      {/* Entry Perfection Phase 9 -- a stalled read (e.g. a restart) is the recoverable-failure branch, never "reading" forever. */}
      {(source.extractionStatus === 'RECEIVED' || source.extractionStatus === 'PROCESSING') && !source.stalled ? (
        <p className="text-[0.8rem] text-sand-600" data-source-state role="status">{statusText}</p>
      ) : failed ? (
        <div className="space-y-1">
          {/* EP-CERT-014 -- said ONCE, here, where the actions are (the page does not repeat it). */}
          <p role="alert" className="text-[0.82rem] text-ember-800">{source.failureReason || 'SecurePay couldn’t read this yet.'}</p>
          <p className="text-[0.78rem] text-sand-700">You can keep talking or add something else meanwhile.</p>
          {/* EP-CERT-015 -- a clear way forward AND a clear way out, never only Retry. */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 pt-0.5" role="group" aria-label={`What to do with ${title}`}>
            <button type="button" disabled={busy} onClick={onRetry} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-medium text-forest-700 hover:bg-forest-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />Try again
            </button>
            <button type="button" disabled={busy} onClick={onRemove} aria-label={`Remove ${title}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-medium text-sand-700 hover:bg-cream-100 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              <X className="w-3.5 h-3.5" aria-hidden="true" />Remove
            </button>
            {onStartFresh && <button type="button" onClick={onStartFresh} className="inline-flex min-h-11 items-center rounded-full px-3 text-[0.82rem] font-medium text-sand-700 hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              Start fresh
            </button>}
          </div>
        </div>
      ) : (
        <>
          {isDocument && isReadable && <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-forest-700">What SecurePay understood</p>}
          {source.summary && <p className={`${isDocument ? 'text-[0.9rem] leading-6' : 'text-[0.82rem] leading-snug'} text-forest-700`}>{source.summary}</p>}
          {isDocument && isReadable && !source.summary && <p className="text-sm text-sand-600">No readable summary is available yet. Review the Agreement details carefully.</p>}
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
          {isDocument && isReadable && <p className="text-xs text-sand-600">Only details actually extracted from this document should be attributed to it. Check names, dates and amounts against the original.</p>}
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

export function SourcesList({ sources, busy, onRetry, onRemove, onStartFresh, onInterpretPhoto, photoPreviews, factCountsBySourceId }: {
  sources: AgentSourceArtifactView[];
  busy: boolean;
  onRetry: (sourceArtifactId: string) => void;
  onRemove: (sourceArtifactId: string) => void;
  onInterpretPhoto?: (source: AgentSourceArtifactView, intent: 'confirm' | 'correct' | 'keep' | 'bill') => void;
  photoPreviews?: Record<string, string>;
  /** Offered on failed cards only when the caller judges it fits (see SourceCard). */
  onStartFresh?: () => void;
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
          onInterpretPhoto={intent => onInterpretPhoto?.(source, intent)}
          previewUrl={photoPreviews?.[source.sourceArtifactId]}
          onStartFresh={onStartFresh}
          factCount={factCountsBySourceId?.[source.sourceArtifactId]}
        />
      ))}
    </div>
  );
}
