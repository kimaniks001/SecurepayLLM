import { MessageSquare, Tag } from 'lucide-react';
import type { CommunityDiscussionResponse } from '../types';

interface CommunityDiscussionCardProps {
  data: CommunityDiscussionResponse;
}

export function CommunityDiscussionCard({ data }: CommunityDiscussionCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <MessageSquare className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">From the {data.community}</span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base text-forest-800 leading-tight animate-reveal-stagger" style={{ animationDelay: '0.15s' }}>
          {data.topic}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-[0.8rem] text-sand-600 animate-reveal-stagger" style={{ animationDelay: '0.25s' }}>
          <span className="font-medium text-forest-700">{data.replies}</span>
          <span>useful replies</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
          {data.themes.map((theme, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[0.7rem] text-sand-600 bg-cream-100 border border-cream-200 rounded-full px-2 py-0.5">
              <Tag className="w-2.5 h-2.5" />
              {theme}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] text-sand-400 leading-relaxed">{data.provenance}</p>
      </div>
    </div>
  );
}
