import { useState } from 'react';
import securepayLockup from '../assets/brand/securepay/securepay-lockup-by-keyman.png';
import { ConversationInput } from './ConversationInput';
import { FairTradeAffordance, FairTradePrinciplesPanel } from './FairTradePrinciples';

interface SignedOutHomeProps {
  onStart: (text: string) => void;
  disabled?: boolean;
}

/**
 * Home proposition (task doctrine, locked copy -- do not paraphrase): the headline and supporting
 * text below are exact. Hierarchy is also locked: headline -> supporting text -> conversation
 * input -> Fair Trade line, with nothing else crowding that zone. The example prompts and the
 * Activate footer are demoted below the Fair Trade line rather than removed, since they remain a
 * real, functional entry point this task did not ask to delete -- just kept out of the primary
 * hero zone.
 */
export function SignedOutHome({ onStart, disabled }: SignedOutHomeProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
      <div className="max-w-2xl w-full text-center">
        {/* SecurePay brand lockup */}
        <div className="flex justify-center mb-8 animate-fade-in-down">
          <img
            src={securepayLockup}
            alt="SecurePay by KEYMAN — Money should follow the agreement."
            className="h-44 sm:h-52 md:h-60 w-auto"
          />
        </div>

        {/* Headline -- locked copy */}
        <h1 className="font-display text-3xl md:text-5xl text-forest-800 font-medium leading-tight text-balance animate-fade-in-up">
          Tell SecurePay what you're trying to make happen.
        </h1>

        <p className="mt-4 text-[0.95rem] md:text-base text-sand-600 leading-relaxed max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          It helps you bring the people, plans and agreements together so everyone knows what happens next — and money can follow what was agreed.
        </p>

        {/* Input */}
        <div className="mt-8 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <ConversationInput
            onSend={onStart}
            disabled={disabled}
            placeholder="I need someone to tile my bathroom..."
          />
        </div>

        {/* Fair Trade -- quiet reference immediately beneath the input, never a badge/score/chip. */}
        <div className="mt-3 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
        </div>

        {/* Example prompts -- demoted below the Fair Trade line so they never crowd the primary
            headline/input/Fair-Trade zone. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {[
            'I need someone to tile my bathroom',
            'My mum passed away and we need to organize contributions',
            'I want to buy a used iPhone 15 Pro',
            'We want to start a chama with eight friends',
            'I need a plumber for a leaking tank',
            'I have a quotation for some work. Can you review it?',
            'Show me the agreement where Peter renovated my kitchen',
          ].map((prompt) => (
            <button
              key={prompt}
              disabled={disabled}
              onClick={() => onStart(prompt)}
              className="text-[0.8rem] text-sand-600 bg-cream-100 hover:bg-cream-200 border border-cream-200 rounded-full px-3.5 py-1.5 transition-colors hover:text-forest-700"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-cream-200/70 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-[0.78rem] text-sand-500">Ready to use SecurePay for your own agreements?</p>
          <a
            href="#/activate"
            className="inline-flex mt-2 items-center justify-center rounded-xl border border-forest-200 bg-forest-50 px-4 py-2.5 text-[0.825rem] font-medium text-forest-700 hover:bg-forest-100 transition-colors"
          >
            Activate SecurePay
          </a>
        </div>
      </div>
      {fairTradeOpen && <FairTradePrinciplesPanel onClose={() => setFairTradeOpen(false)} />}
    </div>
  );
}
