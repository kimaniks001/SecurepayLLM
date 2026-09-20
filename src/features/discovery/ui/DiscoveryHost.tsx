import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { SurfaceMount, SurfaceShell } from '../../instruments/ui/SurfaceShell';
import { useReturnFocus, useSheetEscape, useSurfaceKeys } from '../../instruments/ui/surfaceHooks';
import { MAX_COMPARE, type DiscoveryController, type DiscoveryQuery, type DiscoveryState } from '../controller';
import { compareRows, isClosed, type ResultOffer } from '../result';
import { FactCompare } from './FactCompare';
import { ResultCard } from './ResultCard';
import { SourceFailureNote } from './SourceReference';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const INPUT = `w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-3 text-[1rem] text-forest-800 placeholder:text-sand-400 focus:border-forest-400 ${FOCUS}`;
const Quiet = ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) =>
  <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 rounded-lg px-1 text-[0.875rem] text-sand-600 underline decoration-cream-400 underline-offset-4 hover:text-forest-700 disabled:opacity-40 ${FOCUS}`}>{children}</button>;
const Primary = ({ children, onClick, disabled, busy }: { children: ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean }) =>
  <button type="button" onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined} className={`min-h-11 w-full rounded-xl bg-forest-600 px-4 text-[0.95rem] font-medium text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS}`}>{children}</button>;

const KIND_WORDS = { SERVICE: { plural: 'services', ask: 'Someone to do a job' }, PRODUCT: { plural: 'products', ask: 'Something to buy' } } as const;
const recap = (q: DiscoveryQuery) => [q.what && `“${q.what}”`, q.place && `in ${q.place}`].filter(Boolean).join(' ') || `all published ${KIND_WORDS[q.kind].plural}`;
const words = (what: string) => [...new Set(what.split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}-]/gu, '')).filter(w => w.length >= 2))];

/**
 * "Find on SecurePay". Where a person goes when they do NOT already know who or what to use (if they know
 * a person, that is Add a person -- a different path). It searches only what SecurePay's Store can search:
 * a kind, words in a listing's title/description, and the seller's place. It never claims to have searched
 * by size, colour, budget, brand, rating or distance, never ranks, never picks. Choosing a result is "Use
 * this" = select it as this conversation's commercial source -- not buying, joining or confirming.
 */
export function DiscoveryHost({ controller, panelSlot, contextDetails, onBackToConversation, onAddPerson }: {
  controller: DiscoveryController; panelSlot: HTMLElement | null;
  /** Real facts already in Trade Context (e.g. "size 42", "KES 4,000") -- shown as still-to-check, never searched. */
  contextDetails: string[]; onBackToConversation: () => void; onAddPerson: () => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useReturnFocus(state.phase !== 'closed');
  if (state.phase === 'closed') return null;
  return <SurfaceMount panelSlot={panelSlot}>{variant => <Surface controller={controller} state={state} variant={variant} contextDetails={contextDetails} onBackToConversation={onBackToConversation} onAddPerson={onAddPerson} />}</SurfaceMount>;
}

function Surface({ controller, state, variant, contextDetails, onBackToConversation, onAddPerson }: {
  controller: DiscoveryController; state: Exclude<DiscoveryState, { phase: 'closed' }>; variant: 'panel' | 'sheet'; contextDetails: string[]; onBackToConversation: () => void; onAddPerson: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const busy = state.phase === 'searching' || state.phase === 'loading-store' || state.phase === 'source-selecting';
  const escape = () => { if (state.phase !== 'source-selecting') controller.close(); };
  const onKeyDown = useSurfaceKeys(root, variant, escape);
  useSheetEscape(variant, escape);
  // Deliberate focus on every screen change: the field to type in, else the screen's heading.
  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>('[data-autofocus]') ?? root.current?.querySelector<HTMLElement>('#discovery-title');
    el?.focus({ preventScroll: variant === 'panel' });
  }, [state.phase, variant]);

  const heading = (text: string) => text;
  let title = 'Find on SecurePay'; let body: ReactNode; let canBack = state.phase !== 'form';

  switch (state.phase) {
    case 'form': {
      const q = state.query;
      const submit = () => { if (q.what.trim() || q.place.trim()) void controller.search(q); };
      title = 'Find on SecurePay';
      body = <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-[0.72rem] font-medium uppercase tracking-wide text-sand-500">I’m looking for</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(['SERVICE', 'PRODUCT'] as const).map(kind => <button key={kind} type="button" role="radio" aria-checked={q.kind === kind} onClick={() => controller.setQuery({ ...q, kind })}
              className={`min-h-11 rounded-xl border px-3 text-[0.88rem] ${q.kind === kind ? 'border-forest-500 bg-forest-50 font-medium text-forest-800' : 'border-cream-300 bg-white text-sand-600 hover:border-forest-300'} ${FOCUS}`}>{KIND_WORDS[kind].ask}</button>)}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <label htmlFor="discovery-what" className="block text-[0.72rem] font-medium uppercase tracking-wide text-sand-500">What</label>
          <input id="discovery-what" data-autofocus value={q.what} onChange={e => controller.setQuery({ ...q, what: e.target.value })} autoComplete="off" placeholder={q.kind === 'SERVICE' ? 'painting' : 'shoes'} aria-describedby="discovery-what-hint" className={INPUT} />
          <p id="discovery-what-hint" className="text-[0.78rem] leading-snug text-sand-500">SecurePay looks for these words in a listing’s title or description. One plain word works best.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="discovery-place" className="block text-[0.72rem] font-medium uppercase tracking-wide text-sand-500">Where <span className="normal-case tracking-normal text-sand-400">(optional)</span></label>
          <input id="discovery-place" value={q.place} onChange={e => controller.setQuery({ ...q, place: e.target.value })} autoComplete="off" placeholder="Westlands" aria-describedby="discovery-place-hint" className={INPUT} />
          <p id="discovery-place-hint" className="text-[0.78rem] leading-snug text-sand-500">Matches the seller’s place as they wrote it. It isn’t a map or a distance.</p>
        </div>
        <button type="submit" disabled={!q.what.trim() && !q.place.trim()} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-4 text-[0.95rem] font-medium text-cream-50 hover:bg-forest-700 disabled:opacity-40 ${FOCUS}`}><Search className="h-4 w-4" aria-hidden="true" />Look on SecurePay</button>
        <p className="text-[0.78rem] leading-snug text-sand-500">Already know who? <button type="button" onClick={onAddPerson} className={`rounded text-forest-700 underline decoration-cream-400 underline-offset-4 ${FOCUS}`}>Add them by name instead</button>.</p>
      </form>;
      break;
    }
    case 'searching': case 'loading-store':
      title = state.phase === 'searching' ? 'Looking on SecurePay…' : `Opening ${state.ownerName}’s Store…`;
      body = <p role="status" className="py-6 text-[0.9rem] text-sand-600">{state.phase === 'searching' ? `Checking published ${KIND_WORDS[state.query.kind].plural} for ${recap(state.query)}.` : 'Reading what they’ve published.'}</p>;
      break;
    case 'results': {
      const n = state.results.length;
      title = `${n} published ${n === 1 ? KIND_WORDS[state.query.kind].plural.replace(/s$/, '') : KIND_WORDS[state.query.kind].plural}`;
      body = <div className="space-y-3">
        <p className="text-[0.85rem] text-sand-600">Matching {recap(state.query)}. <Quiet onClick={() => controller.editSearch()}>Change the search</Quiet></p>
        {contextDetails.length > 0 && <p className="rounded-xl bg-cream-50 px-3.5 py-2.5 text-[0.82rem] leading-snug text-sand-700">SecurePay searched only for the words above. Your other details — {contextDetails.join(', ')} — aren’t search filters, so check them on each listing.</p>}
        <p className="text-[0.78rem] leading-snug text-sand-500">Newest first, from current SecurePay listings. SecurePay doesn’t choose for you.</p>
        <ul className="space-y-3" aria-label="Results">
          {state.results.map(offer => <li key={offer.key}><ResultCard offer={offer} onOpen={() => controller.openDetail(offer)}
            compare={{ selected: state.compare.includes(offer.key), disabled: state.compare.length >= MAX_COMPARE, onToggle: () => controller.toggleCompare(offer.key) }} /></li>)}
        </ul>
        {state.compare.length >= 2 && <div className="sticky bottom-0 -mx-5 border-t border-cream-100 bg-white px-5 py-3"><Primary onClick={() => controller.openCompare()}>Compare {state.compare.length} facts side by side</Primary></div>}
      </div>;
      break;
    }
    case 'empty': {
      const q = state.query; const tryWords = words(q.what);
      title = 'Nothing published matches that yet';
      body = <div className="space-y-4">
        <p role="status" className="text-[0.92rem] leading-relaxed text-sand-700">Nothing matching {recap(q)} is published on SecurePay yet. SecurePay searched what’s really there and found no {KIND_WORDS[q.kind].plural}.</p>
        {tryWords.length > 1 && <div><p className="mb-1.5 text-[0.78rem] text-sand-500">Search matches the whole phrase. Try one word:</p>
          <div className="flex flex-wrap gap-2">{tryWords.map(w => <button key={w} type="button" onClick={() => void controller.search({ ...q, what: w })} className={`min-h-11 rounded-full border border-cream-300 bg-white px-3.5 text-[0.85rem] text-forest-700 hover:border-forest-300 ${FOCUS}`}>{w}</button>)}</div></div>}
        <ul className="space-y-0.5 text-[0.9rem]">
          <li><Quiet onClick={() => controller.editSearch()}>Change the search</Quiet></li>
          <li><Quiet onClick={onAddPerson}>I know who — add them by name</Quiet></li>
          <li><Quiet onClick={onBackToConversation}>Keep talking with KS001</Quiet></li>
        </ul>
      </div>;
      break;
    }
    case 'failed':
      title = 'SecurePay couldn’t look just now';
      body = <div className="space-y-3"><p role="alert" className="text-[0.92rem] text-sand-700">{state.error}</p><p className="text-[0.82rem] text-sand-500">Your search is kept: {recap(state.query)}.</p>
        <div className="flex flex-wrap gap-x-4"><Quiet onClick={() => void controller.retry()}>Try again</Quiet><Quiet onClick={() => controller.editSearch()}>Change the search</Quiet></div></div>;
      break;
    case 'store': {
      title = state.store.ownerName;
      const offers = state.store.offers;
      body = <div className="space-y-3">
        <p className="text-[0.82rem] text-sand-600">{state.store.ownerKs}{state.store.place ? ` · ${state.store.place}` : ''}</p>
        {state.store.about && <p className="text-[0.9rem] leading-relaxed text-sand-700">{state.store.about}</p>}
        {offers.length === 0 ? <p role="status" className="text-[0.9rem] text-sand-600">They haven’t published anything right now.</p>
          : <><p className="text-[0.78rem] text-sand-500">What they’ve published, newest first. SecurePay doesn’t choose for you.</p>
            <ul className="space-y-3" aria-label={`${state.store.ownerName}’s offers`}>{offers.map(offer => <li key={offer.key}><ResultCard offer={offer} onOpen={() => controller.openDetail(offer)}
              compare={offers.length > 1 ? { selected: state.compare.includes(offer.key), disabled: state.compare.length >= MAX_COMPARE, onToggle: () => controller.toggleCompare(offer.key) } : undefined} /></li>)}</ul></>}
        {state.compare.length >= 2 && <div className="sticky bottom-0 -mx-5 border-t border-cream-100 bg-white px-5 py-3"><Primary onClick={() => controller.openCompare()}>Compare {state.compare.length} facts side by side</Primary></div>}
      </div>;
      break;
    }
    case 'comparing':
      title = 'Side by side';
      body = <div className="space-y-3">
        <FactCompare heads={state.offers.map(o => o.title)} rows={compareRows(state.offers)} />
        <div className="flex flex-wrap gap-x-4">{state.offers.map((offer, i) => <Quiet key={offer.key} onClick={() => controller.openDetail(offer)}>View {String.fromCharCode(65 + i)}: {offer.title}</Quiet>)}</div>
      </div>;
      break;
    case 'detail': case 'source-selecting': case 'source-failed': {
      const offer = state.offer; title = offer.title;
      body = <Detail offer={offer} state={state} controller={controller} />;
      break;
    }
  }
  const showBack = canBack && state.phase !== 'source-selecting';
  canBack = showBack;

  return <SurfaceShell variant={variant} titleId="discovery-title" root={root} onKeyDown={onKeyDown} onBackdrop={() => { if (!busy) controller.close(); }}>
    <div className="flex items-start justify-between gap-2 px-5 pt-4 pb-1">
      <div className="flex min-w-0 items-start gap-1">
        {showBack && <button type="button" onClick={() => controller.back()} aria-label="Back" className={`-ml-2.5 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-cream-100 ${FOCUS}`}><ArrowLeft className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" /></button>}
        <h2 id="discovery-title" tabIndex={-1} className="min-w-0 break-words font-display text-[1.2rem] leading-snug text-forest-800 focus:outline-none">{heading(title)}</h2>
      </div>
      <button type="button" onClick={() => controller.close()} disabled={busy && state.phase === 'source-selecting'} aria-label="Close" className={`-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-500 hover:bg-cream-100 disabled:opacity-40 ${FOCUS}`}><X className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" /></button>
    </div>
    <div className="px-5 pb-5 pt-2">{body}</div>
  </SurfaceShell>;
}

function Detail({ offer, state, controller }: { offer: ResultOffer; state: Extract<DiscoveryState, { phase: 'detail' | 'source-selecting' | 'source-failed' }>; controller: DiscoveryController }) {
  const selecting = state.phase === 'source-selecting';
  const closed = isClosed(offer);
  const fromResults = state.back.phase === 'results';
  return <div className="space-y-4">
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">{offer.kind === 'SERVICE' ? 'Service' : offer.kind === 'PRODUCT' ? 'Product' : 'Listing'}</p>
      <p className="mt-0.5 text-[0.9rem] text-sand-700">{offer.ownerName} <span className="text-sand-400">· {offer.ownerKs}</span>{offer.place ? <span className="text-sand-500"> · {offer.place}</span> : null}</p>
    </div>
    <div className="flex items-end justify-between gap-3">
      {offer.priceLabel ? <p className="font-display text-[1.7rem] leading-none tabular-nums text-forest-800">{offer.priceLabel}</p> : <p className="text-[0.95rem] text-sand-500">No price listed</p>}
      <p className="text-[0.85rem] text-sand-700">{offer.availabilityLabel}{offer.quantity !== null ? ` · ${offer.quantity} listed` : ''}</p>
    </div>
    {offer.description && <p className="whitespace-pre-line break-words text-[0.92rem] leading-relaxed text-sand-700">{offer.description}</p>}
    {offer.mediaUrl && <img src={offer.mediaUrl} alt="" className="h-40 w-full rounded-xl object-cover" />}
    {offer.updatedAt && <p className="text-[0.75rem] text-sand-400">Listing updated {new Date(offer.updatedAt).toISOString().slice(0, 10)}</p>}
    {state.phase === 'source-failed' && <SourceFailureNote busy={false} error={state.error} onRetry={() => void controller.retrySource()} onContinueWithout={() => void controller.continueWithoutSource()} />}
    {state.phase !== 'source-failed' && <div className="space-y-2 border-t border-cream-100 pt-3">
      <Primary onClick={() => void controller.use(offer)} disabled={closed || !offer.offerId} busy={selecting}>{selecting ? 'Linking to your conversation…' : 'Use this'}</Primary>
      <p className="text-[0.78rem] leading-snug text-sand-500">{closed ? `The seller lists this as “${offer.availabilityLabel.toLowerCase()}” right now.` : 'Starts your conversation from this listing. Nothing is bought, joined or agreed.'}</p>
      {fromResults && <Quiet onClick={() => void controller.openStore(offer.ownerKs, offer.ownerName, state.query)}>More from {offer.ownerName}</Quiet>}
    </div>}
  </div>;
}
