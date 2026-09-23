import { useRef, useState } from 'react';
import securepayLockup from '../assets/brand/securepay/securepay-lockup-by-keyman.png';
import { ConversationInput } from './ConversationInput';
import { FairTradeAffordance, FairTradePrinciplesPanel } from './FairTradePrinciples';

interface SignedOutHomeProps {
  onStart: (text: string) => void;
  disabled?: boolean;
  /** KS001 Upgrade Phase 3 (Section 37/39) -- signed-out value first: bring a plan/document/photo
   *  before ever needing a KS Number. All three are optional so this component still renders sensibly
   *  wherever a caller has not wired the new intake modes in (e.g. an older test fixture). */
  onBringPlan?: () => void;
  onPickDocument?: (file: File) => void;
  onPickPhoto?: (file: File) => void;
}

const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv';
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * KS001 Upgrade Phase 3 (Bring what you already have, Section 36) -- current architectural decision:
 * this new headline/supporting/trust copy DELIBERATELY SUPERSEDES the earlier locked "Tell SecurePay
 * what you're trying to make happen" hero copy (see this file's own git history for the prior locked
 * text) -- that older phrase may still remain as a conversational-mode label elsewhere (e.g.
 * SignedInHome's own heading), but never again as the ONLY signed-out home proposition. Hierarchy
 * remains: headline -> supporting text -> conversation input -> intake modes -> Fair Trade line.
 */
export function SignedOutHome({ onStart, disabled, onBringPlan, onPickDocument, onPickPhoto }: SignedOutHomeProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  const documentInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
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

        {/* Headline -- KS001 Upgrade Phase 3 copy (Section 36) */}
        <h1 className="font-display text-3xl md:text-5xl text-forest-800 font-medium leading-tight text-balance animate-fade-in-up">
          Bring the plan. Leave with an agreement.
        </h1>

        <p className="mt-4 text-[0.95rem] md:text-base text-sand-600 leading-relaxed max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Tell SecurePay what you're trying to make happen, paste what you already have, or give KS001 a document or photo. It helps you make the important details clear and shows how the money should follow what was agreed.
        </p>

        {/* Input */}
        <div className="mt-8 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <ConversationInput
            onSend={onStart}
            disabled={disabled}
            placeholder="I need someone to tile my bathroom..."
          />
        </div>

        {/* KS001 Upgrade Phase 3 (Section 37) -- quiet intake-mode entries, never four giant marketing
            cards: a small row beneath the composer. Each transitions straight into the SAME conversation
            experience the free-text composer would. */}
        {(onBringPlan || onPickDocument || onPickPhoto) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
            {onBringPlan && (
              <button type="button" disabled={disabled} onClick={onBringPlan} className="text-[0.8rem] text-forest-600 hover:text-forest-800 underline disabled:opacity-40">
                Bring your plan
              </button>
            )}
            {onPickDocument && (
              <button type="button" disabled={disabled} onClick={() => documentInput.current?.click()} className="text-[0.8rem] text-forest-600 hover:text-forest-800 underline disabled:opacity-40">
                Give me a document
              </button>
            )}
            {onPickPhoto && (
              <button type="button" disabled={disabled} onClick={() => photoInput.current?.click()} className="text-[0.8rem] text-forest-600 hover:text-forest-800 underline disabled:opacity-40">
                Show me
              </button>
            )}
            <input ref={documentInput} type="file" accept={DOCUMENT_ACCEPT} className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) onPickDocument?.(file); e.target.value = ''; }} />
            <input ref={photoInput} type="file" accept={PHOTO_ACCEPT} capture="environment" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) onPickPhoto?.(file); e.target.value = ''; }} />
          </div>
        )}

        {/* Fair Trade -- quiet reference immediately beneath the input, never a badge/score/chip. */}
        <div className="mt-3 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
        </div>

        {/* KS001 Upgrade Phase 3 (Section 36) -- the trust line: identity remains unnecessary for
            ingestion/BUILD; nothing becomes a real Agreement without an explicit human review/confirm. */}
        <p className="mt-4 text-[0.75rem] text-sand-500 animate-fade-in-up" style={{ animationDelay: '0.27s' }}>
          Start without a KS Number. Nothing becomes an agreement until you review and confirm it.
        </p>

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
