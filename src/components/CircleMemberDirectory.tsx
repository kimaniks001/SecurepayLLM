import { ArrowLeft, Users, Store, ArrowRight } from 'lucide-react';
import type { Circle, CircleMember } from '../types';

interface CircleMemberDirectoryProps {
  circle: Circle;
  onBack: () => void;
  onOpenPerson: (personId: string) => void;
}

export function CircleMemberDirectory({ circle, onBack, onOpenPerson }: CircleMemberDirectoryProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {circle.name}
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Members</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-3">
        {circle.members.map((member: CircleMember) => (
          <button
            key={member.personId}
            onClick={() => onOpenPerson(member.personId)}
            className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-sand-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[0.875rem] font-medium text-forest-800">{member.name}</span>
                  {member.actingCapacity === 'business' && <span className="text-[0.6rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">Business</span>}
                </div>
                <div className="text-[0.72rem] text-sand-500 mt-0.5">{member.capabilities.join(' · ')}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[0.68rem] text-sand-400">
                  <span>Member since {member.memberSince}</span>
                  <span>{member.growthContributions} contribution{member.growthContributions !== 1 ? 's' : ''}</span>
                </div>
                {member.businessAssociation && (
                  <div className="flex items-center gap-1 mt-1 text-[0.68rem] text-forest-600">
                    <Store className="w-3 h-3" />
                    {member.businessAssociation}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-sand-400 shrink-0" />
            </div>
          </button>
        ))}

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Membership ≠ endorsement. No "top member" rankings. Browse by capability, business, or location.
        </p>
      </div>
    </div>
  );
}
