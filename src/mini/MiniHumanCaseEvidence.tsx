import { useState } from 'react';
import { ChevronDown, FileCheck2, MessageCircle, ShieldCheck } from 'lucide-react';
import type { HumanReviewCaseSnapshot, HumanReviewScope, HumanPartySubmissionGateway } from '../api/securepay/human-party-submissions';

/**
 * Same native Mini typography and spm-* actions as Buy/Sell/Pay/Collect.
 * Receives ONLY a source-scoped, already-authorized record. It never
 * invents acceptance, calls a model, or authorizes a payment.
 */
export function MiniHumanCaseEvidence({ snapshot, sample = false }: {
  snapshot: HumanReviewCaseSnapshot;
  sample?: boolean;
}) {
  const [show, setShow] = useState(false);
  return <section className="spm-human-case" aria-label="What each party submitted">
    <button type="button" className="spm-secondary spm-human-case-trigger"
      aria-expanded={show} onClick={() => setShow(x => !x)}>
      <FileCheck2 size={17}/> What each party submitted <ChevronDown size={16}/>
    </button>
    {show && <div className="spm-human-case-body">
      {sample && <div className="spm-human-case-label" role="note">Fictional example — not real SecurePay records</div>}
      <div className="spm-human-case-line">
        <strong>Your side</strong>
        <span>{snapshot.yourSideSubmitted ? 'Statement received' : 'No party statement recorded'}</span>
      </div>
      <div className="spm-human-case-line">
        <strong>Other side</strong>
        <span>{snapshot.anotherPartySubmitted ? 'Statement received' : 'Their account has not been recorded'}</span>
      </div>
      {snapshot.partyStatements.map(s => <div className="spm-human-case-statement" key={s.sourceResponseId}>
        <span className="spm-human-source">{s.attribution === 'YOU' ? 'You submitted' : 'Other party submitted'} · Not verified</span>
        <p>{s.submittedNarrative || 'No account was supplied in this response.'}</p>
      </div>)}
      {snapshot.evidenceSubmissions.length > 0 && <div className="spm-human-case-support">
        <ShieldCheck size={15}/>
        <span>{snapshot.evidenceSubmissions.length} supporting item{snapshot.evidenceSubmissions.length === 1 ? '' : 's'} submitted — not examined or confirmed as proof</span>
      </div>}
      <p className="spm-human-case-caution">
        <MessageCircle size={15}/> These are attributable submissions, not findings. Each affected party must have a fair chance to respond before any proposal.
      </p>
      <p className="spm-human-case-caution">Nothing here changes the Agreement or authorizes Money.</p>
    </div>}
  </section>;
}

/**
 * Real authorized read: this separate component is activated only when a
 * first-party Mini host passes a current canonical case scope and a
 * session-authenticated gateway. It never accepts a case id from URL.
 */
export function MiniHumanCaseRead({ scope, gateway }: {
  scope: HumanReviewScope;
  gateway: Pick<HumanPartySubmissionGateway, 'read'>;
}) {
  const [snapshot, setSnapshot] = useState<HumanReviewCaseSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const review = async () => {
    if (loading) return;
    setLoading(true); setError(null); setSnapshot(null);
    try {
      const value = await gateway.read(scope);
      if (scope.agreementId !== value.agreementId ||
          scope.acceptedVersionId !== value.acceptedVersionId ||
          scope.reviewCaseId !== value.reviewCaseId)
        throw new Error('Wrong source case');
      setSnapshot(value);
    } catch {
      setError('Could not verify this review. Reopen your current Agreement and choose the review again.');
    } finally { setLoading(false); }
  };
  return <section className="spm-human-case">
    <button type="button" className="spm-secondary spm-human-case-trigger" disabled={loading} onClick={() => void review()}>
      <FileCheck2 size={17}/>{loading ? 'Checking the review…' : 'Read submitted positions'}
    </button>
    {error && <p role="alert" className="spm-error">{error}</p>}
    {snapshot && <MiniHumanCaseEvidence key={snapshot.reviewCaseId} snapshot={snapshot}/>}
  </section>;
}

export const sampleHumanReview: HumanReviewCaseSnapshot = {
  agreementId: 'sample-agreement', acceptedVersionId: 'sample-version',
  reviewCaseId: 'sample-review', reviewCaseState: 'AWAITING_RESPONSE',
  yourSideSubmitted: true, anotherPartySubmitted: true,
  bothPartiesSubmissionsPresent: true,
  statementsVerified: false, evidenceExamined: false,
  bindingDecisionMade: false, agreementAmended: false, moneyInstructionAuthorized: false,
  partyStatements: [
    { sourceResponseId:'sample-buyer', attribution:'YOU', responseType:'DISPUTE_POSITION',
      submittedNarrative:'The chairs arrived after our agreed time.',
      submittedAt:'2026-11-19T10:00:00Z', status:'SUBMITTED_NOT_VERIFIED' },
    { sourceResponseId:'sample-supplier', attribution:'OTHER_AGREEMENT_PARTY', responseType:'CLARIFICATION',
      submittedNarrative:'Our driver says the vehicle reached the gate before noon.',
      submittedAt:'2026-11-19T10:20:00Z', status:'SUBMITTED_NOT_VERIFIED' },
  ],
  evidenceSubmissions: [{ sourceEvidenceId:'sample-receipt', attribution:'OTHER_AGREEMENT_PARTY',
    evidenceType:'DELIVERY_RECORD', submitterDescription:'Supporting material submitted',
    submittedAt:'2026-11-19T10:20:00Z', status:'SUBMITTED_NOT_EXAMINED' }],
};
