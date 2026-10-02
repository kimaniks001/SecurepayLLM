import { useEffect, useState } from 'react';
import { CalendarDays, Mic2, Store, Users } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstitutePublicSessionDto } from '../../api/securepay/institute/dto';
import type { AppView } from '../../types';

function icon(kind: InstitutePublicSessionDto['kind']) {
  if (kind === 'PODCAST_LIVE' || kind === 'PUBLIC_TALK') return <Mic2 className="w-4 h-4" />;
  if (kind === 'COHORT' || kind === 'WORKSHOP') return <Users className="w-4 h-4" />;
  return <CalendarDays className="w-4 h-4" />;
}

export function InstituteLiveLearning({
  gateway,
  onNavigate,
}: {
  gateway: InstituteGateway;
  onNavigate: (view: AppView) => void;
}) {
  const [sessions, setSessions] = useState<InstitutePublicSessionDto[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void gateway.publicSessions(12).then(
      value => { if (!cancelled) { setSessions(value); setBusy(false); } },
      () => { if (!cancelled) setBusy(false); },
    );
    return () => { cancelled = true; };
  }, [gateway]);

  if (busy) return <p role="status" className="text-sm text-sand-500">Loading upcoming learning…</p>;
  if (sessions.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[0.68rem] uppercase tracking-wide text-sand-500 font-medium">Live knowledge</p>
        <h2 className="mt-1 font-display text-2xl text-forest-900">Talks, workshops, podcasts and sessions</h2>
        <p className="mt-1 text-sm text-sand-600">Knowledge does not have to become a course. People can teach live, answer questions, review work or gather a cohort around something useful.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sessions.map(session => (
          <article key={session.id} className="rounded-2xl border border-cream-200 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">{icon(session.kind)}</span>
              <div className="min-w-0">
                <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">{session.kind.replace(/_/g, ' ').toLowerCase()}</p>
                <h3 className="mt-1 font-display text-lg text-forest-900">{session.title}</h3>
              </div>
            </div>
            <p className="mt-3 text-[0.82rem] leading-relaxed text-sand-600">{session.description}</p>
            <div className="mt-4 text-xs text-sand-500">
              <p>{new Date(session.startsAt).toLocaleString()}</p>
              {session.capacity != null && <p className="mt-1">Capacity: {session.capacity}</p>}
              <p className="mt-1">Access: {session.accessMode.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
            {session.accessMode === 'PAID' && session.commercialReference && (
              <button
                type="button"
                onClick={() => onNavigate('store')}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800"
              >
                <Store className="w-4 h-4" />Open Store
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
