import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { AgreementGateway } from '../api/securepay/agreements';
import { MiniQuoteSchedulePreview } from './MiniQuoteSchedulePreview';
import {
  parseNotificationActionKey,
  type NotificationEvent, type NotificationsGateway,
} from '../api/securepay/notifications';
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
export function MiniQuoteBuyer({quotationGateway,agreementGateway,notificationGateway,prepare,onCreated}:{
  quotationGateway:StoreQuotationGateway;
  agreementGateway:Pick<AgreementGateway,'propose'|'confirmVersion'>;
  notificationGateway:Pick<NotificationsGateway,'list'|'markRead'>;
  prepare:()=>Promise<unknown>;
  onCreated:()=>void;
}) {
  const [reference,setReference]=useState('');
  const [received,setReceived]=useState<SellerQuoteRecord[]>([]);
  const [receivedStatus,setReceivedStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [receivedBusy,setReceivedBusy]=useState(false);
  const [quoteAlerts,setQuoteAlerts]=useState<NotificationEvent[]>([]);
  const [alertsStatus,setAlertsStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [alertsBusy,setAlertsBusy]=useState(false);
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

  const loadReceived=async()=>{
    setReceivedBusy(true);setReceivedStatus('loading');
    try {
      await prepare();
      const items=await quotationGateway.received(10);
      if(!Array.isArray(items)||items.length>10||
         !items.every(item=>quotedRecordProof(item)))
        throw Error('Invalid received quotation list');
      setReceived(items);
      setReceivedStatus('ready');
    }catch{
      setReceived([]);setReceivedStatus('error');
    }finally{setReceivedBusy(false);}
  };
  /**
   * Only canonical buyer-self notifications, never public notifications.
   * The action is a typed navigation hint; the quotation GET separately
   * authorizes this exact authenticated buyer. Notification text and links
   * are NOT trusted as quotation terms or acceptance.
   */
  const loadQuoteAlerts=async()=>{
    setAlertsBusy(true);setAlertsStatus('loading');
    try {
      await prepare();
      const received=await notificationGateway.list({
        category:'AGREEMENTS',unreadOnly:true,page:0,size:20,
      });
      if(!Array.isArray(received)||received.length>20)
        throw Error('Invalid private notification list');
      setQuoteAlerts(received.filter(event=>
        event.category==='AGREEMENTS' &&
        parseNotificationActionKey(event.actionKey)==='OPEN_STORE' &&
        typeof event.actionObjectReference==='string' &&
        referencePattern.test(event.actionObjectReference) &&
        event.eventKey===`store.quotation_created:${event.actionObjectReference}` &&
        !event.readAt &&
        !event.resolvedAt));
      setAlertsStatus('ready');
    }catch{
      setQuoteAlerts([]);setAlertsStatus('error');
    }finally{setAlertsBusy(false);}
  };

  useEffect(()=>{
    // The gateway is bound to the signed-in first-party session.
    // Refreshing or switching accounts never retains a previous buyer's list.
    void loadReceived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[quotationGateway]);
  useEffect(()=>{
    void loadQuoteAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[notificationGateway]);

  const inspectId=async(requestedId:string,notificationId?:string)=>{
    const id=requestedId.trim().toLowerCase();
    setReference(id);
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
      // Read status is not consent. Do not block the quote when optional
      // notification acknowledgement is unavailable.
      if(notificationId) {
        try {
          await notificationGateway.markRead(notificationId);
          setQuoteAlerts(current=>current.filter(n=>n.id!==notificationId));
        }catch{/* The authenticated quote GET succeeded; no mutation follows. */}
      }
      if(!result.sourceCurrent||new Date(result.expiresAt).getTime()<=Date.now())
        setNotice('The seller quotation is stale or expired. Ask the seller to issue a new one.');
    }catch{
      setError('The quotation could not be verified for this signed-in KS Number. No Agreement was created.');
    }finally{setBusy(false);}
  };

  const inspect=()=>inspectId(reference);

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
      setInvited(['INVITATION_PENDING','PARTICIPANTS_JOINING',
        'CONFIRMATION_PENDING'].includes(created.agreementStatus));
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
      <p>SecurePay shows recent quotations addressed to your signed-in KS Number. Opening one is not an acceptance.</p>
      <div className="spm-mini-agreement-fact" data-m5e="private-quotation-alerts">
        <strong>New quotations</strong>
        {alertsStatus==='loading'&&<small role="status">Checking your notifications…</small>}
        {alertsStatus==='error'&&<small role="status">
          Notifications are unavailable; you can still review quotations below.
        </small>}
        {alertsStatus==='ready'&&quoteAlerts.length===0&&
          <small>No new unread quotation notifications.</small>}
        {alertsStatus==='ready'&&quoteAlerts.map(alert=>
          <div className="spm-mini-owned-item" key={alert.id}>
            <div>
              <strong>Seller quotation awaiting your review</strong>
              <small>{new Date(alert.createdAt).toLocaleDateString('en-KE',
                {day:'numeric',month:'short',year:'numeric'})}</small>
              <small>A notification is not an accepted order.</small>
            </div>
            <button className="spm-secondary" type="button" disabled={busy||alertsBusy}
              onClick={()=>void inspectId(alert.actionObjectReference!,alert.id)}>
              Review <ArrowRight size={14}/>
            </button>
          </div>)}
        <button type="button" className="spm-quiet-button"
          onClick={()=>void loadQuoteAlerts()} disabled={busy||alertsBusy}>
          <RefreshCcw size={14}/>Refresh new quotations
        </button>
      </div>
      <div className="spm-mini-agreement-fact" data-m5d="buyer-private-inbox">
        <strong>Quotations for me</strong>
        <small>Only your 10 most recent server-recorded seller proposals</small>
        {receivedStatus==='loading'&&<p role="status">Checking your private quotations…</p>}
        {receivedStatus==='error'&&<p role="alert">
          Your quotations cannot be verified right now. Nothing has been approved.
        </p>}
        {receivedStatus==='ready'&&received.length===0&&<p>
          No quotations addressed to your account were returned.
        </p>}
        {receivedStatus==='ready'&&received.map(item=>{
          const current=item.sourceCurrent&&new Date(item.expiresAt).getTime()>Date.now();
          return <div key={item.id} className="spm-mini-owned-item">
            <div>
              <strong>{item.offerTitle}</strong>
              <small>{item.sellerKsNumber} · {item.quantity} × {money(item.unitPriceMinor,item.currency)}
                {' = '}{money(item.totalMinor,item.currency)}</small>
              <small>For {item.deliveryDate} · {current?'Proposal available for review':'Source changed or proposal expired'}</small>
            </div>
            <button type="button" className="spm-secondary" disabled={busy}
              onClick={()=>void inspectId(item.id)}>Review <ArrowRight size={14}/></button>
          </div>;
        })}
        <button type="button" className="spm-quiet-button"
          onClick={()=>void loadReceived()} disabled={receivedBusy||busy}>
          <RefreshCcw size={14}/>{receivedBusy?'Checking…':'Refresh my quotations'}
        </button>
      </div>
      <p>You can also enter a reference shared privately by the seller.</p>
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
          <small>SecurePay status: {review.agreementStatus} · {review.nextAction.split('_').join(' ').toLowerCase()}</small>
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
          <MiniQuoteSchedulePreview key={plan.planId} plan={plan}
            quotationGateway={quotationGateway} prepare={prepare}/>
        </div>}
      </section>}
      {error&&<p role="alert" className="spm-error">{error}</p>}
      {notice&&<p role="status" className="spm-mini-owned-note">{notice}</p>}
      <small>Every decision is separate. The seller must join and confirm using their own invitations and Agreement controls. No escrow or payment is activated.</small>
    </div>
  </details>;
}
