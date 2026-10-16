import { useState, type ReactNode } from 'react';
import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import { ConversationInput } from './ConversationInput';
import { FairTradeAffordance, FairTradePrinciplesPanel } from './FairTradePrinciples';
import { SourceMenu } from '../features/sources/ui/SourceMenu';
import type { SendResult } from '../features/conversation/ConversationSurface';
import { EXAMPLE_OUTCOME } from '../features/public/publicContent';

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
  onAddDateTime?: () => void;
  /** User-Ready Beta Gate 1 (EP-CERT-013) -- CONTINUE earlier work: shown separately, above START NEW. */
  continueSlot?: ReactNode;
  /** Visible lifecycle for a source picked from Home: selected → reading → success/failure. */
  sourceStatusSlot?: ReactNode;
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
export function SecurePayHero({ onStart, disabled, onBringPlan, onPickDocument, onPickPhoto, onAddLink, onAddPlace, onAddDateTime, continueSlot, sourceStatusSlot, variant = 'app' }: SecurePayHeroProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  const hasIntake = !!(onBringPlan || onPickDocument || onPickPhoto || onAddLink || onAddPlace || onAddDateTime);
  const publicMode = variant === 'public';

  return (
    <div className="sp-brand-public w-full sp-type-signature max-w-4xl" data-unified-workspace-entry data-workspace-identity={publicMode ? 'visitor' : 'member'}>
      <section className="sp-lift-in relative z-20 isolate overflow-visible rounded-[2rem] px-3 pb-8 pt-8 sm:px-7 md:px-12 md:pb-12 md:pt-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#d9e4d8]/60 blur-3xl md:h-96 md:w-96" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-72 w-72 rounded-full bg-[#eddcc3]/50 blur-3xl md:h-96 md:w-96" />
        <div className="relative z-10">
          <div className="flex items-center gap-3" data-ks001-lockup>
            <img src={securepayMark} alt="SecurePay" className="h-9 w-9 md:h-10 md:w-10" />
            <div>
              <div className="sp-kicker">KS001</div>
              <div className="mt-0.5 text-xs text-sand-600">{publicMode ? 'Start here · your ideas are welcome' : 'Here with you · your work can continue'}</div>
            </div>
          </div>

          <p className="mt-7 text-[0.85rem] font-medium leading-6 text-forest-700" data-workspace-welcome>
            {publicMode
              ? 'Welcome. You can start with a question, an idea, or something you need to do.'
              : 'Welcome back. Your work and your next step belong here. Start wherever you are.'}
          </p>

          {continueSlot && <section className="mt-5 max-w-2xl" aria-label="Continue your work" data-return-to-work>
            {continueSlot}
          </section>}

          <h1 className="sp-display mt-7 max-w-3xl text-[2.8rem] leading-[1.07] sm:text-[3.5rem] md:text-[4.5rem]">
            What would you like to <span className="sp-real-word">get done?</span>
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-7 text-sand-700 md:text-[1.07rem]">
            Tell me in your own words. We can work out the details together.
          </p>

          <div className="mt-6 w-full max-w-3xl" data-workspace-composer>
            <ConversationInput
              onSend={onStart}
              disabled={disabled}
              draftKey="home"
              placeholder="Tell KS001 what you want to get done…"
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
                  onAddDateTime={onAddDateTime}
                />
              ) : undefined}
            />
          </div>

          {sourceStatusSlot && <div className="mt-3 max-w-3xl">{sourceStatusSlot}</div>}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.77rem] leading-5 text-sand-600">
            {hasIntake && <span>Use + for a photo, plan, document, link, place or date.</span>}
            <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
          </div>
          <p className="mt-5 max-w-2xl text-[0.78rem] leading-5 text-sand-600">
            {publicMode
              ? 'Start without a KS Number. Nothing becomes an agreement until you review and confirm it.'
              : 'You stay in control. Only reviewed, confirmed terms can become an agreement.'}
          </p>
        </div>
      </section>

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
    <div className="sp-life-canvas flex-1 flex flex-col items-center justify-center bg-cream-50 bg-ks001-surface px-3 pb-8 pt-6 sm:px-6 md:pb-10 md:pt-9" data-workspace-at-rest>
      <SecurePayHero {...props} variant="app" />
    </div>
  );
}
