import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Lock, Sparkles, Unlock } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import { ExperiencePathway } from '../experience/ExperiencePathway';
import { Ks001SurfaceGuide } from '../experience/Ks001SurfaceGuide';
import type { AppView } from '../../types';
import type { VisionBoardController } from './controller';
import type { VisionBoardGateway } from '../../api/securepay/visionboard';
import type { GenerateDocumentRequest, VisionDocumentDto, VisionItemTypeCode, VisionShelfCode, VisionItemDto } from '../../api/securepay/visionboard/dto';
import type { FulfilmentNeedsGateway, FulfilmentNeedDto, FulfilmentNeedMatchDto, SupplyRouteDto, FulfilmentNeedType, FulfilmentNeedPrivacyLevel } from '../../api/securepay/fulfilment-needs';

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
    <Surface>
      <SurfaceBody>
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
          {error && <StatusNotice tone="warning" icon={false}>{error}</StatusNotice>}
          <Button disabled={busy} onClick={() => void generate()} className="w-full py-2">
            {busy ? 'Preparing…' : `Generate ${kind}`}
          </Button>
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
      </SurfaceBody>
    </Surface>
  );
}

function VisionNeedPanel({ item, gateway, onOpenStoreOffer }: {
  item: VisionItemDto;
  gateway: Pick<FulfilmentNeedsGateway, 'fromVision' | 'matches' | 'routes'>;
  onOpenStoreOffer?: (canonicalKsNumber: string, offerId: string) => void;
  onAskKs001?: (message: string) => void;
}) {
  const [type, setType] = useState<FulfilmentNeedType>('OTHER');
  const [privacy, setPrivacy] = useState<FulfilmentNeedPrivacyLevel>('PRIVATE');
  const [poolable, setPoolable] = useState(false);
  const [need, setNeed] = useState<FulfilmentNeedDto | null>(null);
  const [matches, setMatches] = useState<FulfilmentNeedMatchDto[]>([]);
  const [routes, setRoutes] = useState<SupplyRouteDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derive = async () => {
    setBusy(true); setError(null);
    try {
      const created = await gateway.fromVision(item.itemId, {
        derivationKey: `vision-ui:${item.itemId}:v${item.version}`,
        type,
        poolable,
        privacyLevel: privacy,
      });
      setNeed(created);
      const [foundMatches, foundRoutes] = await Promise.all([
        gateway.matches(created.id),
        gateway.routes(created.id),
      ]);
      setMatches(foundMatches);
      setRoutes(foundRoutes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SecurePay could not find options for this Vision item.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface>
      <SurfaceBody className="space-y-3">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Make this practical</div>
          <h2 className="mt-1 font-display text-lg text-forest-800">What does this idea need?</h2>
          <p className="mt-1 text-[0.76rem] text-sand-600">Turn this saved Vision item into structured demand. You choose whether it stays private, can be matched to Stores, and whether pooling is allowed.</p>
        </div>

        {!need && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-[0.72rem] text-sand-600">
                Need type
                <select value={type} onChange={e => setType(e.target.value as FulfilmentNeedType)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-[0.8rem] text-forest-800">
                  {(['PRODUCT','TRANSPORT','ACCOMMODATION','LABOUR','COURIER','STORAGE','EQUIPMENT','SERVICE','OTHER'] as FulfilmentNeedType[]).map(value => (
                    <option key={value} value={value}>{value.replace(/_/g, ' ').toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <label className="text-[0.72rem] text-sand-600">
                Visibility
                <select value={privacy} onChange={e => setPrivacy(e.target.value as FulfilmentNeedPrivacyLevel)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-[0.8rem] text-forest-800">
                  <option value="PRIVATE">Private — only use for my search</option>
                  <option value="MATCHABLE">Matchable — eligible Stores may see safe demand</option>
                </select>
              </label>
            </div>
            <label className="flex items-start gap-2 text-[0.78rem] text-forest-800">
              <input type="checkbox" checked={poolable} onChange={e => setPoolable(e.target.checked)} className="mt-0.5" />
              <span>Allow pooling when compatible <span className="block text-[0.68rem] text-sand-500">This only marks the need as poolable. It does not join a Community Saver or another person’s agreement.</span></span>
            </label>
            {error && <StatusNotice tone="warning" icon={false}>{error}</StatusNotice>}
            <Button disabled={busy} onClick={() => void derive()} className="w-full sm:w-auto">
              {busy ? 'Finding options…' : 'Find real options'}
            </Button>
          </>
        )}

        {need && (
          <>
            <div className="rounded-xl border border-forest-100 bg-forest-50/50 px-3 py-3">
              <div className="text-[0.78rem] font-medium text-forest-800">{need.description}</div>
              <div className="mt-1 text-[0.68rem] text-sand-500">
                {need.type.replace(/_/g, ' ')} · {need.privacyLevel === 'MATCHABLE' ? 'Matchable' : 'Private'}{need.poolable ? ' · Poolable' : ''}
              </div>
            </div>

            {busy && <p role="status" className="text-[0.76rem] text-sand-500">Finding Store matches…</p>}
            {!busy && routes.length === 0 && <p className="text-[0.76rem] text-sand-500">No supply route is available yet. The need is still saved in SecurePay.</p>}

            {routes.length > 0 && (
              <div className="space-y-2">
                <div className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Options SecurePay found</div>
                {routes.slice(0, 5).map(route => (
                  <div key={route.routeId} className="rounded-xl border border-cream-200 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[0.8rem] font-medium text-forest-800">{route.routeLabel}</div>
                        <div className="mt-0.5 text-[0.68rem] text-sand-500">{route.providerDisplayName ?? route.providerKsNumber}{route.leadTimeHours !== null ? ` · ${route.leadTimeHours}h` : ''}</div>
                      </div>
                      <div className="text-right text-[0.72rem] text-forest-800">
                        {route.headlinePriceMinor !== null ? `${route.currency} ${(route.headlinePriceMinor / 100).toLocaleString()}` : 'Price not listed'}
                        <div className="text-[0.62rem] text-sand-400">{route.landedCostKnown ? 'Landed cost known' : 'Landed cost not established'}</div>
                      </div>
                    </div>
                    {route.tradeOffs.length > 0 && <p className="mt-2 text-[0.68rem] text-sand-600">{route.tradeOffs.slice(0, 2).join(' · ')}</p>}
                    {onOpenStoreOffer && <button type="button" onClick={() => onOpenStoreOffer(route.providerKsNumber, route.offerId)} className="mt-3 rounded-lg bg-forest-600 px-3 py-1.5 text-[0.7rem] font-medium text-white">Open Store offer</button>}
                  </div>
                ))}
                {matches.length > routes.length && <p className="text-[0.68rem] text-sand-500">{matches.length} provider matches found; {routes.length} currently have comparable supply routes.</p>}
              </div>
            )}
          </>
        )}
      </SurfaceBody>
    </Surface>
  );
}

/**
 * SecurePay Final Completion Phase 5B -- the Vision Board: private KS operating memory (ideas,
 * plans, guidance, methods, templates). This is not a shared workspace, not a Project, and not an
 * Agreement -- no Share, Invite, Members, or Collaborators appears anywhere below, because none of
 * those exist on the backend for a Vision Board. Deliberately no Project link either: the backend
 * forbids Project and Vision Board's own internal domain code from directly depending on each
 * other, but its own doctrine comment explicitly leaves room for a future feature to link them
 * through each domain's own authorized owner-scoped API -- no such feature exists today, and this
 * pass does not build one (see docs/PHASE5_LIFE_BUSINESS_WORLD.md).
 */
export function VisionBoardExperience({ controller, documentGateway, fulfilmentNeedsGateway, defaultOwnerKsNumber, onNavigate, onOpenStoreOffer, onAskKs001 }: {
  controller: VisionBoardController;
  documentGateway: Pick<VisionBoardGateway, 'generateQuotation' | 'generateInvoice' | 'generateReceipt'>;
  fulfilmentNeedsGateway?: Pick<FulfilmentNeedsGateway, 'fromVision' | 'matches' | 'routes'>;
  defaultOwnerKsNumber?: string | null;
  onNavigate: (view: AppView) => void;
  onOpenStoreOffer?: (canonicalKsNumber: string, offerId: string) => void;
  onAskKs001?: (message: string) => void;
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
        <Ks001SurfaceGuide
          surface="vision"
          onAsk={onAskKs001 ? () => onAskKs001(`I’m working on the Vision item “${selectedItem.title}”. Based on this idea and where I am in SecurePay, what real SecurePay products, services or capabilities could help me move it forward? Only suggest things SecurePay can actually verify, and do not turn the idea into a commitment unless I explicitly choose to.`) : undefined}
        />
        <Surface>
          <SurfaceBody>
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
            {state.selected.actionError && <StatusNotice tone="warning" icon={false}>{state.selected.actionError}</StatusNotice>}
            <div className="flex gap-2">
              {!selectedItem.locked && <Button disabled={state.selected.busy || !editTitle.trim()} onClick={() => void controller.update(editTitle.trim(), editContent.trim() || undefined, editUsagePolicy, selectedItem.version)}>Save</Button>}
              <Button variant="secondary" disabled={state.selected.busy || !editTitle.trim()} onClick={() => void controller.supersede(editTitle.trim(), editContent.trim() || undefined, selectedItem.version)}>
                Keep this version, start a new one
              </Button>
            </div>
            <p className="text-[0.72rem] text-sand-500">Version {selectedItem.version}</p>
          </SurfaceBody>
        </Surface>
        {fulfilmentNeedsGateway && <VisionNeedPanel item={selectedItem} gateway={fulfilmentNeedsGateway} onOpenStoreOffer={onOpenStoreOffer} />}
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
        <PageHeader title={shelf?.label ?? state.selectedShelf} description={shelf?.teachingLine} />

        <div className="flex gap-2">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search this shelf" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <Button variant="secondary" onClick={() => void controller.search(searchInput.trim())} className="px-3">Search</Button>
          <Button onClick={() => setShowCreate(v => !v)} className="px-3">Add</Button>
        </div>

        {showCreate && state.selectedShelf && <Surface>
          <SurfaceBody className="space-y-2">
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
            {state.createError && <StatusNotice tone="warning" icon={false}>{state.createError}</StatusNotice>}
            <Button
              disabled={state.creating || !newTitle.trim()}
              onClick={async () => {
                const created = await controller.create(state.selectedShelf as VisionShelfCode, newType, newTitle.trim(), newContent.trim() || undefined, newUsagePolicy);
                if (created) { setNewTitle(''); setNewContent(''); setNewUsagePolicy('REFERENCE_ONLY'); setShowCreate(false); }
              }}
            >
              Save to this shelf
            </Button>
          </SurfaceBody>
        </Surface>}

        {state.items.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
        {state.items.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.items.error}</StatusNotice>}
        {state.items.status === 'ready' && state.items.data?.length === 0 && <p className="text-sm text-sand-500">Nothing here yet.</p>}
        <ul className="space-y-2">
          {state.items.data?.map(vitem => <li key={vitem.itemId}>
            <button onClick={() => controller.open(vitem)} className="w-full text-left rounded-2xl border border-cream-200 bg-white shadow-card px-4 py-3 hover:border-forest-300 transition-colors">
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
      <PageHeader title="My Vision Board" description="Keep the ideas, plans, documents, methods and reminders you want SecurePay to remember when helping you. Come back anytime, add to them, refine them or lock what you want to keep unchanged." />
      <ExperiencePathway active="vision" onNavigate={onNavigate} />
      <Ks001SurfaceGuide surface="vision" onAsk={onAskKs001 ? () => onAskKs001('I’m on my Vision Board. Based on what I am working on here, what real SecurePay products, services or capabilities could help me next? Only suggest things SecurePay can actually verify and explain why they fit.') : undefined} />

      <section aria-label="Start from your Vision" className="rounded-2xl border border-forest-200 bg-forest-50/50 p-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Start here</p>
        <h2 className="mt-1 font-display text-lg text-forest-800">What are you trying to move forward?</h2>
        <p className="mt-1 text-[0.78rem] text-sand-600">Keep the thinking light. Capture the idea first, then find what it needs or make the commitment clear when you are ready.</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => void controller.openShelf('IDEAS_GROWTH')}
            className="min-h-20 rounded-xl border border-cream-200 bg-white px-3 py-3 text-left hover:border-forest-300"
          >
            <span className="block text-[0.8rem] font-medium text-forest-800">Capture the idea</span>
            <span className="mt-1 block text-[0.68rem] text-sand-500">Notes, plans and things you want SecurePay to remember.</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('store')}
            className="min-h-20 rounded-xl border border-cream-200 bg-white px-3 py-3 text-left hover:border-forest-300"
          >
            <span className="block text-[0.8rem] font-medium text-forest-800">Find what it needs</span>
            <span className="mt-1 block text-[0.68rem] text-sand-500">Explore real Store offers before you commit to anything.</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('agreements')}
            className="min-h-20 rounded-xl border border-cream-200 bg-white px-3 py-3 text-left hover:border-forest-300"
          >
            <span className="block text-[0.8rem] font-medium text-forest-800">Make it clear</span>
            <span className="mt-1 block text-[0.68rem] text-sand-500">Review the Agreements already taking shape or active.</span>
          </button>
        </div>
      </section>

      {/* Convergence correction (section 43) -- this is never required to see your own board; it
          only switches to managing a different KS (e.g. a Business you administer). */}
      {state.ownerKsNumber && <p className="text-[0.75rem] text-sand-500">Managing the Vision Board for <span className="text-forest-700">{state.ownerKsNumber}</span>.</p>}
      {showSwitchKs ? (
        <Surface>
          <SurfaceBody className="flex gap-2">
            <input value={switchKsInput} onChange={e => setSwitchKsInput(e.target.value)} placeholder="Business KS Number you manage" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
            <Button onClick={() => { if (switchKsInput.trim()) { void controller.loadForOwner(switchKsInput.trim()); setShowSwitchKs(false); } }} className="px-3">Switch</Button>
            <Button variant="secondary" onClick={() => setShowSwitchKs(false)} className="px-3">Cancel</Button>
          </SurfaceBody>
        </Surface>
      ) : (
        <button onClick={() => setShowSwitchKs(true)} className="text-[0.78rem] text-forest-700 underline">
          {state.ownerKsNumber ? 'Manage a different KS' : 'Manage a Business KS instead'}
        </button>
      )}

      {state.shelves.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading your Vision Board…</p>}
      {state.shelves.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.shelves.error}</StatusNotice>}

      {state.shelves.status === 'ready' && state.shelves.data && <div className="grid grid-cols-2 gap-3">
        {state.shelves.data.map(shelf => <button
          key={shelf.shelf}
          onClick={() => void controller.openShelf(shelf.shelf)}
          className="text-left rounded-2xl border border-cream-200 bg-white shadow-card px-4 py-3 hover:border-forest-300 transition-colors"
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
