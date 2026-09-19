import { useState } from 'react';
import { ArrowLeft, Check, FileText, Info, Plus, X } from 'lucide-react';
import type { AvailabilityState, OfferKind } from '../api/securepay/store/dto';
import { availabilityStateLabel } from '../storeLabels';

export interface OfferDraftFields {
  kind: OfferKind;
  title: string;
  description: string;
  priceMinor: number | null;
  quantityAvailable: number | null;
  availabilityState: AvailabilityState;
  published: boolean;
  mediaRefs: string[];
}

interface OfferBuilderViewProps {
  draft: OfferDraftFields;
  availabilityOptions: AvailabilityState[];
  busy: boolean;
  error: string | null;
  isEditing: boolean;
  onChange: (patch: Partial<OfferDraftFields>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

/**
 * There is no verified production Agent contract that can structure Store Offer facts from free text
 * (see docs/PRODUCTION_MIGRATION_LEDGER.md) — the Bolt Pass 9 keyword-matching "conversation" that used
 * to live here was local mock intelligence, not a real capability, so it is not shipped as production
 * authority (task section 9). This preserves the split-pane "offer taking shape" layout with explicit,
 * trader-reviewed fields instead: only what the trader themselves typed is ever sent to the real Store
 * API, and nothing is saved until they explicitly review and submit.
 */
export function OfferBuilderView({ draft, availabilityOptions, busy, error, isEditing, onChange, onBack, onSubmit }: OfferBuilderViewProps) {
  const [showReview, setShowReview] = useState(false);
  const [newRef, setNewRef] = useState('');
  const addRef = () => { const value = newRef.trim(); if (value) { onChange({ mediaRefs: [...draft.mediaRefs, value] }); setNewRef(''); } };
  const priceText = draft.priceMinor === null ? '' : String(draft.priceMinor / 100);
  const setPriceText = (value: string) => {
    if (!value.trim()) { onChange({ priceMinor: null }); return; }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return;
    onChange({ priceMinor: Math.round(amount * 100) });
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          My Store
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{isEditing ? 'Edit offer' : 'Create an offer'}</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: explicit fields */}
        <div className="flex-1 md:flex-[1.3] overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-forest-500" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Describe your offer</span>
            </div>
            <p className="text-[0.78rem] text-sand-600">
              SecurePay does not yet auto-structure offers from free text. Fill in the fields below yourself, then review before publishing.
            </p>

            <div className="flex gap-2">
              {(['PRODUCT', 'SERVICE'] as OfferKind[]).map(kind => (
                <button
                  key={kind}
                  onClick={() => onChange({ kind, availabilityState: kind === 'PRODUCT' ? 'AVAILABLE' : 'TAKING_WORK' })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-[0.825rem] font-medium transition-colors ${draft.kind === kind ? 'border-forest-400 bg-forest-50 text-forest-700' : 'border-cream-200 text-sand-600 hover:border-forest-200'}`}
                >
                  {kind === 'PRODUCT' ? 'Product' : 'Service'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="e.g. 4-Camera CCTV Package"
                className="mt-1 w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
              />
            </div>

            <div>
              <label className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Description</label>
              <textarea
                value={draft.description}
                onChange={e => onChange({ description: e.target.value })}
                rows={4}
                placeholder="Describe what this offer includes in plain language."
                className="mt-1 w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Price (KES)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={priceText}
                  onChange={e => setPriceText(e.target.value)}
                  placeholder="Leave blank if not listed"
                  className="mt-1 w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
                />
              </div>
              {draft.kind === 'PRODUCT' && (
                <div className="flex-1">
                  <label className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Quantity available</label>
                  <input
                    type="number" min="0" step="1"
                    value={draft.quantityAvailable === null ? '' : String(draft.quantityAvailable)}
                    onChange={e => onChange({ quantityAvailable: e.target.value.trim() === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Availability</label>
              <select
                value={draft.availabilityState}
                onChange={e => onChange({ availabilityState: e.target.value as AvailabilityState })}
                className="mt-1 w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.85rem] text-forest-800 focus:outline-none focus:border-forest-300"
              >
                {availabilityOptions.map(state => <option key={state} value={state}>{availabilityStateLabel[state]}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Media references</label>
              <p className="text-[0.7rem] text-sand-400 mt-0.5 mb-1.5">Client-supplied references to media you already have — not a file upload, not evidence.</p>
              <div className="space-y-1.5">
                {draft.mediaRefs.map((ref, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 truncate rounded-lg bg-cream-50 border border-cream-200 px-2.5 py-1.5 text-[0.78rem] text-forest-700 font-mono">{ref}</span>
                    <button onClick={() => onChange({ mediaRefs: draft.mediaRefs.filter((_, j) => j !== i) })} className="text-sand-400 hover:text-ember-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {draft.mediaRefs.length < 20 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newRef}
                      onChange={e => setNewRef(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRef(); } }}
                      placeholder="Media reference (URL or asset id)"
                      className="flex-1 rounded-lg border border-cream-200 bg-white px-2.5 py-1.5 text-[0.78rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
                    />
                    <button onClick={addRef} disabled={!newRef.trim()} className="flex items-center gap-1 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700 disabled:opacity-40">
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1">
              <input type="checkbox" checked={draft.published} onChange={e => onChange({ published: e.target.checked })} className="rounded border-cream-300" />
              <span className="text-[0.8rem] text-forest-800">Publish immediately (visible in public Store search)</span>
            </label>
          </div>

          <button
            onClick={() => setShowReview(true)}
            disabled={!draft.title.trim() || busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-700 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-800 transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Review and {draft.published ? 'publish' : 'save as draft'}
          </button>
          {error && <p role="alert" className="text-[0.78rem] text-ember-600">{error}</p>}
        </div>

        {/* Right: Offer Taking Shape */}
        <div className="hidden md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-100/50 overflow-y-auto scrollbar-thin px-4 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Offer taking shape</div>
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 mb-3">
            <div className="font-display text-[0.95rem] text-forest-800 font-medium mb-2">{draft.title || 'Untitled offer'}</div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-500">Kind</span>
                <span className="text-forest-800 text-right">{draft.kind === 'PRODUCT' ? 'Product' : 'Service'}</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-500">Price</span>
                <span className="text-forest-800 text-right">{draft.priceMinor === null ? 'Not listed' : `KES ${(draft.priceMinor / 100).toLocaleString()}`}</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-500">Availability</span>
                <span className="text-forest-800 text-right">{availabilityStateLabel[draft.availabilityState]}</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-500">Status</span>
                <span className="text-forest-800 text-right">{draft.published ? 'Published' : 'Draft'}</span>
              </div>
            </div>
          </div>
          <div className="text-[0.68rem] text-sand-400 italic">
            Offer ≠ Agreement. This structured offer answers "what I generally offer." Each customer creates their own agreement.
          </div>
        </div>
      </div>

      {/* Review modal */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm animate-quiet-in" onClick={() => setShowReview(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-deliberate px-5 py-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-forest-500" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Review your offer</span>
            </div>
            <div className="space-y-3 mb-4 text-[0.825rem]">
              <div className="flex items-baseline justify-between"><span className="text-sand-600">Title</span><span className="text-forest-800 text-right">{draft.title}</span></div>
              <div className="flex items-baseline justify-between"><span className="text-sand-600">Kind</span><span className="text-forest-800 text-right">{draft.kind === 'PRODUCT' ? 'Product' : 'Service'}</span></div>
              <div className="flex items-baseline justify-between"><span className="text-sand-600">Price</span><span className="text-forest-800 text-right">{draft.priceMinor === null ? 'Not listed' : `KES ${(draft.priceMinor / 100).toLocaleString()}`}</span></div>
              <div className="flex items-baseline justify-between"><span className="text-sand-600">Availability</span><span className="text-forest-800 text-right">{availabilityStateLabel[draft.availabilityState]}</span></div>
              <div className="flex items-baseline justify-between"><span className="text-sand-600">Visibility</span><span className="text-forest-800 text-right">{draft.published ? 'Published' : 'Draft'}</span></div>
            </div>
            <button
              onClick={() => { setShowReview(false); onSubmit(); }}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {busy ? 'Saving…' : draft.published ? 'Publish offer' : 'Save as draft'}
            </button>
            <button onClick={() => setShowReview(false)} className="w-full text-[0.825rem] text-sand-500 hover:text-forest-600 mt-2">
              Continue editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
