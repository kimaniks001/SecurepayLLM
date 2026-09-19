import securepayLockup from '../assets/brand/securepay/securepay-lockup-by-keyman.png';
import { ConversationInput } from './ConversationInput';

interface SignedOutHomeProps {
  onStart: (text: string) => void;
  disabled?: boolean;
}

export function SignedOutHome({ onStart, disabled }: SignedOutHomeProps) {
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

        {/* Headline */}
        <h1 className="font-display text-3xl md:text-5xl text-forest-800 font-medium leading-tight text-balance animate-fade-in-up">
          What are you trying to make happen?
        </h1>

        <p className="mt-4 text-[0.95rem] md:text-base text-sand-600 leading-relaxed max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Tell SecurePay what you need. It will help you think it through, find the right people, and build a clear agreement — without the form-filling.
        </p>

        {/* Input */}
        <div className="mt-8 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <ConversationInput
            onSend={onStart}
            disabled={disabled}
            placeholder="I need someone to tile my bathroom..."
          />
        </div>

        {/* Example prompts */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
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
    </div>
  );
}
