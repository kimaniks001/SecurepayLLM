import { AlertTriangle } from 'lucide-react';
import type { CanonicalAgreementResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';
import { SourceReference } from '../features/discovery/ui/SourceReference';

interface CanonicalAgreementCardProps {
  data: CanonicalAgreementResponse;
  onChoice: (value: string) => void;
  readOnly?: boolean;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-cream-100 py-4 last:border-0">
      <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">{label}</h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function ReviewFactSection({ label, facts }: {
  label: string;
  facts: { description: string; confirmed: boolean; source?: { displayName: string; locator: string; removed: boolean } | null }[] | undefined;
}) {
  if (!facts || facts.length === 0) return null;
  return <Section label={label}>
    <ul className="space-y-2">
      {facts.map((fact, i) => (
        <li key={i} className="text-[0.92rem] leading-6 text-forest-900">
          {fact.description}
          {!fact.confirmed && <span className="ml-2 text-[0.72rem] font-medium text-sand-600">Suggested</span>}
          {fact.source && <details className="mt-1 text-[0.72rem] text-sand-600">
            <summary className="cursor-pointer select-none underline underline-offset-2">Source</summary>
            <span>{fact.source.displayName}{fact.source.locator ? ` · ${fact.source.locator}` : ''}{fact.source.removed ? ' — source removed' : ''}</span>
          </details>}
        </li>
      ))}
    </ul>
  </Section>;
}

const STATUS_LABEL: Record<string, string> = {
  READY_TO_PROGRESS: 'Ready to keep',
  READY_FOR_REVIEW: 'Ready to review',
  NEEDS_RESOLUTION: 'Needs one decision',
  REVIEW_STALE: 'Changed since you reviewed it',
  PROGRESSED: 'Saved as a draft',
  IDENTITY_REQUIRED: 'Sign in to keep it',
  EXPIRED: 'Expired',
};

export function CanonicalAgreementCard({ data, onChoice, readOnly = false }: CanonicalAgreementCardProps) {
  const blocked = data.mustSettle.length > 0;
  return (
    <article data-canonical-agreement className="sp-agreement-paper mx-auto max-w-2xl overflow-hidden px-5 py-6 md:px-8 md:py-8">
      <header className="border-b border-cream-200 pb-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-forest-700">SecurePay Agreement</p>
        <h2 className="mt-2 font-display text-2xl leading-tight tracking-[-0.02em] text-forest-900 md:text-3xl">{data.title}</h2>
        <p className="mt-2 text-[0.82rem] text-sand-700">{blocked ? 'One decision still needs you before this can continue.' : 'Read the Agreement itself, then choose what happens next.'}</p>
      </header>

      <div className="mt-2">
        {data.parties.length > 0 && <Section label="People">
          <div className="space-y-1.5">
            {data.parties.map((party, i) => (
              <div key={i} className="text-[0.95rem] text-forest-900">
                <span className="font-medium">{party.name}</span>
                {party.role && <span className="text-sand-600"> · {party.role}</span>}
              </div>
            ))}
          </div>
        </Section>}

        {data.work.length > 0 && <Section label="Work">
          <ul className="space-y-2">{data.work.map((item, i) => <li key={i} className="text-[0.95rem] leading-6 text-forest-900">{item}</li>)}</ul>
        </Section>}

        {data.price && data.price !== 'Not yet specified' && <Section label="Price">
          <p className="text-[1.05rem] font-medium text-forest-900">{data.price}</p>
        </Section>}

        <ReviewFactSection label="Responsibilities" facts={data.responsibilities} />
        <ReviewFactSection label="Money" facts={data.money} />

        {data.materials && <Section label="Materials"><p className="text-[0.95rem] leading-6 text-forest-900">{data.materials}</p></Section>}
        {data.completion && data.completion !== 'Not yet specified' && <Section label="When"><p className="text-[0.95rem] leading-6 text-forest-900">{data.completion}</p></Section>}
        <ReviewFactSection label="Conditions" facts={data.conditions} />
        {data.defects && <Section label="Defects"><p className="text-[0.95rem] leading-6 text-forest-900">{data.defects}</p></Section>}
        {data.paymentTiming && <Section label="Payment"><p className="text-[0.95rem] leading-6 text-forest-900">{data.paymentTiming}</p></Section>}

        {data.mustSettle.length > 0 && <section className="mt-5 rounded-2xl border border-ember-200 bg-ember-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-ember-700" aria-hidden="true" />
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-ember-800">Needs your decision</h3>
          </div>
          <div className="mt-2 space-y-2">{data.mustSettle.map((item, i) => <div key={i}>
            <p className="text-[0.9rem] font-medium text-forest-900">{item.label}</p>
            <p className="text-[0.82rem] leading-5 text-sand-800">{item.detail}</p>
          </div>)}</div>
        </section>}

        {data.worthSettling.length > 0 && <details className="mt-4 text-[0.82rem] text-sand-700">
          <summary className="cursor-pointer select-none underline underline-offset-2">Things you can still decide later</summary>
          <div className="mt-2 space-y-2">{data.worthSettling.map((item, i) => <div key={i}><strong className="font-medium text-forest-800">{item.label}</strong> · {item.detail}</div>)}</div>
        </details>}

        <details className="mt-5 border-t border-cream-200 pt-4 text-[0.78rem] text-sand-600" data-agreement-details>
          <summary className="cursor-pointer select-none underline underline-offset-2">Agreement details</summary>
          <div className="mt-2 space-y-2">
            <p>Status: {STATUS_LABEL[data.status] ?? data.status}</p>
            <p>Version {data.version}</p>
            <ReviewFactSection label="Authority" facts={data.authority} />
            {data.source && <SourceReference source={{
              sourceType: data.source.sourceType ?? undefined,
              title: data.source.title,
              ownerKs: data.source.ownerKsNumber,
              capturedPriceMinor: data.source.capturedPriceMinor ?? null,
              capturedCurrency: data.source.capturedCurrency ?? null,
              status: data.source.status,
              current: data.source.current ?? null,
              capturedAvailability: data.source.capturedAvailability ?? null,
            }} />}
          </div>
        </details>
      </div>

      {!readOnly && <footer className="mt-6 border-t border-cream-200 pt-5">
        {blocked ? (
          <div className="flex flex-wrap gap-2">
            <button disabled className="min-h-11 rounded-full bg-cream-200 px-4 text-[0.85rem] font-medium text-sand-500">{data.primaryLabel}</button>
            <button type="button" onClick={() => onChoice(data.secondaryValue)}
              className="min-h-11 rounded-full border border-cream-300 bg-white px-4 text-[0.85rem] font-medium text-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              {data.secondaryLabel}
            </button>
          </div>
        ) : (
          <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [
            { label: data.primaryLabel, value: data.primaryValue },
            { label: data.secondaryLabel, value: data.secondaryValue },
          ] }} onChoice={onChoice} />
        )}
        {data.consequence && <p className="mt-3 max-w-xl text-[0.78rem] leading-5 text-sand-700">{data.consequence}</p>}
      </footer>}
      {readOnly && data.consequence && <p className="mt-5 border-t border-cream-200 pt-4 text-[0.8rem] leading-5 text-sand-700">{data.consequence}</p>}
    </article>
  );
}
