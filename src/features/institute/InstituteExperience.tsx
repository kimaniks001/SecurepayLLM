import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstituteLearnResponseDto, InstituteSourceDto } from '../../api/securepay/institute/dto';
import type { AppView } from '../../types';
import { InstituteMyLearning } from './InstituteMyLearning';
import { InstituteTeachStudio } from './InstituteTeachStudio';
import { InstituteMasterSupport } from './InstituteMasterSupport';
import { InstitutePrograms } from './InstitutePrograms';
import { InstituteLiveLearning } from './InstituteLiveLearning';
import { InstituteSourceReader } from './InstituteSourceReader';

function sourceLabel(source: InstituteSourceDto): string {
  if (source.sourceType === 'KNOWLEDGE_CORE') return 'Governed knowledge';
  if (source.sourceType === 'PROJECT_OBSERVATION') {
    if (source.authority === 'PROJECT_VERIFIED') return 'Project-verified observation';
    if (source.authority === 'PROJECT_DISPUTED') return 'Disputed Project observation';
    return 'Reported Project observation';
  }
  if (source.sourceType === 'COMMUNITY_CONTRIBUTION') return 'Community experience';
  return 'Institute material';
}

function SourceCard({ source, gateway }: { source: InstituteSourceDto; gateway: InstituteGateway }) {
  return (
    <article className="rounded-2xl border border-cream-200 bg-white px-4 py-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-wide text-sand-500 font-medium">{sourceLabel(source)}</p>
          <h3 className="mt-1 font-display text-base text-forest-800">{source.title}</h3>
        </div>
        {source.relevance > 0 && <span className="text-[0.65rem] text-forest-600 bg-forest-50 rounded-full px-2 py-1">matched</span>}
      </div>
      <p className="mt-2 text-[0.82rem] leading-relaxed text-sand-700 whitespace-pre-line">{source.excerpt}</p>
      {source.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {source.tags.slice(0, 8).map(tag => (
            <span key={tag} className="rounded-full border border-cream-200 bg-cream-50 px-2 py-0.5 text-[0.68rem] text-sand-600">
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[0.68rem] text-sand-500">{source.provenance}</p>
      <InstituteSourceReader gateway={gateway} source={source} authenticated />
    </article>
  );
}

export function InstituteExperience({
  gateway,
  onNavigate,
  preferredSpaceId,
  onOpenStoreOffer,
}: {
  gateway: InstituteGateway;
  onNavigate: (view: AppView) => void;
  preferredSpaceId?: string | null;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
}) {
  const [mode, setMode] = useState<'learn' | 'my-learning' | 'teach' | 'master-support'>(preferredSpaceId ? 'teach' : 'learn');
  const [query, setQuery] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [featured, setFeatured] = useState<InstituteSourceDto[]>([]);
  const [result, setResult] = useState<InstituteLearnResponseDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void gateway.publicSearch('', [], 8).then(
      sources => { if (!cancelled) { setFeatured(sources); setFeaturedBusy(false); } },
      () => { if (!cancelled) setFeaturedBusy(false); },
    );
    return () => { cancelled = true; };
  }, [gateway]);

  const tags = useMemo(
    () => tagsText.split(',').map(value => value.trim()).filter(Boolean),
    [tagsText],
  );

  const ask = async () => {
    const question = query.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await gateway.learn(question, tags, 12));
    } catch {
      setError('The Institute could not build this learning view just now. Your question is still here — try again.');
    } finally {
      setBusy(false);
    }
  };

  const resultByRef = useMemo(() => {
    const map = new Map<string, InstituteSourceDto>();
    for (const source of result?.sources ?? []) map.set(source.sourceRef, source);
    return map;
  }, [result]);

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="institute" onNavigate={onNavigate} />

      <div className="border-b border-cream-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-2 flex gap-1 overflow-x-auto">
          {([
            ['learn', 'Learn'],
            ['my-learning', 'My Learning'],
            ['teach', 'Teach'],
            ['master-support', 'Master Support'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`min-h-11 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors ${
                mode === value ? 'bg-forest-700 text-white' : 'text-forest-800 hover:bg-cream-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'my-learning' && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <InstituteMyLearning gateway={gateway} />
          </div>
        </main>
      )}

      {mode === 'teach' && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <InstituteTeachStudio gateway={gateway} preferredSpaceId={preferredSpaceId} />
          </div>
        </main>
      )}

      {mode === 'master-support' && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <InstituteMasterSupport gateway={gateway} onOpenStoreOffer={onOpenStoreOffer} />
          </div>
        </main>
      )}

      {mode === 'learn' && <main className="flex-1 overflow-y-auto">
        <section className="border-b border-cream-200/70 bg-cream-50">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-forest-600">
                <BookOpen className="w-5 h-5" />
                <span className="text-[0.72rem] uppercase tracking-[0.16em] font-semibold">Skills Institute</span>
              </div>
              <h1 className="mt-3 font-display text-3xl md:text-4xl text-forest-900 leading-tight">
                What do you want to learn, understand or become capable of?
              </h1>
              <p className="mt-3 text-sm md:text-base text-sand-600 max-w-2xl leading-relaxed">
                The Institute finds the most relevant knowledge, Project experience and Community learning available to you, then builds a path for what you need now.
              </p>

              <div className="mt-6 rounded-2xl border border-forest-100 bg-white shadow-card p-3 md:p-4">
                <label htmlFor="ksi-question" className="sr-only">What do you want to learn?</label>
                <textarea
                  id="ksi-question"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="For example: I want to understand what it would take to renovate my parents' bathroom safely."
                  className="w-full resize-none bg-transparent px-1 py-1 text-[0.95rem] text-forest-900 placeholder:text-sand-400 focus:outline-none"
                />
                <div className="mt-3 flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="ksi-tags" className="text-[0.68rem] uppercase tracking-wide text-sand-500">Optional tags</label>
                    <input
                      id="ksi-tags"
                      value={tagsText}
                      onChange={event => setTagsText(event.target.value)}
                      placeholder="renovation, accessibility, cost"
                      className="mt-1 w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.82rem] text-forest-800 focus:outline-none focus:border-forest-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void ask()}
                    disabled={!query.trim() || busy}
                    className="min-h-11 rounded-xl bg-forest-700 px-5 text-sm font-medium text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {busy ? 'Finding what matters…' : 'Build my learning path'}
                    {!busy && <Sparkles className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-[0.75rem] text-sand-500">
                AI assembles the learning view. The original sources remain underneath it and keep their own authority and provenance.
              </p>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
          {error && (
            <div role="alert" className="rounded-xl border border-ember-200 bg-white px-4 py-3 text-sm text-ember-800">
              {error}
            </div>
          )}

          {!result && (
            <InstitutePrograms
              gateway={gateway}
              onStarted={() => setMode('my-learning')}
              onOpenStoreOffer={onOpenStoreOffer}
            />
          )}

          {!result && <InstituteLiveLearning gateway={gateway} onNavigate={onNavigate} />}

          {result && (
            <section className="space-y-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-wide text-forest-600 font-semibold">Built for this question</p>
                <h2 className="mt-1 font-display text-2xl text-forest-900">What the sources suggest</h2>
              </div>

              {result.status === 'NO_MATCH' ? (
                <div className="rounded-2xl border border-cream-200 bg-white p-5">
                  <p className="text-sm text-sand-700">{result.message}</p>
                </div>
              ) : (
                <>
                  {result.synthesis ? (
                    <div className="rounded-2xl border border-forest-100 bg-white p-5 md:p-6 shadow-soft">
                      <p className="text-[0.95rem] leading-relaxed text-forest-900 whitespace-pre-line">{result.synthesis.answer}</p>
                      {result.synthesis.learningPath.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <p className="text-[0.68rem] uppercase tracking-wide text-sand-500 font-medium">A useful path from here</p>
                          {result.synthesis.learningPath.map((step, index) => (
                            <div key={index} className="rounded-xl border border-cream-200 bg-cream-50/70 px-4 py-3">
                              <div className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-700 text-xs font-semibold text-white">{index + 1}</span>
                                <div>
                                  <p className="text-sm font-medium text-forest-900">{step.label}</p>
                                  <p className="mt-1 text-[0.8rem] leading-relaxed text-sand-600">{step.reason}</p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {step.sourceRefs.map(ref => (
                                      <span key={ref} className="text-[0.65rem] text-forest-600">
                                        {resultByRef.get(ref)?.title ?? 'Source'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {result.synthesis.boundaries.length > 0 && (
                        <div className="mt-5 border-t border-cream-200 pt-4">
                          <p className="text-[0.68rem] uppercase tracking-wide text-sand-500 font-medium">Keep in mind</p>
                          <ul className="mt-2 space-y-1 text-[0.78rem] text-sand-600">
                            {result.synthesis.boundaries.map((boundary, index) => <li key={index}>• {boundary}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-cream-200 bg-white p-5">
                      <p className="text-sm text-sand-700">{result.message}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-forest-600" />
                    <h3 className="font-display text-lg text-forest-900">Sources touching this question</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {result.sources.map(source => <SourceCard key={source.sourceRef} source={source} />)}
                  </div>
                </>
              )}
            </section>
          )}

          {!result && (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-wide text-sand-500 font-medium">Knowledge fabric</p>
                  <h2 className="mt-1 font-display text-2xl text-forest-900">What was done, what was learned</h2>
                </div>
                <button type="button" onClick={() => onNavigate('community')} className="hidden md:inline-flex min-h-11 items-center gap-1 text-sm text-forest-700">
                  See Community <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {featuredBusy ? (
                <p role="status" className="text-sm text-sand-500">Loading knowledge…</p>
              ) : featured.length === 0 ? (
                <div className="rounded-2xl border border-cream-200 bg-white p-6 text-sm text-sand-600">
                  The Institute library is ready. Published knowledge and documented Project learning will appear here as they are created.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {featured.map(source => <SourceCard key={source.sourceRef} source={source} />)}
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-cream-200 bg-cream-50 px-5 py-5">
            <div className="flex gap-3">
              <Search className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-lg text-forest-900">Not a fixed course catalogue</h3>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-sand-600">
                  Material stays rich and sourced. Tags, context and source authority help the Institute pull only what matters to the question. A formal course is one possible arrangement — not the only way to learn.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>}
    </div>
  );
}
