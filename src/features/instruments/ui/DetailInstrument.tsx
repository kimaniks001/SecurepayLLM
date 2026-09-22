import { MAX_DETAIL_VALUE_LENGTH, type DetailSpec, type InstrumentDraft } from '../model';
import { Field, INPUT } from './atoms';

/**
 * The UNDERSTOOD workbench's GENERIC, bounded descriptive-detail editor (Phase 4 review correction,
 * Section 13). Works identically for a shoe's `size`, a painter's `finish`, a parcel's `area`, or any
 * other ordinary attribute an entity already carries -- zero per-concept code, zero hard-coded field
 * names. Every field shown is SERVER-PROJECTED (read directly off `spec.fields`, which the workbench
 * built from Trade Context itself); this component never invents a new attribute key, and only ever
 * changes the value of a key that already exists on this entity.
 */
export function DetailInstrument({ spec, draft, onChange, disabled, onSubmit }: {
  spec: DetailSpec; draft: Extract<InstrumentDraft, { kind: 'detail' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-3">
    <p className="text-[0.85rem] text-sand-600">Correcting <span className="font-medium text-forest-800">{spec.entityName}</span>’s own details.</p>
    {spec.fields.map((field, index) => {
      const value = draft.values[field.key] ?? '';
      const tooLong = value.length > MAX_DETAIL_VALUE_LENGTH;
      return <Field key={field.key} label={field.label} htmlFor={`instrument-detail-${field.key}`}>
        <input id={`instrument-detail-${field.key}`} data-autofocus={index === 0 ? true : undefined} value={value}
          onChange={event => onChange({ ...draft, values: { ...draft.values, [field.key]: event.target.value } })}
          disabled={disabled} maxLength={MAX_DETAIL_VALUE_LENGTH} autoComplete="off" aria-invalid={tooLong}
          className={INPUT} />
        {tooLong && <p role="alert" className="mt-1 text-[0.82rem] text-ember-700">That’s too long.</p>}
      </Field>;
    })}
    {spec.fields.length === 0 && <p className="text-[0.85rem] text-sand-500">SecurePay doesn’t hold any ordinary details for this yet.</p>}
  </form>;
}
