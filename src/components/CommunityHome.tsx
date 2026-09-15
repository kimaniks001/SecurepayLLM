import { useState } from 'react';
import { Search, Users, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { CommunityObject } from '../types';
import { CommunityObjectCard } from './CommunityObjectCard';
import { demoPeople, demoBusinesses, searchCommunity } from '../communityData';

interface CommunityHomeProps {
  onOpenObject: (id: string) => void;
  onOpenPerson: (id: string) => void;
  onOpenBusiness: (id: string) => void;
  onCreate: () => void;
  onStartConversation: () => void;
  onOpenCircles: () => void;
}

export function CommunityHome({ onOpenObject, onOpenPerson, onOpenBusiness, onCreate, onStartConversation, onOpenCircles }: CommunityHomeProps) {
  const [query, setQuery] = useState('');
  const results = searchCommunity(query);

  const needs = results.filter((o) => o.objectType === 'need' || o.objectType === 'opportunity');
  const questions = results.filter((o) => o.objectType === 'question' || o.objectType === 'discussion');
  const stories = results.filter((o) => o.objectType === 'work_story');
  const offers = results.filter((o) => o.objectType === 'store_offer_reference');
  const learning = results.filter((o) => o.objectType === 'experience');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <h1 className="font-display text-xl text-forest-800 font-medium">Community</h1>
          <p className="text-[0.85rem] text-sand-500 mt-0.5">The trade neighbourhood. Find help, ask questions, share work, discover opportunities.</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, businesses, questions, needs, work..."
            className="w-full rounded-xl border border-cream-200 bg-white pl-10 pr-4 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
          />
        </div>

        {/* Circles */}
        <button
          onClick={onOpenCircles}
          className="w-full mb-4 rounded-xl border border-forest-200 bg-forest-50/30 px-4 py-3 text-left hover:bg-forest-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] font-medium text-forest-700">
            <Users className="w-3.5 h-3.5" />
            Your Circles
          </span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">Trusted economic networks — Construction Circle, Creative Professionals, and more</p>
        </button>

        {/* Composer entry */}
        <button
          onClick={onCreate}
          className="w-full mb-5 rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] font-medium text-forest-600">
            <Sparkles className="w-3.5 h-3.5" />
            What would you like to share with the community?
          </span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">Ask a question, post a need, share work, or offer an opportunity</p>
        </button>

        {/* Needs & Opportunities */}
        {needs.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Needs & opportunities</div>
            <div className="space-y-2">
              {needs.map((obj: CommunityObject) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Questions & discussions</div>
            <div className="space-y-2">
              {questions.map((obj: CommunityObject) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Work Stories */}
        {stories.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Work stories</div>
            <div className="space-y-2">
              {stories.map((obj: CommunityObject) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Store Offers */}
        {offers.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Offers from stores</div>
            <div className="space-y-2">
              {offers.map((obj: CommunityObject) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* Learning */}
        {learning.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Learn from the community</div>
            <div className="space-y-2">
              {learning.map((obj: CommunityObject) => (
                <CommunityObjectCard key={obj.id} object={obj} onOpen={onOpenObject} />
              ))}
            </div>
          </div>
        )}

        {/* People & Businesses */}
        <div className="mb-5">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">People & businesses</div>
          <div className="space-y-2">
            {demoPeople.map((person) => (
              <button
                key={person.id}
                onClick={() => onOpenPerson(person.id)}
                className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-sand-500" />
                </div>
                <div className="flex-1">
                  <div className="text-[0.875rem] font-medium text-forest-800">{person.name}</div>
                  <div className="text-[0.72rem] text-sand-500">{person.capabilities.join(' · ')}</div>
                </div>
                {person.verifiedQualification && <span className="text-[0.6rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">Verified</span>}
              </button>
            ))}
            {demoBusinesses.map((biz) => (
              <button
                key={biz.id}
                onClick={() => onOpenBusiness(biz.id)}
                className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-sand-500" />
                </div>
                <div className="flex-1">
                  <div className="text-[0.875rem] font-medium text-forest-800">{biz.name}</div>
                  <div className="text-[0.72rem] text-sand-500">{biz.whatTheyDo}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {results.length === 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-8 text-center">
            <p className="text-[0.875rem] text-sand-600">No results for "{query}".</p>
            <button onClick={onStartConversation} className="mt-2 flex items-center gap-1.5 text-[0.825rem] font-medium text-forest-600 hover:text-forest-700 mx-auto">
              Tell SecurePay what you need
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Agent */}
        <button
          onClick={onStartConversation}
          className="w-full mt-4 rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] text-forest-600 font-medium">
            <MessageCircle className="w-3.5 h-3.5" />
            Ask SecurePay to find help in the community
          </span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">SecurePay can surface people, businesses, and offers that match what you need</p>
        </button>
      </div>
    </div>
  );
}
