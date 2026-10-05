import { useState } from 'react';
import { ArrowRight, BookOpen, HeartHandshake, MapPin, Store, Target, Users, Wrench } from 'lucide-react';
import { FairTradePrinciplesPanel } from '../../components/FairTradePrinciples';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import { INTEREST_CONTEXT, type JoinInterest } from '../join/share';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';
const primary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest-700 px-5 py-3 text-[0.9rem] font-semibold text-cream-50 shadow-soft transition hover:bg-forest-800 ${focusRing}`;
const secondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white/80 px-5 py-3 text-[0.9rem] font-semibold text-forest-800 transition hover:bg-white ${focusRing}`;

export function TrustProjectWelcome({
  interest,
  onJoin,
  onGoSecurePay,
}: {
  interest: JoinInterest | null;
  onJoin: () => void;
  onGoSecurePay: () => void;
}) {
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  const goToProjects = () => document.getElementById('trust-purposeful-projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main id="main" data-trust-project-door className="min-h-dvh bg-[#f7f2e8] text-forest-900">
      <header className="sticky top-0 z-30 border-b border-forest-900/10 bg-[#fbf7ef]/90 backdrop-blur">
        <nav aria-label="Trust Project" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`flex min-h-11 items-center gap-3 rounded-xl ${focusRing}`} aria-label="Trust Project home">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 font-display text-lg text-cream-50">T</span>
            <span className="font-display text-xl font-medium text-forest-900">Trust Project</span>
          </button>
          <button type="button" onClick={onGoSecurePay}
            className={`min-h-11 rounded-xl px-3 text-[0.78rem] font-medium text-forest-700 hover:bg-white/70 sm:text-[0.85rem] ${focusRing}`}>
            Looking for SecurePay? <span className="font-semibold text-forest-900">Go to SecurePay →</span>
          </button>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-forest-900/10">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(218,184,111,0.32),transparent_38%),radial-gradient(circle_at_86%_18%,rgba(79,121,87,0.24),transparent_42%),linear-gradient(135deg,#fbf4e8_0%,#f2eadb_55%,#e8eee4_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-forest-600">The Trust Project</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.02] tracking-tight text-forest-950 sm:text-5xl lg:text-6xl">
              A place to trade fairly, build your life, and belong.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-sand-700 sm:text-lg">
              Come as you are. Bring what you know. Find people, opportunities, knowledge and things worth building together.
            </p>
            {interest && (
              <p className="mt-4 max-w-2xl rounded-2xl border border-forest-200/70 bg-white/55 px-4 py-3 text-[0.88rem] leading-relaxed text-forest-800">
                {INTEREST_CONTEXT[interest]}
              </p>
            )}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onJoin} className={primary}>Join the Project <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={goToProjects} className={secondary}>Explore Community Projects</button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[0.88rem] font-medium text-forest-800">
              <HeartHandshake className="h-5 w-5 text-forest-600" aria-hidden="true" /> Here, we trade fairly.
            </p>
          </div>

          <div className="grid min-h-[390px] grid-cols-2 grid-rows-2 gap-3 sm:min-h-[430px]">
            <article className="row-span-2 flex flex-col justify-end overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(155deg,#345f43_0%,#173c2a_62%,#102c20_100%)] p-6 text-cream-50 shadow-lifted">
              <Store className="h-9 w-9 opacity-90" aria-hidden="true" />
              <p className="mt-auto font-display text-3xl leading-tight">Trade fairly</p>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-cream-100/90">Be found for what you genuinely do, with cleaner agreements underneath the trade.</p>
            </article>
            <article className="flex flex-col justify-end rounded-[2rem] border border-amber-900/10 bg-[#e7c38d] p-5 text-forest-950 shadow-soft">
              <Wrench className="h-7 w-7" aria-hidden="true" />
              <p className="mt-auto font-display text-2xl">Build together</p>
              <p className="mt-1 text-[0.8rem] leading-relaxed">Useful work gives strangers something real to share.</p>
            </article>
            <article className="flex flex-col justify-end rounded-[2rem] border border-forest-900/10 bg-[#cfd9c8] p-5 text-forest-950 shadow-soft">
              <MapPin className="h-7 w-7" aria-hidden="true" />
              <p className="mt-auto font-display text-2xl">Explore with purpose</p>
              <p className="mt-1 text-[0.8rem] leading-relaxed">Go somewhere new because there is something worth doing there.</p>
            </article>
          </div>
        </div>
      </section>

      <section aria-label="What membership is for" className="border-b border-forest-900/10 bg-[#fbf7ef] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            { title: 'Trade Fairly', detail: 'Clearer agreements, accountable money and cleaner trade.', Icon: HeartHandshake },
            { title: 'Build Your Life', detail: 'Turn everyday work into plans, capability and visible progress.', Icon: Target },
            { title: 'Belong Somewhere', detail: 'Find community, projects, learning and useful people.', Icon: Users },
          ].map(({ title, detail, Icon }) => (
            <article key={title} className="rounded-2xl border border-forest-900/10 bg-white/75 p-5 shadow-soft">
              <Icon className="h-7 w-7 text-forest-600" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl text-forest-900">{title}</h2>
              <p className="mt-1 text-[0.9rem] leading-relaxed text-sand-700">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-forest-600">Membership in real life</p>
          <h2 className="mt-2 font-display text-3xl text-forest-950 sm:text-4xl">How membership helps</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-forest-900/10 bg-white/75 p-5">
              <Store className="h-6 w-6 text-forest-600" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl">Find opportunities</h3>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-sand-700">Let useful people find what you make, know and can do without asking you to become someone else.</p>
            </article>
            <article className="rounded-2xl border border-forest-900/10 bg-white/75 p-5">
              <Target className="h-6 w-6 text-forest-600" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl">Build goals from trade</h3>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-sand-700">Use the Vision Board to make concrete plans for what your everyday work is meant to build.</p>
              <div className="mt-4 rounded-xl bg-[#eef2e8] p-3">
                <div className="flex items-center justify-between gap-3 text-[0.72rem] font-medium text-forest-800">
                  <span>Example · Factory project</span><span>KES 4,000,000 goal</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><span className="block h-full w-[28%] rounded-full bg-forest-600" /></div>
                <p className="mt-2 text-[0.7rem] text-sand-600">You choose the plan. The goal stays visible beside the life you are building.</p>
              </div>
            </article>
            <article className="rounded-2xl border border-forest-900/10 bg-white/75 p-5">
              <MapPin className="h-6 w-6 text-forest-600" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl">Join real projects</h3>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-sand-700">Contribute skills, labour, mentorship or consultancy to useful work with clear dates and needs.</p>
              <div className="mt-4 rounded-xl border border-forest-900/10 bg-[#f6efe2] p-3 text-[0.72rem] text-forest-800">
                <p className="font-semibold">Rebuild a rainwater earth tank</p>
                <p className="mt-1">Needs: labour · masonry · mentorship</p>
              </div>
            </article>
            <article className="rounded-2xl border border-forest-900/10 bg-white/75 p-5">
              <BookOpen className="h-6 w-6 text-forest-600" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl">Learn and teach</h3>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-sand-700">Learn from experienced people, practise through real work, and pass useful knowledge forward.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="trust-purposeful-projects" className="scroll-mt-24 border-y border-forest-900/10 bg-[linear-gradient(135deg,#e8e0cf_0%,#dfe8dc_100%)] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-forest-600">Travel with purpose</p>
            <h2 className="mt-2 font-display text-3xl text-forest-950 sm:text-4xl">Go somewhere because there is something worth doing there.</h2>
            <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-sand-700">
              Join a community project in another place. Meet people through useful work. Bring a mentee or family member when the project allows it. Shared purpose gives strangers something natural to talk about before anyone has to ask, “What do they want from me?”
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Work', 'Contribute a skill, labour or practical help.'],
              ['Learn', 'See how other people solve real problems.'],
              ['Connect', 'Let friendship grow from something you did together.'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-2xl border border-white/70 bg-white/65 p-5">
                <p className="font-display text-xl text-forest-900">{title}</p>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-sand-700">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 text-center sm:px-6 md:py-20">
        <div className="mx-auto max-w-3xl">
          <img src={securepayMark} alt="" className="mx-auto h-8 w-8 opacity-80" />
          <h2 className="mt-4 font-display text-3xl text-forest-950 sm:text-4xl">Join us. Here we trade fairly.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-sand-700">
            One SecurePay identity underneath. One deliberate choice to belong. No second account, no automatic membership, and no surrender of your independence.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={onJoin} className={primary}>Become a Member <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => setPrinciplesOpen(true)} className={secondary}>Read the 12 Principles</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-forest-900/10 bg-forest-900 px-4 py-8 text-cream-50 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl">Trust Project</p>
            <p className="mt-1 text-[0.8rem] text-cream-100/80">A place to trade fairly, build your life, and belong.</p>
          </div>
          <p className="flex items-center gap-2 text-[0.8rem] text-cream-100/80"><img src={securepayMark} alt="" className="h-5 w-5 brightness-0 invert opacity-80" />Powered by SecurePay</p>
        </div>
      </footer>
      {principlesOpen && <FairTradePrinciplesPanel onClose={() => setPrinciplesOpen(false)} />}
    </main>
  );
}
