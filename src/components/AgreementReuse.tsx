import { useState } from 'react';
import { Copy, ArrowRight, Check } from 'lucide-react';
import type { AgreementDetail } from '../types';

interface AgreementReuseProps {
  detail: AgreementDetail;
}

interface ReuseOption {
  label: string;
  term: string;
}

export function AgreementReuse({ detail }: AgreementReuseProps) {
  const [selectedOption, setSelectedOption] = useState<ReuseOption | null>(null);
  const [adopted, setAdopted] = useState(false);

  const options: ReuseOption[] = [
    {
      label: 'Use the same defect rule',
      term: detail.conditions.find((c) => c.toLowerCase().includes('defect')) || 'No defect rule in this agreement',
    },
    {
      label: `Work with ${detail.people.find((p) => p.role !== 'Customer' && p.role !== 'Buyer')?.name || 'the same provider'} again`,
      term: `Provider: ${detail.people.find((p) => p.role !== 'Customer' && p.role !== 'Buyer')?.name || 'N/A'} — ${detail.people.find((p) => p.role !== 'Customer' && p.role !== 'Buyer')?.role || ''}`,
    },
    {
      label: 'Use the same payment structure',
      term: detail.conditions.find((c) => c.toLowerCase().includes('payment')) || detail.price,
    },
    {
      label: 'Start something similar',
      term: `New trade based on: ${detail.title}`,
    },
  ];

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Reuse</div>
      <p className="text-[0.85rem] text-sand-600 mb-3">Use something from this completed agreement in a new trade.</p>

      {!selectedOption && !adopted && (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setSelectedOption(opt)}
              className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left"
            >
              <Copy className="w-4 h-4 text-forest-500 shrink-0" />
              <span className="text-[0.825rem] font-medium text-forest-800">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {selectedOption && !adopted && (
        <div className="space-y-3">
          <div className="rounded-xl bg-cream-50 border border-cream-200 px-4 py-3">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">From your completed SecurePay agreement</div>
            <div className="text-[0.825rem] font-medium text-forest-800">{detail.title}</div>
            <div className="text-[0.72rem] text-sand-500">Version {detail.version}</div>
            <div className="mt-2 pt-2 border-t border-cream-200">
              <div className="text-[0.7rem] text-sand-500 mb-0.5">{selectedOption.label.replace('Use the same ', '').replace('Use the ', '').replace('Work with ', '').replace('Start ', 'Start ')}</div>
              <p className="text-[0.825rem] text-forest-800">{selectedOption.term}</p>
            </div>
          </div>
          <p className="text-[0.72rem] text-sand-400">From your completed SecurePay agreement — explicitly reused. This does not become part of a new trade until you adopt it.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAdopted(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Use this in the new trade
            </button>
            <button
              onClick={() => setSelectedOption(null)}
              className="rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {adopted && (
        <div className="rounded-xl bg-forest-50 border border-forest-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-forest-600" />
            <span className="text-[0.825rem] font-medium text-forest-800">Adopted in new trade</span>
          </div>
          <p className="text-[0.78rem] text-sand-600 mt-1">
            "{selectedOption?.term}" has been added to your new trade understanding.
          </p>
          <p className="text-[0.72rem] text-sand-400 mt-1">
            From your completed SecurePay agreement — explicitly reused
          </p>
          <button
            onClick={() => { setSelectedOption(null); setAdopted(false); }}
            className="mt-2 flex items-center gap-1.5 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Start another reuse
          </button>
        </div>
      )}
    </div>
  );
}
