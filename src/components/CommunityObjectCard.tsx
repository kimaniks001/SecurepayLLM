import { HelpCircle, HandHelping, Briefcase, Camera, MessageSquare, BookOpen, Store, ChevronRight, MapPin } from 'lucide-react';
import type { CommunityObject, CommunityObjectType } from '../types';

const typeConfig: Record<CommunityObjectType, { icon: typeof HelpCircle; label: string; classes: string }> = {
  question: { icon: HelpCircle, label: 'Question', classes: 'text-forest-600 bg-forest-50' },
  need: { icon: HandHelping, label: 'Need', classes: 'text-ember-600 bg-ember-50' },
  opportunity: { icon: Briefcase, label: 'Opportunity', classes: 'text-forest-600 bg-forest-50' },
  work_story: { icon: Camera, label: 'Work Story', classes: 'text-sand-600 bg-cream-50' },
  discussion: { icon: MessageSquare, label: 'Discussion', classes: 'text-sand-600 bg-cream-50' },
  experience: { icon: BookOpen, label: 'Learning', classes: 'text-sand-600 bg-cream-50' },
  store_offer_reference: { icon: Store, label: 'Store Offer', classes: 'text-forest-600 bg-forest-50' },
};

interface CommunityObjectCardProps {
  object: CommunityObject;
  onOpen: (id: string) => void;
}

export function CommunityObjectCard({ object, onOpen }: CommunityObjectCardProps) {
  const config = typeConfig[object.objectType];
  const Icon = config.icon;

  return (
    <button
      onClick={() => onOpen(object.id)}
      className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 hover:shadow-soft transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.classes}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[0.65rem] font-medium rounded-full px-2 py-0.5 ${config.classes}`}>{config.label}</span>
            {object.status !== 'active' && (
              <span className="text-[0.65rem] font-medium text-sand-400 bg-cream-50 rounded-full px-2 py-0.5 capitalize">{object.status}</span>
            )}
          </div>
          <div className="text-[0.875rem] font-medium text-forest-800 leading-tight">{object.title}</div>
          <div className="text-[0.72rem] text-sand-500 mt-0.5 line-clamp-2">{object.body}</div>
          <div className="flex items-center gap-3 mt-1.5 text-[0.68rem] text-sand-400">
            <span>{object.author}</span>
            {object.generalLocation && (
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{object.generalLocation}</span>
            )}
            <span>{object.createdAt}</span>
            {object.responses.length > 0 && <span>{object.responses.length} response{object.responses.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
      </div>
    </button>
  );
}
