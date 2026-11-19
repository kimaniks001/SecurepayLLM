import { useEffect, useRef, useState } from 'react';
import { FileCheck2, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { HumanPartySubmissionGateway, HumanFairBriefGateway, HumanReviewScope } from '../api/securepay/human-party-submissions';
import type { HumanConsentGateway } from '../api/securepay/human-consent';
import type { ReviewCaseSummaryResponse } from '../api/securepay/agreement-review/dto';
import type { AgreementReviewGateway } from '../api/securepay/agreement-review';
import { MiniHumanCaseRead } from './MiniHumanCaseEvidence';

/**
 * REAL first-party Mini review selection. Source:
 * authenticated My Agreements detail => canonical participant Review list =>
 * explicit human choice of one returned case => independently authorized H3
 * source read. Never trust a URL case ID or fabricate another party response.
 *
 * Preview host only until H3 Core and Review v1/v2 convergence are certified.
 * A v2 case is NOT silently treated as a legacy case.
 */
export function MiniHumanReviewCases({
  agreementId, acceptedVersionId, reviewGateway, partyGateway, fairBriefGateway, consentGateway, prepare
}: {
  agreementId: string;
  acceptedVersionId: string;
  reviewGateway: Pick<AgreementReviewGateway, 'list'>;
  partyGateway: Pick<HumanPartySubmissionGateway, 'read'>;
  fairBriefGateway: Pick<HumanFairBriefGateway, 'read'>;
  consentGateway: Pick<HumanConsentGateway,'status'|'grant'|'withdraw'>;
  prepare: () => Promise<unknown>;
}) {
  const [cases, setCases] = useState<ReviewCaseSummaryResponse[]>([]);
  const [status, setStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [choice, setChoice] = useState<HumanReviewScope|null>(null);
  const serial = useRef(0);

  useEffect(() => {
    // H3 is never cached across the Agreement or accepted-version boundary.
    serial.current += 1;
    setCases([]);
    setChoice(null);
    setStatus('idle');
    return () => { serial.current += 1; };
  }, [agreementId, acceptedVersionId]);

  const load = async () => {
    if (status === 'loading' || !agreementId || !acceptedVersionId) return;
    const requestSerial = ++serial.current;
    setStatus('loading');
    setCases([]);
    setChoice(null);
    try {
      await prepare();
      // The existing participant Review service returns only self-authorized cases.
      // It is the authoritative place to discover a legacy review-case ID.
      const page = await reviewGateway.list({ agreementId, page: 0, size: 20 });
      if (serial.current !== requestSerial) return;
      if (!page || !Array.isArray(page.items)) throw new Error('Review list unavailable');
      const matching = page.items.filter(item =>
        item.agreementId === agreementId &&
        item.agreementVersionId === acceptedVersionId &&
        typeof item.reviewCaseId === 'string' && item.reviewCaseId.length > 0
      );
      setCases(matching);
      setStatus('ready');
    } catch {
      if (serial.current !== requestSerial) return;
      setStatus('error');
      setCases([]);
    }
  };

  return <section aria-label="Your Agreement reviews" className="spm-mini-agreement-section">
    <strong>Need to understand what happened?</strong>
    <p className="spm-mini-owned-note">
      Review what was submitted by the actual Agreement parties. These records
      are not proof or a decision.
    </p>
    {status === 'idle' && <button type="button" className="spm-secondary"
      onClick={() => void load()}><FileCheck2 size={16}/> Check my Agreement reviews</button>}
    {status === 'loading' && <p role="status">Checking your authorized reviews…</p>}
    {status === 'error' && <div>
      <p role="alert" className="spm-mini-owned-note">
        Your Agreement reviews could not be verified. Nothing has changed.
      </p>
      <button type="button" className="spm-secondary"
        onClick={() => void load()}><RefreshCcw size={15}/> Try again</button>
    </div>}
    {status === 'ready' && cases.length === 0 &&
      <p role="status" className="spm-mini-owned-note">
        No matching formal review was returned for this Agreement version.
        You can still ask KS001 for included guidance; no formal case is required.
      </p>}
    {status === 'ready' && cases.length > 0 && <div className="spm-actions">
      {cases.map(item => <button type="button" className="spm-option" key={item.reviewCaseId}
        onClick={() => setChoice({agreementId,acceptedVersionId,reviewCaseId:item.reviewCaseId})}>
        <span className="spm-option-text">
          <strong>Review submitted positions</strong>
          <small>{item.state} · {item.callerRole}</small>
        </span><FileCheck2 size={16}/>
      </button>)}
    </div>}
    {choice && <div className="spm-mini-agreement-fact">
      <div className="spm-persona"><ShieldCheck size={15}/>Authorized participant review</div>
      <MiniHumanCaseRead key={choice.reviewCaseId + acceptedVersionId}
        scope={choice} prepare={prepare}
        consentGateway={{status:async (s)=>{await prepare();return consentGateway.status(s);},
          grant:async (s,expiresAt,commandId)=>{await prepare();return consentGateway.grant(s,expiresAt,commandId);},
          withdraw:async (s,commandId)=>{await prepare();return consentGateway.withdraw(s,commandId);}}}
        fairBriefGateway={{read: async (scope) => { await prepare(); return fairBriefGateway.read(scope); }}} gateway={{
          read: async (scope) => {
            await prepare();
            return partyGateway.read(scope);
          },
        }}/>
    </div>}
  </section>;
}
