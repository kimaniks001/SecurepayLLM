import type { CommunityStoryResponse } from '../types';

interface CommunityStoryCardProps {
  data: CommunityStoryResponse;
}

export function CommunityStoryCard({ data }: CommunityStoryCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="h-32 overflow-hidden bg-cream-100 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <img src={data.imageUrl} alt={data.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="text-[0.7rem] font-medium text-forest-600 uppercase tracking-wide mb-1 animate-reveal-stagger" style={{ animationDelay: '0.15s' }}>
          From the {data.community}
        </div>
        <h3 className="font-display text-base text-forest-800 leading-tight animate-reveal-stagger" style={{ animationDelay: '0.2s' }}>
          {data.title}
        </h3>
        <p className="text-[0.78rem] text-sand-500 mt-0.5 animate-reveal-stagger" style={{ animationDelay: '0.25s' }}>
          Posted by {data.author}
        </p>
        <div className="mt-3 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">What changed</div>
          <ul className="space-y-1">
            {data.whatChanged.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[0.825rem] text-forest-800">
                <span className="w-1 h-1 rounded-full bg-forest-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 rounded-xl bg-cream-50 border border-cream-200 px-3 py-2 animate-reveal-stagger" style={{ animationDelay: '0.45s' }}>
          <p className="text-[0.78rem] text-sand-700 leading-relaxed">
            <span className="font-medium text-forest-700">Useful note: </span>
            {data.usefulNote}
          </p>
        </div>
        <p className="mt-2 text-[0.7rem] text-sand-400 leading-relaxed">{data.provenance}</p>
      </div>
    </div>
  );
}
