import { Calendar } from 'lucide-react';
import type { RecipientReviewResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface RecipientReviewCardProps {
  data: RecipientReviewResponse;
  onChoice: (value: string) => void;
  notice?: string;
}

/**
 * Phase 3 — the public doorway is the first page of the Agreement, not a recipient dashboard.
 * Only public-invitation facts are shown; opening this card still has no Join/confirm/payment authority.
 */
export function RecipientReviewCard({ data, onChoice, notice }: RecipientReviewCardProps) {
  return (
    <article className="sp-agreement-paper mx-auto max-w-2xl overflow-hidden px-5 py-6 md:px-8 md:py-8" data-recipient-agreement-preview>
      <header className="border-b border-cream-200 pb-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-forest-700">Agreement invitation</p>
        <p className="mt-2 text-[0.9rem] leading-6 text-sand-700">
          {data.inviterName ? `${data.inviterName} wants to agree this with you.` : 'Someone wants to agree this with you.'}
        </p>
        <h1 className="mt-2 break-words font-display text-2xl leading-tight tracking-[-0.02em] text-forest-900 md:text-3xl">{data.title}</h1>
      </header>

      <div className="divide-y divide-cream-100">
        <section className="py-4">
          <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Your part</h2>
          <p className="mt-1 text-[0.95rem] text-forest-900">{data.role}</p>
        </section>
        {data.purpose && <section className="py-4">
          <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">What this is for</h2>
          <p className="mt-1 text-[0.95rem] leading-6 text-forest-900">{data.purpose}</p>
        </section>}
        {data.proposedAmount && <section className="py-4">
          <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Price</h2>
          <p className="mt-1 text-[1.05rem] font-medium text-forest-900">{data.proposedAmount}</p>
        </section>}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[0.78rem] text-sand-600">
        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{data.expiry}</span>
      </div>

      <p className="mt-4 text-[0.84rem] leading-5 text-sand-700">
        You have not joined or agreed to anything. Review the Agreement first; SecurePay will ask who you are only when that becomes necessary.
      </p>
      {notice && <details className="mt-3 text-[0.74rem] text-sand-600">
        <summary className="cursor-pointer select-none underline underline-offset-2">Invitation details</summary>
        <p className="mt-1">{notice}</p>
      </details>}

      <footer className="mt-6 border-t border-cream-200 pt-5">
        <ChoiceButtons
          data={{ type: 'CHOICE_BUTTONS', choices: [
            { label: data.primaryLabel, value: data.primaryValue },
            { label: data.secondaryLabel, value: data.secondaryValue },
          ] }}
          onChoice={onChoice}
        />
      </footer>
    </article>
  );
}
