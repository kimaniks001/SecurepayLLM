import { useState } from 'react';
import { BookOpenText, ExternalLink, X } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstitutePublishedSourceDto, InstituteSourceDto } from '../../api/securepay/institute/dto';

export function instituteAssetId(sourceRef: string): string | null {
  const match = /^ksi:asset:([0-9a-f-]+):v\d+$/i.exec(sourceRef);
  return match?.[1] ?? null;
}

/**
 * Opens the complete published Institute source behind a bounded search/AI excerpt.
 * Other source classes keep their own domain-specific provenance until a dedicated safe reader exists.
 */
export function InstituteSourceReader({
  gateway,
  source,
  authenticated,
}: {
  gateway: InstituteGateway;
  source: InstituteSourceDto;
  authenticated: boolean;
}) {
  const assetId = source.sourceType === 'LEARNING_ASSET' ? instituteAssetId(source.sourceRef) : null;
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<InstitutePublishedSourceDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!assetId) return null;

  async function show() {
    if (busy) return;
    if (full) { setOpen(true); return; }
    setBusy(true); setError(null);
    try {
      const found = authenticated ? await gateway.readAsset(assetId!) : await gateway.publicAsset(assetId!);
      setFull(found);
      setOpen(true);
    } catch {
      setError('The original source is not available to this viewer.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void show()}
        disabled={busy}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-forest-200 px-3 text-[0.72rem] font-medium text-forest-800 disabled:opacity-50"
      >
        <BookOpenText className="h-4 w-4" />
        {busy ? 'Opening…' : 'Open original source'}
      </button>
      {error && <p className="mt-2 text-[0.68rem] text-ember-700">{error}</p>}

      {open && full && (
        <div role="dialog" aria-modal="true" aria-label={full.title} className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/40 p-0 sm:items-center sm:p-6">
          <article className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-cream-200 bg-cream-50 p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-forest-600">Original Skills Institute source</p>
                <h2 className="mt-1 font-display text-2xl text-forest-900">{full.title}</h2>
                <p className="mt-1 text-xs text-sand-500">
                  {full.kind.toLowerCase().replace(/_/g, ' ')} · version {full.version} · author {full.authorCanonicalKsNumber}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close original source" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cream-200 bg-white text-sand-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 rounded-xl border border-cream-200 bg-white p-3 text-sm leading-relaxed text-sand-700">{full.summary}</p>

            {full.body && (
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-forest-950">
                {full.body}
              </div>
            )}

            {full.mediaReference && (
              <div className="mt-5 rounded-xl border border-cream-200 bg-white p-3">
                <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">Attached media/source</p>
                {/^https?:\/\//i.test(full.mediaReference) ? (
                  <a href={full.mediaReference} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 break-all text-sm font-medium text-forest-700 underline">
                    Open attached media <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-sand-600">This source has attached media. SecurePay retains its media reference without exposing an internal storage locator here.</p>
                )}
              </div>
            )}

            {full.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {full.tags.map(tag => (
                  <span key={`${tag.type}:${tag.value}`} className="rounded-full border border-cream-200 bg-white px-2 py-1 text-[0.68rem] text-sand-600">
                    {tag.type.toLowerCase()}: {tag.value}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-5 text-[0.68rem] leading-relaxed text-sand-500">
              This is the complete published Institute material for source {full.sourceRef}. AI summaries and search excerpts do not replace it.
            </p>
          </article>
        </div>
      )}
    </>
  );
}
