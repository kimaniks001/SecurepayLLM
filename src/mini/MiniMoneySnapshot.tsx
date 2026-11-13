import {useEffect,useState} from 'react';
import {RefreshCcw,ShieldCheck} from 'lucide-react';
import type {MoneySnapshotGateway,AgreementMoneySnapshotResponse}
  from '../api/securepay/money-snapshot';
import {miniMoneySnapshotProof,miniMoneyStatusLabel}
  from './miniMoneySnapshotProof.mjs';

/**
 * M6: canonical agreement-linked Money STATUS, not another Money system.
 * This view performs only GET /money-snapshot using the same authenticated
 * session as Mini. It NEVER creates a funding quote/intent or starts a rail.
 *
 * Mounted only in a matched, isolated API+Mini staging environment, gated in
 * MiniFirstPartyKs001. Never mounted for scripted demo personas.
 */
export function MiniMoneySnapshot({agreementId,versionId,money,prepare}:{
  agreementId:string;
  versionId:string;
  money:Pick<MoneySnapshotGateway,'read'>;
  prepare:()=>Promise<unknown>;
}){
  const [snapshot,setSnapshot]=useState<AgreementMoneySnapshotResponse|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let alive=true;
    setSnapshot(null);setState('loading');
    (async()=>{
      try{
        await prepare();
        const result=await money.read(agreementId);
        if(!miniMoneySnapshotProof(result,agreementId,versionId))
          throw Error('Agreement Money snapshot changed or is not verified');
        if(alive){setSnapshot(result);setState('ready');}
      }catch{
        if(alive){setSnapshot(null);setState('error');}
      }
    })();
    return ()=>{alive=false;};
    // prepare is the authenticated first-party session refresher, not a
    // separate Money identity. The parent remounts for Agreement/account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[agreementId,versionId,money,refresh]);

  return <details className="spm-mini-slot" data-mini-money="canonical-read-only">
    <summary>Money status <small>SecurePay record</small></summary>
    <div className="spm-mini-slot-items">
      {state==='loading'&&<p role="status">Checking the Agreement's Money record…</p>}
      {state==='error'&&<p role="alert">
        The Money record cannot be verified for this Agreement and version.
        No payment status or method can be assumed.
      </p>}
      {state==='ready'&&snapshot&&<div className="spm-mini-agreement-fact"
        role="status">
        <strong>{miniMoneyStatusLabel(snapshot)}</strong>
        <small>Payment movement assessment: {snapshot.movement.state==='READY'
          ?'Evaluated by SecurePay — not an executed payment'
          :snapshot.movement.state==='BLOCKED'?'Blocked':'Unavailable'}</small>
        {snapshot.paymentReady.outstandingReasons?.length>0&&
          <small>Unresolved checks: {snapshot.paymentReady.outstandingReasons.length}</small>}
        <strong>Funding routes</strong>
        {snapshot.fundingOptions.length===0
          ?<small>No currently available funding route returned.</small>
          :snapshot.fundingOptions.map(route=>
            <small key={route.railCode}>
              {route.displayName} · {route.currency} · Available for review only
            </small>)}
        <small>No rail is selected. Any fees or provider amounts need a
          separately reviewed SecurePay quote. This view cannot send money.</small>
      </div>}
      <button type="button" className="spm-secondary"
        onClick={()=>setRefresh(x=>x+1)} disabled={state==='loading'}>
        <RefreshCcw size={14}/>Recheck Money status
      </button>
      <small><ShieldCheck size={13}/> A snapshot is not a receipt.
        Payment completion, deposits and release require independent
        server confirmation and the agreed participants' authority.</small>
    </div>
  </details>;
}
