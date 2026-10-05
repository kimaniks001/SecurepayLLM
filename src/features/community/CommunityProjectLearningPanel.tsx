import { useEffect, useMemo, useState } from 'react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type {
  InstituteProjectObservationDto,
  InstituteProjectObservationType,
  InstituteProjectObservationVisibility,
} from '../../api/securepay/institute/dto';

const TYPES: { value: InstituteProjectObservationType; label: string }[] = [
  { value: 'COST', label: 'Cost' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'TIME', label: 'Time' },
  { value: 'WASTE', label: 'Waste / disposal' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'DECISION', label: 'Decision' },
  { value: 'ISSUE', label: 'Problem / issue' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'OUTCOME', label: 'Outcome' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ENVIRONMENT', label: 'Environment' },
  { value: 'SKILL', label: 'Skill / capability' },
  { value: 'OTHER', label: 'Other' },
];

function verificationLabel(item: InstituteProjectObservationDto) {
  if (item.verificationStatus === 'VERIFIED') return 'Project verified';
  if (item.verificationStatus === 'DISPUTED') return 'Disputed';
  return 'Reported';
}

export function CommunityProjectLearningPanel({
  gateway,
  projectId,
  projectTitle,
  projectPurpose,
  onOpenInstituteSpace,
}: {
  gateway: InstituteGateway;
  projectId: string;
  projectTitle: string;
  projectPurpose: string;
  onOpenInstituteSpace: (spaceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InstituteProjectObservationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledgeSpaceId, setKnowledgeSpaceId] = useState<string | null>(null);
  const [spaceBusy, setSpaceBusy] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordNotice, setRecordNotice] = useState<string | null>(null);

  const [type, setType] = useState<InstituteProjectObservationType>('COST');
  const [label, setLabel] = useState('');
  const [textValue, setTextValue] = useState('');
  const [amountKes, setAmountKes] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [unit, setUnit] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [projectStage, setProjectStage] = useState('');
  const [basis, setBasis] = useState('ACTUAL');
  const [sourceLabel, setSourceLabel] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('');
  const [destination, setDestination] = useState('');
  const [visibility, setVisibility] = useState<InstituteProjectObservationVisibility>('COMMUNITY');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void gateway.projectObservations(projectId)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setError('The Project learning record could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gateway, open, projectId]);

  const totalCost = useMemo(
    () => items.filter(item => item.type === 'COST' && item.amountMinor != null && item.currency === 'KES')
      .reduce((sum, item) => sum + (item.amountMinor ?? 0), 0),
    [items],
  );

  async function ensureProjectKnowledgeSpace(): Promise<string | null> {
    if (knowledgeSpaceId) return knowledgeSpaceId;
    const created = await gateway.createCommunityProjectSpace(projectId, {
      name: `${projectTitle} knowledge`,
      purpose: projectPurpose,
      visibility: 'COMMUNITY',
    });
    setKnowledgeSpaceId(created.id);
    return created.id;
  }

  async function openProjectKnowledgeSpace() {
    if (spaceBusy) return;
    setSpaceBusy(true);
    setError(null);
    try {
      const id = await ensureProjectKnowledgeSpace();
      if (id) onOpenInstituteSpace(id);
    } catch {
      setError('The Project Knowledge Space could not be opened. Nothing in the Project was changed.');
    } finally {
      setSpaceBusy(false);
    }
  }

  async function draftProjectRecord() {
    if (recordBusy) return;
    setRecordBusy(true);
    setError(null);
    setRecordNotice(null);
    try {
      const id = await ensureProjectKnowledgeSpace();
      if (!id) return;
      const asset = await gateway.draftCommunityProjectRecord(projectId);
      setRecordNotice(`Draft created: ${asset.title}. Review it in the Institute before publishing.`);
    } catch {
      setError('SecurePay could not create the reusable Project Record draft. The granular Project learning record was not changed.');
    } finally {
      setRecordBusy(false);
    }
  }

  async function record() {
    if (!label.trim() || busy) return;
    const parsedAmount = amountKes.trim() ? Math.round(Number(amountKes) * 100) : null;
    const parsedNumeric = numericValue.trim() ? Number(numericValue) : null;
    if (parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      setError('Enter a valid non-negative KES amount.');
      return;
    }
    if (parsedNumeric != null && !Number.isFinite(parsedNumeric)) {
      setError('Enter a valid numeric value.');
      return;
    }
    if (!textValue.trim() && parsedAmount == null && parsedNumeric == null) {
      setError('Record a description, amount or numeric value.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await gateway.recordProjectObservation(projectId, {
        type,
        label: label.trim(),
        textValue: textValue.trim() || null,
        numericValue: parsedNumeric,
        unit: unit.trim() || null,
        amountMinor: parsedAmount,
        currency: parsedAmount == null ? null : 'KES',
        occurredOn: new Date().toISOString().slice(0, 10),
        evidenceReference: evidenceReference.trim() || null,
        visibility,
        attributes: Object.fromEntries([
          ['project_stage', projectStage.trim()],
          ['basis', basis.trim()],
          ['source_supplier', sourceLabel.trim()],
          ['disposal_method', type === 'WASTE' ? disposalMethod.trim() : ''],
          ['destination', type === 'WASTE' ? destination.trim() : ''],
        ].filter(([, value]) => value)),
      });
      setItems(current => [...current, created]);
      setLabel('');
      setTextValue('');
      setAmountKes('');
      setNumericValue('');
      setUnit('');
      setEvidenceReference('');
      setProjectStage('');
      setSourceLabel('');
      setDisposalMethod('');
      setDestination('');
    } catch {
      setError('SecurePay could not add this Project learning observation. Your Project was not changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50/60 px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="text-[0.75rem] font-medium text-forest-700"
      >
        {open ? 'Hide learning record' : 'Document how this Project was actually done'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[0.7rem] leading-relaxed text-sand-600">
            Preserve the granular reality — cost, materials, waste, time, decisions, mistakes, corrections and maintenance.
            Reported observations remain distinguishable from Project-verified facts.
          </p>
          <div className="rounded-xl border border-forest-100 bg-white p-3">
            <p className="text-[0.74rem] font-medium text-forest-800">Turn this Project's learning into reusable knowledge</p>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-sand-600">
              The learning record preserves what happened. A Project Knowledge Space lets you build guides, case studies, podcasts, checklists and training from it without exposing private Agreement data.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openProjectKnowledgeSpace()}
                disabled={spaceBusy || recordBusy}
                className="min-h-10 rounded-lg border border-forest-200 px-3 text-[0.72rem] font-medium text-forest-700 disabled:opacity-50"
              >
                {spaceBusy ? 'Opening…' : knowledgeSpaceId ? 'Open Project Knowledge Space' : 'Create Project Knowledge Space'}
              </button>
              <button
                type="button"
                onClick={() => void draftProjectRecord()}
                disabled={spaceBusy || recordBusy || items.length === 0}
                className="min-h-10 rounded-lg bg-forest-700 px-3 text-[0.72rem] font-medium text-white disabled:opacity-50"
              >
                {recordBusy ? 'Compiling…' : 'Create reusable Project Record draft'}
              </button>
            </div>
            {recordNotice && <p className="mt-2 text-[0.68rem] leading-relaxed text-forest-700">{recordNotice}</p>}
            <p className="mt-2 text-[0.65rem] leading-relaxed text-sand-500">
              The draft keeps REPORTED, VERIFIED and DISPUTED observations distinct and remains unpublished until you review and publish it.
            </p>
          </div>

          {loading && <p role="status" className="text-[0.72rem] text-sand-500">Loading Project learning…</p>}
          {error && <p role="alert" className="text-[0.72rem] text-red-600">{error}</p>}

          {items.length > 0 && (
            <div className="space-y-2">
              {totalCost > 0 && (
                <p className="text-[0.72rem] text-forest-700">
                  Recorded KES cost observations: KES {(totalCost / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              )}
              {items.map(item => (
                <div key={item.id} className="rounded-lg border border-cream-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[0.66rem] uppercase tracking-wide text-sand-500">{item.type.toLowerCase().replace(/_/g, ' ')}</span>
                      <p className="text-[0.78rem] font-medium text-forest-800">{item.label}</p>
                    </div>
                    <span className="text-[0.64rem] text-sand-500">{verificationLabel(item)}</span>
                  </div>
                  {item.textValue && <p className="mt-1 text-[0.72rem] text-sand-600">{item.textValue}</p>}
                  {item.amountMinor != null && item.currency && (
                    <p className="mt-1 text-[0.72rem] text-forest-700">
                      {item.currency} {(item.amountMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  )}
                  {item.numericValue != null && <p className="mt-1 text-[0.72rem] text-sand-600">{item.numericValue}{item.unit ? ` ${item.unit}` : ''}</p>}
                  {Object.keys(item.attributes ?? {}).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(item.attributes).map(([key, value]) => (
                        <span key={key} className="rounded-full bg-cream-100 px-2 py-0.5 text-[0.62rem] text-sand-600">
                          {key.replace(/_/g, ' ')}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.evidenceReference && <p className="mt-1 text-[0.65rem] text-sand-500">Evidence: {item.evidenceReference}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-cream-200 bg-white p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select value={type} onChange={e => setType(e.target.value as InstituteProjectObservationType)} className="rounded-lg border border-cream-200 px-2 py-2 text-[0.74rem]">
                {TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={visibility} onChange={e => setVisibility(e.target.value as InstituteProjectObservationVisibility)} className="rounded-lg border border-cream-200 px-2 py-2 text-[0.74rem]">
                <option value="PROJECT_ONLY">Project only</option>
                <option value="COMMUNITY">Community</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="What are you recording?" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
            <textarea value={textValue} onChange={e => setTextValue(e.target.value)} rows={2} placeholder="What actually happened? Include the detail a future dreamer would need." className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={amountKes} onChange={e => setAmountKes(e.target.value)} inputMode="decimal" placeholder="Cost KES (optional)" className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
              <input value={numericValue} onChange={e => setNumericValue(e.target.value)} inputMode="decimal" placeholder="Quantity (optional)" className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit" className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={projectStage} onChange={e => setProjectStage(e.target.value)} placeholder="Project stage — design, foundation, handover..." className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
              <select value={basis} onChange={e => setBasis(e.target.value)} className="rounded-lg border border-cream-200 px-2 py-2 text-[0.74rem]">
                <option value="ACTUAL">Actual / happened</option>
                <option value="QUOTED">Quoted</option>
                <option value="PLANNED">Planned</option>
                <option value="ESTIMATED">Estimated</option>
                <option value="REVISED">Revised</option>
              </select>
              <input value={sourceLabel} onChange={e => setSourceLabel(e.target.value)} placeholder="Supplier / source / responsible party" className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
            </div>
            {type === 'WASTE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={disposalMethod} onChange={e => setDisposalMethod(e.target.value)} placeholder="How was the waste handled or disposed?" className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
                <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination / reuse / disposal point" className="rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
              </div>
            )}
            <input value={evidenceReference} onChange={e => setEvidenceReference(e.target.value)} placeholder="Evidence reference — invoice, photo, note, inspection..." className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.74rem]" />
            <button
              type="button"
              disabled={busy || !label.trim()}
              onClick={() => void record()}
              className="min-h-10 rounded-lg bg-forest-600 px-3 text-[0.74rem] font-medium text-cream-50 disabled:opacity-50"
            >
              {busy ? 'Recording…' : 'Add to Project learning record'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
