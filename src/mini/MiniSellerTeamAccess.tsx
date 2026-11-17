import {useEffect,useState} from 'react';
import {ShieldCheck,UsersRound} from 'lucide-react';
import type {BusinessGateway} from '../api/securepay/business';
import type {AuthorizationGateway} from '../api/securepay/authorization';

type Props={
  businessKsNumber:string;
  verifiedRepresentation:boolean;
  businessGateway:Pick<BusinessGateway,'get'|'members'>;
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
  return <div className="spm-sell-review-card" data-mini-team-authority="server-read-only">
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
    </>}
    <small>Store editing access never permits a helper to sign on behalf of the Business, accept on another person's behalf, or authorize Money.</small>
  </div>;
}
