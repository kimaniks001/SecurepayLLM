import { useEffect, useState, useSyncExternalStore } from 'react';
import { CalendarDays, GraduationCap, HandHeart, RefreshCw, Users } from 'lucide-react';
import { ensureFreshSession, type SessionStore } from '../../api/securepay/session';
import type { CommunityEventDto, CommunityProjectDto, CommunityServiceOpportunityDto, CommunityObjectResponse, MembershipResponse } from '../../api/securepay/community/dto';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';

type Page = 'live' | 'projects' | 'help' | 'events' | 'learning';
type CommunityRow = CommunityObjectResponse | CommunityProjectDto | CommunityServiceOpportunityDto | CommunityEventDto;
const sections: { id:Page;label:string;Icon:typeof Users }[]=[
  {id:'live',label:'LIVE',Icon:Users},{id:'projects',label:'Projects',Icon:HandHeart},
  {id:'help',label:'Help & skills',Icon:HandHeart},{id:'events',label:'Events',Icon:CalendarDays},
  {id:'learning',label:'Learning',Icon:GraduationCap},
];
const dateLabel=(value:string|null)=>{if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString():null;};

/** The existing Community gateway is the system of record. Never read member
 * sections until the membership endpoint explicitly returns ACTIVE, and never
 * project Circle-only records into Community LIVE.
 */
export function InlineCommunityHub({gateways,session,onOpenFull}:{
  gateways:PreviewWorkspaceGateways;session:SessionStore;onOpenFull:()=>void;
}) {
  const identity=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const [page,setPage]=useState<Page>('live');
  const [membership,setMembership]=useState<{phase:'loading'|'ready'|'error';data:MembershipResponse|null}>({phase:'loading',data:null});
  const [content,setContent]=useState<{phase:'idle'|'loading'|'ready'|'error';items:CommunityRow[]}>({phase:'idle',items:[]});
  const [revision,setRevision]=useState(0);
  const active=identity.status==='signed-in' && membership.phase==='ready' && membership.data?.status==='ACTIVE';
  useEffect(()=>{
    let live=true;
    setMembership({phase:'loading',data:null});setContent({phase:'idle',items:[]});
    if(identity.status!=='signed-in')return;
    void (async()=>{
      try{
        await ensureFreshSession(session,gateways.auth);
        if(!live||session.getSnapshot().status!=='signed-in')return;
        const result=await gateways.community.membership.me();
        if(live)setMembership({phase:'ready',data:result});
      }catch{if(live)setMembership({phase:'error',data:null});}
    })();
    return()=>{live=false;};
  },[identity.status,identity.status==='signed-in'?identity.tokens.refreshToken:null,gateways,session,revision]);

  useEffect(()=>{
    let live=true;
    setContent({phase:'idle',items:[]});
    if(!active || page==='learning')return;
    setContent({phase:'loading',items:[]});
    const call:Promise<CommunityRow[]> = page==='live'?gateways.community.feed(20,0)
      :page==='projects'?gateways.community.projects.list(20,0)
      :page==='help'?gateways.community.serviceOpportunities.list(20,0)
      :gateways.community.events.list(20,0);
    void call.then(rows=>{
      if(live && session.getSnapshot().status==='signed-in')
        setContent({phase:'ready',items:rows.filter(row=>row.circleId===null)});
    }).catch(()=>{if(live)setContent({phase:'error',items:[]});});
    return()=>{live=false;};
  },[active,page,revision,gateways,session]);

  const isLive=(item:CommunityRow):item is CommunityObjectResponse=>'objectType' in item;
  const isProject=(item:CommunityRow):item is CommunityProjectDto=>'purpose' in item;
  const title=(item:CommunityRow)=>item.title;
  const detail=(item:CommunityRow)=>isLive(item)?item.body:isProject(item)?item.purpose:item.description;
  const when=(item:CommunityRow)=>'startsAt' in item?dateLabel(item.startsAt):null;
  return <section data-real-community-hub className="space-y-4" aria-label="Trust Project Community">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-xs uppercase tracking-wider text-sand-600">Trust Project · Community</p>
        <h2 className="font-display text-xl">People make progress together</h2></div>
      <button type="button" onClick={()=>setRevision(r=>r+1)} aria-label="Refresh Community" className="min-h-11 rounded-lg border border-cream-200 px-3"><RefreshCw size={16}/></button>
    </div>
    <p className="text-sm text-sand-700">Learn, contribute skills, discover projects and meet people through shared work. Community membership is an explicit choice, not part of signing in.</p>
    {membership.phase==='loading'&&<p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">Checking Trust Project membership…</p>}
    {membership.phase==='error'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">SecurePay could not verify your membership. Member content is not available.</p>}
    {membership.phase==='ready'&&!active&&<p className="rounded-xl bg-cream-100 p-3 text-sm">Membership: {membership.data?.status??'not joined'}. You can explore the invitation and Join experience, but member content remains protected.</p>}
    <div role="tablist" aria-label="Community sections" className="flex flex-wrap gap-1">
      {sections.map(({id,label,Icon})=><button key={id} type="button" role="tab"
        aria-selected={page===id} onClick={()=>setPage(id)}
        className={`min-h-11 rounded-lg px-3 text-xs ${page===id?'bg-forest-800 text-white':'bg-cream-100'}`}>
        <Icon size={15} className="mr-1 inline"/> {label}
      </button>)}
    </div>
    {active && page==='learning' && <div className="rounded-xl border border-cream-200 p-4 space-y-2">
      <h3 className="text-sm font-semibold">Skills Institute and Masters</h3>
      <p className="text-xs text-sand-700">Training, mentorship and apprenticeship participation are managed by the existing SecurePay Community and Skills Institute. No personal apprentice records or availability are inferred here.</p>
      <button type="button" onClick={onOpenFull} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Open the existing Community experience</button>
    </div>}
    {active && page!=='learning' && <>
      {content.phase==='loading'&&<p role="status" className="text-sm">Loading authorised {sections.find(s=>s.id===page)?.label} records…</p>}
      {content.phase==='error'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">SecurePay could not load this section. Nothing was changed.</p>}
      {content.phase==='ready'&&content.items.length===0&&<p className="rounded-xl bg-cream-100 p-3 text-sm">No public-to-Community records were returned in this section.</p>}
      {content.phase==='ready'&&content.items.map(item=><article key={item.id} className="rounded-xl border border-cream-200 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-sand-600">{item.status} · {page==='live'&&isLive(item)?item.objectType:sections.find(s=>s.id===page)?.label}</p>
        <h3 className="text-sm font-semibold">{title(item)}</h3>
        <p className="whitespace-pre-wrap text-sm text-sand-700">{detail(item)}</p>
        {'locationLabel' in item && item.locationLabel&&<p className="text-xs text-sand-600">Location: {item.locationLabel}</p>}
        {when(item)&&<p className="text-xs text-sand-600">Starts: {when(item)}</p>}
        {'skillsNeeded' in item && item.skillsNeeded.length>0 && <p className="text-xs text-sand-600">Skills: {item.skillsNeeded.join(', ')}</p>}
        <p className="text-xs text-sand-600">From SecurePay · Read only · No participation recorded</p>
      </article>)}
    </>}
    <button type="button" onClick={onOpenFull} className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm">Open full Community and participation</button>
    <p className="text-xs text-sand-600">Circle-only projects and posts stay inside their own Circle. No membership, RSVP, volunteering, Agreement or Money action is implied by this listing.</p>
  </section>;
}
