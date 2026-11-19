import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, Check, ChevronRight,
  GraduationCap, HandHeart, Landmark, LockKeyhole, ReceiptText, RotateCcw,
  ShieldCheck, ShoppingBag, Sparkles, Users, WalletCards,
} from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import { C2GovernanceExperience } from './C2GovernanceExperience';
import { C5CollectionTypes } from './C5CollectionTypes';
import type { CollectionTypeSelection } from './collectionTypes.mjs';

/**
 * C1 is an intentionally non-transactional, phone-first discovery experience.
 * It does not create a Collection, Agreement, SecureLink or payment instruction,
 * and it does not infer who is entitled to other people's money.
 * Governance and provider capability verification are C2/C3 requirements.
 */
type CollectionKind = 'buy' | 'paid' | 'regular' | 'group' | 'give' | 'goal';
type Stage = 'purpose' | 'detail' | 'review';

interface AnswerPill {
  label: string;
  detail: string;
}

interface CollectionPath {
  id: CollectionKind;
  title: string;
  hint: string;
  example: string;
  question: string;
  options: readonly AnswerPill[];
  possibility: string;
  safeguards: readonly string[];
}

export const C1_COLLECTION_PATHS: readonly CollectionPath[] = [
  {
    id: 'buy', title: 'Buy something together', hint: 'Bring people together for one purchase',
    example: 'Equipment, building materials or a shared item',
    question: 'Where is the item you want to buy?',
    options: [
      { label: 'In a SecurePay store', detail: 'Use the original offer and keep its version.' },
      { label: 'I have a quote or photo', detail: 'Bring the seller’s details for examination.' },
      { label: 'Help us find it', detail: 'Start with the item and explore suitable options.' },
    ],
    possibility: 'We can help the group organize contributions around the actual item, then check price, stock, reservation and delivery before any purchase payout.',
    safeguards: ['Seller, item and offer must be verified.', 'A full collection does not authorize payment.', 'Agree what happens if the item is unavailable or the target is missed.'],
  },
  {
    id: 'paid', title: 'Get paid for something', hint: 'School fees, services or an amount due',
    example: 'A headmaster, trainer or transport operator',
    question: 'What will people be paying for?',
    options: [
      { label: 'An existing Agreement or bill', detail: 'Keep each obligation and its source clear.' },
      { label: 'A service I am offering', detail: 'Explain what you will deliver and when.' },
      { label: 'Something already delivered', detail: 'Confirm the actual payment obligation first.' },
    ],
    possibility: 'We can help the right people pay the right bill, keep purposes separate, and build an accurate history without chasing screenshots.',
    safeguards: ['A claimed debt is not assumed to be accepted.', 'Confirm the receiving party and payer’s obligation.', 'Refund and cancellation rights follow the agreed terms.'],
  },
  {
    id: 'regular', title: 'Collect regularly', hint: 'Monthly dues, membership or subscriptions',
    example: 'Estate contributions, routes or club fees',
    question: 'How often should this happen?',
    options: [
      { label: 'Every month', detail: 'Prepare a separate period under continuing terms.' },
      { label: 'Every school term', detail: 'Match the timetable to term dates.' },
      { label: 'Another agreed schedule', detail: 'Set dates before inviting contributors.' },
    ],
    possibility: 'We can prepare a repeatable collection, remember who owes what for each period, and make reminders and records easier.',
    safeguards: ['Every cycle has a defined period and end.', 'Avoid duplicate or incorrect billing.', 'Changes to amounts or terms need valid authority.'],
  },
  {
    id: 'group', title: 'Our group or merry-go-round', hint: 'Chama contributions and agreed payouts',
    example: 'Saving circles, welfare groups and rotations',
    question: 'How does your group work?',
    options: [
      { label: 'We already agreed our rules', detail: 'Bring the schedule and agreed payout order.' },
      { label: 'We are starting a new group', detail: 'Help everyone understand the rules first.' },
      { label: 'A shared project, not a rotation', detail: 'Tie the money to a defined group purpose.' },
    ],
    possibility: 'We can help make the contribution cycle clear to everyone, remember the payout order and prepare the agreed disbursement instructions.',
    safeguards: ['Confirm membership, voting and payout authority.', 'Define missed-payment and withdrawal rules.', 'Only an eligible regulated provider may hold or disburse funds.'],
  },
  {
    id: 'give', title: 'Giving or fundraising', hint: 'Church, welfare or a community cause',
    example: 'Offering, tithe, development or a fundraiser',
    question: 'Who are you collecting for?',
    options: [
      { label: 'An organization with a KSNumber', detail: 'Use its verified identity and purposes.' },
      { label: 'A group organizing a fundraiser', detail: 'Agree the beneficiary and collection window.' },
      { label: 'Another person', detail: 'First establish your authority to collect for them.' },
    ],
    possibility: 'We can keep different purposes separate and prepare a SecureLink whose verified totals and collection summary can stay current.',
    safeguards: ['Verify the real beneficiary and collection authority.', 'A donation is not automatically refundable.', 'Keep individual giving private, especially tithes.'],
  },
  {
    id: 'goal', title: 'Save towards a goal', hint: 'An education fund or a future need',
    example: 'School fees, an important event or equipment',
    question: 'When will the money be needed?',
    options: [
      { label: 'On a known date', detail: 'Work backwards from that deadline.' },
      { label: 'Over several months', detail: 'Plan contributions around the time horizon.' },
      { label: 'We have not decided', detail: 'Start with the purpose before setting money rules.' },
    ],
    possibility: 'We can help plan contributions around the deadline and later explore appropriate regulated financial services, if authorized and available.',
    safeguards: ['Agree ownership, permitted uses and return rules.', 'Check liquidity before suggesting financial services.', 'Never invest contributions without valid consent.'],
  },
];

const icons = {
  buy: ShoppingBag, paid: ReceiptText, regular: CalendarDays,
  group: Users, give: HandHeart, goal: GraduationCap,
} as const;

export function C1CollectExperience() {
  const [stage, setStage] = useState<Stage>('purpose');
  const [kind, setKind] = useState<CollectionKind | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [collectionType, setCollectionType] = useState<CollectionTypeSelection | null>(null);
  const selected = C1_COLLECTION_PATHS.find(path => path.id === kind);
  const selectedAnswer = selected?.options.find(option => option.label === answer);

  const choose = (next: CollectionKind) => {
    setKind(next);
    setAnswer(null);
    setCollectionType(null);
    setTypeOpen(false);
    setStage('detail');
  };
  const goBack = () => {
    if (stage === 'review') setStage('detail');
    else if (stage === 'detail') { setStage('purpose'); setAnswer(null); }
    else { setKind(null); setAnswer(null); setStage('purpose'); }
  };
  const reset = () => { setKind(null); setAnswer(null); setGovernanceOpen(false); setTypeOpen(false); setCollectionType(null); setStage('purpose'); };

  if (governanceOpen && selected && selectedAnswer && collectionType) {
    return <C2GovernanceExperience kind={selected.id} collectionTypeSelection={collectionType}
      onBack={() => { setGovernanceOpen(false); setTypeOpen(true); }} />;
  }
  if (typeOpen && selected && selectedAnswer) {
    return <C5CollectionTypes kind={selected.id} initialSelection={collectionType} onBack={() => setTypeOpen(false)}
      onContinue={selection => {
        setCollectionType(selection);
        setTypeOpen(false);
        setGovernanceOpen(true);
      }}/>;
  }

  return (
    <div data-mini-collect-c1 className="min-h-screen bg-[#faf7f0] text-[#244936]">
      <header className="border-b border-[#e6e6da] bg-[#fffefa]/95 px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src={securepayMark} className="h-9 w-9 object-contain" alt="" />
            <div>
              <div className="text-sm font-semibold tracking-tight">SecurePay Mini</div>
              <div className="text-xs text-[#62736b]">Collect Money</div>
            </div>
          </div>
          <span className="rounded-full border border-[#c9ddce] bg-[#edf6ed] px-2.5 py-1 text-[11px] font-semibold text-[#34664a]">C1 experience preview</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-9">
        <div className="mb-5 flex items-center justify-between gap-3">
          {stage === 'purpose' ? <span className="text-xs font-semibold uppercase tracking-[0.13em] text-[#667b6d]">Start with what matters</span> : (
            <button type="button" onClick={goBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#275c40]">
              <ArrowLeft size={17} aria-hidden="true" /> Back
            </button>
          )}
          <div className="flex items-center gap-1.5" aria-label={`Step ${stage === 'purpose' ? '1' : stage === 'detail' ? '2' : '3'} of 3`}>
            {(['purpose','detail','review'] as const).map((step, index) =>
              <span key={step} className={`h-1.5 rounded-full ${stage === step ? 'w-8 bg-[#38704e]' : index < (stage === 'detail' ? 1 : stage === 'review' ? 2 : 0) ? 'w-4 bg-[#a0bfa6]' : 'w-4 bg-[#dddcd1]'}`} />
            )}
          </div>
        </div>

        {stage === 'purpose' && (
          <section aria-labelledby="collect-c1-heading">
            <div className="mb-6">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f0e3]"><WalletCards size={23} aria-hidden="true" /></div>
              <h1 id="collect-c1-heading" className="font-display text-[2.1rem] leading-tight sm:text-[2.7rem]">Let's make something happen.</h1>
              <p className="mt-3 max-w-md text-[0.98rem] leading-7 text-[#5b7063]">What are you collecting money for? Choose what feels closest. We'll help you discover the possibilities, one simple decision at a time.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Collection purposes">
              {C1_COLLECTION_PATHS.map(path => {
                const Icon = icons[path.id];
                return <button key={path.id} type="button" onClick={() => choose(path.id)}
                  className="group flex min-h-[116px] w-full items-start gap-3 rounded-2xl border border-[#e1e4d9] bg-white p-4 text-left shadow-sm transition-colors hover:border-[#7da487] hover:bg-[#fafdf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#275c40]">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3e9] text-[#316648]"><Icon size={19} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-5">{path.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#617368]">{path.hint}</span>
                  </span>
                  <ChevronRight size={17} aria-hidden="true" className="mt-2 shrink-0 text-[#809187]" />
                </button>;
              })}
            </div>
            <p className="mt-6 text-xs leading-5 text-[#64766a]">You don't need an amount or a bank yet. No collection is created or money moved in this preview.</p>
          </section>
        )}

        {stage === 'detail' && selected && (
          <section aria-labelledby="collect-c1-question">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e8f0e3] px-3 py-2 text-xs font-semibold text-[#315c41]">
              <Check size={15} aria-hidden="true" /> {selected.title}
            </div>
            <h1 id="collect-c1-question" className="font-display text-[2rem] leading-tight sm:text-[2.5rem]">{selected.question}</h1>
            <p className="mt-3 text-sm leading-6 text-[#607467]">Just choose what fits. We can settle the finer details later.</p>
            <div className="mt-6 space-y-3" role="group" aria-label={selected.question}>
              {selected.options.map(option => {
                const picked = answer === option.label;
                return <button key={option.label} type="button" aria-pressed={picked} onClick={() => setAnswer(option.label)}
                  className={`flex min-h-[74px] w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#275c40] ${picked ? 'border-[#39784f] bg-[#eff7eb]' : 'border-[#e2e4dc] bg-white hover:border-[#a0bfa6]'}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${picked ? 'border-[#39784f] bg-[#39784f] text-white' : 'border-[#a8b7aa] text-[#a8b7aa]'}`}>{picked && <Check size={16} aria-hidden="true" />}</span>
                  <span><span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block text-xs leading-5 text-[#5d7263]">{option.detail}</span></span>
                </button>;
              })}
            </div>
            {answer && (
              <div className="mt-5 rounded-2xl border border-[#d6e5d5] bg-[#f0f6ed] p-4" role="status">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Sparkles size={17} aria-hidden="true" /> Here's what becomes possible</div>
                <p className="text-sm leading-6 text-[#466452]">{selected.possibility}</p>
              </div>
            )}
            <button type="button" disabled={!answer} onClick={() => setStage('review')}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41] disabled:cursor-not-allowed disabled:bg-[#abb8ac]">
              See my collection taking shape <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        )}

        {stage === 'review' && selected && selectedAnswer && (
          <section aria-labelledby="collect-c1-review">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><BookOpenCheck size={24} aria-hidden="true" /></div>
            <h1 id="collect-c1-review" className="font-display text-[2rem] leading-tight">Your idea is taking shape.</h1>
            <p className="mt-2 text-sm leading-6 text-[#607467]">Here's what SecurePay can help prepare before anyone is asked to contribute.</p>
            <div className="mt-6 rounded-2xl border border-[#dfe4d9] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#68816d]">Collection purpose</p>
              <h2 className="mt-1 font-display text-xl">{selected.title}</h2>
              <p className="mt-2 text-sm text-[#607467]">{selectedAnswer.label}</p>
              <div className="my-4 h-px bg-[#e8ebdf]" />
              <div className="flex items-start gap-2"><Sparkles size={18} className="mt-0.5 shrink-0 text-[#3d7953]" aria-hidden="true" /><p className="text-sm leading-6">{selected.possibility}</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-[#e0e3d9] bg-[#f7f8f2] p-5">
              <div className="flex items-center gap-2"><ShieldCheck size={19} aria-hidden="true" /><h2 className="text-sm font-semibold">Before any money is collected</h2></div>
              <ul className="mt-3 space-y-3">
                {selected.safeguards.map(rule => <li key={rule} className="flex items-start gap-2 text-sm leading-5 text-[#51675a]"><LockKeyhole size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{rule}</li>)}
              </ul>
              <div className="mt-4 flex items-start gap-2 border-t border-[#e2e5dc] pt-3 text-xs leading-5 text-[#687a6c]">
                <Landmark size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                Financial-provider capabilities, governed rules and valid authorizations must be confirmed in later phases. C1 never assumes they exist.
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#667568]">C1 experience preview only. Nothing is saved, agreed, sent, invested or paid. SecureLinks, live totals and regulated Money actions come in later phases.</p>
            <button type="button" onClick={() => setTypeOpen(true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
              Choose the type and rules <ArrowRight size={18} aria-hidden="true"/>
            </button>
            <button type="button" onClick={reset} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
              <RotateCcw size={17} aria-hidden="true" /> Explore another collection
            </button>
            <button type="button" onClick={goBack} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-[#38664a] hover:bg-[#edf1e9]">Change my answer</button>
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-[#718074]">Trust is the currency · Money follows the Agreement</footer>
    </div>
  );
}
