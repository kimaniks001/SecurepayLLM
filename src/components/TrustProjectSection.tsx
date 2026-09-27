import { useState } from 'react';
import { FairTradePrinciplesPanel } from './FairTradePrinciples';
import { membershipLine, type TrustProjectMembershipFact } from './trustProject';
import { CAPACITIES as SHARED_CAPACITIES, ORIGIN, PILLARS } from '../features/public/publicContent';
import { ShareInvitation } from '../features/join/ShareInvitation';
import { SHARE_PROMPT, type JoinInterest } from '../features/join/share';

/** Which capacity card carries which (presentation-only) share context. */
const CAPACITY_INTEREST: Record<string, JoinInterest> = { Member: 'member', Plug: 'plug', Master: 'master' };

/**
 * Phase 7 Slice 5B (The Trust Project convergence) -- the low-on-Home "About / Why this exists" section.
 *
 * Current architectural decision: The Trust Project is NOT a separate product surface (no nav item, no
 * dashboard, no second Home, no second identity number). This section is rendered BELOW the KS001 Home
 * (`SignedOutHome` stays first and untouched) and explains the community and shared capabilities around
 * SecurePay. Every capability it names is real on current main; what is not live (the Skills Institute,
 * training, practice spaces) is said to be not available yet -- locked Phase 11D doctrine keeps
 * TRAINING / SKILLS_INSTITUTE out of the capability registry, so nothing here may present them as live.
 *
 * Membership is belonging, never certification; Plug / Master are capacities, never ranks, and grant no
 * Agreement, dispute or Money authority. Plug economics are the existing
 * `agreement-plug-share-10pct-v1` rule only (a qualifying, attributed, settled introduction) -- an
 * invitation to join is never an introduction and earns nothing.
 */

// The capacities' meaning is shared with the public Home (Public Experience Convergence Phase 2) so it never drifts.
const CAPACITIES = SHARED_CAPACITIES;

interface TrustProjectSectionProps {
  /** The primary doorway: the real Community view (Community LIVE and Circles). */
  onExploreCommunity: () => void;
  /** The real Store view. */
  onOpenStores: () => void;
  /** Signed-in members get a smaller doorway; the full explanation stays one tap away. */
  compact?: boolean;
  /**
   * The signed-in person's membership fact. `null`/absent = UNKNOWN (still loading, or the read failed): no
   * membership claim and no Join -- it could be any state. A fact with `status: null` = a KNOWN non-member
   * (a successful `/membership/me` read with no record).
   */
  membership?: TrustProjectMembershipFact | null;
  /** Public Experience Convergence Phase 4 -- the live Join page (membership states are resolved there). */
  onJoin?: () => void;
}

export function TrustProjectSection({ onExploreCommunity, onOpenStores, compact = false, membership = null, onJoin }: TrustProjectSectionProps) {
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  // Phase 4 -- quick share invitations (ACTIVE members only). The interest is presentation context only.
  const [sharing, setSharing] = useState<JoinInterest | null>(null);
  // Phase 4 final correction -- three states, never collapsed: UNKNOWN (no fact) offers only neutral actions;
  // a KNOWN non-member or DECLINED gets Join; INVITED gets Review invitation; REVOKED gets nothing.
  const known = membership != null;
  const status = membership?.status ?? null;
  const isActive = known && status === 'ACTIVE';
  const canJoin = !!onJoin && known && status !== 'ACTIVE' && status !== 'REVOKED';
  const [expanded, setExpanded] = useState(!compact);
  const memberLine = membershipLine(membership);

  return (
    <section aria-labelledby="trust-project-heading" className="px-4 md:px-6 pb-10">
      <div className="max-w-3xl mx-auto border-t border-cream-200/70 pt-8">
        <p className="text-[0.68rem] uppercase tracking-wide text-forest-600 font-semibold">The Trust Project</p>
        <h2 id="trust-project-heading" className="mt-1 font-display text-xl md:text-2xl text-forest-800 leading-snug text-balance">
          Shared fair-trade technologies, systems and people.
        </h2>
        <p className="mt-2 text-[0.88rem] text-sand-600 leading-relaxed max-w-2xl">
          A community of people choosing to trade fairly — using shared tools, practical systems and one another’s knowledge to learn, adapt and make useful things happen.
        </p>
        {memberLine && <p className="mt-2 text-[0.8rem] font-medium text-forest-700">{memberLine}</p>}
        {status === 'INVITED' && <p className="mt-2 text-[0.8rem] text-forest-700">You’ve been invited to The Trust Project. Review the invitation and the 12 Principles, then choose whether to join.</p>}

        {compact && (
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded(e => !e)} className="mt-2 text-[0.8rem] text-forest-600 hover:text-forest-800 underline">
            {expanded ? 'Show less' : 'What The Trust Project is'}
          </button>
        )}

        {expanded && <>
          <ul aria-label="What The Trust Project shares" className="mt-5 grid gap-3 md:grid-cols-3">
            {PILLARS.map(p => (
              <li key={p.title} className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-3">
                <h3 className="font-display text-[1rem] text-forest-800">{p.title}</h3>
                <p className="text-[0.82rem] text-forest-700">{p.line}</p>
                <p className="mt-1 text-[0.78rem] text-sand-600 leading-relaxed">{p.detail}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <h3 className="font-display text-[1.05rem] text-forest-800">Why join</h3>
            <p className="mt-1 text-[0.85rem] text-sand-700 leading-relaxed max-w-2xl">
              Membership gives you access to shared technologies, systems and people that can help you learn, adapt, make useful things happen and trade fairly. You stay independent: your own business, prices, customers and choices. Use what helps you. Contribute what you know.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="font-display text-[1.05rem] text-forest-800">How people take part</h3>
            <p className="text-[0.82rem] text-forest-700">Members belong. Plugs help. Masters bring experience.</p>
            <ul aria-label="Ways to take part" className="mt-3 grid gap-3 md:grid-cols-3">
              {CAPACITIES.map(c => (
                <li key={c.name} className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-3">
                  <h4 className="font-display text-[0.95rem] text-forest-800">{c.name}</h4>
                  <p className="text-[0.8rem] text-forest-700">{c.line}</p>
                  <p className="mt-1 text-[0.76rem] text-sand-600 leading-relaxed">{c.detail} {c.boundary}</p>
                  {isActive && CAPACITY_INTEREST[c.name] && (
                    <div className="mt-2 border-t border-cream-200 pt-2" data-share-prompt={CAPACITY_INTEREST[c.name]}>
                      <p className="text-[0.76rem] text-sand-700">{SHARE_PROMPT[CAPACITY_INTEREST[c.name]]}</p>
                      <button type="button" onClick={() => setSharing(CAPACITY_INTEREST[c.name])}
                        className="mt-1 min-h-11 rounded-lg text-[0.8rem] font-medium text-forest-700 underline hover:text-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
                        Invite them
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.76rem] text-sand-600">
              Everyone can learn, contribute and trade. Some members also take on these extra capacities, and one person can be both a Plug and a Master. They are not ranks.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3">
              <h3 className="font-display text-[0.95rem] text-forest-800">Your KS Store</h3>
              <p className="mt-1 text-[0.78rem] text-sand-600 leading-relaxed">
                Your KS identity gives you a digital Store while your SecurePay identity is active. It can start empty — nothing is published until you publish it. A Store is not an endorsement.
              </p>
            </div>
            <div className="rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3">
              <h3 className="font-display text-[0.95rem] text-forest-800">Learn and adapt together</h3>
              <p className="mt-1 text-[0.78rem] text-sand-600 leading-relaxed">
                As technology changes, members can learn, test and adapt together — asking in Community, learning from Masters and sharing what works. The Skills Institute, for structured training and practice, is not open yet.
              </p>
            </div>
          </div>

          <details className="mt-5 group">
            <summary className="cursor-pointer text-[0.8rem] text-forest-600 hover:text-forest-800">How this started</summary>
            <ol className="mt-2 space-y-1 text-[0.8rem] text-sand-600 leading-relaxed list-decimal pl-5">
              {ORIGIN.map(line => <li key={line}>{line}</li>)}
            </ol>
          </details>

          <p className="mt-5 text-[0.78rem] text-sand-600">Money should follow the agreement.</p>
        </>}

        {sharing && <div className="mt-5"><ShareInvitation interest={sharing} onClose={() => setSharing(null)} /></div>}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {canJoin && (
            <button type="button" onClick={onJoin} className="min-h-11 rounded-xl bg-forest-600 text-cream-50 text-[0.85rem] font-medium px-4 py-2.5 hover:bg-forest-700 transition-colors">
              {status === 'INVITED' ? 'Review invitation' : 'Join The Trust Project'}
            </button>
          )}
          {(isActive || !onJoin) && (
            <button type="button" onClick={onExploreCommunity} className="min-h-11 rounded-xl bg-forest-600 text-cream-50 text-[0.85rem] font-medium px-4 py-2.5 hover:bg-forest-700 transition-colors">
              Explore Community
            </button>
          )}
          {isActive && (
            <button type="button" onClick={() => setSharing('member')} className="min-h-11 text-[0.8rem] text-forest-600 hover:text-forest-800 underline">
              Invite someone
            </button>
          )}
          <button type="button" onClick={() => setPrinciplesOpen(true)} className="text-[0.8rem] text-forest-600 hover:text-forest-800 underline">
            Read the 12 Principles
          </button>
          <button type="button" onClick={onOpenStores} className="text-[0.8rem] text-forest-600 hover:text-forest-800 underline">
            Stores
          </button>
        </div>
      </div>
      {principlesOpen && <FairTradePrinciplesPanel onClose={() => setPrinciplesOpen(false)} />}
    </section>
  );
}
