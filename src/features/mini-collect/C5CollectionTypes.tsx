import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, LockKeyhole, ShieldCheck } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import {
  CADENCE_OPTIONS, collectionTypesFor, chooseCollectionCadence, chooseCollectionType,
  newCollectionTypeSelection, assessCollectionTypeSelection,
  type CollectionKind, type CollectionTypeSelection,
} from './collectionTypes.mjs';

/**
 * C5A: type-specific human planning, not a payment or Agreement form.
 * All choices are local review content. Only accepted canonical terms and
 * independently verified financial-provider authority can permit Money.
 */
export function C5CollectionTypes({ kind, onBack, onContinue, initialSelection }: {
  kind: CollectionKind;
  onBack: () => void;
  onContinue: (selection: CollectionTypeSelection) => void;
  initialSelection?: CollectionTypeSelection | null;
}) {
  const [selection, setSelection] = useState<CollectionTypeSelection>(() =>
    initialSelection && initialSelection.kind === kind && assessCollectionTypeSelection(initialSelection).draftComplete
      ? initialSelection : newCollectionTypeSelection(kind));
  const [stage, setStage] = useState<'type' | 'cadence' | 'review'>(() =>
    initialSelection && initialSelection.kind === kind && assessCollectionTypeSelection(initialSelection).draftComplete
      ? 'review' : 'type');
  const profile = collectionTypesFor(kind).find(x => x.id === selection.typeId);
  const cadence = CADENCE_OPTIONS.find(x => x.id === selection.cadence);
  const assessment = assessCollectionTypeSelection(selection);
  const goBack = () => {
    if (stage === 'review') setStage('cadence');
    else if (stage === 'cadence') setStage('type');
    else onBack();
  };
  const pickType = (id: string) => {
    setSelection(previous => chooseCollectionType(previous, id));
    setStage('cadence');
  };
  const pickCadence = (id: typeof CADENCE_OPTIONS[number]['id']) => {
    setSelection(previous => chooseCollectionCadence(previous, id));
    setStage('review');
  };

  return <div data-mini-collect-c5a className="min-h-screen bg-[#faf7f0] text-[#244936]">
    <header className="border-b border-[#e4e7dc] bg-[#fffefa]/95 px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1"><p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#677568]">Collect Money · Your collection</p></div>
        <span className="rounded-full border border-[#d6e3d4] bg-[#eff6e9] px-2.5 py-1 text-[11px] font-semibold text-[#42694d]">C5A preview</span>
      </div>
    </header>

    <main className="mx-auto max-w-xl px-4 pb-14 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <button type="button" onClick={goBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
          <ArrowLeft size={17} aria-hidden="true"/> Back
        </button>
        <span className="text-xs font-medium text-[#657568]">Step {stage === 'type' ? '1' : stage === 'cadence' ? '2' : '3'} of 3</span>
      </div>

      {stage === 'type' && <section aria-labelledby="c5-type-title">
        <h1 id="c5-type-title" className="font-display text-[2rem] leading-tight">What kind of collection is it?</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">Pick the closest situation. Different collections have different promises to the people paying.</p>
        <div className="mt-6 grid gap-3" role="group" aria-label="Collection type">
          {collectionTypesFor(kind).map(item => <button key={item.id} type="button" onClick={() => pickType(item.id)}
            className="min-h-[84px] rounded-2xl border border-[#e1e6dd] bg-white p-4 text-left hover:border-[#81a88b] hover:bg-[#f8fcf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
            <span className="block text-sm font-semibold">{item.title}</span>
            <span className="mt-1 block text-xs leading-5 text-[#617366]">{item.hint}</span>
            <span className="mt-1 block text-xs italic text-[#748072]">{item.example}</span>
          </button>)}
        </div>
      </section>}

      {stage === 'cadence' && profile && <section aria-labelledby="c5-cadence-title">
        <span className="inline-flex rounded-full bg-[#e8f0e3] px-3 py-1.5 text-xs font-semibold">{profile.title}</span>
        <h1 id="c5-cadence-title" className="mt-4 font-display text-[2rem] leading-tight">How often will this happen?</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">Every payment needs a clear period or purpose. This choice does not create a subscription or permission to debit anyone.</p>
        <div className="mt-6 grid gap-3" role="group" aria-label="Collection frequency">
          {CADENCE_OPTIONS.filter(item => profile.cadences.includes(item.id)).map(item =>
            <button key={item.id} type="button" onClick={() => pickCadence(item.id)}
              className="flex min-h-[70px] items-center gap-3 rounded-2xl border border-[#e1e6dd] bg-white p-4 text-left hover:border-[#81a88b] hover:bg-[#f8fcf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#a5bbaa]"><Check size={15} aria-hidden="true"/></span>
              <span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-[#617366]">{item.hint}</span></span>
            </button>)}
        </div>
      </section>}

      {stage === 'review' && profile && cadence && <section aria-labelledby="c5-review-title">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><ClipboardCheck size={24} aria-hidden="true"/></div>
        <h1 id="c5-review-title" className="font-display text-[2rem] leading-tight">Now we know what we're organizing.</h1>
        <p className="mt-3 text-sm leading-6 text-[#617366]">SecurePay will need these details before the collection can become a real Agreement.</p>

        <div className="mt-5 rounded-2xl border border-[#dfe5da] bg-white p-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#617366]">Purpose</dt><dd className="text-right font-semibold">{profile.title}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#617366]">Schedule</dt><dd className="text-right font-semibold">{cadence.title}</dd></div>
            <div><dt className="text-[#617366]">Who should receive the money?</dt><dd className="mt-1 font-medium">{profile.recipient}</dd></div>
          </dl>
        </div>
        <div className="mt-4 rounded-2xl border border-[#dce6d7] bg-[#f1f7ed] p-4">
          <div className="flex items-center gap-2"><ShieldCheck size={19} aria-hidden="true"/><h2 className="text-sm font-semibold">What must be clear</h2></div>
          <ul className="mt-3 space-y-3">
            {profile.checks.map(item => <li key={item} className="flex items-start gap-2 text-sm leading-6 text-[#526c58]">
              <LockKeyhole size={15} aria-hidden="true" className="mt-1 shrink-0"/>{item}</li>)}
          </ul>
        </div>
        {selection.cadence !== 'one-time' && <p className="mt-4 text-sm leading-6 text-[#5e705f]">Each cycle needs its own due period, contributor records and lawful instructions. No automatic debit, extension or new debt is authorized here.</p>}
        <p className="mt-4 text-xs leading-5 text-[#6d796d]">Local C5A planning only. No Agreement, SecureLink, debt, contribution record, collection or payment is created by this choice.</p>
        <button type="button" disabled={!assessment.draftComplete} onClick={() => onContinue(selection)}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          Agree on the collection rules <ArrowRight size={18} aria-hidden="true"/>
        </button>
        <button type="button" onClick={() => setStage('type')} className="mt-3 min-h-11 w-full rounded-xl text-sm font-semibold text-[#38664a] hover:bg-[#edf1e9]">Change the collection type</button>
      </section>}
    </main>
    <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-[#708074]">An agreed purpose first · Money follows the Agreement</footer>
  </div>;
}
