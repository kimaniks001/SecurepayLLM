import { useState } from 'react';
import { X } from 'lucide-react';
import { declaredSourceProblem, type DeclaredSourceKind } from '../presentation';

export type { DeclaredSourceKind };


const COPY: Record<DeclaredSourceKind, { title: string; lead: string; field: string; placeholder: string; submit: string }> = {
  link: {
    title: 'Share a link',
    lead: 'SecurePay keeps the link exactly as you type it. It never opens the page, so tell KS001 anything important that is on it.',
    field: 'Link',
    placeholder: 'https://…',
    submit: 'Add this link',
  },
  place: {
    title: 'Add a place',
    lead: 'Choose a place or use your current location. You decide what to share.',
    field: 'Place',
    placeholder: 'e.g. Westlands, Nairobi',
    submit: 'Add this place',
  },
};


/**
 * Public Experience Convergence Phase 3 (Slice 3B) -- the Link / Place form. Declared text only: a link is
 * kept as typed and never opened; a place is the person's own words, never a device location.
 */
export function DeclaredSourcePanel({ kind, busy, error, onSubmit, onClose, initialValue = '', initialLabel = '' }: {
  kind: DeclaredSourceKind;
  busy: boolean;
  error: string | null;
  onSubmit: (value: string, label: string) => void;
  onClose: () => void;
  /** User-Ready Beta Gate 1 -- what the person typed is restored if the panel re-opens after a failure (never retyped). */
  initialValue?: string;
  initialLabel?: string;
}) {
  const copy = COPY[kind];
  const [value, setValue] = useState(initialValue);
  const [placeMethod, setPlaceMethod] = useState<'description' | 'coordinates'>('description');
  const [arrival, setArrival] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'share'>('private');
  const coordinateParts = value.split(',').map(piece => Number(piece.trim()));
  const coordinatesValid = coordinateParts.length === 2 && coordinateParts.every(Number.isFinite) && coordinateParts[0] >= -90 && coordinateParts[0] <= 90 && coordinateParts[1] >= -180 && coordinateParts[1] <= 180;
  const placeProblem = kind === 'place' && placeMethod === 'coordinates' && value.trim() && !coordinatesValid ? 'Unable to confirm this location. Try My location again or use Places.' : null;
  const captureDeviceLocation = () => {
    if (!navigator.geolocation) { setLocationError('Location is not supported by this browser. Choose Places instead.'); return; }
    setLocationError(''); setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      position => { setPlaceMethod('coordinates'); setValue(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`); setLocationBusy(false); },
      () => { setLocationError('Device location was not available or permission was declined. Choose another way to add the place.'); setLocationBusy(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };
  const [label, setLabel] = useState(initialLabel);
  const problem = declaredSourceProblem(kind, value) || placeProblem;
  const fieldId = `declared-${kind}`;
  return (
    <div role="dialog" aria-label={copy.title} className="rounded-2xl border border-cream-200 bg-white shadow-lifted p-4 space-y-3 animate-fade-in-up" data-declared-source={kind}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[0.95rem] text-forest-800">{copy.title}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-sand-600 hover:text-forest-700 hover:bg-cream-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[0.8rem] text-sand-600 leading-snug">{copy.lead}</p>
      {kind === 'place' && <div className="space-y-3" data-securepay-place>
        <div className="flex flex-wrap gap-2" role="group" aria-label="How to choose a place">
          <button type="button" onClick={() => { setPlaceMethod('description'); setValue(''); setLocationError(''); }} disabled={busy}
            aria-pressed={placeMethod === 'description'} className={`min-h-11 rounded-full border px-4 text-sm ${placeMethod === 'description' ? 'border-forest-700 bg-forest-700 text-white' : 'border-forest-200 text-forest-800'}`}>Places</button>
          <button type="button" onClick={captureDeviceLocation} disabled={busy || locationBusy} className="min-h-11 rounded-full border border-forest-200 px-4 text-sm text-forest-800">{locationBusy ? 'Locating…' : 'My location'}</button>
        </div>
        {placeMethod === 'description' ? <>
          <label htmlFor={fieldId} className="block text-xs font-semibold text-forest-800">Where is it?</label>
          <input id={fieldId} value={value} onChange={e => setValue(e.target.value)} disabled={busy} type="text" autoComplete="off"
            maxLength={300} placeholder="Search or describe a place, e.g. Westlands, Nairobi"
            aria-invalid={problem ? true : undefined} className="w-full min-h-11 rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-2 text-sm text-forest-800" />
        </> : <div className="rounded-xl border border-forest-100 bg-cream-50/50 px-3 py-3">
          <p className="text-sm font-medium text-forest-800">Your current location is ready to review.</p>
          {coordinatesValid && <a target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${coordinateParts[0]}&mlon=${coordinateParts[1]}#map=17/${coordinateParts[0]}/${coordinateParts[1]}`} className="mt-2 inline-block text-sm font-semibold text-forest-700 underline">View on map ↗</a>}
          <p className="mt-1 text-xs text-sand-600">Check that the map shows the correct place before adding it.</p>
        </div>}
        <label className="block text-xs font-semibold text-forest-800">Entrance or arrival instructions (optional)
          <input value={arrival} onChange={e => setArrival(e.target.value)} maxLength={90} disabled={busy} placeholder="e.g. use the blue gate, not the rear entrance" className="mt-1 w-full min-h-11 rounded-xl border border-cream-200 px-3 text-sm" />
        </label>
        <fieldset className="rounded-xl border border-cream-200 p-3">
          <legend className="px-1 text-xs font-semibold text-forest-800">Sharing</legend>
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} /> Private — for this conversation</label>
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="radio" checked={visibility === 'share'} onChange={() => setVisibility('share')} /> I may share this place with Agreement participants</label>
        </fieldset>
        <p className="text-xs text-sand-600">This adds a proposed place to the conversation, not a verified destination or public listing.</p>
        {locationError && <p role="alert" className="text-xs text-ember-700">{locationError}</p>}
      </div>}
      {kind === 'link' && <>
      <label htmlFor={fieldId} className="sr-only">{copy.field}</label>
      <input
        id={fieldId} value={value} onChange={e => setValue(e.target.value)} disabled={busy}
        type={kind === 'link' ? 'url' : 'text'} inputMode={kind === 'link' ? 'url' : 'text'} autoComplete="off"
        maxLength={kind === 'link' ? 2048 : 300} placeholder={copy.placeholder}
        aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${fieldId}-problem` : undefined}
        className="w-full min-h-11 rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-2 text-[0.85rem] text-forest-800 placeholder:text-sand-400 outline-none focus:border-forest-300 disabled:opacity-50"
      />
      </>}
      {kind === 'link' && (
        <input
          value={label} onChange={e => setLabel(e.target.value)} disabled={busy} maxLength={200}
          aria-label="Optional label" placeholder="Optional label, e.g. “Supplier price list”"
          className="w-full min-h-11 rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.8rem] text-forest-800 placeholder:text-sand-400 outline-none focus:border-forest-300 disabled:opacity-50"
        />
      )}
      {problem && <p id={`${fieldId}-problem`} className="text-[0.78rem] text-ember-700">{problem}</p>}
      {error && <p role="alert" className="text-[0.78rem] text-ember-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={busy} className="min-h-11 px-4 text-[0.85rem] text-sand-600 hover:text-forest-700 disabled:opacity-40">Cancel</button>
        <button
          type="button" disabled={busy || !value.trim() || !!problem}
          onClick={() => onSubmit(kind === 'place' ? `${placeMethod === 'coordinates' ? 'Coordinates: ' : ''}${value.trim()}${arrival.trim() ? '; Arrival: ' + arrival.trim() : ''}${visibility === 'share' ? '; Sharing requested with Agreement participants (not yet authorised)' : '; Private proposed location'}` : value.trim(), label.trim())}
          className="min-h-11 rounded-full bg-forest-600 px-5 text-[0.85rem] font-medium text-cream-50 hover:bg-forest-700 disabled:opacity-40"
        >
          {busy ? 'Adding…' : copy.submit}
        </button>
      </div>
    </div>
  );
}
