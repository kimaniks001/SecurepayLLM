import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { CalendarDays, Compass, GraduationCap, HandHeart, RefreshCw, Search, Users, MessageCircle, ArrowUpRight, ShieldCheck, BookOpen } from 'lucide-react';
import { ensureFreshSession, type SessionStore } from '../../api/securepay/session';
import type {
  ApprenticeshipProjectDto, CirclePendingInvitationView, CircleResponse, CommunityEventDto,
  CommunityProjectDto, CommunityServiceOpportunityDto, CommunityObjectResponse, MembershipResponse, ProjectContributionDto,
} from '../../api/securepay/community/dto';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import { communityLiveOnly, communityOpenOpportunities, communityVisibleProjects, communityPublicEvents,
  communityApprenticeships, communityLiveContributions, discoverableCircles, invitedCircleCards, matchesCommunityText } from './communityDiscovery';
import { buildCommunityTimeline, type CommunityTimelineGroup } from './communityTimeline';
import { CommunityAttachmentView } from '../community/InlineCommunityMedia';

type Page='home'|'live'|'circles'|'help'|'projects'|'events'|'learning';
type Section='live'|'contributions'|'circles'|'invitations'|'help'|'projects'|'events'|'learning';
type Rows={
  live:CommunityObjectResponse[];contributions:ProjectContributionDto[];
  circles:CircleResponse[];invitations:CirclePendingInvitationView[];
  help:CommunityServiceOpportunityDto[];projects:CommunityProjectDto[];
  events:CommunityEventDto[];learning:ApprenticeshipProjectDto[];
};
type RowState<T>={status:'idle'|'loading'|'ready'|'error';items:T[]};
type Collections={ [K in Section]:RowState<Rows[K][number]> };
const empty=():Collections=>({
  live:{status:'idle',items:[]},contributions:{status:'idle',items:[]},
  circles:{status:'idle',items:[]},invitations:{status:'idle',items:[]},
  help:{status:'idle',items:[]},projects:{status:'idle',items:[]},
  events:{status:'idle',items:[]},learning:{status:'idle',items:[]},
});
/** Preview-only fixtures for the exact Community discovery UI.
 * They are in-memory illustrations, not authenticated membership or API data.
 * Never pass these records to Community gateways or store them as user data. */
const demonstration=():Collections=>({
  live:{status:'ready',items:[
    {id:'sample-live-1',circleId:null,status:'ACTIVE',objectType:'WORK_STORY',
      authorDisplayName:'Illustrative member',title:'A workshop sharing practical skills',
      body:'An example of members documenting a repair, what they learned, and who could help next.',
      locationLabel:'Illustrative community story'} as CommunityObjectResponse,
    {id:'sample-live-2',circleId:null,status:'ACTIVE',objectType:'QUESTION',
      authorDisplayName:'Illustrative member',title:'What makes a delivery verifiable?',
      body:'A demonstration discussion about photographs, dates, locations and clear handover responsibilities.',
      locationLabel:'Sample · no real author'} as CommunityObjectResponse,
  ]},
  contributions:{status:'ready',items:[
    {id:'sample-contribution-1',circleId:null,status:'ACTIVE',title:'What a repair taught our team',
      body:'An illustrative lesson from neighbours learning together.',contributionType:'LESSON_LEARNED',
      hasOrigin:false,createdAt:'2026-10-20T09:00:00+03:00'} as ProjectContributionDto,
  ]},
  circles:{status:'ready',items:[
    {id:'sample-circle-1',name:'Neighbourhood Garden Circle',purpose:'Plan a shared garden day and learn practical skills together.',
      status:'ACTIVE',visibility:'PUBLIC',membershipMode:'REQUEST_TO_JOIN',
      categoryLabel:'Neighbourhood',locationLabel:'Illustrative Circle'} as CircleResponse,
    {id:'sample-circle-2',name:'Repair & Making Circle',purpose:'Share tools, questions and experience before starting a community repair.',
      status:'ACTIVE',visibility:'PUBLIC',membershipMode:'OPEN',categoryLabel:'Practical skills',
      locationLabel:'Illustrative Circle'} as CircleResponse,
  ]},
  invitations:{status:'ready',items:[]},
  help:{status:'ready',items:[
    {id:'sample-help-1',circleId:null,status:'OPEN',title:'Help plan a school furniture repair',
      description:'Illustrative service opportunity: list the tools, skills and delivery conditions needed before anyone commits.',
      locationLabel:'Sample location',skillsNeeded:['Carpentry','Coordination'],startsAt:null} as CommunityServiceOpportunityDto,
    {id:'sample-help-2',circleId:null,status:'OPEN',title:'Document a water project site',
      description:'A sample opportunity to photograph and verify existing conditions, then ask a qualified person for advice.',
      locationLabel:'Illustrative locality',skillsNeeded:['Photography','Project support'],startsAt:null} as CommunityServiceOpportunityDto,
  ]},
  projects:{status:'ready',items:[
    {id:'sample-project-1',circleId:null,status:'ACTIVE',title:'Community rainwater storage idea',
      purpose:'Compare tank locations, practical capacity and responsibility for inspection before arranging work.',
      locationLabel:'Sample project · no participants or funds'} as CommunityProjectDto,
    {id:'sample-project-2',circleId:null,status:'ACTIVE',title:'Shared neighbourhood clean-up',
      purpose:'Explore safe roles, materials, dates and consent for a collective improvement day.',
      locationLabel:'Sample · no event scheduled'} as CommunityProjectDto,
  ]},
  events:{status:'ready',items:[
    {id:'sample-event-1',circleId:null,status:'CONFIRMED',
      title:'How to document work fairly',description:'Illustrative gathering about evidence, agreed tasks and respectful collaboration.',
      startsAt:null,locationLabel:'Sample only · no confirmed time or booking'} as unknown as CommunityEventDto,
  ]},
  learning:{status:'ready',items:[
    {id:'sample-learning-1',circleId:null,status:'PROPOSED',
      title:'Apprenticeship in workshop skills',
      learningGoal:'Learn preparation, safe tools, craftsmanship and the value of reliable evidence from experienced people.'} as ApprenticeshipProjectDto,
    {id:'sample-learning-2',circleId:null,status:'PROPOSED',
      title:'Community project coordination',
      learningGoal:'Discover how a Plug supports people, consent, schedules and practical verification.'} as ApprenticeshipProjectDto,
  ]},
});
const sections=[
  {id:'home',label:'Community Live',Icon:Compass},
  {id:'live',label:'Conversations',Icon:MessageCircle},
  {id:'circles',label:'Circles',Icon:Users},
  {id:'help',label:'Opportunities',Icon:HandHeart},
  {id:'projects',label:'Projects',Icon:HandHeart},
  {id:'events',label:'Events',Icon:CalendarDays},
  {id:'learning',label:'Learning',Icon:GraduationCap},
] as const;
const timelineFilters: ReadonlyArray<{id:'all'|CommunityTimelineGroup;label:string}> = [
  {id:'all',label:'All'}, {id:'stories',label:'Stories'},
  {id:'projects',label:'Projects'}, {id:'opportunities',label:'Opportunities'},
  {id:'learning',label:'Learning'}, {id:'events',label:'Events'},
];
const dateLabel=(value:string|null)=>{if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'}):null;};
function Panel({title,detail,children}:{title:string;detail?:string;children:React.ReactNode}){
  return <section className="min-w-0 space-y-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-[0_9px_22px_-20px_rgba(20,60,40,.35)]">
    <h3 className="font-display text-lg text-forest-900">{title}</h3>
    {detail&&<p className="text-xs leading-5 text-sand-600">{detail}</p>}
    {children}
  </section>;
}
function Empty({what}:{what:string}){
  return <p className="rounded-xl bg-cream-50 p-3 text-xs text-sand-600">
    Nothing confirmed in {what} yet. Explore another space or return later.
  </p>;
}
function Card({label,title,body,detail,onOpen,actionLabel='Explore this Circle'}:{label:string;title:string;body:string;detail?:string|null;onOpen?:()=>void;actionLabel?:string}){
  return <article className="min-w-0 rounded-xl border border-cream-200/80 bg-[#fdfcf9] p-3 space-y-1.5">
    <p className="text-[0.69rem] font-semibold uppercase tracking-wide text-sand-500">{label}</p>
    <h4 className="break-words text-sm font-semibold leading-5 text-forest-900">{title}</h4>
    {body&&<p className="whitespace-pre-wrap break-words text-xs leading-5 text-sand-700">{body}</p>}
    {detail&&<p className="text-xs text-sand-600">{detail}</p>}
    {onOpen&&<button type="button" onClick={onOpen}
      className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-forest-700 underline underline-offset-4">
      {actionLabel} <ArrowUpRight size={14} aria-hidden="true"/>
    </button>}
  </article>;
}

/** Phase 6 is a connected discoverability surface for the existing Community
 * gateway. It has no parallel membership engine, Circle board, post controller,
 * volunteer registry or booking logic. Community authority stays server-side. */
export function InlineCommunityHub({gateways,session,onOpenFull,onOpenCircle,onOpenObject,onPlanWithKs001,previewOnly=false,onSignIn}:{ 
  gateways?:PreviewWorkspaceGateways;session:SessionStore;onOpenFull:()=>void;
  onOpenCircle?:(circleId:string)=>void;
  onOpenObject?:(objectId:string)=>void;
  onPlanWithKs001?:(intention:string)=>Promise<void>;
  previewOnly?:boolean;
  onSignIn?:()=>void;
}){
  const identity=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const [page,setPage]=useState<Page>('home');
  const [filter,setFilter]=useState('');
  const [timelineFilter,setTimelineFilter]=useState<'all'|CommunityTimelineGroup>('all');
  const [ks001PlanningError,setKs001PlanningError]=useState<string|null>(null);
  const [ks001PlanningBusy,setKs001PlanningBusy]=useState(false);
  const [membership,setMembership]=useState<{status:'loading'|'ready'|'error';value:MembershipResponse|null}>({status:'loading',value:null});
  const [records,setRecords]=useState<Collections>(()=>previewOnly?demonstration():empty());
  const [revision,setRevision]=useState(0);
  const active=previewOnly||(identity.status==='signed-in'&&membership.status==='ready'&&membership.value?.status==='ACTIVE');

  useEffect(()=>{
    let alive=true;
    if(previewOnly){
      setMembership({status:'ready',value:null});
      setRecords(demonstration());
      return;
    }
    setMembership({status:'loading',value:null});setRecords(empty());
    if(!gateways){setMembership({status:'error',value:null});return;}
    if(identity.status!=='signed-in'){setMembership({status:'ready',value:null});return;}
    void (async()=>{
      try{
        await ensureFreshSession(session,gateways.auth);
        if(!alive||session.getSnapshot().status!=='signed-in')return;
        const result=await gateways.community.membership.me();
        if(alive)setMembership({status:'ready',value:result});
      }catch{if(alive)setMembership({status:'error',value:null});}
    })();
    return ()=>{alive=false;};
  },[identity.status,identity.status==='signed-in'?identity.tokens.refreshToken:null,session,gateways,revision,previewOnly]);

  useEffect(()=>{
    let alive=true;
    if(previewOnly){
      setRecords(demonstration());
      return;
    }
    setRecords(empty());
    if(!active || !gateways)return;
    // Read-only, membership-gated authoritative collections. One failing lane
    // must not turn other authorised lanes into fictional empty successes.
    function load<K extends Section>(key:K, fetch:()=>Promise<Rows[K]>, safe:(x:Rows[K])=>Rows[K]){
      setRecords(current=>({...current,[key]:{status:'loading',items:[]}}));
      void fetch().then(rows=>{
        if(!alive || session.getSnapshot().status!=='signed-in')return;
        const filtered=safe(rows);
        setRecords(current=>({...current,[key]:{status:'ready',items:filtered}}));
      }).catch(()=>{
        if(alive)setRecords(current=>({...current,[key]:{status:'error',items:[]}}));
      });
    }
    load('live',()=>gateways.community.feed(25,0),communityLiveOnly);
    load('contributions',()=>gateways.community.contributions.live(25,0),communityLiveContributions);
    load('projects',()=>gateways.community.projects.list(25,0),communityVisibleProjects);
    load('help',()=>gateways.community.serviceOpportunities.list(25,0),communityOpenOpportunities);
    load('events',()=>gateways.community.events.list(25,0),communityPublicEvents);
    load('learning',()=>gateways.community.apprenticeships.list(25,0),communityApprenticeships);
    load('circles',()=>gateways.community.circles.discover(25,0),discoverableCircles);
    load('invitations',()=>gateways.community.circles.myInvitations(25,0),invitedCircleCards);
    return ()=>{alive=false;};
  },[active,gateways,session,revision,previewOnly]);

  const filtered=useMemo(()=>({
    live:records.live.items.filter(x=>matchesCommunityText(filter,x.title,x.body,x.locationLabel)),
    contributions:records.contributions.items.filter(x=>matchesCommunityText(filter,x.title,x.body)),
    help:records.help.items.filter(x=>matchesCommunityText(filter,x.title,x.description,x.locationLabel,...x.skillsNeeded)),
    projects:records.projects.items.filter(x=>matchesCommunityText(filter,x.title,x.purpose,x.locationLabel)),
    events:records.events.items.filter(x=>matchesCommunityText(filter,x.title,x.description,x.locationLabel)),
    learning:records.learning.items.filter(x=>matchesCommunityText(filter,x.title,x.learningGoal)),
    circles:records.circles.items.filter(x=>matchesCommunityText(filter,x.name,x.purpose,x.categoryLabel,x.locationLabel)),
    invitations:records.invitations.items.filter(x=>matchesCommunityText(filter,x.circleName,x.circlePurpose)),
  }),[records,filter]);
  const timeline=useMemo(()=>buildCommunityTimeline({
    live:filtered.live,contributions:filtered.contributions,help:filtered.help,
    projects:filtered.projects,events:filtered.events,learning:filtered.learning,
  }),[filtered]);
  const status=(key:Section)=>{
    const state=records[key].status;
    return state==='loading'?<p role="status" className="text-xs text-sand-600">Finding authorised {key}…</p>
      :state==='error'?<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-sand-700">
        SecurePay could not verify {key}. Nothing has been changed.</p>
      :state==='ready'&&filtered[key].length===0?<Empty what={key}/>:null;
  };
  const [previewDetail,setPreviewDetail]=useState<string|null>(null);
  const openCircle=(id:string)=>{
    if(previewOnly){setPreviewDetail('This is an illustrative Circle. No real membership, invitation or shared board has been opened.');return;}
    if(onOpenCircle)onOpenCircle(id);else onOpenFull();
  };
  const planWithKs001=async()=>{
    if(previewOnly){setPreviewDetail('This is a sample. Real KS001 planning requires signed-in My Work.');return;}
    if(!onPlanWithKs001||ks001PlanningBusy)return;
    setKs001PlanningBusy(true);setKs001PlanningError(null);
    try{
      await onPlanWithKs001(
        'I am organising a Community project and may invite people to paid work or to a voluntary cause. '+
        'KS001, help me clarify the purpose, duties, number of people, timing, location, supervision, safety, '+
        'proposed compensation if paid, lawful terms, selection process, and whether funding is independently verified. '+
        'Examine the proposal against the canonical 12 Principles of Fair Trade and ask material missing questions. '+
        'Do not claim any applicant has accepted, a SecureLink exists, or money is secured. '+
        'I will decide what to publish and whom to invite after reviewing the proposal.'
      );
    }catch(error){setKs001PlanningError(error instanceof Error?error.message:'Could not open a verified KS001 conversation.');}
    finally{setKs001PlanningBusy(false);}
  };
  const openParticipation=()=>{
    if(previewOnly){setPreviewDetail('Demonstration only. Real participation requires a SecurePay identity and explicit Trust Project membership.');return;}
    onOpenFull();
  };
  const openLive=(id:string)=>{
    if(previewOnly){setPreviewDetail('This is a sample story. There is no actual author, discussion or published response.');return;}
    if(onOpenObject)onOpenObject(id);else onOpenFull();
  };

  const timelinePanel=()=>{
    const streams:Section[]=['live','contributions','help','projects','events','learning'];
    const pending=streams.some(key=>records[key].status==='loading');
    const unavailable=streams.some(key=>records[key].status==='error');
    const visible=timeline.filter(item=>timelineFilter==='all'||item.group===timelineFilter);
    return <section data-community-live-timeline aria-label="Community Live timeline"
      className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">Community Live</p>
        <h3 className="font-display text-2xl text-forest-900">Life is happening here.</h3>
        <p className="text-sm leading-6 text-sand-700">Real stories, causes, opportunities,
          projects and learning from people in our Community. See what matters to you.</p>
      </div>
      <div role="group" aria-label="Filter Community activity" className="flex gap-2 overflow-x-auto pb-1">
        {timelineFilters.map(item=><button key={item.id} type="button"
          aria-pressed={timelineFilter===item.id} onClick={()=>setTimelineFilter(item.id)}
          className={`shrink-0 min-h-11 rounded-full px-3 text-xs font-semibold ${timelineFilter===item.id?'bg-forest-800 text-white':'border border-cream-200 bg-white text-forest-800'}`}>
          {item.label}
        </button>)}
      </div>
      {pending&&<p role="status" className="rounded-xl bg-cream-50 p-3 text-xs text-sand-700">
        Loading recent Community activity…</p>}
      {unavailable&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-sand-700">
        Some Community updates could not be verified. Only available, authorised records are shown.</p>}
      {visible.length===0&&!pending&&<div className="rounded-2xl border border-cream-200 bg-white p-4">
        <p className="text-sm font-semibold text-forest-800">No activity in this view yet.</p>
        <p className="mt-1 text-xs text-sand-600">Explore other topics or ask Community how you can participate.</p>
      </div>}
      <ol className="space-y-0" data-community-timeline-items>
        {visible.map(item=><li key={item.key} className="flex gap-3">
          <div aria-hidden="true" className="flex w-6 shrink-0 flex-col items-center">
            <span className="mt-4 h-3 w-3 rounded-full border-2 border-forest-600 bg-white"/>
            <span className="my-1 w-px flex-1 bg-cream-200"/>
          </div>
          <article className="mb-3 min-w-0 flex-1 rounded-2xl border border-cream-200 bg-white p-4 shadow-[0_9px_22px_-20px_rgba(20,60,40,.35)]"
            data-timeline-kind={item.kind}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-forest-700">{item.label}</span>
              {dateLabel(item.createdAt)&&<time dateTime={item.createdAt??undefined}
                className="text-xs text-sand-500">{dateLabel(item.createdAt)}</time>}
            </div>
            <h4 className="mt-2 break-words font-display text-lg text-forest-900">{item.title}</h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-sand-700">{item.description}</p>
            {item.detail&&<p className="mt-2 text-xs text-sand-600">{item.detail}</p>}
            {item.locationLabel&&<p className="mt-2 text-xs text-sand-600">{item.locationLabel}</p>}
            {!previewOnly&&gateways&&item.kind==='contribution'&&records.contributions.items
              .find(record=>record.id===item.sourceId)?.media
              ?.filter(file=>file.storageReference.startsWith('community-media:'))
              .map(file=><CommunityAttachmentView key={file.id} gateway={gateways.community}
                id={file.storageReference.slice('community-media:'.length)}
                filename={file.mediaType==='IMAGE'?'Community photo':'Community document'}
                caption={file.caption}
                mediaType={file.mediaType==='IMAGE'?'IMAGE':'DOCUMENT'}/>)}
            <button type="button" onClick={()=>item.kind==='post'?openLive(item.sourceId):openParticipation()}
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-forest-700 underline underline-offset-4">
              {item.kind==='post'?'Read and respond':'Explore in Community'} <ArrowUpRight size={15} aria-hidden="true"/>
            </button>
          </article>
        </li>)}
      </ol>
      <p className="text-xs text-sand-600">Recent records from the current authorised Community feeds.
        This is not an exhaustive history or a ranking. Private Circle activity is excluded.</p>
      <button type="button" onClick={openParticipation}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white">
        Open Community participation <ArrowUpRight size={15} aria-hidden="true"/>
      </button>
    </section>;
  };

  const livePanel=(limit=20)=><Panel title="LIVE · Stories and conversation"
      detail="Real Community activity, not popularity rankings. Private Circle discussions never appear here.">
    {status('live')}
    {filtered.live.slice(0,limit).map(x=><Card key={x.id}
      label={x.objectType.replace(/_/g,' ').toLowerCase()+' · '+(x.authorDisplayName??'Community member')}
      title={x.title} body={x.body} detail={x.locationLabel}
      actionLabel="Read & respond" onOpen={()=>openLive(x.id)}/>)}
    {limit<20&&filtered.live.length>limit&&<button type="button" onClick={()=>setPage('live')} className="min-h-11 text-xs underline">Read more LIVE stories</button>}
    <button type="button" onClick={openParticipation} className="min-h-11 text-xs font-semibold text-forest-700 underline">
      Take part in LIVE · existing Community</button>
  </Panel>;
  const circlesPanel=(limit=20)=><Panel title="Find your people"
      detail="Publicly discoverable Circles only. Private invitations are visible only to their recipient.">
    {status('invitations')}
    {filtered.invitations.slice(0,limit).map(x=><Card key={'invited-'+x.circleId}
      label="Personal Circle invitation · acceptance required" title={x.circleName}
      body={x.circlePurpose} detail={'Invited by '+(x.invitedByDisplayName??'a member')}
      onOpen={()=>openCircle(x.circleId)}/>)}
    {status('circles')}
    {filtered.circles.slice(0,limit).map(x=><Card key={x.id}
      label={x.membershipMode.replace(/_/g,' ').toLowerCase()+' · '+x.status.toLowerCase()}
      title={x.name} body={x.purpose} detail={x.locationLabel} onOpen={()=>openCircle(x.id)}/>)}
    <button type="button" onClick={openParticipation} className="min-h-11 text-xs font-semibold text-forest-700 underline">
      Discover, request or join through Community</button>
  </Panel>;
  const helpPanel=(limit=20)=><Panel title="Bring your ability. Find a way to help."
      detail="These are opportunities to explore, not jobs awarded or engagements accepted.">
    {status('help')}
    {filtered.help.slice(0,limit).map(x=><Card key={x.id} label={'Opportunity · '+x.status.toLowerCase()}
      title={x.title} body={x.description}
      detail={[x.locationLabel,x.skillsNeeded.length?'Skills: '+x.skillsNeeded.join(', '):null,x.startsAt?dateLabel(x.startsAt):null].filter(Boolean).join(' · ')}/>)}
    <button type="button" onClick={openParticipation} className="min-h-11 text-xs font-semibold text-forest-700 underline">
      Express interest through the authorised Community pathway</button>
  </Panel>;
  const projectPanel=(limit=20)=><Panel title="See what people are building"
      detail="Purpose and recorded progress matter more than follower counts or unsupported impact claims.">
    {status('projects')}
    {filtered.projects.slice(0,limit).map(x=><Card key={x.id}
      label={'Community project · '+x.status.toLowerCase()} title={x.title}
      body={x.purpose} detail={x.locationLabel}/>)}
    {filtered.contributions.filter(item=>item.contributionType==='PROJECT_OUTCOME'||item.contributionType==='BEFORE_AFTER')
      .slice(0,limit).map(item=><Card key={'outcome-'+item.id}
        label="Member-reported project outcome · not independently cost-verified"
        title={item.title} body={item.body} detail="Public Community contribution · published with member consent"/>)}
    <button type="button" onClick={openParticipation} className="min-h-11 text-xs font-semibold text-forest-700 underline">
      Explore projects, evidence and contributions</button>
  </Panel>;
  const eventsPanel=(limit=20)=><Panel title="Make time for one another"
      detail="A listed event is not an RSVP or confirmed booking.">
    {status('events')}
    {filtered.events.slice(0,limit).map(x=><Card key={x.id}
      label={'Event · '+x.status.toLowerCase()} title={x.title}
      body={x.description} detail={[dateLabel(x.startsAt),x.locationLabel].filter(Boolean).join(' · ')}/>)}
    <button type="button" onClick={openParticipation} className="min-h-11 text-xs font-semibold text-forest-700 underline">
      Open event details and participation</button>
  </Panel>;
  const learningPanel=(limit=20)=><Panel title="Experience meets opportunity"
      detail="Plugs, Masters and apprentices grow through real evidence, skills and independent review.">
    <div className="rounded-xl bg-[#eff4ed] p-4">
      <p className="text-sm font-semibold text-forest-900">Learn something. Pass something on.</p>
      <p className="mt-1 text-xs leading-5 text-sand-700">The Skills Institute, Plug Foundation and Master capability pathways
        live in the existing Community experience. Training does not automatically grant certification.</p>
    </div>
    {status('learning')}
    {filtered.learning.slice(0,limit).map(x=><Card key={x.id}
      label={'Apprenticeship · '+x.status.toLowerCase()}
      title={x.title} body={x.learningGoal}
      detail="Participation, sponsorship and competence require separate confirmation"/>)}
    <button type="button" onClick={openParticipation} className="min-h-11 text-xs font-semibold text-forest-700 underline">
      Explore learning, human capacities and knowledge</button>
  </Panel>;

  return <section data-real-community-hub data-phase6-community-discovery
    className="space-y-4" aria-label="Trust Project Community">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-700">The Trust Project · Community</p>
        <h2 className="font-display text-2xl leading-tight text-forest-900">People make progress together</h2>
        <p className="max-w-xl text-sm leading-6 text-sand-700">
          Find your people. Share a story. Offer what you know. Discover what you could build together.
        </p>
      </div>
      <button type="button" onClick={()=>setRevision(v=>v+1)} aria-label="Refresh Community"
        className="min-h-11 min-w-11 rounded-xl border border-cream-200 bg-white p-3"><RefreshCw size={16}/></button>
    </div>
    {previewOnly && <div data-phase6-guest-review role="status"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <p className="text-sm font-semibold text-amber-950">Phase 6 · Interactive sample preview — no sign-in needed</p>
      <p className="text-xs leading-5 text-amber-900">These stories, Circles, people, projects and events are illustrative,
        not live SecurePay records. Explore each section, search and open sample details safely.
        Real membership, invitations, publishing and Money remain protected.</p>
      {onSignIn && <button type="button" onClick={onSignIn}
        className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-xs font-semibold text-forest-800">
        Sign in for real Community activity
      </button>}
    </div>}
    {previewDetail && <div role="dialog" aria-label="Sample Community detail"
      className="rounded-xl border border-forest-200 bg-white p-4 space-y-2">
      <h3 className="font-semibold text-sm text-forest-900">Sample preview</h3>
      <p className="text-sm text-sand-700">{previewDetail}</p>
      <button type="button" onClick={()=>setPreviewDetail(null)} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Close</button>
    </div>}
    {!previewOnly && membership.status==='loading'&&<p role="status" className="rounded-xl bg-cream-50 p-3 text-sm">
      Checking your Trust Project membership…</p>}
    {!previewOnly && membership.status==='error'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">
      SecurePay could not verify membership. Restricted content remains unavailable.</p>}
    {!previewOnly && membership.status==='ready'&&!active&&<Panel title="You belong by choice"
      detail="Signing in does not make anyone a member. Invitations and joining both require your acceptance.">
      <p className="text-sm text-sand-700">Membership: {membership.value?.status??'Not joined'}.</p>
      {membership.value?.status==='REVOKED'?<p className="text-sm text-sand-700">
        Your membership cannot be reactivated through self-join. Use existing Help & Support.</p>
      :identity.status==='signed-in'?<button type="button" onClick={()=>{window.location.hash='#/join';}}
        className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white">
        {membership.value?.status==='INVITED'?'Review my invitation': 'Explore joining the Trust Project'}
      </button>
      :<p className="text-xs">Sign in to review an invitation or choose to join.</p>}
    </Panel>}
    {active&&<>
      <label className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-3">
        <Search size={18} className="shrink-0 text-sand-500" aria-hidden="true"/>
        <span className="sr-only">Find Community topics</span>
        <input value={filter} maxLength={120} onChange={e=>setFilter(e.target.value)}
          placeholder="Find a story, skill, Circle or project"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"/>
      </label>
      <div role="tablist" aria-label="Community sections" className="flex gap-1 overflow-x-auto pb-1">
        {sections.map(({id,label,Icon})=><button key={id} type="button" role="tab"
          aria-selected={page===id} onClick={()=>setPage(id)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold ${page===id?'bg-forest-800 text-white':'bg-cream-100 text-forest-800'}`}>
          <Icon size={15} aria-hidden="true"/> {label}
        </button>)}
      </div>
      {page==='home'?timelinePanel():page==='live'?livePanel():
        page==='circles'?circlesPanel():
        page==='help'?helpPanel():
        page==='projects'?projectPanel():
        page==='events'?eventsPanel():learningPanel()}
      <div className="rounded-2xl border border-forest-100 bg-[#eff4ed] p-4 space-y-2">
        <div className="flex items-center gap-2 text-forest-800"><BookOpen size={18}/><strong className="text-sm">Your experience matters.</strong></div>
        <p className="text-xs leading-5 text-sand-700">The existing Community is where you can share supported stories,
          propose useful knowledge, review evidence, report concerns and discover real human assistance.
          Unreviewed contributions never become official KS001 knowledge.</p>
        {onPlanWithKs001&&<button type="button" disabled={ks001PlanningBusy}
          onClick={()=>void planWithKs001()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {ks001PlanningBusy?'Opening KS001…':'Plan paid work or a cause with KS001'}
          <ArrowUpRight size={16} aria-hidden="true"/>
        </button>}
        {ks001PlanningError&&<p role="alert" className="text-xs text-amber-900">{ks001PlanningError}</p>}
        <button type="button" onClick={openParticipation}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-forest-800">
          Open Community participation <ArrowUpRight size={16} aria-hidden="true"/>
        </button>
      </div>
    </>}
    <p className="flex items-start gap-2 text-xs leading-5 text-sand-600"><ShieldCheck size={16} className="mt-0.5 shrink-0"/>
      Private Vision and Circle content never becomes LIVE material by discovery. Joining, volunteering, RSVPs,
      knowledge approval, moderation decisions, Agreements and payments remain separate authorised actions.</p>
  </section>;
}
