import {useState} from 'react';
import {UsersRound} from 'lucide-react';
import type {BusinessGateway} from '../api/securepay/business';

/**
 * Only the invited signed-in identity can accept a pending Business invite.
 * The existing server determines that identity; typing a KSNumber cannot
 * authorize someone else's invite, grant roles, or sign an Agreement.
 */
export function MiniSellerInvitationAcceptance({
  businessGateway,prepare
}:{
  businessGateway:Pick<BusinessGateway,'acceptInvitation'>;
  prepare:()=>Promise<unknown>;
}){
  const [open,setOpen]=useState(false);
  const [ks,setKs]=useState('');
  const [review,setReview]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const accept=async()=>{
    const target=ks.trim().toUpperCase();
    if(busy||!review||!/^KS[0-9A-Z]{3,24}$/.test(target)){
      setMessage('Check the inviting Business KSNumber first.');return;
    }
    setBusy(true);setMessage('');
    try{
      await prepare();
      // Backend verifies that THIS caller is actually the pending invitee.
      // It returns 204 only after membership status changed or was already
      // ACTIVE; there is still no administrator/staff role grant here.
      await businessGateway.acceptInvitation(target);
      setOpen(false);setKs('');setReview(false);
      setMessage('You accepted the Business invitation. Your administrator must separately approve your role before you can operate this Store. No Agreement or Money authority was granted.');
    }catch{
      setMessage('SecurePay could not verify the invitation outcome. Ask the Business administrator to check before you retry; no role access is assumed.');
    }finally{setBusy(false);}
  };
  return <div className="spm-sell-review-card" data-mini-business-invite-accept>
    <button type="button" className="spm-secondary" onClick={()=>{setOpen(v=>!v);setReview(false);}}>
      <UsersRound size={15}/>{open?'Close invitation':'Have a Business invitation?'}
    </button>
    {open&&<>
      <p>Enter the KSNumber of the Business that invited you. You can accept only invitations sent to your own account.</p>
      <label className="spm-label" htmlFor="spm-accept-business">Inviting Business KSNumber</label>
      <input id="spm-accept-business" className="spm-field" value={ks}
        maxLength={26} autoComplete="off" disabled={busy} placeholder="KSNumber"
        onChange={e=>{setKs(e.target.value);setReview(false);}}/>
      <div className="spm-sell-pill-row">
        <button type="button" className="spm-secondary" disabled={busy}
          onClick={()=>setOpen(false)}>Not now</button>
        <button type="button" className="spm-secondary" disabled={busy}
          onClick={()=>setReview(true)}>Review invitation</button>
      </div>
      {review&&<div className="spm-sell-visibility-confirm">
        <strong>Accept invitation from {ks.trim().toUpperCase()}?</strong>
        <p>Accepting membership is not permission to edit their Store, represent the Business in an Agreement, or move Money. Your role must be separately authorized.</p>
        <button type="button" className="spm-secondary" disabled={busy}
          onClick={()=>void accept()}>{busy?'Checking…':'Yes, accept invitation'}</button>
      </div>}
    </>}
    {message&&<p className="spm-sell-hint" role="status">{message}</p>}
  </div>;
}
