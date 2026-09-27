import { useRef, useState } from 'react';
import { Camera, FileText, PenLine } from 'lucide-react';
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
// KS001 Upgrade Phase 3 final merge-readiness correction (item 4) -- WebP deliberately not offered here;
// see AttachSourceMenu's own note (the backend has no safe, bounded WebP dimension parser).
const PHOTO_ACCEPT = 'image/jpeg,image/png';

interface SecurePayHeroProps extends SignedOutHomeProps {
  /**
   * Public Experience Convergence Phase 2 -- `public` is the public Home's first screen (the intake modes
   * shown as quiet, intentional choices); `app` is the unchanged signed-in Home presentation.
   */
  variant?: 'public' | 'app';
}

/**
 * The SecurePay + KS001 centre: lockup, headline, supporting text, composer, intake modes, Fair Trade line
 * and trust line. Shared by the public Home (`PublicHome`) and the signed-in Home (`SignedOutHome`, below)
 * so the working KS001 intake -- conversation creation, file pickers, accepted types, photo capture,
 * busy/disabled behaviour -- exists exactly once.
 *
 * KS001 Upgrade Phase 3 (Bring what you already have, Section 36) -- current architectural decision:
 * this headline/supporting/trust copy DELIBERATELY SUPERSEDES the earlier locked "Tell SecurePay
 * what you're trying to make happen" hero copy (see this file's own git history for the prior locked
 * text) -- that older phrase may still remain as a conversational-mode label elsewhere (e.g.
 * SignedInHome's own heading), but never again as the ONLY signed-out home proposition. Hierarchy
 * remains: headline -> supporting text -> conversation input -> intake modes -> Fair Trade line.
 */
export function SecurePayHero({ onStart, disabled, onBringPlan, onPickDocument, onPickPhoto, variant = 'app' }: SecurePayHeroProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  const documentInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const isPublic = variant === 'public';
  const intakeClass = isPublic
    ? 'inline-flex min-h-11 items-center gap-2 rounded-full border border-cream-300 bg-white/80 px-4 text-[0.85rem] font-medium text-forest-800 shadow-soft transition-colors hover:border-forest-300 hover:bg-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300'
    : 'text-[0.8rem] text-forest-600 hover:text-forest-800 underline disabled:opacity-40';
  return (
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

      <p className={`mt-4 text-[0.95rem] md:text-base ${isPublic ? 'text-sand-700' : 'text-sand-600'} leading-relaxed max-w-lg mx-auto animate-fade-in-up`} style={{ animationDelay: '0.1s' }}>
        Tell SecurePay what you're trying to make happen, paste what you already have, or give KS001 a document or photo. It helps you make the important details clear and shows how the money should follow what was agreed.
      </p>

      {/* Input */}
      <div className={`mt-8 max-w-xl mx-auto animate-fade-in-up ${isPublic ? 'rounded-2xl shadow-deliberate' : ''}`} style={{ animationDelay: '0.2s' }}>
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
        <div className={`${isPublic ? 'mt-4 gap-2' : 'mt-3 gap-x-4 gap-y-1.5'} flex flex-wrap items-center justify-center animate-fade-in-up`} style={{ animationDelay: '0.22s' }}>
          {onBringPlan && (
            <button type="button" disabled={disabled} onClick={onBringPlan} className={intakeClass}>
              {isPublic && <PenLine className="h-4 w-4 text-forest-600" aria-hidden="true" />}Bring your plan
            </button>
          )}
          {onPickDocument && (
            <button type="button" disabled={disabled} onClick={() => documentInput.current?.click()} aria-label="Give me a document — choose a file" className={intakeClass}>
              {isPublic && <FileText className="h-4 w-4 text-forest-600" aria-hidden="true" />}Give me a document
            </button>
          )}
          {onPickPhoto && (
            <button type="button" disabled={disabled} onClick={() => photoInput.current?.click()} aria-label="Show me — take or choose a photo" className={intakeClass}>
              {isPublic && <Camera className="h-4 w-4 text-forest-600" aria-hidden="true" />}Show me
            </button>
          )}
          <input ref={documentInput} type="file" accept={DOCUMENT_ACCEPT} className="hidden" tabIndex={-1} aria-hidden="true"
            onChange={e => { const file = e.target.files?.[0]; if (file) onPickDocument?.(file); e.target.value = ''; }} />
          <input ref={photoInput} type="file" accept={PHOTO_ACCEPT} capture="environment" className="hidden" tabIndex={-1} aria-hidden="true"
            onChange={e => { const file = e.target.files?.[0]; if (file) onPickPhoto?.(file); e.target.value = ''; }} />
        </div>
      )}

      {/* Fair Trade -- quiet reference immediately beneath the input, never a badge/score/chip. */}
      <div className={`${isPublic ? 'mt-5' : 'mt-3'} animate-fade-in-up`} style={{ animationDelay: '0.25s' }}>
        <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
      </div>

      {/* KS001 Upgrade Phase 3 (Section 36) -- the trust line: identity remains unnecessary for
          ingestion/BUILD; nothing becomes a real Agreement without an explicit human review/confirm. */}
      <p className="mt-4 text-[0.78rem] text-sand-600 animate-fade-in-up" style={{ animationDelay: '0.27s' }}>
        Start without a KS Number. Nothing becomes an agreement until you review and confirm it.
      </p>
      {fairTradeOpen && <FairTradePrinciplesPanel onClose={() => setFairTradeOpen(false)} />}
    </div>
  );
}

/**
 * The signed-in Home's KS001 centre (rendered by `AgentExperience` for a signed-in person). The public,
 * signed-out Home is `PublicHome` -- a separate composition that reuses `SecurePayHero`; public-only
 * chapters never render here.
 */
export function SignedOutHome(props: SignedOutHomeProps) {
  const { onStart, disabled } = props;
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
      <SecurePayHero {...props} variant="app" />
      <div className="max-w-2xl w-full text-center">
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
          <p className="text-[0.78rem] text-sand-600">Ready to use SecurePay for your own agreements?</p>
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
