import { useState } from 'react';
import { ChevronDown, FileCheck2, MessageCircle, ShieldCheck } from 'lucide-react';
import type { HumanReviewCaseSnapshot, HumanReviewScope, HumanPartySubmissionGateway, HumanFairBrief, HumanFairBriefGateway } from '../api/securepay/human-party-submissions';
import type { HumanConsentGateway } from '../api/securepay/human-consent';
import type { HumanExamReadinessGateway } from '../api/securepay/human-exam-readiness';
import { MiniHumanAiConsent } from './MiniHumanAiConsent';

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
      {Number.isInteger(snapshot.activeOriginalPartyCount) &&
        Number.isInteger(snapshot.originalPartySubmissionCount) &&
        snapshot.activeOriginalPartyCount > 0 &&
        snapshot.originalPartySubmissionCount >= 0 &&
        snapshot.originalPartySubmissionCount <= snapshot.activeOriginalPartyCount && (
          <p className="spm-human-case-caution" role="status">
            {snapshot.originalPartySubmissionCount} of {snapshot.activeOriginalPartyCount} active Agreement parties submitted an account.
            {!snapshot.allOriginalPartiesSubmitted && ' Others still need an opportunity to respond.'}
          </p>
        )}
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
      <p className="spm-human-case-caution">
        Private statements are not shared with an AI examination just by opening Help.
        A future joint examination needs separately recorded and withdrawable permission
        for the exact information from each active party.
      </p>
    </div>}
  </section>;
}

/**
 * Real authorized read: this separate component is activated only when a
 * first-party Mini host passes a current canonical case scope and a
 * session-authenticated gateway. It never accepts a case id from URL.
 */
export function MiniHumanCaseRead({ scope, gateway, fairBriefGateway, consentGateway, examGateway, prepare }: {
  scope: HumanReviewScope;
  gateway: Pick<HumanPartySubmissionGateway, 'read'>;
  fairBriefGateway: Pick<HumanFairBriefGateway, 'read'>;
  consentGateway: Pick<HumanConsentGateway,'status'|'grant'|'withdraw'>;
  examGateway: Pick<HumanExamReadinessGateway,'prepare'>;
  prepare: () => Promise<unknown>;
}) {
  const [snapshot, setSnapshot] = useState<HumanReviewCaseSnapshot | null>(null);
  const [brief, setBrief] = useState<HumanFairBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const review = async () => {
    if (loading) return;
    setLoading(true); setError(null); setSnapshot(null); setBrief(null); setBriefError(null);
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
  const getFairBrief = async () => {
    if (briefLoading || !snapshot) return;
    setBriefLoading(true); setBrief(null); setBriefError(null);
    try {
      const value = await fairBriefGateway.read(scope);
      if (value.agreementId !== snapshot.agreementId ||
          value.acceptedVersionId !== snapshot.acceptedVersionId ||
          value.reviewCaseId !== snapshot.reviewCaseId)
        throw new Error('The Agreement or review changed');
      setBrief(value);
    } catch {
      setBriefError('The questions could not be verified from current records. No conclusion was made.');
    } finally { setBriefLoading(false); }
  };

  return <section className="spm-human-case">
    <button type="button" className="spm-secondary spm-human-case-trigger" disabled={loading} onClick={() => void review()}>
      <FileCheck2 size={17}/>{loading ? 'Checking the review…' : 'Read submitted positions'}
    </button>
    {error && <p role="alert" className="spm-error">{error}</p>}
    {snapshot && <>
      <MiniHumanCaseEvidence key={snapshot.reviewCaseId} snapshot={snapshot}/>
      <button type="button" className="spm-secondary spm-human-case-trigger"
        disabled={briefLoading} onClick={() => void getFairBrief()}>
        <MessageCircle size={16}/>{briefLoading ? 'Preparing fair questions…' : 'What should we check together?'}
      </button>
    </>}
    {snapshot && <MiniHumanAiConsent key={scope.acceptedVersionId + scope.reviewCaseId}
      scope={scope} gateway={consentGateway} examGateway={examGateway} prepare={prepare}/>}
    {briefError && <p role="alert" className="spm-error">{briefError}</p>}
    {brief && <section className="spm-human-case-body" aria-label="Source-grounded fair questions">
      <div className="spm-human-case-label">Questions to explore · No KS001 finding yet</div>
      {Number.isInteger(brief.activeOriginalPartyCount) &&
        Number.isInteger(brief.originalPartySubmissionCount) &&
        brief.activeOriginalPartyCount > 0 &&
        <p className="spm-human-case-caution" role="status">
          {brief.originalPartySubmissionCount} of {brief.activeOriginalPartyCount} original parties have submitted a statement.
          {!brief.allOriginalPartiesSubmitted && ' The remaining parties should be heard.'}
        </p>}
      <p className="spm-human-case-caution">
        Statements are not verified. Other affected people may still need to be heard.
      </p>
      {brief.nextQuestions.map(q => <p className="spm-human-case-statement" key={q.kind}>
        <span className="spm-human-source">{q.requiresExplicitPartyAction ? 'Your choice' : 'For information'}</span>
        <span>{q.label}</span>
      </p>)}
      <p className="spm-human-case-caution">
        No findings, automatic AI disclosure, Agreement amendments or Money instructions.
      </p>
    </section>}
  </section>;
}

export const sampleHumanReview: HumanReviewCaseSnapshot = {
  agreementId: 'sample-agreement', acceptedVersionId: 'sample-version',
  reviewCaseId: 'sample-review', reviewCaseState: 'AWAITING_RESPONSE',
  yourSideSubmitted: true, anotherPartySubmitted: true,
  bothPartiesSubmissionsPresent: true,
  activeOriginalPartyCount: 3, originalPartySubmissionCount: 2,
  allOriginalPartiesSubmitted: false,
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
