import { ArrowLeft, Users, Sparkles, TrendingUp, ChevronRight, Plus } from 'lucide-react';
import type { Circle, CircleMember } from '../types';
import { CommunityObjectCard } from './CommunityObjectCard';
import { demoCommunityObjects } from '../communityData';

interface CircleHomeProps {
  circle: Circle;
  onBack: () => void;
  onOpenMembers: () => void;
  onOpenEconomicStory: () => void;
  onOpenObject: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onAskAgent: () => void;
}

export function CircleHome({ circle, onBack, onOpenMembers, onOpenEconomicStory, onOpenObject, onCreate, onJoin, onAskAgent }: CircleHomeProps) {
  const circleObjects = demoCommunityObjects.filter((o) =>
    o.objectType === 'need' || o.objectType === 'opportunity' || o.objectType === 'question' || o.objectType === 'discussion' || o.objectType === 'work_story' || o.objectType === 'store_offer_reference'
  );
  const needs = circleObjects.filter((o) => o.objectType === 'need' || o.objectType === 'opportunity');
  const questions = circleObjects.filter((o) => o.objectType === 'question' || o.objectType === 'discussion');
  const stories = circleObjects.filter((o) => o.objectType === 'work_story');
  const offers = circleObjects.filter((o) => o.objectType === 'store_offer_reference');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{circle.name}</h1>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">{circle.category} · {circle.location} · {circle.members.length} members</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Purpose */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Purpose</div>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed">{circle.purpose}</p>
        </div>

        {/* Agent entry */}
        <button
          onClick={onAskAgent}
          className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] font-medium text-forest-600">
            <Sparkles className="w-3.5 h-3.5" />
            What are you trying to make happen in this Circle?
          </span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">Find help, share work, pass opportunities, or ask a question</p>
        </button>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Members who may be able to help</div>
            <button onClick={onOpenMembers} className="flex items-center gap-1 text-[0.72rem] text-forest-600 hover:text-forest-700">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {circle.members.slice(0, 3).map((member: CircleMember) => (
              <div key={member.personId} className="rounded-xl border border-cream-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-sand-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.875rem] font-medium text-forest-800">{member.name}</div>
                    <div className="text-[0.72rem] text-sand-500">{member.capabilities.join(' · ')}</div>
                  </div>
                  {member.actingCapacity === 'business' && <span className="text-[0.6rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">Business</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Work & Opportunities */}
        {needs.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Work & opportunities</div>
            <div className="space-y-2">
              {needs.map((obj) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Questions & knowledge</div>
            <div className="space-y-2">
              {questions.map((obj) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Work Stories */}
        {stories.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Work stories</div>
            <div className="space-y-2">
              {stories.map((obj) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Store Offers */}
        {offers.length > 0 && (
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Store offers</div>
            <div className="space-y-2">
              {offers.map((obj) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Economic story */}
        <button
          onClick={onOpenEconomicStory}
          className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-left hover:border-forest-300 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-forest-500" />
            <span className="text-[0.825rem] font-medium text-forest-800">Circle economic story</span>
          </div>
          <p className="text-[0.72rem] text-sand-500">See how work moves through the network — brought in, passed, and originated</p>
        </button>

        {/* Rules */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Circle rules</div>
          <ul className="space-y-1">
            {circle.rules.map((rule, i) => (
              <li key={i} className="text-[0.825rem] text-forest-800 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Membership */}
        <div className="flex gap-2">
          <button
            onClick={onJoin}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Join Circle
          </button>
          <button
            onClick={onCreate}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
          >
            Create Circle
          </button>
        </div>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Circle membership ≠ endorsement. Capability ≠ verified qualification. Circle ≠ Agreement party. Circle growth credit ≠ Money.
        </p>
      </div>
    </div>
  );
}
