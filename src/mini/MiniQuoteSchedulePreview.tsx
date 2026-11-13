import { useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import type {
  QuoteObligationPlan, QuoteSchedulePreview, QuoteScheduleType,
  QuoteRoutePreference, QuoteHandlingPreference, StoreQuotationGateway,
} from '../api/securepay/store-quotations';
import { quoteSchedulePreviewProof } from '../api/securepay/store-quotations';

const money=(amount:number,currency:string)=>
  `${currency} ${(amount/100).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

/**
 * M6A: compact, authenticated buyer-only schedule COMPARISON in the existing
 * Agreement. NO new checkout, staged obligation, seller approval or real Money.
 * Every displayed proposed amount comes back from SecurePayAPI, calculated
 * from the consent-verified original staged plan.
 */
export function MiniQuoteSchedulePreview({plan,quotationGateway,prepare}:{
  plan:QuoteObligationPlan;
  quotationGateway:Pick<StoreQuotationGateway,'previewSchedule'>;
  prepare:()=>Promise<unknown>;
}) {
  const [schedule,setSchedule]=useState<QuoteScheduleType>('FULL_ON_COMPLETION');
  const [deposit,setDeposit]=useState('30');
  const [progress,setProgress]=useState('30');
  const [route,setRoute]=useState<QuoteRoutePreference>('UNDECIDED');
  const [handling,setHandling]=useState<QuoteHandlingPreference>('TO_AGREE');
  const [result,setResult]=useState<QuoteSchedulePreview|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  // Never display an obsolete API answer after the buyer edits a split.
  const revision=useRef(0);
  const change=()=>{revision.current++;setResult(null);setError('');};

  const compare=async()=>{
    if(busy)return;
    const pct=schedule==='FULL_ON_COMPLETION'?null:Number(deposit);
    const progressPct=schedule==='DEPOSIT_PROGRESS_COMPLETION'?Number(progress):null;
    if ((pct!==null&&(!Number.isInteger(pct)||pct<1||pct>99)) ||
        (progressPct!==null&&(!Number.isInteger(progressPct)||
          progressPct<1||progressPct>99||pct===null||pct+progressPct>=100))) {
      setError('Check the deposit and progress percentages. Every stage needs a positive balance.');
      return;
    }
    if(!plan.sourceAndConsentCurrent||plan.executable!==false||
       plan.paymentEnabled!==false||!Number.isSafeInteger(plan.buyerPaymentMinor)){
      setError('The original Agreement terms or seller and buyer consent cannot be verified.');
      return;
    }
    const requestedRevision=++revision.current;
    setBusy(true);setResult(null);setError('');
    try {
      await prepare();
      const proposed=await quotationGateway.previewSchedule(plan.agreementId,{
        expectedPlanId:plan.planId,
        expectedVersionId:plan.versionId,
        expectedVersionHash:plan.versionHash,
        scheduleType:schedule,depositPercent:pct,progressPercent:progressPct,
        preferredRoute:route,handlingPreference:handling,
      });
      if(!quoteSchedulePreviewProof(proposed,plan)||
          proposed.scheduleType!==schedule||
          proposed.depositPercent!==pct||
          proposed.progressPercent!==progressPct||
          proposed.preferredRoute!==route||
          proposed.handlingPreference!==handling)
        throw Error('Invalid payment schedule source');
      if(revision.current===requestedRevision)setResult(proposed);
    }catch{
      if(revision.current===requestedRevision)
        setError('This schedule could not be verified against the current Agreement. Nothing was recorded or paid.');
    }finally{setBusy(false);}
  };

  return <details className="spm-mini-slot" data-m6a="payment-schedule-preview">
    <summary>Compare payment timings <small>Preview only</small></summary>
    <div className="spm-mini-slot-items">
      <p className="spm-mini-owned-note">
        The existing quotation total is {money(plan.buyerPaymentMinor,plan.currency)}.
        Compare when payments might fall due. This is not an agreed change, payment
        request or a funded deposit.
      </p>
      <label className="spm-label" htmlFor="m6a-payment-timing">Payment timing</label>
      <select id="m6a-payment-timing" className="spm-field" value={schedule}
        onChange={e=>{setSchedule(e.target.value as QuoteScheduleType);change();}}>
        <option value="FULL_ON_COMPLETION">Full amount after completion</option>
        <option value="DEPOSIT_AND_BALANCE">Deposit and balance</option>
        <option value="DEPOSIT_PROGRESS_COMPLETION">Deposit, progress, completion</option>
      </select>
      {schedule!=='FULL_ON_COMPLETION'&&<>
        <label className="spm-label" htmlFor="m6a-deposit">Deposit share (%)</label>
        <input id="m6a-deposit" className="spm-field" type="number"
          min="1" max="99" step="1" value={deposit}
          onChange={e=>{setDeposit(e.target.value);change();}}/>
      </>}
      {schedule==='DEPOSIT_PROGRESS_COMPLETION'&&<>
        <label className="spm-label" htmlFor="m6a-progress">Progress share (%)</label>
        <input id="m6a-progress" className="spm-field" type="number"
          min="1" max="99" step="1" value={progress}
          onChange={e=>{setProgress(e.target.value);change();}}/>
      </>}
      <label className="spm-label" htmlFor="m6a-route">Preferred payment route (not selected for payment)</label>
      <select id="m6a-route" className="spm-field" value={route}
        onChange={e=>{setRoute(e.target.value as QuoteRoutePreference);change();}}>
        <option value="UNDECIDED">To agree</option>
        <option value="MPESA">M-Pesa</option>
        <option value="PESALINK">PesaLink</option>
        <option value="CHOICE_BANK">Choice Bank</option>
        <option value="OTHER">Another supported option</option>
      </select>
      <label className="spm-label" htmlFor="m6a-handling">Handling preference (not activated)</label>
      <select id="m6a-handling" className="spm-field" value={handling}
        onChange={e=>{setHandling(e.target.value as QuoteHandlingPreference);change();}}>
        <option value="TO_AGREE">To agree</option>
        <option value="DIRECT_TO_SELLER">Direct payment, if parties agree</option>
        <option value="REGULATED_SAFEGUARD_IF_AVAILABLE">Regulated partner safeguarding, if available</option>
      </select>
      <button type="button" className="spm-secondary" disabled={busy}
        onClick={()=>void compare()}>
        <RefreshCcw size={14}/>{busy?'Checking exact amounts…':'Compare proposed schedule'}
      </button>
      {error&&<p className="spm-error" role="alert">{error}</p>}
      {result&&<div className="spm-mini-agreement-fact" role="status">
        <strong>Proposed schedule — not recorded</strong>
        {result.proposedSteps.map(step=><div key={step.sequence} className="spm-mini-owned-item">
          <div>
            <strong>{step.sequence}. {step.label} · {money(step.amountMinor,result.currency)}</strong>
            <small>{step.checkpoint}</small>
          </div>
        </div>)}
        <p>Total: {money(result.principalMinor,result.currency)}</p>
        <small>These numbers are calculated from the recorded quotation.
          The seller has NOT approved this new schedule and no payment
          route or safeguarding provider has been activated.</small>
        <details className="spm-mini-slot" data-m8="schedule-consent-steps">
          <summary>Before any instalment is payable <small>Independent checks</small></summary>
          <div className="spm-mini-slot-items">
            <small>1. Record this exact split and checkpoint terms as an Agreement amendment.</small>
            <small>2. Buyer and seller separately confirm the amended version.</small>
            <small>3. Verify the milestone evidence and the amount due at that stage.</small>
            <small>4. SecurePay separately verifies funding authority and provider eligibility.</small>
            <small>No deposit has been requested or funded here.</small>
          </div>
        </details>
      </div>}
      <small>To change what is legally agreed, a future Agreement amendment
        must record the schedule and both parties must independently
        review and confirm that new version. No payment can be made here.</small>
    </div>
  </details>;
}
