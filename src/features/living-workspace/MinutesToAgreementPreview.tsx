import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, FileText, MessageCircle, Sparkles } from 'lucide-react';

/**
 * Preview-only interpretation of FIXED, AUTHOR-WRITTEN SAMPLE MINUTES.
 * This file has no parser, model, document uploader, agreement or Money gateway.
 * Real users' documents must never be described as interpreted by this preview.
 */
export type MinuteField = 'who' | 'what' | 'where' | 'when' | 'why' | 'how';
export type MinuteWorkId = 'security-light' | 'repairs' | 'resident-project';
export type MinutePoint = {
  key: MinuteField;
  short: string;
  fromMinutes: string | null;
  question: string;
  relatedPrinciples: string[];
};
export type MinuteDecision = {
  workId: MinuteWorkId;
  heading: string;
  section: string;
  excerpt: string;
  points: MinutePoint[];
};
export type MinuteReview = {
  decisionId: MinuteWorkId;
  corrections: Partial<Record<MinuteField, string>>;
  sourceLabel: string;
};

export const SAMPLE_MINUTES_LABEL = 'Example Estate Works Committee · meeting minutes';
const SOURCE_RULE = 'Every detail below is a proposed reading of fictional sample minutes, not a verified fact or an authorised Agreement.';
export const SAMPLE_MINUTES: MinuteDecision[] = [
  {
    workId: 'security-light',
    heading: 'Shared security light',
    section: 'Item 3',
    excerpt: 'The committee proposed one shared security light near the East Gate to improve visibility at night. An estimated KSh 60,000 would be raised from participating neighbours. A supplier will be chosen later. The minutes do not say who approves completion, when contributions close or how a shortfall is resolved.',
    points: [
      {key:'who',short:'Who approves?',fromMinutes:null,question:'Who is authorised to inspect and confirm the supplier’s completed work?',relatedPrinciples:['To Protect Trust','To Honour Our Commitments']},
      {key:'what',short:'What is being provided?',fromMinutes:'One shared security light',question:'What exactly should the supplier provide?',relatedPrinciples:['To Safeguard Buyers & Sellers']},
      {key:'where',short:'Where?',fromMinutes:'Near the East Gate',question:'Which exact location is agreed for the light?',relatedPrinciples:['To Honour Our Commitments']},
      {key:'when',short:'When?',fromMinutes:null,question:'When must contributions close and installation finish?',relatedPrinciples:['To Honour Our Commitments']},
      {key:'why',short:'Why?',fromMinutes:'Improve visibility at night',question:'What problem should the light solve?',relatedPrinciples:['To Protect Community Goodwill']},
      {key:'how',short:'How if funds fall short?',fromMinutes:null,question:'What happens if contributions fall short or the work is disputed?',relatedPrinciples:['To Prevent Exploitation','To Safeguard Buyers & Sellers']},
    ],
  },
  {
    workId: 'repairs',
    heading: 'Gate and drainage',
    section: 'Item 4',
    excerpt: 'Gate repairs and drainage works near Entrance Two were proposed as separate jobs, estimated at KSh 35,000 and KSh 55,000 respectively. Contractors have not been chosen. The committee wants separate inspections but has not agreed on a completion date or how payment decisions will be made for a disputed job.',
    points: [
      {key:'who',short:'Which contractors?',fromMinutes:null,question:'Who is doing the gate job and the drainage job, and who confirms each one?',relatedPrinciples:['To Protect Trust','To Honour Our Commitments']},
      {key:'what',short:'What works?',fromMinutes:'Two separate jobs: gate repairs and drainage',question:'What work is included in each job?',relatedPrinciples:['To Safeguard Buyers & Sellers']},
      {key:'where',short:'Where?',fromMinutes:'Near Entrance Two',question:'Where does each job begin and end?',relatedPrinciples:['To Honour Our Commitments']},
      {key:'when',short:'When?',fromMinutes:null,question:'When must each contractor complete the work?',relatedPrinciples:['To Honour Our Commitments']},
      {key:'why',short:'Why?',fromMinutes:'Repair the gate and drainage',question:'Which problems must the repairs solve?',relatedPrinciples:['To Protect Community Goodwill']},
      {key:'how',short:'How are disputes handled?',fromMinutes:null,question:'Who can approve each separate milestone and what happens if only one job is disputed?',relatedPrinciples:['To Prevent Exploitation','To Safeguard Buyers & Sellers']},
    ],
  },
  {
    workId: 'resident-project',
    heading: 'Residents’ CCTV project',
    section: 'Item 5',
    excerpt: 'Residents discussed CCTV for community access roads and entrances. Estimated allocations are KSh 120,000 for equipment, KSh 40,000 for installation and KSh 20,000 for maintenance. Contributors and providers have not been confirmed. No specific installation sites, project dates or versioned approval process were agreed.',
    points: [
      {key:'who',short:'Who contributes and supplies?',fromMinutes:null,question:'Which contributors, suppliers and reviewers are authorised for each part?',relatedPrinciples:['To Protect Trust','To Prevent Exploitation']},
      {key:'what',short:'What is being done?',fromMinutes:'Equipment, installation and maintenance',question:'What must each provider deliver?',relatedPrinciples:['To Safeguard Buyers & Sellers']},
      {key:'where',short:'Which installation sites?',fromMinutes:null,question:'Which precise roads and entrances are in the approved installation scope?',relatedPrinciples:['To Honour Our Commitments']},
      {key:'when',short:'When?',fromMinutes:null,question:'When does each phase start, finish and become inspectable?',relatedPrinciples:['To Honour Our Commitments']},
      {key:'why',short:'Why?',fromMinutes:'Improve security at access roads and entrances',question:'Which community security need is the project intended to address?',relatedPrinciples:['To Protect Community Goodwill']},
      {key:'how',short:'Who approves changes?',fromMinutes:null,question:'Who must review allocation changes and how are contributions, disputes and separate releases governed?',relatedPrinciples:['To Prevent Exploitation','To Honour Our Commitments']},
    ],
  },
];
export const minuteDecision = (id:MinuteWorkId):MinuteDecision =>
  SAMPLE_MINUTES.find(decision=>decision.workId===id)!;
export const makeMinuteReview = (id:MinuteWorkId):MinuteReview => ({
  decisionId:id, corrections:{}, sourceLabel:SAMPLE_MINUTES_LABEL,
});
export const openMinutePoints=(review:MinuteReview):MinutePoint[] =>
  minuteDecision(review.decisionId).points.filter(point=>!point.fromMinutes && !review.corrections[point.key]?.trim());
export const allPointsPresent=(review:MinuteReview):boolean =>
  minuteDecision(review.decisionId).points.every(point=>Boolean(point.fromMinutes||review.corrections[point.key]?.trim()));

export function MinutesToAgreementTool({prepared,onPrepare,onOpen}:{prepared:MinuteWorkId[];onPrepare:()=>void;onOpen:(id:MinuteWorkId)=>void}) {
  const [showSource,setShowSource]=useState(false);
  return <div data-gate3-minutes-tool className="space-y-3">
    <div className="rounded-xl bg-[#edf2e9] p-3">
      <div className="flex items-center gap-2"><FileText size={17} className="text-forest-700"/><h3 className="text-sm font-semibold">Minutes to Agreement</h3></div>
      <p className="mt-1 text-xs leading-5 text-sand-700">See how one long meeting can become separate pieces of work, each with its own clear questions.</p>
      <span className="mt-2 inline-block rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-medium text-forest-800">Scripted example · no AI reading</span>
    </div>
    <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-xl border border-cream-200 px-3 text-left text-xs"
      aria-expanded={showSource} onClick={()=>setShowSource(v=>!v)}>
      <span>Read the sample meeting minutes</span><ChevronDown size={16} className={showSource?'rotate-180':''}/>
    </button>
    {showSource&&<div className="max-h-52 space-y-3 overflow-y-auto rounded-xl bg-cream-50 p-3">
      <p className="text-[0.7rem] font-semibold">{SAMPLE_MINUTES_LABEL}</p>
      {SAMPLE_MINUTES.map(decision=><p key={decision.workId} className="text-xs leading-5 text-sand-700">
        <strong>{decision.section}. {decision.heading}.</strong> {decision.excerpt}
      </p>)}
    </div>}
    <div className="space-y-2">
      {SAMPLE_MINUTES.map(decision=><div key={decision.workId} className="rounded-xl border border-cream-200 p-2.5">
        <div className="flex items-center justify-between gap-2"><div>
          <p className="text-xs font-semibold text-forest-900">{decision.heading}</p>
          <p className="text-[0.69rem] text-sand-600">{decision.section} · Separate proposed work</p>
        </div>{prepared.includes(decision.workId)&&<CheckCircle2 size={17} className="text-forest-700"/>}</div>
        {prepared.includes(decision.workId)&&<button type="button" className="mt-2 min-h-10 rounded-lg px-2 text-xs font-semibold text-forest-800 underline"
          onClick={()=>onOpen(decision.workId)}>Open this draft</button>}
      </div>)}
    </div>
    <button type="button" onClick={onPrepare} data-gate3-prepare-separate-drafts
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">
      <Sparkles size={16}/> {prepared.length===3?'Open prepared drafts':'Prepare 3 separate drafts'}
    </button>
    <p className="text-[0.72rem] leading-5 text-sand-600">{SOURCE_RULE} Choosing your own document in Documents only records its filename, and does not read its contents.</p>
  </div>;
}

export function MinutesAgreementCheck({review,onPropose,onAsk}:{review:MinuteReview;onPropose:(key:MinuteField,value:string)=>void;onAsk:(point:MinutePoint)=>void}) {
  const decision=minuteDecision(review.decisionId);
  const open=openMinutePoints(review);
  return <section data-gate3-minutes-check className="py-3" aria-label="Meeting minutes clarification">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold text-forest-900">Minutes check</h3>
      {open.length>0
        ?<span className="rounded-full bg-amber-100 px-2 py-1 text-[0.69rem] font-semibold text-amber-800" data-gate3-orange-count>{open.length} clarify</span>
        :<span className="rounded-full bg-cream-100 px-2 py-1 text-[0.69rem] font-semibold text-forest-800">Ready for review</span>}
    </div>
    <p className="text-[0.69rem] text-sand-600">{decision.section} · {review.sourceLabel}</p>
    <div className="mt-2 space-y-1">
      {open.map(point=><details key={point.key} data-gate3-clarify-point className="group rounded-xl border border-amber-200 bg-amber-50/70 px-2.5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs text-amber-900 [&::-webkit-details-marker]:hidden">
          <AlertCircle size={15} className="shrink-0 text-amber-600"/>
          <span className="flex-1 font-semibold">{point.short}</span>
          <ChevronDown size={14} className="shrink-0 group-open:rotate-180"/>
        </summary>
        <div className="border-t border-amber-100 pb-3 pt-2">
          <p className="text-xs leading-5 text-sand-700">{point.question}</p>
          <form onSubmit={(event:FormEvent<HTMLFormElement>)=>{
            event.preventDefault();
            const answer=String(new FormData(event.currentTarget).get('answer')??'').trim();
            if(answer)onPropose(point.key,answer);
          }} className="mt-2 space-y-2">
            <label className="block text-[0.7rem] font-semibold text-sand-700">Your proposed clarification
              <textarea key={point.key} name="answer" required maxLength={300} rows={2} placeholder="What would you propose?"
                className="mt-1 w-full resize-y rounded-lg border border-amber-200 bg-white p-2 text-xs text-forest-900"/>
            </label>
            <button type="submit" className="min-h-10 w-full rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white">Keep as proposal</button>
          </form>
          <button type="button" onClick={()=>onAsk(point)}
            className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-forest-800 underline underline-offset-2"><MessageCircle size={14}/> Discuss with KS001</button>
          <p className="mt-2 text-[0.68rem] text-sand-600">Related: {point.relatedPrinciples.join(' · ')}. Not formally examined.</p>
        </div>
      </details>)}
      {open.length===0&&<p className="rounded-lg bg-[#edf2e9] px-3 py-2 text-xs text-forest-800">All six prompts have a source or proposed answer. None has been accepted by the other parties.</p>}
    </div>
    <details className="mt-2" data-gate3-wwwwwh-full>
      <summary className="min-h-10 cursor-pointer py-2 text-xs font-semibold text-forest-800">Who · What · Where · When · Why · How <ChevronDown size={13} className="ml-1 inline"/></summary>
      <div className="space-y-2 rounded-xl bg-cream-50 p-3 text-xs">
        {decision.points.map(point=>{
          const corrected=review.corrections[point.key]?.trim();
          const value=corrected||point.fromMinutes;
          return <div key={point.key} className="border-b border-cream-200 pb-2 last:border-b-0 last:pb-0">
            <div className="flex justify-between gap-2"><strong className="capitalize">{point.key}</strong>
              <span className={corrected?'text-forest-700':point.fromMinutes?'text-sand-500':'text-amber-800'}>
                {corrected?'Proposed correction':point.fromMinutes?'From minutes':'Clarify'}
              </span>
            </div>
            <p className="mt-1 text-sand-700">{value||'Not specified'}</p>
          </div>;
        })}
      </div>
    </details>
    <p className="mt-2 text-[0.68rem] text-sand-500">This is a local example, not an extracted or approved Agreement.</p>
  </section>;
}
