import { useState } from 'react';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import type { AgentController, AgentState } from '../agent/controller';
import { specKey } from '../instruments/controller';
import { SourceReference } from '../discovery/ui/SourceReference';
import type { InstrumentSpec } from '../instruments/model';
import { projectWorkbench, SECTION_LABEL, type AdoptTarget, type WorkbenchItem, type WorkbenchSection } from './projection';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-inset';
const SPEC_NOUN: Record<InstrumentSpec['kind'], string> = { who: 'the person', when: 'the date', money: 'the amount', where: 'the place', detail: 'this detail' };

/**
 * "What SecurePay understands", as a workbench. Rows are only what the backend's Trade Context
 * actually holds; a row that has a safe instrument is a button that opens it. Editing a row asks
 * SecurePay to update its understanding -- it never confirms an Agreement, and the state shown on
 * each row is whatever the backend last returned (never a UI-derived state).
 */
export function UnderstoodWorkbench({ state, controller, activeSpec, onOpen, onFind, stillToSettle, notes }: {
  state: AgentState;
  controller: AgentController;
  activeSpec: InstrumentSpec | null;
  onOpen: (spec: InstrumentSpec) => void;
  /** "Find on SecurePay": for someone who does NOT already know who or what to use (knowing a person is Add a person). */
  onFind: (kind: 'PRODUCT' | 'SERVICE', what?: string) => void;
  /** Server-derived "still worth settling" lines from the latest AGREEMENT_PREVIEW panel, shown read-only. */
  stillToSettle?: string[];
  notes?: string;
}) {
  const { context } = state;
  const [addOpen, setAddOpen] = useState(false);
  const workbench = projectWorkbench(context.data, new Set(state.offeredDiscoveryEntityIds));
  const activeKey = activeSpec ? specKey(activeSpec) : null;
  const busy = state.busy || !!state.pending;
  const sections = (['what', 'who', 'when', 'where', 'money', 'other'] as WorkbenchSection[]).map(section => ({ section, items: workbench.items.filter(item => item.section === section) })).filter(group => group.items.length > 0);

  const adoptAll = async (targets: AdoptTarget[]) => { for (const target of targets) await controller.adopt(target.id, target.targetKind); };
  // KS001 Upgrade Phase 1 final integration fix -- the ONLY thing that ever calls requestDiscovery: an
  // explicit click on the person's own part, never automatic, never inferred from KS001's own prose.
  const onRequestDiscovery = (targetEntityId: string) => void controller.requestDiscovery(targetEntityId);

  return <section aria-label="What SecurePay understands" aria-busy={context.status === 'loading'} className="space-y-4">
    {state.source && <SourceReference source={{ sourceType: state.source.sourceType, title: state.source.sourceTitle ?? 'Store offer', ownerKs: state.source.sourceOwnerKsNumber, capturedPriceMinor: state.source.capturedPriceMinor, capturedCurrency: state.source.capturedCurrency }} />}

    {context.status === 'error' && <div role="alert" className="rounded-xl border border-ember-200 bg-ember-50 px-3.5 py-2.5 text-[0.85rem] text-sand-800">
      {context.error} <button disabled={state.busy} onClick={() => void controller.review()} className="underline disabled:opacity-40">Refresh</button>
    </div>}

    {workbench.empty && context.status !== 'error' && <p className="text-[0.9rem] leading-relaxed text-sand-500">
      {context.status === 'loading' ? 'Updating what SecurePay understands…' : 'As you talk, what SecurePay understands appears here — and you can fill things in directly.'}
    </p>}

    {sections.map(({ section, items }) => <div key={section}>
      <h3 className="px-1 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">{SECTION_LABEL[section]}</h3>
      <ul className="overflow-hidden rounded-2xl border border-cream-200 bg-white/80 divide-y divide-cream-100 shadow-soft">
        {items.map(item => <Row key={item.key} item={item} open={!!item.spec && specKey(item.spec) === activeKey} busy={busy} onOpen={onOpen} onFind={onFind} onUse={() => void adoptAll(item.adopt)} onRequestDiscovery={onRequestDiscovery} />)}
      </ul>
    </div>)}

    {/* KS001 Upgrade Phase 2 (Sections 8/11/22/23/27) -- the server-owned sufficiency projection, in
        calm human language, never raw MATERIAL_MATTER codes (see AgreementSufficiencyView's own
        doctrine). Blocking matters get the more direct "needs your decision" phrasing; decide-later
        matters (e.g. no provider chosen yet) never imply the build cannot be saved or set up. */}
    {context.data?.sufficiency && (context.data.sufficiency.mustResolve.length > 0 || context.data.sufficiency.stillToDecide.length > 0) && <div className="space-y-3">
      {context.data.sufficiency.mustResolve.length > 0 && <div>
        <h3 className="px-1 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-ember-600">Needs your decision before this can be set up</h3>
        <ul className="space-y-1 px-1 text-[0.85rem] text-sand-700">{context.data.sufficiency.mustResolve.map((matter, i) => <li key={i}>{matter.description}</li>)}</ul>
      </div>}
      {context.data.sufficiency.stillToDecide.length > 0 && <div>
        <h3 className="px-1 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Still to decide</h3>
        <ul className="space-y-1 px-1 text-[0.85rem] text-sand-700">{context.data.sufficiency.stillToDecide.map((matter, i) => <li key={i}>{matter.description}</li>)}</ul>
      </div>}
    </div>}

    {/* Contextual possibilities, never implied missing fields: nothing here says a person, date, place or
        amount is REQUIRED -- one quiet control reveals what could be added, and only what really can be. */}
    {workbench.adds.length > 0 && <div>
      <button type="button" onClick={() => setAddOpen(open => !open)} aria-expanded={addOpen} aria-controls="workbench-adds"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[0.85rem] text-forest-700 hover:text-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        <Plus className={`h-3.5 w-3.5 transition-transform ${addOpen ? 'rotate-45' : ''}`} aria-hidden="true" /><span>Add a detail</span>
      </button>
      {/* KS001 Upgrade Phase 2 (Sections 25/49) -- the unconditional generic "Find on SecurePay" entry
          that used to live here bypassed the target-scoped DISCOVERY_OFFER -> REQUEST_DISCOVERY path
          (Phase 1's own doctrine: discovery is only ever offered for a real, server-verified entity the
          person has explicitly accepted -- see Row's `find`/`offer` handling below). Removed; the ONLY
          discovery affordance is now the per-row "Look on SecurePay"/"See on SecurePay" action. */}
      {addOpen && <div id="workbench-adds" className="mt-1 flex flex-wrap gap-2 animate-fade-in-up">
        {workbench.adds.map(add => <button key={add.key} type="button" onClick={() => { onOpen(add.spec); setAddOpen(false); }} aria-expanded={activeKey === specKey(add.spec)}
          className="inline-flex min-h-11 items-center rounded-full border border-cream-300 bg-white/70 px-3.5 text-[0.85rem] text-forest-700 hover:border-forest-300 hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">{add.label}</button>)}
      </div>}
    </div>}

    {stillToSettle && stillToSettle.length > 0 && <div>
      <h3 className="px-1 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-ember-600">Still worth settling</h3>
      <ul className="space-y-1 px-1 text-[0.85rem] text-sand-700">{stillToSettle.map((line, i) => <li key={i}>{line}</li>)}</ul>
    </div>}

    {notes && <p className="px-1 text-[0.75rem] leading-snug text-sand-500">{notes}</p>}

    <div className="flex items-center gap-3 px-1">
      <button disabled={state.busy} onClick={() => void controller.review()} className="inline-flex min-h-11 items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-700 disabled:opacity-40 focus:outline-none focus-visible:underline">
        <RefreshCw className={`h-3.5 w-3.5 ${context.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh
      </button>
      {!notes && <span className="text-[0.72rem] text-sand-400">Not an Agreement — only what SecurePay has understood so far.</span>}
    </div>
  </section>;
}

function Row({ item, open, busy, onOpen, onFind, onUse, onRequestDiscovery }: { item: WorkbenchItem; open: boolean; busy: boolean; onOpen: (spec: InstrumentSpec) => void; onFind: (kind: 'PRODUCT' | 'SERVICE', what?: string) => void; onUse: () => void; onRequestDiscovery: (targetEntityId: string) => void }) {
  const candidate = item.state === 'CANDIDATE';
  const body = <>
    <span className="min-w-0 flex-1 text-left">
      <span className="block break-words text-[0.95rem] leading-snug text-forest-800">{item.value}</span>
      {(item.details.length > 0 || candidate || item.identityUnresolved) && <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.78rem] text-sand-600">
        {item.details.map((detail, i) => <span key={i}>{detail}</span>)}
        {item.identityUnresolved && <span>KS Number not set</span>}
        {candidate && <span className="font-medium text-ember-700">Suggested</span>}
        {!candidate && item.state === 'CONFIRMED' && <span className="sr-only">Known in this conversation</span>}
        {item.state !== 'CANDIDATE' && item.state !== 'CONFIRMED' && <span>Unclear</span>}
      </span>}
    </span>
  </>;
  return <li className="flex items-stretch">
    {item.spec
      ? <button type="button" onClick={() => onOpen(item.spec!)} aria-expanded={open} aria-label={`${SECTION_LABEL[item.section]}: ${item.value}. Change ${SPEC_NOUN[item.spec.kind]}`}
          className={`flex min-h-[3.25rem] flex-1 items-center gap-2 px-4 py-2.5 text-left hover:bg-forest-50/60 ${open ? 'bg-forest-50/70' : ''} ${FOCUS}`}>
          {body}<ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 text-sand-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      : <div className="flex min-h-[3.25rem] flex-1 items-center gap-2 px-4 py-2.5">{body}</div>}
    {item.find && <button type="button" onClick={() => onFind(item.find!.kind, item.find!.what)} aria-label={`See ${item.find.what} on SecurePay`}
      className={`shrink-0 px-3.5 text-[0.8rem] font-medium text-forest-700 hover:bg-forest-50 ${FOCUS}`}>See on SecurePay</button>}
    {/* KS001 Upgrade Phase 1 final integration fix -- DISCOVERY OFFERED becomes a real, explicit accept
        action, never shown by default on every ITEM/SERVICE row (see projection.ts's own `offer` doctrine:
        it requires a real DISCOVERY_OFFER this session AND that the person has not already accepted). */}
    {!item.find && item.offer && <button type="button" onClick={() => onRequestDiscovery(item.offer!.targetEntityId)} aria-label={`Look for ${item.value} on SecurePay`}
      className={`shrink-0 px-3.5 text-[0.8rem] font-medium text-forest-700 hover:bg-forest-50 ${FOCUS}`}>Look on SecurePay</button>}
    {candidate && item.adopt.length > 0 && <button type="button" disabled={busy} onClick={onUse} aria-label={`Use this: ${item.value}`}
      className={`shrink-0 px-3.5 text-[0.8rem] font-medium text-forest-700 hover:bg-forest-50 disabled:opacity-40 ${FOCUS}`}>Use this</button>}
  </li>;
}
