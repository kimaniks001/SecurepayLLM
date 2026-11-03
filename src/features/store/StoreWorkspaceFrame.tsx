import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Plus, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import type { StoreState } from './controller';

/** Store composition only. Saved facts come from the controller's API reads. */
export function StoreWorkspaceFrame({ state, children, onBrowse, onManage, onCreate, onReturn }: {
  state: StoreState;
  children: ReactNode;
  onBrowse: () => void;
  onManage: () => void;
  onCreate: () => void;
  onReturn?: () => void;
}) {
  const [panel, setPanel] = useState<'work' | 'check' | 'tools'>('work');
  useEffect(() => { setPanel('work'); }, [state.view]);
  const editing = state.view === 'builder';
  const mine = state.mine.status === 'ready' ? state.mine.data : null;
  const savedOffer = editing && mine ? mine.raw.find(offer => offer.id === state.editingOfferId) : null;
  const publishedCount = mine?.raw.filter(offer => offer.published).length ?? 0;
  const privateCount = mine ? mine.raw.length - publishedCount : 0;
  const actionClass = 'flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-cream-100 disabled:opacity-50';
  const continueEditing = () => {
    setPanel('work');
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[data-store-work] input')?.focus());
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] flex-1 p-3 md:p-4">
      <nav aria-label="Store workspace panels" className="mb-3 flex rounded-xl border border-cream-200 bg-white p-1 lg:hidden">
        {(['work', 'check', 'tools'] as const).map(value => <button key={value} type="button" aria-pressed={panel === value}
          onClick={() => setPanel(value)} className={`min-h-11 min-w-0 flex-1 rounded-lg px-2 text-sm ${panel === value ? 'bg-forest-800 text-white' : 'text-forest-800'}`}>
          {value === 'work' ? 'Store' : value === 'check' ? 'SecurePay Check' : 'Tools'}
        </button>)}
      </nav>
      <div className="grid items-start gap-3 lg:grid-cols-[10rem_minmax(0,1fr)_15rem] xl:grid-cols-[11rem_minmax(0,1fr)_18rem]">
        <aside aria-label="Store tools and navigation" className={`${panel === 'tools' ? 'block' : 'hidden'} min-w-0 rounded-2xl border border-cream-200 bg-white p-3 lg:sticky lg:top-4 lg:block`}>
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sand-600">Tools</p>
          <nav aria-label="Store navigation" className="space-y-1 text-forest-800">
            <button type="button" disabled={editing} onClick={() => { onBrowse(); setPanel('work'); }} className={actionClass}><ShoppingBag size={18} className="shrink-0" /> Browse offers</button>
            <button type="button" disabled={editing} onClick={onManage} className={actionClass}><Store size={18} className="shrink-0" /> Manage Stores</button>
            <button type="button" disabled={editing} onClick={onCreate} className={actionClass}><Plus size={18} className="shrink-0" /> New offer</button>
            {onReturn && <button type="button" disabled={editing} onClick={onReturn} className={actionClass}><ArrowLeft size={18} className="shrink-0" /> Return to work</button>}
          </nav>
          {editing && <p className="mt-3 px-3 text-xs leading-5 text-sand-600">Finish reviewing your offer or use My Store to return.</p>}
        </aside>

        <section aria-label="Store work" data-store-work className={`${panel === 'work' ? 'flex' : 'hidden'} min-w-0 flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white lg:flex`}>
          {children}
        </section>

        <aside aria-label="SecurePay Check" className={`${panel === 'check' ? 'block' : 'hidden'} min-w-0 rounded-2xl border border-cream-200 bg-white p-5 lg:sticky lg:top-4 lg:block`}>
          <h2 className="flex items-center gap-2 font-display text-lg text-forest-900"><ShieldCheck size={20} /> SecurePay Check</h2>
          <section className="mt-5 space-y-2 text-sm leading-6 text-sand-700">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sand-600">Facts</h3>
            {editing ? <>
              <p>{state.editingOfferId ? savedOffer ? `Saved offer: ${savedOffer.published ? 'published' : 'private draft'}.` : 'Saved offer status is unavailable.' : 'New offer: private, not yet saved.'}</p>
              <p>Changes in this editor have not been saved.</p>
              <p>{state.draft.published ? 'Publication is selected for your next save.' : 'Your next save will keep this offer private.'}</p>
            </> : state.view === 'manage' ? mine ? <>
              <p className="break-words">{state.managedBusiness ? `Business Store · ${state.managedBusiness.ksNumber}` : `Personal Store · ${mine.profile.id}`}</p>
              <p>{publishedCount} published · {privateCount} private {privateCount === 1 ? 'draft' : 'drafts'}</p>
            </> : <p>{state.mine.status === 'error' ? 'Store facts could not be loaded.' : 'Loading your Store facts…'}</p>
              : <p>{state.search.status === 'ready' ? `${state.search.data.length} offers in the current results.` : state.search.status === 'error' ? 'Search results are unavailable.' : 'Loading published offers…'}</p>}
          </section>
          <section className="mt-5 space-y-2 text-sm leading-6 text-sand-700">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sand-600">Attention</h3>
            <p>{editing ? state.draftError ?? (state.draftBusy ? 'Waiting for SecurePay to confirm your save.' : 'Review the offer before saving. Publication changes only after SecurePay accepts it.')
              : state.view === 'manage' ? !mine ? 'Wait for the Store read or try opening it again.' : privateCount > 0 ? 'Private drafts are hidden from customers. Review each offer before publishing.' : 'Keep your offers current. Share your address after SecurePay confirms the public Store.'
                : 'Review the trader’s offer and availability before choosing to use it.'}</p>
          </section>
          <section className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sand-600">Next action</h3>
            <button type="button" disabled={state.draftBusy || (state.view === 'manage' && state.mine.status === 'loading')}
              onClick={editing ? continueEditing : state.view === 'manage' && !mine ? onManage : onCreate}
              className="mt-2 min-h-11 w-full rounded-xl bg-forest-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {editing ? 'Continue editing' : state.view === 'manage' && !mine ? 'Open your Store again' : 'Add an offer'}
            </button>
          </section>
          <p className="mt-5 border-t border-cream-200 pt-4 text-xs leading-5 text-sand-600">An offer is not an Agreement. Publishing creates no reservation, payment or settlement.</p>
        </aside>
      </div>
    </div>
  );
}
