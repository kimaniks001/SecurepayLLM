import { useEffect, useState } from 'react';
import { BookOpenCheck, Coins, Gift, LockKeyhole, Store, ShieldCheck } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstitutePublicProgramDto } from '../../api/securepay/institute/dto';

function accessIcon(mode: InstitutePublicProgramDto['accessMode']) {
  if (mode === 'PAID') return <Coins className="w-4 h-4" />;
  if (mode === 'SPONSORED') return <Gift className="w-4 h-4" />;
  if (mode === 'INVITE_ONLY') return <LockKeyhole className="w-4 h-4" />;
  return <BookOpenCheck className="w-4 h-4" />;
}

function storeOfferId(reference: string | null): string | null {
  if (!reference?.startsWith('store-offer:')) return null;
  const id = reference.slice('store-offer:'.length).trim();
  return id || null;
}

export function InstitutePrograms({
  gateway,
  onStarted,
  onOpenStoreOffer,
}: {
  gateway: InstituteGateway;
  onStarted: () => void;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
}) {
  const [programs, setPrograms] = useState<InstitutePublicProgramDto[]>([]);
  const [busy, setBusy] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [agreementIds, setAgreementIds] = useState<Record<string, string>>({});
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
    if (starting || activating) return;
    if (program.accessMode === 'PAID') {
      const offerId = storeOfferId(program.commercialReference);
      if (!offerId) {
        setNotice('This paid programme is not connected to a valid Store offer.');
        return;
      }
      onOpenStoreOffer(program.authorCanonicalKsNumber, offerId);
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

  async function activatePaid(program: InstitutePublicProgramDto) {
    const agreementId = (agreementIds[program.id] ?? '').trim();
    if (!agreementId || activating) return;
    setActivating(program.id); setNotice(null);
    try {
      await gateway.activatePaidAccess(program.id, agreementId);
      setAgreementIds(current => ({ ...current, [program.id]: '' }));
      onStarted();
    } catch {
      setNotice('SecurePay could not activate this paid programme. The Agreement must be for this exact Store offer and the matching learning obligation must already be sufficiently funded.');
    } finally { setActivating(null); }
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
                {accessIcon(program.accessMode)}{program.accessMode.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void start(program)}
              disabled={starting === program.id || activating === program.id}
              className="mt-4 min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50"
            >
              {program.accessMode === 'PAID'
                ? <span className="inline-flex items-center gap-2"><Store className="w-4 h-4" />Open exact Store offer</span>
                : starting === program.id ? 'Starting…' : 'Start this programme'}
            </button>

            {program.accessMode === 'PAID' && (
              <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50/70 p-3">
                <div className="flex items-center gap-2 text-forest-800">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-[0.74rem] font-medium">Already funded the learning Agreement?</p>
                </div>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-sand-600">
                  Access activates only after SecurePay proves this Agreement came from the exact Store offer and its matching learning obligation is sufficiently funded.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={agreementIds[program.id] ?? ''}
                    onChange={e => setAgreementIds(current => ({ ...current, [program.id]: e.target.value }))}
                    placeholder="Agreement reference"
                    className="min-h-11 flex-1 rounded-xl border border-cream-200 bg-white px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void activatePaid(program)}
                    disabled={activating === program.id || !(agreementIds[program.id] ?? '').trim()}
                    className="min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {activating === program.id ? 'Checking…' : 'Activate learning'}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
