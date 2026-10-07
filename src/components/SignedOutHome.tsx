import { useState, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, FileText, Search, Sparkles, Users } from 'lucide-react';
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
  const quickActions = [
    { label: 'Plan', help: 'Turn an idea into a clear plan', icon: FileText, prompt: 'Help me turn an idea into a clear plan.' },
    { label: 'Compare', help: 'Make the options obvious', icon: Search, prompt: 'Help me compare my options before I decide.' },
    { label: 'Prepare Agreement', help: 'Make the commitment clear', icon: CheckCircle2, prompt: 'Help me prepare a clear agreement from what I am trying to do.' },
    { label: 'Find People', help: 'Connect the right people', icon: Users, prompt: 'Help me work out who I need and how SecurePay can help me find them.' },
  ];

  return (
    <div className="w-full max-w-6xl">
      <section className="sp-hero sp-lift-in px-5 py-6 md:px-9 md:py-9">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3">
            <img src={securepayMark} alt="SecurePay" className="h-9 w-9 md:h-10 md:w-10" />
            <div>
              <div className="sp-kicker">KS001</div>
              <div className="mt-0.5 text-xs text-sand-600">{variant === 'app' ? 'Welcome back' : 'Start here'}</div>
            </div>
          </div>

          <h1 className="sp-display mt-5 max-w-2xl text-[2.65rem] md:text-6xl">
            What do you want to make <span className="sp-real-word">real</span> today?
          </h1>
          <p className="mt-5 max-w-xl text-[0.95rem] leading-6 text-sand-700 md:text-base">
            Ask anything, or start something new. KS001 can help you think, plan, compare, prepare an Agreement, find people and move into action.
          </p>

          {continueSlot && <div className="mt-5">
            {continueSlot}
            <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Or start something new</p>
          </div>}

          <div className={continueSlot ? 'mt-3 md:max-w-3xl' : 'mt-6 md:max-w-3xl'}>
            <ConversationInput
              onSend={onStart}
              disabled={disabled}
              draftKey="home"
              placeholder="Tell KS001 what you want to make happen…"
              leading={hasIntake ? (
                <SourceMenu
                  variant="composer"
                  placement="below"
                  disabled={disabled}
                  onBringPlan={onBringPlan}
                  onPickDocument={onPickDocument}
                  onPickPhoto={onPickPhoto}
                  onAddLink={onAddLink}
                  onAddPlace={onAddPlace}
                />
              ) : undefined}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[placeholder*="Tell KS001"], textarea[placeholder*="Tell KS001"]');
              input?.focus();
            }}
            className="sp-primary-action mt-3 flex w-full items-center justify-between px-5 text-[0.92rem] font-semibold md:max-w-xl"
          >
            <span className="flex items-center gap-2.5"><Sparkles className="h-4 w-4" /> Start with KS001</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-3">
            <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
          </div>

          {hasIntake && <p className="mt-2 text-[0.78rem] text-sand-600">Use + for a plan, document, spreadsheet, photo, camera, link or place.</p>}
        </div>
      </section>

      <section aria-label="Quick starts" className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {quickActions.map(({ label, help, icon: Icon, prompt }, index) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onStart(prompt)}
            className="sp-action-tile sp-settle p-3.5 text-left disabled:opacity-40"
            style={{ animationDelay: String(index * 55) + 'ms' }}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="mt-3 block text-[0.82rem] font-semibold leading-4 text-forest-900">{label}</span>
            <span className="mt-1 block text-[0.68rem] leading-4 text-sand-600">{help}</span>
          </button>
        ))}
      </section>

      {variant === 'public' && (
        <p className="mt-4 text-center text-[0.8rem] text-sand-700">
          Start without a KS Number. Nothing becomes an agreement until you review and confirm it.
        </p>
      )}

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
