import { ArrowRight } from 'lucide-react';

interface ContinueCardProps {
  title: string;
  /** Human consequence/state. This is deliberately not an internal action/status code. */
  headline?: string | null;
  detail?: string | null;
  actionLabel?: string;
  eyebrow?: string;
  onContinue: () => void;
}

/**
 * Human Experience Phase 2 — Continue is not a destination. The card says what actually needs the
 * person and the button takes them to that exact work/action. Authority stays with the source state;
 * this component is presentation only.
 */
export function ContinueCard({
  title,
  headline,
  detail,
  actionLabel = 'Continue',
  eyebrow = 'What needs you now',
  onContinue,
}: ContinueCardProps) {
  return (
    <section
      aria-label="What needs you now"
      className="surface-info mx-auto w-full max-w-2xl px-4 py-4 text-left md:px-5"
      data-continue-card
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">{eyebrow}</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.05rem] text-forest-900">{title}</p>
          {headline && <p className="mt-1 text-[0.9rem] leading-5 text-forest-800">{headline}</p>}
          {detail && <p className="mt-1 text-[0.78rem] leading-5 text-sand-600">{detail}</p>}
        </div>
        <button
          type="button"
          onClick={onContinue}
          aria-label={`${actionLabel}: ${title}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-forest-700 px-4 text-[0.84rem] font-medium text-white shadow-soft transition-colors hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
        >
          {actionLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
