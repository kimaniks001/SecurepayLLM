import { useEffect, useState } from 'react';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import { createInviteController } from '../invitations/controller';
import { InvitePanel } from '../invitations/InvitePanel';

/**
 * Existing backend invitation ceremony, opened from the SAME Living Workspace.
 * Discover the current participant via the authenticated confirmation endpoint;
 * require an exact participant ID match to a server-owned isCreator=true People row.
 * No guessed KS identity, inferred creator permissions or automatic link delivery.
 */
export function AgreementInviteInsideWorkspace({gateway,auth,session,agreementId,status,onChanged}:{
 gateway:AgreementGateway;
 auth:AuthGateway;
 session:SessionStore;
 agreementId:string;
 status:string;
 onChanged:()=>void;
}){
 const [controller]=useState(()=>createInviteController(gateway,agreementId,window.location.origin,onChanged));
 const [authority,setAuthority]=useState<'checking'|'creator'|'not-creator'|'error'>('checking');
 useEffect(()=>{
   let live=true;
   setAuthority('checking');
   void (async()=>{
     try{
       await ensureFreshSession(session,auth);
       const [mine,people]=await Promise.all([gateway.confirmationStatus(agreementId),gateway.people(agreementId)]);
       if(!live)return;
       const actor=mine.length===1?mine[0]:null;
       const matched=actor?people.people.find(p=>p.participantId===actor.participantId):null;
       setAuthority(matched?.isCreator===true?'creator':'not-creator');
     }catch{if(live)setAuthority('error');}
   })();
   return()=>{live=false;};
 },[agreementId,gateway,session,auth]);
 return <section aria-label="Share this Agreement with a participant" data-gate-d-versioned-agreement-invite>
   {authority==='checking'&&<p role="status" className="text-xs text-sand-700">Checking invitation authority…</p>}
   {authority==='error'&&<p role="alert" className="text-xs text-sand-700">SecurePay could not verify invitation authority. Refresh the Agreement before proceeding.</p>}
   {authority==='not-creator'&&<p className="text-xs text-sand-700">Only the authorised creator can invite someone. Review the participants to see who can act.</p>}
   {authority==='creator'&&<InvitePanel controller={controller} isCreator={true} agreementStatus={status}/>}
 </section>;
}
