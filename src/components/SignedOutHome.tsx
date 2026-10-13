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
export function SecurePayHero({ onStart, disabled, onBringPlan, onPickDocument, onPickPhoto, onAddLink, onAddPlace, continueSlot, sourceStatusSlot, variant = 'app' }: SecurePayHeroProps) {
  const [fairTradeOpen, setFairTradeOpen] = useState(false);
  const hasIntake = !!(onBringPlan || onPickDocument || onPickPhoto || onAddLink || onAddPlace);
  const publicMode = variant === 'public';

  return (
    <div className={publicMode ? 'w-full max-w-5xl' : 'w-full max-w-3xl'}>
      <section className={publicMode ? 'sp-lift-in px-2 py-9 md:px-12 md:py-16' : 'sp-lift-in px-1 py-4 md:px-2 md:py-8'}>
        <div className="relative z-10">
          <div className="flex items-center gap-3" data-ks001-lockup>
            <img src={securepayMark} alt="SecurePay" className="h-9 w-9 md:h-10 md:w-10" />
            <div>
              <div className="sp-kicker">KS001</div>
              <div className="mt-0.5 text-xs text-sand-600">{publicMode ? 'Start here' : 'Here with you'}</div>
            </div>
          </div>

          <h1 className={publicMode ? 'sp-display mt-9 max-w-3xl text-[3.2rem] leading-[1.08] md:text-[5.2rem]' : 'sp-display mt-7 max-w-2xl text-[2.45rem] leading-[1.05] md:text-5xl'}>
            {publicMode
              ? <>What would you like to <span className="sp-real-word">get done?</span></>
              : <>What would you like to get done?</>}
          </h1>
          <p className={publicMode ? 'mt-6 max-w-xl text-[1.05rem] leading-7 text-sand-700 md:text-lg' : 'mt-3 max-w-xl text-[0.95rem] leading-6 text-sand-600 md:text-base'}>
            {publicMode
              ? 'Tell me in your own words. We can work out the details together.'
              : 'Start wherever you are. We will take it from there.'}
          </p>

          {publicMode && continueSlot && <div className="mt-5">
            {continueSlot}
            <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Or start something new</p>
          </div>}

          <div className={publicMode ? (continueSlot ? 'mt-3 md:max-w-3xl' : 'mt-6 md:max-w-3xl') : 'mt-7'}>
            <ConversationInput
              onSend={onStart}
              disabled={disabled}
              draftKey="home"
              placeholder={publicMode ? 'Tell me what you'd like to do…' : 'Tell KS001 what you want to get done…'}
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

          {sourceStatusSlot && <div className="mt-3">{sourceStatusSlot}</div>}

          {!publicMode && continueSlot && <div className="mt-8">{continueSlot}</div>}

          {publicMode && <div className="mt-3">
            <FairTradeAffordance onOpen={() => setFairTradeOpen(true)} />
          </div>}

          {hasIntake && <p className="mt-2 text-[0.76rem] text-sand-600">Use + to bring a plan, document, spreadsheet, photo, camera, link or place.</p>}
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
    <div className="surface-canvas flex-1 flex flex-col items-center px-4 sm:px-6 pt-7 pb-14 md:pt-12">
      <SecurePayHero {...props} variant="app" />
    </div>
  );
}
