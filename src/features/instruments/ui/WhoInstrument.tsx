import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { KNOWN_ROLES } from '../../../api/securepay/agent/roles';
import { ksShape, normalizeKs } from '../../../api/securepay/agent/ksformat';
import { parsePersonName, type InstrumentDraft, type WhoSpec } from '../model';
import { Field, FOCUS, INPUT } from './atoms';

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * ADD A PERSON. The person is named and given a role, and that is ONE ordinary sentence to KS001
 * ("John is the seller.") in the shape the real interpreter reads. It records a named person and a role,
 * nothing more: no identity is resolved, no KS Number is checked or attached, no participant is created and
 * no invitation exists. A person SecurePay already holds is changed in conversation, not from here.
 *
 * The KS Number route is a separate, secondary, honestly UNAVAILABLE disclosure: SecurePay has no
 * participant-safe way to check a KS Number (the identity endpoint returns the whole record) and the
 * formation path only recognises KS + 9 digits, so a number such as KS003 could never be attached. What
 * the person types there is kept, and nothing is sent.
 */
export function WhoInstrument({ spec, draft, onChange, disabled, onSubmit, onBackToConversation }: {
  spec: WhoSpec; draft: Extract<InstrumentDraft, { kind: 'who' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void; onBackToConversation: () => void;
}) {
  const [ksOpen, setKsOpen] = useState(draft.ks !== '');
  const parsed = parsePersonName(draft.name, spec.takenNames);
  const problem = draft.name.trim() === '' || parsed.ok ? null
    : parsed.reason === 'taken' ? 'SecurePay already has someone by that name. To change them, tell KS001.'
    : parsed.reason === 'reserved' ? 'SecurePay reads that word as something else. Tell KS001 in a sentence instead.'
    : 'SecurePay can record one first name — a single word such as John. Tell KS001 anything longer.';
  const typedKs = draft.ks.trim();
  const shape = typedKs ? ksShape(typedKs) : null;
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-4">
    <Field label="Name" htmlFor="instrument-name" hint="Just a name — this doesn’t identify or invite anyone.">
      <input id="instrument-name" data-autofocus value={draft.name} onChange={event => onChange({ ...draft, name: event.target.value })} disabled={disabled}
        maxLength={31} autoComplete="off" autoCapitalize="words" placeholder="For example, John" aria-invalid={!!problem} aria-describedby="instrument-name-note" className={INPUT} />
    </Field>
    <p id="instrument-name-note" role="status" className="min-h-[1.25rem] text-[0.82rem] text-ember-700">{problem}</p>
    <Field label="Their role in this" htmlFor="instrument-role">
      <div className="relative">
        <select id="instrument-role" value={draft.role} disabled={disabled} onChange={event => onChange({ ...draft, role: event.target.value })} className={`${INPUT} appearance-none pr-10`}>
          <option value="" disabled>Choose a role…</option>
          {KNOWN_ROLES.map(role => <option key={role} value={role}>{cap(role)}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
      </div>
    </Field>

    <div className="border-t border-cream-100 pt-3">
      <button type="button" aria-expanded={ksOpen} onClick={() => setKsOpen(open => !open)} className={`min-h-11 rounded-lg text-[0.85rem] text-sand-600 underline decoration-cream-400 underline-offset-4 hover:text-forest-700 ${FOCUS}`}>
        I have a KS Number
      </button>
      {ksOpen && <div className="mt-2 space-y-2">
        <Field label="KS Number" htmlFor="instrument-ks">
          <input id="instrument-ks" value={draft.ks} onChange={event => onChange({ ...draft, ks: event.target.value })} disabled={disabled}
            autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="KS003" aria-describedby="instrument-ks-note"
            className={`${INPUT} font-medium tracking-wide uppercase`} />
        </Field>
        <div id="instrument-ks-note" role="status" aria-live="polite" className="space-y-1 text-[0.85rem]">
          {shape === 'malformed' && <p className="text-ember-700">A KS Number looks like KS003 — the letters KS and at least three digits.</p>}
          <p className="text-forest-800">{shape && shape !== 'malformed' ? `${normalizeKs(typedKs)} looks like a SecurePay KS Number, but ` : ''}SecurePay can’t check a KS Number or attach it to this conversation from here yet.</p>
          <p className="text-sand-500">What you type here is kept and isn’t sent. To involve this person now, add their name above, or tell KS001 in the conversation.</p>
          <button type="button" onClick={onBackToConversation} className={`min-h-11 rounded-lg text-[0.85rem] text-sand-600 underline decoration-cream-400 underline-offset-4 hover:text-forest-700 ${FOCUS}`}>Back to the conversation</button>
        </div>
      </div>}
    </div>
  </form>;
}
