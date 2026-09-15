import { MapPin, Calendar, MessageCircle, Layers, Repeat, Eye, GitCompare } from 'lucide-react';
import type { Provider } from '../types';

interface ProviderCardProps {
  provider: Provider;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
  dimmed?: boolean;
}

export function ProviderCard({ provider, selected, onSelect, compact, dimmed }: ProviderCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border bg-white transition-card overflow-hidden ${
        selected
          ? 'border-forest-400 shadow-lifted ring-1 ring-forest-300'
          : dimmed
          ? 'border-cream-200 shadow-soft opacity-60'
          : 'border-cream-200 shadow-card hover:shadow-lifted hover:border-forest-200'
      }`}
    >
      {/* Project thumbnails */}
      <div className="flex gap-0.5 h-28 overflow-hidden">
        {provider.projectThumbs.slice(0, 4).map((thumb, i) => (
          <div
            key={i}
            className="flex-1 overflow-hidden bg-cream-100"
            style={{ flex: i === 0 ? '1.4' : '1' }}
          >
            <img
              src={thumb}
              alt={`${provider.name} project ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        ))}
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <img
            src={provider.avatar}
            alt={provider.name}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-cream-200 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg leading-tight text-forest-800 truncate">
              {provider.name}
            </h3>
            <p className="text-[0.8rem] text-sand-600 mt-0.5">{provider.trade}</p>
          </div>
        </div>

        {/* Tags */}
        {provider.tags && provider.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {provider.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[0.7rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Capability */}
        {!compact && (
          <p className="text-[0.825rem] leading-relaxed text-sand-700 mt-3 line-clamp-2">
            {provider.capability}
          </p>
        )}

        {/* Meta */}
        <div className="grid grid-cols-1 gap-2 mt-3 text-[0.8rem]">
          <div className="flex items-center gap-2 text-sand-600">
            <MapPin className="w-3.5 h-3.5 text-forest-400 shrink-0" />
            <span className="truncate">{provider.serviceArea}</span>
          </div>
          <div className="flex items-center gap-2 text-sand-600">
            <Calendar className="w-3.5 h-3.5 text-forest-400 shrink-0" />
            <span>{provider.availability}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sand-600">
              <Layers className="w-3.5 h-3.5 text-forest-400 shrink-0" />
              <span className="font-medium text-forest-700">{provider.labourRange}</span>
            </div>
          </div>
          {provider.completedWork > 0 && (
            <div className="flex items-center gap-2 text-sand-500">
              <span className="text-[0.78rem]">
                <span className="font-medium text-forest-700">{provider.completedWork}</span> completed agreements
              </span>
            </div>
          )}
          {provider.repeatCustomers > 0 && (
            <div className="flex items-center gap-2 text-sand-500">
              <Repeat className="w-3.5 h-3.5 text-forest-300 shrink-0" />
              <span className="text-[0.78rem]">{provider.repeatCustomers} repeat counterparties</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-cream-200">
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[0.8rem] font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-lg px-3 py-2 transition-colors active:scale-[0.98]">
            <Eye className="w-3.5 h-3.5" />
            View work
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[0.8rem] font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-lg px-3 py-2 transition-colors active:scale-[0.98]">
            <GitCompare className="w-3.5 h-3.5" />
            Compare
          </button>
          <button
            onClick={onSelect}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[0.8rem] font-medium rounded-lg px-3 py-2 transition-colors active:scale-[0.98] ${
              selected
                ? 'bg-forest-600 text-cream-50'
                : 'bg-ember-50 text-ember-700 hover:bg-ember-100'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {selected ? 'Selected' : `Talk to ${provider.name.split(' ')[0]}`}
          </button>
        </div>
      </div>

      {selected && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-forest-500 text-cream-50 text-[0.7rem] font-medium shadow-soft animate-settle">
          Chosen
        </div>
      )}
    </div>
  );
}
