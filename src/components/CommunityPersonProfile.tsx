import { ArrowLeft, MapPin, ShieldCheck, Briefcase, MessageCircle, Store, ArrowRight } from 'lucide-react';
import type { CommunityPerson } from '../types';

interface CommunityPersonProfileProps {
  person: CommunityPerson;
  onBack: () => void;
  onViewBusiness: (id: string) => void;
  onMessage: () => void;
}

export function CommunityPersonProfile({ person, onBack, onViewBusiness, onMessage }: CommunityPersonProfileProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <h1 className="font-display text-lg text-forest-800 font-medium">{person.name}</h1>
          <div className="text-[0.78rem] text-sand-500 mt-0.5">
            {person.capacity === 'business' ? 'Business capacity' : 'Personal capacity'}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {person.capabilities.map((cap, i) => (
              <span key={i} className="text-[0.72rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">
                {cap}
              </span>
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            {person.serviceArea && (
              <div className="flex items-center gap-1.5 text-[0.78rem] text-sand-600">
                <MapPin className="w-3.5 h-3.5 text-sand-400" />
                {person.serviceArea}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[0.78rem]">
              {person.verifiedQualification ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-forest-500" />
                  <span className="text-forest-600">Verified qualification</span>
                </>
              ) : (
                <>
                  <Briefcase className="w-3.5 h-3.5 text-sand-400" />
                  <span className="text-sand-500">Self-described capability</span>
                </>
              )}
            </div>
          </div>

          {person.businessAssociation && (
            <button
              onClick={() => onViewBusiness(person.id)}
              className="mt-3 flex items-center gap-2 text-[0.78rem] text-forest-600 hover:text-forest-700"
            >
              <Store className="w-3.5 h-3.5" />
              {person.businessAssociation}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <div className="mt-3 pt-3 border-t border-cream-100 flex gap-4 text-[0.72rem] text-sand-500">
            <span>{person.publicWorkStories} work stories</span>
            <span>{person.communityContributions} contributions</span>
          </div>
        </div>

        <button
          onClick={onMessage}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Ask SecurePay about this person
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Self-described capability is not the same as verified qualification. Community discovery is not endorsement.
        </p>
      </div>
    </div>
  );
}
