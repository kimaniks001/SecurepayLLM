import { FileText, AlertCircle, AlertTriangle } from 'lucide-react';
import type { CanonicalAgreementResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';
import { SourceReference } from '../features/discovery/ui/SourceReference';

interface CanonicalAgreementCardProps {
  data: CanonicalAgreementResponse;
  onChoice: (value: string) => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-cream-100 last:border-0">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </div>
  );
}

/**
 * KS001 Upgrade Phase 2 final acceptance correction (item 3) -- a state-aware review fact: a suggested
 * (CANDIDATE) fact is visibly "Suggested," never presented as if already agreed; a "Confirmed" quiet label
 * is shown only for a CONFIRMED fact -- never implying Suggested means agreed.
 */
function ReviewFactSection({ label, facts }: { label: string; facts: { description: string; confirmed: boolean; source?: { displayName: string; locator: string; removed: boolean } | null }[] | undefined }) {
  if (!facts || facts.length === 0) return null;
  return (
    <Section label={label}>
      <ul className="space-y-1">
        {facts.map((fact, i) => (
          <li key={i} className="flex items-start gap-2 text-[0.875rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            <span>
              {fact.description}
              <span className={`ml-1.5 text-[0.7rem] font-medium ${fact.confirmed ? 'text-forest-600' : 'text-sand-500'}`}>
                {fact.confirmed ? '(Confirmed)' : '(Suggested)'}
              </span>
              {/* KS001 Upgrade Phase 3 completion correction (item 1/9) -- bounded source attribution,
                  surviving adoption; a removed source still names it, without hiding the fact itself. */}
              {fact.source && <span className="ml-1.5 text-[0.7rem] italic text-sand-500">
                {fact.source.displayName}{fact.source.locator ? ` · ${fact.source.locator}` : ''}{fact.source.removed ? ' — source removed' : ''}
              </span>}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Plain words for the backend's display statuses; an unknown status is shown as it is, never guessed. */
const STATUS_LABEL: Record<string, string> = {
  READY_TO_PROGRESS: 'Reviewed, ready for a draft', READY_FOR_REVIEW: 'Ready to review', NEEDS_RESOLUTION: 'Needs settling',
  REVIEW_STALE: 'Changed since reviewed', PROGRESSED: 'Draft created', IDENTITY_REQUIRED: 'Sign in to continue', EXPIRED: 'Expired',
};

export function CanonicalAgreementCard({ data, onChoice }: CanonicalAgreementCardProps) {
  const blocked = data.mustSettle.length > 0;

  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-lg mx-auto animate-quiet-in">
      <div className="px-6 py-4 bg-forest-50 border-b border-forest-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">Agreement Review</span>
      </div>

      <div className="px-6 py-4">
        <h2 className="font-display text-lg text-forest-800 leading-tight">{data.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem]">
          <span className="text-sand-500">Version: <span className="text-forest-700 font-medium">{data.version}</span></span>
          <span className="text-sand-300" aria-hidden="true">·</span>
          <span className="text-sand-500">Status: <span className="text-ember-700 font-medium">{STATUS_LABEL[data.status] ?? data.status}</span></span>
        </div>

        <div className="mt-4">
          <Section label="Parties">
            <div className="space-y-1">
              {data.parties.map((party, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-[0.875rem] font-medium text-forest-800">{party.name}</span>
                  {party.role && <span className="text-[0.78rem] text-sand-500">— {party.role}</span>}
                  {party.source && <span className="text-[0.7rem] italic text-sand-500">
                    {party.source.displayName}{party.source.locator ? ` · ${party.source.locator}` : ''}{party.source.removed ? ' — source removed' : ''}
                  </span>}
                </div>
              ))}
            </div>
          </Section>

          <ReviewFactSection label="Responsibilities" facts={data.responsibilities} />

          <Section label="Work">
            <ul className="space-y-1">
              {data.work.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[0.875rem] text-forest-800">
                  <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section label="Price">
            <span className="text-[0.875rem] font-medium text-forest-800">{data.price}</span>
          </Section>

          <ReviewFactSection label="Money" facts={data.money} />

          {/* Final Phase 4 Economy Turn 3 (Section 6) -- provenance/commercial context only. This
              is NOT: an accepted offer, Agreement authority, participant authority, or payment
              authority. */}
          {data.source && (
            <SourceReference source={{
              sourceType: data.source.sourceType ?? undefined, title: data.source.title, ownerKs: data.source.ownerKsNumber, capturedPriceMinor: data.source.capturedPriceMinor ?? null, capturedCurrency: data.source.capturedCurrency ?? null,
              status: data.source.status, current: data.source.current ?? null, capturedAvailability: data.source.capturedAvailability ?? null,
            }} />
          )}

          {data.materials && (
            <Section label="Materials">
              <span className="text-[0.875rem] text-forest-800">{data.materials}</span>
            </Section>
          )}

          <Section label="Completion">
            <span className="text-[0.875rem] text-forest-800">{data.completion}</span>
          </Section>

          <ReviewFactSection label="Conditions" facts={data.conditions} />

          <ReviewFactSection label="Authority" facts={data.authority} />

          {data.defects && (
            <Section label="Defects">
              <span className="text-[0.875rem] text-forest-800">{data.defects}</span>
            </Section>
          )}

          {data.paymentTiming && (
            <Section label="Payment timing">
              <span className="text-[0.875rem] text-forest-800">{data.paymentTiming}</span>
            </Section>
          )}

          {data.worthSettling.length > 0 && (
            <div className="mt-4 rounded-xl border border-cream-300 bg-cream-50 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-sand-500" />
                <span className="text-[0.7rem] font-medium text-sand-600 uppercase tracking-wide">Worth settling</span>
              </div>
              {data.worthSettling.map((item, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-[0.825rem] font-medium text-forest-800">{item.label}</div>
                  <div className="text-[0.78rem] text-sand-600">{item.detail}</div>
                </div>
              ))}
              <p className="mt-1 text-[0.72rem] text-sand-500">These may remain open if the agreement can still safely be set.</p>
            </div>
          )}

          {blocked && (
            <div className="mt-3 rounded-xl border border-ember-300 bg-ember-50 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-ember-700" />
                <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Needs settling first</span>
              </div>
              {data.mustSettle.map((item, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-[0.825rem] font-medium text-forest-800">{item.label}</div>
                  <div className="text-[0.78rem] text-sand-600">{item.detail}</div>
                </div>
              ))}
              <p className="mt-1 text-[0.72rem] font-medium text-ember-700">Talk it through to settle this, then review again.</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-5">
        {blocked ? (
          <div className="flex flex-wrap gap-2">
            <button
              disabled
              className="min-h-11 text-[0.825rem] font-medium rounded-full px-4 py-2 bg-cream-200 text-sand-400 cursor-not-allowed"
            >
              {data.primaryLabel}
            </button>
            <button
              onClick={() => onChoice(data.secondaryValue)}
              className="min-h-11 text-[0.825rem] font-medium rounded-full px-4 py-2 bg-white text-forest-700 border border-cream-200 hover:border-forest-300 hover:bg-cream-50 shadow-soft transition-all duration-200 active:scale-[0.97]"
            >
              {data.secondaryLabel}
            </button>
          </div>
        ) : (
          <ChoiceButtons
            data={{ type: 'CHOICE_BUTTONS', choices: [
              { label: data.primaryLabel, value: data.primaryValue },
              { label: data.secondaryLabel, value: data.secondaryValue },
            ] }}
            onChoice={onChoice}
          />
        )}
        {data.consequence && <p className="mt-3 text-[0.78rem] leading-snug text-sand-600">{data.consequence}</p>}
      </div>
    </div>
  );
}
