import { useEffect, useState } from 'react';
import { BookOpenCheck, Coins, Gift, LockKeyhole, Store } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstitutePublicProgramDto } from '../../api/securepay/institute/dto';
import type { AppView } from '../../types';

function accessIcon(mode: InstitutePublicProgramDto['accessMode']) {
  if (mode === 'PAID') return <Coins className="w-4 h-4" />;
  if (mode === 'SPONSORED') return <Gift className="w-4 h-4" />;
  if (mode === 'INVITE_ONLY') return <LockKeyhole className="w-4 h-4" />;
  return <BookOpenCheck className="w-4 h-4" />;
}

export function InstitutePrograms({
  gateway,
  onStarted,
  onNavigate,
}: {
  gateway: InstituteGateway;
  onStarted: () => void;
  onNavigate: (view: AppView) => void;
}) {
  const [programs, setPrograms] = useState<InstitutePublicProgramDto[]>([]);
  const [busy, setBusy] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void gateway.publicPrograms(12).then(
      value => { if (!cancelled) { setPrograms(value); setBusy(false); } },
      () => { if (!cancelled) { setBusy(false); setNotice('The Institute could not load published programmes just now.'); } },
    );
    return () => { cancelled = true; };
  }, [gateway]);

  async function start(program: InstitutePublicProgramDto) {
    if (starting) return;
    if (program.accessMode === 'PAID') {
      onNavigate('store');
      return;
    }
    setStarting(program.id); setNotice(null);
    try {
      await gateway.startProgram(program.id);
      onStarted();
    } catch {
      setNotice(program.accessMode === 'SPONSORED'
        ? 'This sponsored programme needs an active sponsorship grant before it can start.'
        : program.accessMode === 'INVITE_ONLY'
          ? 'This programme needs an invitation before it can start.'
          : 'The Institute could not start this programme just now.');
    } finally { setStarting(null); }
  }

  if (busy) return <p role="status" className="text-sm text-sand-500">Loading published programmes…</p>;
  if (programs.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[0.68rem] uppercase tracking-wide text-sand-500 font-medium">Deliberate programmes</p>
        <h2 className="mt-1 font-display text-2xl text-forest-900">When a structured path helps</h2>
        <p className="mt-1 text-sm text-sand-600">The Institute can assemble learning dynamically. These are programmes someone deliberately structured because sequence, evidence, access or supervision matters.</p>
      </div>
      {notice && <div className="rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm text-sand-700">{notice}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {programs.map(program => (
          <article key={program.id} className="rounded-2xl border border-cream-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-forest-900">{program.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-sand-600">{program.purpose}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-50 px-2.5 py-1 text-[0.68rem] text-sand-600">
                {accessIcon(program.accessMode)}{program.accessMode.replaceAll('_', ' ').toLowerCase()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void start(program)}
              disabled={starting === program.id}
              className="mt-4 min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50"
            >
              {program.accessMode === 'PAID'
                ? <span className="inline-flex items-center gap-2"><Store className="w-4 h-4" />Open Store</span>
                : starting === program.id ? 'Starting…' : 'Start this programme'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
