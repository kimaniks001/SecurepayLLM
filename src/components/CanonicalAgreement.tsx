import { FileText, AlertCircle, AlertTriangle } from 'lucide-react';
import type { CanonicalAgreementResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

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
        <div className="mt-2 flex items-center gap-3 text-[0.75rem]">
          <span className="text-sand-500">Version: <span className="text-forest-700 font-medium">{data.version}</span></span>
          <span className="text-sand-300">·</span>
          <span className="text-sand-500">Status: <span className="text-ember-600 font-medium">{data.status}</span></span>
        </div>

        <div className="mt-4">
          <Section label="Parties">
            <div className="space-y-1">
              {data.parties.map((party, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-[0.875rem] font-medium text-forest-800">{party.name}</span>
                  <span className="text-[0.78rem] text-sand-500">— {party.role}</span>
                </div>
              ))}
            </div>
          </Section>

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

          {/* Final Phase 4 Economy Turn 3 (Section 6) -- provenance/commercial context only. This
              is NOT: an accepted offer, Agreement authority, participant authority, or payment
              authority. */}
          {data.source && (
            <Section label="Started from">
              <div className="text-[0.875rem] text-forest-800">{data.source.title}{data.source.ownerKsNumber ? ` · ${data.source.ownerKsNumber}` : ''}</div>
              <div className="text-[0.78rem] text-sand-500">Proposed price: {data.source.priceLine}</div>
              <div className={`mt-1 text-[0.7rem] font-medium uppercase tracking-wide ${data.source.status === 'CURRENT' ? 'text-forest-600' : 'text-ember-600'}`}>Source status: {data.source.statusLabel}</div>
            </Section>
          )}

          {data.materials && (
            <Section label="Materials">
              <span className="text-[0.875rem] text-forest-800">{data.materials}</span>
            </Section>
          )}

          <Section label="Completion">
            <span className="text-[0.875rem] text-forest-800">{data.completion}</span>
          </Section>

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
                <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Must settle before setting</span>
              </div>
              {data.mustSettle.map((item, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-[0.825rem] font-medium text-forest-800">{item.label}</div>
                  <div className="text-[0.78rem] text-sand-600">{item.detail}</div>
                </div>
              ))}
              <p className="mt-1 text-[0.72rem] font-medium text-ember-700">Resolve this before setting the agreement.</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-5">
        {blocked ? (
          <div className="flex flex-wrap gap-2">
            <button
              disabled
              className="text-[0.825rem] font-medium rounded-full px-4 py-2 bg-cream-200 text-sand-400 cursor-not-allowed"
            >
              {data.primaryLabel}
            </button>
            <button
              onClick={() => onChoice(data.secondaryValue)}
              className="text-[0.825rem] font-medium rounded-full px-4 py-2 bg-white text-forest-700 border border-cream-200 hover:border-forest-300 hover:bg-cream-50 shadow-soft transition-all duration-200 active:scale-[0.97]"
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
      </div>
    </div>
  );
}
