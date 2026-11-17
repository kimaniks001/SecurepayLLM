import {useEffect,useState} from 'react';
import {Building2,FileCheck2,ShieldCheck} from 'lucide-react';
import type {BusinessGateway} from '../api/securepay/business';
import type {MiniBusinessPreferencesGateway,MiniBusinessOptInStatus}
  from '../api/securepay/mini-business-preferences';

type Choice='DIRECTORY'|'ETIMS';
type Props={
  businessKsNumber:string;
  businessGateway:Pick<BusinessGateway,'representation'>;
  preferencesGateway:MiniBusinessPreferencesGateway;
  prepare:()=>Promise<unknown>;
};

function verified(p:MiniBusinessOptInStatus):boolean {
  return !!p && Number.isSafeInteger(p.version) && p.version>=0 &&
    typeof p.directoryListingRequested==='boolean' &&
    typeof p.etimsSetupRequested==='boolean' &&
    p.directoryState===(p.directoryListingRequested?'REQUESTED_NOT_PUBLISHED':'NOT_REQUESTED') &&
    p.etimsState===(p.etimsSetupRequested?'REQUESTED_NOT_CONNECTED':'NOT_REQUESTED');
}

/** No external directory entry or KRA service connected by these requests. */
export function MiniSellerBusinessOptIns({
  businessKsNumber,businessGateway,preferencesGateway,prepare
}:Props){
  const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');
  const [prefs,setPrefs]=useState<MiniBusinessOptInStatus|null>(null);
  const [pending,setPending]=useState<{choice:Choice;requested:boolean}|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let alive=true;setStatus('loading');setPrefs(null);setPending(null);
    const read=async()=>{
      try {
        await prepare();
        const owner=await businessGateway.representation(businessKsNumber);
        if(owner.businessKsNumber!==businessKsNumber||!owner.canActFor||
          owner.identityType!=='BUSINESS'||owner.relationship!=='ADMINISTRATOR')
          throw new Error('Business authority unavailable');
        const response=await preferencesGateway.read(businessKsNumber);
        if(!verified(response))throw new Error('Unknown server preference status');
        if(alive){setPrefs(response);setStatus('ready');}
      }catch{if(alive)setStatus('unavailable');}
    };
    void read();return()=>{alive=false;};
    // Auth freshness callback is transient; never considered proof of authority.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[businessKsNumber,businessGateway,preferencesGateway]);

  const choose=async()=>{
    if(!prefs||!pending||busy)return;
    const old=prefs,desired=pending;
    setBusy(true);setMessage('');
    try{
      await prepare();
      const owner=await businessGateway.representation(businessKsNumber);
      if(owner.businessKsNumber!==businessKsNumber||owner.identityType!=='BUSINESS'||
         !owner.canActFor||owner.relationship!=='ADMINISTRATOR')
        throw new Error('Business authority changed');
      const fresh=await preferencesGateway.read(businessKsNumber);
      if(!verified(fresh)||fresh.version!==old.version||
        fresh.directoryListingRequested!==old.directoryListingRequested||
        fresh.etimsSetupRequested!==old.etimsSetupRequested)
        throw new Error('Preferences changed since review');
      const result=await preferencesGateway.choose(businessKsNumber,desired.choice,{
        requested:desired.requested,expectedVersion:fresh.version,sellerConfirmsChoice:true
      });
      if(!verified(result)||result.version!==fresh.version+1||
         (desired.choice==='DIRECTORY'
          ?result.directoryListingRequested!==desired.requested
          :result.etimsSetupRequested!==desired.requested))
        throw new Error('Server did not confirm consent choice');
      setPrefs(result);setPending(null);
      setMessage(desired.choice==='DIRECTORY'
        ?(desired.requested
          ?'Directory review requested. Your Business has NOT been published to a community directory.'
          :'Directory request withdrawn. This does not remove listings already shared on another service.')
        :(desired.requested
          ?'eTIMS setup requested. No KRA connection, taxpayer data or invoice has been sent.'
          :'eTIMS setup request withdrawn. No external KRA disconnection is implied.'));
    }catch{
      setPending(null);setStatus('unavailable');
      setMessage('SecurePay could not verify the latest request. Nothing is marked connected or published. Reopen settings and check before trying again.');
    }finally{setBusy(false);}
  };
  const publicRequested=!!prefs?.directoryListingRequested;
  const taxRequested=!!prefs?.etimsSetupRequested;
  return <div className="spm-sell-review-card" data-mini-business-opt-ins="backend-request-only">
    <strong><ShieldCheck size={16}/> Optional connections</strong>
    <p>You decide which extra services to request. Neither is turned on merely by joining SecurePay.</p>
    {status==='loading'&&<p role="status">Checking your Business preferences…</p>}
    {status==='unavailable'&&<p role="status">Your current preferences could not be verified. No connection or directory publication is assumed.</p>}
    {status==='ready'&&prefs&&<>
      <div className="spm-sell-review-card">
        <strong><Building2 size={15}/> Be listed in a community</strong>
        <p>{publicRequested?'Review requested · not listed yet':'Not requested'}</p>
        <small>Only a request to review eligibility. Communities set their own membership and visibility rules; no contacts or customer records are shared.</small>
        <button type="button" disabled={busy} className="spm-secondary"
          onClick={()=>setPending({choice:'DIRECTORY',requested:!publicRequested})}>
          {publicRequested?'Withdraw directory request':'Request directory review'}
        </button>
      </div>
      <div className="spm-sell-review-card">
        <strong><FileCheck2 size={15}/> KRA eTIMS</strong>
        <p>{taxRequested?'Setup requested · not connected':'Not requested'}</p>
        <small>Opt in to a setup review. No PIN, tax invoice or customer tax details are sent to KRA; invoice issuing and input-tax eligibility require separate verification.</small>
        <button type="button" disabled={busy} className="spm-secondary"
          onClick={()=>setPending({choice:'ETIMS',requested:!taxRequested})}>
          {taxRequested?'Withdraw setup request':'Request eTIMS setup'}
        </button>
      </div>
    </>}
    {pending&&status==='ready'&&<div className="spm-sell-visibility-confirm">
      <strong>Confirm this choice?</strong>
      <p>{pending.choice==='DIRECTORY'
        ?pending.requested
          ?'Record a voluntary request for community directory review? This will NOT list your Business.'
          :'Withdraw your directory request? This does not delete listings already shared elsewhere.'
        :pending.requested
          ?'Record a request for eTIMS setup? This does NOT connect to KRA or send tax records.'
          :'Withdraw the pending eTIMS setup request? No external tax connection will be changed.'}</p>
      <div className="spm-sell-pill-row">
        <button type="button" disabled={busy} className="spm-secondary" onClick={()=>setPending(null)}>Not now</button>
        <button type="button" disabled={busy} className="spm-secondary" onClick={()=>void choose()}>
          {busy?'Checking…':'Yes, record my choice'}
        </button>
      </div>
    </div>}
    {message&&<p className="spm-sell-hint" role="status">{message}</p>}
  </div>;
}
