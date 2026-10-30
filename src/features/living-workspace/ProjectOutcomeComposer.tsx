import { useEffect, useRef, useState } from 'react';
import { BookOpen, ShieldCheck, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { CreateProjectContributionInput, CommunityProjectDto } from '../../api/securepay/community/dto';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import { newPublicOutcome, outcomeChecks, projectIsPublic, publicOutcomeBody,
  type PublicOutcomeDraft, type PublicCostStage } from './projectOutcomeReport';

type Publication={state:'editing'|'publishing'|'uncertain'|'published';key:string|null;body:CreateProjectContributionInput|null;id:string|null};

/** Gate 6: public member narrative sourced from a real Community Project.
 * The Agreement access that mounted this pane NEVER becomes publication
 * permission. The backend independently requires ACTIVE Trust membership.
 * No private Agreement id, filenames, participant info or Money is included.
 */
export function ProjectOutcomeComposer({agreementId,gateways,session,onGoCommunity}:{
 agreementId:string;gateways:PreviewWorkspaceGateways;session:SessionStore;
 onGoCommunity:()=>void;
}) {
 const [open,setOpen]=useState(false);
 const [projects,setProjects]=useState<CommunityProjectDto[]>([]);
 const [loadState,setLoadState]=useState<'idle'|'loading'|'ready'|'unavailable'>('idle');
 const [draft,setDraft]=useState<PublicOutcomeDraft>(newPublicOutcome);
 const [preview,setPreview]=useState(false);
 const [permission,setPermission]=useState(false);
 const [privateCheck,setPrivateCheck]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [publication,setPublication]=useState<Publication>({state:'editing',key:null,body:null,id:null});
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
   setOpen(false);setDraft(newPublicOutcome());setLoadState('idle');setProjects([]);
   setPermission(false);setPrivateCheck(false);setError(null);setPreview(false);
   setPublication({state:'editing',key:null,body:null,id:null});
 },[agreementId,session]);
 const load=async()=>{
   setLoadState('loading');setProjects([]);setError(null);
   try {
     await ensureFreshSession(session,gateways.auth);
     if(session.getSnapshot().status!=='signed-in')throw Error('Sign-in required');
     const member=await gateways.community.membership.me();
     if(member.status!=='ACTIVE')throw Error('An active Trust Project membership is needed to publish.');
     const list=await gateways.community.projects.list(50,0);
     if(!Array.isArray(list))throw Error('Project list not verified');
     if(!alive.current)return;
     setProjects(list.filter(x=>projectIsPublic(x,agreementId)));
     setLoadState('ready');
   }catch {
     if(alive.current){setLoadState('unavailable');setError('Community membership or the public Project list could not be verified. No story can be published from this view.');}
   }
 };
 const selected=projects.find(x=>x.id===draft.projectId)??null;
 const issues=outcomeChecks(draft,selected,agreementId);
 const locked=publication.state==='publishing'||publication.state==='uncertain'||publication.state==='published';
 const update=<K extends keyof PublicOutcomeDraft>(field:K,value:PublicOutcomeDraft[K])=>{
   if(locked)return;
   setDraft(d=>({...d,[field]:value}));
   setPermission(false);setPrivateCheck(false);setPreview(false);
 };
 const setCost=(i:number,field:'description'|'amount'|'stage',value:string)=>{
   if(locked)return;
   setDraft(d=>({...d,costs:d.costs.map((entry,j)=>j===i?{...entry,[field]:value}:entry)}));
   setPermission(false);setPrivateCheck(false);setPreview(false);
 };
 const publish=async()=>{
   if(publication.state==='publishing'||publication.state==='published')return;
   if(publication.state!=='uncertain'&&(!selected||issues.length||!permission||!privateCheck||!preview))return;
   setError(null);
   const sameAttempt=publication.state==='uncertain'&&publication.body&&publication.key;
   const key=sameAttempt?publication.key!:crypto.randomUUID();
   const payload:CreateProjectContributionInput=sameAttempt?publication.body!: {
     storeBusinessKsNumber:null,circleId:null,contributionType:'PROJECT_OUTCOME',
     title:draft.title.trim(),body:publicOutcomeBody(draft),
     originType:'COMMUNITY_PROJECT',originObjectId:selected!.id,
     explicitSafeShare:true,idempotencyKey:key,media:[],
   };
   setPublication({state:'publishing',key,body:payload,id:null});
   try {
     await ensureFreshSession(session,gateways.auth);
     if(session.getSnapshot().status!=='signed-in')throw Error('Session not authorised');
     const membership=await gateways.community.membership.me();
     if(membership.status!=='ACTIVE')throw Error('Trust Project membership no longer active');
     // Recheck the public source immediately before the irreversible public write.
     const recent=await gateways.community.projects.list(50,0);
     if(!recent.some(x=>x.id===payload.originObjectId&&projectIsPublic(x,agreementId)))
       throw Error('The selected public Project is no longer authorised or available');
     const result=await gateways.community.contributions.create(payload);
     if(!result.id||result.title!==payload.title||result.status!=='ACTIVE'
        ||result.circleId!==null||!result.hasOrigin)
       throw Error('Community publication receipt did not match the intended report');
     if(alive.current)setPublication({state:'published',key,body:payload,id:result.id});
   }catch{
     // Retain IDENTICAL key and payload after an unknown network result.
     // A retry cannot silently create a different story with that same key.
     if(alive.current){setPublication({state:'uncertain',key,body:payload,id:null});
       setError('Publication could not be confirmed. Inspect Community Live before retrying. If you retry, SecurePay receives the identical story and idempotency key.');}
   }
 };
 const edit=(field: 'title'|'workDone'|'outcome'|'difficulties'|'lessons'|'nextOpportunity',label:string,rows=3)=>
   <label className="block space-y-1 text-xs text-forest-800">
     <span className="font-semibold">{label}</span>
     {rows===1?<input value={draft[field]} disabled={locked} maxLength={180}
       onChange={e=>update(field,e.target.value)} className="min-h-11 w-full rounded-lg border border-cream-200 p-3 text-sm"/>:
      <textarea rows={rows} disabled={locked} value={draft[field]} maxLength={2400}
       onChange={e=>update(field,e.target.value)} className="w-full rounded-lg border border-cream-200 p-3 text-sm"/>}
   </label>;
 return <section data-gate6-project-outcome aria-label="Share project outcome" className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3">
   <div className="flex items-start gap-2">
     <BookOpen size={20} className="mt-1 shrink-0 text-forest-700"/>
     <div><h2 className="font-display text-lg text-forest-900">What did this work make possible?</h2>
       <p className="text-xs leading-5 text-sand-700">Carry an authorised, member-reported outcome back to Community Live—not the private Agreement record.</p></div>
   </div>
   {!open&&<button type="button" onClick={()=>{setOpen(true);void load();}}
     className="min-h-11 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white">
      Prepare a Community project outcome
   </button>}
   {open&&<div className="space-y-3">
     <p className="text-xs text-sand-700">You choose the public words. SecurePay will not copy the Agreement title, participants, evidence, transactions or amounts.</p>
     {loadState==='loading'&&<p role="status" className="text-xs">Checking membership and public Community Projects…</p>}
     {loadState==='unavailable'&&<div role="alert" className="space-y-2">
       <p className="text-xs text-amber-900">{error}</p>
       <button type="button" onClick={()=>void load()} className="inline-flex min-h-11 gap-1 items-center text-xs underline"><RefreshCw size={14}/> Retry checking permissions</button>
     </div>}
     {loadState==='ready'&&<>
       {projects.length===0?<div className="space-y-2">
         <p className="text-xs text-sand-700">No eligible public Community Project was returned. An Agreement folder or private Circle project cannot be silently published.</p>
         <button type="button" onClick={onGoCommunity} className="min-h-11 text-xs font-semibold underline text-forest-700">Open Community to find or create a public Project</button>
       </div>:<>
       <label className="block space-y-1 text-xs font-semibold text-forest-800">Which existing public Community Project is this about?
         <select disabled={locked} value={draft.projectId} onChange={e=>update('projectId',e.target.value)}
           className="min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm">
           <option value="">Choose a real Community Project</option>
           {projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
         </select>
       </label>
       {selected&&<p className="text-xs text-sand-600">{selected.agreementId===agreementId
         ?'This Community Project references this Agreement. Its private details will not be published.'
         :'This Community Project is not verified as linked to this Agreement. Your story is a separate member report, not an official Agreement outcome.'}</p>}
       {edit('title','Public story title',1)}
       {edit('workDone','What work do you personally know happened?')}
       {edit('outcome','What changed, and what still needs attention?')}
       {edit('difficulties','Difficulties, delays or unresolved concerns (optional)',2)}
       {edit('lessons','What others could learn (optional)',2)}
       <div className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-3">
         <p className="text-sm font-semibold text-forest-900">Public project costs (optional)</p>
         <p className="text-xs text-sand-700">Enter only costs you have permission to disclose. These remain <strong>member-reported</strong>, not verified by SecurePay. Funding, release and actual costs are different facts.</p>
         <label className="block space-y-1 text-xs">Currency code
           <input disabled={locked} value={draft.currency} maxLength={3}
             onChange={e=>update('currency',e.target.value.toUpperCase())}
             className="min-h-11 w-28 rounded-lg border border-cream-200 p-2 text-sm"/>
         </label>
         {draft.costs.map((cost,i)=><div key={i} className="space-y-2 rounded-lg bg-white p-2">
           <input disabled={locked} value={cost.description} maxLength={150} placeholder="Public cost category, not a person's name"
             aria-label={'Cost category '+(i+1)} onChange={e=>setCost(i,'description',e.target.value)}
             className="min-h-11 w-full rounded-lg border border-cream-200 p-2 text-sm"/>
           <div className="flex flex-wrap gap-2 items-center">
             <input disabled={locked} inputMode="decimal" value={cost.amount} placeholder="Amount, e.g. 1200.00"
               aria-label={'Cost amount '+(i+1)} onChange={e=>setCost(i,'amount',e.target.value)}
               className="min-h-11 min-w-0 flex-1 rounded-lg border border-cream-200 p-2 text-sm"/>
             <select disabled={locked} value={cost.stage} aria-label={'Cost basis '+(i+1)}
               onChange={e=>setCost(i,'stage',e.target.value as PublicCostStage)}
               className="min-h-11 rounded-lg border border-cream-200 bg-white p-2 text-xs">
               <option value="ESTIMATED">Estimate</option>
               <option value="INCURRED_REPORTED">Reported incurred</option>
             </select>
             <button type="button" disabled={locked} aria-label={'Remove cost '+(i+1)}
               onClick={()=>update('costs',draft.costs.filter((_,j)=>j!==i))}
               className="min-h-11 min-w-11 inline-flex items-center justify-center border rounded-lg"><Trash2 size={16}/></button>
           </div>
         </div>)}
         <button type="button" disabled={locked||draft.costs.length>=8}
           onClick={()=>update('costs',[...draft.costs,{description:'',amount:'',stage:'ESTIMATED'}])}
           className="min-h-11 inline-flex gap-1 items-center text-xs font-semibold text-forest-800 underline"><Plus size={14}/> Add a public cost category</button>
       </div>
       {edit('nextOpportunity','What opportunity could follow? (optional, not a promised job)',2)}
       {issues.length>0&&<div role="status" className="rounded-lg bg-cream-50 p-3">
         <p className="text-xs font-semibold">Before sharing</p>
         <ul className="mt-1 list-disc pl-4 space-y-1 text-xs text-sand-700">{issues.map((x,i)=><li key={i}>{x}</li>)}</ul>
       </div>}
       <button type="button" disabled={locked||issues.length>0}
         onClick={()=>setPreview(value=>!value)}
         className="min-h-11 rounded-lg border border-forest-300 px-3 text-xs font-semibold text-forest-800">
         {preview?'Hide public preview':'Review exactly what Community will see'}
       </button>
       {preview&&issues.length===0&&<div data-gate6-public-preview className="space-y-2 rounded-xl bg-[#f2f6f0] p-3">
         <p className="text-xs font-semibold">Public preview · Member-reported, not certified</p>
         <p className="text-sm font-semibold">{draft.title.trim()}</p>
         <p className="whitespace-pre-wrap break-words text-xs leading-5">{publicOutcomeBody(draft)}</p>
       </div>}
       <label className="flex items-start gap-2 text-xs leading-5">
         <input type="checkbox" disabled={locked||issues.length>0} checked={privateCheck}
           onChange={e=>setPrivateCheck(e.target.checked)} className="mt-1"/>
         I have removed private Agreement references, people’s identity/contact details, payment records, precise private location and restricted photographs/documents from this story.
       </label>
       <label className="flex items-start gap-2 text-xs leading-5">
         <input type="checkbox" disabled={locked||issues.length>0} checked={permission}
           onChange={e=>setPermission(e.target.checked)} className="mt-1"/>
         I have the authority to share this account and the public cost categories. Other participants’ consent is required for their identifiable details. I understand these are my reported outcomes, not SecurePay-certified project expenses.
       </label>
       {publication.state==='published'?<div role="status" className="space-y-2 rounded-xl bg-cream-50 p-3">
         <p className="text-xs text-forest-900">Community confirmed the outcome was published. It did not complete an Agreement or move Money.</p>
         <button type="button" onClick={onGoCommunity}
           className="min-h-11 text-xs font-semibold text-forest-800 underline">Return to Community Live</button>
       </div>:
       <button type="button" disabled={publication.state==='publishing'||(publication.state!=='uncertain'&&(!preview||issues.length>0||!permission||!privateCheck))}
         onClick={()=>void publish()} className="min-h-11 w-full rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-40">
         {publication.state==='publishing'?'Publishing to Community…':publication.state==='uncertain'?'Retry identical publication':'Publish this member-reported outcome'}
       </button>}
       {publication.state==='uncertain'&&<p role="alert" className="text-xs text-amber-900">{error}</p>}
       {publication.state==='uncertain'&&<button type="button" onClick={onGoCommunity}
         className="min-h-11 text-xs text-forest-800 underline">Inspect Community Live before retrying</button>}
       </>}
     </>}
     <p className="flex gap-2 text-xs leading-5 text-sand-600"><ShieldCheck size={15} className="shrink-0"/>
       This action publishes a Community contribution only. The real Agreement, beneficiaries, Money balances, evidence and employment terms remain private and unchanged.</p>
   </div>}
 </section>;
}
