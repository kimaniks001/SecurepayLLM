import { MapPin, Navigation, Map } from 'lucide-react';
import type { LocationPickerResponse } from '../types';

interface LocationPickerCardProps {
  data: LocationPickerResponse;
}

export function LocationPickerCard({ data }: LocationPickerCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-fade-in-up">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.label}</span>
      </div>
      <div className="p-4 space-y-2">
        {data.options.map((option, i) => {
          const icons = [Navigation, Map, MapPin];
          const Icon = icons[i % icons.length];
          return (
            <button
              key={i}
              className="w-full flex items-center gap-2.5 text-[0.875rem] text-forest-700 bg-cream-50 hover:bg-cream-100 border border-cream-200 rounded-lg px-3.5 py-2.5 transition-colors active:scale-[0.98]"
            >
              <Icon className="w-4 h-4 text-forest-400" />
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
