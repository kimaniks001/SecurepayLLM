import { Sparkles } from 'lucide-react';
import type { SourceReference } from '../types';

interface SourceReferenceBadgeProps {
  source: SourceReference;
  compact?: boolean;
}

export function SourceReferenceBadge({ source, compact }: SourceReferenceBadgeProps) {
  const label = source.sourceType === 'store_offer' ? 'Store Offer'
    : source.sourceType === 'community_need' ? 'Community Need'
    : source.sourceType === 'community_opportunity' ? 'Community Opportunity'
    : source.sourceType === 'work_story' ? 'Work Story'
    : source.sourceType === 'person' ? 'Person Profile'
    : source.sourceType === 'circle_opportunity' ? 'Circle Opportunity'
    : source.sourceType === 'circle_need' ? 'Circle Need'
    : 'Source';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} bg-forest-50 border border-forest-100`}>
      <Sparkles className={`w-3 h-3 text-forest-500`} />
      <span className={`text-forest-700 ${compact ? 'text-[0.65rem]' : 'text-[0.7rem]'} font-medium`}>{label}</span>
      {source.sourceIntroducerIdentity && (
        <span className="text-sand-500 text-[0.65rem]">· via {source.sourceIntroducerIdentity}</span>
      )}
    </div>
  );
}
