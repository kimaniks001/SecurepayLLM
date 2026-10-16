import type { ReactNode } from 'react';
import { SecurePayHero } from '../../components/SignedOutHome';
import type { SendResult } from '../conversation/ConversationSurface';
import type { PublicSectionId } from './publicShell';

export interface PublicHomeProps {
  disabled?: boolean;
  onStart: (text: string) => SendResult;
  /** User-Ready Beta Gate 1 (EP-CERT-013) -- CONTINUE earlier work, shown separately above START NEW. */
  continueSlot?: ReactNode;
  sourceStatusSlot?: ReactNode;
  onBringPlan: () => void;
  onPickDocument: (file: File) => void;
  onPickPhoto: (file: File) => void;
  onAddLink?: () => void;
  onAddPlace?: () => void;
  onAddDateTime?: () => void;
  /** The "Bring your plan" panel, rendered right under the intake when open. */
  bringPlanPanel?: ReactNode;
  /** Phase 3 -- the Link / Place form, rendered in the same place when open. */
  declaredPanel?: ReactNode;
  onFocusComposer: () => void;
  onBrowseStores: () => void;
  onSignIn: () => void;
  onRecover: () => void;
  onHelp: () => void;
  onSection: (id: PublicSectionId) => void;
  /** Public Experience Convergence Phase 4 -- the live Join route. */
  onJoin: () => void;
}


/**
 * Human UI Foundation — Quiet Power.
 * The public Home is an invitation to begin, not a catalogue of SecurePay's modules.
 * The real backend conversation, source intake and optional continuing work are still
 * supplied by AgentExperience; never substitute a simulated exchange here.
 */
export function PublicHome(props: PublicHomeProps) {
  return (
    <main id="main" className="sp-life-canvas relative min-h-[calc(100dvh-5rem)] overflow-hidden bg-cream-50 bg-ks001-surface text-forest-900" data-public-home data-human-ui-foundation data-workspace-at-rest>
      <div aria-hidden="true" className="pointer-events-none absolute -top-64 -right-60 h-[44rem] w-[44rem] rounded-full bg-[#d9e4d8]/45 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 -left-44 h-[28rem] w-[28rem] rounded-full bg-[#eddcc3]/45 blur-[100px]" />
      <section aria-label="Start with KS001" data-public-section="ks001" className="relative z-20 mx-auto flex min-h-[calc(100dvh-8rem)] max-w-5xl flex-col justify-center px-3 pb-8 pt-8 sm:px-7 md:pb-10">
        <SecurePayHero
          variant="public"
          continueSlot={props.continueSlot}
          sourceStatusSlot={props.sourceStatusSlot}
          disabled={props.disabled}
          onStart={props.onStart}
          onBringPlan={props.onBringPlan}
          onPickDocument={props.onPickDocument}
          onPickPhoto={props.onPickPhoto}
          onAddLink={props.onAddLink}
          onAddPlace={props.onAddPlace}
          onAddDateTime={props.onAddDateTime}
        />
        {props.bringPlanPanel && <div className="relative mx-auto mt-4 w-full max-w-3xl">{props.bringPlanPanel}</div>}
        {props.declaredPanel && <div className="relative mx-auto mt-4 w-full max-w-3xl">{props.declaredPanel}</div>}
      </section>
      {/* Quiet reference chapters remain below the workspace for public navigation and accessibility. These are the real
          targets of the existing desktop/mobile public navigation. */}
      <div className="relative mx-auto grid max-w-5xl gap-3 px-5 pb-8 sm:px-9 md:grid-cols-3" data-public-chapters>
        <section data-public-section="how-it-works" aria-labelledby="public-how-heading" className="rounded-2xl border border-forest-900/10 bg-white/85 p-5">
          <h2 id="public-how-heading" tabIndex={-1} className="font-display text-xl text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">How SecurePay works</h2>
          <p className="mt-2 text-sm leading-6 text-sand-700">Tell KS001 what you need, review the Agreement as it takes shape, then choose the next action. Money only follows authorised Agreement terms.</p>
          <button type="button" onClick={props.onBrowseStores} className="mt-3 min-h-11 rounded-xl border border-forest-200 bg-cream-50 px-3 text-sm font-semibold text-forest-800">Browse Stores</button>
        </section>
        <section data-public-section="trust-project" aria-labelledby="public-trust-heading" className="rounded-2xl border border-forest-900/10 bg-white/85 p-5">
          <h2 id="public-trust-heading" tabIndex={-1} className="font-display text-xl text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">The Trust Project</h2>
          <p className="mt-2 text-sm leading-6 text-sand-700">People, shared technologies and knowledge for fair trade. Membership is a deliberate choice; signing in alone never joins the community.</p>
          <button type="button" onClick={props.onJoin} className="mt-3 min-h-11 rounded-xl border border-forest-200 bg-cream-50 px-3 text-sm font-semibold text-forest-800">Explore joining</button>
        </section>
        <section data-public-section="for-business" aria-labelledby="public-business-heading" className="rounded-2xl border border-forest-900/10 bg-white/85 p-5">
          <h2 id="public-business-heading" tabIndex={-1} className="font-display text-xl text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">For Business</h2>
          <p className="mt-2 text-sm leading-6 text-sand-700">An authorised person acts for the business. Begin with a real need or Agreement; business identity setup and permissions remain separate.</p>
        </section>
      </div>
      <footer className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-[#183a32]/10 px-6 py-6 text-[0.78rem] text-sand-600 sm:px-9">
        <span>SecurePay · Money should follow the agreement.</span>
        <div className="flex flex-wrap gap-5">
          <button type="button" className="underline underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4" onClick={props.onHelp}>Need help?</button>
          <button type="button" className="underline underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4" onClick={props.onJoin}>Join the Trust Project</button>
        </div>
      </footer>
    </main>
  );
}
