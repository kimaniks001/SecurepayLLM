import { useState } from 'react';
import { ArrowLeft, Sparkles, Check, FileText, AlertCircle } from 'lucide-react';

interface OfferBuilderViewProps {
  onBack: () => void;
  onPublish: () => void;
}

interface OfferFact {
  label: string;
  value: string;
}

interface StillToClarify {
  question: string;
}

export function OfferBuilderView({ onBack, onPublish }: OfferBuilderViewProps) {
  const [stage, setStage] = useState<'input' | 'building'>('input');
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState<{ role: 'agent' | 'user'; text: string }[]>([]);
  const [currentReply, setCurrentReply] = useState('');
  const [offerFacts, setOfferFacts] = useState<OfferFact[]>([]);
  const [stillToClarify, setStillToClarify] = useState<StillToClarify[]>([]);
  const [offerTitle, setOfferTitle] = useState('');
  const [showPublishReview, setShowPublishReview] = useState(false);

  const handleAgentSubmit = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setConversation((prev) => [...prev, { role: 'user', text: userText }]);

    if (conversation.length === 0) {
      // First message — parse and structure
      const lower = userText.toLowerCase();
      if (lower.includes('paint') || lower.includes('painting')) {
        setOfferTitle('3-Bedroom Interior Painting');
        setOfferFacts([
          { label: 'Service', value: 'Interior painting — 3-bedroom house' },
          { label: 'Price', value: 'KES 75,000' },
          { label: 'Customer provides', value: 'Paint' },
          { label: 'Provider provides', value: 'Labour + ordinary tools' },
        ]);
        setStillToClarify([
          { question: 'Who normally provides filler, masking materials and ordinary tools?' },
          { question: 'How long does the standard job normally take?' },
          { question: 'What happens if major wall repairs are discovered?' },
        ]);
        setCurrentReply('Understood. 3-bedroom interior painting, KES 75,000, customer supplies paint. I\'ve started the offer. Who normally provides filler, masking materials and ordinary tools?');
      } else if (lower.includes('cctv') || lower.includes('camera')) {
        setOfferTitle('4-Camera CCTV Package');
        setOfferFacts([
          { label: 'Service', value: 'CCTV installation — 4 cameras' },
          { label: 'Price', value: 'KES 85,000' },
          { label: 'Included', value: 'Installation' },
        ]);
        setStillToClarify([
          { question: 'What camera specification and recorder/storage is included?' },
          { question: 'Is cabling included in the price?' },
          { question: 'Who provides power and internet?' },
          { question: 'What warranty applies to equipment and workmanship?' },
        ]);
        setCurrentReply('Understood. 4-camera CCTV package at KES 85,000 including installation. I\'ve started the offer. What camera specification and recorder/storage is included?');
      } else if (lower.includes('iphone') || lower.includes('phone')) {
        setOfferTitle('iPhone 15 Pro 256GB');
        setOfferFacts([
          { label: 'Product', value: 'iPhone 15 Pro 256GB' },
          { label: 'Price', value: 'KES 125,000' },
        ]);
        setStillToClarify([
          { question: 'What is the condition and battery health?' },
          { question: 'Is there an iCloud lock or IMEI concern?' },
          { question: 'What is included in the box?' },
          { question: 'How does inspection work before payment?' },
        ]);
        setCurrentReply('Understood. Used iPhone 15 Pro at KES 125,000. I\'ve started the offer. What is the condition and battery health?');
      } else if (lower.includes('inspect') || lower.includes('survey') || lower.includes('quote')) {
        setOfferTitle('Structural Inspection Service');
        setOfferFacts([
          { label: 'Service', value: 'Structural crack inspection' },
          { label: 'Price type', value: 'Quote required' },
          { label: 'Requires', value: 'Site visit before pricing' },
        ]);
        setStillToClarify([
          { question: 'What does the customer receive after inspection?' },
          { question: 'What information do you need before the site visit?' },
          { question: 'What is your service area?' },
        ]);
        setCurrentReply('Understood. Structural inspection with quote required after site visit. I\'ve started the offer. What does the customer receive after inspection?');
      } else {
        setOfferTitle(userText.slice(0, 50));
        setOfferFacts([{ label: 'Description', value: userText }]);
        setStillToClarify([
          { question: 'What is the price or pricing basis?' },
          { question: 'What is included in the standard scope?' },
        ]);
        setCurrentReply('I\'ve started structuring your offer. What is the price or pricing basis?');
      }
      setStage('building');
    } else {
      // Subsequent messages — update facts based on response
      const lower = userText.toLowerCase();
      if (lower.includes('i provide') || lower.includes('provider provides') || lower.includes('i supply')) {
        setOfferFacts((prev) => {
          const updated = [...prev];
          const providerIdx = updated.findIndex((f) => f.label === 'Provider provides');
          if (providerIdx >= 0) {
            updated[providerIdx] = { label: 'Provider provides', value: 'Labour, filler, masking materials, ordinary tools' };
          } else {
            updated.push({ label: 'Provider provides', value: 'Labour, filler, masking materials, ordinary tools' });
          }
          return updated;
        });
        setStillToClarify((prev) => prev.slice(1));
        setCurrentReply('Updated. Provider supplies labour, filler, masking materials and ordinary tools. How long does the standard job normally take?');
      } else if (lower.includes('day') || lower.includes('week') || lower.includes('duration') || lower.match(/\d+\s*day/)) {
        setOfferFacts((prev) => [...prev, { label: 'Expected duration', value: '5 days' }]);
        setStillToClarify((prev) => prev.slice(1));
        setCurrentReply('Got it. Standard job takes about 5 days. What happens if major wall repairs are discovered during preparation?');
      } else if (lower.includes('repair') || lower.includes('extra') || lower.includes('defect') || lower.includes('correction')) {
        setOfferFacts((prev) => [...prev, { label: 'Defect arrangement', value: 'Major repairs quoted separately' }]);
        setStillToClarify((prev) => prev.slice(1));
        setCurrentReply('Understood. Major wall repairs discovered during preparation will be quoted separately. The offer is looking solid. You can publish when ready, or tell me what else to adjust.');
      } else {
        setCurrentReply('Noted. You can continue describing your offer, or publish when you\'re ready.');
      }
    }

    setConversation((prev) => [...prev, { role: 'agent', text: currentReply || 'Noted.' }]);
    setInput('');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          My Store
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Create an offer</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: conversation */}
        <div className="flex-1 md:flex-[1.3] flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
            {stage === 'input' && (
              <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-forest-500" />
                  <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Tell SecurePay what you sell</span>
                </div>
                <p className="text-[0.825rem] text-sand-600 mb-3">
                  Describe your offer in plain language. SecurePay will structure it and ask useful follow-up questions.
                </p>
              </div>
            )}

            {conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.825rem] ${
                  msg.role === 'user'
                    ? 'bg-forest-600 text-cream-50'
                    : 'bg-white border border-cream-200 text-forest-800'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {currentReply && stage === 'building' && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.825rem] bg-white border border-cream-200 text-forest-800">
                  {currentReply}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-cream-200/60 bg-cream-50/60">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAgentSubmit(); } }}
                placeholder="Type your answer..."
                className="flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.825rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
              />
              <button
                onClick={handleAgentSubmit}
                disabled={!input.trim()}
                className="rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium px-4 py-2 hover:bg-forest-700 transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {stage === 'building' && offerFacts.length > 0 && (
              <button
                onClick={() => setShowPublishReview(true)}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-forest-700 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-800 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Review and publish
              </button>
            )}
          </div>
        </div>

        {/* Right: Offer Taking Shape */}
        {stage === 'building' && (
          <div className="hidden md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-100/50 overflow-y-auto scrollbar-thin px-4 py-4">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Offer taking shape</div>
            <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 mb-3">
              <div className="font-display text-[0.95rem] text-forest-800 font-medium mb-2">{offerTitle}</div>
              <div className="space-y-1.5">
                {offerFacts.map((fact, i) => (
                  <div key={i} className="flex items-baseline justify-between text-[0.78rem]">
                    <span className="text-sand-500">{fact.label}</span>
                    <span className="text-forest-800 text-right">{fact.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {stillToClarify.length > 0 && (
              <div className="rounded-2xl border border-ember-200 bg-ember-50/20 px-4 py-3 mb-3">
                <div className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide mb-2">Still to clarify</div>
                <ul className="space-y-1.5">
                  {stillToClarify.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[0.78rem] text-ember-700">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      {item.question}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-[0.68rem] text-sand-400 italic">
              Offer ≠ Agreement. This structured offer answers "what I generally offer." Each customer creates their own agreement.
            </div>
          </div>
        )}
      </div>

      {/* Publish review modal */}
      {showPublishReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm animate-quiet-in" onClick={() => setShowPublishReview(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-deliberate px-5 py-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-forest-500" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Review your offer</span>
            </div>
            <div className="space-y-3 mb-4">
              {offerFacts.map((fact, i) => (
                <div key={i} className="flex items-baseline justify-between text-[0.825rem]">
                  <span className="text-sand-600">{fact.label}</span>
                  <span className="text-forest-800 text-right">{fact.value}</span>
                </div>
              ))}
            </div>
            {stillToClarify.length > 0 && (
              <div className="rounded-lg bg-cream-50 px-3 py-2 mb-4">
                <div className="text-[0.7rem] font-medium text-sand-500 mb-1">Unresolved matters</div>
                <ul className="space-y-0.5">
                  {stillToClarify.map((item, i) => (
                    <li key={i} className="text-[0.78rem] text-sand-500">· {item.question}</li>
                  ))}
                </ul>
                <p className="text-[0.68rem] text-sand-400 mt-1">You can publish with unresolved non-critical matters.</p>
              </div>
            )}
            <button
              onClick={() => { setShowPublishReview(false); onPublish(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Publish offer
            </button>
            <button onClick={() => setShowPublishReview(false)} className="w-full text-[0.825rem] text-sand-500 hover:text-forest-600 mt-2">
              Continue editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
