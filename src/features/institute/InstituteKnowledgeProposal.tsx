import { useState } from 'react';
import { FileCheck2, Send } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type { InstituteKnowledgeCandidateDto, InstituteLearningAssetDto } from '../../api/securepay/institute/dto';

export function InstituteKnowledgeProposal({
  gateway,
  asset,
}: {
  gateway: InstituteGateway;
  asset: InstituteLearningAssetDto;
}) {
  const [candidate, setCandidate] = useState<InstituteKnowledgeCandidateDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const propose = async () => {
    if (busy) return;
    setBusy(true); setNotice(null);
    try {
      const created = await gateway.proposeKnowledgeCandidate(asset.id, asset.title, asset.summary);
      setCandidate(created);
      setNotice('Captured as a knowledge candidate. It is still not SecurePay truth.');
    } catch {
      setNotice('The Institute could not create a Knowledge candidate. Trust Project membership and author authority may be required.');
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!candidate || busy) return;
    setBusy(true); setNotice(null);
    try {
      const next = await gateway.submitKnowledgeCandidate(candidate.id);
      setCandidate(next);
      setNotice('Submitted for human Knowledge review. The author cannot approve it simply by publishing it.');
    } catch {
      setNotice('The candidate could not be submitted for review.');
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <FileCheck2 className="w-5 h-5 text-forest-600" />
        <h2 className="font-display text-xl text-forest-900">Could this improve governed knowledge?</h2>
      </div>
      <p className="mt-2 text-[0.82rem] leading-relaxed text-sand-600">
        Institute publishing and SecurePay Knowledge are different. You may propose the lesson for review, but only the governed maker-checker process can approve it.
      </p>
      {!candidate && (
        <button
          type="button"
          onClick={() => void propose()}
          disabled={busy}
          className="mt-3 min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800 disabled:opacity-50"
        >
          Propose this learning for Knowledge review
        </button>
      )}
      {candidate && candidate.status === 'CAPTURED' && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          <Send className="w-4 h-4" />Submit for review
        </button>
      )}
      {candidate && candidate.status !== 'CAPTURED' && (
        <p className="mt-3 text-sm text-forest-700">Knowledge candidate: {candidate.status.replaceAll('_', ' ').toLowerCase()}.</p>
      )}
      {notice && <p className="mt-2 text-xs text-sand-600">{notice}</p>}
    </section>
  );
}
