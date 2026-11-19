import { useState } from 'react';
import { C4MyContributionStatus } from './C4MyContributionStatus';
import { COLLECTION_TYPE_PROFILES, CADENCE_OPTIONS } from './collectionTypes.mjs';
import { ArrowLeft, CalendarClock, Check, Clock3, RotateCcw, ShieldAlert, Users } from 'lucide-react';
import type { GovernanceDraft } from './governanceDraft.mjs';
import { failureOptions, PAYOUT_RULES } from './governanceDraft.mjs';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

type Pill = { days: number; label: string };
const decisions: Pill[] = [
  { days: 1, label: 'Within 1 day' },
  { days: 3, label: 'Within 3 days' },
  { days: 7, label: 'Within 7 days' },
];
const instructions: Pill[] = [
  { days: 8, label: 'By day 8' },
  { days: 10, label: 'By day 10' },
  { days: 14, label: 'By day 14' },
];
const resolutions: Pill[] = [
  { days: 15, label: 'By day 15' },
  { days: 21, label: 'By day 21' },
  { days: 30, label: 'By day 30' },
];

/**
 * C3D deliberately explains a possible finite plan only. No provider is
 * chosen or capable of receiving Money in this preview. Date intervals are
 * illustrative; a real plan must pass canonical C2 + C3A/B/C provider proof.
 */
export function C3DClosingPreview({ draft, onBack }: {
  draft: GovernanceDraft;
  onBack: () => void;
}) {
  const [decision, setDecision] = useState(3);
  const [instruction, setInstruction] = useState(10);
  const [resolution, setResolution] = useState(21);
  const [reviewing, setReviewing] = useState(false);
  const [lookingAtMyMoney, setLookingAtMyMoney] = useState(false);
  const fallback = failureOptions(draft.kind).find(f => f.id === draft.failureRule);
  const approval = PAYOUT_RULES.find(p => p.id === draft.payoutRule);
  const latestClose = draft.deadline || 'the agreed closing date';
  const isReturnKind = draft.kind !== 'give' || draft.failureRule !== 'close-report';
  const pill = (name: string, options: Pill[], selected: number, select: (v: number) => void) =>
    <div role="group" aria-label={name} className="mt-3 flex flex-wrap gap-2">
      {options.map(option => <button key={option.days} type="button"
        aria-pressed={selected === option.days}
        onClick={() => select(option.days)}
        className={'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition ' +
          (selected === option.days
            ? 'border-[#3b7150] bg-[#e2efde] text-[#244e34]'
            : 'border-[#d4ddd1] bg-white text-[#536456] hover:bg-[#f2f6ed]')}>
        {selected === option.days && <Check size={15} aria-hidden="true"/>}
        {option.label}
      </button>)}
    </div>;
  if (lookingAtMyMoney) return <C4MyContributionStatus onBack={() => setLookingAtMyMoney(false)}
    planningContext={draft.collectionTypeId && draft.collectionCadence ? {
      typeTitle: COLLECTION_TYPE_PROFILES.find(x => x.id === draft.collectionTypeId)?.title ?? 'Collection',
      cadenceTitle: CADENCE_OPTIONS.find(x => x.id === draft.collectionCadence)?.title ?? 'Unverified schedule',
    } : undefined}/>;

  return <div className="min-h-screen bg-[#faf7f0] text-[#244936]" data-mini-collect-c3d>
    <header className="border-b border-[#e3e8dc] bg-[#fffefa]/95 px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1">
          <p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#667666]">Collect Money · Closing and contributor protection</p>
        </div>
        <span className="rounded-full bg-[#edf3e8] px-2 py-1 text-xs text-[#416d4b]">C3D preview</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#edf0e9]">
        <ArrowLeft size={17} aria-hidden="true"/> Back to providers
      </button>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><CalendarClock size={24}/></div>
      <h1 className="font-display text-[2rem] leading-tight">What happens when the collection ends?</h1>
      <p className="mt-3 text-sm leading-6 text-[#637368]">
        Let everyone know the plan before they contribute. No one should have to chase
        you to discover whether the goal was met or what happens to unused money.
      </p>

      {!reviewing ? <>
        <section className="mt-6 rounded-3xl border border-[#dfebdb] bg-white p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 text-[#3b7150]" size={21} aria-hidden="true"/>
            <div className="flex-1">
              <h2 className="font-semibold">When does it close?</h2>
              <p className="mt-1 text-sm leading-6 text-[#607362]">No later than <strong>{latestClose}</strong>, or earlier if your fixed target is met and the agreed stop rule requires it.</p>
            </div>
          </div>
          <hr className="my-4 border-[#e8eee6]"/>
          <h3 className="text-sm font-semibold">If the plan does not succeed</h3>
          <p className="mt-1.5 text-sm leading-6 text-[#617367]">{fallback?.label ?? 'Your agreed fallback'} stays exactly as chosen in your collection rules. No organizer can quietly change it here.</p>
        </section>

        <section className="mt-4 rounded-3xl border border-[#dfebdb] bg-white p-5">
          <h2 className="font-semibold">1. How soon must a decision be made?</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#607362]">Choose a firm deadline after the latest closing date.</p>
          {pill('Decision deadline', decisions, decision, setDecision)}
        </section>
        <section className="mt-4 rounded-3xl border border-[#dfebdb] bg-white p-5">
          <h2 className="font-semibold">2. When should refund instructions be sent?</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#607362]">If contributors are entitled to a return, the certified provider must receive the proper instructions by this deadline.</p>
          {pill('Refund instruction deadline', instructions, instruction, setInstruction)}
        </section>
        <section className="mt-4 rounded-3xl border border-[#dfebdb] bg-white p-5">
          <h2 className="font-semibold">3. When must unresolved returns be addressed?</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#607362]">A final deadline for confirmation, reconciliation, and escalation—not an invented promise that every refund has arrived.</p>
          {pill('Resolution deadline', resolutions, resolution, setResolution)}
        </section>
        <button type="button" onClick={() => setReviewing(true)}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white hover:bg-[#1f4b36]">
          Review how contributors are protected
        </button>
      </> : <>
        <section className="mt-6 rounded-3xl border border-[#dce8d7] bg-white p-5">
          <h2 className="font-semibold">The proposed closing plan</h2>
          <div className="mt-4 grid gap-4 text-sm">
            <div><span className="text-[#708173]">Latest closing date</span><p className="font-semibold">{latestClose}</p></div>
            <div><span className="text-[#708173]">Decision deadline</span><p className="font-semibold">Within {decision} {decision === 1 ? 'day' : 'days'} after closing</p></div>
            <div><span className="text-[#708173]">Refund instruction deadline</span><p className="font-semibold">By day {instruction} after closing, where a refund is owed</p></div>
            <div><span className="text-[#708173]">Final resolution or escalation</span><p className="font-semibold">By day {resolution} after closing</p></div>
            <div><span className="text-[#708173]">Failure outcome</span><p className="font-semibold">{fallback?.label ?? 'Requires clarification'}</p></div>
            <div><span className="text-[#708173]">Who can authorize release?</span><p className="font-semibold">{approval?.label ?? 'The agreed authorized decision-makers'}</p></div>
          </div>
        </section>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#d5dfd1] bg-[#f0f6ec] p-4">
          <RotateCcw size={20} className="mt-0.5 shrink-0" aria-hidden="true"/>
          <p className="text-sm leading-6">If a return is due, contributors should receive status updates and the provider must reconcile the payment to its rightful source. If a return fails, the matter must be escalated and affected people notified—not silently closed.</p>
        </div>
        <button type="button" onClick={() => setReviewing(false)}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#ccdccc] bg-white px-4 text-sm font-semibold text-[#285d41]">
          Adjust the deadlines
        </button>
      </>}

      <section className="mt-5 rounded-2xl border border-[#e0e4d4] bg-[#fffefa] p-4">
        <div className="flex gap-2"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-[#94662d]" aria-hidden="true"/>
          <div><h2 className="text-sm font-semibold">Strict before any contribution</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#657365]">A verified provider must support the full collection and resolution period, disclose fees, and sign the specific mandate. All affected participants must accept material terms in the Agreement. This preview does none of those things.</p>
          </div>
        </div>
      </section>
      <div className="mt-4 flex gap-2 text-xs leading-5 text-[#6a7b6e]">
        <Users size={16} className="mt-0.5 shrink-0" aria-hidden="true"/>
        <p>{isReturnKind ? 'A contributor’s entitlement to a return must be established from the accepted Agreement and verified funds.' : 'Giving arrangements may have different return rights; the accepted purpose and lawful conditions govern.'} A deadline by itself cannot refund anyone.</p>
      </div>
      <button type="button" onClick={() => setLookingAtMyMoney(true)}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#c7d9ca] bg-white px-4 text-sm font-semibold text-[#285d41] hover:bg-[#edf5ea]">
        See how contributors check their own money
      </button>
      <p className="mt-4 text-xs leading-5 text-[#728073]">Illustrative C3D planning only. No provider selected, proposal submitted, Agreement changed, collection activated or funds moved.</p>
    </main>
  </div>;
}
