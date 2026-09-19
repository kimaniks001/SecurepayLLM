import { MapPin, Repeat, Briefcase } from 'lucide-react';
import type { ProviderHistoryResponse } from '../types';

interface ProviderHistoryCardProps {
  data: ProviderHistoryResponse;
}

export function ProviderHistoryCard({ data }: ProviderHistoryCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <img src={data.providerAvatar} alt={data.providerName} className="w-8 h-8 rounded-full object-cover ring-1 ring-cream-200" />
        <div>
          <div className="font-display text-sm text-forest-800 leading-tight">{data.providerName}</div>
          <div className="text-[0.7rem] text-sand-500">{data.trade}</div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center animate-reveal-stagger" style={{ animationDelay: '0.15s' }}>
            <Briefcase className="w-4 h-4 text-forest-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{data.completedWork}</div>
            <div className="text-[0.65rem] text-sand-500">completed</div>
          </div>
          <div className="text-center animate-reveal-stagger" style={{ animationDelay: '0.25s' }}>
            <Repeat className="w-4 h-4 text-forest-400 mx-auto mb-1" />
            <div className="text-[0.875rem] font-medium text-forest-800">{data.repeatCustomers}</div>
            <div className="text-[0.65rem] text-sand-500">repeat</div>
          </div>
          <div className="text-center animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
            <MapPin className="w-4 h-4 text-forest-400 mx-auto mb-1" />
            <div className="text-[0.7rem] font-medium text-forest-800 truncate">{data.serviceArea.split('•')[0].trim()}</div>
            <div className="text-[0.65rem] text-sand-500">area</div>
          </div>
        </div>

        <div className="mb-3 animate-reveal-stagger" style={{ animationDelay: '0.4s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">Relevant work</div>
          <div className="flex flex-wrap gap-1.5">
            {data.relevantWork.map((work, i) => (
              <span key={i} className="text-[0.7rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">
                {work}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 h-20 rounded-lg overflow-hidden animate-reveal-stagger" style={{ animationDelay: '0.5s' }}>
          {data.projectPhotos.slice(0, 3).map((photo, i) => (
            <div key={i} className="overflow-hidden bg-cream-100">
              <img src={photo} alt={`Project ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <p className="mt-3 text-[0.7rem] text-sand-400 leading-relaxed">{data.provenance}</p>
      </div>
    </div>
  );
}
