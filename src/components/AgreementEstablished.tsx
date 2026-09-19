import { ShieldCheck, Check } from 'lucide-react';
import type { AgreementEstablishedResponse } from '../types';

interface AgreementEstablishedCardProps {
  data: AgreementEstablishedResponse;
}

export function AgreementEstablishedCard({ data }: AgreementEstablishedCardProps) {
  return (
    <div className="rounded-2xl border border-forest-300 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-forest-50 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-forest-600" />
          </div>
        </div>
        <h2 className="font-display text-lg text-forest-800">Agreement Established</h2>
        <p className="mt-1 text-[0.875rem] text-sand-600">{data.title}</p>
        <p className="mt-1 text-[0.78rem] text-sand-500">Both sides have confirmed the current agreement version.</p>

        <div className="mt-3 flex items-center justify-center gap-2 text-[0.75rem] text-forest-600">
          <Check className="w-3.5 h-3.5" />
          <span>James confirmed Demo v2</span>
          <span className="text-sand-300">·</span>
          <Check className="w-3.5 h-3.5" />
          <span>Peter confirmed Demo v2</span>
        </div>

        <div className="mt-4 rounded-xl bg-cream-50 border border-cream-200 px-4 py-3 text-left space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Work</span>
            <span className="text-[0.825rem] text-forest-800">{data.work}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Price</span>
            <span className="text-[0.825rem] font-medium text-forest-800">{data.price}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Completion</span>
            <span className="text-[0.825rem] text-forest-800">{data.completion}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Materials</span>
            <span className="text-[0.825rem] text-forest-800">{data.materials}</span>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />
          <span className="text-[0.75rem] font-medium text-forest-700">{data.status}</span>
        </div>
      </div>
    </div>
  );
}
