import { Users, MessageSquare } from 'lucide-react';
import type { CommunityResultResponse } from '../types';

interface CommunityResultCardProps {
  data: CommunityResultResponse;
}

export function CommunityResultCard({ data }: CommunityResultCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-fade-in-up hover:shadow-lifted transition-card cursor-pointer">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-cream-100">
        <div className="w-7 h-7 rounded-full bg-forest-50 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-forest-500" />
        </div>
        <div className="flex-1">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{data.community} community</div>
          <div className="text-[0.875rem] font-medium text-forest-700">{data.topic}</div>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[0.825rem] text-sand-700 leading-relaxed line-clamp-2">{data.excerpt}</p>
        <div className="flex items-center gap-1.5 mt-2 text-[0.75rem] text-sand-500">
          <MessageSquare className="w-3 h-3" />
          <span>{data.replies} replies</span>
        </div>
      </div>
    </div>
  );
}
