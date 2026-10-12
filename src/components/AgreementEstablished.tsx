import { ShieldCheck } from 'lucide-react';
import type { AgreementEstablishedResponse } from '../types';

interface AgreementEstablishedCardProps {
  data: AgreementEstablishedResponse;
}

/**
 * Quiet certainty only. This component never invents participant names, version labels or confirmation
 * details that are not present in the response.
 */
export function AgreementEstablishedCard({ data }: AgreementEstablishedCardProps) {
  return (
    <article className="sp-agreement-paper mx-auto max-w-2xl px-5 py-6 md:px-8 md:py-8" data-agreement-established>
      <header className="border-b border-cream-200 pb-5">
        <div className="flex items-center gap-2 text-forest-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]">Agreed</span>
        </div>
        <h2 className="mt-2 font-display text-2xl text-forest-900">{data.title}</h2>
        <p className="mt-1 text-[0.84rem] text-sand-700">{data.status}</p>
      </header>
      <dl className="divide-y divide-cream-100">
        <div className="py-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">Work</dt><dd className="mt-1 text-[0.95rem] text-forest-900">{data.work}</dd></div>
        <div className="py-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">Price</dt><dd className="mt-1 text-[1.05rem] font-medium text-forest-900">{data.price}</dd></div>
        <div className="py-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">When</dt><dd className="mt-1 text-[0.95rem] text-forest-900">{data.completion}</dd></div>
        {data.materials && <div className="py-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-600">Materials</dt><dd className="mt-1 text-[0.95rem] text-forest-900">{data.materials}</dd></div>}
      </dl>
    </article>
  );
}
