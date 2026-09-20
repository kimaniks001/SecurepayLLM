import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Archive, FolderOpen, Plus, RotateCcw } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { decimalMoney } from '../../decimalMoney';
import type { AppView } from '../../types';
import type { ProjectsController } from './controller';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';

/** For genuinely `number`-typed minor-unit fields only (e.g. `ProjectNominalTotalDto.totalAmountMinor`,
 * a backend `long`) -- never for a string-backed field, which must go through `decimalMoney` instead. */
function formatMoney(currency: string, amountMinor: number): string {
  return `${currency} ${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * SecurePay Final Completion Phase 5A -- Projects: private organizational folders. This is
 * organization, not enterprise project management: no Share, Invite, Members, Collaborators,
 * project wallet, Fund Project, Pay Project, or Project Payment Ready appears anywhere below,
 * because none of those exist on the backend for a Project.
 */
export function ProjectsExperience({ controller, agreementGateway, defaultOwnerKsNumber, onNavigate, onOpenVisionBoard }: {
  controller: ProjectsController;
  agreementGateway: Pick<AgreementGateway, 'currentUserAgreements'>;
  defaultOwnerKsNumber?: string | null;
  onNavigate: (view: AppView) => void;
  /** Final Completion Phase 5B -- the Vision Board sits alongside Projects on this entry screen (section 15). */
  onOpenVisionBoard?: () => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [ownerKsNumber, setOwnerKsNumber] = useState(defaultOwnerKsNumber ?? '');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [myAgreements, setMyAgreements] = useState<CurrentUserAgreementSummaryResponse[] | null>(null);
  const [pickedAgreementId, setPickedAgreementId] = useState('');

  useEffect(() => {
    if (defaultOwnerKsNumber) { setOwnerKsNumber(defaultOwnerKsNumber); void controller.loadForOwner(defaultOwnerKsNumber); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOwnerKsNumber]);

  const selected = state.selected;
  const detailOpen = !!selected.projectId;

  const loadAgreementOptions = () => {
    if (myAgreements) return;
    void agreementGateway.currentUserAgreements(0, 100).then(page => setMyAgreements(page.items)).catch(() => setMyAgreements([]));
  };

  if (detailOpen) {
    const project = selected.project.data;
    const summary = selected.summary.data;
    const referencedIds = new Set((selected.agreements.data?.items ?? []).map(a => a.agreementId));
    const pickableAgreements = (myAgreements ?? []).filter(a => !referencedIds.has(a.agreementId));

    return <div className="min-h-dvh bg-cream-100">
      <NavBar view="agreements" onNavigate={onNavigate} />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <button onClick={() => controller.closeSelected()} className="flex items-center gap-1.5 text-forest-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>

        {selected.project.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading Project…</p>}
        {selected.project.status === 'error' && <StatusNotice tone="warning" icon={false}>{selected.project.error}</StatusNotice>}

        {project && <>
          <Surface>
            <SurfaceBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl text-forest-800">{project.name}</h1>
                  {project.description && <p className="text-[0.85rem] text-sand-600 mt-1">{project.description}</p>}
                  <p className="text-[0.72rem] text-sand-500 mt-1">Private to {project.ownerKsNumber} · {project.status === 'ARCHIVED' ? 'Archived' : 'Active'}</p>
                </div>
                {project.status === 'ACTIVE'
                  ? <button disabled={selected.busy} onClick={() => void controller.archive(project.version)} className="flex items-center gap-1 text-[0.8rem] text-sand-600 underline disabled:opacity-40"><Archive className="w-3.5 h-3.5" /> Archive Project</button>
                  : <button disabled={selected.busy} onClick={() => void controller.restore(project.version)} className="flex items-center gap-1 text-[0.8rem] text-forest-700 underline disabled:opacity-40"><RotateCcw className="w-3.5 h-3.5" /> Restore Project</button>}
              </div>
              {selected.actionError && <StatusNotice tone="warning" icon={false} className="mt-2">{selected.actionError}</StatusNotice>}
            </SurfaceBody>
          </Surface>

          {summary && <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Summary</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div><div className="text-lg font-display text-forest-800">{summary.agreementCount}</div><div className="text-[0.68rem] text-sand-500">Agreements</div></div>
                <div><div className="text-lg font-display text-forest-800">{summary.needsAttentionCount}</div><div className="text-[0.68rem] text-sand-500">Needs attention</div></div>
                <div><div className="text-lg font-display text-forest-800">{summary.waitingOnOthersCount}</div><div className="text-[0.68rem] text-sand-500">Waiting on others</div></div>
                <div><div className="text-lg font-display text-forest-800">{summary.activeCount}</div><div className="text-[0.68rem] text-sand-500">Active</div></div>
              </div>
              {summary.nominalTotalsByCurrency.length > 0 && <div className="mt-3 pt-3 border-t border-cream-100 space-y-1">
                <div className="text-[0.68rem] text-sand-500 uppercase tracking-wide">Contracted value</div>
                {summary.nominalTotalsByCurrency.map(t => (
                  <p key={t.currency} className="text-[0.85rem] text-forest-800">
                    <MoneyValue amount={formatMoney(t.currency, t.totalAmountMinor)} size="sm" /> <span className="text-sand-500">({t.agreementCount} agreement{t.agreementCount === 1 ? '' : 's'})</span>
                  </p>
                ))}
              </div>}
              {summary.nextUpcomingEventAt && <p className="text-[0.78rem] text-sand-600 mt-2">Next upcoming: {new Date(summary.nextUpcomingEventAt).toLocaleDateString()}</p>}
            </SurfaceBody>
          </Surface>}

          <Surface>
            <SurfaceBody>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Agreements in this Project</div>
                <button onClick={loadAgreementOptions} className="text-[0.78rem] text-forest-700 underline">Add existing Agreement</button>
              </div>
              {myAgreements && <div className="mb-3 flex gap-2">
                <select value={pickedAgreementId} onChange={e => setPickedAgreementId(e.target.value)} className="flex-1 rounded-lg border border-cream-200 px-2 py-1.5 text-[0.82rem]">
                  <option value="">Choose an Agreement…</option>
                  {pickableAgreements.map(a => <option key={a.agreementId} value={a.agreementId}>{a.title} — {a.publicReference}</option>)}
                </select>
                <Button onClick={() => { void controller.addAgreement(pickedAgreementId); setPickedAgreementId(''); }} disabled={!pickedAgreementId || selected.busy} className="px-3">Add to Project</Button>
              </div>}
              {selected.agreements.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading Agreements…</p>}
              {(selected.agreements.data?.items.length ?? 0) === 0 && selected.agreements.status === 'ready' && <p className="text-sm text-sand-500">No Agreements in this Project yet.</p>}
              <ul className="divide-y divide-cream-100">
                {selected.agreements.data?.items.map(a => <li key={a.agreementId} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[0.875rem] text-forest-800">{a.title}</div>
                    <div className="text-[0.72rem] text-sand-500">{a.status}{a.proposedAmountMinor ? <> · <MoneyValue amount={decimalMoney(a.proposedAmountMinor, a.currency)} size="sm" /></> : ''}</div>
                  </div>
                  <button disabled={selected.busy} onClick={() => void controller.removeAgreement(a.agreementId)} className="text-[0.75rem] text-sand-500 underline disabled:opacity-40 shrink-0">Remove from Project</button>
                </li>)}
              </ul>
            </SurfaceBody>
          </Surface>

          <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Upcoming</div>
              {selected.calendar.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading calendar…</p>}
              {(selected.calendar.data?.events.length ?? 0) === 0 && selected.calendar.status === 'ready' && <p className="text-sm text-sand-500">Nothing upcoming across this Project's Agreements.</p>}
              <ul className="space-y-1.5">
                {selected.calendar.data?.events.map(e => <li key={e.id} className="text-[0.82rem] text-forest-800">{e.title} <span className="text-sand-500">— {new Date(e.occursAt).toLocaleDateString()}</span></li>)}
              </ul>
            </SurfaceBody>
          </Surface>
        </>}
      </div>
    </div>;
  }

  return <div className="min-h-dvh bg-cream-100">
    <NavBar view="agreements" onNavigate={onNavigate} />
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="My Projects" />
        <Button onClick={() => setShowCreate(v => !v)} className="flex items-center gap-1 shrink-0"><Plus className="w-3.5 h-3.5" /> New Project</Button>
      </div>
      <p className="text-[0.8rem] text-sand-500 -mt-2">Keep related Agreements together here — a house build, a client job, an event, a business expansion or anything else you're working on. Private, never shared, never a source of Agreement authority.</p>

      <Surface>
        <SurfaceBody className="flex gap-2">
          <input value={ownerKsNumber} onChange={e => setOwnerKsNumber(e.target.value)} placeholder="Your KS Number (or a Business KS Number you manage)" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <Button variant="secondary" onClick={() => ownerKsNumber.trim() && void controller.loadForOwner(ownerKsNumber.trim())} className="px-4">Load</Button>
        </SurfaceBody>
      </Surface>

      {showCreate && <Surface>
        <SurfaceBody className="space-y-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name (e.g. Karen House)" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
          <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Optional description" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" rows={2} />
          {state.createError && <StatusNotice tone="warning" icon={false}>{state.createError}</StatusNotice>}
          <Button
            disabled={state.creating || !newName.trim() || !ownerKsNumber.trim()}
            onClick={async () => { const created = await controller.create(ownerKsNumber.trim(), newName.trim(), newDescription.trim() || undefined); if (created) { setNewName(''); setNewDescription(''); setShowCreate(false); } }}
          >
            Create Project
          </Button>
        </SurfaceBody>
      </Surface>}

      {state.list.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading Projects…</p>}
      {state.list.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.list.error}</StatusNotice>}
      {state.list.status === 'ready' && state.list.data?.length === 0 && <p className="text-sm text-sand-500">No Projects yet. Create one above whenever you have Agreements worth organizing together.</p>}
      {state.list.status === 'ready' && state.list.data?.length === 0 && onOpenVisionBoard && (
        <Surface>
          <SurfaceBody>
            <div className="text-[0.85rem] text-forest-800 font-display flex items-center gap-2"><FolderOpen className="w-4 h-4 text-forest-500" /> My Vision Board</div>
            <p className="text-[0.78rem] text-sand-500 mt-1 mb-2">Keep the ideas, plans, documents, methods and reminders you want SecurePay to remember when helping you. Come back anytime, add to them, refine them or lock what you want to keep unchanged.</p>
            <button onClick={onOpenVisionBoard} className="text-[0.8rem] text-forest-700 underline">Open my Vision Board</button>
          </SurfaceBody>
        </Surface>
      )}
      <ul className="space-y-2">
        {state.list.data?.map(project => <li key={project.projectId}>
          <button onClick={() => void controller.open(project.projectId)} className="w-full text-left rounded-2xl border border-cream-200 bg-white shadow-card px-4 py-3 hover:border-forest-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[0.9rem] text-forest-800">{project.name}</span>
              <span className={`text-[0.68rem] uppercase tracking-wide ${project.status === 'ARCHIVED' ? 'text-sand-400' : 'text-forest-600'}`}>{project.status}</span>
            </div>
            {project.description && <p className="text-[0.78rem] text-sand-500 mt-0.5">{project.description}</p>}
          </button>
        </li>)}
      </ul>
    </div>
  </div>;
}
