import { useEffect, useState } from 'react';
import { BookOpenCheck, Check, FileCheck2, Upload } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstituteParticipationDto, InstituteStepProgressDto } from '../../api/securepay/institute/dto';

function StepRow({
  participation,
  step,
  gateway,
  onChanged,
}: {
  participation: InstituteParticipationDto;
  step: InstituteStepProgressDto;
  gateway: InstituteGateway;
  onChanged: (next: InstituteParticipationDto) => void;
}) {
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const complete = async () => {
    if (busy) return;
    setBusy(true); setNotice(null);
    try {
      onChanged(await gateway.completeLearningStep(participation.id, step.stepId));
    } catch {
      setNotice(step.evidenceRequired
        ? 'This step needs accepted evidence before it can be completed.'
        : 'The Institute could not complete this step just now.');
    } finally { setBusy(false); }
  };

  const submitEvidence = async () => {
    if (busy || !reference.trim()) return;
    setBusy(true); setNotice(null);
    try {
      await gateway.submitLearningEvidence(participation.id, step.stepId, 'WORK_SAMPLE', reference.trim());
      onChanged(await gateway.participation(participation.id));
      setReference('');
      setNotice('Evidence submitted for review. Submission is not the same as capability approval.');
    } catch {
      setNotice('The Institute could not submit this evidence.');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50/60 p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          step.status === 'COMPLETED' ? 'bg-forest-700 text-white' : 'bg-white border border-cream-200 text-sand-600'
        }`}>
          {step.status === 'COMPLETED' ? <Check className="w-3.5 h-3.5" /> : step.ordinal + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-forest-900">{step.title}</p>
          <p className="mt-0.5 text-[0.7rem] text-sand-500">
            {step.kind.replaceAll('_', ' ').toLowerCase()}
            {step.capabilityKey ? ` · ${step.capabilityKey}` : ''}
            {step.evidenceRequired ? ' · evidence required' : ''}
          </p>

          {step.status !== 'COMPLETED' && step.evidenceRequired && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Evidence reference — Project, Agreement, file or work sample"
                className="min-h-11 flex-1 rounded-xl border border-cream-200 bg-white px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void submitEvidence()}
                disabled={busy || !reference.trim()}
                className="min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2"><Upload className="w-4 h-4" />Submit evidence</span>
              </button>
            </div>
          )}

          {step.status !== 'COMPLETED' && !step.evidenceRequired && (
            <button
              type="button"
              onClick={() => void complete()}
              disabled={busy}
              className="mt-3 min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50"
            >
              Mark this learning step complete
            </button>
          )}

          {step.status === 'EVIDENCE_PENDING' && (
            <p className="mt-2 text-xs text-sand-600">Evidence is waiting for review.</p>
          )}
          {notice && <p className="mt-2 text-xs text-sand-600">{notice}</p>}
        </div>
      </div>
    </div>
  );
}

export function InstituteMyLearning({ gateway }: { gateway: InstituteGateway }) {
  const [items, setItems] = useState<InstituteParticipationDto[]>([]);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    try { setItems(await gateway.myParticipations()); }
    catch { setNotice('The Institute could not load your learning just now.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, [gateway]);

  const replace = (next: InstituteParticipationDto) => {
    setItems(current => current.map(item => item.id === next.id ? next : item));
  };

  const completeParticipation = async (item: InstituteParticipationDto) => {
    setNotice(null);
    try { replace(await gateway.completeParticipation(item.id)); }
    catch { setNotice('Every required learning step must be complete before the programme can be completed.'); }
  };

  if (busy) return <p role="status" className="text-sm text-sand-500">Loading your learning…</p>;

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-cream-200 bg-white p-6">
        <div className="flex items-center gap-2"><BookOpenCheck className="w-5 h-5 text-forest-600" /><h2 className="font-display text-xl text-forest-900">My Learning</h2></div>
        <p className="mt-2 text-sm text-sand-600">You have not started a deliberate Institute programme yet. You can still learn from the Knowledge Fabric without enrolling in anything.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {notice && <div className="rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm text-sand-700">{notice}</div>}
      <div>
        <div className="flex items-center gap-2"><BookOpenCheck className="w-5 h-5 text-forest-600" /><h2 className="font-display text-2xl text-forest-900">My Learning</h2></div>
        <p className="mt-1 text-sm text-sand-600">Learning progress records what you have done. It does not silently turn attendance into capability.</p>
      </div>
      {items.map(item => {
        const allComplete = item.steps.length > 0 && item.steps.every(step => step.status === 'COMPLETED');
        return (
          <section key={item.id} className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">Programme</p>
                <p className="mt-1 text-sm font-medium text-forest-900">{item.programId}</p>
                <p className="mt-1 text-xs text-sand-500">{item.status.toLowerCase()} · started {new Date(item.startedAt).toLocaleDateString()}</p>
              </div>
              {item.status === 'COMPLETED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs text-forest-700">
                  <FileCheck2 className="w-3.5 h-3.5" />Completed
                </span>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {item.steps.map(step => (
                <StepRow key={step.stepId} participation={item} step={step} gateway={gateway} onChanged={replace} />
              ))}
            </div>
            {item.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => void completeParticipation(item)}
                disabled={!allComplete}
                className="mt-4 min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-40"
              >
                Complete programme
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
