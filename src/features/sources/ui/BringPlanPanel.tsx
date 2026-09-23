import { useState } from 'react';
import { Copy, X } from 'lucide-react';

/**
 * KS001 Upgrade Phase 3 (Section 18) -- the exact copyable AI-handoff prompt. A pasted result from
 * another AI remains an EXTERNAL SOURCE (Section 17) -- it never becomes confirmed simply because the
 * external AI formatted it well.
 */
export const AI_HANDOFF_PROMPT =
  'Prepare this conversation for SecurePay. Capture what we are trying to achieve, the people and ' +
  'organisations involved, each person’s role, responsibilities, amounts or budgets, dates, ' +
  'conditions, approvals, evidence of completion, how money is expected to move, unresolved decisions, ' +
  'assumptions and important risks. Do not invent missing facts. Mark uncertain information clearly.';

function AiHandoffHelper() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen(o => !o)} className="text-[0.78rem] text-sand-500 hover:text-forest-700 underline">
        Preparing this in another AI?
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 space-y-2">
          <p className="text-[0.78rem] text-sand-600 leading-snug">{AI_HANDOFF_PROMPT}</p>
          <button
            type="button"
            onClick={() => { void navigator.clipboard?.writeText(AI_HANDOFF_PROMPT).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
            className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-forest-700 hover:text-forest-800"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />{copied ? 'Copied' : 'Copy this prompt'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * KS001 Upgrade Phase 3 (Section 17) -- "Bring your plan": a pasted plan is its own first-class source,
 * never forced through the ordinary chat composer (which represents what the person is saying NOW, a
 * different trust level from a source they want SecurePay to READ). Optional source label is offered but
 * never required (Section 17 -- "do not require provider attribution").
 */
export function BringPlanPanel({ busy, error, onSubmit, onClose }: {
  busy: boolean;
  error: string | null;
  onSubmit: (text: string, label: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  return (
    <div role="dialog" aria-label="Bring your plan" className="rounded-2xl border border-cream-200 bg-white shadow-lifted p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[0.95rem] text-forest-800">Bring your plan</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="w-7 h-7 rounded-full flex items-center justify-center text-sand-400 hover:text-forest-700 hover:bg-cream-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[0.8rem] text-sand-600 leading-snug">Paste text from notes, email, WhatsApp, or another AI. SecurePay will read the useful parts into BUILD as suggestions.</p>
      <textarea
        value={text} onChange={e => setText(e.target.value)} disabled={busy} rows={8}
        placeholder="Paste your plan here…"
        className="w-full resize-y rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 outline-none focus:border-forest-300 disabled:opacity-50"
      />
      <input
        value={label} onChange={e => setLabel(e.target.value)} disabled={busy}
        placeholder="Optional label, e.g. “Committee notes”"
        className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.8rem] text-forest-800 placeholder:text-sand-400 outline-none focus:border-forest-300 disabled:opacity-50"
      />
      <AiHandoffHelper />
      {error && <p role="alert" className="text-[0.78rem] text-ember-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={busy} className="min-h-11 px-4 text-[0.85rem] text-sand-500 hover:text-forest-700 disabled:opacity-40">Cancel</button>
        <button
          type="button" disabled={busy || !text.trim()}
          onClick={() => onSubmit(text.trim(), label.trim())}
          className="min-h-11 rounded-full bg-forest-600 px-5 text-[0.85rem] font-medium text-cream-50 hover:bg-forest-700 disabled:opacity-40"
        >
          {busy ? 'Reading…' : 'Read into BUILD'}
        </button>
      </div>
    </div>
  );
}
