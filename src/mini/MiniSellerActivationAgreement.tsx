import {useState} from 'react';
import {FileCheck2,ShieldCheck} from 'lucide-react';
import type {SubscriptionGateway,ActivationAgreementResponse} from '../api/securepay/subscription';

type Props={
  subscriptionGateway:Pick<SubscriptionGateway,
    'activationAgreement'|'establishActivationAgreement'|'confirmActivationAgreement'>;
  prepare:()=>Promise<unknown>;
};

/** Account subscription activation is its OWN Agreement. Reviewing/confirming
 * never pays, prepares a payment intent, activates a regulated rail or affects
 * a buyer/seller trade Agreement. All verified versions come from the API.
 */
export function MiniSellerActivationAgreement({subscriptionGateway,prepare}:Props){
  const [agreement,setAgreement]=useState<ActivationAgreementResponse|null>(null);
  const [state,setState]=useState<'idle'|'ready'|'unavailable'>('idle');
  const [busy,setBusy]=useState(false);
  const [prepareAsked,setPrepareAsked]=useState(false);
  const [readConfirmed,setReadConfirmed]=useState(false);
  const [message,setMessage]=useState('');
  const valid=(a:ActivationAgreementResponse)=>!!a?.agreementId&&
    !!a.agreementVersionId&&!!a.contentHash&&typeof a.title==='string'&&
    typeof a.purpose==='string'&&typeof a.description==='string'&&
    typeof a.confirmed==='boolean';
  const load=async()=>{
    if(busy)return;
    setBusy(true);setMessage('');setAgreement(null);setReadConfirmed(false);
    try{
      await prepare();
      const next=await subscriptionGateway.activationAgreement();
      if(!valid(next))throw new Error('Version unavailable');
      setAgreement(next);setState('ready');
    }catch{
      setState('unavailable');
      setMessage('No activation Agreement could be verified. You may explicitly prepare one, then review its actual server terms.');
    }finally{setBusy(false);}
  };
  const establish=async()=>{
    if(!prepareAsked||busy)return;
    setBusy(true);setMessage('');setReadConfirmed(false);
    try{
      await prepare();
      const next=await subscriptionGateway.establishActivationAgreement();
      if(!valid(next))throw new Error('Unverified Agreement');
      const confirmed=await subscriptionGateway.activationAgreement();
      if(!valid(confirmed)||confirmed.agreementId!==next.agreementId||
        confirmed.agreementVersionId!==next.agreementVersionId||
        confirmed.contentHash!==next.contentHash)
        throw new Error('Source changed');
      setAgreement(confirmed);setState('ready');setPrepareAsked(false);
    }catch{
      setAgreement(null);setState('unavailable');
      setMessage('The Agreement outcome could not be verified. Check the account before preparing again.');
    }finally{setBusy(false);}
  };
  const confirm=async()=>{
    if(busy||!agreement||agreement.confirmed||!readConfirmed)return;
    const reviewed=agreement;
    setBusy(true);setMessage('');
    try{
      await prepare();
      const fresh=await subscriptionGateway.activationAgreement();
      if(!valid(fresh)||fresh.agreementId!==reviewed.agreementId||
        fresh.agreementVersionId!==reviewed.agreementVersionId||
        fresh.contentHash!==reviewed.contentHash||
        fresh.title!==reviewed.title||fresh.purpose!==reviewed.purpose||
        fresh.description!==reviewed.description)
        throw new Error('Agreement changed');
      const recorded=await subscriptionGateway.confirmActivationAgreement();
      if(!valid(recorded)||!recorded.confirmed||
        recorded.agreementId!==reviewed.agreementId||
        recorded.agreementVersionId!==reviewed.agreementVersionId||
        recorded.contentHash!==reviewed.contentHash)
        throw new Error('Confirmation unverified');
      setAgreement(recorded);setReadConfirmed(false);setState('ready');
      setMessage('Your activation Agreement is confirmed. No Money has been initiated; billing and funding require separate explicit steps.');
    }catch{
      setAgreement(null);setState('unavailable');setReadConfirmed(false);
      setMessage('The confirmation outcome is unknown. Reload the Agreement before trying again. No payment has been authorized.');
    }finally{setBusy(false);}
  };
  return <div className="spm-sell-review-card" data-mini-activation-agreement="canonical">
    <strong><FileCheck2 size={15}/> Membership Agreement</strong>
    <p>Your membership needs its own reviewed Agreement before any subscription funding.</p>
    {state==='idle'&&<button type="button" className="spm-secondary" disabled={busy}
      onClick={()=>void load()}>Review membership Agreement</button>}
    {state==='unavailable'&&<>
      <button type="button" className="spm-secondary" disabled={busy}
        onClick={()=>void load()}>Check again</button>
      <button type="button" className="spm-secondary" disabled={busy}
        onClick={()=>setPrepareAsked(true)}>Prepare membership Agreement</button>
      {prepareAsked&&<div className="spm-sell-visibility-confirm">
        <p>Set up the canonical activation Agreement for your existing account subscription? This creates a draft to review; it does not confirm or pay it.</p>
        <div className="spm-sell-pill-row">
          <button type="button" className="spm-secondary" onClick={()=>setPrepareAsked(false)}>Not now</button>
          <button type="button" className="spm-secondary" disabled={busy}
            onClick={()=>void establish()}>Yes, prepare draft</button>
        </div>
      </div>}
    </>}
    {state==='ready'&&agreement&&<div className="spm-sell-review-card">
      <strong>{agreement.title}</strong>
      <p>Purpose: {agreement.purpose}</p>
      <p className="spm-sell-activation-description">{agreement.description}</p>
      <small>Version: {agreement.agreementVersionId}</small>
      <small>{agreement.confirmed?'Confirmed by the account holder':'Not yet confirmed'}</small>
      {!agreement.confirmed&&<>
        <button type="button" className="spm-secondary"
          onClick={()=>setReadConfirmed(true)} disabled={busy}>
          <ShieldCheck size={14}/> I have read these terms
        </button>
        {readConfirmed&&<button type="button" className="spm-secondary" disabled={busy}
          onClick={()=>void confirm()}>Yes, confirm this Agreement</button>}
      </>}
    </div>}
    {message&&<p role="status" className="spm-sell-hint">{message}</p>}
    <small>Opening, preparing or confirming this Agreement never charges a card, initiates M-Pesa or moves Money.</small>
  </div>;
}
