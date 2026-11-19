import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardCheck, LockKeyhole, ShieldCheck } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import type { GovernanceDraft } from './governanceDraft.mjs';
import type { CyclePeriodSelection } from './c5bPreparation.mjs';
import { COLLECTION_TYPE_PROFILES } from './collectionTypes.mjs';
import { questionsForCollection, assessCollectionExamination } from './c6Examination.mjs';

function localDate(deltaYears=0): string {
  const d=new Date(); d.setFullYear(d.getFullYear()+deltaYears);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')].join('-');
}

/**
 * C6 human review PREVIEW only. The authoritative C6 source gate, evidence
 * status, payer identity and immutable hashes are owned by SecurePayAPI.
 * Answer pills cannot create Money, bill approval, consent or bank authority.
 */
export function C6CollectionExamination({draft,period,onBack,onContinue}:{
  draft:GovernanceDraft; period:CyclePeriodSelection; onBack:()=>void; onContinue:()=>void;
}) {
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [dateProposal,setDateProposal]=useState('');
  const [step,setStep]=useState(0);
  const [summary,setSummary]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const questions=questionsForCollection(draft,period);
  const review=assessCollectionExamination(draft,period,answers,dateProposal);
  const question=questions[step];
  const selected=question?answers[question.id]:undefined;
  const wantsDate=question?.calendar && selected==='propose-date';
  const dateOkay=!!dateProposal && dateProposal>localDate() && dateProposal<=localDate(2);
  const type=COLLECTION_TYPE_PROFILES.find(t=>t.id===draft.collectionTypeId);

  const back=()=>{
    if(summary){setSummary(false);setStep(Math.max(questions.length-1,0));}
    else if(step>0)setStep(step-1);
    else onBack();
  };
  const next=()=>{
    if(!selected || (wantsDate&&!dateOkay))return;
    if(step+1<questions.length)setStep(step+1);
    else setSummary(true);
  };

  return <div data-mini-collect-c6 className="min-h-screen bg-[#faf7f0] text-[#244936]">
    <header className="border-b border-[#e2e8dc] bg-[#fffefa]/95 px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1"><p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#667766]">Collect Money · A careful look</p></div>
        <span className="rounded-full bg-[#edf4e8] px-2 py-1 text-[11px] font-semibold text-[#406b4b]">C6 preview</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#eef3e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
          <ArrowLeft size={17} aria-hidden="true"/> Back
        </button>
        <span className="text-xs text-[#667668]">{summary?'What needs checking':questions.length?'Question '+(step+1)+' of '+questions.length:'Source required'}</span>
      </div>
      {!question && <section className="rounded-2xl border border-[#dbe4d5] bg-white p-5">
        <h1 className="font-display text-2xl">Choose an original source first</h1>
        <p className="mt-3 text-sm leading-6 text-[#627465]">Go back to the period and identify the bill, item, offer or cause to examine.</p>
      </section>}
      {question && !summary && <section aria-labelledby="c6-question">
        <span className="inline-flex rounded-full bg-[#e8f0e3] px-3 py-1.5 text-xs font-semibold">
          {type?.title ?? 'Your collection'} · {period.startsOn} to {period.endsOn}
        </span>
        <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]">
          <ClipboardCheck size={24} aria-hidden="true"/>
        </div>
        <h1 id="c6-question" className="mt-4 font-display text-[2rem] leading-tight">{question.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">{question.why}</p>
        <div className="mt-6 grid gap-3" role="group" aria-label={question.title}>
          {question.options.map(pill=><button key={pill.id} type="button" aria-pressed={selected===pill.id}
            onClick={()=>setAnswers(previous=>({...previous,[question.id]:pill.id}))}
            className={'flex min-h-[68px] items-center gap-3 rounded-2xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41] '+(selected===pill.id?'border-[#39784f] bg-[#edf6e9]':'border-[#e0e6da] bg-white hover:border-[#83ac8b]')}>
            <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border '+(selected===pill.id?'border-[#39784f] bg-[#39784f] text-white':'border-[#a4b8a6]')}>
              {selected===pill.id&&<Check size={15} aria-hidden="true"/>}
            </span><span className="text-sm font-semibold">{pill.label}</span>
          </button>)}
        </div>
        {wantsDate && <label className="mt-4 block rounded-2xl border border-[#dae4d7] bg-white p-4">
          <span className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={17} aria-hidden="true"/> Proposed start date</span>
          <span className="mt-1 block text-xs leading-5 text-[#69786b]">A question for the provider, not an agreed service date.</span>
          <input type="date" value={dateProposal} min={localDate()} max={localDate(2)}
            onChange={event=>setDateProposal(event.target.value)}
            className="mt-3 min-h-12 w-full rounded-xl border border-[#cbd7cc] bg-[#fffefa] px-3 text-base"/>
        </label>}
        <p className="mt-4 text-xs leading-5 text-[#6c7a6c]">An answer helps examine the right issue. It cannot verify the source or authorize collection.</p>
        <button type="button" disabled={!selected || (!!wantsDate&&!dateOkay)} onClick={next}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {step+1===questions.length?'Review what remains':'Continue'} <ArrowRight size={18} aria-hidden="true"/>
        </button>
      </section>}
      {question && summary && <section aria-labelledby="c6-summary">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><ShieldCheck size={24} aria-hidden="true"/></div>
        <h1 id="c6-summary" className="mt-4 font-display text-[2rem] leading-tight">Here is what still needs checking.</h1>
        <p className="mt-3 text-sm leading-6 text-[#607365]">Your answers help us focus. SecurePay must independently verify real-world facts before anyone can accept the collection.</p>
        {review.disputed&&<div role="alert" className="mt-4 rounded-2xl border border-[#e7caa1] bg-[#fff8eb] p-4">
          <p className="text-sm font-semibold text-[#795522]">The terms may have changed</p>
          <p className="mt-1 text-sm leading-6">A different item, source or period may require a new Agreement version and consent.</p>
        </div>}
        <div className="mt-5 rounded-2xl border border-[#dce6d8] bg-white p-4">
          <p className="text-sm font-semibold">Before the collection is trusted</p>
          <ul className="mt-3 space-y-3">
            {review.pendingIndependentEvidence.slice(0,expanded?undefined:2).map(item=>
              <li key={item} className="flex items-start gap-2 text-sm leading-6 text-[#5b7060]">
                <LockKeyhole size={16} className="mt-1 shrink-0" aria-hidden="true"/>{item}
              </li>)}
          </ul>
          <button type="button" onClick={()=>setExpanded(x=>!x)}
            className="mt-3 min-h-11 rounded-xl px-2 text-sm font-semibold text-[#356c4a] hover:bg-[#f0f5ed]">
            {expanded?'Show less':'See all protections'}
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#6b796c]">Planning preview only. No genuine invoice, source, legal debt, payee, provider, Agreement acceptance, recurring debit or Money is verified here.</p>
        {review.disputed && <button type="button" onClick={onBack}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white">
          Return to the original source <ArrowRight size={18} aria-hidden="true"/>
        </button>}
        <button type="button" onClick={onContinue} disabled={review.disputed}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          Check which providers can help <ArrowRight size={18} aria-hidden="true"/>
        </button>
        <button type="button" onClick={()=>{setSummary(false);setStep(0);}}
          className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-[#356c4a] hover:bg-[#eef3e9]">Revisit the questions</button>
      </section>}
    </main>
    <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-[#6e7e70]">Trust is the currency · Money should follow the Agreement</footer>
  </div>;
}
