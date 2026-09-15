import { Check, X } from 'lucide-react';
import type { ComparisonResponse } from '../types';

interface ComparisonViewProps {
  data: ComparisonResponse;
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

export function ComparisonView({ data }: ComparisonViewProps) {
  return (
    <>
      {/* Desktop: table */}
      <div className="hidden sm:block rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-200">
                <th className="text-left text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide px-4 py-3 w-32">
                  Compare
                </th>
                {data.providers.map((p, i) => (
                  <th key={p.id} className="text-left px-4 py-3 min-w-[120px] animate-reveal-stagger" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                    <div className="flex items-center gap-2">
                      <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-cream-200" />
                      <div>
                        <div className="font-display text-sm text-forest-800 leading-tight">{p.name.split(' ')[0]}</div>
                        <div className="text-[0.7rem] text-sand-500">{p.trade.split(' &')[0]}</div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className={`border-b border-cream-100 last:border-0 ${i % 2 === 0 ? 'bg-cream-50/50' : ''} animate-reveal-stagger`} style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                  <td className="text-[0.78rem] text-sand-600 font-medium px-4 py-3 align-middle">{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="px-4 py-3 align-middle">
                      <Cell value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: vertical stacked cards */}
      <div className="sm:hidden space-y-3">
        {data.providers.map((provider, pi) => (
          <div
            key={provider.id}
            className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-reveal-stagger"
            style={{ animationDelay: `${0.1 + pi * 0.15}s` }}
          >
            <div className="px-4 py-3 border-b border-cream-100 flex items-center gap-2.5">
              <img src={provider.avatar} alt={provider.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-cream-200" />
              <div>
                <div className="font-display text-sm text-forest-800 leading-tight">{provider.name}</div>
                <div className="text-[0.7rem] text-sand-500">{provider.trade.split(' &')[0]}</div>
              </div>
            </div>
            <div className="px-4 py-2">
              {data.rows.map((row, ri) => (
                <div key={ri} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                  <span className="text-[0.78rem] text-sand-600 font-medium">{row.label}</span>
                  <Cell value={row.values[pi]} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
