import { useState } from 'react';
import { parsePlace, type InstrumentDraft, type WhereSpec } from '../model';
import { Field, FOCUS, INPUT } from './atoms';

type GeoState = 'idle' | 'requesting' | 'denied' | 'unavailable' | 'acquired';

/**
 * A bounded, free, multi-word place description (Phase 4 of the Agent/Trade-Context Convergence removes
 * the old single-capitalized-word grammar restriction — an artifact of the retired free-text interpreter,
 * not a real backend limit). "Use my current location" shares real, user-shared coordinates via the
 * browser's own geolocation, when the person explicitly allows it — SecurePay records exactly what was
 * shared, never a reverse-geocoded address (no such capability exists) and never claims the coordinates
 * came from SecurePay itself.
 */
export function WhereInstrument({ draft, onChange, disabled, onSubmit }: {
  spec: WhereSpec; draft: Extract<InstrumentDraft, { kind: 'where' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  const [geo, setGeo] = useState<GeoState>('idle');
  const parsed = parsePlace(draft.place);
  const problem = draft.place.trim() === '' || parsed.ok ? null : 'That place description is too long. Tell KS001 in a sentence instead.';

  const useCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeo('unavailable'); return; }
    setGeo('requesting');
    navigator.geolocation.getCurrentPosition(
      position => { setGeo('acquired'); onChange({ ...draft, latitude: position.coords.latitude, longitude: position.coords.longitude }); },
      () => setGeo('denied'),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-3">
    <Field label="Place" htmlFor="instrument-place" hint="A description in your own words — a name, an estate, a building, a road. SecurePay keeps it as written; it is not checked on a map.">
      <input id="instrument-place" data-autofocus value={draft.place} onChange={event => { onChange({ ...draft, place: event.target.value, latitude: null, longitude: null }); setGeo('idle'); }} disabled={disabled}
        maxLength={300} autoComplete="off" placeholder="For example, Two Rivers Mall, Nairobi" aria-invalid={!!problem} aria-describedby="instrument-place-note" className={INPUT} />
    </Field>
    <p id="instrument-place-note" role="status" className="min-h-[1.25rem] text-[0.82rem] text-ember-700">{problem}</p>
    <div className="border-t border-cream-100 pt-3">
      <button type="button" onClick={useCurrentLocation} disabled={disabled || geo === 'requesting'}
        className={`min-h-11 rounded-lg text-[0.85rem] text-sand-600 underline decoration-cream-400 underline-offset-4 hover:text-forest-700 disabled:opacity-40 ${FOCUS}`}>
        {geo === 'requesting' ? 'Getting your location…' : 'Use my current location'}
      </button>
      <p role="status" aria-live="polite" className="mt-1 min-h-[1.1rem] text-[0.8rem] text-sand-500">
        {geo === 'acquired' && draft.latitude != null && `Shared: ${draft.latitude.toFixed(5)}, ${draft.longitude!.toFixed(5)} — kept exactly as your device reported it.`}
        {geo === 'denied' && 'Location wasn’t shared. You can still type the place above.'}
        {geo === 'unavailable' && 'This browser can’t share your location.'}
      </p>
    </div>
  </form>;
}
