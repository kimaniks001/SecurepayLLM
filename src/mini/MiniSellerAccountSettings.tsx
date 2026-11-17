import {useEffect,useState} from 'react';
import {CreditCard,ShieldCheck,Store,UsersRound} from 'lucide-react';
import type {BusinessGateway} from '../api/securepay/business';
import type {StoreGateway} from '../api/securepay/store';
import type {StoreOfferResponse} from '../api/securepay/store/dto';
import type {AuthorizationGateway} from '../api/securepay/authorization';
import {MiniSellerTeamAccess} from './MiniSellerTeamAccess';
import {MiniSellerVisibilityControls} from './MiniSellerVisibilityControls';
import type {SubscriptionGateway,SubscriptionStatusResponse,SubscriptionPlan} from '../api/securepay/subscription';
import {ApiError} from '../api/securepay/http';
import type {MiniBusinessPreferencesGateway} from '../api/securepay/mini-business-preferences';
import {MiniSellerBusinessOptIns} from './MiniSellerBusinessOptIns';

type Props={
  businessKsNumber:string|null;
  businessName:string|null;
  businessGateway:Pick<BusinessGateway,'representation'|'get'|'members'>;
  authorizationGateway?:Pick<AuthorizationGateway,'authoritySummary'>;
  storeGateway?:Pick<StoreGateway,'myOffers'|'businessOffers'|'makeMyOfferPrivate'|'makeBusinessOfferPrivate'>;
  offers?:StoreOfferResponse[];
  onRefreshOffers?:()=>Promise<void>;
  subscriptionGateway?:Pick<SubscriptionGateway,'myStatus'|'selectPlan'>;
  preferencesGateway?:MiniBusinessPreferencesGateway;
  prepare:()=>Promise<unknown>;
  publicOffers:number;
  privateOffers:number;
  unconfirmedOffers:number;
};

/**
 * First-party Mini seller settings. Auth facts come from the existing
 * Business representation and personal subscription read gateways, NOT
 * from the fictional Mini Business Settings demo.
 * Opening settings only READS. Never selects a plan, invites anyone, grants
 * Business Agreement authority, initiates Money or publishes stock.
 */
export function MiniSellerAccountSettings({
  businessKsNumber,businessName,businessGateway,authorizationGateway,storeGateway,preferencesGateway,
  offers,onRefreshOffers,subscriptionGateway,prepare,
  publicOffers,privateOffers,unconfirmedOffers
}:Props){
  const [representation,setRepresentation]=useState<'personal'|'checking'|'verified'|'unavailable'>(
    businessKsNumber?'checking':'personal'
  );
  const [membership,setMembership]=useState<SubscriptionStatusResponse|null>(null);
  const [memberState,setMemberState]=useState<'checking'|'ready'|'none'|'unavailable'>('checking');
  const [chosenPlan,setChosenPlan]=useState<SubscriptionPlan|null>(null);
  const [planBusy,setPlanBusy]=useState(false);
  const [planMessage,setPlanMessage]=useState('');
  useEffect(()=>{
    let alive=true;
    setRepresentation(businessKsNumber?'checking':'personal');
    setMemberState('checking');
    setMembership(null);
    const read=async()=>{
      try{
        await prepare();
        if(businessKsNumber){
          const b=await businessGateway.representation(businessKsNumber);
          if(alive)setRepresentation(b.businessKsNumber===businessKsNumber&&
            b.identityType==='BUSINESS'&&b.canActFor&&b.relationship==='ADMINISTRATOR'
            ?'verified':'unavailable');
        }
      }catch{if(alive&&businessKsNumber)setRepresentation('unavailable');}
      if(!subscriptionGateway){if(alive)setMemberState('unavailable');return;}
      try{
        await prepare();
        const status=await subscriptionGateway.myStatus();
        if(!status || !['FOR_YOU','BUSINESS'].includes(status.plan) ||
           !Number.isSafeInteger(status.monthlyFeeMinor) ||
           status.monthlyFeeMinor<0)throw new Error('Unsupported membership response');
        if(alive){setMembership(status);setMemberState('ready');}
      }catch(error){
        if(alive)setMemberState(error instanceof ApiError &&
          error.kind==='http' && error.status===404 && error.code==='NO_SUBSCRIPTION'
            ?'none':'unavailable');
      }
    };
    void read();
    return()=>{alive=false;};
    // The parent auth refresh callback is short lived, not a settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[businessKsNumber,businessGateway,subscriptionGateway]);
  // This is the signed-in PERSON's plan, not a particular Business KS's
  // entitlement. Backend open() does not switch an existing plan.
  const selectPlan=async()=>{
    if(!chosenPlan||planBusy||memberState!=='none'||!subscriptionGateway)return;
    setPlanBusy(true);setPlanMessage('');
    try{
      await prepare();
      // A second server read prevents a stale no-subscription screen from
      // trying to reselect an already-opened plan.
      try{
        const present=await subscriptionGateway.myStatus();
        if(present){setMembership(present);setMemberState('ready');
          throw new Error('Subscription appeared since review');}
      }catch(e){
        if(!(e instanceof ApiError&&e.kind==='http'&&
          e.status===404&&e.code==='NO_SUBSCRIPTION'))throw e;
      }
      const opened=await subscriptionGateway.selectPlan(chosenPlan);
      if(opened.plan!==chosenPlan||!opened.subscriptionId||
         !Number.isSafeInteger(opened.monthlyFeeMinor))
        throw new Error('Subscription response mismatched plan');
      // Recheck the same account before showing any recorded status. This
      // does NOT establish an activation Agreement or prepare a payment intent.
      const current=await subscriptionGateway.myStatus();
      if(current.subscriptionId!==opened.subscriptionId||current.plan!==chosenPlan)
        throw new Error('New subscription not verified');
      setMembership(current);setMemberState('ready');
      setChosenPlan(null);
      setPlanMessage('Your personal KSNumber plan was recorded as pending. Review its activation Agreement and billing terms separately; no payment has been authorized.');
    }catch{
      setChosenPlan(null);setMemberState('unavailable');
      setPlanMessage('We could not confirm the plan outcome. Check your account before choosing again; no automatic retry or Money step was made.');
    }finally{setPlanBusy(false);}
  };
  const fee=membership?.currency&&Number.isSafeInteger(membership.monthlyFeeMinor)
    ?membership.currency+' '+(membership.monthlyFeeMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})
    :null;
  const humanStatus=(text:string)=>text.toLowerCase().replace(/_/g,' ').replace(/^\w/,(x:string)=>x.toUpperCase());
  return <section className="spm-mini-seller-settings" aria-label="Verified seller settings" data-mini-seller-settings="server-read-only">
    <strong className="spm-sell-link-actions-head"><Store size={17}/> Store settings</strong>
    <p className="spm-sell-hint">These are the Store and account facts SecurePay can check now. Nothing changes just by opening settings.</p>
    <div className="spm-sell-review-card">
      <strong>{businessKsNumber?businessName||businessKsNumber:'My personal Store'}</strong>
      <small><Store size={13}/> {publicOffers} public listing{publicOffers===1?'':'s'} · {privateOffers} private draft{privateOffers===1?'':'s'}</small>
      <small><ShieldCheck size={13}/> {unconfirmedOffers} offer{unconfirmedOffers===1?'':'s'} awaiting availability confirmation</small>
    </div>
    <div className="spm-sell-review-card">
      <strong><UsersRound size={15}/> Who can act?</strong>
      {representation==='personal'&&<p>You're viewing your personal Store. Only your authenticated account can request changes.</p>}
      {representation==='checking'&&<p role="status">Checking Business authority…</p>}
      {representation==='verified'&&<p>SecurePay confirms your administrator representation for this Business Store. Every change is checked again by the server.</p>}
      {representation==='unavailable'&&<p role="alert">Business representation could not be verified. Do not rely on this Store's editing permissions until authority is rechecked.</p>}
      {businessKsNumber&&<small>Managing a Business Store does not authorize you to accept, sign or fund an Agreement in the Business's name. Business Agreements require their own verified authority.</small>}
    </div>
    {(representation==='personal'||representation==='verified')&&storeGateway&&
      offers&&onRefreshOffers&&<MiniSellerVisibilityControls
        key={businessKsNumber??'personal'}
        offers={offers}
        businessKsNumber={businessKsNumber}
        storeGateway={storeGateway}
        businessGateway={businessGateway}
        prepare={prepare}
        onRefresh={onRefreshOffers}
      />}
    {representation==='verified'&&businessKsNumber&&authorizationGateway&&
      <MiniSellerTeamAccess
        businessKsNumber={businessKsNumber}
        verifiedRepresentation
        businessGateway={businessGateway}
        authorizationGateway={authorizationGateway}
        prepare={prepare}
      />}
    {representation==='verified'&&businessKsNumber&&preferencesGateway&&
      <MiniSellerBusinessOptIns
        businessKsNumber={businessKsNumber}
        businessGateway={businessGateway}
        preferencesGateway={preferencesGateway}
        prepare={prepare}
      />}
    <div className="spm-sell-review-card">
      <strong><CreditCard size={15}/> Account membership</strong>
      {memberState==='checking'&&<p role="status">Checking your account plan…</p>}
      {memberState==='unavailable'&&<p role="status">Membership status is unavailable. SecurePay cannot assume a plan or begin any payment.</p>}
      {memberState==='none'&&<>
        <p>No plan is recorded for this signed-in KSNumber.</p>
        <small>Choose only after reviewing. This opens a PENDING personal-account subscription, not Business-specific billing or Money.</small>
        <div className="spm-sell-pill-row">
          <button type="button" className="spm-secondary" disabled={planBusy}
            onClick={()=>setChosenPlan('FOR_YOU')}>For You · personal use</button>
          <button type="button" className="spm-secondary" disabled={planBusy}
            onClick={()=>setChosenPlan('BUSINESS')}>For Business · account plan</button>
        </div>
      </>}
      {memberState==='none'&&chosenPlan&&<div className="spm-sell-visibility-confirm">
        <strong>Open {chosenPlan==='FOR_YOU'?'For You':'For Business'} plan?</strong>
        <p>This is the first plan for your personal KSNumber. It cannot be switched by repeating this selection. You must still review and confirm an activation Agreement separately, and only then choose whether to initiate Money.</p>
        <div className="spm-sell-pill-row">
          <button type="button" className="spm-secondary" disabled={planBusy}
            onClick={()=>setChosenPlan(null)}>Not now</button>
          <button type="button" className="spm-secondary" disabled={planBusy}
            onClick={()=>void selectPlan()}>{planBusy?'Checking…':'Yes, open pending plan'}</button>
        </div>
      </div>}
      {planMessage&&<p role="status" className="spm-sell-hint">{planMessage}</p>}
      {memberState==='ready'&&membership&&<>
        <p>{membership.plan==='FOR_YOU'?'SecurePay for You':'SecurePay for Business'} — {humanStatus(membership.status)}</p>
        {fee&&<small>Server-reported monthly fee: {fee}</small>}
      </>}
      <small>Plans belong to the signed-in KSNumber; this is not proof of Business-specific billing. Selecting a plan creates no payment authorization or funding. An existing plan cannot be changed by selecting another.</small>
    </div>
    <p className="spm-sell-hint">Business directory and eTIMS setup requests are optional and version-confirmed; neither is an actual external connection, publicity permission, or tax invoice.</p>
  </section>;
}
