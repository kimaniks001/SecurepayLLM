import {useRef,useState} from 'react';
import {CircleAlert,ShieldCheck} from 'lucide-react';
import type {
  PaymentIntentGateway,AgreementFundingQuoteResponse,
  AgreementPaymentIntentCreateResponse,InitiatePaymentResponse,
} from '../api/securepay/payment-intent';
import {miniMoneyIntentStatus} from './miniMoneyReadModel.mjs';

/**
 * M6 financial-command front-end candidate.
 *
 * The only possible payment is an existing SecurePayAPI agreement-bound
 * quote -> server-authorized intent -> provider initiation. No price, KSN,
 * beneficiary, regulated account or provider credentials come from the UI.
 *
 * THIS component is not mounted in normal builds, the synthetic Mini demo,
 * or production: the isolated acceptance flag + preview-only hostname guard
 * both must be explicitly satisfied. Backend authorization and rail gates
 * still independently reject uncertified financial commands.
 *
 * One attempt, no blind retry. An HTTP timeout is UNKNOWN until the
 * original attempt is reconciled on the server.
 */
export function MiniMoneyPaymentFlow({quote,agreementId,versionId,
  payments,prepare,verifyMoney,onRecheck}:{
  quote:AgreementFundingQuoteResponse;
  agreementId:string;
  versionId:string;
  payments:Pick<PaymentIntentGateway,
    'fundingAuthority'|'createIntent'|'get'|'initiate'>;
  prepare:()=>Promise<unknown>;
  verifyMoney:()=>Promise<boolean>;
  onRecheck:()=>void;
}){
  const [intent,setIntent]=useState<AgreementPaymentIntentCreateResponse|null>(null);
  const [response,setResponse]=useState<InitiatePaymentResponse|null>(null);
  const [busy,setBusy]=useState(false);
  const [unknown,setUnknown]=useState(false);
  const [error,setError]=useState('');
  const [approveStart,setApproveStart]=useState(false);
  const [startAsked,setStartAsked]=useState(false);
  const prepareKey=useRef<string|null>(null);
  const initiationKey=useRef<string|null>(null);
  const used=useRef(false);

  const unexpired=Date.parse(quote.expiresAt)>Date.now();
  const canPrepare=!intent&&!unknown&&!busy&&!used.current&&
    quote.economicState==='READY'&&unexpired;
  const canInitiate=!!intent&&!response&&!unknown&&!busy&&!used.current&&
    approveStart&&startAsked&&unexpired;

  const preparePayment=async()=>{
    if(!canPrepare)return;
    used.current=true;
    setBusy(true);setError('');
    try{
      await prepare();
      if(!(await verifyMoney()))
        throw Error('Current Agreement Money position is no longer valid');
      if(quote.agreementId!==agreementId||
        quote.economicState!=='READY'||Date.parse(quote.expiresAt)<=Date.now())
        throw Error('Funding quote expired or source changed');
      const authority=await payments.fundingAuthority(agreementId);
      if(authority.authorized!==true)throw Error('Payer not authorized');
      const key=prepareKey.current||
        (typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null);
      if(!key)throw Error('Secure idempotency reference unavailable');
      prepareKey.current=key;
      const result=await payments.createIntent(
        agreementId,versionId,quote.quoteReference,key);
      if(result.agreementId!==agreementId||
        result.amountMinor!==quote.securePayReceivableMinor||
        result.currency!==quote.currency||
        typeof result.paymentIntentId!=='string'||
        !result.paymentIntentId||typeof result.obligationId!=='string'||
        !result.obligationId||result.status!=='CREATED')
        throw Error('Intent cannot be reconciled with the original Agreement quote');
      setIntent(result);
      setUnknown(false);
      // The quote has been consumed by an intent. Do not create another.
      // Initiation has its OWN explicitly approved second action.
      used.current=false;
    }catch{
      // The POST might have committed even if the reply timed out.
      // NEVER manufacture a new intent/key; reconcile from server history.
      setUnknown(true);
      setError('Payment preparation cannot be confirmed. Recheck the original Agreement attempt. Do not start another.');
    }finally{setBusy(false);}
  };

  const startProvider=async()=>{
    if(!canInitiate||!intent)return;
    used.current=true;setBusy(true);setError('');
    try{
      await prepare();
      if(!(await verifyMoney()))
        throw Error('Current Agreement Money position is no longer valid');
      const fresh=await payments.get(intent.paymentIntentId);
      if(fresh.id!==intent.paymentIntentId||
        fresh.agreementId!==agreementId||
        fresh.obligationId!==intent.obligationId||
        fresh.amountMinor!==intent.amountMinor||
        fresh.currency!==intent.currency||
        fresh.status!=='CREATED'||fresh.conflictDetected||
        fresh.providerConfirmationAccepted)
        throw Error('Original payment intent cannot be safely initiated');
      if(Date.parse(quote.expiresAt)<=Date.now())
        throw Error('Quote expired before provider initiation');
      const key=initiationKey.current||
        (typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null);
      if(!key)throw Error('Secure idempotency reference unavailable');
      initiationKey.current=key;
      const result=await payments.initiate(
        intent.paymentIntentId,quote.railCode,key,quote.quoteReference);
      if(result.paymentIntentId!==intent.paymentIntentId||
        result.providerIdentifier!==quote.railCode||
        typeof result.attemptId!=='string'||!result.attemptId||
        typeof result.initiationStatus!=='string'||!result.initiationStatus)
        throw Error('Provider attempt does not match the Agreement Money source');
      setResponse(result);
      // Even if provider says CONFIRMED, the Agreement Money ledger and
      // Funded Authority MUST be reread; never call this "paid".
    }catch{
      setUnknown(true);
      setError('The original provider attempt may still be pending. Do NOT retry or change routes. Recheck the server record.');
    }finally{setBusy(false);}
  };

  return <div className="spm-mini-agreement-fact"
    data-mini-money="real-payment-commands-gated">
    <strong>Agreement funding</strong>
    <small>The selected fee quote and payer authority will be checked again
      before SecurePay prepares any payment instruction.</small>
    {!intent&&!unknown&&<button type="button" className="spm-secondary"
      disabled={!canPrepare} onClick={()=>void preparePayment()}>
      {busy?'Checking payer authority…':'Prepare Agreement payment'}
    </button>}
    {intent&&<div role="status">
      <strong>Payment prepared — not initiated</strong>
      <small>{intent.currency} {(intent.amountMinor/100).toLocaleString('en-KE',
        {minimumFractionDigits:2,maximumFractionDigits:2})}
        {' · '}Agreement-bound amount returned by SecurePay</small>
      <small>Creating an intent does not debit an account or prove funding.</small>
      {!response&&!unknown&&<>
        <label className="spm-mini-owned-note">
          <input type="checkbox" checked={approveStart}
            onChange={e=>{setApproveStart(e.target.checked);setStartAsked(false);}}/>
          I have reviewed this Agreement and the quoted funding amount.
        </label>
        {approveStart&&!startAsked&&
          <button type="button" className="spm-secondary"
            disabled={busy} onClick={()=>setStartAsked(true)}>
            Review provider initiation
          </button>}
        {startAsked&&<button type="button" className="spm-primary"
          disabled={!canInitiate} onClick={()=>void startProvider()}>
          {busy?'Checking original attempt…':'Start payment with '+quote.railCode}
        </button>}
      </>}
    </div>}
    {response&&<div role="status">
      <strong>Provider attempt submitted — reconcile</strong>
      <small>{miniMoneyIntentStatus(response.status)}</small>
      <small>No completed funds, release or receipt are inferred here.
        Check the Agreement's Money position again.</small>
    </div>}
    {unknown&&<p role="alert" className="spm-error">
      Attempt status is unknown. Never submit a second payment while
      this one may still be processing.
    </p>}
    {error&&<p role="alert" className="spm-error">{error}</p>}
    {(intent||unknown||response)&&<button type="button"
      className="spm-secondary" disabled={busy} onClick={onRecheck}>
      Recheck original Money record
    </button>}
    <small><CircleAlert size={13}/> SecurePay's backend verifies
      identity, current Agreement version, exact economic quote, provider,
      idempotency and financial-command environment separately.</small>
    <small><ShieldCheck size={13}/> Funding and settlement are separate:
      provider confirmation does not automatically release money.</small>
  </div>;
}
