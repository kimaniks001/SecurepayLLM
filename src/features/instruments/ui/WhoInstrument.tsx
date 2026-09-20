import { useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { KNOWN_ROLES } from '../../../api/securepay/agent/instruments';
import { ksIdentityView, normalizeKsNumber, type KsIdentityView } from '../../../api/securepay/agent/ksidentity';
import type { KsIdentityDto } from '../../../api/securepay/agent/dto';
import { ApiError } from '../../../api/securepay/http';
import type { InstrumentDraft, WhoSpec } from '../model';
import { Field, FOCUS, INPUT, QuietButton } from './atoms';

type Lookup =
  | { phase: 'idle' }
  | { phase: 'malformed' }
  | { phase: 'loading' }
  | { phase: 'found'; identity: KsIdentityView }
  | { phase: 'inactive'; identity: KsIdentityView }
  | { phase: 'not-registered'; ks: string }
  | { phase: 'error'; message: string };

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * KSFinder -- "I KNOW the person": resolve a KS Number to a participant-safe identity, then let the
 * person say what ROLE that identity plays in THIS arrangement.
 *
 * Doctrine encoded here:
 *  - A KS Number implies no role. The role is always the person's own explicit choice.
 *  - Only the participant-safe projection (KS Number, display name, kind, active?) is ever shown.
 *  - No ranking, no "match", no inferred relationship; an unregistered number is never turned into a person.
 *  - Finding someone is NOT inviting them. Nothing here issues an Agreement invitation -- that
 *    only exists once an Agreement does. The statement this sends is ordinary conversation.
 * (This is the "I know the person" path. "I need to find someone" is SecurePay discovery -- a
 *  different instrument, reached through KS001, deliberately not merged with this one.)
 */
export function WhoInstrument({ spec, draft, onChange, disabled, lookup, onFindOnSecurePay }: {
  spec: WhoSpec; draft: Extract<InstrumentDraft, { kind: 'who' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean;
  lookup: (canonicalKsNumber: string) => Promise<KsIdentityDto>; onFindOnSecurePay: () => void;
}) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Lookup>({ phase: 'idle' });
  const requestId = useRef(0);

  const edit = (value: string) => {
    setInput(value);
    // Any change after a lookup invalidates it: the draft never carries a KS Number that was not resolved.
    requestId.current += 1;
    setResult({ phase: 'idle' });
    if (draft.ks) onChange({ ...draft, ks: '' });
  };
  const find = async () => {
    const parsed = normalizeKsNumber(input);
    if (!parsed.ok) { setResult({ phase: 'malformed' }); return; }
    const mine = ++requestId.current;
    setResult({ phase: 'loading' });
    try {
      const identity = ksIdentityView(await lookup(parsed.value), parsed.value);
      if (mine !== requestId.current) return;
      if (!identity) { setResult({ phase: 'error', message: 'SecurePay returned something unreadable. Please try again.' }); return; }
      if (identity.active) { setResult({ phase: 'found', identity }); onChange({ ...draft, ks: identity.ksNumber }); }
      else setResult({ phase: 'inactive', identity });
    } catch (error) {
      if (mine !== requestId.current) return;
      if (error instanceof ApiError && error.status === 404) setResult({ phase: 'not-registered', ks: parsed.value });
      else if (error instanceof ApiError && error.status === 400) setResult({ phase: 'malformed' });
      else if (error instanceof ApiError && (error.status === 401 || error.status === 403)) setResult({ phase: 'error', message: 'SecurePay could not look this up for you right now.' });
      else setResult({ phase: 'error', message: 'SecurePay is unavailable, so this could not be checked. Your KS Number is still here — try again.' });
    }
  };
  const busy = result.phase === 'loading';

  return <div className="space-y-4">
    {spec.entityName && <p className="text-[0.85rem] text-sand-600">SecurePay heard <span className="font-medium text-forest-800">{spec.entityName}</span> but has no KS Number for them yet.</p>}
    <form onSubmit={event => { event.preventDefault(); void find(); }} className="space-y-2">
      <Field label="KS Number" htmlFor="instrument-ks" hint={result.phase === 'idle' ? 'For example KS003' : undefined}>
        <div className="flex gap-2">
          <input id="instrument-ks" data-autofocus value={input} onChange={event => edit(event.target.value)} disabled={disabled}
            autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} inputMode="text" placeholder="KS003"
            aria-invalid={result.phase === 'malformed' || result.phase === 'not-registered'} aria-describedby="instrument-ks-result"
            className={`${INPUT} font-medium tracking-wide uppercase`} />
          <button type="submit" disabled={disabled || busy || input.trim() === ''} aria-label="Find this KS Number"
            className={`h-[3rem] w-12 shrink-0 rounded-xl border border-forest-200 bg-forest-50 text-forest-700 flex items-center justify-center hover:bg-forest-100 disabled:opacity-40 ${FOCUS}`}>
            <Search className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />
          </button>
        </div>
      </Field>
    </form>

    <div id="instrument-ks-result" role="status" aria-live="polite" className="min-h-[1.25rem] text-[0.85rem]">
      {result.phase === 'loading' && <span className="text-sand-500">Checking…</span>}
      {result.phase === 'malformed' && <span className="text-ember-700">A KS Number looks like KS003 — the letters KS and at least three digits.</span>}
      {result.phase === 'not-registered' && <span className="text-forest-800">This KS Number isn’t registered on SecurePay.</span>}
      {result.phase === 'inactive' && <span className="text-forest-800">{result.identity.ksNumber} isn’t active on SecurePay right now, so it can’t be used.</span>}
      {result.phase === 'error' && <span className="text-ember-700">{result.message}</span>}
    </div>
    {result.phase === 'error' && <div><QuietButton onClick={() => void find()}>Try again</QuietButton></div>}

    {result.phase === 'found' && <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3 rounded-xl border border-forest-200 bg-forest-50/70 px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-cream-50"><Check className="w-4 h-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <div className="font-medium text-forest-800">{result.identity.ksNumber}{result.identity.displayName ? ` · ${result.identity.displayName}` : ''}</div>
          <div className="text-[0.78rem] text-sand-500">Registered on SecurePay{result.identity.kind ? ` · ${result.identity.kind === 'BUSINESS' ? 'Business' : 'Individual'}` : ''}</div>
        </div>
      </div>
      <Field label="Their role in this" htmlFor="instrument-role" hint="A KS Number doesn’t say who someone is in this arrangement — you do.">
        <div className="relative">
          <select id="instrument-role" value={draft.role} disabled={disabled} onChange={event => onChange({ ...draft, role: event.target.value })} className={`${INPUT} appearance-none pr-10`}>
            <option value="" disabled>Choose a role…</option>
            {KNOWN_ROLES.map(role => <option key={role} value={role}>{cap(role)}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
        </div>
      </Field>
    </div>}

    {result.phase !== 'found' && <div className="pt-1"><QuietButton onClick={onFindOnSecurePay}>Don’t have a KS Number? Ask KS001 to look on SecurePay</QuietButton></div>}
  </div>;
}

