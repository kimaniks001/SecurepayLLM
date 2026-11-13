import { useRef, useState } from 'react';
import { ArrowRight, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { AgreementGateway } from '../api/securepay/agreements';
import {
  boundDraftProof, quotedRecordProof, quoteReviewProof,
  type QuoteBoundAgreementDraft, type QuoteObligationPlan, type QuoteReview,
  type SellerQuoteRecord, type StoreQuotationGateway,
} from '../api/securepay/store-quotations';

const referencePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money = (minor:number,currency:string) => `${currency} ${(minor/100).toFixed(2)}`;

/**
 * M5C customer-facing review INSIDE My Agreements, not a separate checkout
 * and not a second KS001 instance. Nothing automatically sends, signs, pays,
 * reserves inventory or treats an invitation as seller acceptance.
 *
 * All live routes are authenticated SecurePayAPI, never synthetic UI state.
 * Demo hides this component because its API has no authoritative quote store.
 */
export function MiniQuoteBuyer({quotationGateway,agreementGateway,prepare,onCreated}:{
  quotationGateway:StoreQuotationGateway;
  agreementGateway:Pick<AgreementGateway,'propose'|'confirmVersion'>;
  prepare:()=>Promise<unknown>;
  onCreated:()=>void;
}) {
  const [reference,setReference]=useState('');
  const [quote,setQuote]=useState<SellerQuoteRecord|null>(null);
  const [draft,setDraft]=useState<QuoteBoundAgreementDraft|null>(null);
  const [review,setReview]=useState<QuoteReview|null>(null);
  const [plan,setPlan]=useState<QuoteObligationPlan|null>(null);
  const [proposed,setProposed]=useState(false);
  const [invited,setInvited]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const keys=useRef<Record<string,string>>({});

  const key=(action:string,ref:string)=>{
    const id=`${action}:${ref}`;
    if(!keys.current[id])keys.current[id]=`mini-m5c-${crypto.randomUUID()}`;
    return keys.current[id];
  };

  const inspect=async()=>{
    const id=reference.trim().toLowerCase();
    if(!referencePattern.test(id)){
      setError('Enter the exact quotation reference provided by the seller.');return;
    }
    setBusy(true);setError('');setNotice('');
    setQuote(null);setDraft(null);setReview(null);setPlan(null);
    setProposed(false);setInvited(false);
    try {
      await prepare();
      const result=await quotationGateway.read(id);
      if(!quotedRecordProof(result,id))throw Error('Invalid quote source');
      setQuote(result);
      if(!result.sourceCurrent||new Date(result.expiresAt).getTime()<=Date.now())
        setNotice('The seller quotation is stale or expired. Ask the seller to issue a new one.');
    }catch{
      setError('The quotation could not be verified for this signed-in KS Number. No Agreement was created.');
    }finally{setBusy(false);}
  };

  const createDraft=async()=>{
    if(!quote||busy||!quote.sourceCurrent||new Date(quote.expiresAt).getTime()<=Date.now())return;
    setBusy(true);setError('');setNotice('');
    try {
      await prepare();
      // Re-read, not just a cached client snapshot.
      const fresh=await quotationGateway.read(quote.id);
      if(!quotedRecordProof(fresh,quote.id)||!fresh.sourceCurrent||
         fresh.offerUpdatedAt!==quote.offerUpdatedAt ||
         fresh.totalMinor!==quote.totalMinor ||
         new Date(fresh.expiresAt).getTime()<=Date.now())
        throw Error('Stale quotation');
      const created=await quotationGateway.createDraft(
        quote.id,key('draft',quote.id));
      if(!boundDraftProof(created,quote.id))throw Error('Version proof mismatch');
      setDraft(created);
      setProposed(created.agreementStatus!=='DRAFT');
      setNotice(created.replayed
        ? 'SecurePay returned your original quote-bound Agreement. No second Agreement was created.'
        : 'Agreement draft created from the recorded quotation. Neither party has confirmed it.');
      onCreated();
    }catch{
      setError('SecurePay could not certify an Agreement draft. A request may already have succeeded; recheck My Agreements before trying again.');
    }finally{setBusy(false);}
  };

  const propose=async()=>{
    if(!draft||busy||proposed)return;
    setBusy(true);setError('');setNotice('');
    try{
      await prepare();
      const result=await agreementGateway.propose(draft.agreementId);
      if(result.id!==draft.agreementId||result.status!=='PROPOSED')
        throw Error('Proposal state mismatch');
      setProposed(true);
      setNotice('Proposal recorded. The original seller has not been invited or confirmed yet.');
      onCreated();
    }catch{
      setError('The proposal was not verified. Review the current Agreement before retrying.');
    }finally{setBusy(false);}
  };

  const refresh=async()=>{
    if(!draft||busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      await prepare();
      const value=await quotationGateway.review(draft.agreementId);
      if(!quoteReviewProof(value,draft.agreementId,draft.boundVersionId,
        draft.boundContentHash) || value.quotationId!==draft.quotationId)
        throw Error('Review proof mismatch');
      setReview(value);
      setProposed(value.agreementStatus!=='DRAFT');
      setInvited(value.sellerInvitationIssued);
    }catch{
      setReview(null);
      setError('The two-person, version-bound review could not be verified. No action is authorized.');
    }finally{setBusy(false);}
  };

  const invite=async()=>{
    if(!draft||!proposed||busy||invited)return;
    setBusy(true);setError('');setNotice('');
    try {
      await prepare();
      const result=await quotationGateway.inviteOriginalSeller(draft.agreementId,
        draft.boundVersionId,draft.boundContentHash,
        key('seller-invitation',draft.agreementId));
      if(!referencePattern.test(result.invitationId)||
         !['KS_NUMBER','IDENTITY'].includes(result.targetKind||''))
        throw Error('Unverified seller invitation');
      setInvited(true);
      setReview(null);
      setNotice('Invitation recorded for the original seller. They must independently join and confirm this exact Agreement version.');
    }catch{
      setError('Seller invitation could not be verified. The request may have succeeded; recheck the Agreement before retrying.');
    }finally{setBusy(false);}
  };

  const confirmBuyer=async()=>{
    if(!draft||!review||!review.sellerJoined||
      !review.versionCurrent||review.buyerConfirmedCurrent||busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      await prepare();
      // This is the buyer's OWN explicit action. The canonical Agreement
      // confirmation controller independently enforces auth and version/hash.
      await agreementGateway.confirmVersion(draft.agreementId,draft.boundVersionId,{
        idempotencyKey:key('buyer-confirm',draft.agreementId),
        expectedVersionNumber:draft.boundVersionNumber,
        expectedContentHash:draft.boundContentHash,
      });
      setReview(null);
      setNotice('Your confirmation was submitted. Recheck both independent confirmations; this is not Payment Ready.');
    }catch{
      setReview(null);
      setError('Your independent confirmation was not verified. Recheck the current Agreement version before retrying.');
    }finally{setBusy(false);}
  };

  const stage=async()=>{
    if(!draft||!review||!review.confirmationsComplete||!review.versionCurrent||
      !review.sourceCurrent||!review.originalSellerStillAuthorized||
      !review.participantsUnambiguous||busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      await prepare();
      const result=await quotationGateway.stageNonExecutablePlan(
        draft.agreementId,draft.boundVersionId,draft.boundContentHash,
        key('obligation-plan',draft.agreementId));
      if(result.agreementId!==draft.agreementId ||
        result.versionId!==draft.boundVersionId ||
        result.versionHash!==draft.boundContentHash ||
        result.state!=='STAGED_NON_EXECUTABLE' ||
        result.executable!==false||result.paymentEnabled!==false)
        throw Error('Non-financial plan proof mismatch');
      setPlan(result);
      setNotice('The purchase and delivery responsibilities are recorded as a non-executable plan. No Money, delivery booking or stock reservation.');
    }catch{
      setError('The non-executable plan could not be verified. Recheck the Agreement; no payment has been authorized.');
    }finally{setBusy(false);}
  };

  return <details className="spm-mini-slot" data-m5c-quote-buyer="real-api-only">
    <summary><ShieldCheck size={16}/>Review a seller quotation <ArrowRight size={15}/></summary>
    <div className="spm-mini-slot-items">
      <p>Ask the seller for the quotation reference. SecurePay verifies that it was addressed to your signed-in KS Number. Reviewing is not accepting.</p>
      <label className="spm-label" htmlFor="m5c-quote-ref">Seller quotation reference</label>
      <input id="m5c-quote-ref" className="spm-field"
        value={reference} maxLength={36} placeholder="Quotation UUID"
        autoComplete="off" onChange={e=>{
          setReference(e.target.value);setQuote(null);setDraft(null);
          setReview(null);setPlan(null);setError('');setNotice('');
          setInvited(false);setProposed(false);
        }}/>
      <button type="button" className="spm-secondary" disabled={busy}
        onClick={()=>void inspect()}>{busy?'Checking…':'Review quotation'}</button>
      {quote&&<section className="spm-mini-agreement-fact" aria-label="Verified seller quotation">
        <strong>{quote.offerTitle}</strong>
        <small>From {quote.sellerKsNumber} for {quote.buyerKsNumber}</small>
        <p>{quote.quantity} × {money(quote.unitPriceMinor,quote.currency)} =
          {' '}{money(quote.totalMinor,quote.currency)}</p>
        <p>{quote.deliveryBy==='BUYER'?'Collection':'Delivery'} to {quote.deliveryPlace}
          {' '}on {quote.deliveryDate}; transport by {quote.deliveryBy.toLowerCase().replace('_',' ')}.</p>
        {quote.conditions&&<p>Conditions: {quote.conditions}</p>}
        <small>Seller quotation expires {quote.expiresAt.slice(0,10)}.
          Listing {quote.sourceCurrent?'currently matches its quote source':'has changed'}.</small>
        {!draft && <button type="button" className="spm-secondary"
          disabled={busy||!quote.sourceCurrent||new Date(quote.expiresAt).getTime()<=Date.now()}
          onClick={()=>void createDraft()}>
          Create my Agreement draft <ArrowRight size={14}/>
        </button>}
      </section>}
      {draft&&<section className="spm-mini-agreement-fact">
        <strong>Agreement {draft.agreementId.slice(0,8)} · Version {draft.boundVersionNumber}</strong>
        <small>SecurePay recorded the quotation in this exact Agreement version. No one has been automatically confirmed.</small>
        {!proposed&&<button className="spm-secondary" type="button" disabled={busy}
          onClick={()=>void propose()}>Propose Agreement for review</button>}
        {proposed&&!invited&&<button className="spm-secondary" type="button" disabled={busy}
          onClick={()=>void invite()}>Invite the original seller</button>}
        <button className="spm-quiet-button" type="button" disabled={busy}
          onClick={()=>void refresh()}><RefreshCcw size={14}/>Recheck both people's status</button>
        {review&&<>
          <small>SecurePay status: {review.agreementStatus} · {review.nextAction.replaceAll('_',' ').toLowerCase()}</small>
          <small>Seller joined: {review.sellerJoined?'Yes':'Not yet'} · Buyer confirmed: {review.buyerConfirmedCurrent?'Yes':'No'} · Seller confirmed: {review.sellerConfirmedCurrent?'Yes':'No'}</small>
          {!review.buyerConfirmedCurrent&&review.sellerJoined&&review.versionCurrent&&
            <button type="button" className="spm-secondary" disabled={busy}
              onClick={()=>void confirmBuyer()}>
              Confirm this exact Agreement version as buyer
            </button>}
          {review.confirmationsComplete&&!plan&&
            <button type="button" className="spm-secondary" disabled={busy}
              onClick={()=>void stage()}>
              Record agreed responsibilities (no payment)
            </button>}
        </>}
        {plan&&<div role="status">
          <strong>Responsibilities recorded — not executable</strong>
          <p>{plan.sellerSupplyDescription}</p>
          <small>Proposed buyer payment {money(plan.buyerPaymentMinor,plan.currency)}.
            No payment, settlement, delivery booking or stock reservation.</small>
        </div>}
      </section>}
      {error&&<p role="alert" className="spm-error">{error}</p>}
      {notice&&<p role="status" className="spm-mini-owned-note">{notice}</p>}
      <small>Every decision is separate. The seller must join and confirm using their own invitations and Agreement controls. No escrow or payment is activated.</small>
    </div>
  </details>;
}
