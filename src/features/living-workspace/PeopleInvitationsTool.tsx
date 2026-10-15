import { useState } from 'react';
type Purpose='agreement'|'circle'|'project'|'trust';
const LABELS:Record<Purpose,string>={agreement:'Agreement',circle:'Circle',project:'Community project',trust:'Trust Project'};
export function PeopleInvitationsTool({onPrepare,agreementPeople=[]}:{onPrepare:(text:string)=>Promise<void>;agreementPeople?:string[]}){
  const [purpose,setPurpose]=useState<Purpose>('agreement');
  const [people,setPeople]=useState('');
  const [role,setRole]=useState('');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  const names=people.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean).slice(0,20);
  const canPrepare=!!people.trim()&&!busy;
  async function prepare(){
    if(!canPrepare)return;
    setBusy(true);setError('');setSent(false);
    const message=['Help me prepare '+LABELS[purpose]+' invitations, not send them.',
      'Proposed invitees: '+names.join('; ')+'.',
      role.trim()?'Proposed role or contribution: '+role.trim()+'.':'',
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
