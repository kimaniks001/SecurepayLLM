import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Lock, Sparkles, Unlock } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import type { AppView } from '../../types';
import type { VisionBoardController } from './controller';
import type { VisionBoardGateway } from '../../api/securepay/visionboard';
import type { GenerateDocumentRequest, VisionDocumentDto, VisionItemTypeCode, VisionShelfCode } from '../../api/securepay/visionboard/dto';

const ITEM_TYPE_OPTIONS: VisionItemTypeCode[] = [
  'IDEA', 'PLAN', 'BUSINESS_RULE', 'METHOD', 'TEMPLATE', 'REFERENCE_DOCUMENT', 'GUIDELINE',
  'MESSAGE_TEMPLATE', 'REMINDER', 'PERSONAL_GUIDANCE',
];

const USAGE_POLICY_OPTIONS: { value: import('../../api/securepay/visionboard/dto').VisionItemUsagePolicy; label: string; hint: string }[] = [
  { value: 'PROACTIVE', label: 'May bring this up when relevant', hint: 'SecurePay can mention it on its own, like a Christmas pricing rule.' },
  { value: 'REFERENCE_ONLY', label: 'Keep for reference', hint: "SecurePay only uses it when you ask about something related." },
  { value: 'EXPLICIT_ONLY', label: 'Only use when I ask for it', hint: 'For anything you want kept quiet unless you name it directly.' },
];

function DocumentGenerator({ gateway, ownerKsNumber }: { gateway: Pick<VisionBoardGateway, 'generateQuotation' | 'generateInvoice' | 'generateReceipt'>; ownerKsNumber: string | null }) {
  const [kind, setKind] = useState<'quotation' | 'invoice' | 'receipt' | null>(null);
  const [counterpartyName, setCounterpartyName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VisionDocumentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!kind) return;
    setBusy(true); setError(null); setResult(null);
    const body: GenerateDocumentRequest = { issuingKsNumber: ownerKsNumber ?? undefined, counterpartyName, description, amount, currency };
    try {
      const draft = kind === 'quotation' ? await gateway.generateQuotation(body)
        : kind === 'invoice' ? await gateway.generateInvoice(body)
        : await gateway.generateReceipt(body);
      setResult(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare that document.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 space-y-3">
      <div className="flex items-center gap-2 text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">
        <Sparkles className="w-3.5 h-3.5" /> Prepare a document
      </div>
      <div className="flex gap-2">
        {(['quotation', 'invoice', 'receipt'] as const).map(k => (
          <button
            key={k}
            onClick={() => { setKind(k); setResult(null); setError(null); }}
            className={`flex-1 rounded-lg border px-3 py-2 text-[0.8rem] capitalize ${kind === k ? 'border-forest-500 text-forest-700 bg-forest-50' : 'border-cream-200 text-sand-600'}`}
          >
            {k}
          </button>
        ))}
      </div>
      {kind && <div className="space-y-2">
        <input value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} placeholder={kind === 'invoice' || kind === 'receipt' ? 'Bill to / Payer' : 'Prepared for'} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
        <div className="flex gap-2">
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Currency" className="w-24 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
        </div>
        {error && <p role="alert" className="text-[0.78rem] text-ember-600">{error}</p>}
        <button disabled={busy} onClick={() => void generate()} className="rounded-lg bg-forest-600 text-cream-50 px-3 py-1.5 text-[0.82rem] disabled:opacity-40">
          {busy ? 'Preparing…' : `Generate ${kind}`}
        </button>
      </div>}
      {result && <div className="rounded-xl bg-cream-50 border border-cream-200 px-4 py-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[0.85rem] text-forest-800">{result.documentNumber}</span>
          {result.draftOnly && <span className="text-[0.68rem] uppercase tracking-wide text-ember-600">Draft</span>}
        </div>
        {result.truthNote && <p className="text-[0.78rem] text-sand-600">{result.truthNote}</p>}
        <dl className="pt-1 space-y-0.5">
          {Object.entries(result.fields).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 text-[0.78rem]">
              <dt className="text-sand-500">{label}</dt><dd className="text-forest-800 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>}
    </div>
  );
}

/**
 * SecurePay Final Completion Phase 5B -- the Vision Board: private KS operating memory (ideas,
 * plans, guidance, methods, templates). This is not a shared workspace, not a Project, and not an
 * Agreement -- no Share, Invite, Members, or Collaborators appears anywhere below, because none of
 * those exist on the backend for a Vision Board.
 */
export function VisionBoardExperience({ controller, documentGateway, defaultOwnerKsNumber, onNavigate }: {
  controller: VisionBoardController;
  documentGateway: Pick<VisionBoardGateway, 'generateQuotation' | 'generateInvoice' | 'generateReceipt'>;
  defaultOwnerKsNumber?: string | null;
  onNavigate: (view: AppView) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [switchKsInput, setSwitchKsInput] = useState('');
  const [showSwitchKs, setShowSwitchKs] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState<VisionItemTypeCode>('IDEA');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newUsagePolicy, setNewUsagePolicy] = useState<import('../../api/securepay/visionboard/dto').VisionItemUsagePolicy>('REFERENCE_ONLY');
  const [searchInput, setSearchInput] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Convergence correction (section 43) -- never require typing your own KS number: this loads
  // the signed-in person's own board by default, or the declared owner (e.g. a Business Project)
  // when one was passed in. Runs once per distinct defaultOwnerKsNumber, including the "none" case.
  useEffect(() => {
    void controller.loadForOwner(defaultOwnerKsNumber ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOwnerKsNumber]);

  const [editUsagePolicy, setEditUsagePolicy] = useState<import('../../api/securepay/visionboard/dto').VisionItemUsagePolicy>('REFERENCE_ONLY');
  useEffect(() => {
    if (state.selected.item) {
      setEditTitle(state.selected.item.title);
      setEditContent(state.selected.item.content ?? '');
      setEditUsagePolicy(state.selected.item.usagePolicy);
    }
  }, [state.selected.item]);

  const selectedItem = state.selected.item;
  if (selectedItem) {
    return <div className="min-h-dvh bg-cream-100">
      <NavBar view="agreements" onNavigate={onNavigate} />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <button onClick={() => controller.closeSelected()} className="flex items-center gap-1.5 text-forest-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {selectedItem.locked && <Lock className="w-4 h-4 text-sand-500" />}
              <span className="text-[0.68rem] uppercase tracking-wide text-sand-500">{selectedItem.itemType}</span>
            </div>
            {selectedItem.locked
              ? <button disabled={state.selected.busy} onClick={() => void controller.unlock(selectedItem.version)} className="flex items-center gap-1 text-[0.8rem] text-forest-700 underline disabled:opacity-40"><Unlock className="w-3.5 h-3.5" /> Unlock</button>
              : <button disabled={state.selected.busy} onClick={() => void controller.lock(selectedItem.version)} className="flex items-center gap-1 text-[0.8rem] text-sand-600 underline disabled:opacity-40"><Lock className="w-3.5 h-3.5" /> Lock as established guidance</button>}
          </div>
          {selectedItem.locked
            ? <p className="text-[0.78rem] text-sand-500">Locked guidance is treated as established. To change it, unlock it first or keep this version and start a new one below.</p>
            : null}
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} disabled={selectedItem.locked} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.9rem] font-display disabled:bg-cream-50 disabled:text-sand-500" />
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} disabled={selectedItem.locked} rows={4} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] disabled:bg-cream-50 disabled:text-sand-500" />
          <div>
            <div className="text-[0.72rem] text-sand-500 mb-1">How should SecurePay use this?</div>
            <div className="space-y-1.5">
              {USAGE_POLICY_OPTIONS.map(option => (
                <label key={option.value} className={`flex items-start gap-2 text-[0.8rem] text-forest-800 ${selectedItem.locked ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input type="radio" name="editUsagePolicy" className="mt-0.5" disabled={selectedItem.locked} checked={editUsagePolicy === option.value} onChange={() => setEditUsagePolicy(option.value)} />
                  <span>{option.label}<span className="block text-[0.7rem] text-sand-500 font-normal">{option.hint}</span></span>
                </label>
              ))}
            </div>
          </div>
          {state.selected.actionError && <p role="alert" className="text-[0.78rem] text-ember-600">{state.selected.actionError}</p>}
          <div className="flex gap-2">
            {!selectedItem.locked && <button disabled={state.selected.busy || !editTitle.trim()} onClick={() => void controller.update(editTitle.trim(), editContent.trim() || undefined, editUsagePolicy, selectedItem.version)} className="rounded-lg bg-forest-600 text-cream-50 px-3 py-1.5 text-[0.82rem] disabled:opacity-40">Save</button>}
            <button disabled={state.selected.busy || !editTitle.trim()} onClick={() => void controller.supersede(editTitle.trim(), editContent.trim() || undefined, selectedItem.version)} className="rounded-lg border border-forest-300 text-forest-700 px-3 py-1.5 text-[0.82rem] disabled:opacity-40">
              Keep this version, start a new one
            </button>
          </div>
          <p className="text-[0.72rem] text-sand-500">Version {selectedItem.version}</p>
        </div>
      </div>
    </div>;
  }

  if (state.selectedShelf) {
    const shelf = state.shelves.data?.find(s => s.shelf === state.selectedShelf);
    return <div className="min-h-dvh bg-cream-100">
      <NavBar view="agreements" onNavigate={onNavigate} />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <button onClick={() => controller.closeShelf()} className="flex items-center gap-1.5 text-forest-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Vision Board
        </button>
        <div>
          <h1 className="font-display text-xl text-forest-800">{shelf?.label ?? state.selectedShelf}</h1>
          {shelf && <p className="text-[0.8rem] text-sand-500 mt-1">{shelf.teachingLine}</p>}
        </div>

        <div className="flex gap-2">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search this shelf" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <button onClick={() => void controller.search(searchInput.trim())} className="rounded-lg border border-forest-300 text-forest-700 px-3 py-2 text-[0.85rem]">Search</button>
          <button onClick={() => setShowCreate(v => !v)} className="rounded-lg bg-forest-600 text-cream-50 px-3 py-2 text-[0.85rem]">Add</button>
        </div>

        {showCreate && state.selectedShelf && <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 space-y-2">
          <select value={newType} onChange={e => setNewType(e.target.value as VisionItemTypeCode)} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]">
            {ITEM_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase()}</option>)}
          </select>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="What do you want SecurePay to remember?" rows={3} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <div>
            <div className="text-[0.72rem] text-sand-500 mb-1">How should SecurePay use this?</div>
            <div className="space-y-1.5">
              {USAGE_POLICY_OPTIONS.map(option => (
                <label key={option.value} className="flex items-start gap-2 text-[0.8rem] text-forest-800 cursor-pointer">
                  <input type="radio" name="usagePolicy" className="mt-0.5" checked={newUsagePolicy === option.value} onChange={() => setNewUsagePolicy(option.value)} />
                  <span>
                    {option.label}
                    <span className="block text-[0.7rem] text-sand-500 font-normal">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {state.createError && <p role="alert" className="text-[0.78rem] text-ember-600">{state.createError}</p>}
          <button
            disabled={state.creating || !newTitle.trim()}
            onClick={async () => {
              const created = await controller.create(state.selectedShelf as VisionShelfCode, newType, newTitle.trim(), newContent.trim() || undefined, newUsagePolicy);
              if (created) { setNewTitle(''); setNewContent(''); setNewUsagePolicy('REFERENCE_ONLY'); setShowCreate(false); }
            }}
            className="rounded-lg bg-forest-600 text-cream-50 px-3 py-1.5 text-[0.82rem] disabled:opacity-40"
          >
            Save to this shelf
          </button>
        </div>}

        {state.items.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
        {state.items.status === 'error' && <p role="alert" className="text-sm text-sand-600">{state.items.error}</p>}
        {state.items.status === 'ready' && state.items.data?.length === 0 && <p className="text-sm text-sand-500">Nothing here yet.</p>}
        <ul className="space-y-2">
          {state.items.data?.map(vitem => <li key={vitem.itemId}>
            <button onClick={() => controller.open(vitem)} className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.9rem] text-forest-800 flex items-center gap-1.5">{vitem.locked && <Lock className="w-3.5 h-3.5 text-sand-500" />} {vitem.title}</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-sand-400 shrink-0">{vitem.itemType}</span>
              </div>
              {vitem.content && <p className="text-[0.78rem] text-sand-500 mt-0.5 line-clamp-2">{vitem.content}</p>}
            </button>
          </li>)}
        </ul>
      </div>
    </div>;
  }

  return <div className="min-h-dvh bg-cream-100">
    <NavBar view="agreements" onNavigate={onNavigate} />
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
      <div>
        <h1 className="font-display text-xl text-forest-800">My Vision Board</h1>
        <p className="text-[0.8rem] text-sand-500 mt-1">Keep the ideas, plans, documents, methods and reminders you want SecurePay to remember when helping you. Come back anytime, add to them, refine them or lock what you want to keep unchanged.</p>
      </div>

      {/* Convergence correction (section 43) -- this is never required to see your own board; it
          only switches to managing a different KS (e.g. a Business you administer). */}
      {state.ownerKsNumber && <p className="text-[0.75rem] text-sand-500">Managing the Vision Board for <span className="text-forest-700">{state.ownerKsNumber}</span>.</p>}
      {showSwitchKs ? (
        <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 flex gap-2">
          <input value={switchKsInput} onChange={e => setSwitchKsInput(e.target.value)} placeholder="Business KS Number you manage" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <button onClick={() => { if (switchKsInput.trim()) { void controller.loadForOwner(switchKsInput.trim()); setShowSwitchKs(false); } }} className="rounded-lg bg-forest-600 text-cream-50 px-3 py-2 text-[0.85rem]">Switch</button>
          <button onClick={() => setShowSwitchKs(false)} className="rounded-lg border border-cream-200 text-sand-600 px-3 py-2 text-[0.85rem]">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowSwitchKs(true)} className="text-[0.78rem] text-forest-700 underline">
          {state.ownerKsNumber ? 'Manage a different KS' : 'Manage a Business KS instead'}
        </button>
      )}

      {state.shelves.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading your Vision Board…</p>}
      {state.shelves.status === 'error' && <p role="alert" className="text-sm text-sand-600">{state.shelves.error}</p>}

      {state.shelves.status === 'ready' && state.shelves.data && <div className="grid grid-cols-2 gap-3">
        {state.shelves.data.map(shelf => <button
          key={shelf.shelf}
          onClick={() => void controller.openShelf(shelf.shelf)}
          className="text-left rounded-2xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.85rem] text-forest-800">{shelf.label}</span>
            {shelf.itemCount > 0 && <span className="text-[0.7rem] text-forest-600">{shelf.itemCount}</span>}
          </div>
          {shelf.itemCount === 0 && <p className="text-[0.72rem] text-sand-500 mt-1">{shelf.teachingLine}</p>}
        </button>)}
      </div>}

      {state.boarded && <DocumentGenerator gateway={documentGateway} ownerKsNumber={state.ownerKsNumber} />}
    </div>
  </div>;
}
