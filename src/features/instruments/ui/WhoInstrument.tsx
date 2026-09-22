import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { KNOWN_ROLES } from '../../../api/securepay/agent/roles';
import { isValidKsNumber, normalizeKs } from '../../../api/securepay/agent/ksformat';
import { parsePersonName, type InstrumentDraft, type WhoSpec } from '../model';
import { Field, FOCUS, INPUT } from './atoms';

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * ADD A PERSON. Two structured paths, never a fabricated chat sentence (Phase 4 of the Agent/
 * Trade-Context Convergence):
 *
 *  - Name + role: a plain candidate person/organization with an optional role. No identity is
 *    resolved; a person SecurePay already holds is changed in conversation, not from here.
 *  - "I have a KS Number": an EXACT, server-verified identity lookup via SecurePay's real identity
 *    boundary (`KsNumber.parse`, `KsIdentityQueryService`) -- a trusted user action, structurally
 *    separate from the conversational path, and never a plain-text guess. Resolving a KS Number
 *    confirms who it belongs to; it does not by itself mean acceptance or that the current person IS
 *    that identity.
 */
export function WhoInstrument({ spec, draft, onChange, disabled, onSubmit, onBackToConversation, onFind }: {
  spec: WhoSpec; draft: Extract<InstrumentDraft, { kind: 'who' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void; onBackToConversation: () => void; onFind: () => void;
}) {
  const editingExisting = !!spec.targetEntityId;
  const [ksOpen, setKsOpen] = useState(draft.ks !== '');
  const parsed = parsePersonName(draft.name, spec.takenNames);
  const problem = editingExisting || draft.name.trim() === '' || parsed.ok ? null
    : parsed.reason === 'taken' ? 'SecurePay already has someone by that name. To change them, tell KS001.'
    : 'That name is too long. Tell KS001 in a sentence instead.';
  const typedKs = draft.ks.trim();
  const normalized = typedKs ? normalizeKs(typedKs) : '';
  const malformed = typedKs !== '' && !isValidKsNumber(normalized);
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-4">
    {!editingExisting && <div role="group" aria-label="How do you want to add them?" className="grid grid-cols-2 gap-2">
      {/* Two different paths, told apart at a glance: I KNOW the person (add them here) / I need to FIND someone (SecurePay's Store). */}
      <button type="button" aria-pressed="true" className={`min-h-11 rounded-xl border border-forest-500 bg-forest-50 px-3 text-[0.88rem] font-medium text-forest-800 ${FOCUS}`}>I know who</button>
      <button type="button" aria-pressed="false" onClick={onFind} disabled={disabled} className={`min-h-11 rounded-xl border border-cream-300 bg-white px-3 text-[0.88rem] text-sand-600 hover:border-forest-300 disabled:opacity-40 ${FOCUS}`}>Find on SecurePay</button>
    </div>}
    {editingExisting
      ? <p className="text-[0.85rem] text-sand-600">Correcting <span className="font-medium text-forest-800">{spec.currentName}</span>’s role. Their name isn’t changed here.</p>
      : <>
        <Field label="Name" htmlFor="instrument-name" hint="Just a name — this doesn’t identify or invite anyone.">
          <input id="instrument-name" data-autofocus value={draft.name} onChange={event => onChange({ ...draft, name: event.target.value })} disabled={disabled || !!typedKs}
            maxLength={200} autoComplete="off" autoCapitalize="words" placeholder="For example, John" aria-invalid={!!problem} aria-describedby="instrument-name-note" className={INPUT} />
        </Field>
        <p id="instrument-name-note" role="status" className="min-h-[1.25rem] text-[0.82rem] text-ember-700">{problem}</p>
      </>}
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
        <Field label="KS Number" htmlFor="instrument-ks" hint="An exact SecurePay KS Number, e.g. KS003. SecurePay checks it directly — nothing is guessed.">
          <input id="instrument-ks" value={draft.ks} onChange={event => onChange({ ...draft, ks: event.target.value, name: '' })} disabled={disabled}
            autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="KS003" aria-describedby="instrument-ks-note"
            className={`${INPUT} font-medium tracking-wide uppercase`} />
        </Field>
        <div id="instrument-ks-note" role="status" aria-live="polite" className="space-y-1 text-[0.85rem]">
          {malformed && <p className="text-ember-700">A KS Number looks like KS003 — the letters KS and at least three digits.</p>}
          {!malformed && typedKs && <p className="text-forest-800">SecurePay will check {normalized} directly before adding it.</p>}
          <button type="button" onClick={onBackToConversation} className={`min-h-11 rounded-lg text-[0.85rem] text-sand-600 underline decoration-cream-400 underline-offset-4 hover:text-forest-700 ${FOCUS}`}>Back to the conversation</button>
        </div>
      </div>}
    </div>
  </form>;
}
