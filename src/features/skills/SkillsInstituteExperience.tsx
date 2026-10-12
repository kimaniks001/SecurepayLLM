import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { SessionStore } from '../../api/securepay/session';
import type { SkillsInstituteGateway } from '../../api/securepay/skills-institute';
import type { SkillsLearnResponse, SkillsParticipation, SkillsSource } from '../../api/securepay/skills-institute/dto';
import type { AppView } from '../../types';

type Load<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'error'; message: string };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'SecurePay could not check that right now.';
}

export function SkillsInstituteExperience({ gateway, session, onLeave, onNavigate }: {
  gateway: SkillsInstituteGateway;
  session: SessionStore;
  onLeave: () => void;
  onNavigate?: (view: AppView) => void;
}) {
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const signedIn = sessionState.status === 'signed-in';
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<Load<SkillsSource[]>>({ state: 'loading' });
  const [learning, setLearning] = useState<Load<SkillsLearnResponse> | null>(null);
  const [participations, setParticipations] = useState<Load<SkillsParticipation[]>>({ state: signedIn ? 'loading' : 'ready', value: [] } as Load<SkillsParticipation[]>);

  const search = (value: string) => {
    setSources({ state: 'loading' });
    void gateway.publicSearch(value, 10).then(
      result => setSources({ state: 'ready', value: result }),
      error => setSources({ state: 'error', message: errorText(error) }),
    );
  };

  useEffect(() => { search(''); }, []); // public browsing is read-only; no model/provider call.

  useEffect(() => {
    if (!signedIn) {
      setParticipations({ state: 'ready', value: [] });
      return;
    }
    setParticipations({ state: 'loading' });
    void gateway.mine().then(
      value => setParticipations({ state: 'ready', value }),
      error => setParticipations({ state: 'error', message: errorText(error) }),
    );
  }, [gateway, signedIn]);

  const askInstitute = () => {
    const question = query.trim();
    if (!question || !signedIn) return;
    setLearning({ state: 'loading' });
    void gateway.learn(question, [], 10).then(
      value => setLearning({ state: 'ready', value }),
      error => setLearning({ state: 'error', message: errorText(error) }),
    );
  };

  return (
    <div className="min-h-dvh bg-cream-100">
      <NavBar view="skills" onNavigate={view => onNavigate?.(view)} />
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6" data-skills-institute>
        <button type="button" onClick={onLeave} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <section className="sp-hero px-5 py-5 md:px-7 md:py-6">
          <div className="sp-kicker">Skills Institute</div>
          <h1 className="sp-display mt-2 text-3xl text-forest-900 md:text-4xl">What do you want to become better at?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-600">
            Find authorised learning sources and continue real Institute participation. Learning here never silently grants a Plug, Master, licence or commercial capability.
          </p>

          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') search(query.trim()); }}
              placeholder="e.g. review delivery evidence"
              aria-label="What do you want to become better at?"
              className="min-h-11 w-full rounded-xl border border-cream-200 bg-white pl-10 pr-3 text-sm text-forest-900 outline-none focus:border-forest-400"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => search(query.trim())} className="min-h-11 rounded-full bg-forest-700 px-4 text-sm font-medium text-white">Find learning</button>
            {signedIn && <button type="button" disabled={!query.trim()} onClick={askInstitute} className="min-h-11 rounded-full border border-forest-200 bg-white px-4 text-sm font-medium text-forest-700 disabled:opacity-40">Work it through</button>}
          </div>
          {!signedIn && <p className="mt-2 text-xs text-sand-500">Public learning can be browsed now. Sign in only when you want member learning or your own participation record.</p>}
        </section>

        {learning?.state === 'loading' && <p role="status" className="mt-5 text-sm text-sand-600">SecurePay is working through authorised Institute sources…</p>}
        {learning?.state === 'error' && <StatusNotice tone="warning">{learning.message}</StatusNotice>}
        {learning?.state === 'ready' && (
          <section className="mt-5 rounded-2xl border border-forest-200 bg-white p-5" aria-label="Learning response">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">What matters now</div>
            <h2 className="mt-1 font-display text-xl text-forest-900">{learning.value.synthesis?.answer ?? learning.value.message}</h2>
            {learning.value.synthesis?.learningPath?.length ? (
              <div className="mt-4 space-y-2">
                {learning.value.synthesis.learningPath.map((step, index) => (
                  <div key={index} className="rounded-xl bg-cream-50 px-4 py-3">
                    <div className="text-sm font-medium text-forest-900">{step.label}</div>
                    <p className="mt-1 text-xs leading-5 text-sand-600">{step.reason}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {learning.value.synthesis?.boundaries?.length ? (
              <details className="mt-4 border-t border-cream-200 pt-3">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-forest-800">Learning boundaries</summary>
                <ul className="space-y-1 text-xs text-sand-600">
                  {learning.value.synthesis.boundaries.map((boundary, index) => <li key={index}>• {boundary}</li>)}
                </ul>
              </details>
            ) : null}
          </section>
        )}

        <section className="mt-5" aria-label="Learning sources">
          <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">Learning you can inspect</div>
          {sources.state === 'loading' && <p role="status" className="text-sm text-sand-600">Checking Institute sources…</p>}
          {sources.state === 'error' && <StatusNotice tone="warning">{sources.message}</StatusNotice>}
          {sources.state === 'ready' && sources.value.length === 0 && (
            <div className="rounded-2xl border border-cream-200 bg-white p-5 text-sm text-sand-600">No authorised Institute source matches this yet.</div>
          )}
          {sources.state === 'ready' && sources.value.length > 0 && (
            <div className="space-y-2">
              {sources.value.map(source => (
                <article key={source.sourceRef} className="rounded-2xl border border-cream-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" />
                    <div className="min-w-0">
                      <h2 className="font-medium text-forest-900">{source.title}</h2>
                      <p className="mt-1 line-clamp-3 text-sm leading-6 text-sand-600">{source.excerpt}</p>
                      <details className="mt-2">
                        <summary className="min-h-11 cursor-pointer py-2 text-xs font-medium text-forest-700">Source details</summary>
                        <p className="text-xs leading-5 text-sand-600">{source.provenance}</p>
                        <p className="mt-1 text-xs text-sand-500">Authority: {source.authority}</p>
                      </details>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {signedIn && (
          <section className="mt-6 border-t border-cream-200 pt-5" aria-label="Your learning">
            <h2 className="font-display text-xl text-forest-900">Your learning</h2>
            {participations.state === 'loading' && <p role="status" className="mt-2 text-sm text-sand-600">Checking your learning…</p>}
            {participations.state === 'error' && <StatusNotice tone="warning">{participations.message}</StatusNotice>}
            {participations.state === 'ready' && participations.value.length === 0 && <p className="mt-2 text-sm text-sand-600">No Institute programme needs your attention right now.</p>}
            {participations.state === 'ready' && participations.value.length > 0 && (
              <div className="mt-3 space-y-2">
                {participations.value.map(item => {
                  const next = item.steps.find(step => step.status !== 'COMPLETED');
                  return <div key={item.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                    <div className="text-sm font-medium text-forest-900">{item.status === 'COMPLETED' ? 'Programme completed' : next?.title ?? 'Learning in progress'}</div>
                    <p className="mt-1 text-xs text-sand-600">
                      {item.status === 'COMPLETED'
                        ? 'This records Institute programme completion only. Any professional or Plug/Master capability remains separately authoritative.'
                        : next ? `Next: ${next.title}` : 'SecurePay has no further programme step to show.'}
                    </p>
                  </div>;
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
