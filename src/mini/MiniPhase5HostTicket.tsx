import {useEffect,useState} from 'react';
import {MiniHostedCheckoutDemo} from './MiniHostedCheckoutDemo';
import {getMiniDemoCheckout,type MiniCheckoutDemoRecord} from './checkoutDemoFixtures';
import type {MiniLanguage} from './miniModel';

/** Read-only Phase 5 host ticket: NEVER use this component as an Agreement
 * identity, order acceptance or provider payment capability.
 */
type ReadState={stage:'checking'|'unavailable'|'ready';record?:MiniCheckoutDemoRecord};
const HOSTS={
  STORE:{path:'/phase5-store-host.html',alias:'STORE_RETURN'},
  SHORTSTAYS:{path:'/phase5-shortstays-host.html',alias:'STAY_RETURN'}
} as const;
export function MiniPhase5HostTicket({ticket,language}:{
  ticket:string;language:MiniLanguage
}){
  const [state,setState]=useState<ReadState>({stage:'checking'});
  useEffect(()=>{
    let cancelled=false;
    const controller=new AbortController();
    if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ticket)||
       ticket.length<160||ticket.length>1100){
      setState({stage:'unavailable'});return;
    }
    setState({stage:'checking'});
    void (async()=>{
      try{
        const response=await fetch('/api/mini-phase5-host-ticket?ticket='+encodeURIComponent(ticket),{
          method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',
          headers:{Accept:'application/json'},signal:controller.signal
        });
        if(!response.ok)throw Error('TOKEN_REJECTED');
        const x=await response.json() as Record<string,unknown>;
        const record=getMiniDemoCheckout(typeof x.fixtureId==='string'?x.fixtureId:null);
        if(x.source!=='PREVIEW_SIGNED_HOST_REGISTRY'||
          x.simulationOnly!==true||!record||record.fixtureOnly!==true||
          (x.hostId!=='STORE'&&x.hostId!=='SHORTSTAYS')||
          x.hostId!==record.source||
          x.hostPath!==HOSTS[x.hostId as keyof typeof HOSTS].path||
          x.returnAlias!==HOSTS[x.hostId as keyof typeof HOSTS].alias||
          x.sourceVersion!==record.orderVersion||
          x.merchant!==record.merchant||x.amountMinor!==record.amountMinor||
          x.currency!=='KES'||record.currency!=='KES'||
          typeof x.expiresAt!=='number'||!Number.isSafeInteger(x.expiresAt)||
          x.expiresAt<=Date.now()||
          [
            'checkoutAuthorized','realPaymentEnabled','agreementAccepted',
            'providerVerified','moneyMoved','roomHeld','stockReserved',
            'bookingConfirmed','orderCreated','mayFulfil'
          ].some(key=>x[key]!==false))throw Error('UNTRUSTED_SOURCE');
        if(!cancelled)setState({stage:'ready',record});
      }catch{
        if(!cancelled&&!controller.signal.aborted)setState({stage:'unavailable'});
      }
    })();
    return()=>{cancelled=true;controller.abort();};
  },[ticket]);
  if(state.stage==='checking')return <section className="spm-content" role="status"
    data-phase5-ticket="checking">
    <h1 className="spm-question">Checking the sample host reference…</h1>
    <p className="spm-lead">Simulation only. No money or booking has been initiated.</p>
  </section>;
  if(state.stage==='unavailable'||!state.record)
    return <section className="spm-content" role="alert" data-phase5-ticket="denied">
      <h1 className="spm-question">Sample checkout unavailable</h1>
      <p className="spm-lead">The host reference is invalid, expired or could not be
        checked by the preview server. Nothing was booked, accepted or paid.</p>
      <p className="spm-lead">Return to the original test website to request a new
        sample reference. Do not retry any unknown payment outcome.</p>
    </section>;
  return <div data-phase5-ticket="checked-simulation-only">
    <MiniHostedCheckoutDemo record={state.record} language={language} journeyMode/>
  </div>;
}
