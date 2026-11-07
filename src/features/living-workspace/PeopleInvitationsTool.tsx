import { useRef, useState } from 'react';
import type { KsIdentitySelectionResult } from '../../api/securepay/agent/dto';
type Purpose='agreement'|'circle'|'project'|'trust';
const LABELS:Record<Purpose,string>={agreement:'Agreement',circle:'Circle',project:'Community project',trust:'Trust Project'};
export function PeopleInvitationsTool({onPrepare,onCheckKs,agreementPeople=[],localPreview=false,onLocalProposal}:{onPrepare:(text:string)=>Promise<void>;onCheckKs?:(ksNumber:string)=>Promise<KsIdentitySelectionResult>;agreementPeople?:Array<string|{name:string;role?:string|null}>;localPreview?:boolean;onLocalProposal?:(text:string)=>void}){
  const [purpose,setPurpose]=useState<Purpose>('agreement');
  const [people,setPeople]=useState('');
  const [role,setRole]=useState('');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [ks,setKs]=useState('');
  const [identity,setIdentity]=useState<KsIdentitySelectionResult|null>(null);
  const [ksBusy,setKsBusy]=useState(false);
  const ksLookupSequence=useRef(0); // Ignore a delayed reply after the person changes the number.
  const [governance,setGovernance]=useState(false);
  const [governanceDuties,setGovernanceDuties]=useState('');
  const [noKs,setNoKs]=useState(false);
  const [inviteName,setInviteName]=useState('');
  const [shareNote,setShareNote]=useState('');
  const canShare=!!inviteName.trim();
  const whatsappText=['Hello '+inviteName.trim()+',','I would like to invite you to participate in '+LABELS[purpose]+' on SecurePay.',
    shareNote.trim()?'Why: '+shareNote.trim()+'.':'',role.trim()?'Proposed role: '+role.trim()+'.':'',
    governance?'This includes proposed governance responsibilities which you must review and explicitly accept.':'',
    'If you already have a KS Number, you can use it. If not, you can get one through SecurePay’s normal signup. Nothing is accepted automatically.',
    'This is a personal message, not a SecurePay invitation link. Ask me for the invitation link when ready.'].filter(Boolean).join('\n');
  async function checkKs(){
    if(!onCheckKs||!ks.trim()||ksBusy)return;
    const sequence=++ksLookupSequence.current;
    const requested=ks.trim().toUpperCase().replace(/\s+/g,'');
    setKsBusy(true);setError('');setIdentity(null);
    try{const result=await onCheckKs(requested);if(sequence===ksLookupSequence.current)setIdentity(result);}
    catch{if(sequence===ksLookupSequence.current)setError('Could not check that KS Number. Please try again. No one was added.');}
    finally{setKsBusy(false);}
  }
  const names=people.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean).slice(0,20);
  const canPrepare=!!people.trim()&&!busy&&(!governance||!!role.trim()&&!!governanceDuties.trim());
  async function prepare(){
    if(!canPrepare)return;
    setBusy(true);setError('');setSent(false);
    const message=['Help me prepare '+LABELS[purpose]+' invitations, not send them.',
      'Proposed invitees: '+names.join('; ')+'.',
      role.trim()?'Proposed role or contribution: '+role.trim()+'.':'',
      identity?.status==='RESOLVED'?'Lookup-only KS identity: '+(identity.canonicalKsNumber||ks)+', '+(identity.displayName||'name not provided')+'.':'',
      governance?'Proposed governance role: '+role.trim()+'. Responsibilities and decision authority: '+governanceDuties.trim()+'. Explicit acceptance required before assuming this role.':'',
      note.trim()?'Context: '+note.trim()+'.':'',
      purpose==='agreement'?'Check who must agree, the draft readiness, and the specific invitation permissions. Do not imply acceptance.':
      purpose==='circle'?'Circle membership is distinct from Trust Project membership. Respect Circle visibility and steward permission.':
      purpose==='trust'?'Trust Project membership requires explicit acceptance and cannot be created by signing in. Do not promise referral entitlement.':
      'Check project participation requirements, organiser authority and consent; do not invite or publish yet.',
      'Ask only the next material question and show a short invitation draft for review. Never claim a message was sent.'].filter(Boolean).join('\n');
    try{await onPrepare(message);setSent(true);}catch{setError('Could not confirm KS001 received this request. Check Chat before retrying.');}
    finally{setBusy(false);}
  }
  if(localPreview)return <section aria-label="People and invitations" data-phase3-people className="space-y-4 text-sm">
    <h3 className="font-display text-lg font-semibold text-forest-900">Who is involved?</h3>
    <p className="text-xs leading-5 text-sand-700">Add a proposed person. A KS Number alone does not verify identity or give consent.</p>
    <label className="block text-xs font-semibold">Name or KS Number
      <input aria-label="Proposed person's name or KS Number" value={people} onChange={e=>{setPeople(e.target.value);setSent(false);}}
        maxLength={120} placeholder="e.g. KS002 or a person's name" className="mt-2 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>
    <label className="block text-xs font-semibold">What will they do?
      <select aria-label="Proposed person's role" value={role} onChange={e=>setRole(e.target.value)}
        className="mt-2 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm">
        <option value="">Choose a role</option>
        {['Recipient','Buyer','Seller','Provider','Witness','Organiser','Other'].map(x=><option key={x}>{x}</option>)}
      </select>
    </label>
    {role==='Other'&&<label className="block text-xs">Describe their role
      <input value={note} maxLength={100} onChange={e=>setNote(e.target.value)} aria-label="Describe proposed role"
        className="mt-2 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>}
    <button type="button" disabled={!people.trim()||!role.trim()||(role==='Other'&&!note.trim())} onClick={()=>{
      const who=people.trim(),proposed=role==='Other'?note.trim():role;
      onLocalProposal?.('Person: '+who+' · Role: '+proposed+' · '+(/^KS[0-9A-Z-]+$/i.test(who)?'KS identity not verified':'Identity not verified')+' · Participation not accepted');
      setSent(true);setPeople('');setRole('');setNote('');
    }} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">Add proposed person locally</button>
    {sent&&<p role="status" className="text-xs text-forest-800">Proposed person added to SecurePay Check. You can edit or remove them there.</p>}
    <p className="text-xs leading-5 text-sand-700">A specific authorised KS lookup requires sign-in and a live conversation. No invitation was sent. No membership, consent, Agreement party or acceptance was created.</p>
  </section>;
  return <section aria-label="People and invitations" className="space-y-3 text-sm">
    <p className="font-semibold">Who would you like to involve?</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Invitation purpose">
      {(Object.keys(LABELS) as Purpose[]).map(key=><button key={key} type="button" onClick={()=>{setPurpose(key);setSent(false);}}
        className={purpose===key?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 bg-white px-3 py-2 text-xs'}>{LABELS[key]}</button>)}
    </div>
    {purpose==='agreement'&&agreementPeople.length>0&&<div className="rounded-xl bg-cream-50 p-2">
      <p className="mb-2 text-xs text-sand-600">Already mentioned in your Agreement</p>
      <div className="flex flex-wrap gap-2">{agreementPeople.slice(0,8).map((person,index)=>{
        const name=typeof person==='string'?person:person.name;
        const proposedRole=typeof person==='string'?null:person.role;
        return <button type="button" key={index} onClick={()=>{
          setPeople(previous=>[previous,name].filter(Boolean).join('\n'));
          if(proposedRole&&!role.trim())setRole(proposedRole);
        }} className="rounded-full border border-cream-200 bg-white px-3 py-2 text-xs">
          {name}{proposedRole?' · '+proposedRole:''}
        </button>;
      })}</div>
    </div>}
    <div className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-3">
      <p className="text-sm font-semibold">Already has a KS Number?</p>
      <p className="text-xs text-sand-600">Enter the number they shared with you, for example KS003. We will check the SecurePay record, not their physical identity.</p>
      <div className="flex gap-2">
        <input aria-label="KS Number" value={ks} onChange={e=>{setKs(e.target.value);setIdentity(null);ksLookupSequence.current++;}} placeholder="e.g. KS003" maxLength={40}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-cream-200 bg-white px-3 text-sm"/>
        <button type="button" onClick={()=>void checkKs()} disabled={!onCheckKs||ksBusy||!ks.trim()} className="rounded-full border border-cream-200 bg-white px-3 text-xs disabled:opacity-40">{ksBusy?'Checking…':'Check KS Number'}</button>
      </div>
      {identity&&<div role="status" className="text-xs">
        <p className="font-semibold">{identity.status==='RESOLVED'?'KS Number confirmed':identity.status==='MALFORMED_KS_NUMBER'?'Check the format (e.g. KS003)':identity.status==='NOT_FOUND'?'We could not confirm that KS Number':identity.status==='UNSUPPORTED'?'KS Number check unavailable right now':'This KS Number cannot be used here right now'}</p>
        {identity.status==='RESOLVED'&&<p>{identity.displayName||'Name not provided'} · {identity.canonicalKsNumber||ks} · Lookup only</p>}
        <p>This confirms only the SecurePay KS record. It does not prove who is holding the phone, add the person, invite them or show acceptance.</p>
        {identity.status==='RESOLVED'&&<button type="button" onClick={()=>setPeople(current=>[current,identity.canonicalKsNumber||ks].filter(Boolean).join('\n'))}
          className="mt-2 rounded-full border border-cream-200 bg-white px-3 py-2">Use as proposed invitee</button>}
      </div>}
      {!onCheckKs&&<p className="text-xs text-sand-600">Start a live KS001 conversation to check identity status.</p>}
    </div>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={governance} onChange={e=>{setGovernance(e.target.checked);if(e.target.checked)setDetailsOpen(true);}}/>
      This invitation proposes a governance or decision-making role requiring explicit acceptance
    </label>
    {governance&&<div className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-3" aria-label="Governance role details">
      <p className="text-xs font-semibold">Governance role · acceptance required</p>
      <label className="block text-xs">Proposed position
        <input value={role} onChange={e=>setRole(e.target.value)} maxLength={120} placeholder="e.g. Treasurer, Circle steward"
          className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm"/>
      </label>
      <label className="block text-xs">Responsibilities and decision authority
        <textarea value={governanceDuties} onChange={e=>setGovernanceDuties(e.target.value)} maxLength={500} rows={2}
          placeholder="What decisions can this person make, and what must they be accountable for?"
          className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-3 text-sm"/>
      </label>
      <p className="text-xs text-sand-600">The recipient must review and explicitly accept these responsibilities. This does not assign the role yet.</p>
    </div>}
    <button type="button" className="text-xs font-semibold underline" onClick={()=>setNoKs(v=>!v)}>{noKs?'Hide invitation draft':'No KS Number yet? Invite them'}</button>
    {noKs&&<div className="space-y-2 rounded-xl border border-cream-200 p-3">
      <label className="block text-xs">Their name
        <input maxLength={100} value={inviteName} onChange={e=>setInviteName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3" placeholder="First name"/>
      </label>
      <label className="block text-xs">Why are you inviting them? (optional)
        <textarea rows={2} maxLength={300} value={shareNote} onChange={e=>setShareNote(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 p-2" placeholder="Tell them about the work and why their participation matters"/>
      </label>
      {canShare&&<div className="rounded-lg bg-cream-50 p-2 text-xs whitespace-pre-wrap">{whatsappText}</div>}
      <a href={canShare?'https://wa.me/?text='+encodeURIComponent(whatsappText):undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!canShare}
        className={canShare?'inline-block rounded-full bg-forest-800 px-4 py-3 text-xs font-semibold text-white':'pointer-events-none inline-block rounded-full bg-cream-100 px-4 py-3 text-xs text-sand-600'}>Open WhatsApp draft ↗</a>
      <p className="text-xs text-sand-600">They can use their existing KS Number or sign up through the same SecurePay process. This only opens a personal WhatsApp draft; no official invitation, membership or Agreement is created.</p>
    </div>}
    <button type="button" aria-expanded={detailsOpen} onClick={()=>setDetailsOpen(v=>!v)}
      className="min-h-10 rounded-full border border-cream-200 bg-white px-4 text-xs font-semibold">{detailsOpen?'Less details':'More details'}</button>
    {detailsOpen&&<div className="space-y-3 rounded-xl border border-cream-200 p-3">
    <label className="block text-xs">People or organisations to invite
      <textarea value={people} onChange={e=>{setPeople(e.target.value);setSent(false);}} rows={2} maxLength={800}
        placeholder="Names, KS Numbers or organisations — one per line" className="mt-1 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
    </label>
    {!governance&&<label className="block text-xs">Their role (optional)
      <input value={role} onChange={e=>setRole(e.target.value)} maxLength={120} placeholder="e.g. contractor, contributor, organiser" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>}
    <label className="block text-xs">What should they know? (optional)
      <input value={note} onChange={e=>setNote(e.target.value)} maxLength={300} placeholder="e.g. Please review the scope before agreeing" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>
    </div>}
    <button type="button" disabled={!canPrepare} onClick={()=>void prepare()} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">{busy?'Preparing…':'Prepare with KS001'}</button>
    {sent&&<p role="status" className="rounded-lg bg-cream-50 p-2 text-xs">Request submitted to KS001 Chat. No invitations have been sent.</p>}
    {error&&<p role="alert" className="text-xs text-amber-900">{error}</p>}
    <p className="text-xs text-sand-600">Preparing is not sending. Invitations need the correct authority, recipient review and explicit action. No membership or Agreement acceptance is created here.</p>
  </section>;
}
