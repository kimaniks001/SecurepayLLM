import { useState } from 'react';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
import { REVIEW_EVIDENCE_MAX_DESCRIPTION, REVIEW_EVIDENCE_MEDIA_TYPES } from '../../api/securepay/agreement-review';
import type { ReviewEligibilityResponse, ReviewEvidenceType } from '../../api/securepay/agreement-review/dto';
import { createAttemptStore } from '../money/attempt';
import { EVIDENCE_WORDS, OUTCOME_WORDS, runSubmitEvidence, sha256Hex, type EvidenceFile, type EvidenceOutcome } from './actions';
import { PARTICIPANT_EVIDENCE_TYPES, REVIEW_OPENING_NOT_AVAILABLE, evidenceTypeWords, reserveWords } from './display';

const btn = 'rounded-xl border border-cream-200 px-3 py-2 text-sm text-forest-800 hover:border-forest-300 hover:bg-cream-50 disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = 'rounded-xl bg-forest-700 px-3 py-2 text-sm text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Phase 7 Slice 6 -- whether a formal review can be started here, from SecurePay's eligibility read only. Opening is not available to participants
 * yet (the opening path awaits a doctrine decision); the Review Reserve is explained from backend truth, never computed here.
 */
export function OpeningStatus({ eligibility }: { eligibility: { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ReviewEligibilityResponse } }) {
  return (
    <div className="space-y-1" data-testid="review-opening">
      <p className="text-sm text-sand-600">{REVIEW_OPENING_NOT_AVAILABLE}</p>
      {eligibility.status === 'ready' && <p className="text-sm text-sand-600">{reserveWords(eligibility.data)}</p>}
      {eligibility.status === 'error' && <p className="text-sm text-sand-600">SecurePay couldn’t check the Review Reserve for this Agreement just now.</p>}
    </div>
  );
}

const toEvidenceFile = (file: File): EvidenceFile => ({ name: file.name, size: file.size, type: file.type, bytes: () => file.arrayBuffer(), blob: file });

/**
 * Phase 7 Slice 6 -- add one evidence file to a Review the caller is in. Shown only when the fresh case read says evidence is open (see
 * `canAddEvidence`); SecurePay re-checks the role, state, deadline, type and size. An uncertain upload keeps the SAME file and request (same key);
 * "Check what happened" settles it from the evidence SecurePay lists (same SHA-256, added by you). Success is claimed only from SecurePay's reply.
 */
export function AddEvidence({ gateway, reviewCaseId, agreementId, onRecorded }: {
  gateway: Pick<AgreementReviewGateway, 'submitEvidence' | 'evidence'>; reviewCaseId: string; agreementId: string; onRecorded: () => void;
}) {
  const [attempts] = useState(() => createAttemptStore());
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<ReviewEvidenceType>('DOCUMENT');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);

  const settle = (outcome: EvidenceOutcome) => {
    if (outcome.kind === 'ok') { setMessage(EVIDENCE_WORDS.ok); setUncertain(false); setFile(null); setDescription(''); setOpen(false); onRecorded(); return; }
    if (outcome.kind === 'invalid') { setMessage(EVIDENCE_WORDS.problems[outcome.problem]); return; }
    if (outcome.kind === 'uncertain') { setUncertain(true); setMessage(OUTCOME_WORDS.uncertain); return; }
    setUncertain(false); setMessage(OUTCOME_WORDS[outcome.kind]); onRecorded();
  };

  const submit = async () => {
    setBusy(true); setMessage(null);
    const outcome = await runSubmitEvidence(gateway, attempts, { reviewCaseId, agreementId }, { evidenceType, description, file: file ? toEvidenceFile(file) : null });
    settle(outcome); setBusy(false);
  };

  // "Check what happened": the evidence list is the proof -- the same bytes (SHA-256) recorded as added by you.
  const check = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const digest = await sha256Hex(await file.arrayBuffer());
      const listed = await gateway.evidence(reviewCaseId, agreementId);
      if (listed.items.some(item => item.submittedByCaller && item.contentSha256Hex === digest)) {
        attempts.settle(); settle({ kind: 'ok', result: listed.items.find(item => item.contentSha256Hex === digest)! });
      } else setMessage('SecurePay doesn’t yet show this evidence. You can try the same upload again; it can’t be recorded twice.');
    } catch { setMessage('SecurePay couldn’t check just now. You can try the same upload again; it can’t be recorded twice.'); }
    setBusy(false);
  };

  if (!open && !uncertain) {
    return <div className="space-y-1">
      {message && <p role="status" className="text-sm text-forest-800">{message}</p>}
      <button onClick={() => { setOpen(true); setMessage(null); }} className={btn}>Add evidence</button>
    </div>;
  }
  return (
    <div className="space-y-2 rounded-xl border border-cream-200 p-3" data-testid="review-add-evidence">
      <label className="block text-sm text-forest-800">
        File
        <input type="file" accept={REVIEW_EVIDENCE_MEDIA_TYPES.join(',')} disabled={busy || uncertain}
          onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(null); }} className="mt-1 block w-full text-sm" />
      </label>
      <p className="text-xs text-sand-600">PDF, JPEG or PNG photos, or plain text · up to 10 MB. SecurePay keeps the file privately with this review.</p>
      <label className="block text-sm text-forest-800">
        What kind of evidence
        <select value={evidenceType} disabled={busy || uncertain} onChange={e => setEvidenceType(e.target.value as ReviewEvidenceType)} className="mt-1 block w-full rounded-lg border border-cream-200 px-2 py-1.5 text-sm">
          {PARTICIPANT_EVIDENCE_TYPES.map(type => <option key={type} value={type}>{evidenceTypeWords(type)}</option>)}
        </select>
      </label>
      <label className="block text-sm text-forest-800">
        What it shows (optional)
        <textarea value={description} disabled={busy || uncertain} maxLength={REVIEW_EVIDENCE_MAX_DESCRIPTION} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded-lg border border-cream-200 px-2 py-1.5 text-sm" />
      </label>
      <p className="text-xs text-sand-600">Adding evidence records it on the review. It does not decide the review and moves no money.</p>
      {message && <p role="status" className="text-sm text-forest-800">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {uncertain
          ? <>
              <button onClick={() => void submit()} disabled={busy} className={btnPrimary}>Try the same upload again</button>
              <button onClick={() => void check()} disabled={busy} className={btn}>Check what happened</button>
            </>
          : <>
              <button onClick={() => void submit()} disabled={busy || !file} className={btnPrimary}>{busy ? 'Adding…' : 'Add this evidence'}</button>
              <button onClick={() => { setOpen(false); setFile(null); setMessage(null); }} disabled={busy} className={btn}>Cancel</button>
            </>}
      </div>
    </div>
  );
}
