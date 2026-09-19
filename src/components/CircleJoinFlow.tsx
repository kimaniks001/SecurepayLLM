import { ArrowLeft, Users, Check, ShieldCheck } from 'lucide-react';
import type { Circle } from '../types';

interface CircleJoinFlowProps {
  circle: Circle;
  onBack: () => void;
  onJoin: () => void;
}

export function CircleJoinFlow({ circle, onBack, onJoin }: CircleJoinFlowProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Join {circle.name}</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">About this Circle</span>
          </div>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed mb-3">{circle.purpose}</p>
          <div className="space-y-1.5 text-[0.78rem]">
            <div className="flex items-baseline justify-between">
              <span className="text-sand-600">Category</span>
              <span className="text-forest-800">{circle.category}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sand-600">Location</span>
              <span className="text-forest-800">{circle.location}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sand-600">Members</span>
              <span className="text-forest-800">{circle.members.length}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sand-600">Membership</span>
              <span className="text-forest-800 capitalize">{circle.membershipMode.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sand-600">Organizer</span>
              <span className="text-forest-800">{circle.organizer}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-sand-400" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">What joining means</span>
          </div>
          <ul className="space-y-1 text-[0.825rem] text-forest-800">
            <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />You become a member of this Circle.</li>
            <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />You can see and participate in Circle activity.</li>
            <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />You can share opportunities and pass work.</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-cream-100">
            <p className="text-[0.72rem] text-sand-500">Joining this Circle does NOT mean:</p>
            <ul className="space-y-0.5 mt-1 text-[0.72rem] text-sand-400">
              <li>· You are endorsed or verified by the Circle</li>
              <li>· You are obligated to hire or work with members</li>
              <li>· You are party to any agreement</li>
              <li>· You get access to private agreements or Money</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onJoin}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          {circle.membershipMode === 'request_to_join' ? 'Request to join' : 'Join Circle'}
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Joining Circle ≠ joining Agreement. Membership ≠ endorsement.
        </p>
      </div>
    </div>
  );
}
