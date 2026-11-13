import { useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { miniMeasuredTermsPacket } from './miniMeasuredTermsPacket.mjs';
import type { AgreementGateway } from '../api/securepay/agreements';
import {
  measuredPreviewProof,type MeasuredRateBasis,type MeasuredMethod,
  type MeasuredServicePreview, type MeasuredServicesGateway,
  type MeasuredServicePreviewRequest,
} from '../api/securepay/measured-services';

const money=(minor:number,currency:string)=>
  `${currency} ${(minor/100).toLocaleString('en-KE',
    {minimumFractionDigits:2,maximumFractionDigits:2})}`;

/**
 * M6B1: one compact tool in the EXISTING Agreement view.
 * Seller/buyer rate and measurement are just a PROPOSAL here.
 * Never a signed tariff, verified trip, finished tractor task or bill.
 */
export function MiniMeasuredServicePreview({agreementId,versionId,
  agreementGateway,measuredGateway,prepare}:{
  agreementId:string;
  versionId:string;
  agreementGateway:Pick<AgreementGateway,'version'>;
  measuredGateway:MeasuredServicesGateway;
  prepare:()=>Promise<unknown>;
}) {
  const [basis,setBasis]=useState<MeasuredRateBasis>('PER_HOUR');
  const [rate,setRate]=useState('5000');
  const [fixed,setFixed]=useState('0');
  const [quantity,setQuantity]=useState('4');
  const [max,setMax]=useState('6');
  const [method,setMethod]=useState<MeasuredMethod>('WORK_LOG');
  const currency='KES';
  const [result,setResult]=useState<MeasuredServicePreview|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [copyNotice,setCopyNotice]=useState('');
  // Editing after an API request was sent must invalidate its old result.
  const revision=useRef(0);
  const edit=()=>{revision.current++;setResult(null);setError('');setCopyNotice('');};
  const choose=(next:MeasuredRateBasis)=>{
    setBasis(next);
    if(next==='PER_HOUR'){
      setRate('5000');setFixed('0');setQuantity('4');setMax('6');setMethod('WORK_LOG');
    } else if(next==='PER_KM_PLUS_FIXED'){
      setRate('50');setFixed('400');setQuantity('50');setMax('100');setMethod('ODOMETER');
    } else{
      setRate('50');setFixed('0');setQuantity('50');setMax('100');setMethod('ODOMETER');
    }
    edit();
  };
  /** Accept at most 2 decimal places; no floating point money or usage. */
  const hundredths=(raw:string,allowZero:boolean)=>{
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw))return null;
    const [whole,part='']=raw.split('.');
    const n=Number(whole)*100+Number(part.padEnd(2,'0'));
    return Number.isSafeInteger(n) && (allowZero?n>=0:n>0)?n:null;
  };
  const minor=(raw:string,allowZero:boolean)=>hundredths(raw,allowZero);

  const calculate=async()=>{
    if(busy)return;
    const perUnit=minor(rate,false),base=minor(fixed,true);
    const reported=hundredths(quantity,true);
    const cap=max.trim()?hundredths(max,false):null;
    if(perUnit===null||base===null||reported===null||
       (max.trim()&&cap===null)||currency!=='KES'||
       (cap!==null&&reported>cap)){
      setError('Check the proposed rate, fee, usage and maximum. Use up to two decimal places.');
      return;
    }
    const requestedRevision=++revision.current;
    setBusy(true);setError('');setResult(null);
    try{
      await prepare();
      const version=await agreementGateway.version(agreementId,versionId);
      if(version.id!==versionId || typeof version.contentHash!=='string' ||
         !/^[0-9a-f]{64}$/.test(version.contentHash))
        throw Error('Unverified Agreement version');
      const request:MeasuredServicePreviewRequest={
        expectedVersionId:versionId, expectedVersionHash:version.contentHash,
        rateBasis:basis,currency,proposedRateMinorPerUnit:perUnit,
        proposedFixedMinor:base,reportedHundredths:reported,
        proposedMaxHundredths:cap,measurementMethod:method,
      };
      const preview=await measuredGateway.preview(agreementId,request);
      if(!measuredPreviewProof(preview,agreementId,request))
        throw Error('Price or authority proof mismatch');
      if(revision.current===requestedRevision)setResult(preview);
    }catch{
      if(revision.current===requestedRevision)
        setError('Could not verify this calculation against the current Agreement. No rate was approved or payment created.');
    }finally{setBusy(false);}
  };

  return <details className="spm-mini-slot" data-m6b1="rate-measured-proposal">
    <summary>Hourly or distance-based charges <small>Proposal only</small></summary>
    <div className="spm-mini-slot-items">
      <p>For work measured in hours or kilometres. These rates and quantities
        are examples you can edit. They do not amend or approve this Agreement.</p>
      <label className="spm-label" htmlFor="m6b-basis">How is the work charged?</label>
      <select id="m6b-basis" className="spm-field" value={basis}
        onChange={e=>choose(e.target.value as MeasuredRateBasis)}>
        <option value="PER_HOUR">Per hour · tractor or hired work</option>
        <option value="PER_KM">Per kilometre</option>
        <option value="PER_KM_PLUS_FIXED">Fixed trip charge + per kilometre</option>
      </select>
      <label className="spm-label" htmlFor="m6b-rate">
        Proposed rate (KSh per {basis==='PER_HOUR'?'hour':'km'})
      </label>
      <input id="m6b-rate" className="spm-field" type="number" min="0.01"
        step="0.01" value={rate} onChange={e=>{setRate(e.target.value);edit();}}/>
      {basis==='PER_KM_PLUS_FIXED'&&<>
        <label className="spm-label" htmlFor="m6b-base">Proposed fixed fee (KSh per trip)</label>
        <input id="m6b-base" className="spm-field" type="number" min="0" step="0.01"
          value={fixed} onChange={e=>{setFixed(e.target.value);edit();}}/>
      </>}
      <label className="spm-label" htmlFor="m6b-usage">
        Reported {basis==='PER_HOUR'?'hours worked':'kilometres travelled'} (not yet verified)
      </label>
      <input id="m6b-usage" className="spm-field" type="number" min="0" step="0.01"
        value={quantity} onChange={e=>{setQuantity(e.target.value);edit();}}/>
      <label className="spm-label" htmlFor="m6b-cap">
        Proposed maximum {basis==='PER_HOUR'?'hours':'kilometres'} (optional)
      </label>
      <input id="m6b-cap" className="spm-field" type="number" min="0.01" step="0.01"
        value={max} onChange={e=>{setMax(e.target.value);edit();}}/>
      <label className="spm-label" htmlFor="m6b-proof">How will usage be verified?</label>
      <select id="m6b-proof" className="spm-field" value={method}
        onChange={e=>{setMethod(e.target.value as MeasuredMethod);edit();}}>
        {basis==='PER_HOUR'?
          <><option value="WORK_LOG">Time and work log</option>
            <option value="MUTUAL_MANUAL">Both parties confirm the time</option></>:
          <><option value="ODOMETER">Start and finish odometer readings</option>
            <option value="GPS_ROUTE">Verified trip route</option>
            <option value="MUTUAL_MANUAL">Both parties confirm the distance</option></>}
      </select>
      <button type="button" className="spm-secondary" disabled={busy}
        onClick={()=>void calculate()}>
        <RefreshCcw size={14}/>{busy?'Checking…':'Calculate proposed charge'}
      </button>
      {error&&<p role="alert" className="spm-error">{error}</p>}
      {result&&<div className="spm-mini-agreement-fact" role="status">
        <strong>Estimated charge: {money(result.proposedTotalMinor,result.currency)}</strong>
        <small>Distance/time portion: {money(result.variableChargeMinor,result.currency)}
          {result.proposedFixedMinor>0?
            ` + fixed fee ${money(result.proposedFixedMinor,result.currency)}`:''}</small>
        {result.proposedMaximumMinor!==null&&<small>
          Proposed cap at maximum use: {money(result.proposedMaximumMinor,result.currency)}
        </small>}
        <small>Rate not yet agreed · Usage not verified · Neither party has approved
          this calculation as payable.</small>
        {miniMeasuredTermsPacket(result)&&<details className="spm-mini-slot" data-m8="version-bound-terms-packet">
          <summary>Terms for discussion <small>Not recorded or agreed</small></summary>
          <div className="spm-mini-slot-items">
            <small>Based on Agreement version {result.agreementVersionId.slice(0,8)}.
              Copy this proposal into your discussion with the other party.
              It is not an Agreement amendment or payment approval.</small>
            <textarea className="spm-field" readOnly rows={9}
              aria-label="Version-bound proposed service terms"
              value={miniMeasuredTermsPacket(result)??''}/>
            <button type="button" className="spm-secondary"
              onClick={()=>{
                const packet=miniMeasuredTermsPacket(result);
                if(!packet)return;
                void navigator.clipboard.writeText(packet).then(()=>
                  setCopyNotice('Proposal copied for discussion. No Agreement was changed.'),()=>
                  setCopyNotice('Copy unavailable. Select the proposal text above.'));
              }}>Copy proposed terms</button>
            {copyNotice&&<small role="status">{copyNotice}</small>}
          </div>
        </details>}
        <details className="spm-mini-slot" data-m8="measured-evidence-steps">
          <summary>Before this can become a bill <small>4 checks needed</small></summary>
          <div className="spm-mini-slot-items">
            <small>1. Both people confirm the rate, fixed fee and limit in a new Agreement version.</small>
            <small>2. Record time or distance evidence against that agreed version.</small>
            <small>3. Each party independently reviews the actual measured work and charge.</small>
            <small>4. SecurePay separately checks payment authority and the chosen provider.</small>
            <small>This estimate proves none of these checks and cannot become payable automatically.</small>
          </div>
        </details>
      </div>}
      <small>Next: record the rate and cap in the actual Agreement,
        separately confirm them, collect usage evidence and have both parties
        verify the bill. No payment, escrow, or stock reservation is activated.</small>
    </div>
  </details>;
}
