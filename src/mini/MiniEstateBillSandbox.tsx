import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileText, ShieldCheck, TestTube2 } from 'lucide-react';
import { MiniFundingPreview } from './MiniFundingPreview';
import type { MiniDraft, MiniLanguage } from './miniModel';
import type { MiniFundingTestStatus, MiniTestRailId } from './miniFundingSimulator';

/**
 * Day 10: source-aware use of the EXISTING SecurePay Mini + funding simulator.
 * This bridge is explicitly untrusted, nonfinancial, and test-only.
 * The parent is the Estate development site; it owns the bill and its permissions.
 * Real checkout must later fetch an authenticated, server-priced Agreement/payment
 * session from SecurePayAPI. postMessage is never payment or acceptance authority.
 */
type BillSnapshot = {
  version: 1;
  source: 'ESTATE_BILL';
  billNumber: string;
  description: string;
  amountMinor: number;
  currency: 'KES';
  status: 'pending' | 'overdue';
  attemptId: string;
};
type Stage = 'review' | 'simulation';
const READY = 'SECUREPAY_ESTATE_BILL_PREVIEW_READY_V1';
const SOURCE = 'SECUREPAY_ESTATE_BILL_PREVIEW_SOURCE_V1';
const RETURN = 'SECUREPAY_ESTATE_BILL_PREVIEW_RETURN_V1';
const ALLOWED_PARENTS = new Set([
  'https://varsity-dev.estate.ke',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

function parseBill(value: unknown): BillSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Record<string, unknown>;
  if (b.version !== 1 || b.source !== 'ESTATE_BILL' || b.currency !== 'KES' ||
      !['pending', 'overdue'].includes(String(b.status)) ||
      !Number.isSafeInteger(b.amountMinor) || Number(b.amountMinor) < 1 ||
      Number(b.amountMinor) > 10000000000 ||
      typeof b.billNumber !== 'string' || !/^[a-zA-Z0-9._/-]{1,72}$/.test(b.billNumber) ||
      typeof b.description !== 'string' || b.description.length > 200 ||
      typeof b.attemptId !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(b.attemptId)) return null;
  return b as BillSnapshot;
}

export function MiniEstateBillSandbox({ language }: { language: MiniLanguage }) {
  const [bill, setBill] = useState<BillSnapshot | null>(null);
  const [stage, setStage] = useState<Stage>('review');
  const [status, setStatus] = useState<MiniFundingTestStatus>('NOT_STARTED');
  const [failure, setFailure] = useState('Connecting to the Estate development page…');
  const [parentOrigin, setParentOrigin] = useState<string | null>(null);

  useEffect(() => {
    // A production Estate source is NEVER permitted by this pilot.
    let origin: string;
    try { origin = new URL(document.referrer).origin; }
    catch { setFailure('Open this test from an Estate development bill.'); return; }
    if (!ALLOWED_PARENTS.has(origin) || window.parent === window ||
        window.location.hostname === 'securepay.ke') {
      setFailure('This checkout preview is only available from the Estate development site.');
      return;
    }
    setParentOrigin(origin);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== origin) return;
      const raw = event.data as { type?: string; bill?: unknown } | null;
      if (raw?.type !== SOURCE) return;
      const parsed = parseBill(raw.bill);
      if (!parsed) { setFailure('Invalid or changed test bill. Return to Estate and restart.'); return; }
      setBill(parsed);
      setStage('review');
      setStatus('NOT_STARTED');
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: READY, version: 1 }, origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const onStatusChange = useCallback((next: MiniFundingTestStatus, _rail: MiniTestRailId | null) => {
    setStatus(next);
  }, []);
  const returnToEstate = () => {
    if (!parentOrigin || !bill) return;
    // The result is informational only. Estate MUST NOT set a bill/payment status.
    window.parent.postMessage({
      type: RETURN, version: 1, source: 'ESTATE_BILL',
      attemptId: bill.attemptId, result: status, simulated: true,
      paymentVerified: false, amountVerified: false,
    }, parentOrigin);
  };

  if (!bill) return <section className="spm-content" role="status" aria-live="polite">
    <h1 className="spm-question">Estate checkout preview</h1>
    <p className="spm-lead">{failure}</p>
    <p className="spm-demo-flag"><TestTube2 size={16}/>SIMULATION ONLY · No money</p>
  </section>;

  const draft: MiniDraft = {
    intent: 'pay', description: 'Varsityville Estate bill ' + bill.billNumber,
    amount: (bill.amountMinor / 100).toFixed(2),
    counterparty: 'Varsityville Estate', quantity: '', unit: '',
    note: bill.description,
  };
  return <section className="spm-content" data-estate-bill-preview="true">
    {stage === 'review' ? <>
      <div className="spm-demo-flag"><TestTube2 size={16}/>SIMULATION ONLY · No payment</div>
      <div className="spm-hosted-source"><FileText size={18}/>
        <span>Varsityville Estate</span><small>Development bill · unverified preview</small>
      </div>
      <h1 className="spm-question">Review your estate bill</h1>
      <div className="spm-hosted-summary">
        <small>{bill.billNumber} · KES</small>
        <strong>{bill.description || 'Estate service charge'}</strong>
        <div className="spm-hosted-price">
          {'KSh ' + (bill.amountMinor / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </div>
        <span>Outstanding amount shown by the Estate development page</span>
        <div className="spm-hosted-rule">This source is displayed for testing only.
          It is not a signed Agreement or an authenticated SecurePay payment request.</div>
      </div>
      <p className="spm-hosted-safety"><ShieldCheck size={15}/>
        Estate retains bill ownership and payment verification. This will not change your balance.
      </p>
      <button className="spm-primary" type="button" onClick={() => setStage('simulation')}>
        Test payment choices
      </button>
      <button className="spm-quiet-button" type="button" onClick={returnToEstate}>
        <ArrowLeft size={16}/>Back to Estate bill
      </button>
    </> : <MiniFundingPreview
      draft={draft}
      language={language}
      onBack={() => setStage('review')}
      onDemoStateChange={onStatusChange}
      onReturnToHost={returnToEstate}
      returnLabel="Return to Estate · bill remains unpaid"
    />}
    <p className="spm-disclaimer">TEST ONLY · No Agreement accepted, no bank request,
      no receipt and no ledger update. Do not make a real transfer.</p>
  </section>;
}
