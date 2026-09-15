import { Wallet } from 'lucide-react';
import type { MoneyReadyResponse } from '../types';

interface MoneyReadyCardProps {
  data: MoneyReadyResponse;
}

export function MoneyReadyCard({ data }: MoneyReadyCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-forest-500" />
          </div>
        </div>
        <h2 className="font-display text-base text-forest-800">{data.title}</h2>
        <p className="mt-2 text-[0.875rem] text-sand-600 leading-relaxed">{data.text}</p>
        <p className="mt-3 text-[0.7rem] text-sand-400">{data.agreementRef}</p>
        <p className="mt-2 text-[0.7rem] text-sand-400">Money experience — coming from the authoritative SecurePay Money flow</p>
      </div>
    </div>
  );
}
