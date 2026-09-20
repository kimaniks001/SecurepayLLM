import type { AgentProfile, AgentProvider, DiscoveryView } from '../../../api/securepay/agent/discovery';
import { formatMinor } from '../money';
import { profileRows, resultFromAgentListing } from '../result';
import { availabilityView } from '../result';
import { FactCompare } from './FactCompare';
import { PriceContext } from './PriceContext';
import { ResultCard } from './ResultCard';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';
const Empty = ({ children }: { children: string }) => <p role="status" className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-[0.9rem] text-sand-700">{children}</p>;
const StoreLink = ({ name, onClick }: { name: string; onClick: () => void }) =>
  <button type="button" onClick={onClick} aria-label={`See what ${name} publishes`} className={`min-h-11 rounded-lg text-[0.85rem] font-medium text-forest-700 underline decoration-cream-400 underline-offset-4 ${FOCUS}`}>See what they publish</button>;

/**
 * FOUND ON SECUREPAY: what SecurePay's real tools returned during THIS conversation -- a different
 * epistemic category from "what SecurePay understands". Everything is rendered from the strictly validated
 * server payload; nothing is added. A listing/provider from these tools has no offer id, so the only
 * action is "See their Store", where the real offers (with ids) live and "Use this" is possible.
 * SecurePay's tools return results newest-first and never rank; nothing here says otherwise.
 */
export function FoundOnSecurePay({ views, earlier = [], onOpenStore }: { views: DiscoveryView[]; earlier?: DiscoveryView[][]; onOpenStore: (ownerKs: string, ownerName: string) => void }) {
  const real = (list: DiscoveryView[]) => list.filter((v): v is DiscoveryView & { payload: NonNullable<DiscoveryView['payload']> } => v.payload !== null);
  const latest = real(views); const before = earlier.map(real).filter(group => group.length > 0);
  if (latest.length === 0 && before.length === 0) return null;
  return <div className="space-y-4">
    <p className="text-[0.78rem] leading-snug text-sand-500">From this conversation, shown from current listings. SecurePay doesn’t rank or choose for you.</p>
    {latest.map((view, i) => <Block key={i} view={view} onOpenStore={onOpenStore} />)}
    {before.length > 0 && <details className="group rounded-2xl border border-cream-200 bg-white/50 px-4 py-2">
      <summary className={`min-h-11 cursor-pointer list-none text-[0.85rem] text-sand-600 marker:hidden ${FOCUS}`}>Earlier in this conversation · {before.length}</summary>
      <div className="mt-2 space-y-6 pb-2">{before.map((group, g) => <div key={g} className="space-y-4">{group.map((view, i) => <Block key={i} view={view} onOpenStore={onOpenStore} />)}</div>)}</div>
    </details>}
  </div>;
}

function Block({ view, onOpenStore }: { view: DiscoveryView & { payload: NonNullable<DiscoveryView['payload']> }; onOpenStore: (ks: string, name: string) => void }) {
  const p = view.payload;
  switch (p.kind) {
    case 'listings':
      if (!p.supported) return <Empty>SecurePay can’t search Store listings right now.</Empty>;
      if (p.listings.length === 0) return <Empty>SecurePay looked at the published Store listings and found nothing matching that.</Empty>;
      return <section aria-label="Store listings" className="space-y-3">
        <h3 className="px-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Store listings · {p.listings.length}</h3>
        {p.listings.map((listing, i) => { const offer = resultFromAgentListing(listing, i); return <div key={offer.key} className="space-y-0.5"><ResultCard offer={offer} actionLabel="See Store" onOpen={() => onOpenStore(offer.ownerKs, offer.ownerName)} /></div>; })}
        <p className="px-1 text-[0.78rem] text-sand-500">Open a seller’s Store to see the real offer and choose it.{p.dropped > 0 ? ` ${p.dropped} unreadable ${p.dropped === 1 ? 'entry was' : 'entries were'} skipped.` : ''}</p>
      </section>;
    case 'providers':
      if (!p.supported) return <Empty>SecurePay can’t search for people right now.</Empty>;
      if (p.providers.length === 0) return <Empty>SecurePay looked at what people have published and found nobody matching that.</Empty>;
      return <section aria-label="People to consider" className="space-y-3">
        <h3 className="px-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">People to consider · {p.providers.length}</h3>
        {p.providers.map((provider, i) => <ProviderResult key={`${provider.providerRef}:${i}`} provider={provider} onOpenStore={onOpenStore} />)}
      </section>;
    case 'profile': return <ProfileResult profile={p.profile} onOpenStore={onOpenStore} />;
    case 'comparison': return <section aria-label="Provider comparison" className="space-y-3">
      <h3 className="px-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Side by side</h3>
      <FactCompare heads={p.profiles.map(pr => pr.displayName || pr.providerRef)} rows={profileRows(p.profiles)} />
      <div className="flex flex-wrap gap-x-4">{p.profiles.filter(pr => pr.found).map(pr => <button key={pr.providerRef} type="button" onClick={() => onOpenStore(pr.providerRef, pr.displayName)} className={`min-h-11 rounded-lg text-[0.85rem] font-medium text-forest-700 underline decoration-cream-400 underline-offset-4 ${FOCUS}`}>See what {pr.displayName} publishes</button>)}</div>
    </section>;
    case 'price': return <PriceContext price={p.price} />;
  }
}

function ProviderResult({ provider, onOpenStore }: { provider: AgentProvider; onOpenStore: (ks: string, name: string) => void }) {
  return <article className="rounded-2xl border border-cream-200 bg-white/85 p-4 shadow-soft">
    <h4 className="font-display text-[1.08rem] leading-snug text-forest-800">{provider.displayName}</h4>
    <p className="mt-0.5 text-[0.82rem] text-sand-600"><span className="text-sand-500">{provider.providerRef}</span>{provider.serviceArea ? ` · ${provider.serviceArea}` : ''}</p>
    {provider.matchingCapabilities.length > 0 && <p className="mt-2 text-[0.85rem] text-sand-700"><span className="text-sand-500">Published a service: </span>{provider.matchingCapabilities.join(' · ')}</p>}
    <p className="mt-1 text-[0.75rem] text-sand-400">Shown because a service they’ve published matches your search.</p>
    <div className="mt-1"><StoreLink name={provider.displayName} onClick={() => onOpenStore(provider.providerRef, provider.displayName)} /></div>
  </article>;
}

function ProfileResult({ profile, onOpenStore }: { profile: AgentProfile; onOpenStore: (ks: string, name: string) => void }) {
  if (!profile.found) return <Empty>{`SecurePay has no published profile for ${profile.providerRef || 'that reference'}.`}</Empty>;
  const list = (label: string, offers: AgentProfile['services']) => offers.length === 0 ? null : <div>
    <h5 className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">{label}</h5>
    <ul className="mt-1 divide-y divide-cream-100">{offers.map((o, i) => <li key={i} className="flex items-baseline justify-between gap-3 py-2">
      <div className="min-w-0"><p className="break-words text-[0.9rem] text-forest-800">{o.title}</p>{o.description && <p className="text-[0.78rem] text-sand-500 line-clamp-2">{o.description}</p>}</div>
      <div className="shrink-0 text-right"><p className="text-[0.9rem] tabular-nums text-forest-800">{formatMinor(o.priceMinor, o.currency) ?? 'No price listed'}</p><p className="text-[0.72rem] text-sand-500">{availabilityView(o.availabilityState).label}</p></div>
    </li>)}</ul></div>;
  return <article aria-label={`${profile.displayName} profile`} className="space-y-3 rounded-2xl border border-cream-200 bg-white/85 p-4 shadow-soft">
    <div><h4 className="font-display text-[1.15rem] leading-snug text-forest-800">{profile.displayName}</h4>
      <p className="text-[0.82rem] text-sand-600"><span className="text-sand-500">{profile.providerRef}</span>{profile.serviceArea ? ` · ${profile.serviceArea}` : ''}</p></div>
    {profile.about && <p className="whitespace-pre-line break-words text-[0.9rem] leading-relaxed text-sand-700">{profile.about}</p>}
    {list('Services', profile.services)}{list('Products', profile.products)}
    {profile.services.length === 0 && profile.products.length === 0 && <p className="text-[0.85rem] text-sand-500">They haven’t published any offers right now.</p>}
    <StoreLink name={profile.displayName} onClick={() => onOpenStore(profile.providerRef, profile.displayName)} />
  </article>;
}
