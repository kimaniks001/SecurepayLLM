import type { InstrumentDraft, WhereSpec } from '../model';
import { Field, INPUT } from './atoms';

/**
 * A named place. Deliberately just a text field: SecurePay's Agent has no geocoder, coordinates or
 * distance today, so there is nothing honest to draw a map from -- the place is recorded as the
 * person's own words. (GPS / map location conditions exist only inside Agreements, later.)
 */
export function WhereInstrument({ spec, draft, onChange, disabled, onSubmit }: {
  spec: WhereSpec; draft: Extract<InstrumentDraft, { kind: 'where' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-3">
    {spec.currentText && <p className="text-[0.85rem] text-sand-600">SecurePay currently understands <span className="font-medium text-forest-800">{spec.currentText}</span>.</p>}
    <Field label="Place" htmlFor="instrument-place" hint="SecurePay keeps the place as you word it. It is not checked on a map.">
      <input id="instrument-place" data-autofocus value={draft.place} onChange={event => onChange({ ...draft, place: event.target.value })} disabled={disabled}
        maxLength={200} autoComplete="off" placeholder="For example, Kilimani, Nairobi" className={INPUT} />
    </Field>
  </form>;
}
