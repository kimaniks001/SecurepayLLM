import { UserCheck } from 'lucide-react';
import type { JoinedStatusResponse } from '../types';

interface JoinedStatusCardProps {
  data: JoinedStatusResponse;
}

export function JoinedStatusCard({ data }: JoinedStatusCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-forest-600" />
          </div>
        </div>
        <h2 className="font-display text-lg text-forest-800">{data.title}</h2>
        <p className="mt-2 text-[0.875rem] text-sand-600 leading-relaxed">{data.text}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-500" />
          <span className="text-[0.75rem] font-medium text-forest-700">{data.status}</span>
        </div>
      </div>
    </div>
  );
}
