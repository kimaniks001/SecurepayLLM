import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/dna/Button';

/** The Agreement's compact door into canonical Money. It states nothing about money: Money itself reads and shows the truth. */
export function MoneyDoorway({ title, versionLabel, canOpen, onOpen, onBack }: {
  title: string; versionLabel: string | null; canOpen: boolean; onOpen: () => void; onBack: () => void;
}) {
  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto w-full space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back to the Agreement</button>
      <div className="rounded-2xl border border-cream-200 bg-white p-5 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-sand-500">Money for</p>
          <h2 className="font-display text-xl text-forest-800">{title}{versionLabel ? <span className="text-sand-500"> · {versionLabel}</span> : null}</h2>
        </div>
        <p className="text-sm text-sand-600">Money shows what SecurePay says about this Agreement’s funding, Payment Ready, money activity and release. Opening it doesn’t start or move any money.</p>
        <Button onClick={onOpen} disabled={!canOpen}>Open Money</Button>
      </div>
    </div>
  );
}
