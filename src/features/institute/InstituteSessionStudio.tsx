import { useState } from 'react';
import { CalendarPlus, Coins, Mic2 } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type {
  InstituteAccessMode,
  InstituteSessionDto,
  InstituteSessionKind,
  InstituteSessionVisibility,
} from '../../api/securepay/institute/dto';

const KINDS: Array<{ value: InstituteSessionKind; label: string }> = [
  { value: 'PUBLIC_TALK', label: 'Public talk' },
  { value: 'PODCAST_LIVE', label: 'Live podcast' },
  { value: 'LIVE_CLASS', label: 'Live class' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'COHORT', label: 'Cohort session' },
  { value: 'MENTORING', label: 'Mentoring' },
  { value: 'REVIEW', label: 'Review session' },
  { value: 'PRIVATE_SESSION', label: 'Private session' },
];

export function InstituteSessionStudio({
  gateway,
  spaceId,
}: {
  gateway: InstituteGateway;
  spaceId: string;
}) {
  const [kind, setKind] = useState<InstituteSessionKind>('PUBLIC_TALK');
  const [visibility, setVisibility] = useState<InstituteSessionVisibility>('PUBLIC');
  const [accessMode, setAccessMode] = useState<InstituteAccessMode>('FREE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [priceKes, setPriceKes] = useState('');
  const [session, setSession] = useState<InstituteSessionDto | null>(null);
  const [storeOfferId, setStoreOfferId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function publish() {
    if (busy || !title.trim() || !description.trim() || !startsAt) return;
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      setNotice('Enter a valid date and time.');
      return;
    }
    const cap = capacity.trim() ? Number(capacity) : null;
    if (cap != null && (!Number.isInteger(cap) || cap <= 0)) {
      setNotice('Capacity must be a positive whole number.');
      return;
    }

    setBusy(true); setNotice(null);
    try {
      if (accessMode === 'PAID') {
        const price = Number(priceKes);
        if (!Number.isFinite(price) || price <= 0) {
          setNotice('Enter a positive KES price for a paid session.');
          return;
        }
        const packaged = await gateway.createPaidSessionPackage({
          spaceId,
          kind,
          title: title.trim(),
          description: description.trim(),
          visibility,
          startsAt: start.toISOString(),
          endsAt: end?.toISOString() ?? null,
          capacity: cap,
          priceMinor: Math.round(price * 100),
        });
        setSession(packaged.session);
        setStoreOfferId(packaged.storeOfferId);
        setNotice('Paid session scheduled with a real Store service offer. Agreement and Money remain separate SecurePay authority.');
      } else {
        let created = await gateway.createSession({
          spaceId,
          kind,
          title: title.trim(),
          description: description.trim(),
          visibility,
          accessMode,
          startsAt: start.toISOString(),
          endsAt: end?.toISOString() ?? null,
          capacity: cap,
        });
        created = await gateway.scheduleSession(created.id);
        setSession(created);
        setStoreOfferId(null);
        setNotice('Session scheduled. Scheduling does not prove attendance or capability.');
      }
    } catch {
      setNotice('The Institute could not schedule this learning session.');
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
      <div className="flex items-center gap-2">
        {kind === 'PODCAST_LIVE' ? <Mic2 className="w-5 h-5 text-forest-600" /> : <CalendarPlus className="w-5 h-5 text-forest-600" />}
        <h2 className="font-display text-xl text-forest-900">Teach live</h2>
      </div>
      <p className="mt-2 text-[0.82rem] leading-relaxed text-sand-600">
        Knowledge does not have to become a course. Schedule a talk, podcast, workshop, cohort, mentoring or review session instead.
      </p>

      {!session && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <select value={kind} onChange={e => setKind(e.target.value as InstituteSessionKind)} className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
              {KINDS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={visibility} onChange={e => setVisibility(e.target.value as InstituteSessionVisibility)} className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
              <option value="PUBLIC">Public</option>
              <option value="COMMUNITY">Trust Project Community</option>
              <option value="PRIVATE">Private</option>
            </select>
            <select value={accessMode} onChange={e => setAccessMode(e.target.value as InstituteAccessMode)} className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
              <option value="FREE">Free</option>
              <option value="SPONSORED">Sponsored</option>
              <option value="INVITE_ONLY">Invite only</option>
              <option value="PAID">Paid through Store</option>
            </select>
          </div>

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title" className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="What will happen in this session?" className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-sand-600">Starts
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs text-sand-600">Ends (optional)
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input value={capacity} onChange={e => setCapacity(e.target.value)} inputMode="numeric" placeholder="Optional capacity" className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            {accessMode === 'PAID' && (
              <label className="relative">
                <Coins className="absolute left-3 top-3 w-4 h-4 text-sand-400" />
                <input value={priceKes} onChange={e => setPriceKes(e.target.value)} inputMode="decimal" placeholder="Price in KES" className="w-full rounded-xl border border-cream-200 py-2.5 pl-9 pr-3 text-sm" />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => void publish()}
            disabled={busy || !title.trim() || !description.trim() || !startsAt}
            className="min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Scheduling…' : accessMode === 'PAID' ? 'Publish Store offer + schedule session' : 'Schedule session'}
          </button>
        </div>
      )}

      {session && (
        <div className="mt-4 rounded-xl border border-forest-100 bg-forest-50 p-4">
          <p className="text-sm font-medium text-forest-900">{session.title}</p>
          <p className="mt-1 text-xs text-forest-700">
            {session.kind.replace(/_/g, ' ').toLowerCase()} · {session.status.toLowerCase()} · {new Date(session.startsAt).toLocaleString()}
          </p>
          {storeOfferId && <p className="mt-2 text-xs text-sand-600">Store offer: {storeOfferId}</p>}
        </div>
      )}
      {notice && <p className="mt-3 text-xs text-sand-600">{notice}</p>}
    </section>
  );
}
