import { useEffect, useMemo, useState } from 'react';
import type { CommunityGateway } from '../../api/securepay/community';
import type {
  CommunityImpactViewDto,
  ProjectContributionDto,
  ProjectContributionInterestIntent,
  ProjectContributionType,
  TrustProjectPathwayDiscoveryResultDto,
} from '../../api/securepay/community/dto';

const interestLabels: Array<[ProjectContributionInterestIntent,string]> = [
  ['LEARN','I want to learn this'],
  ['HELP','I can help'],
  ['AFFECTED_TOO','This affected me too'],
];

const contributionTypes: Array<[ProjectContributionType,string]> = [
  ['EXPERIENCE','Experience'],
  ['REFLECTION','Reflection'],
  ['LESSON_LEARNED','Lesson learned'],
  ['CRITICISM','Criticism'],
  ['PROBLEM_REPORT','Problem report'],
  ['PROPOSAL','Proposal'],
  ['COMMUNITY_STORY','Community story'],
];

export function TrustProjectImpactHome({
  gateway, activeMember, onOpenCircles, onJoin, onOpenVision,
}: {
  gateway: CommunityGateway;
  activeMember: boolean;
  onOpenCircles: () => void;
  onJoin: () => void;
  onOpenVision: () => void;
}) {
  const [contributions,setContributions]=useState<ProjectContributionDto[]>([]);
  const [impact,setImpact]=useState<CommunityImpactViewDto|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [composerOpen,setComposerOpen]=useState(false);
  const [type,setType]=useState<ProjectContributionType>('EXPERIENCE');
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [interestNotice,setInterestNotice]=useState<string|null>(null);
  const [assets,setAssets]=useState('');
  const [destination,setDestination]=useState('');
  const [pathways,setPathways]=useState<TrustProjectPathwayDiscoveryResultDto|null>(null);
  const [pathwayLoading,setPathwayLoading]=useState(false);

  const load = async () => {
    if(!activeMember) return;
    setLoading(true); setError(null);
    try {
      const [live,currentImpact]=await Promise.all([gateway.contributions.live(20,0),gateway.impact()]);
      setContributions(live);
      setImpact(currentImpact);
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Community impact could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [activeMember]);

  const totalObserved=useMemo(
    () => impact?.platformObserved.reduce((sum,x)=>sum+x.count,0) ?? 0,
    [impact],
  );

  if(!activeMember) {
    return <section className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">The Trust Project</p>
      <h1 className="font-display text-xl text-forest-800 mt-1">Community is where the Project sees itself.</h1>
      <p className="text-[0.85rem] text-sand-600 mt-2">
        See what people create, learn, question and experience — including what did not work.
      </p>
      <div className="mt-4 flex gap-2">
        <button onClick={onJoin} className="rounded-xl bg-forest-600 text-cream-50 px-4 py-2 text-[0.8rem] font-medium">Join The Trust Project</button>
        <button onClick={onOpenCircles} className="rounded-xl border border-cream-200 px-4 py-2 text-[0.8rem] text-forest-700">Explore Circles</button>
      </div>
    </section>;
  }

  const submitContribution=async()=>{
    if(!title.trim()||!body.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const created=await gateway.contributions.create({
        storeBusinessKsNumber:null,
        circleId:null,
        contributionType:type,
        title:title.trim(),
        body:body.trim(),
        originType:null,
        originObjectId:null,
        explicitSafeShare:false,
        idempotencyKey:globalThis.crypto?.randomUUID?.() ?? `contribution-${Date.now()}`,
        media:[],
      });
      setContributions(items=>[created,...items]);
      setTitle(''); setBody(''); setType('EXPERIENCE'); setComposerOpen(false);
    } catch(e) { setError(e instanceof Error ? e.message : 'Contribution could not be published.'); }
    finally { setSubmitting(false); }
  };

  const express=async(id:string,intent:ProjectContributionInterestIntent,label:string)=>{
    try {
      await gateway.contributions.interests.express(id,intent,null);
      setInterestNotice(`${label} recorded — this is interest, not a commitment.`);
    } catch(e) { setInterestNotice(e instanceof Error ? e.message : 'Interest could not be recorded.'); }
  };

  const addToVision=async(id:string)=>{
    try {
      await gateway.transitions.contributionToVision(id);
      onOpenVision();
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not add this contribution to Vision.'); }
  };

  const discoverPathways=async()=>{
    setPathwayLoading(true);
    try {
      const result=await gateway.pathways.discover({
        assets:assets.split(',').map(x=>x.trim()).filter(Boolean),
        aspirations:[],
        destination:destination.trim()||null,
      });
      setPathways(result);
    } catch(e) { setError(e instanceof Error ? e.message : 'Pathways could not be loaded.'); }
    finally { setPathwayLoading(false); }
  };

  return <section className="max-w-2xl mx-auto px-4 md:px-6 pt-6 pb-4 space-y-5">
    <div>
      <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">The Trust Project</p>
      <h1 className="font-display text-xl text-forest-800 mt-1">Community is where the Project sees itself.</h1>
      <p className="text-[0.85rem] text-sand-600 mt-1.5">
        Real experiences, creation, criticism and learning — not a popularity feed.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
        <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">Member-reported</div>
        <div className="mt-2 space-y-1">
          {(impact?.memberReported ?? []).slice(0,4).map(signal=>
            <div key={signal.code} className="flex justify-between text-[0.78rem] text-forest-700"><span>{signal.label}</span><span>{signal.count}</span></div>)}
          {impact && impact.memberReported.length===0 && <p className="text-[0.75rem] text-sand-500">No member-reported signals yet.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
        <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">Platform-observed</div>
        <div className="text-xl font-display text-forest-800 mt-1">{totalObserved}</div>
        <p className="text-[0.72rem] text-sand-500">Completed Project activity observed by SecurePay. No causal impact claim.</p>
      </div>
    </div>

    <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="font-display text-base text-forest-800">What happened?</h2>
          <p className="text-[0.75rem] text-sand-600">Share what worked, what failed, what you made or what you learned.</p></div>
        <button onClick={()=>setComposerOpen(v=>!v)} className="text-[0.78rem] font-medium text-forest-600">{composerOpen?'Close':'+ Contribute'}</button>
      </div>
      {composerOpen && <div className="mt-3 space-y-2">
        <select value={type} onChange={e=>setType(e.target.value as ProjectContributionType)} className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.8rem]">
          {contributionTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Give it a clear title" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} placeholder="Tell people what actually happened." className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
        <button disabled={submitting||!title.trim()||!body.trim()} onClick={()=>void submitContribution()} className="w-full rounded-xl bg-forest-600 text-cream-50 py-2.5 text-[0.8rem] font-medium disabled:opacity-50">{submitting?'Publishing…':'Publish contribution'}</button>
        <p className="text-[0.68rem] text-sand-500">This plain contribution is not linked to private Agreement or payment data.</p>
      </div>}
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-end"><div><h2 className="font-display text-base text-forest-800">What people are experiencing</h2><p className="text-[0.73rem] text-sand-500">Positive, critical and unfinished stories can all belong here.</p></div><button onClick={()=>void load()} className="text-[0.72rem] text-forest-600">Refresh</button></div>
      {loading && <p role="status" className="text-[0.78rem] text-sand-500">Loading Community impact…</p>}
      {error && <p role="alert" className="text-[0.78rem] text-red-600">{error}</p>}
      {interestNotice && <p role="status" className="text-[0.75rem] text-forest-600">{interestNotice}</p>}
      {contributions.map(item=><article key={item.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3"><span className="text-[0.66rem] uppercase tracking-wide text-sand-500">{item.contributionType.replaceAll('_',' ')}</span><span className="text-[0.68rem] text-sand-400">{item.authorKind==='STORE'?'Store':'Member'}</span></div>
        <h3 className="font-display text-[1rem] text-forest-800 mt-1">{item.title}</h3>
        <p className="text-[0.8rem] text-sand-700 mt-1.5 whitespace-pre-line">{item.body}</p>
        {item.media.length>0 && <p className="text-[0.68rem] text-sand-500 mt-2">{item.media.length} media item{item.media.length===1?'':'s'}</p>}
        <div className="mt-3 flex flex-wrap gap-2">{interestLabels.map(([intent,label])=>
          <button key={intent} onClick={()=>void express(item.id,intent,label)} className="rounded-full border border-cream-200 px-3 py-1.5 text-[0.7rem] text-forest-600 hover:border-forest-300">{label}</button>)}
          <button onClick={()=>void addToVision(item.id)} className="rounded-full border border-forest-200 px-3 py-1.5 text-[0.7rem] text-forest-700">Add to Vision</button>
        </div>
      </article>)}
      {!loading && contributions.length===0 && <p className="text-[0.78rem] text-sand-500">No contributions yet. The first useful trace can start here.</p>}
    </div>

    <div className="rounded-2xl border border-forest-100 bg-forest-50/30 px-4 py-4">
      <h2 className="font-display text-base text-forest-800">What could you do with what you already have?</h2>
      <p className="text-[0.74rem] text-sand-600 mt-1">Possible pathways come from current approved knowledge. They do not assign you a role.</p>
      <input value={assets} onChange={e=>setAssets(e.target.value)} placeholder="What do you have or know? e.g. smartphone, welding, local knowledge" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.8rem]" />
      <input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Where would you like to go?" className="mt-2 w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.8rem]" />
      <button disabled={pathwayLoading} onClick={()=>void discoverPathways()} className="mt-2 rounded-xl bg-forest-600 text-cream-50 px-4 py-2 text-[0.78rem] font-medium disabled:opacity-50">{pathwayLoading?'Looking…':'Show possible pathways'}</button>
      {pathways && <div className="mt-3 space-y-2"><p className="text-[0.72rem] text-sand-500">{pathways.note}</p>{pathways.possiblePathways.map(p=><div key={p.knowledgeId+':'+p.version} className="rounded-xl bg-white border border-cream-200 px-3 py-3"><div className="text-[0.82rem] font-medium text-forest-800">{p.title}</div><p className="text-[0.74rem] text-sand-600 mt-1">{p.explanation}</p></div>)}</div>}
    </div>

    <button onClick={onOpenCircles} className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-left">
      <span className="text-[0.82rem] font-medium text-forest-700">Explore named Circles</span>
      <p className="text-[0.72rem] text-sand-500 mt-0.5">Smaller spaces for people who want to explore a subject together.</p>
    </button>
  </section>;
}
