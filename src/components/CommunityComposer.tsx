import { useState } from 'react';
import { ArrowLeft, Sparkles, Check, ShieldCheck } from 'lucide-react';

interface CommunityComposerProps {
  onBack: () => void;
  onPublish: () => void;
}

export function CommunityComposer({ onBack, onPublish }: CommunityComposerProps) {
  const [input, setInput] = useState('');
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [showPrivacyReview, setShowPrivacyReview] = useState(false);

  const handleAnalyze = () => {
    const lower = input.toLowerCase();
    if (lower.includes('need') || lower.includes('required') || lower.includes('looking for'))
      setDetectedType('Need');
    else if (lower.includes('opportunity') || lower.includes('available') || lower.includes('required for'))
      setDetectedType('Opportunity');
    else if (lower.includes('finished') || lower.includes('completed') || lower.includes('lesson'))
      setDetectedType('Work Story');
    else if (lower.includes('?') || lower.includes('how') || lower.includes('what') || lower.includes('should'))
      setDetectedType('Question');
    else
      setDetectedType('Discussion');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Share with the community</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">What would you like to share?</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setDetectedType(null); }}
            placeholder="e.g. I need an electrician tomorrow in Kilimani to inspect a burnt distribution board."
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 min-h-[80px] resize-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={!input.trim()}
            className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-50"
          >
            Analyze
          </button>
        </div>

        {detectedType && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">SecurePay understands</div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[0.825rem] font-medium text-forest-800">{detectedType}</span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Posting as</span>
                <span className="text-forest-800">James Kimani — Personal</span>
              </div>
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Visibility</span>
                <span className="text-forest-800">Public</span>
              </div>
            </div>
            <button
              onClick={() => setShowPrivacyReview(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-700 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-800 transition-colors"
            >
              Review and publish
            </button>
          </div>
        )}
      </div>

      {showPrivacyReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm animate-quiet-in" onClick={() => setShowPrivacyReview(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-forest-500" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">What will be visible</span>
            </div>
            <div className="space-y-2 mb-4 text-[0.825rem]">
              <div className="flex items-baseline justify-between">
                <span className="text-sand-600">Your identity</span>
                <span className="text-forest-800">James Kimani</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sand-600">Content</span>
                <span className="text-forest-800 text-right max-w-[60%]">{input.slice(0, 80)}...</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sand-600">Visibility</span>
                <span className="text-forest-800">Public</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sand-600">Responses</span>
                <span className="text-forest-800">Community can reply</span>
              </div>
            </div>
            <p className="text-[0.72rem] text-sand-400 mb-4">
              No private agreement details, addresses, phone numbers, or financial information will be shared. Community content is not an agreement term.
            </p>
            <button
              onClick={() => { setShowPrivacyReview(false); onPublish(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Publish
            </button>
            <button onClick={() => setShowPrivacyReview(false)} className="w-full text-[0.825rem] text-sand-500 hover:text-forest-600 mt-2">
              Continue editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
