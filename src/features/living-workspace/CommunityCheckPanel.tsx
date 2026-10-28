import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Compass, LockKeyhole, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { CircleResponse, CirclePendingInvitationView, CommunityServiceOpportunityDto, CommunityObjectResponse } from '../../api/securepay/community/dto';
import { matchCommunityCircles, matchCommunityOpportunities, matchPublishedOpportunities,
  type CommunityDiscoveryChoice } from './communityCheckDiscovery';

type Reading<T>={status:'idle'|'loading'|'ready'|'error';rows:T[]};
const blank=<T,>():Reading<T>=>({status:'idle',rows:[]});
const initial:CommunityDiscoveryChoice={
  purpose:'explore',interests:'',skills:'',area:'',availability:'unspecified',
};
const sample:CircleResponse={
  id:'illustrative-circle',name:'Illustrative Repair & Learning Circle',
  purpose:'An example of neighbours sharing repair knowledge and organising practical learning.',
  membershipMode:'REQUEST_TO_JOIN',visibility:'PUBLIC',categoryLabel:'Practical learning',
  locationLabel:'Example location',status:'ACTIVE',
  creatorCanonicalKsNumber:null,creatorDisplayName:null,memberCount:0,
  createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',closedAt:null,
};

/** Gate 2 — contextual Check, NOT a membership, matchmaking or AI authority.
 * Data comes from the existing authenticated Community API. Every declared
 * preference remains in React state, is never sent to an API and is discarded
 * when this panel unmounts. Circle content is never fetched here.
 */
export function CommunityCheckPanel({gateways,session,signedIn,previewOnly,onSignIn,
  onExploreCircle,onOpenCommunity,onOpenCommunityPost}:{
  gateways?:PreviewWorkspaceGateways;session:SessionStore;signedIn:boolean;previewOnly:boolean;
  onSignIn:()=>void;onExploreCircle:(circleId:string)=>void;onOpenCommunity:()=>void;
  onOpenCommunityPost?:(postId:string)=>void;
}) {
  const [expanded,setExpanded]=useState(false);
  const [choice,setChoice]=useState<CommunityDiscoveryChoice>(initial);
  const [member,setMember]=useState<'loading'|'active'|'not-member'|'error'>('loading');
  const [circles,setCircles]=useState<Reading<CircleResponse>>(blank);
  const [invitations,setInvitations]=useState<Reading<CirclePendingInvitationView>>(blank);
  const [mine,setMine]=useState<Reading<CircleResponse>>(blank);
  const [opportunities,setOpportunities]=useState<Reading<CommunityServiceOpportunityDto>>(blank);
  const [publishedPosts,setPublishedPosts]=useState<Reading<CommunityObjectResponse>>(blank);
  const [revision,setRevision]=useState(0);
  const [previewNotice,setPreviewNotice]=useState<string|null>(null);

  useEffect(()=>{
    let alive=true;
    setCircles(blank());setInvitations(blank());setMine(blank());setOpportunities(blank());setPublishedPosts(blank());
    setMember('loading');
    if(previewOnly){setMember('not-member');return ()=>{alive=false;};}
    if(!signedIn||!gateways){setMember('not-member');return ()=>{alive=false;};}
    void (async()=>{
      try {
        await ensureFreshSession(session,gateways.auth);
        if(!alive||session.getSnapshot().status!=='signed-in')return;
        const membership=await gateways.community.membership.me();
        if(!alive)return;
        if(membership.status!=='ACTIVE'){setMember('not-member');return;}
        setMember('active');
        const fetchLane=<T,>(set:(next:Reading<T>)=>void,read:()=>Promise<T[]>)=>{
          set({status:'loading',rows:[]});
          void read().then(rows=>{
            if(alive&&session.getSnapshot().status==='signed-in')set({status:'ready',rows});
          }).catch(()=>{if(alive)set({status:'error',rows:[]});});
        };
        fetchLane(setCircles,()=>gateways.community.circles.discover(50,0));
        fetchLane(setInvitations,()=>gateways.community.circles.myInvitations(25,0));
        fetchLane(setMine,()=>gateways.community.circles.mine(25,0));
        fetchLane(setOpportunities,()=>gateways.community.serviceOpportunities.list(25,0));
        fetchLane(setPublishedPosts,()=>gateways.community.feed(50,0));
      }catch{if(alive)setMember('error');}
    })();
    return ()=>{alive=false;};
  },[gateways,session,signedIn,previewOnly,revision]);

  const availableCircles=previewOnly?[sample]:circles.status==='ready'?circles.rows:[];
  const circleMatches=useMemo(
    ()=>matchCommunityCircles(availableCircles,choice),[availableCircles,choice]);
  const opportunityMatches=useMemo(
    ()=>matchCommunityOpportunities(opportunities.rows,choice),[opportunities.rows,choice]);
  const publishedMatches=useMemo(()=>matchPublishedOpportunities(publishedPosts.rows,choice),[publishedPosts.rows,choice]);
  const change=<K extends keyof CommunityDiscoveryChoice>(field:K,value:CommunityDiscoveryChoice[K])=>
    setChoice(current=>({...current,[field]:value}));
  const openCircle=(id:string)=>{
    if(previewOnly){setPreviewNotice('Example only. No Circle membership or private content was opened.');return;}
    onExploreCircle(id);
  };
  const canRead=previewOnly||member==='active';

  return <section data-community-check aria-label="Community Check" className="space-y-4">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">Community Check</p>
      <h2 className="font-display text-xl text-forest-900">Where can I contribute?</h2>
      <p className="text-xs leading-5 text-sand-700">Discover people doing useful things. Choose how you would like to participate.</p>
    </div>
    {previewOnly&&<div role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
      Demonstration only. Example Circle details are not live member records.
    </div>}
    {member==='loading'&&!previewOnly&&<p role="status" className="text-xs text-sand-600">Checking your Community access…</p>}
    {member==='error'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">
      Community access could not be verified. No private information was loaded.</p>}
    {!previewOnly&&member==='not-member'&&<div className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-2">
      <p className="text-sm font-semibold text-forest-800">Belong by choice</p>
      <p className="text-xs text-sand-700">Join the Trust Project to discover real Circles and receive personal invitations.</p>
      <button type="button" onClick={signedIn?onOpenCommunity:onSignIn}
        className="min-h-11 rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white">
        {signedIn?'Explore Community membership':'Sign in to discover Circles'}
      </button>
    </div>}
    {canRead&&<>
      <div className="rounded-xl border border-cream-200 bg-white p-3 space-y-2">
        <p className="text-xs font-semibold text-sand-600">What needs your attention?</p>
        {previewOnly
          ?<p className="text-xs text-sand-600">Personal invitations appear here after you sign in and join.</p>
          :invitations.status==='loading'
          ?<p role="status" className="text-xs">Checking your Circle invitations…</p>
          :invitations.status==='error'
          ?<p role="alert" className="text-xs">Invitations could not be verified.</p>
          :invitations.rows.length>0
          ?<div className="space-y-2">{invitations.rows.slice(0,2).map(invite=><div key={invite.circleId}
            className="rounded-lg bg-cream-50 p-2">
              <p className="text-xs font-semibold">{invite.circleName}</p>
              <p className="text-xs text-sand-600">Your invitation · review before accepting</p>
              <button type="button" onClick={()=>openCircle(invite.circleId)}
                className="min-h-11 text-xs font-semibold text-forest-700 underline">Review invitation</button>
            </div>)}</div>
          :<p className="text-xs text-sand-600">No pending invitation confirmed in this view.</p>}
        {!previewOnly&&mine.status==='ready'&&mine.rows.length>0&&<p className="text-xs text-sand-600">
          You have {mine.rows.length} Circle{mine.rows.length===1?'':'s'} in the first page of your connections.
        </p>}
        {!previewOnly&&mine.status==='error'&&<p className="text-xs text-sand-600">Your Circle connections could not be verified.</p>}
      </div>
      <div className="rounded-xl bg-[#eff4ed] p-3 space-y-3">
        <p className="text-xs font-semibold text-forest-800">One meaningful next step</p>
        <p className="text-sm text-forest-900">Find a Circle or opportunity that interests you.</p>
        <button type="button" onClick={()=>setExpanded(value=>!value)}
          aria-expanded={expanded} aria-controls="community-discovery-controls"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white">
          <Compass size={16}/> {expanded?'Close discovery':'Discover relevant Circles'}
        </button>
      </div>
      {expanded&&<div id="community-discovery-controls" className="space-y-3 rounded-xl border border-cream-200 bg-white p-3">
        <p className="text-xs font-semibold text-forest-800">What would you like to do?</p>
        <div role="group" aria-label="Purpose for discovery" className="flex flex-wrap gap-1.5">
          {([
            ['explore','Just explore'],['learn','Learn'],['help','Offer help'],
            ['find-work','Find opportunities'],['build','Build together'],
          ] as const).map(([id,label])=><button key={id} type="button"
            aria-pressed={choice.purpose===id} onClick={()=>change('purpose',id)}
            className={`min-h-11 rounded-full border px-3 text-xs ${choice.purpose===id?'border-forest-700 bg-forest-800 text-white':'border-cream-200 text-forest-800'}`}>
            {label}
          </button>)}
        </div>
        <label className="block space-y-1 text-xs text-sand-700">
          <span>Interests (optional)</span>
          <input type="text" value={choice.interests} maxLength={120}
            onChange={event=>change('interests',event.target.value)}
            placeholder="e.g. gardening, construction"
            className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm"/>
        </label>
        <label className="block space-y-1 text-xs text-sand-700">
          <span>Skills I may offer (optional)</span>
          <input type="text" value={choice.skills} maxLength={120}
            onChange={event=>change('skills',event.target.value)}
            placeholder="e.g. carpentry, planning"
            className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm"/>
        </label>
        <label className="block space-y-1 text-xs text-sand-700">
          <span>Preferred area (optional)</span>
          <input type="text" value={choice.area} maxLength={80}
            onChange={event=>change('area',event.target.value)}
            placeholder="e.g. Ruiru"
            className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm"/>
        </label>
        <label className="block space-y-1 text-xs text-sand-700">
          <span>My usual availability (optional)</span>
          <select value={choice.availability}
            onChange={event=>change('availability',event.target.value as CommunityDiscoveryChoice['availability'])}
            className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm">
            <option value="unspecified">Prefer not to say</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekends">Weekends</option>
            <option value="flexible">Flexible</option>
          </select>
        </label>
        <p className="flex gap-2 text-xs leading-5 text-sand-600">
          <LockKeyhole size={16} className="shrink-0"/> These choices stay in this view. They are not published, sent to a Circle, or saved as a member profile.
        </p>
        {choice.availability!=='unspecified'&&<p className="text-xs text-sand-600">
          Your availability is for your own planning. Circle schedules are not verified by this discovery service.
        </p>}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-forest-800">Discoverable Circles</p>
          {!previewOnly&&circles.status==='loading'&&<p role="status" className="text-xs">Checking public Circle descriptions…</p>}
          {!previewOnly&&circles.status==='error'&&<p role="alert" className="text-xs">Circle discovery could not be verified. No results have been invented.</p>}
          {(previewOnly||circles.status==='ready')&&circleMatches.length===0&&<div className="space-y-2">
            <p className="text-xs text-sand-600">No public Circle descriptions in the current results match these choices.</p>
            <button type="button" onClick={()=>setChoice(initial)}
              className="min-h-11 text-xs font-semibold text-forest-700 underline">Explore all public Circles</button>
          </div>}
          {(previewOnly||circles.status==='ready')&&circleMatches.slice(0,5).map(({circle,reasons})=>
            <article key={circle.id} className="rounded-lg border border-cream-200 bg-cream-50 p-3 space-y-1.5">
              <p className="text-sm font-semibold text-forest-900">{circle.name}</p>
              <p className="text-xs leading-5 text-sand-700">{circle.purpose}</p>
              {circle.locationLabel&&<p className="text-xs text-sand-600">Area described: {circle.locationLabel}</p>}
              {reasons.map(reason=><p key={reason} className="text-xs text-forest-700">{reason}</p>)}
              <p className="text-xs text-sand-600">{circle.membershipMode.replace(/_/g,' ').toLowerCase()} · No membership assumed</p>
              <button type="button" onClick={()=>openCircle(circle.id)}
                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-forest-700 underline">
                Explore this Circle <ArrowUpRight size={14}/>
              </button>
            </article>)}
          {!previewOnly&&circles.status==='ready'&&circles.rows.length>=50&&
            <p className="text-xs text-sand-600">Showing matches from the first 50 public Circles only. Explore the full Community for broader search.</p>}
        </div>
        {choice.purpose==='find-work'&&<div className="space-y-2">
          <p className="text-xs font-semibold text-forest-800">Community opportunities</p>
          {(opportunities.status==='loading'||publishedPosts.status==='loading')&&
            <p role="status" className="text-xs">Checking actual opportunities…</p>}
          {(opportunities.status==='error'||publishedPosts.status==='error')&&
            <p role="alert" className="text-xs">Some opportunity sources could not be verified. Only confirmed records are shown.</p>}
          {opportunities.status==='ready'&&publishedPosts.status==='ready'&&
            opportunityMatches.length===0&&publishedMatches.length===0&&
            <p className="text-xs text-sand-600">No matching open opportunity confirmed in these results.</p>}
          {publishedPosts.status==='ready'&&publishedMatches.slice(0,5).map(({post,reasons})=>
            <div key={'post-'+post.id} className="rounded-lg border border-cream-200 bg-white p-3 space-y-1">
              <p className="text-xs font-semibold">{post.title}</p>
              <p className="line-clamp-4 whitespace-pre-wrap text-xs text-sand-700">{post.body}</p>
              {post.locationLabel&&<p className="text-xs text-sand-600">Area: {post.locationLabel}</p>}
              {reasons.map(reason=><p key={reason} className="text-xs text-forest-700">{reason}</p>)}
              <p className="text-xs text-sand-600">Published proposal. Interest is not selection or acceptance; any proposed pay is not verified as funded.</p>
              <button type="button" onClick={()=>onOpenCommunityPost?onOpenCommunityPost(post.id):onOpenCommunity()}
                className="min-h-11 text-xs font-semibold text-forest-700 underline">
                Read this invitation and express interest
              </button>
            </div>)}
          {opportunities.status==='ready'&&opportunityMatches.slice(0,3).map(({opportunity,reasons})=>
            <div key={opportunity.id} className="rounded-lg border border-cream-200 p-3 space-y-1">
              <p className="text-xs font-semibold">{opportunity.title}</p>
              <p className="text-xs text-sand-700">{opportunity.description}</p>
              {reasons.map(reason=><p className="text-xs text-forest-700" key={reason}>{reason}</p>)}
              <p className="text-xs text-sand-600">Opportunity listed, not an awarded job. Payment and funding have not been verified.</p>
              <button type="button" onClick={onOpenCommunity} className="min-h-11 text-xs font-semibold text-forest-700 underline">
                Explore in Community
              </button>
            </div>)}
        </div>}
        {previewNotice&&<p role="status" className="text-xs text-amber-900">{previewNotice}</p>}
        <p className="flex items-start gap-2 text-xs leading-5 text-sand-600"><ShieldCheck size={16} className="shrink-0"/>
          Results use only published descriptions; a possible fit is not an invitation, acceptance, verified skill, funded job or promised place.</p>
        <button type="button" onClick={()=>{setChoice(initial);setPreviewNotice(null);}}
          className="min-h-11 text-xs text-sand-600 underline">Clear my discovery choices</button>
      </div>}
    </>}
    <div className="flex items-start gap-2 text-xs leading-5 text-sand-600">
      <Users size={16} className="shrink-0"/>
      Community Check helps you explore. Only the Circle itself can confirm membership, roles and participation.
    </div>
    {member==='active'&&<button type="button" onClick={()=>setRevision(n=>n+1)}
      className="flex min-h-11 items-center gap-2 text-xs text-forest-700 underline">
      <RefreshCw size={14}/> Refresh Community Check
    </button>}
  </section>;
}
