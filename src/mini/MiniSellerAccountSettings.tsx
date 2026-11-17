import {useEffect,useState} from 'react';
import {CreditCard,ShieldCheck,Store,UsersRound} from 'lucide-react';
import type {BusinessGateway} from '../api/securepay/business';
import type {SubscriptionGateway,SubscriptionStatusResponse} from '../api/securepay/subscription';

type Props={
  businessKsNumber:string|null;
  businessName:string|null;
  businessGateway:Pick<BusinessGateway,'representation'>;
  subscriptionGateway?:Pick<SubscriptionGateway,'myStatus'>;
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
  businessKsNumber,businessName,businessGateway,subscriptionGateway,prepare,
  publicOffers,privateOffers,unconfirmedOffers
}:Props){
  const [representation,setRepresentation]=useState<'personal'|'checking'|'verified'|'unavailable'>(
    businessKsNumber?'checking':'personal'
  );
  const [membership,setMembership]=useState<SubscriptionStatusResponse|null>(null);
  const [memberState,setMemberState]=useState<'checking'|'ready'|'unavailable'>('checking');
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
      }catch{if(alive)setMemberState('unavailable');}
    };
    void read();
    return()=>{alive=false;};
    // The parent auth refresh callback is short lived, not a settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[businessKsNumber,businessGateway,subscriptionGateway]);
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
    <div className="spm-sell-review-card">
      <strong><CreditCard size={15}/> Account membership</strong>
      {memberState==='checking'&&<p role="status">Checking your account plan…</p>}
      {memberState==='unavailable'&&<p role="status">Membership status is unavailable. No subscription or payment has been started.</p>}
      {memberState==='ready'&&membership&&<>
        <p>{membership.plan==='FOR_YOU'?'SecurePay for You':'SecurePay for Business'} — {humanStatus(membership.status)}</p>
        {fee&&<small>Server-reported monthly fee: {fee}</small>}
      </>}
      <small>This is the signed-in account's subscription status, not proof of Business-specific billing or permission to issue payments. Plan changes require a separate explicit action.</small>
    </div>
    <p className="spm-sell-hint">Store visibility, team invitations, community directory permissions and eTIMS connections will remain separate, voluntary, and server-authorized.</p>
  </section>;
}
