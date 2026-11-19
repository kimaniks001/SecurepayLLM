import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardCheck,
  FileText, LockKeyhole, ShieldCheck, Users,
} from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import type { GovernanceDraft } from './governanceDraft.mjs';
import { COLLECTION_TYPE_PROFILES, CADENCE_OPTIONS } from './collectionTypes.mjs';
import {
  SOURCE_OPTIONS, canonicalCollectionTypeTerms, assessCyclePeriod,
  type SourceCategory, type CyclePeriodSelection,
} from './c5bPreparation.mjs';

type Stage = 'period' | 'source' | 'review';
const contributorDescriptions = {
  one: 'One person, after their own bill or obligation is identified',
  invited: 'The invited people who actually join and review their own items',
  open: 'Eligible people who join; no public list of private payments',
};

function localDate(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')].join('-');
}
function windowForMonth(month: string): { startsOn: string | null; endsOn: string | null } {
  if (!/^\d{4}-\d{2}$/.test(month)) return { startsOn:null, endsOn:null };
  const [year, m] = month.split('-').map(Number);
  if (year < 2020 || year > 2100 || m < 1 || m > 12) {
    return { startsOn:null, endsOn:null };
  }
  return {
    startsOn: month + '-01',
    endsOn: new Date(Date.UTC(year,m,0)).toISOString().slice(0,10),
  };
}

/**
 * C5B human period+source review, deliberately separate from actual canonical
 * Agreement/period persistence. No fabricated payer records, fees, bank or
 * SecureLinks; backend must establish identity and version/consent authority.
 */
export function C5BCollectionPeriods({ draft, onBack, onContinue: onChosen, initialSelection }: {
  draft: GovernanceDraft;
  onBack: () => void;
  onContinue: (period: CyclePeriodSelection) => void;
  initialSelection?: CyclePeriodSelection | null;
}) {
  const validInitial = initialSelection != null
    && assessCyclePeriod(draft,initialSelection,localDate()).reviewComplete;
  const [stage,setStage] = useState<Stage>(validInitial ? 'review' : 'period');
  const [month,setMonth] = useState(validInitial && initialSelection?.startsOn ? initialSelection.startsOn.slice(0,7) : '');
  const [selection,setSelection] = useState<CyclePeriodSelection>(validInitial && initialSelection
    ? initialSelection : {startsOn:null,endsOn:null,timeZoneId:'Africa/Nairobi',sourceCategory:null});
  const onContinue = () => onChosen(selection);
  const today = localDate();
  const type = COLLECTION_TYPE_PROFILES.find(x => x.id === draft.collectionTypeId);
  const cadence = CADENCE_OPTIONS.find(x => x.id === draft.collectionCadence);
  const terms = canonicalCollectionTypeTerms(draft);
  const assessment = assessCyclePeriod(draft,selection,today);
  const periodOkay = assessCyclePeriod(draft,
    {...selection,sourceCategory:'existing-bill'},today).reviewComplete;
  const source = SOURCE_OPTIONS.find(x => x.id === selection.sourceCategory);
  const options = SOURCE_OPTIONS.filter(x => draft.kind === 'give' || x.id !== 'purpose-only');
  const monthly = terms?.cadence === 'MONTHLY';

  const back = () => {
    if (stage === 'review') setStage('source');
    else if (stage === 'source') setStage('period');
    else onBack();
  };

  return <div data-mini-collect-c5b className="min-h-screen bg-[#faf7f0] text-[#244936]">
    <header className="border-b border-[#e4e7dc] bg-[#fffefa]/95 px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain" />
        <div className="flex-1">
          <p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#677568]">Collect Money · The period and the source</p>
        </div>
        <span className="rounded-full bg-[#edf3e8] px-2.5 py-1 text-[11px] font-semibold text-[#416d4b]">C5B preview</span>
      </div>
    </header>

    <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={back}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
          <ArrowLeft size={17} aria-hidden="true"/> Back
        </button>
        <span className="text-xs font-medium text-[#667869]">Step {stage === 'period' ? 1 : stage === 'source' ? 2 : 3} of 3</span>
      </div>

      {stage === 'period' && <section aria-labelledby="c5b-period">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]">
          <CalendarDays size={24} aria-hidden="true"/>
        </div>
        <h1 id="c5b-period" className="font-display text-[2rem] leading-tight">Which period are we collecting for?</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">
          {type?.title ?? 'Your collection'} · {cadence?.title ?? 'Agreed schedule'}. Every period should have its own clear beginning and end. No one should be charged twice for the same period.
        </p>
        {monthly ? <label className="mt-6 block rounded-2xl border border-[#e0e6da] bg-white p-4">
          <span className="block text-sm font-semibold">Choose a month</span>
          <span className="mt-1 block text-xs leading-5 text-[#647569]">We'll show its full calendar period.</span>
          <input type="month" value={month} onChange={e => {
            const next = e.target.value;
            setMonth(next);
            setSelection(previous => ({...previous,...windowForMonth(next)}));
          }} className="mt-3 min-h-12 w-full rounded-xl border border-[#cbd7cc] bg-[#fffefa] px-3 text-base text-[#284a35]"/>
        </label> : <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="rounded-2xl border border-[#e0e6da] bg-white p-4">
            <span className="block text-sm font-semibold">Period starts</span>
            <input type="date" value={selection.startsOn ?? ''} onChange={e =>
              setSelection(previous => ({...previous,startsOn:e.target.value||null}))}
              className="mt-3 min-h-12 w-full rounded-xl border border-[#cbd7cc] bg-[#fffefa] px-3 text-base"/>
          </label>
          <label className="rounded-2xl border border-[#e0e6da] bg-white p-4">
            <span className="block text-sm font-semibold">Period ends</span>
            <input type="date" value={selection.endsOn ?? ''} onChange={e =>
              setSelection(previous => ({...previous,endsOn:e.target.value||null}))}
              className="mt-3 min-h-12 w-full rounded-xl border border-[#cbd7cc] bg-[#fffefa] px-3 text-base"/>
          </label>
        </div>}
        <p className="mt-4 text-xs leading-5 text-[#617366]">
          Collection closes by {draft.deadline ?? 'the agreed deadline'} · Time zone: Kenya (Africa/Nairobi).
          A school-term or instalment schedule also needs the actual accepted school or provider dates.
        </p>
        {selection.startsOn && selection.endsOn && !periodOkay &&
          <div className="mt-3 rounded-xl border border-[#e8d0a6] bg-[#fff9ee] p-3 text-sm" role="alert">
            {assessCyclePeriod(draft,{...selection,sourceCategory:'existing-bill'},today).missing.join(' · ')}
          </div>}
        <button type="button" disabled={!periodOkay} onClick={() => setStage('source')}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          Continue <ArrowRight size={18} aria-hidden="true"/>
        </button>
      </section>}

      {stage === 'source' && <section aria-labelledby="c5b-source">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]">
          <FileText size={24} aria-hidden="true"/>
        </div>
        <h1 id="c5b-source" className="font-display text-[2rem] leading-tight">What should each payment belong to?</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">
          We must keep the real item, invoice, offer or named purpose behind every collection. An organizer cannot simply say that somebody owes money.
        </p>
        <div className="mt-6 grid gap-3" role="group" aria-label="Original source of the collection">
          {options.map(option =>
            <button type="button" key={option.id} aria-pressed={selection.sourceCategory === option.id}
              onClick={() => {setSelection(previous => ({...previous,sourceCategory:option.id as SourceCategory}));setStage('review');}}
              className={'flex min-h-[76px] items-center gap-3 rounded-2xl border p-4 text-left hover:border-[#83ac8b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41] ' +
                (selection.sourceCategory===option.id ? 'border-[#39784f] bg-[#edf6e9]' : 'border-[#e0e6da] bg-white')}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#a4b8a6]">
                {selection.sourceCategory===option.id && <Check size={16} aria-hidden="true"/>}
              </span>
              <span><span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[#617366]">{option.hint}</span></span>
            </button>)}
        </div>
      </section>}

      {stage === 'review' && <section aria-labelledby="c5b-review">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]">
          <ClipboardCheck size={24} aria-hidden="true"/>
        </div>
        <h1 id="c5b-review" className="font-display text-[2rem] leading-tight">Now each person's money can have its own story.</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">
          This is the outline. SecurePay must still verify the original source, the parties and their Agreement before it can save or share an actual collection.
        </p>
        <div className="mt-6 rounded-2xl border border-[#dfe6d9] bg-white p-4">
          <dl className="space-y-4 text-sm">
            <div><dt className="text-[#617366]">Collection type</dt><dd className="mt-1 font-semibold">{type?.title}</dd></div>
            <div><dt className="text-[#617366]">Period</dt><dd className="mt-1 font-semibold">{selection.startsOn} to {selection.endsOn}</dd></div>
            <div><dt className="text-[#617366]">Original source</dt><dd className="mt-1 font-semibold">{source?.label}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-[#617366]"><Users size={15} aria-hidden="true"/> Who reviews?</dt>
              <dd className="mt-1 font-semibold">{contributorDescriptions[draft.contributorScope ?? 'one']}</dd></div>
          </dl>
        </div>
        <div className="mt-4 rounded-2xl border border-[#d7e6d7] bg-[#f1f7ed] p-4">
          <div className="flex items-center gap-2"><ShieldCheck size={20} aria-hidden="true"/><h2 className="text-sm font-semibold">What SecurePay must protect</h2></div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#526b59]">
            {[
              'The actual bill, source item and accepted version stay attached to each payer.',
              'A person sees their own private proposal, not someone else’s fees or contributions.',
              'An accepted review is never an automatic debit or an instruction to the bank.',
              'Duplicate periods or items need a fresh, authorized Agreement—not another charge.',
            ].map(x => <li key={x} className="flex items-start gap-2"><LockKeyhole size={15} aria-hidden="true" className="mt-1 shrink-0"/>{x}</li>)}
          </ul>
        </div>
        {!assessment.reviewComplete && <p className="mt-3 text-sm text-[#8b5928]" role="alert">{assessment.missing.join(' · ')}</p>}
        <p className="mt-4 text-xs leading-5 text-[#657669]">
          Planning preview only. No collection period, payer obligation, SecureLink, bank connection or payment has been created, accepted or activated.
        </p>
        <button type="button" disabled={!assessment.reviewComplete} onClick={onContinue}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          See what the bank must support <ArrowRight size={18} aria-hidden="true"/>
        </button>
        <button type="button" onClick={() => setStage('period')}
          className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-[#38664a] hover:bg-[#edf1e9]">
          Change the dates or source
        </button>
      </section>}
    </main>
    <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-[#708074]">Agreement before Money · Each collection has its own terms</footer>
  </div>;
}
