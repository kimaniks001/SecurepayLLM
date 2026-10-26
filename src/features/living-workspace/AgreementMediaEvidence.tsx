import { useEffect, useState } from 'react';
import type { AgreementGateway, ObligationDto, EvidenceDto, VerifiedMediaReceipt } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';

type Phase = { loading: boolean; obligations: ObligationDto[]; error: string };
type Pending = {
  obligationId: string; versionId: string; obligationVersion: number;
  file: File; caption: string; uploadKey: string; submitKey: string;
  verified?: VerifiedMediaReceipt;
};
const allowed = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_PDF = 12 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;

/** A small, truthful two-step media tool INSIDE the existing authenticated Living Agreement.
 * Stage 1 stores & verifies private bytes; stage 2 submits the server receipt to the canonical
 * Agreement obligation. Unknown outcomes retain both idempotency keys for exact retry. */
export function AgreementMediaEvidence({ gateway, auth, session, agreementId, versionId, onRecorded }: {
  gateway: Pick<AgreementGateway, 'obligations'|'uploadVerifiedMedia'|'submitVerifiedMediaEvidence'|'obligationEvidence'|'readVerifiedMedia'>;
  auth: AuthGateway; session: SessionStore; agreementId: string; versionId: string; onRecorded?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ loading: true, obligations: [], error: '' });
  const [obligationId, setObligationId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [known, setKnown] = useState<EvidenceDto[]>([]);
  const [opened, setOpened] = useState<{ url: string; mime: string } | null>(null);

  useEffect(() => {
    let live = true;
    setPhase({ loading: true, obligations: [], error: '' });
    setObligationId(''); setFile(null); setCaption(''); setPending(null); setKnown([]);
    void (async () => {
      try {
        await ensureFreshSession(session, auth);
        const obligations = await gateway.obligations(agreementId);
        if (live) setPhase({
          loading: false, obligations: obligations.filter(o => o.agreementId === agreementId && o.agreementVersionId === versionId),
          error: ''
        });
      } catch {
        if (live) setPhase({ loading: false, obligations: [], error: 'SecurePay could not verify your current obligations. Sign in again or refresh.' });
      }
    })();
    return () => { live = false; };
  }, [agreementId, versionId, gateway, auth, session]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => { if (opened) URL.revokeObjectURL(opened.url); }, [opened]);

  // A reviewer must see server-recorded evidence before submitting anything themselves.
  // Never synthesize proof from local uploads, filenames or the selected obligation.
  useEffect(() => {
    let live = true;
    setKnown([]);
    if (phase.loading || phase.error || !obligationId) return () => { live = false; };
    void (async () => {
      try {
        await ensureFreshSession(session, auth);
        const recorded = await gateway.obligationEvidence(agreementId, obligationId);
        if (live) setKnown(recorded.filter(e => e.obligationId === obligationId));
      } catch {
        if (live) setStatus('SecurePay could not load evidence for this obligation. Refresh or sign in again.');
      }
    })();
    return () => { live = false; };
  }, [agreementId, obligationId, phase.loading, phase.error, gateway, auth, session]);



  const obligation = phase.obligations.find(o => o.id === obligationId);
  const maySubmit = obligation && ['IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'OVERDUE'].includes(obligation.status);
  const chooseFile = (candidate: File | null) => {
    setStatus('');
    if (!candidate) { setFile(null); return; }
    if (!allowed.has(candidate.type) || candidate.size === 0 ||
        candidate.size > (candidate.type === 'application/pdf' ? MAX_PDF : MAX_IMAGE)) {
      setFile(null);
      setStatus('Choose a PDF (up to 12 MB) or JPEG/PNG photo (up to 8 MB). Other documents are not yet supported.');
      return;
    }
    setFile(candidate);
  };

  const showProof = async (item: EvidenceDto) => {
    setStatus('');
    try {
      await ensureFreshSession(session, auth);
      const bytes = await gateway.readVerifiedMedia(agreementId, obligationId, item.id);
      if (!bytes || !allowed.has(bytes.type)) throw new Error('SecurePay did not return an approved file format.');
      setOpened({ url: URL.createObjectURL(bytes), mime: bytes.type });
    } catch {
      setStatus('Could not open verified media. It may not have a server-owned upload or you may lack access.');
    }
  };

  const send = async (attempt: Pending) => {
    if (busy) return;
    setBusy(true); setStatus('');
    let progress = attempt;
    try {
      await ensureFreshSession(session, auth);
      if (!progress.verified) {
        const response = await gateway.uploadVerifiedMedia(agreementId, progress.obligationId,
          progress.file, progress.versionId, progress.obligationVersion, progress.uploadKey);
        if (response.agreementEvidenceSubmitted !== false || response.status !== 'VERIFIED_UPLOAD_ONLY'
            || !response.verifiedUpload?.receiptId) {
          throw new Error('SecurePay did not confirm a verified private upload receipt.');
        }
        progress = { ...progress, verified: response.verifiedUpload };
        setPending(progress);
      }
      const submitted = await gateway.submitVerifiedMediaEvidence(agreementId, progress.obligationId, {
        receiptId: progress.verified!.receiptId, idempotencyKey: progress.submitKey,
        expectedAgreementVersionId: progress.versionId,
        expectedObligationVersion: progress.obligationVersion,
        caption: progress.caption,
      });
      if (!submitted?.id || submitted.obligationId !== progress.obligationId) {
        throw new Error('SecurePay has not confirmed which obligation received the evidence.');
      }
      setPending(null); setFile(null); setCaption('');
      setStatus('Photo/document submitted as Agreement evidence. It awaits review. This has not completed the work or released Money.');
      const fresh = await gateway.obligationEvidence(agreementId, progress.obligationId).catch(() => null);
      if (fresh) setKnown(fresh);
      onRecorded?.();
    } catch (error) {
      setPending(progress);
      setStatus(error instanceof Error ? error.message : 'SecurePay could not confirm submission; retry keeps exactly the same keys and file.');
    } finally { setBusy(false); }
  };

  const start = () => {
    if (!maySubmit || !file || !caption.trim() || pending || busy) return;
    const attempt: Pending = {
      obligationId: obligation.id, versionId, obligationVersion: obligation.stateVersion,
      file, caption: caption.trim(), uploadKey: crypto.randomUUID(), submitKey: crypto.randomUUID(),
    };
    setPending(attempt);
    void send(attempt);
  };

  return <section aria-label="Add private photo or PDF evidence" data-gate-d-real-obligation-media-upload
    className="space-y-3 rounded-xl border border-forest-200 bg-cream-50 p-4">
    <h3 className="font-display text-lg text-forest-900">Add a photo or document</h3>
    <p className="text-xs leading-5 text-sand-700">Choose the work, attach the real file and describe what it proves. SecurePay first verifies the private upload, then records evidence. Review and Money decisions remain separate.</p>
    {phase.loading ? <p role="status" className="text-sm">Checking actual Agreement obligations…</p>
    : phase.error ? <p role="alert" className="text-sm">{phase.error}</p>
    : <>
      <label className="block space-y-1 text-sm font-medium">Work this evidence concerns
        <select aria-label="Evidence obligation" value={obligationId} disabled={!!pending || busy}
          onChange={e => { setObligationId(e.target.value); setKnown([]); setStatus(''); }}
          className="min-h-11 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm">
          <option value="">Choose an actual obligation</option>
          {phase.obligations.map(o => <option key={o.id} value={o.id}>{o.title} · {o.status}</option>)}
        </select>
      </label>
      {obligation && !maySubmit && <p className="text-xs text-sand-700">This obligation is not currently accepting evidence. SecurePay must confirm that the work has started.</p>}
      <label className="block space-y-1 text-sm font-medium">Photo or PDF
        <input type="file" accept="image/jpeg,image/png,application/pdf" disabled={!!pending || busy}
          onChange={e => chooseFile(e.currentTarget.files?.[0] ?? null)}
          className="block min-h-11 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm" />
      </label>
      {file && <div className="rounded-xl border border-cream-200 bg-white p-3" aria-label="Selected evidence preview">
        <p className="break-all text-xs font-semibold">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
        {preview && file.type.startsWith('image/') &&
          <img src={preview} alt="Preview of selected evidence photo, not yet uploaded" className="mt-2 max-h-52 w-full object-contain" />}
        {preview && file.type === 'application/pdf' &&
          <iframe sandbox="" src={preview} title="Preview selected PDF before upload" className="mt-2 h-56 w-full" />}
      </div>}
      <label className="block space-y-1 text-sm font-medium">Caption — what does this show?
        <textarea rows={3} maxLength={2048} value={caption} disabled={!!pending || busy}
          onChange={e => setCaption(e.target.value)}
          placeholder="Describe the work, delivery or milestone shown. Mention anything still outstanding."
          className="w-full resize-y rounded-xl border border-cream-200 bg-white p-3 text-sm" />
      </label>
      <p className="text-xs text-sand-600">A photo's actual GPS provenance is not assumed. Location/Plus Code verification and consent remain a separate Gate D check.</p>
      {pending
        ? <button type="button" disabled={busy} onClick={() => void send(pending)}
            className="min-h-11 rounded-xl border border-forest-300 bg-white px-4 text-sm font-semibold disabled:opacity-50">
            {busy ? 'Checking with SecurePay…' : 'Retry exact upload / submission'}
          </button>
        : <button type="button" disabled={!maySubmit || !file || !caption.trim() || busy} onClick={start}
            className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
            Submit photo/document evidence
          </button>}
      {status && <p role="status" className="rounded-lg bg-white p-3 text-sm">{status}</p>}
      {known.length > 0 && <div className="space-y-2" aria-label="Recorded evidence and independent review status">
        {known.map(item => <article key={item.id} className="rounded-xl border border-cream-200 bg-white p-3">
          <p className="break-words text-xs font-semibold">{item.description || 'Recorded evidence'}</p>
          <p className="text-xs text-sand-700">Submitted: {item.status} · Review: {item.reviewState || 'Not returned'}</p>
          {['IMAGE', 'DOCUMENT'].includes(item.evidenceType) &&
            <button type="button" onClick={() => void showProof(item)}
              className="mt-2 min-h-10 rounded-lg border border-forest-300 px-3 text-xs font-semibold">Open authorised media</button>}
        </article>)}
      </div>}
      {opened && <div className="space-y-2 rounded-xl border border-forest-200 bg-white p-3">
        <button type="button" onClick={() => setOpened(null)} className="min-h-10 rounded-lg border px-3 text-xs">Close media preview</button>
        {opened.mime.startsWith('image/') ?
          <img src={opened.url} alt="Verified Agreement evidence image" className="max-h-80 w-full object-contain" /> :
          <a href={opened.url} download="securepay-evidence.pdf" className="block text-sm underline">Open/download authorised PDF</a>}
      </div>}
    </>}
  </section>;
}
