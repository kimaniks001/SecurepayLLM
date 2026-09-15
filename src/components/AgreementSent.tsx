import { Send, Clock } from 'lucide-react';
import type { AgreementSentResponse } from '../types';

interface AgreementSentCardProps {
  data: AgreementSentResponse;
}

export function AgreementSentCard({ data }: AgreementSentCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-forest-50 flex items-center justify-center">
            <Send className="w-6 h-6 text-forest-600" />
          </div>
        </div>
        <h2 className="font-display text-lg text-forest-800">{data.title}</h2>
        <p className="mt-1 text-[0.875rem] text-sand-600">Your side has been set securely.</p>
        <p className="mt-2 text-[0.825rem] text-sand-500">{data.recipientName} still needs to:</p>
        <div className="mt-3 space-y-2">
          {data.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5 justify-center">
              <div className="w-5 h-5 rounded-full border border-forest-300 flex items-center justify-center">
                <span className="text-[0.65rem] font-medium text-forest-600">{i + 1}</span>
              </div>
              <span className="text-[0.825rem] text-forest-800">{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[0.75rem] text-sand-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Waiting for {data.recipientName}</span>
        </div>
        <p className="mt-3 text-[0.7rem] text-sand-400">Demo SecureLink — no real invitation sent</p>
      </div>
    </div>
  );
}
