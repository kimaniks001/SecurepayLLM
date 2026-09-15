import { Check, X } from 'lucide-react';
import type { ProductComparisonResponse } from '../types';

interface ProductComparisonCardProps {
  data: ProductComparisonResponse;
}

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-forest-50 text-forest-600">
        <Check className="w-3 h-3" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cream-100 text-sand-400">
        <X className="w-3 h-3" />
      </span>
    );
  }
  return <span className="text-[0.825rem] text-forest-800">{value}</span>;
}

export function ProductComparisonCard({ data }: ProductComparisonCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.heading}</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-200">
              <th className="text-left text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide px-4 py-2.5 w-24">Compare</th>
              {data.products.map((p, i) => (
                <th key={i} className="text-left px-4 py-2.5 min-w-[100px] animate-reveal-stagger" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                  <div className="text-[0.825rem] font-medium text-forest-800">{p.name}</div>
                  <div className="text-[0.7rem] text-sand-500">{p.store}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className={`border-b border-cream-100 last:border-0 ${i % 2 === 0 ? 'bg-cream-50/50' : ''} animate-reveal-stagger`} style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                <td className="text-[0.78rem] text-sand-600 font-medium px-4 py-2.5">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="px-4 py-2.5"><Cell value={val} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.note && (
        <div className="px-4 py-2.5 bg-cream-50 border-t border-cream-100">
          <p className="text-[0.78rem] text-sand-600 leading-relaxed">{data.note}</p>
        </div>
      )}
    </div>
  );
}
