import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Search } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstitutePublicProgramDto, InstitutePublicSessionDto, InstituteSourceDto } from '../../api/securepay/institute/dto';
import type { AppView } from '../../types';

function sourceLabel(source: InstituteSourceDto) {
  if (source.sourceType === 'PROJECT_OBSERVATION') {
    if (source.authority === 'PROJECT_VERIFIED') return 'Project-verified learning';
    if (source.authority === 'PROJECT_DISPUTED') return 'Disputed Project observation';
    return 'Reported Project experience';
  }
  if (source.sourceType === 'COMMUNITY_CONTRIBUTION') return 'Community experience';
  if (source.sourceType === 'KNOWLEDGE_CORE') return 'Governed knowledge';
  return 'Institute material';
}

export function PublicInstituteExperience({
  gateway,
  onNavigate,
  onSignIn,
}: {
  gateway: InstituteGateway;
  onNavigate: (view: AppView) => void;
  onSignIn: () => void;
}) {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<InstituteSourceDto[]>([]);
  const [programs, setPrograms] = useState<InstitutePublicProgramDto[]>([]);
  const [sessions, setSessions] = useState<InstitutePublicSessionDto[]>([]);
  const [busy, setBusy] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    Promise.all([
      gateway.publicSearch('', [], 10),
      gateway.publicPrograms(8),
      gateway.publicSessions(8),
    ]).then(([knowledge, publicPrograms, publicSessions]) => {
      if (cancelled) return;
      setSources(knowledge);
      setPrograms(publicPrograms);
      setSessions(publicSessions);
    }).catch(() => {
      if (!cancelled) setError('The public Institute library could not be loaded just now.');
    }).finally(() => {
      if (!cancelled) setBusy(false);
    });
    return () => { cancelled = true; };
  }, [gateway]);

  const visibleSources = useMemo(() => sources.slice(0, 12), [sources]);

  async function search() {
    setSearching(true);
    setError(null);
    try {
      setSources(await gateway.publicSearch(query.trim(), [], 16));
    } catch {
      setError('The Institute could not search the public knowledge library just now.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="min-h-dvh bg-cream-100">
      <NavBar view="institute" onNavigate={onNavigate} />

      <main>
        <section className="border-b border-cream-200 bg-cream-50">
          <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-forest-600">
                <BookOpen className="h-5 w-5" />
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">Skills Institute</span>
              </div>
              <h1 className="mt-3 font-display text-3xl leading-tight text-forest-900 md:text-4xl">
                Learn from what people have actually done.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sand-600 md:text-base">
                Explore public guides, Project learning, talks and programmes. Sources keep their provenance — the Institute does not turn every experience into universal truth.
              </p>

              <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-forest-100 bg-white p-3 shadow-card sm:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-sand-400" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter') void search(); }}
                    placeholder="What are you trying to understand?"
                    className="min-h-11 w-full rounded-xl border border-cream-200 bg-cream-50 pl-9 pr-3 text-sm text-forest-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void search()}
                  disabled={searching}
                  className="min-h-11 rounded-xl bg-forest-700 px-5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {searching ? 'Searching…' : 'Search knowledge'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={onSignIn} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-600 px-4 text-sm font-medium text-white">
                  Build a personal learning path <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-sand-500">Sign in is only needed for personalised learning, participation and teaching.</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 md:px-6">
          {error && <div role="alert" className="rounded-xl border border-ember-200 bg-white px-4 py-3 text-sm text-ember-800">{error}</div>}
          {busy && <p role="status" className="text-sm text-sand-500">Loading public Institute knowledge…</p>}

          {!busy && (
            <section>
              <p className="text-[0.68rem] font-medium uppercase tracking-wide text-sand-500">Public knowledge</p>
              <h2 className="mt-1 font-display text-2xl text-forest-900">What was done, what was learned</h2>
              {visibleSources.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-cream-200 bg-white p-6 text-sm text-sand-600">
                  No public source matched this search yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {visibleSources.map(source => (
                    <article key={source.sourceRef} className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
                      <p className="text-[0.66rem] font-medium uppercase tracking-wide text-sand-500">{sourceLabel(source)}</p>
                      <h3 className="mt-1 font-display text-lg text-forest-900">{source.title}</h3>
                      <p className="mt-2 text-[0.8rem] leading-relaxed text-sand-700 whitespace-pre-line">{source.excerpt}</p>
                      {source.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {source.tags.slice(0, 8).map(tag => <span key={tag} className="rounded-full border border-cream-200 bg-cream-50 px-2 py-0.5 text-[0.66rem] text-sand-600">{tag}</span>)}
                        </div>
                      )}
                      <p className="mt-3 text-[0.66rem] text-sand-500">{source.provenance}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {programs.length > 0 && (
            <section>
              <p className="text-[0.68rem] font-medium uppercase tracking-wide text-sand-500">Structured learning</p>
              <h2 className="mt-1 font-display text-2xl text-forest-900">Public programmes</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {programs.map(program => (
                  <article key={program.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                    <h3 className="font-display text-lg text-forest-900">{program.title}</h3>
                    <p className="mt-1 text-[0.8rem] text-sand-600">{program.purpose}</p>
                    <p className="mt-3 text-[0.68rem] uppercase tracking-wide text-forest-600">{program.accessMode.toLowerCase()}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {sessions.length > 0 && (
            <section>
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-forest-600" /><p className="text-[0.68rem] font-medium uppercase tracking-wide text-sand-500">Live knowledge</p></div>
              <h2 className="mt-1 font-display text-2xl text-forest-900">Talks, workshops, podcasts and sessions</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sessions.map(session => (
                  <article key={session.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                    <p className="text-[0.66rem] uppercase tracking-wide text-forest-600">{session.kind.replace(/_/g, ' ').toLowerCase()}</p>
                    <h3 className="mt-1 font-display text-lg text-forest-900">{session.title}</h3>
                    <p className="mt-1 text-[0.8rem] text-sand-600">{session.description}</p>
                    <p className="mt-3 text-[0.7rem] text-sand-500">{new Date(session.startsAt).toLocaleString()} · {session.accessMode.toLowerCase()}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-forest-100 bg-forest-50/60 p-5">
            <h2 className="font-display text-xl text-forest-900">Useful before promotional</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sand-700">
              Outreach can point here to real, attributable knowledge instead of manufacturing claims. A Project story stays a Project story; Master guidance stays Master guidance; public learning stays linked to its source.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
