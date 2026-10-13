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
    <main id="main" className="relative min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#f5f3ec] text-forest-900" data-public-home data-human-ui-foundation>
      <div aria-hidden="true" className="pointer-events-none absolute -top-64 -right-60 h-[44rem] w-[44rem] rounded-full bg-[#d9e4d8]/45 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 -left-44 h-[28rem] w-[28rem] rounded-full bg-[#eddcc3]/45 blur-[100px]" />
      <section aria-label="Start with KS001" data-public-section="ks001" className="relative mx-auto flex min-h-[70dvh] max-w-5xl flex-col justify-center px-5 pb-12 pt-12 sm:px-9 md:pb-20">
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
        />
        {props.bringPlanPanel && <div className="relative mx-auto mt-4 w-full max-w-3xl">{props.bringPlanPanel}</div>}
        {props.declaredPanel && <div className="relative mx-auto mt-4 w-full max-w-3xl">{props.declaredPanel}</div>}
      </section>
      <footer className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-[#183a32]/10 px-6 py-6 text-[0.78rem] text-sand-600 sm:px-9">
        <span>SecurePay · Money should follow the agreement.</span>
        <div className="flex flex-wrap gap-5">
          <button type="button" className="underline underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4" onClick={props.onHelp}>Need help?</button>
          <button type="button" className="underline underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4" onClick={props.onJoin}>Trust Project</button>
        </div>
      </footer>
    </main>
  );
}
