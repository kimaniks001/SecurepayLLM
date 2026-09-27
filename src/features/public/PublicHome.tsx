import { useState, type ReactNode } from 'react';
import { ArrowRight, Store, Users } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import { SecurePayHero } from '../../components/SignedOutHome';
import { FairTradePrinciplesPanel } from '../../components/FairTradePrinciples';
import { CAPACITIES, FOR_BUSINESS_POINTS, HOW_IT_WORKS_STEPS, HOW_IT_WORKS_TRUTH, ORIGIN, PILLARS, POSSIBILITIES, TRY_ASKING_PROMPTS } from './publicContent';
import type { PublicSectionId } from './publicShell';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';
const chapterHeading = 'font-display text-2xl md:text-4xl font-medium tracking-tight text-forest-800 text-balance scroll-mt-28 focus:outline-none';
const body = 'text-[0.95rem] leading-relaxed text-sand-700';
const eyebrow = 'text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-forest-600';
const secondaryButton = `inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-white/80 px-4 text-[0.875rem] font-medium text-forest-800 transition-colors hover:border-forest-300 hover:bg-white ${focusRing}`;
const linkButton = `min-h-11 rounded-lg px-1 text-[0.875rem] text-forest-700 underline decoration-forest-200 underline-offset-4 hover:text-forest-800 ${focusRing}`;

export interface PublicHomeProps {
  disabled?: boolean;
  onStart: (text: string) => void;
  onBringPlan: () => void;
  onPickDocument: (file: File) => void;
  onPickPhoto: (file: File) => void;
  /** The "Bring your plan" panel, rendered right under the intake when open. */
  bringPlanPanel?: ReactNode;
  onFocusComposer: () => void;
  onBrowseStores: () => void;
  onSignIn: () => void;
  onRecover: () => void;
  onHelp: () => void;
  onSection: (id: PublicSectionId) => void;
}

/**
 * Public Experience Convergence Phase 2 -- the signed-out public Home, its own composition
 * (docs/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE1.md §6, §8.1, §9).
 *
 * The first screen is SecurePay + KS001 (the shared `SecurePayHero`, unchanged behaviour). Everything below
 * explains; nothing below loads live data. There is no Join chapter: Join becomes real only in Phase 4, and
 * the public Home never shows a placeholder for it. The signed-in Home never renders this component.
 */
export function PublicHome(props: PublicHomeProps) {
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  return (
    <main id="main" className="bg-cream-100" data-public-home>
      {/* 2–3 · SecurePay + KS001 hero and intake */}
      <section aria-label="Start with KS001" data-public-section="ks001" className="relative bg-cream-100 bg-ks001-surface px-4 sm:px-6 pt-10 pb-20 md:pt-16 md:pb-28">
        <div className="flex flex-col items-center">
          <SecurePayHero
            variant="public"
            disabled={props.disabled}
            onStart={props.onStart}
            onBringPlan={props.onBringPlan}
            onPickDocument={props.onPickDocument}
            onPickPhoto={props.onPickPhoto}
          />
          {props.bringPlanPanel && <div className="mt-6 w-full max-w-xl text-left">{props.bringPlanPanel}</div>}
        </div>

        {/* 4 · Try asking */}
        <div className="mx-auto mt-14 max-w-3xl">
          <h2 id="public-try-asking" className="text-center text-[0.8rem] font-medium text-sand-700">Try asking</h2>
          <ul className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-2 scrollbar-thin md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0" aria-label="Things you can ask KS001">
            {TRY_ASKING_PROMPTS.map(prompt => (
              <li key={prompt} className="snap-start shrink-0">
                <button type="button" disabled={props.disabled} onClick={() => props.onStart(prompt)}
                  className={`min-h-11 whitespace-nowrap rounded-full border border-cream-300 bg-white/70 px-4 text-[0.85rem] text-forest-800 transition-colors hover:border-forest-300 hover:bg-white disabled:opacity-40 ${focusRing}`}>
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 · How SecurePay works — first soft transition */}
      <section data-public-section="how-it-works" aria-labelledby="public-how-it-works" className="relative -mt-10 rounded-t-[2.5rem] bg-cream-50 px-4 sm:px-6 py-16 md:py-24 shadow-[0_-12px_32px_-24px_rgba(36,73,54,0.18)]">
        <div className="mx-auto max-w-5xl">
          <p className={eyebrow}>How it works</p>
          <h2 id="public-how-it-works" tabIndex={-1} className={`mt-2 ${chapterHeading}`}>How SecurePay works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <span aria-hidden="true" className="font-display text-5xl font-light text-forest-300">{index + 1}</span>
                <h3 className="mt-2 font-display text-lg text-forest-800">{step.title}</h3>
                <p className={`mt-1.5 ${body}`}>{step.detail}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-col gap-5 border-t border-cream-200 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-xl text-[0.95rem] leading-relaxed text-forest-800">{HOW_IT_WORKS_TRUTH}</p>
            <button type="button" onClick={props.onFocusComposer} className={secondaryButton}>
              Start with KS001 <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 6 · The Trust Project */}
      <section data-public-section="trust-project" aria-labelledby="public-trust-project" className="relative bg-cream-100 px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-14">
            <div>
              <p className={`flex items-center gap-2 ${eyebrow}`}>
                <img src={securepayMark} alt="" className="h-4 w-4 opacity-80" />Powered by SecurePay
              </p>
              <h2 id="public-trust-project" tabIndex={-1} className={`mt-2 ${chapterHeading}`}>The Trust Project</h2>
              <p className="mt-4 font-display text-xl leading-snug text-forest-700 text-balance">
                The Trust Project is powered by SecurePay. Your KS Number is your identity across both.
              </p>
              <p className={`mt-4 ${body}`}>
                A community of people and businesses choosing to trade fairly — using shared tools, practical systems and one another’s knowledge to learn, adapt and make useful things happen, while staying independent.
              </p>
            </div>
            <ul className="grid gap-6 self-end" aria-label="What The Trust Project shares">
              {PILLARS.map(pillar => (
                <li key={pillar.title} className="border-l-2 border-forest-200 pl-4">
                  <h3 className="font-display text-lg text-forest-800">{pillar.title}</h3>
                  <p className="text-[0.9rem] text-forest-700">{pillar.line}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <details className="group">
              <summary className={`cursor-pointer list-none ${linkButton} inline-flex items-center`}>How this started</summary>
              <ol className="mt-3 max-w-2xl list-decimal space-y-1.5 pl-5 text-[0.9rem] leading-relaxed text-sand-700">
                {ORIGIN.map(line => <li key={line}>{line}</li>)}
              </ol>
            </details>
            <button type="button" onClick={() => setPrinciplesOpen(true)} className={linkButton}>Read the 12 Principles</button>
          </div>
        </div>
      </section>

      {/* 7 · Member · Plug · Master — second soft transition */}
      <section aria-labelledby="public-capacities" className="relative -mt-8 rounded-t-[2.5rem] bg-cream-50 px-4 sm:px-6 py-16 md:py-24 shadow-[0_-12px_32px_-24px_rgba(36,73,54,0.18)]">
        <div className="mx-auto max-w-5xl">
          <p className={eyebrow}>Ways to take part</p>
          <h2 id="public-capacities" className={`mt-2 ${chapterHeading}`}>Member, Plug and Master</h2>
          <p className={`mt-3 max-w-2xl ${body}`}>Side by side, never ranks. Nobody has to become anything more than a Member.</p>
          <ul className="mt-10 grid items-stretch gap-4 lg:grid-cols-3" aria-label="Member, Plug and Master">
            {CAPACITIES.map(capacity => (
              <li key={capacity.name} className="flex h-full flex-col rounded-2xl border border-cream-200/80 bg-white px-6 py-6 shadow-soft" data-capacity={capacity.name}>
                <h3 className="font-display text-2xl text-forest-800">{capacity.name}</h3>
                <p className="mt-1 text-[0.95rem] font-medium text-forest-700">{capacity.line}</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-sand-700">{capacity.detail}</p>
                <p className="mt-4"><span className="block border-t border-cream-200 pt-4 text-[0.85rem] leading-relaxed text-forest-700">{capacity.boundary}</span></p>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-[0.88rem] leading-relaxed text-sand-700">
            Plugs and Masters are individual people. Businesses belong as Members, and can work with Plugs and Masters.
          </p>
        </div>
      </section>

      {/* 8 · Real human possibilities */}
      <section aria-labelledby="public-possibilities" className="bg-cream-100 px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 id="public-possibilities" className={chapterHeading}>What becomes possible</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {POSSIBILITIES.map(item => (
              <li key={item.title}>
                <span aria-hidden="true" className="mb-3 block h-1 w-8 rounded-full bg-forest-300" />
                <h3 className="font-display text-lg text-forest-800">{item.title}</h3>
                <p className={`mt-1 ${body}`}>{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9 · Store / Community glimpse — explanation only, no live data */}
      <section aria-labelledby="public-glimpse" className="bg-cream-50 px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 id="public-glimpse" className={chapterHeading}>Stores and Community</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-cream-200/80 bg-white px-6 py-6 shadow-soft">
              <Store className="h-6 w-6 text-forest-600" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-forest-800">Stores</h3>
              <p className={`mt-2 ${body}`}>People and businesses keep a Store for what they offer. Anyone can browse.</p>
              <button type="button" onClick={props.onBrowseStores} className={`mt-5 ${secondaryButton}`}>
                Browse Stores <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="rounded-2xl border border-cream-200/80 bg-white px-6 py-6 shadow-soft">
              <Users className="h-6 w-6 text-forest-600" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-forest-800">Community</h3>
              <p className={`mt-2 ${body}`}>Members ask for and offer help in Community and Circles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10 · For Business — informational: there is no customer Business onboarding yet */}
      <section data-public-section="for-business" aria-labelledby="public-for-business" className="bg-cream-100 px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1fr] md:gap-14">
          <div>
            <p className={eyebrow}>For Business</p>
            <h2 id="public-for-business" tabIndex={-1} className={`mt-2 ${chapterHeading}`}>For Business</h2>
            <p className="mt-4 font-display text-xl leading-snug text-forest-700 text-balance">
              Use SecurePay directly or build it into how your business already works.
            </p>
          </div>
          <div className="self-end">
            <ul className="space-y-4">
              {FOR_BUSINESS_POINTS.map(point => (
                <li key={point} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-forest-400" />
                  <span className={body}>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.88rem] leading-relaxed text-sand-700">
              People always sign in as themselves. An authorised person acts for the business.
            </p>
          </div>
        </div>
      </section>

      {/* 11 · Fair Trade */}
      <section aria-labelledby="public-fair-trade" className="bg-cream-50 bg-ks001-surface px-4 sm:px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <img src={securepayMark} alt="" className="mx-auto h-8 w-8 opacity-90" />
          <h2 id="public-fair-trade" className={`mt-4 ${chapterHeading}`}>Guided by the 12 Principles of Fair Trade</h2>
          <p className={`mt-4 ${body}`}>
            The principles guide how SecurePay and The Trust Project work. They are not a certification, a rating or a guarantee.
          </p>
          <button type="button" onClick={() => setPrinciplesOpen(true)} className={`mt-6 ${secondaryButton}`}>Read the 12 Principles</button>
        </div>
      </section>

      {/* 13 · Footer — real destinations only */}
      <footer className="border-t border-cream-200 bg-cream-100 px-4 sm:px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="md:w-80 md:shrink-0">
            <p className="font-display text-lg text-forest-800">SecurePay</p>
            <p className="mt-1 text-[0.85rem] text-sand-700">Money should follow the agreement.</p>
            <p className="text-[0.85rem] text-sand-700">The Trust Project is powered by SecurePay.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              <li><button type="button" onClick={props.onSignIn} className={linkButton}>Sign in</button></li>
              <li><button type="button" onClick={() => props.onSection('for-business')} className={linkButton}>For Business</button></li>
              <li><button type="button" onClick={() => setPrinciplesOpen(true)} className={linkButton}>The 12 Principles</button></li>
              <li><button type="button" onClick={props.onHelp} className={linkButton}>Help</button></li>
              <li><button type="button" onClick={props.onRecover} className={linkButton}>Trouble signing in? Recover your account</button></li>
            </ul>
          </nav>
        </div>
      </footer>
      {principlesOpen && <FairTradePrinciplesPanel onClose={() => setPrinciplesOpen(false)} />}
    </main>
  );
}
