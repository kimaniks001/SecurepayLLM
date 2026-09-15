import { ArrowLeft, Users, ChevronRight } from 'lucide-react';
import type { Circle } from '../types';
import { demoCircles } from '../circleData';

interface CircleDiscoveryListProps {
  onBack: () => void;
  onOpenCircle: (id: string) => void;
  onCreate: () => void;
}

export function CircleDiscoveryList({ onBack, onOpenCircle, onCreate }: CircleDiscoveryListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Circles</h1>
        <p className="text-[0.72rem] text-sand-500 mt-0.5">Trusted economic networks within the Community</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-3">
        {demoCircles.map((circle: Circle) => (
          <button
            key={circle.id}
            onClick={() => onOpenCircle(circle.id)}
            className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-forest-500" />
              </div>
              <div className="flex-1">
                <div className="text-[0.875rem] font-medium text-forest-800">{circle.name}</div>
                <div className="text-[0.72rem] text-sand-500 mt-0.5 line-clamp-2">{circle.purpose}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[0.68rem] text-sand-400">
                  <span>{circle.category}</span>
                  <span>·</span>
                  <span>{circle.location}</span>
                  <span>·</span>
                  <span>{circle.members.length} members</span>
                  <span>·</span>
                  <span className="capitalize">{circle.membershipMode.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
            </div>
          </button>
        ))}

        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-forest-700 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
        >
          Create a Circle
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          No "best Circle" or "top Circle" rankings. Circle membership ≠ endorsement.
        </p>
      </div>
    </div>
  );
}
