import { useState } from 'react';
import type { KsIdentitySelectionResult } from '../../api/securepay/agent/dto';
type Purpose='agreement'|'circle'|'project'|'trust';
const LABELS:Record<Purpose,string>={agreement:'Agreement',circle:'Circle',project:'Community project',trust:'Trust Project'};
export function PeopleInvitationsTool({onPrepare,onCheckKs,agreementPeople=[]}:{onPrepare:(text:string)=>Promise<void>;onCheckKs?:(ksNumber:string)=>Promise<KsIdentitySelectionResult>;agreementPeople?:string[]}){
  const [purpose,setPurpose]=useState<Purpose>('agreement');
  const [people,setPeople]=useState('');
  const [role,setRole]=useState('');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  const [ks,setKs]=useState('');
  const [identity,setIdentity]=useState<KsIdentitySelectionResult|null>(null);
  const [ksBusy,setKsBusy]=useState(false);
  const [governance,setGovernance]=useState(false);
  const [noKs,setNoKs]=useState(false);
  const [inviteName,setInviteName]=useState('');
  const [shareNote,setShareNote]=useState('');
  const canShare=!!inviteName.trim()&&!!shareNote.trim();
  const whatsappText=['Hello '+inviteName.trim()+',','I would like to invite you to participate in '+LABELS[purpose]+' on SecurePay.',
    'Why: '+shareNote.trim()+'.',role.trim()?'Proposed role: '+role.trim()+'.':'',
    governance?'This includes proposed governance responsibilities which you must review and explicitly accept.':'',
    'You do not need to agree simply because I invited you. Please ask me for the SecurePay invitation link when ready.'].filter(Boolean).join('\n');
  async function checkKs(){
    if(!onCheckKs||!ks.trim()||ksBusy)return;
    setKsBusy(true);setError('');setIdentity(null);
    try{setIdentity(await onCheckKs(ks.trim()));}
    catch{setError('Unable to confirm this KS Number. No participant was added.');}
    finally{setKsBusy(false);}
  }
  const names=people.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean).slice(0,20);
  const canPrepare=!!people.trim()&&!busy;
  async function prepare(){
    if(!canPrepare)return;
    setBusy(true);setError('');setSent(false);
    const message=['Help me prepare '+LABELS[purpose]+' invitations, not send them.',
      'Proposed invitees: '+names.join('; ')+'.',
      role.trim()?'Proposed role or contribution: '+role.trim()+'.':'',
      identity?.status==='RESOLVED'?'Lookup-only KS identity: '+(identity.canonicalKsNumber||ks)+', '+(identity.displayName||'name not provided')+'.':'',
      governance?'Proposed governance responsibilities require the person to explicitly accept them before assuming the role.':'',
      note.trim()?'Context: '+note.trim()+'.':'',
      purpose==='agreement'?'Check who must agree, the draft readiness, and the specific invitation permissions. Do not imply acceptance.':
      purpose==='circle'?'Circle membership is distinct from Trust Project membership. Respect Circle visibility and steward permission.':
      purpose==='trust'?'Trust Project membership requires explicit acceptance and cannot be created by signing in. Do not promise referral entitlement.':
      'Check project participation requirements, organiser authority and consent; do not invite or publish yet.',
      'Ask only the next material question and show a short invitation draft for review. Never claim a message was sent.'].filter(Boolean).join('\n');
    try{await onPrepare(message);setSent(true);}catch{setError('Could not confirm KS001 received this request. Check Chat before retrying.');}
    finally{setBusy(false);}
  }
  return <section aria-label="People and invitations" className="space-y-3 text-sm">
    <p className="font-semibold">Who would you like to involve?</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Invitation purpose">
      {(Object.keys(LABELS) as Purpose[]).map(key=><button key={key} type="button" onClick={()=>{setPurpose(key);setSent(false);}}
        className={purpose===key?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 bg-white px-3 py-2 text-xs'}>{LABELS[key]}</button>)}
    </div>
    {purpose==='agreement'&&agreementPeople.length>0&&<div className="rounded-xl bg-cream-50 p-2">
      <p className="mb-2 text-xs text-sand-600">Already mentioned in your Agreement</p>
      <div className="flex flex-wrap gap-2">{agreementPeople.slice(0,8).map((name,index)=><button type="button" key={index} onClick={()=>setPeople(previous=>[previous,name].filter(Boolean).join('\n'))}
        className="rounded-full border border-cream-200 bg-white px-3 py-2 text-xs">{name}</button>)}</div>
    </div>}
    <div className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-3">
      <p className="text-sm font-semibold">Add with KS Number</p>
      <div className="flex gap-2">
        <input aria-label="KS Number" value={ks} onChange={e=>{setKs(e.target.value);setIdentity(null);}} placeholder="KS Number" maxLength={40}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-cream-200 bg-white px-3 text-sm"/>
        <button type="button" onClick={()=>void checkKs()} disabled={!onCheckKs||ksBusy||!ks.trim()} className="rounded-full border border-cream-200 bg-white px-3 text-xs disabled:opacity-40">{ksBusy?'Checking…':'Check status'}</button>
      </div>
      {identity&&<div role="status" className="text-xs">
        <p className="font-semibold">{identity.status==='RESOLVED'?'KS identity found':identity.status==='NOT_PARTICIPANT_ELIGIBLE'?'Not eligible as an Agreement participant':identity.status==='NOT_FOUND'?'KS Number not found':'Status: '+identity.status.replaceAll('_',' ').toLowerCase()}</p>
        {identity.status==='RESOLVED'&&<p>{identity.displayName||'Name not provided'} · {identity.canonicalKsNumber||ks} · Lookup only</p>}
        <p>Checking does not add this person or confirm their acceptance.</p>
        {identity.status==='RESOLVED'&&<button type="button" onClick={()=>setPeople(current=>[current,identity.displayName||identity.canonicalKsNumber||ks].filter(Boolean).join('\n'))}
          className="mt-2 rounded-full border border-cream-200 bg-white px-3 py-2">Use as proposed invitee</button>}
      </div>}
      {!onCheckKs&&<p className="text-xs text-sand-600">Start a live KS001 conversation to check identity status.</p>}
    </div>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={governance} onChange={e=>setGovernance(e.target.checked)}/>
      This invitation proposes a governance or decision-making role requiring explicit acceptance
    </label>
    <button type="button" className="text-xs font-semibold underline" onClick={()=>setNoKs(v=>!v)}>{noKs?'Hide':'Person has no KS Number? Invite via WhatsApp'}</button>
    {noKs&&<div className="space-y-2 rounded-xl border border-cream-200 p-3">
      <label className="block text-xs">Their name
        <input maxLength={100} value={inviteName} onChange={e=>setInviteName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3" placeholder="First name"/>
      </label>
      <label className="block text-xs">Why are you inviting them?
        <textarea rows={2} maxLength={300} value={shareNote} onChange={e=>setShareNote(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 p-2" placeholder="Tell them about the work and why their participation matters"/>
      </label>
      {canShare&&<div className="rounded-lg bg-cream-50 p-2 text-xs whitespace-pre-wrap">{whatsappText}</div>}
      <a href={canShare?'https://wa.me/?text='+encodeURIComponent(whatsappText):undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!canShare}
        className={canShare?'inline-block rounded-full bg-forest-800 px-4 py-3 text-xs font-semibold text-white':'pointer-events-none inline-block rounded-full bg-cream-100 px-4 py-3 text-xs text-sand-600'}>Open WhatsApp draft ↗</a>
      <p className="text-xs text-sand-600">Opens your own WhatsApp share screen. No SecurePay invitation token is issued and nothing is sent automatically.</p>
    </div>}
    <label className="block text-xs">People or organisations to invite
      <textarea value={people} onChange={e=>{setPeople(e.target.value);setSent(false);}} rows={2} maxLength={800}
        placeholder="Names, KS Numbers or organisations — one per line" className="mt-1 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
    </label>
    <label className="block text-xs">Their role (optional)
      <input value={role} onChange={e=>setRole(e.target.value)} maxLength={120} placeholder="e.g. contractor, contributor, organiser" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>
    <label className="block text-xs">What should they know? (optional)
      <input value={note} onChange={e=>setNote(e.target.value)} maxLength={300} placeholder="e.g. Please review the scope before agreeing" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>
    <button type="button" disabled={!canPrepare} onClick={()=>void prepare()} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">{busy?'Preparing…':'Prepare with KS001'}</button>
    {sent&&<p role="status" className="rounded-lg bg-cream-50 p-2 text-xs">Request submitted to KS001 Chat. No invitations have been sent.</p>}
    {error&&<p role="alert" className="text-xs text-amber-900">{error}</p>}
    <p className="text-xs text-sand-600">Preparing is not sending. Invitations need the correct authority, recipient review and explicit action. No membership or Agreement acceptance is created here.</p>
  </section>;
}
