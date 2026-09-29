import { ArrowRight } from 'lucide-react';

/**
 * User-Ready Beta Gate 1 (EP-CERT-013) -- CONTINUE is explicit and visually separate from START NEW. Home's universal composer
 * always starts something new; returning to earlier work is this one clear, labelled action.
 */
export function ContinueCard({ title, detail, onContinue }: { title: string; detail?: string | null; onContinue: () => void }) {
  return (
    <section aria-label="Continue where you left off" className="surface-info mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3 text-left" data-continue-card>
      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Continue</p>
        <p className="truncate text-[0.95rem] text-forest-800">{title}</p>
        {detail && <p className="text-[0.78rem] text-sand-600">{detail}</p>}
      </div>
      <button type="button" onClick={onContinue} aria-label={`Continue: ${title}`}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-forest-200 bg-white px-4 text-[0.85rem] font-medium text-forest-700 hover:border-forest-300 hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}
