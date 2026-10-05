import { useState } from 'react';
import { BookOpenText, ExternalLink, X } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type {
  InstituteExperienceSourceDto,
  InstitutePublishedSourceDto,
  InstituteSourceDto,
} from '../../api/securepay/institute/dto';

export function instituteAssetId(sourceRef: string): string | null {
  const match = /^ksi:asset:([0-9a-f-]+):v\d+$/i.exec(sourceRef);
  return match?.[1] ?? null;
}

function contributionId(sourceRef: string): string | null {
  return /^community:contribution:([0-9a-f-]+)$/i.exec(sourceRef)?.[1] ?? null;
}

function projectObservationIds(sourceRef: string): { projectId: string; observationId: string } | null {
  const match = /^community:project:([0-9a-f-]+):observation:([0-9a-f-]+)$/i.exec(sourceRef);
  return match ? { projectId: match[1], observationId: match[2] } : null;
}

type FullSource =
  | { kind: 'asset'; data: InstitutePublishedSourceDto }
  | { kind: 'experience'; data: InstituteExperienceSourceDto };

/**
 * Opens the complete authorised source behind a bounded search/AI excerpt.
 * Raw private evidence/storage locators stay in their owning domain.
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
  const communityId = source.sourceType === 'COMMUNITY_CONTRIBUTION' ? contributionId(source.sourceRef) : null;
  const projectIds = source.sourceType === 'PROJECT_OBSERVATION' ? projectObservationIds(source.sourceRef) : null;
  const readable = !!assetId || (!!communityId && authenticated) || !!projectIds;

  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<FullSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!readable) return null;

  async function show() {
    if (busy) return;
    if (full) { setOpen(true); return; }
    setBusy(true); setError(null);
    try {
      let found: FullSource;
      if (assetId) {
        const data = authenticated ? await gateway.readAsset(assetId) : await gateway.publicAsset(assetId);
        found = { kind: 'asset', data };
      } else if (communityId) {
        found = { kind: 'experience', data: await gateway.readCommunityContribution(communityId) };
      } else if (projectIds) {
        const data = authenticated
          ? await gateway.readProjectObservation(projectIds.projectId, projectIds.observationId)
          : await gateway.publicProjectObservation(projectIds.projectId, projectIds.observationId);
        found = { kind: 'experience', data };
      } else {
        return;
      }

      if (found.data.sourceRef !== source.sourceRef) throw new Error('source version changed');
      setFull(found);
      setOpen(true);
    } catch {
      setError('The original source is not available to this viewer.');
    } finally {
      setBusy(false);
    }
  }

  const title = full?.data.title ?? source.title;

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
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/40 p-0 sm:items-center sm:p-6">
          <article className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-cream-200 bg-cream-50 p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-forest-600">Original Skills Institute source</p>
                <h2 className="mt-1 font-display text-2xl text-forest-900">{title}</h2>
                {full.kind === 'asset' ? (
                  <p className="mt-1 text-xs text-sand-500">
                    {full.data.kind.toLowerCase().replace(/_/g, ' ')} · version {full.data.version} · author {full.data.authorCanonicalKsNumber}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-sand-500">
                    {full.data.sourceType === 'COMMUNITY_CONTRIBUTION' ? 'Community experience' : 'Project observation'}
                    {full.data.authorCanonicalKsNumber ? ` · author ${full.data.authorCanonicalKsNumber}` : ''}
                    {full.data.verificationStatus ? ` · ${full.data.verificationStatus.toLowerCase()}` : ''}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close original source" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cream-200 bg-white text-sand-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {full.kind === 'asset' ? (
              <>
                <p className="mt-4 rounded-xl border border-cream-200 bg-white p-3 text-sm leading-relaxed text-sand-700">{full.data.summary}</p>
                {full.data.body && <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-forest-950">{full.data.body}</div>}
                {full.data.mediaReference && (
                  <div className="mt-5 rounded-xl border border-cream-200 bg-white p-3">
                    <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">Attached media/source</p>
                    {/^https?:\/\//i.test(full.data.mediaReference) ? (
                      <a href={full.data.mediaReference} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 break-all text-sm font-medium text-forest-700 underline">
                        Open attached media <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-sand-600">This source has attached media. SecurePay retains its media reference without exposing an internal storage locator here.</p>
                    )}
                  </div>
                )}
                {full.data.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {full.data.tags.map(tag => (
                      <span key={`${tag.type}:${tag.value}`} className="rounded-full border border-cream-200 bg-white px-2 py-1 text-[0.68rem] text-sand-600">
                        {tag.type.toLowerCase()}: {tag.value}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-forest-950">{full.data.body}</div>
                {full.data.amountMinor != null && full.data.currency && (
                  <p className="mt-4 rounded-xl border border-cream-200 bg-white p-3 text-sm text-forest-900">
                    Recorded amount: {full.data.currency} {(full.data.amountMinor / 100).toLocaleString()}
                  </p>
                )}
                {full.data.numericValue != null && (
                  <p className="mt-3 text-sm text-sand-700">Recorded quantity: {full.data.numericValue}{full.data.unit ? ` ${full.data.unit}` : ''}</p>
                )}
                {full.data.occurredOn && <p className="mt-2 text-sm text-sand-700">Recorded date: {full.data.occurredOn}</p>}
                {Object.keys(full.data.attributes).length > 0 && (
                  <dl className="mt-4 grid gap-2 rounded-xl border border-cream-200 bg-white p-4 sm:grid-cols-2">
                    {Object.entries(full.data.attributes).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[0.66rem] uppercase tracking-wide text-sand-500">{key.replace(/[_-]/g, ' ')}</dt>
                        <dd className="mt-0.5 text-sm text-forest-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {full.data.evidenceAttached && (
                  <p className="mt-4 text-[0.72rem] leading-relaxed text-sand-600">
                    Evidence is attached to the originating Project record. Its private storage reference is not exposed through the Institute reader.
                  </p>
                )}
              </>
            )}

            <p className="mt-5 text-[0.68rem] leading-relaxed text-sand-500">
              Source: {full.data.sourceRef}. AI summaries and search excerpts do not replace this original material.
            </p>
          </article>
        </div>
      )}
    </>
  );
}
