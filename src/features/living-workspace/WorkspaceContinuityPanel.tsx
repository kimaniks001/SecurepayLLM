import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Bookmark, FolderOpen, Globe2, Layers3, LockKeyhole, RefreshCw, Users } from 'lucide-react';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { SavedBuildDto } from '../../api/securepay/agent/dto';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import { storeAgreementEntry, storeDreamEntry, storeCircleEntry } from '../experience/entryIntent';
import type { VisionDreamDto } from '../../api/securepay/visiondreams/dto';
import type { CircleResponse, CommunityObjectResponse, MembershipResponse } from '../../api/securepay/community/dto';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';

export type WorkspaceArea = 'work'|'vision'|'circle'|'community';
type LoadState<T> = { status:'idle'|'loading'|'ready'|'error'; items:T[]; error:string|null };
const empty = <T,>():LoadState<T>=>({status:'idle',items:[],error:null});
function formatDate(value:string){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleDateString():'';}
function errorLabel(error:unknown):string{
  if(error instanceof Error && /Authentication required|401/.test(error.message))return 'Please sign in again.';
  return 'SecurePay could not load this section. You can try again.';
}

/**
 * Read-only structural continuity backed by the existing server authorities.
 * No private data is cached in localStorage, no membership or ownership inferred,
 * no client-side Circle access grants, no demo cards passed off as real.
 */
export function WorkspaceContinuityPanel({area,gateways,session,onSignIn,onResume}:{
 area:WorkspaceArea;
 gateways?:PreviewWorkspaceGateways;
 session:SessionStore;
 onSignIn:()=>void;
 onResume:(conversationId:string)=>Promise<void>;
}){
 const identity=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
 const signedIn=identity.status==='signed-in';
 const [saved,setSaved]=useState<LoadState<SavedBuildDto>>(empty);
 const [agreements,setAgreements]=useState<LoadState<CurrentUserAgreementSummaryResponse>>(empty);
 const [dreams,setDreams]=useState<LoadState<VisionDreamDto>>(empty);
 const [circles,setCircles]=useState<LoadState<CircleResponse>>(empty);
 const [feed,setFeed]=useState<LoadState<CommunityObjectResponse>>(empty);
 const [member,setMember]=useState<{status:'idle'|'loading'|'ready'|'error';data:MembershipResponse|null}>({status:'idle',data:null});
 const [busy,setBusy]=useState<string|null>(null);
 const [actionError,setActionError]=useState<string|null>(null);
 const [revision,setRevision]=useState(0);

 const reload=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{
   // Session is the one auth boundary. Never retain another identity's records.
   setSaved(empty());setAgreements(empty());setDreams(empty());setCircles(empty());setFeed(empty());
   setMember({status:'idle',data:null});setActionError(null);
   if(!signedIn||!gateways)return;
   let stopped=false;
   const apply=<T,>(setter:(next:LoadState<T>)=>void,p:Promise<T[]>)=>{
     setter({status:'loading',items:[],error:null});
     void p.then(items=>{if(!stopped)setter({status:'ready',items,error:null});})
       .catch(error=>{if(!stopped)setter({status:'error',items:[],error:errorLabel(error)});});
   };
   void (async()=>{
     try{await ensureFreshSession(session,gateways.auth);}catch{return;}
     if(stopped||session.getSnapshot().status!=='signed-in')return;
     // Load only the currently requested domain. This keeps Circle/member data
     // off unrelated screens and avoids expensive background access checks.
     if(area==='work') {
       apply(setSaved,gateways.agent.listSavedBuilds(20,0));
       apply(setAgreements,gateways.agreements.currentUserAgreements(0,20).then(page=>page.items));
     }
     if(area==='vision') apply(setDreams,gateways.dreams.mine());
     if(area==='circle') apply(setCircles,gateways.community.circles.mine(20,0));
     if(area==='community') {
       setMember({status:'loading',data:null});
       void gateways.community.membership.me().then(m=>{
         if(stopped)return;
         setMember({status:'ready',data:m});
         if(m.status==='ACTIVE') apply(setFeed,gateways.community.feed(15,0));
       }).catch(()=>{if(!stopped)setMember({status:'error',data:null});});
     }
   })();
   return ()=>{stopped=true;};
 },[signedIn,gateways,session,area,revision]);
 const resume=async(item:SavedBuildDto)=>{
   if(!gateways||!signedIn||busy)return;
   setBusy(item.savedBuildId);setActionError(null);
   try {
     await ensureFreshSession(session,gateways.auth);
     const savedRecord=await gateways.agent.resumeSavedBuild(item.savedBuildId);
     if(savedRecord.conversationId!==item.conversationId)throw new Error('Saved conversation identity mismatch');
     await onResume(savedRecord.conversationId);
   }catch(error){setActionError(errorLabel(error));}
   finally{setBusy(null);}
 };
 const openRealAgreement=(id:string)=>{
   storeAgreementEntry(id);
   window.location.hash='#/';
 };
 const openRealDream=(id:string)=>{
   storeDreamEntry(id);
   window.location.hash='#/vision';
 };
 const openRealCircle=(id:string)=>{
   storeCircleEntry(id);
   window.location.hash='#/community';
 };
 const route=(name:'vision'|'community')=>{
   // Existing first-party journeys retain their own handlers and server permissions.
   window.location.hash=name==='vision'?'#/vision':'#/community';
 };
 if(!gateways)return <p className="rounded-xl bg-cream-100 p-4 text-sm" role="status">Live SecurePay workspace services are not configured for this preview. No personal work is loaded.</p>;
 if(!signedIn)return <section aria-label="Your saved work" className="space-y-3 rounded-xl border border-cream-200 p-4">
   <p className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole size={17}/> Your work belongs to you</p>
   <p className="text-xs leading-5 text-sand-700">You can explore without signing in. Sign in with your KS Number to read your own saved Agreement builds, Dreams and Circles. Signing in does not join the Trust Project.</p>
   <button type="button" onClick={onSignIn} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white">Sign in to see my work</button>
 </section>;
 return <section aria-label="Your real saved work" className="space-y-3" data-live-workspace-continuity>
   <div className="flex items-center justify-between gap-2"><div><p className="text-xs uppercase tracking-wider text-sand-600">Your SecurePay records</p>
   <p className="text-xs text-sand-700">From your signed-in identity, not demonstration data</p></div>
   <button title="Reload my work" aria-label="Reload saved work" type="button" onClick={reload} className="min-h-11 rounded-lg border border-cream-200 px-3"><RefreshCw size={16}/></button></div>
   {actionError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs">{actionError}</p>}
   {area==='work' && <div className="space-y-2">
     <p className="flex items-center gap-2 text-sm font-semibold"><Bookmark size={17}/> Saved Agreement builds</p>
     {saved.status==='loading' && <p role="status" className="text-xs">Loading your saved conversations…</p>}
     {saved.status==='error' && <p role="alert" className="text-xs">{saved.error}</p>}
     {saved.status==='ready' && saved.items.length===0 && <p className="text-xs text-sand-700">No saved Agreement builds yet. This does not mean you have no Agreements.</p>}
     {saved.status==='ready' && saved.items.map(b=><article key={b.savedBuildId} className="rounded-xl border border-cream-200 p-3">
       <p className="text-sm font-semibold">{b.title||'Saved conversation'}</p>
       <p className="mt-1 text-xs text-sand-700">{b.sufficiencyState} · Updated {formatDate(b.buildUpdatedAt)}</p>
       <button type="button" disabled={busy!==null} onClick={()=>void resume(b)} className="mt-2 min-h-11 rounded-lg bg-cream-100 px-3 text-xs disabled:opacity-50">{busy===b.savedBuildId?'Opening…':'Continue the same conversation'}</button>
     </article>)}
   </div>}
   {area==='work' && <div className="mt-5 space-y-2" data-real-agreements>
     <p className="flex items-center gap-2 text-sm font-semibold"><FolderOpen size={17}/> Your Agreements</p>
     <p className="text-xs text-sand-700">Established Agreement records are separate from saved KS001 drafts. SecurePay determines each Agreement's status, participant access and next action.</p>
     {agreements.status==='loading' && <p role="status" className="text-xs">Loading your Agreements…</p>}
     {agreements.status==='error' && <p role="alert" className="text-xs">{agreements.error}</p>}
     {agreements.status==='ready' && agreements.items.length===0 && <p className="text-xs text-sand-700">No Agreements returned for this identity.</p>}
     {agreements.status==='ready' && agreements.items.map(a=><article key={a.agreementId} className="rounded-xl border border-cream-200 p-3">
       <p className="text-sm font-semibold">{a.title}</p>
       <p className="mt-1 text-xs text-sand-700">{a.publicReference} · {a.status}</p>
       <p className="mt-1 text-xs text-sand-600">Updated {formatDate(a.updatedAt)}</p>
       <button type="button" onClick={()=>openRealAgreement(a.agreementId)} className="mt-2 min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open this Agreement</button>
     </article>)}
   </div>}
   {area==='vision' && <div className="space-y-2">
     <p className="flex items-center gap-2 text-sm font-semibold"><Layers3 size={17}/> My saved Dreams</p>
     {dreams.status==='loading' && <p role="status" className="text-xs">Loading your Dreams…</p>}
     {dreams.status==='error' && <p role="alert" className="text-xs">{dreams.error}</p>}
     {dreams.status==='ready' && dreams.items.length===0 && <p className="text-xs">No saved Dreams found for this identity.</p>}
     {dreams.status==='ready' && dreams.items.map(d=><article key={d.dreamId} className="rounded-xl border border-cream-200 p-3">
       <p className="text-sm font-semibold">{d.title}</p><p className="mt-1 text-xs text-sand-700">Version {d.version} · Updated {formatDate(d.updatedAt)}</p>
       <p className="mt-1 text-xs text-sand-700">{d.locked?'Locked · read under existing Vision permissions':'Saved in your private Vision'}</p>
       <button type="button" onClick={()=>openRealDream(d.dreamId)} className="mt-2 min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open this Dream</button>
     </article>)}
     <button type="button" onClick={()=>route('vision')} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open the real Vision Board</button>
   </div>}
   {area==='circle' && <div className="space-y-2">
     <p className="flex items-center gap-2 text-sm font-semibold"><Users size={17}/> My Circles</p>
     {circles.status==='loading' && <p role="status" className="text-xs">Loading your Circles…</p>}
     {circles.status==='error' && <p role="alert" className="text-xs">{circles.error}</p>}
     {circles.status==='ready' && circles.items.length===0 && <p className="text-xs">No Circles available under your current permissions.</p>}
     {circles.status==='ready' && circles.items.map(circle=><article key={circle.id} className="rounded-xl border border-cream-200 p-3">
       <p className="text-sm font-semibold">{circle.name}</p>
       <p className="mt-1 text-xs text-sand-700">{circle.purpose}</p>
       <p className="mt-1 text-xs text-sand-700">{circle.status} · {circle.visibility} · {circle.memberCount} members</p>
       <p className="mt-2 text-xs text-sand-600">Proposals and decisions stay in the authorised Circle journey.</p>
       <button type="button" onClick={()=>openRealCircle(circle.id)} className="mt-2 min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open this Circle</button>
     </article>)}
     <button type="button" onClick={()=>route('community')} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open real Circles and governance</button>
   </div>}
   {area==='community' && <div className="space-y-2">
     <p className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={17}/> The Trust Project</p>
     {member.status==='loading' && <p role="status" className="text-xs">Checking your membership…</p>}
     {member.status==='error' && <p role="alert" className="text-xs">Membership status is unavailable; LIVE content is withheld.</p>}
     {member.status==='ready' && member.data?.status!=='ACTIVE' && <p className="text-xs">Membership: {member.data?.status??'Not a member'}. Signing in does not create membership or access to member content.</p>}
     {member.status==='ready' && member.data?.status==='ACTIVE' && <>
       <p className="text-xs">Your Trust Project membership is ACTIVE.</p>
       {feed.status==='loading' && <p className="text-xs">Loading authorised LIVE posts…</p>}
       {feed.status==='error' && <p role="alert" className="text-xs">{feed.error}</p>}
       {feed.status==='ready' && feed.items.length===0 && <p className="text-xs">No LIVE posts returned.</p>}
       {feed.status==='ready' && feed.items.filter(post=>post.circleId===null).map(post=><article key={post.id} className="rounded-xl border border-cream-200 p-3">
         <p className="text-sm font-semibold">{post.title}</p><p className="mt-1 text-xs text-sand-700">{post.body}</p>
         <p className="mt-1 text-xs text-sand-600">LIVE · {post.authorDisplayName||'Member'}</p>
       </article>)}
     </>}
     <button type="button" onClick={()=>route('community')} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open Trust Project Community</button>
   </div>}
   <p className="flex gap-2 text-xs text-sand-600"><FolderOpen size={14}/> All records and permissions come from existing SecurePay endpoints. No cross-workspace sharing is implied.</p>
 </section>;
}
