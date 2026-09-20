import { parsePlace, type InstrumentDraft, type WhereSpec } from '../model';
import { Field, INPUT } from './atoms';

/**
 * A first, single-word place. SecurePay's formation parser reads a place only as "in/at <Word>", records
 * one entity per name and never replaces one, and has no geocoder or coordinates -- so this instrument
 * is offered only when no place is recorded yet, accepts one word, and says it is not checked on a map.
 */
export function WhereInstrument({ draft, onChange, disabled, onSubmit }: {
  spec: WhereSpec; draft: Extract<InstrumentDraft, { kind: 'where' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  const parsed = parsePlace(draft.place);
  const problem = draft.place.trim() === '' || parsed.ok ? null
    : parsed.reason === 'reserved' ? 'SecurePay reads that word as something else. Tell KS001 the place in a sentence instead.'
    : 'SecurePay can record one place name — a single word such as Kilimani. Tell KS001 anything longer.';
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-3">
    <Field label="Place" htmlFor="instrument-place" hint="SecurePay keeps the name as written. It is not checked on a map.">
      <input id="instrument-place" data-autofocus value={draft.place} onChange={event => onChange({ ...draft, place: event.target.value })} disabled={disabled}
        maxLength={40} autoComplete="off" placeholder="For example, Kilimani" aria-invalid={!!problem} aria-describedby="instrument-place-note" className={INPUT} />
    </Field>
    <p id="instrument-place-note" role="status" className="min-h-[1.25rem] text-[0.82rem] text-ember-700">{problem}</p>
  </form>;
}
