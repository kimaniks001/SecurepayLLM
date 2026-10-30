import { useState } from 'react';
import { ClipboardCheck, HeartHandshake, HardHat, ShieldCheck } from 'lucide-react';
import {
  missingProjectOpportunityFacts, newProjectOpportunityIntent,
  projectOpportunityInvitation, type ProjectOpportunityIntent,
} from './projectOpportunityIntent';

/** The existing Community OPPORTUNITY post is the invitation source.
 * This is a mini material-facts helper, not a second job, Agreement or Money engine. */
export function ProjectOpportunityEditor({onBodyChange,onReadiness}:{
  onBodyChange:(body:string)=>void;
  onReadiness:(ready:boolean)=>void;
}) {
  const [draft,setDraft]=useState<ProjectOpportunityIntent>(newProjectOpportunityIntent);
  const [acknowledged,setAcknowledged]=useState(false);
  const missing=missingProjectOpportunityFacts(draft);
  const update=<K extends keyof ProjectOpportunityIntent>(field:K,value:ProjectOpportunityIntent[K])=>{
    const next={...draft,[field]:value};
    setDraft(next);setAcknowledged(false);
    onBodyChange(projectOpportunityInvitation(next));
    onReadiness(false);
  };
  const confirm=(value:boolean)=>{
    setAcknowledged(value);
    onReadiness(value&&missing.length===0);
  };
  const field=(id:keyof ProjectOpportunityIntent,label:string,placeholder:string,rows=2)=>{
    const value=draft[id];
    if(typeof value!=='string')return null;
    return <label key={id} className="block space-y-1 text-sm">
      <span className="text-xs font-medium text-forest-800">{label}</span>
      {rows===1?<input value={value} maxLength={240}
        onChange={event=>update(id,event.target.value as never)} placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>:
        <textarea value={value} maxLength={1400} rows={rows}
          onChange={event=>update(id,event.target.value as never)} placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm"/>}
    </label>;
  };
  return <section data-gate3-project-invitation-editor aria-label="Prepare a project opportunity"
    className="rounded-2xl border border-forest-200 bg-[#f7f9f4] p-4 space-y-3">
    <div className="flex items-center gap-2">
      <ClipboardCheck size={18} className="text-forest-700"/>
      <h2 className="font-display text-lg text-forest-900">Invite people to a real project</h2>
    </div>
    <p className="text-xs leading-5 text-sand-700">Describe the opportunity truthfully.
      This is a public invitation to express interest, not a SecureLink or an accepted job.
      KS001 will help examine the work after you open this proposal in My Work.</p>
    <div role="group" aria-label="Kind of project participation" className="grid grid-cols-2 gap-2">
      <button type="button" aria-pressed={draft.kind==='PAID_WORK'}
        onClick={()=>update('kind','PAID_WORK')}
        className={`min-h-11 rounded-lg border px-3 text-xs font-semibold ${draft.kind==='PAID_WORK'?'bg-forest-800 text-white':'bg-white text-forest-800'}`}>
        <HardHat size={16} className="mr-1 inline"/> Paid work
      </button>
      <button type="button" aria-pressed={draft.kind==='VOLUNTARY_CAUSE'}
        onClick={()=>update('kind','VOLUNTARY_CAUSE')}
        className={`min-h-11 rounded-lg border px-3 text-xs font-semibold ${draft.kind==='VOLUNTARY_CAUSE'?'bg-forest-800 text-white':'bg-white text-forest-800'}`}>
        <HeartHandshake size={16} className="mr-1 inline"/> Join a cause
      </button>
    </div>
    {field('purpose','What is the project trying to achieve?','e.g. Restore the community rainwater tank')}
    {field('duties',draft.kind==='PAID_WORK'?'What will the paid workers do?':'What will volunteers do?',
      'Describe responsibilities, deliverables and limitations')}
    {field('peopleNeeded','How many people, or what help is needed?','e.g. Four site assistants; beginners welcome',1)}
    {field('schedule','Dates, hours and duration','When does the work start and end?')}
    {field('supervisor','Who will coordinate and supervise?','Name the role or responsible organiser',1)}
    {field('safety','Safety, equipment and working conditions','Describe site risks, training and protective equipment')}
    {draft.kind==='PAID_WORK'&&<>
      {field('compensation','Proposed pay, currency, basis and payment timing',
        'e.g. KES [amount] per day, 8 hours, payment after approved work')}
      <label className="block space-y-1 text-xs">
        <span className="font-medium text-forest-800">What can the organiser say about funding?</span>
        <select value={draft.funding} onChange={e=>update('funding',e.target.value as ProjectOpportunityIntent['funding'])}
          className="min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm">
          <option value="NOT_CONFIRMED">Funding not confirmed</option>
          <option value="ORGANISER_REPORTS_AVAILABLE">I report funds available (not verified by SecurePay)</option>
        </select>
      </label>
      <p className="flex gap-2 text-xs leading-5 text-amber-900">
        <ShieldCheck size={16} className="shrink-0"/> SecurePay has not verified that this pay is lawful,
        fair or funded. KS001 and the authorised Money/Agreement authorities must examine it.
      </p>
    </>}
    {field('joining','How will people be considered and selected?',
      'e.g. Express interest here. The project head chooses four applicants. Each selected person reviews and accepts their own terms.')}
    {missing.length>0&&<div className="rounded-lg bg-white p-3" role="status">
      <p className="text-xs font-semibold text-forest-800">Still needs clarification</p>
      <ul className="mt-1 list-disc pl-4 text-xs text-sand-700 space-y-1">
        {missing.map(x=><li key={x}>{x}</li>)}
      </ul>
    </div>}
    <label className="flex items-start gap-2 rounded-lg border border-cream-200 bg-white p-3 text-xs leading-5 text-forest-800">
      <input type="checkbox" className="mt-1" checked={acknowledged}
        disabled={missing.length>0} onChange={e=>confirm(e.target.checked)}/>
      <span>I understand this publishes an invitation to express interest only.
        No applicant is selected, no Agreement has been accepted and no payment is secured by publishing.</span>
    </label>
    <details>
      <summary className="cursor-pointer text-xs font-semibold text-forest-800">Review public invitation text</summary>
      <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-6">
        {projectOpportunityInvitation(draft)}
      </p>
    </details>
    {acknowledged&&missing.length===0&&<p role="status" className="text-xs text-forest-700">
      Ready to publish as a proposed opportunity. Then select “Review with KS001” to examine it under the 12 Principles.</p>}
  </section>;
}
