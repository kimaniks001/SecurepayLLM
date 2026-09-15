import { useState } from 'react';
import { ArrowLeft, Sparkles, Check } from 'lucide-react';

interface CircleCreateFlowProps {
  onBack: () => void;
  onPublish: () => void;
}

export function CircleCreateFlow({ onBack, onPublish }: CircleCreateFlowProps) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<'input' | 'review'>('input');

  const handleAnalyze = () => {
    if (input.trim()) setStage('review');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Create a Circle</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {stage === 'input' && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-forest-500" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Describe your Circle</span>
            </div>
            <p className="text-[0.825rem] text-sand-600 mb-3">
              Tell SecurePay what kind of trusted network you want to build.
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. I want a Circle for construction people around Nairobi."
              className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 min-h-[80px] resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={!input.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-50"
            >
              Structure my Circle
            </button>
          </div>
        )}

        {stage === 'review' && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-forest-500" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Circle taking shape</span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Name</span>
                <span className="text-forest-800 font-medium">Construction Circle</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Category</span>
                <span className="text-forest-800">Construction</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Location</span>
                <span className="text-forest-800">Nairobi</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Membership</span>
                <span className="text-forest-800">Request to join</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Organizer</span>
                <span className="text-forest-800">James Kimani — Personal</span>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-[0.72rem] text-sand-500 mb-1">Purpose</div>
              <p className="text-[0.825rem] text-forest-800">Help construction professionals and businesses discover work, share capability, pass opportunities and build trusted working relationships.</p>
            </div>
            <button
              onClick={onPublish}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Create Circle
            </button>
          </div>
        )}

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Circle creates trust, visibility and opportunity — not obligation. Membership ≠ endorsement. Circle ≠ Agreement party.
        </p>
      </div>
    </div>
  );
}
