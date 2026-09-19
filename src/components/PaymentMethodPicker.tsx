import { Smartphone, Building2, ArrowRight } from 'lucide-react';
import type { RailOption } from '../types';

interface PaymentMethodPickerProps {
  rails: RailOption[];
  onSelect: (rail: RailOption) => void;
}

const railIcon: Record<string, typeof Smartphone> = {
  mpesa_stk: Smartphone,
  pesalink: Building2,
  partner_bank: Building2,
  other: Building2,
};

export function PaymentMethodPicker({ rails, onSelect }: PaymentMethodPickerProps) {
  const availableRails = rails.filter((r) => r.available);

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">How would you like to pay?</div>
      <div className="space-y-2">
        {rails.map((rail) => {
          const Icon = railIcon[rail.id] || Building2;
          const isAvailable = rail.available;
          return (
            <button
              key={rail.id}
              onClick={() => isAvailable && onSelect(rail)}
              disabled={!isAvailable}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left ${
                isAvailable
                  ? 'border-cream-200 hover:border-forest-300 hover:bg-cream-50'
                  : 'border-cream-200 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-sand-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[0.875rem] font-medium text-forest-800">{rail.label}</span>
                  {rail.demoOnly && <span className="text-[0.6rem] font-medium text-ember-600 bg-ember-50 rounded-full px-1.5 py-0.5">DEMO</span>}
                  {rail.comingLater && <span className="text-[0.6rem] font-medium text-sand-400 bg-cream-50 rounded-full px-1.5 py-0.5">Coming later</span>}
                </div>
                <div className="text-[0.72rem] text-sand-500">{rail.description}</div>
                {rail.feeNote && <div className="text-[0.68rem] text-sand-400 mt-0.5">{rail.feeNote}</div>}
              </div>
              {isAvailable && <ArrowRight className="w-3.5 h-3.5 text-sand-400 shrink-0" />}
            </button>
          );
        })}
      </div>
      {availableRails.length === 0 && (
        <p className="text-[0.78rem] text-sand-500 mt-3">No payment methods are currently available for this agreement.</p>
      )}
    </div>
  );
}
