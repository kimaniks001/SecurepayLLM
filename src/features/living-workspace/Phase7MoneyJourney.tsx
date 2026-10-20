import { useEffect, useState } from 'react';
import { ArrowRight, FileCheck2, Image, Landmark, RefreshCw, ShieldAlert } from 'lucide-react';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type { MoneySnapshotGateway, AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot';
import { moneyText } from '../money/amount';
import { readableMoneyReason, verifyMoneyReviewSnapshot } from './moneyReviewTruth';

const stories = [
  {name:'Purchase',title:'Buying a handmade table',amount:'KES 18,000 proposed',status:'Terms not yet accepted',
    stages:['Clarify the table, supplier and delivery','Compare Bank, M-PESA or PesaLink only if a provider offers an eligible quote','Wait for confirmed funding, not a successful-looking redirect','Check actual receipt and photographs','Release only after the agreed acceptance and backend authority'],
    caution:'A rail illustration is not a financial provider quote or permission to charge.'},
  {name:'Delivery',title:'Chairs delivered to a buyer',amount:'KES 45,000 example principal',status:'Illustrative funded scenario — NOT a real payment',
    stages:['Agree quantity, condition, address and delivery date','Identify the actual funder and the financial institution','Document dispatch with dated, authorised evidence','Buyer inspects and responds to delivery evidence','Only the real release preflight can permit money to move'],
    caution:'A photo, GPS tag or uploaded note cannot independently release funds.'},
  {name:'Milestones',title:'Service paid by accepted stages',amount:'No actual amount committed',status:'Draft service proposal',
    stages:['Agree deliverables and acceptance criteria','Establish milestone prices and fee payer','Provider submits evidence for a stage','Authorised person reviews progress','Backend controls any partial release and remaining funded balance'],
    caution:'Completion is not proved by clicking a stage or asserting the work is done.'},
  {name:'Chama',title:'Eight people contributing monthly',amount:'KES 2,000 proposed per participant',status:'No contributions authorised',
    stages:['Agree purpose, membership and governance','Invite eight people through real identity authority','Obtain each participant’s separate acceptance','Clarify each payer’s charges and obligations','Only then assess whether a funding request is permissible'],
    caution:'Invitation and membership in a Circle do not create payment obligations.'},
  {name:'Community Saver',title:'Buying from two different Stores',amount:'No saving calculated',status:'Coordination under discussion',
    stages:['Count distinct Store identities, not products','Compare separate and combined delivery options','Require a trained or eligible Plug and explicit three-way consent','Verify the economic benefit to buyer, seller and Plug','Make a deliberate Agreement before any Money action'],
    caution:'Never invent cost savings or consent. One Store needs no cross-Store Saver choice.'},
  {name:'Dispute',title:'Delivery contested by the buyer',amount:'Amount subject to actual Agreement',status:'Example dispute — no decision',
    stages:['Buyer records the precise problem','Preserve the relevant photos and documents','Check the actual dispute and Money hold rules','Refer the matter to authorised reviewers','Follow a provider-authorised release or return outcome only'],
    caution:'KS001, a Plug or a Master cannot independently decide a contested payout.'},
  {name:'Uncertain payment',title:'Provider confirmation has not arrived',amount:'Total payable not quoted',status:'Provider outcome unknown',
    stages:['Obtain an Agreement-version-bound quote','Create an intent only through explicit payer authorisation','Mark provider timeout as unknown, never paid','Use the same intent and authorised reconciliation pathway','Wait for settlement evidence before displaying confirmed funding'],
    caution:'Retrying an uncertain operation with a new payment intent can double-charge.'},
] as const;

/** Interactive, wholly local explanation of seven human journeys.
 * No IDs, credentials, agreements, provider requests or financial operations. */
export function Phase7MoneyJourneyPreview() {
  const [story,setStory] = useState(0);
  const [stage,setStage] = useState(0);
  const selected=stories[story];
  const choose=(index:number)=>{setStory(index);setStage(0);};
  return <section data-phase7-money-preview aria-label="Phase 7 Money and fulfilment sample"
      className="space-y-3 rounded-2xl border border-forest-200 bg-white p-3">
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-900">
      Interactive sample only · No real Agreement, provider, price quotation, settlement, booking or payment.</p>
    <h3 className="font-display text-lg text-forest-900">From Agreement to outcome</h3>
    <p className="text-xs text-sand-700">Explore seven examples. Changing a step shows only the explanation, never changes financial state.</p>
    <label className="block text-xs font-medium text-forest-800">Choose a situation
      <select data-phase7-scenario value={story} onChange={e=>choose(Number(e.target.value))}
        className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm">
        {stories.map((item,index)=><option key={item.name} value={index}>{item.name}</option>)}
      </select>
    </label>
    <div className="rounded-xl bg-cream-50 p-3 space-y-2">
      <p className="text-sm font-semibold text-forest-900">{selected.title}</p>
      <p className="text-xs font-semibold text-sand-700">{selected.amount}</p>
      <p className="text-xs text-sand-600">{selected.status}</p>
      <p className="text-xs font-medium text-forest-800">Step {stage+1} of {selected.stages.length}</p>
      <p className="min-h-12 text-sm leading-6 text-forest-900">{selected.stages[stage]}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setStage(n=>Math.max(0,n-1))} disabled={stage===0}
          className="min-h-11 rounded-xl border border-cream-200 bg-white px-3 text-xs disabled:opacity-40">Previous</button>
        <button type="button" onClick={()=>setStage(n=>Math.min(selected.stages.length-1,n+1))}
          disabled={stage===selected.stages.length-1}
          className="min-h-11 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white disabled:opacity-40">
          Next consideration <ArrowRight size={14} className="inline" /></button>
      </div>
    </div>
    <div className="flex items-start gap-2 text-xs text-sand-700">
      <ShieldAlert size={17} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true"/>
      <p>{selected.caution}</p>
    </div>
    <details className="rounded-xl border border-cream-200 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-forest-800">What would I see in a verified Money quote?</summary>
      <div className="mt-2 space-y-2 text-xs leading-5 text-sand-700">
        <p>Named financial institution, eligible rail, Agreement/version, responsible payer, recipient principal,
          actual provider costs, SecurePay charges, total payable, quote validity and confirmed constraints.</p>
        <p>Bank · M-PESA · PesaLink are examples of possible rails, not guarantees of availability.
          No fee or eligibility has been invented in this preview.</p>
      </div>
    </details>
    <p className="flex items-start gap-2 text-xs text-sand-600"><Image size={15} className="mt-0.5 shrink-0"/>
      Evidence may inform review, but photographs and location metadata are not themselves proof of acceptance.</p>
  </section>;
}

/** Real Agreement card reads exactly one current-version backend snapshot, does not
 * sum positions, quote, create payment intent or execute a provider operation. */
export function Phase7MoneySnapshotReview({agreement,gateway,onOpenAgreement,onOpenMoney}:{
  agreement:CurrentUserAgreementSummaryResponse;gateway?:MoneySnapshotGateway;
  onOpenAgreement:()=>void;onOpenMoney:()=>void;
}) {
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [snapshot,setSnapshot]=useState<AgreementMoneySnapshotResponse|null>(null);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let alive=true;
    setState('loading');setSnapshot(null);
    if(!gateway){setState('error');return;}
    void gateway.read(agreement.agreementId)
      .then(result=>{if(alive){setSnapshot(result);setState('ready');}})
      .catch(()=>{if(alive){setSnapshot(null);setState('error');}});
    return()=>{alive=false;};
  },[agreement.agreementId,agreement.currentAgreementVersionId,gateway,refresh]);
  const truth=snapshot?verifyMoneyReviewSnapshot(agreement.agreementId,agreement.currentAgreementVersionId,snapshot):null;
  return <section data-phase7-live-money aria-label="Authoritative Agreement Money"
      className="space-y-3 rounded-2xl border border-forest-200 bg-white p-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-display text-lg text-forest-900">Money at a glance</h3>
      <button type="button" onClick={()=>setRefresh(n=>n+1)} aria-label="Refresh Money from SecurePay"
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cream-200 px-3 text-xs"><RefreshCw size={14}/> Refresh</button>
    </div>
    <p className="text-sm font-semibold">{agreement.title}</p>
    {state==='loading'&&<p role="status" className="text-xs">Checking this Agreement's current-version Money with SecurePay…</p>}
    {state==='error'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">
      SecurePay has not confirmed this Agreement's Money snapshot. No amounts or payment eligibility can be inferred.</p>}
    {state==='ready'&&truth?.kind==='unavailable'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">{truth.reason}</p>}
    {state==='ready'&&truth?.kind==='ready'&&<>
      {truth.snapshot.positions.length===0?<p className="text-xs text-sand-600">
        No authoritative funded positions were returned. This does not establish that funding is unnecessary.</p>:
        truth.snapshot.positions.map(position=><div key={position.obligationId}
          className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-2">
          <p className="text-xs font-semibold">{position.obligationTitle||'Agreement obligation'}</p>
          <p className="text-xs text-sand-600">{position.established?'Established position':'Not established · proposed only'}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div><dt className="text-sand-600">Authorised maximum</dt><dd className="font-semibold">{moneyText(position.authorisedMaxAmountMinor,position.currency)}</dd></div>
            <div><dt className="text-sand-600">Funded</dt><dd className="font-semibold">{moneyText(position.fundedTotalMinor,position.currency)}</dd></div>
            <div><dt className="text-sand-600">Progressed</dt><dd className="font-semibold">{moneyText(position.exercisedOrSettledMinor,position.currency)}</dd></div>
            <div><dt className="text-sand-600">Released</dt><dd className="font-semibold">{moneyText(position.releasedTotalMinor,position.currency)}</dd></div>
            <div><dt className="text-sand-600">Remaining funded</dt><dd className="font-semibold">{moneyText(position.remainingFundedMinor,position.currency)}</dd></div>
            <div><dt className="text-sand-600">Provider settlement</dt><dd className="font-semibold">{position.providerSettlementCertified?'Certified':'Not certified'}</dd></div>
          </dl>
        </div>)}
      <div className="rounded-xl bg-cream-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-forest-900">Can money move now?</p>
        <p className="text-sm font-semibold">{truth.snapshot.movement.state==='READY'&&truth.canMove?
          'Backend read-only preflight: READY':'Not confirmed as movable'}</p>
        <p className="text-xs leading-5 text-sand-700">
          {truth.snapshot.movement.state==='READY'&&truth.canMove?
          'This is a read-only assessment, not a transfer or final authorisation. Review the actual Money operation separately.':
          readableMoneyReason(truth.snapshot.movement.reasonCode)}</p>
        <p className="text-xs text-sand-600">Payment Ready: {truth.snapshot.paymentReady.state==='EVALUATED'?
          truth.snapshot.paymentReady.ready?'Evaluated ready':'Evaluated with outstanding conditions':
          'Not evaluated for an unambiguous current scope'}</p>
        {truth.snapshot.paymentReady.outstandingReasons.length>0&&
          <p className="text-xs text-sand-600">Outstanding financial conditions: {truth.snapshot.paymentReady.outstandingReasons.length} · Open Money for details.</p>}
      </div>
      <div className="rounded-xl border border-cream-200 p-3 space-y-2">
        <p className="text-xs font-semibold">Available funding pathways</p>
        {truth.snapshot.fundingOptions.length===0?<p className="text-xs text-sand-600">No eligible rail was returned for this Agreement.</p>:
          truth.snapshot.fundingOptions.map(rail=><p key={rail.railCode} className="flex justify-between gap-3 text-xs">
            <span>{rail.displayName} · {rail.currency}</span>
            <span>{rail.quoteAvailable&&truth.canQuote?'Quote review available':'Not available to quote'}</span>
          </p>)}
        <p className="text-xs text-sand-600">No provider charges or total payable are shown until SecurePay supplies a version-bound quotation.</p>
      </div>
    </>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onOpenAgreement} className="min-h-11 rounded-xl border border-forest-200 px-3 text-xs font-semibold">
        <FileCheck2 size={14} className="mr-1 inline"/> Review Agreement</button>
      <button type="button" onClick={onOpenMoney} className="min-h-11 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">
        <Landmark size={14} className="mr-1 inline"/> Open authoritative Money</button>
    </div>
    <p className="text-xs text-sand-600">This card does not request a quote, create a payment intent, transfer, release, return or resolve a dispute.</p>
  </section>;
}
