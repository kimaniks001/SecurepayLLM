import type { CompareRow } from '../result';

/**
 * Facts side by side -- differences shown, nothing chosen. Deliberately NOT a table: at 320px a table
 * either scrolls sideways or crushes text, so each fact is a small group listing every item's value
 * under a label. There is no winner column, no highlight and no colour that could read as a preference.
 * A fact identical for every item is simply labelled "same" and quiet.
 */
export function FactCompare({ heads, rows }: { heads: string[]; rows: CompareRow[] }) {
  return <div className="space-y-4">
    <ol className="flex flex-wrap gap-x-3 gap-y-1 text-[0.8rem] text-sand-600" aria-label="Comparing">
      {heads.map((head, i) => <li key={i}><span className="font-medium text-forest-800">{String.fromCharCode(65 + i)}</span> {head}</li>)}
    </ol>
    <dl className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white/85">
      {rows.map(row => {
        const shown = row.values.map(v => v ?? '—');
        const same = shown.every(v => v === shown[0]);
        return <div key={row.label} className="px-4 py-3">
          <dt className="flex items-baseline justify-between text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">{row.label}{same && <span className="font-normal normal-case tracking-normal text-sand-400">same</span>}</dt>
          <dd className="mt-1.5 space-y-1">
            {same ? <p className="text-[0.92rem] text-forest-800 break-words">{shown[0]}</p>
              : shown.map((value, i) => <p key={i} className="flex gap-2 text-[0.92rem] text-forest-800 break-words"><span className="w-4 shrink-0 text-[0.75rem] font-medium leading-[1.4rem] text-sand-500">{String.fromCharCode(65 + i)}</span><span className="min-w-0">{value}</span></p>)}
          </dd>
        </div>;
      })}
    </dl>
  </div>;
}
