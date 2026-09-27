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
    lead: 'Type the place in your own words — a town, area or landmark. SecurePay doesn’t use your device location.',
    field: 'Place',
    placeholder: 'e.g. Westlands, Nairobi',
    submit: 'Add this place',
  },
};


/**
 * Public Experience Convergence Phase 3 (Slice 3B) -- the Link / Place form. Declared text only: a link is
 * kept as typed and never opened; a place is the person's own words, never a device location.
 */
export function DeclaredSourcePanel({ kind, busy, error, onSubmit, onClose }: {
  kind: DeclaredSourceKind;
  busy: boolean;
  error: string | null;
  onSubmit: (value: string, label: string) => void;
  onClose: () => void;
}) {
  const copy = COPY[kind];
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const problem = declaredSourceProblem(kind, value);
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
      <label htmlFor={fieldId} className="sr-only">{copy.field}</label>
      <input
        id={fieldId} value={value} onChange={e => setValue(e.target.value)} disabled={busy}
        type={kind === 'link' ? 'url' : 'text'} inputMode={kind === 'link' ? 'url' : 'text'} autoComplete="off"
        maxLength={kind === 'link' ? 2048 : 300} placeholder={copy.placeholder}
        aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${fieldId}-problem` : undefined}
        className="w-full min-h-11 rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-2 text-[0.85rem] text-forest-800 placeholder:text-sand-400 outline-none focus:border-forest-300 disabled:opacity-50"
      />
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
          onClick={() => onSubmit(value.trim(), label.trim())}
          className="min-h-11 rounded-full bg-forest-600 px-5 text-[0.85rem] font-medium text-cream-50 hover:bg-forest-700 disabled:opacity-40"
        >
          {busy ? 'Adding…' : copy.submit}
        </button>
      </div>
    </div>
  );
}
