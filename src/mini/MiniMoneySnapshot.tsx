import {useEffect,useState} from 'react';
import {RefreshCcw,ShieldCheck} from 'lucide-react';
import type {
  MoneySnapshotGateway,AgreementMoneySnapshotResponse,
} from '../api/securepay/money-snapshot';
import type {
  PaymentIntentGateway,AgreementPaymentIntentSummaryResponse,
  AgreementFundingQuoteResponse,PaymentIntentResponse,
  AgreementFundingOptionResponse,
} from '../api/securepay/payment-intent';
import { MiniMoneyPaymentFlow } from './MiniMoneyPaymentFlow';
import {miniMoneySnapshotProof,miniMoneyStatusLabel}
  from './miniMoneySnapshotProof.mjs';
import {
  miniMoneyFeeQuoteProof,miniMoneyIntentListProof,
  miniMoneyIntentDetailProof,miniMoneyIntentStatus,
} from './miniMoneyReadModel.mjs';

const formatMoney=(minor:number|null,currency:string|null)=>{
  if(minor===null||!Number.isSafeInteger(minor)||minor<0||
    !currency||!/^[A-Z]{3}$/.test(currency))return 'Amount needs verification';
  return currency+' '+(minor/100).toLocaleString('en-KE',
    {minimumFractionDigits:2,maximumFractionDigits:2});
};
const date=(s:string)=>{const t=Date.parse(s);return Number.isFinite(t)
  ?new Date(t).toLocaleString('en-KE',{day:'numeric',month:'short',
    year:'numeric',hour:'2-digit',minute:'2-digit'}):'Date needs checking';};

/**
 * Existing Mini → My Agreements → Money. ONE canonical server source.
 * - Snapshot and intent history only GET, rechecked for this signed-in actor.
 * - Version-bound fee-quote POST is an explicit, opt-in isolated-staging
 *   action and may persist quote evidence. NEVER creates a payment intent.
 * - Payment submission is separately opt-in on a preview host, with
 *   independent server funding authority and a separate initiation click.
 *   It remains disabled in all ordinary deployments.
 * - Settlement / ledger release is never initiated from Mini here.
 * - Neither a quote nor a provider-confirmed attempt is a Money receipt.
 */
export function MiniMoneySnapshot({agreementId,versionId,money,payments,
  quoteReviewEnabled,paymentCommandsEnabled,prepare}:{
  agreementId:string;
  versionId:string;
  money:Pick<MoneySnapshotGateway,'read'>;
  payments:PaymentIntentGateway;
  quoteReviewEnabled:boolean;
  paymentCommandsEnabled:boolean;
  prepare:()=>Promise<unknown>;
}) {
  const [snapshot,setSnapshot]=useState<AgreementMoneySnapshotResponse|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [history,setHistory]=useState<AgreementPaymentIntentSummaryResponse[]>([]);
  const [historyState,setHistoryState]=useState<'loading'|'ready'|'error'>('loading');
  const [quote,setQuote]=useState<AgreementFundingQuoteResponse|null>(null);
  const [quoteBusy,setQuoteBusy]=useState(false);
  const [quoteError,setQuoteError]=useState('');
  const [selectedRail,setSelectedRail]=useState('');
  const [selectedIntent,setSelectedIntent]=useState<PaymentIntentResponse|null>(null);
  const [intentBusy,setIntentBusy]=useState(false);
  const [intentError,setIntentError]=useState('');
  const [refresh,setRefresh]=useState(0);

  useEffect(()=>{
    let alive=true;
    setSnapshot(null);setState('loading');
    setHistory([]);setHistoryState('loading');
    setQuote(null);setSelectedRail('');setSelectedIntent(null);
    setQuoteError('');setIntentError('');
    (async()=>{
      // Refresh the SAME first-party session once. Parallel reads use that
      // one auth epoch and do not race single-use refresh tokens.
      try{ await prepare(); }
      catch{
        if(alive){
          setSnapshot(null);setState('error');
          setHistory([]);setHistoryState('error');
        }
        return;
      }
      const reads=await Promise.allSettled([
        money.read(agreementId),
        payments.listIntents(agreementId,0,10),
      ]);
      if(!alive)return;
      const snapshotReply=reads[0];
      if(snapshotReply.status==='fulfilled'&&
        miniMoneySnapshotProof(snapshotReply.value,agreementId,versionId)){
        setSnapshot(snapshotReply.value);setState('ready');
      }else{setSnapshot(null);setState('error');}
      const historyReply=reads[1];
      // The API page may omit older unresolved payment attempts. A
      // partial history is never authority to create another intent.
      if(historyReply.status==='fulfilled'&&
        miniMoneyIntentListProof(historyReply.value)&&
        historyReply.value.totalElements===historyReply.value.items.length){
        setHistory(historyReply.value.items);setHistoryState('ready');
      }else{setHistory([]);setHistoryState('error');}
    })();
    return ()=>{alive=false;};
    // Parent remounts for each Agreement and each signed-in account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[agreementId,versionId,money,payments,refresh]);

  const reviewQuote=async()=>{
    if(!quoteReviewEnabled||!snapshot||state!=='ready'||quoteBusy)return;
    const route:AgreementFundingOptionResponse|undefined=
      snapshot.fundingOptions.find(item=>item.railCode===selectedRail);
    if(!route||!route.quoteAvailable||!snapshot.feeQuoteRequestsPermitted){
      setQuoteError('SecurePay has not authorised a fee quotation for this option.');
      return;
    }
    setQuoteBusy(true);setQuote(null);setQuoteError('');
    try{
      await prepare();
      // Read again before creating an expiring canonical provider fee quote.
      const fresh=await money.read(agreementId);
      if(!miniMoneySnapshotProof(fresh,agreementId,versionId)||
        !fresh.feeQuoteRequestsPermitted||
        !fresh.fundingOptions.some(r=>r.railCode===route.railCode&&
          r.currency===route.currency&&r.quoteAvailable))
        throw Error('Money option or Agreement version changed');
      const result=await payments.createVersionBoundQuote(
        agreementId,route.railCode,versionId);
      if(!miniMoneyFeeQuoteProof(result,agreementId,versionId,route))
        throw Error('Quote identity or economics inconsistent');
      setSnapshot(fresh);setQuote(result);
    }catch{
      setQuote(null);
      setQuoteError('Fee quotation could not be verified. No payment was created.');
    }finally{setQuoteBusy(false);}
  };

  const inspectIntent=async(row:AgreementPaymentIntentSummaryResponse)=>{
    if(intentBusy)return;
    setIntentBusy(true);setIntentError('');setSelectedIntent(null);
    try{
      await prepare();
      const result=await payments.get(row.id);
      if(!miniMoneyIntentDetailProof(result,row,agreementId))
        throw Error('Payment attempt changed or belongs to another Agreement');
      setSelectedIntent(result);
    }catch{
      setIntentError('This payment attempt could not be independently verified.');
    }finally{setIntentBusy(false);}
  };

  return <details className="spm-mini-slot" data-mini-money="canonical-agreement-money">
    <summary>Money <small>Agreement record</small></summary>
    <div className="spm-mini-slot-items">
      {state==='loading'&&<p role="status">Checking the Agreement Money record…</p>}
      {state==='error'&&<p role="alert">
        SecurePay cannot verify the Money position for this Agreement.
        No amount, route or payment status can be assumed.
      </p>}
      {state==='ready'&&snapshot&&<div className="spm-mini-agreement-fact">
        <strong>{miniMoneyStatusLabel(snapshot)}</strong>
        <small>Money movement: {snapshot.movement.state==='READY'
          ?'Evaluated, not executed'
          :snapshot.movement.state==='BLOCKED'?'Not authorised':'Unavailable'}</small>
        {snapshot.paymentReady.outstandingReasons?.length>0&&<small>
          {snapshot.paymentReady.outstandingReasons.length} outstanding checks
        </small>}

        <details className="spm-mini-slot">
          <summary>Funding and milestone positions
            <small>{snapshot.positions.length}</small></summary>
          <div className="spm-mini-slot-items">
            {snapshot.positions.length===0&&<small>No authorised funded positions returned.</small>}
            {snapshot.positions.map((position,i)=>
              <div className="spm-mini-agreement-fact" key={position.obligationId||'position-'+i}>
                <strong>{position.obligationTitle||'Agreement obligation'}</strong>
                <small>{position.established?'Funded authority recorded':'No funded authority established'}
                  {position.providerSettlementCertified?' · Settlement certified by provider':''}
                </small>
                {position.currency&&position.fundedTotalMinor!==null&&
                  <small>Recorded funding: {formatMoney(position.fundedTotalMinor,position.currency)}</small>}
                {position.currency&&position.remainingFundedMinor!==null&&
                  <small>Remaining recorded funds: {formatMoney(position.remainingFundedMinor,position.currency)}</small>}
                {position.currency&&position.exercisedOrSettledMinor!==null&&
                  <small>Exercised or settled: {formatMoney(position.exercisedOrSettledMinor,position.currency)}</small>}
              </div>)}
          </div>
        </details>

        <strong>Funding routes from SecurePay</strong>
        {snapshot.fundingOptions.length===0
          ?<small>No funding route is available for this Agreement.</small>
          :snapshot.fundingOptions.map(route=><div key={route.railCode}
            className="spm-mini-owned-item">
            <div>
              <strong>{route.displayName}</strong>
              <small>{route.currency} · {route.quoteAvailable?
                'Fee quotation possible if authorised':'Fee quotation unavailable'}</small>
            </div>
            {quoteReviewEnabled&&route.quoteAvailable&&snapshot.feeQuoteRequestsPermitted&&
              <button type="button" className="spm-secondary"
                disabled={quoteBusy} onClick={()=>{
                  setSelectedRail(route.railCode);setQuote(null);setQuoteError('');
                }}>{selectedRail===route.railCode?'Selected':'Review fees'}</button>}
          </div>)}
        {quoteReviewEnabled&&selectedRail&&snapshot.feeQuoteRequestsPermitted&&
          <button type="button" className="spm-secondary"
            disabled={quoteBusy||state!=='ready'} onClick={()=>void reviewQuote()}>
            {quoteBusy?'Checking fee quotation…':'Request provider fee quote'}
          </button>}
        {quoteError&&<p role="alert" className="spm-error">{quoteError}</p>}
        {quote&&<div className="spm-mini-agreement-fact" role="status">
          <strong>Fee quotation · {quote.economicState==='READY'?'Review only':'Not available'}</strong>
          <small>Principal: {formatMoney(quote.amountMinor,quote.currency)}</small>
          <small>SecurePay charge: {formatMoney(quote.platformChargeMinor,quote.currency)}</small>
          <small>Provider charge: {formatMoney(quote.providerChargeMinor,quote.currency)}</small>
          <small>Quoted total: {formatMoney(quote.totalChargeMinor,quote.currency)}</small>
          <small>Expires: {date(quote.expiresAt)}. No payment intent or transfer has started.</small>
        </div>}
        {paymentCommandsEnabled&&quote&&quote.economicState==='READY'&&
          historyState==='ready'&&!history.some(row=>
            ['CREATED','INITIATION_PENDING','ACTION_REQUIRED',
             'PROVIDER_PENDING','CONFIRMATION_PENDING'].includes(row.status))&&
          <MiniMoneyPaymentFlow key={quote.quoteReference}
            quote={quote} agreementId={agreementId} versionId={versionId}
            payments={payments} prepare={prepare}
            verifyMoney={async()=>{
              // Recheck canonical Agreement/version and the very same rail
              // immediately before each financial command. Failed reads deny.
              try {
                const current=await money.read(agreementId);
                return miniMoneySnapshotProof(current,agreementId,versionId)&&
                  current.feeQuoteRequestsPermitted&&
                  current.fundingOptions.some(option=>
                    option.railCode===quote.railCode&&
                    option.currency===quote.currency&&option.quoteAvailable);
              } catch { return false; }
            }}
            onRecheck={()=>setRefresh(n=>n+1)}/>}
        {paymentCommandsEnabled&&historyState==='ready'&&
          history.some(row=>['CREATED','INITIATION_PENDING','ACTION_REQUIRED',
            'PROVIDER_PENDING','CONFIRMATION_PENDING'].includes(row.status))&&
          <small>An earlier Agreement payment attempt is unresolved.
            Recheck it before preparing any other payment.</small>}
        {!quoteReviewEnabled&&<small>Funding choices are informational here.
          No payment or fee quote is initiated.</small>}
      </div>}

      <details className="spm-mini-slot">
        <summary>Payment attempts <small>Server history</small></summary>
        <div className="spm-mini-slot-items">
          {historyState==='loading'&&<small>Checking attempts…</small>}
          {historyState==='error'&&<small>Payment attempts cannot be verified. Do not retry an unknown attempt.</small>}
          {historyState==='ready'&&history.length===0&&<small>No payment attempts recorded.</small>}
          {history.map(entry=><div className="spm-mini-owned-item" key={entry.id}>
            <div>
              <strong>{formatMoney(entry.amountMinor,entry.currency)}</strong>
              <small>{miniMoneyIntentStatus(entry.status)}</small>
              <small>{date(entry.lastStateChangeAt)}</small>
            </div>
            <button type="button" className="spm-secondary"
              disabled={intentBusy} onClick={()=>void inspectIntent(entry)}>
              Check
            </button>
          </div>)}
          {intentError&&<p role="alert" className="spm-error">{intentError}</p>}
          {selectedIntent&&<div className="spm-mini-agreement-fact" role="status">
            <strong>{miniMoneyIntentStatus(selectedIntent.status)}</strong>
            <small>Provider confirmation accepted:
              {selectedIntent.providerConfirmationAccepted?' Yes':' No'}</small>
            {selectedIntent.conflictDetected&&<small>Conflicting provider status:
              do not retry; seek reconciliation.</small>}
            <small>No receipt or release is inferred from the attempt alone.</small>
          </div>}
        </div>
      </details>

      <button type="button" className="spm-secondary"
        onClick={()=>setRefresh(x=>x+1)}
        disabled={state==='loading'||historyState==='loading'||quoteBusy||intentBusy}>
        <RefreshCcw size={14}/>Recheck Money
      </button>
      <small><ShieldCheck size={13}/> Money follows the Agreement. Funding,
        provider confirmation and release are separate verified events.
        Never retry an unresolved attempt without reconciliation.</small>
    </div>
  </details>;
}
