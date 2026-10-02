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

  const [type, setType] = useState<InstituteProjectObservationType>('COST');
  const [label, setLabel] = useState('');
  const [textValue, setTextValue] = useState('');
  const [amountKes, setAmountKes] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [unit, setUnit] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
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

  async function openProjectKnowledgeSpace() {
    if (spaceBusy) return;
    if (knowledgeSpaceId) {
      onOpenInstituteSpace(knowledgeSpaceId);
      return;
    }
    setSpaceBusy(true);
    setError(null);
    try {
      const created = await gateway.createCommunityProjectSpace(projectId, {
        name: `${projectTitle} knowledge`,
        purpose: projectPurpose,
        visibility: 'COMMUNITY',
      });
      setKnowledgeSpaceId(created.id);
      onOpenInstituteSpace(created.id);
    } catch {
      setError('The Project Knowledge Space could not be opened. Nothing in the Project was changed.');
    } finally {
      setSpaceBusy(false);
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
      });
      setItems(current => [...current, created]);
      setLabel('');
      setTextValue('');
      setAmountKes('');
      setNumericValue('');
      setUnit('');
      setEvidenceReference('');
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
            <button
              type="button"
              onClick={() => void openProjectKnowledgeSpace()}
              disabled={spaceBusy}
              className="mt-2 min-h-10 rounded-lg border border-forest-200 px-3 text-[0.72rem] font-medium text-forest-700 disabled:opacity-50"
            >
              {spaceBusy ? 'Opening…' : knowledgeSpaceId ? 'Open Project Knowledge Space' : 'Create Project Knowledge Space'}
            </button>
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
