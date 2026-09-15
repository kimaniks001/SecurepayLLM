import { MapPin, Store, Wrench } from 'lucide-react';
import type { MapResultResponse } from '../types';

interface MapCardProps {
  data: MapResultResponse;
}

const pinColors: Record<string, { bg: string; text: string; icon: typeof MapPin }> = {
  job: { bg: 'bg-forest-500', text: 'text-cream-50', icon: MapPin },
  provider: { bg: 'bg-forest-300', text: 'text-forest-800', icon: Wrench },
  store: { bg: 'bg-ember-400', text: 'text-cream-50', icon: Store },
};

export function MapCard({ data }: MapCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <MapPin className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.label}</span>
      </div>

      {/* Stylized map placeholder */}
      <div className="relative h-48 bg-forest-50 overflow-hidden animate-reveal-stagger" style={{ animationDelay: '0.2s' }}>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(58,115,85,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(58,115,85,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {data.pins.map((pin, i) => {
          const config = pinColors[pin.color];
          const Icon = config.icon;
          const positions = [
            { top: '30%', left: '40%' },
            { top: '55%', left: '65%' },
            { top: '25%', left: '70%' },
            { top: '60%', left: '25%' },
          ];
          const pos = positions[i % positions.length];
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center animate-settle"
              style={{ ...pos, animationDelay: `${0.3 + i * 0.15}s` }}
            >
              <div className={`w-7 h-7 rounded-full ${config.bg} ${config.text} flex items-center justify-center shadow-soft ring-2 ring-cream-50`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 px-2 py-0.5 rounded-full bg-white/90 shadow-soft text-[0.65rem] text-forest-800 font-medium whitespace-nowrap">
                {pin.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2 animate-reveal-stagger" style={{ animationDelay: '0.4s' }}>
          {data.area}
        </div>
        <div className="space-y-1.5">
          {data.pins.map((pin, i) => (
            <div key={i} className="flex items-center gap-2 text-[0.825rem] animate-reveal-stagger" style={{ animationDelay: `${0.45 + i * 0.08}s` }}>
              <span className={`w-2 h-2 rounded-full ${pinColors[pin.color].bg}`} />
              <span className="text-forest-800 font-medium">{pin.label}</span>
              <span className="text-sand-500">— {pin.sublabel}</span>
            </div>
          ))}
        </div>
        {data.note && (
          <p className="mt-3 pt-3 border-t border-cream-200 text-[0.78rem] text-sand-600 leading-relaxed">
            {data.note}
          </p>
        )}
      </div>
    </div>
  );
}
