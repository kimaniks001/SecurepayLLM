import type { AgreementDetail } from '../types';

interface AgreementTermsProps {
  detail: AgreementDetail;
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-cream-100 last:border-0">
      <span className="text-[0.78rem] text-sand-600">{label}</span>
      <span className="text-[0.825rem] font-medium text-forest-800 text-right">{value}</span>
    </div>
  );
}

export function AgreementTerms({ detail }: AgreementTermsProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Terms</div>
      <TermRow label="Work" value={detail.work.join(', ')} />
      <TermRow label="Price" value={detail.price} />
      {detail.materials !== '—' && <TermRow label="Materials" value={detail.materials} />}
      {detail.completion !== '—' && <TermRow label="Completion" value={detail.completion} />}
      {detail.conditions.map((c, i) => (
        <TermRow key={i} label={c.split('—')[0].trim()} value={c.split('—')[1]?.trim() || c} />
      ))}
    </div>
  );
}
