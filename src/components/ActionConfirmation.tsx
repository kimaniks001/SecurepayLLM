import { CheckCircle2 } from 'lucide-react';
import type { ActionConfirmationResponse } from '../types';

interface ActionConfirmationCardProps {
  data: ActionConfirmationResponse;
}

export function ActionConfirmationCard({ data }: ActionConfirmationCardProps) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-xl bg-forest-50 border border-forest-100 px-3.5 py-2.5 animate-fade-in-up">
      <CheckCircle2 className="w-4 h-4 text-forest-500 shrink-0" />
      <div>
        <div className="text-[0.825rem] font-medium text-forest-700">{data.action}</div>
        <div className="text-[0.75rem] text-sand-500">{data.detail}</div>
      </div>
    </div>
  );
}
