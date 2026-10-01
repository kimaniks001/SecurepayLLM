import { useState, type ReactNode } from 'react';
import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import securepayLockup from '../assets/brand/securepay/securepay-lockup-by-keyman.png';
import { ConversationInput } from './ConversationInput';
import { FairTradeAffordance, FairTradePrinciplesPanel } from './FairTradePrinciples';
import { SourceMenu } from '../features/sources/ui/SourceMenu';
import type { SendResult } from '../features/conversation/ConversationSurface';
import { EXAMPLE_OUTCOME, HOME_EXAMPLES } from '../features/public/publicContent';

interface SignedOutHomeProps {
  onStart: (text: string) => SendResult;
  disabled?: boolean;
  /** KS001 Upgrade Phase 3 (Section 37/39) -- signed-out value first: bring a plan/document/photo
   *  before ever needing a KS Number. All optional so this component still renders sensibly
   *  wherever a caller has not wired the intake modes in (e.g. an older test fixture). */
  onBringPlan?: () => void;
  onPickDocument?: (file: File) => void;
  onPickPhoto?: (file: File) => void;
  /** Public Experience Convergence Phase 3 (Slice 3B) -- declared-text sources (never fetched / located). */
  onAddLink?: () => void;
  onAddPlace?: () => void;
  /** User-Ready Beta Gate 1 (EP-CERT-013) -- CONTINUE earlier work: shown separately, above START NEW. */
  continueSlot?: ReactNode;
}

interface SecurePayHeroProps extends SignedOutHomeProps {
  /**
   * `public` is the public Home's first screen; `app` the signed-in Home. Same entry object, same behaviour.
   */
  variant?: 'public' | 'app';
}

/**
 * User-Ready Beta Gate 1 (EP-CERT-009/010/011) -- ONE intentional entry object, shared by the public Home (`PublicHome`)
 * and the signed-in Home (`SignedOutHome`) so the working KS001 intake exists exactly once:
 *
 *   headline → supporting idea → [Continue, if any] → KS001 (guided by the 12 Principles) → universal composer with its
 *   own "+" → quiet capability hint → reassurance → a few strong examples.
 *
 * KS001 = the voice, the 12 Principles = the compass (one lockup directly above the composer, never a footer line), the
 * agreement = the output (see ExampleOutcome). The person gives SecurePay what they have; they never choose a subsystem.
 */
export function SecurePayHero({ onStart, disabled, onBringPlan, onPickDocument, onPickPhoto, onAddLink, onAddPlace, continueSlot, variant = 'app' }: SecurePayHeroProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  const hasIntake = !!(onBringPlan || onPickDocument || onPickPhoto || onAddLink || onAddPlace);
  return (
    <div className="w-full max-w-xl text-center">
      {/* The canonical brand lockup, kept (visual DNA) but compact: the headline and the composer lead, not dead space. */}
      <div className="flex justify-center mb-4 animate-fade-in-down">
        <img src={securepayLockup} alt="SecurePay by KEYMAN — Money should follow the agreement." className="h-20 sm:h-24 md:h-28 w-auto" />
      </div>
      <h1 className="font-display text-[2rem] leading-[1.1] sm:text-4xl md:text-5xl text-forest-800 font-medium text-balance animate-fade-in-up">
        Bring the plan. Leave with an agreement.
      </h1>
      <p className={`mt-3 text-[0.95rem] md:text-base ${variant === 'public' ? 'text-sand-700' : 'text-sand-700'} leading-relaxed max-w-lg mx-auto animate-fade-in-up`} style={{ animationDelay: '0.08s' }}>
        Tell SecurePay what you’re trying to make happen, or give it what you already have. It shapes the agreement with you — you only check what needs deciding.
      </p>

      {continueSlot && <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>{continueSlot}
        <p className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Or start something new</p>
      </div>}

      <div className={`${continueSlot ? 'mt-2' : 'mt-7'} text-left animate-fade-in-up`} style={{ animationDelay: '0.16s' }}>
        {/* KS001 + its compass, fused: who you are talking to, and what guides it. */}
        <div className="mb-2 flex items-center gap-2.5 px-1" data-ks001-lockup>
          <img src={securepayMark} alt="" className="h-7 w-7 shrink-0" />
          <div className="min-w-0 leading-tight">
            <span className="block font-display text-[0.95rem] text-forest-800">KS001</span>
            <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
          </div>
        </div>
        <div className={variant === 'public' ? 'rounded-2xl shadow-deliberate' : ''}>
          <ConversationInput
            onSend={onStart}
            disabled={disabled}
            draftKey="home"
            placeholder="Tell SecurePay what you’re trying to make happen…"
            leading={hasIntake ? (
              <SourceMenu
                variant="composer" placement="below" disabled={disabled}
                onBringPlan={onBringPlan} onPickDocument={onPickDocument} onPickPhoto={onPickPhoto}
                onAddLink={onAddLink} onAddPlace={onAddPlace}
              />
            ) : undefined}
          />
        </div>
        {hasIntake && <p className="mt-2 px-1 text-[0.78rem] text-sand-700">Type or paste anything. Use + for a photo, document, link or place.</p>}
      </div>

      <p className="mt-4 text-[0.8rem] text-sand-700 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        Start without a KS Number. Nothing becomes an agreement until you review and confirm it.
      </p>

      <ul className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.24s' }} aria-label="Examples to start with">
        {HOME_EXAMPLES.map(example => (
          <li key={example}>
            <button type="button" disabled={disabled} onClick={() => onStart(example)}
              className="min-h-11 rounded-full border border-cream-300 bg-white/70 px-4 text-[0.85rem] text-forest-800 transition-colors hover:border-forest-300 hover:bg-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              {example}
            </button>
          </li>
        ))}
      </ul>
      {fairTradeOpen && <FairTradePrinciplesPanel withKs001 onClose={() => setFairTradeOpen(false)} />}
    </div>
  );
}

/**
 * User-Ready Beta Gate 1 ("prove the output") -- what "Leave with an agreement" means, as a clearly labelled ILLUSTRATION.
 * Never customer evidence, never interactive, never a real person or record.
 */
export function ExampleOutcome({ className = '' }: { className?: string }) {
  return (
    <figure className={`surface-info px-5 py-4 text-left ${className}`} aria-label="Example of an agreement taking shape (illustration)" data-example-outcome>
      <figcaption className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Example · illustration</figcaption>
      <p className="mt-2 font-display text-lg text-forest-800">{EXAMPLE_OUTCOME.title}</p>
      <p className="text-[0.85rem] text-sand-700">{EXAMPLE_OUTCOME.parties}</p>
      <ul className="mt-3 space-y-1.5 border-t rule-quiet pt-3">
        {EXAMPLE_OUTCOME.terms.map(term => <li key={term} className="flex items-center gap-2 text-[0.9rem] text-forest-800"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-forest-400" />{term}</li>)}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t rule-quiet pt-3">
        <span className="text-[0.82rem] text-ember-800">{EXAMPLE_OUTCOME.open}</span>
        <span aria-hidden="true" className="inline-flex min-h-9 items-center rounded-full bg-forest-700 px-4 text-[0.82rem] font-medium text-white">{EXAMPLE_OUTCOME.action}</span>
      </div>
    </figure>
  );
}

/**
 * The signed-in Home's KS001 centre (rendered by `AgentExperience` for a signed-in person). The public, signed-out Home is
 * `PublicHome` -- a separate composition that reuses `SecurePayHero`; public-only chapters never render here.
 */
export function SignedOutHome(props: SignedOutHomeProps) {
  return (
    <div className="surface-canvas flex-1 flex flex-col items-center px-4 sm:px-6 pt-8 pb-12 md:pt-14">
      <SecurePayHero {...props} variant="app" />
      <div className="mt-10 w-full max-w-xl">
        <ExampleOutcome />
      </div>
      <div className="mt-8 w-full max-w-xl border-t rule-quiet pt-6 text-center">
        <p className="text-[0.8rem] text-sand-700">Ready to use SecurePay for your own agreements?</p>
        <a
          href="#/activate"
          className="inline-flex mt-2 min-h-11 items-center justify-center rounded-xl border border-forest-200 bg-forest-50 px-4 text-[0.825rem] font-medium text-forest-700 hover:bg-forest-100 transition-colors"
        >
          Activate SecurePay
        </a>
      </div>
    </div>
  );
}
