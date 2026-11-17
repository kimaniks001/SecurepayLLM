import {useEffect,useState} from 'react';
import {ShieldCheck,UsersRound} from 'lucide-react';
import type {BusinessGateway} from '../api/securepay/business';
import type {AuthorizationGateway} from '../api/securepay/authorization';

type Props={
  businessKsNumber:string;
  verifiedRepresentation:boolean;
  businessGateway:Pick<BusinessGateway,'get'|'members'|'inviteMember'|'representation'>;
  authorizationGateway:Pick<AuthorizationGateway,'authoritySummary'>;
  prepare:()=>Promise<unknown>;
};

type TeamView={
  membersTotal:number;
  membersActive:number;
  memberManagement:boolean;
  roleAssignment:boolean;
  isApproved:boolean;
};
/**
 * Read-only. Organization membership is NOT an Agreement signature, Store
 * inventory verification or financial authorization. Permission lists are
 * caller-scoped on the server and every operation needs a fresh check.
 */
export function MiniSellerTeamAccess({
  businessKsNumber,verifiedRepresentation,businessGateway,authorizationGateway,prepare
}:Props){
  const [state,setState]=useState<'checking'|'ready'|'unavailable'>('checking');
  const [team,setTeam]=useState<TeamView|null>(null);
  const [inviteOpen,setInviteOpen]=useState(false);
  const [inviteKsNumber,setInviteKsNumber]=useState('');
  const [inviteConfirmed,setInviteConfirmed]=useState(false);
  const [inviteBusy,setInviteBusy]=useState(false);
  const [inviteNotice,setInviteNotice]=useState('');
  useEffect(()=>{
    let alive=true;
    setState('checking');setTeam(null);
    if(!verifiedRepresentation){setState('unavailable');return;}
    const read=async()=>{
      try{
        await prepare();
        const org=await businessGateway.get(businessKsNumber);
        if(!org?.organizationId||org.businessKsNumber!==businessKsNumber)
          throw new Error('Organization mismatch');
        // The server resolves the signed-in caller: no arbitrary actor ID.
        const authority=await authorizationGateway.authoritySummary(org.organizationId);
        if(authority.organizationId!==org.organizationId||
           !Array.isArray(authority.permissions))
          throw new Error('Authority mismatch');
        await prepare();
        const members=await businessGateway.members(businessKsNumber);
        if(!Array.isArray(members))throw new Error('Member list unavailable');
        const uniq=new Set(members.map(m=>m.identityId));
        if(uniq.size!==members.length)throw new Error('Duplicate membership response');
        const allowed=new Set(authority.permissions);
        if(alive){setTeam({
          membersTotal:members.length,
          membersActive:members.filter(m=>m.status==='ACTIVE').length,
          memberManagement:allowed.has('ORGANIZATION_MANAGE_MEMBERS'),
          roleAssignment:allowed.has('ORGANIZATION_ASSIGN_ROLES'),
          isApproved:true
        });setState('ready');}
      }catch{if(alive){setTeam(null);setState('unavailable');}}
    };
    void read();
    return()=>{alive=false;};
    // Parent prepare is a transient authentication refresher, never itself
    // grounds permissions and cannot make inaccessible records available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[businessKsNumber,verifiedRepresentation,businessGateway,authorizationGateway]);
  const sendInvite=async()=>{
    const target=inviteKsNumber.trim().toUpperCase();
    if(!team?.memberManagement||!inviteConfirmed||inviteBusy||!/^KS[0-9A-Z]{3,24}$/.test(target)){
      setInviteNotice('Check the invited person\'s complete KSNumber and confirm this invitation.');
      return;
    }
    setInviteBusy(true);setInviteNotice('');
    try{
      await prepare();
      const rep=await businessGateway.representation(businessKsNumber);
      if(!rep.canActFor||rep.businessKsNumber!==businessKsNumber||
         rep.identityType!=='BUSINESS'||rep.relationship!=='ADMINISTRATOR')
        throw new Error('Representation unavailable');
      const org=await businessGateway.get(businessKsNumber);
      if(!org.organizationId||org.businessKsNumber!==businessKsNumber)throw new Error('Organization changed');
      const summary=await authorizationGateway.authoritySummary(org.organizationId);
      if(summary.organizationId!==org.organizationId||
        !summary.permissions.includes('ORGANIZATION_MANAGE_MEMBERS'))
        throw new Error('Member management permission unavailable');
      // Backend creates a PENDING membership. It does NOT grant a role,
      // Business Agreement signature, team Inbox or Money permission.
      await businessGateway.inviteMember(businessKsNumber,target);
      setInviteOpen(false);setInviteKsNumber('');setInviteConfirmed(false);
      setInviteNotice('SecurePay recorded the invitation request. The person must accept it themselves. No staff role or Agreement authority was granted.');
      // Existing members endpoint lists ACTIVE records only; do not claim
      // a pending invite is listed or already accepted.
    }catch{
      setInviteNotice('The invitation could not be verified. Its outcome may be unknown; check with the person before retrying. No authority is assumed.');
    }finally{setInviteBusy(false);}
  };
  return <div className="spm-sell-review-card" data-mini-team-authority="server-verified">
    <strong><UsersRound size={16}/> People who help this Business</strong>
    {state==='checking'&&<p role="status">Checking Organization access…</p>}
    {state==='unavailable'&&<p role="status">Team permissions could not be verified. Staff changes are unavailable here.</p>}
    {state==='ready'&&team&&<>
      <p>{team.membersActive} active member{team.membersActive===1?'':'s'} of {team.membersTotal} membership record{team.membersTotal===1?'':'s'}.</p>
      <small><ShieldCheck size={13}/> {team.memberManagement
        ?'Your current account has a member-management permission. Invitations and removals still require a separate explicit action.'
        :'Member changes are not permitted by your current verified permission summary.'}</small>
      <small>{team.roleAssignment
        ?'Role changes require the existing separate approval process. They are not enabled here.'
        :'Role assignment is not available to your current account.'}</small>
      {team.memberManagement&&<button type="button" className="spm-secondary"
        disabled={inviteBusy} onClick={()=>{setInviteOpen(v=>!v);setInviteConfirmed(false);setInviteNotice('');}}>
        {inviteOpen?'Close invitation':'Invite a helper'}
      </button>}
      {team.memberManagement&&inviteOpen&&<div className="spm-sell-visibility-confirm">
        <strong>Invite someone to this Business?</strong>
        <p>An invitation is not a job role. They must accept on their own account, and any later role assignment requires the existing separate authorization process.</p>
        <label className="spm-label" htmlFor="spm-business-member-ks">Their KSNumber</label>
        <input id="spm-business-member-ks" className="spm-field"
          value={inviteKsNumber} maxLength={26} disabled={inviteBusy}
          placeholder="KSNumber" autoComplete="off"
          onChange={e=>{setInviteKsNumber(e.target.value);setInviteConfirmed(false);}}/>
        <div className="spm-sell-pill-row">
          <button type="button" className="spm-secondary" disabled={inviteBusy}
            onClick={()=>{setInviteOpen(false);setInviteConfirmed(false);}}>Not now</button>
          <button type="button" className="spm-secondary" disabled={inviteBusy}
            onClick={()=>setInviteConfirmed(true)}>Review invitation</button>
        </div>
        {inviteConfirmed&&<div className="spm-sell-review-card">
          <strong>Invite {inviteKsNumber.trim().toUpperCase()}?</strong>
          <small>They will receive only a pending Business membership invitation. They cannot act for the Business until separately authorized.</small>
          <button type="button" className="spm-secondary" disabled={inviteBusy}
            onClick={()=>void sendInvite()}>{inviteBusy?'Checking…':'Yes, send invitation'}</button>
        </div>}
      </div>}
    </>}
    {inviteNotice&&<p className="spm-sell-hint" role="status">{inviteNotice}</p>
    <small>Store editing or a pending invitation never permits a helper to sign on behalf of the Business, accept on another person's behalf, or authorize Money.</small>
  </div>;
}
