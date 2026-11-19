import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardCheck, LockKeyhole, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  ACTOR_CAPACITIES, CONTRIBUTOR_SCOPES, beneficiaryOptions, TARGET_MODES, STOP_RULES, SURPLUS_RULES, CHANGE_RULES,
  PAYOUT_RULES, SERVER_GATES, START_RULES, failureOptions, newGovernanceDraft,
  withGovernanceAnswer, isCalendarDate, assessGovernanceDraft,
  type CollectionKind, type GovernanceDraft, type AnswerOption,
} from './governanceDraft.mjs';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import { C3ProviderPossibilities } from './C3ProviderPossibilities';

type Stage = 'capacity' | 'people' | 'target' | 'end' | 'failure' | 'control' | 'review';
const STAGES: readonly Stage[] = ['capacity', 'people', 'target', 'end', 'failure', 'control', 'review'];

const TITLES: Record<CollectionKind, string> = {
  buy: 'Buying something together',
  paid: 'Getting paid for something',
  regular: 'Regular contributions',
  group: 'Our group collection',
  give: 'Giving or fundraising',
  goal: 'Saving for a goal',
};

function localTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
function OptionPills({ options, value, onChoose, ariaLabel }: {
  options: readonly AnswerOption[]; value: string | null;
  onChoose: (answer: string) => void; ariaLabel: string;
}) {
  return <div role="group" aria-label={ariaLabel} className="mt-4 grid gap-2.5">
    {options.map(option => {
      const chosen = option.id === value;
      return <button type="button" key={option.id} aria-pressed={chosen} onClick={() => onChoose(option.id)}
        className={'flex min-h-[64px] items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41] ' + (chosen ? 'border-[#38734b] bg-[#ecf6eb]' : 'border-[#e3e6dd] bg-white hover:border-[#a1baa6]')}>
        <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ' + (chosen ? 'border-[#39784f] bg-[#39784f] text-white' : 'border-[#a8b7aa]')}>
          {chosen && <Check aria-hidden="true" size={15}/>}
        </span>
        <span><span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block text-xs leading-5 text-[#617366]">{option.hint}</span></span>
      </button>;
    })}
  </div>;
}

export function C2GovernanceExperience({ kind, onBack }: {kind: CollectionKind; onBack: () => void}) {
  const [draft, setDraft] = useState<GovernanceDraft>(() => newGovernanceDraft(kind));
  const [stage, setStage] = useState<Stage>('capacity');
  const [providerExplorationOpen, setProviderExplorationOpen] = useState(false);
  const todayIso = localTodayISO();
  const assessment = assessGovernanceDraft(draft, todayIso);
  const stepIndex = STAGES.indexOf(stage);

  function answer<K extends keyof Omit<GovernanceDraft, 'kind'>>(key: K, value: GovernanceDraft[K]) {
    setDraft(previous => withGovernanceAnswer(previous, key, value));
  }
  const validCurrent = (() => {
    if (stage === 'capacity') return !!draft.capacity;
    if (stage === 'people') return !!draft.contributorScope && beneficiaryOptions(kind).some(option => option.id === draft.beneficiaryRule);
    if (stage === 'target') return (draft.kind !== 'buy' || draft.targetMode === 'fixed') &&
      (draft.targetMode === 'open' || (draft.targetMode === 'fixed' && Number.isSafeInteger(draft.targetAmountKes ?? 0) && (draft.targetAmountKes ?? 0) > 0));
    if (stage === 'end') return !!draft.startRule && (draft.startRule !== 'scheduled' || (isCalendarDate(draft.startDate) && (draft.startDate ?? '') > todayIso && (draft.startDate ?? '') <= (draft.deadline ?? ''))) && isCalendarDate(draft.deadline) && (draft.deadline ?? '') > todayIso &&
      (draft.targetMode === 'open' || (draft.stopRule != null && (draft.stopRule !== 'date-only' || !!draft.surplusRule)));
    if (stage === 'failure') return failureOptions(kind).some(option => option.id === draft.failureRule);
    if (stage === 'control') return !!draft.changeRule && !!draft.payoutRule &&
      (!['buy','group'].includes(kind) || draft.payoutRule !== 'verified-beneficiary');
    return false;
  })();
  const next = () => { if (validCurrent && stepIndex < STAGES.length - 1) setStage(STAGES[stepIndex + 1]); };
  const back = () => { if (stepIndex === 0) onBack(); else setStage(STAGES[stepIndex - 1]); };

  if (providerExplorationOpen) return <C3ProviderPossibilities draft={draft} onBack={() => setProviderExplorationOpen(false)} />;

  return (
    <div className="min-h-screen bg-[#faf7f0] text-[#244936]" data-mini-collect-c2>
      <header className="border-b border-[#e4e7dc] bg-[#fffefa]/95 px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
          <div className="flex-1"><p className="text-sm font-semibold">SecurePay Mini</p><p className="text-xs text-[#677568]">Collect Money · Let's agree on the rules</p></div>
          <span className="rounded-full border border-[#d6e3d4] bg-[#eff6e9] px-2.5 py-1 text-[11px] font-semibold text-[#42694d]">C2 preview</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-14 pt-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
            <ArrowLeft size={17} aria-hidden="true"/> Back
          </button>
          <div className="text-xs font-medium text-[#657568]">Step {stepIndex + 1} of {STAGES.length}</div>
        </div>
        <div className="mb-5 flex gap-1.5" aria-hidden="true">
          {STAGES.map((step, index) => <span key={step} className={'h-1.5 flex-1 rounded-full ' + (stepIndex >= index ? 'bg-[#4b805b]' : 'bg-[#e2e6dc]')}/>)}
        </div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#64806a]">{TITLES[kind]}</p>

        {stage === 'capacity' && <section aria-labelledby="c2-capacity">
          <h1 id="c2-capacity" className="font-display text-[2rem] leading-tight">Whose collection will this be?</h1>
          <p className="mt-3 text-sm leading-6 text-[#627366]">The person organizing and the rightful recipient may be different. We'll verify authority before launching it.</p>
          <OptionPills ariaLabel="Who is collecting" options={ACTOR_CAPACITIES} value={draft.capacity} onChoose={choice => answer('capacity', choice as GovernanceDraft['capacity'])}/>
        </section>}

        {stage === 'people' && <section aria-labelledby="c2-people">
          <h1 id="c2-people" className="font-display text-[2rem] leading-tight">Who's involved?</h1>
          <p className="mt-3 text-sm leading-6 text-[#627366]">Knowing who may contribute and who will receive the money protects everyone involved.</p>
          <h2 className="mt-6 text-sm font-semibold">Who may contribute?</h2>
          <OptionPills ariaLabel="Contributor eligibility" options={CONTRIBUTOR_SCOPES} value={draft.contributorScope}
            onChoose={value => answer('contributorScope', value as GovernanceDraft['contributorScope'])}/>
          <h2 className="mt-6 text-sm font-semibold">Who should ultimately receive it?</h2>
          <OptionPills ariaLabel="Payout beneficiary" options={beneficiaryOptions(kind)} value={draft.beneficiaryRule}
            onChoose={value => answer('beneficiaryRule', value)}/>
          <p className="mt-4 text-xs leading-5 text-[#6a796c]">These are intentions. The exact contributors, beneficiary KSNumber, receiving account and rights still need independent verification.</p>
        </section>}

        {stage === 'target' && <section aria-labelledby="c2-target">
          <h1 id="c2-target" className="font-display text-[2rem] leading-tight">How much are we working towards?</h1>
          <p className="mt-3 text-sm leading-6 text-[#627366]">{kind === 'buy' ? 'A specific purchase needs a clear target tied to the item and its current offer.' : 'Some collections have an exact target. Others simply accept contributions during an agreed period.'}</p>
          <OptionPills ariaLabel="Collection target type" options={TARGET_MODES.filter(option => kind !== 'buy' || option.id === 'fixed')} value={draft.targetMode}
            onChoose={value => answer('targetMode', value as GovernanceDraft['targetMode'])}/>
          {draft.targetMode === 'fixed' && <label className="mt-5 block text-sm font-semibold">
            Target amount in KSh
            <input data-collect-target type="number" inputMode="numeric" min="1" step="1" value={draft.targetAmountKes ?? ''}
              onChange={event => { const raw = event.target.value.trim(); answer('targetAmountKes', raw === '' ? null : Number(raw)); }}
              placeholder="e.g. 30000" className="mt-2 min-h-12 w-full rounded-xl border border-[#c7d8c9] bg-white px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#285d41]"/>
            <span className="mt-2 block text-xs font-normal text-[#6c796e]">Exact amounts are verified again by the Agreement and provider; this is only a draft.</span>
          </label>}
        </section>}

        {stage === 'end' && <section aria-labelledby="c2-end">
          <h1 id="c2-end" className="font-display text-[2rem] leading-tight">When should it start and stop?</h1>
          <p className="mt-3 text-sm leading-6 text-[#627366]">Every collection needs a clear closing point, including each recurring period.</p>
          <h2 className="mt-6 text-sm font-semibold">When may contributions begin?</h2>
          <OptionPills ariaLabel="Collection start rule" options={START_RULES} value={draft.startRule}
            onChoose={value => answer('startRule', value as GovernanceDraft['startRule'])}/>
          {draft.startRule === 'scheduled' && <label className="mt-4 block text-sm font-semibold">Planned start date
            <input data-collect-start type="date" min={todayIso} max={draft.deadline ?? undefined} value={draft.startDate ?? ''}
              onChange={event => answer('startDate', event.target.value || null)}
              className="mt-2 min-h-12 w-full rounded-xl border border-[#c7d8c9] bg-white px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#285d41]"/>
          </label>}
          <h2 className="mt-6 text-sm font-semibold">When does this collection close?</h2>
          <label className="mt-5 block text-sm font-semibold"><span className="inline-flex items-center gap-2"><CalendarDays size={18} aria-hidden="true"/> Collection closing date</span>
            <input data-collect-deadline type="date" min={todayIso} value={draft.deadline ?? ''}
              onChange={event => answer('deadline', event.target.value || null)}
              className="mt-2 min-h-12 w-full rounded-xl border border-[#c7d8c9] bg-white px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#285d41]"/>
          </label>
          {draft.targetMode === 'fixed' && <>
            <h2 className="mt-6 text-sm font-semibold">What should close the collection?</h2>
            <OptionPills ariaLabel="Collection stop rule" options={STOP_RULES} value={draft.stopRule}
              onChoose={value => answer('stopRule', value as GovernanceDraft['stopRule'])}/>
            {draft.stopRule === 'date-only' && <>
              <h2 className="mt-6 text-sm font-semibold">What about money above the target?</h2>
              <OptionPills ariaLabel="Surplus rule" options={SURPLUS_RULES} value={draft.surplusRule}
                onChoose={value => answer('surplusRule', value as GovernanceDraft['surplusRule'])}/>
            </>}
          </>}
          {draft.targetMode === 'open' && <p className="mt-5 rounded-xl border border-[#d8e3d6] bg-[#f0f6ec] p-3 text-sm leading-6 text-[#46664e]">There is no fixed target. Contributions end at the stated date, not after an invented amount is reached.</p>}
        </section>}

        {stage === 'failure' && <section aria-labelledby="c2-failure">
          <h1 id="c2-failure" className="font-display text-[2rem] leading-tight">{draft.targetMode === 'fixed' ? "What if the target or plan doesn't work out?" : 'What happens when this period ends?'}</h1>
          <p className="mt-3 text-sm leading-6 text-[#627366]">Choose a fair fallback now, so nobody has to chase the organizer later.</p>
          <OptionPills ariaLabel="Collection fallback rule" options={failureOptions(kind)} value={draft.failureRule} onChoose={value => answer('failureRule', value)}/>
          <p className="mt-4 text-xs leading-5 text-[#68796e]">Choosing a refund rule is not a refund guarantee. Actual entitlements and execution need accepted terms and an eligible provider.</p>
        </section>}

        {stage === 'control' && <section aria-labelledby="c2-control">
          <h1 id="c2-control" className="font-display text-[2rem] leading-tight">Who can make important decisions?</h1>
          <p className="mt-3 text-sm leading-6 text-[#627366]">The organizer should not be able to change the purpose or pay someone else without valid authority.</p>
          <h2 className="mt-6 text-sm font-semibold">Changing the purpose, deadline or important terms</h2>
          <OptionPills ariaLabel="Authority for material changes" options={CHANGE_RULES} value={draft.changeRule} onChoose={value => answer('changeRule', value as GovernanceDraft['changeRule'])}/>
          <h2 className="mt-6 text-sm font-semibold">Authorizing a payout</h2>
          <OptionPills ariaLabel="Authority for disbursement" options={PAYOUT_RULES.filter(option => !['buy','group'].includes(kind) || option.id !== 'verified-beneficiary')}
            value={draft.payoutRule} onChoose={value => answer('payoutRule', value as GovernanceDraft['payoutRule'])}/>
          <div className="mt-5 flex gap-2 rounded-xl border border-[#e0e4db] bg-white p-3 text-xs leading-5 text-[#627268]">
            <ShieldAlert size={18} className="shrink-0" aria-hidden="true"/>
            These choices must become verified, version-bound approvals in the backend. Choosing a pill cannot appoint a signatory or authorize a bank instruction.
          </div>
        </section>}

        {stage === 'review' && <section aria-labelledby="c2-review">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><ClipboardCheck size={24} aria-hidden="true"/></div>
          <h1 id="c2-review" className="font-display text-[2rem] leading-tight">Your collection rules are taking shape.</h1>
          <p className="mt-2 text-sm leading-6 text-[#617567]">You've organized the decisions. Nothing is accepted or activated until every required person and financial service is verified.</p>
          <div className="mt-5 rounded-2xl border border-[#dfe5da] bg-white p-4 shadow-sm">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Collecting for</dt><dd className="text-right font-semibold">{ACTOR_CAPACITIES.find(o => o.id === draft.capacity)?.label}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Contributors</dt><dd className="text-right font-semibold">{CONTRIBUTOR_SCOPES.find(o => o.id === draft.contributorScope)?.label}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Beneficiary</dt><dd className="text-right font-semibold">{beneficiaryOptions(kind).find(o => o.id === draft.beneficiaryRule)?.label}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Target</dt><dd className="text-right font-semibold">{draft.targetMode === 'fixed' ? 'KSh ' + (draft.targetAmountKes ?? 0).toLocaleString('en-KE') : 'Open amount'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Start</dt><dd className="text-right font-semibold">{draft.startRule === 'scheduled' ? draft.startDate : 'After required approvals'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Closing date</dt><dd className="text-right font-semibold">{draft.deadline}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#617467]">Stop rule</dt><dd className="text-right font-semibold">{STOP_RULES.find(o => o.id === draft.stopRule)?.label}</dd></div>
              {draft.surplusRule && <div className="flex justify-between gap-4"><dt className="text-[#617467]">Extra money</dt><dd className="text-right font-semibold">{SURPLUS_RULES.find(o => o.id === draft.surplusRule)?.label}</dd></div>}
              <div className="border-t border-[#e6e9e0] pt-3"><dt className="text-[#617467]">If the plan fails</dt><dd className="mt-1 font-semibold">{failureOptions(kind).find(o => o.id === draft.failureRule)?.label}</dd></div>
              <div><dt className="text-[#617467]">Changing terms</dt><dd className="mt-1 font-semibold">{CHANGE_RULES.find(o => o.id === draft.changeRule)?.label}</dd></div>
              <div><dt className="text-[#617467]">Payout approval</dt><dd className="mt-1 font-semibold">{PAYOUT_RULES.find(o => o.id === draft.payoutRule)?.label}</dd></div>
            </dl>
          </div>
          {assessment.missing.length > 0 && <div role="alert" className="mt-4 rounded-xl border border-[#f1d3a8] bg-[#fffaf1] p-3">
            <h2 className="text-sm font-semibold">Still needs an answer</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{assessment.missing.map(item => <li key={item}>{item}</li>)}</ul>
          </div>}
          <div className="mt-5 rounded-2xl border border-[#d8e1d6] bg-[#f3f7ef] p-4">
            <div className="flex items-center gap-2"><LockKeyhole size={19} aria-hidden="true"/><h2 className="text-sm font-semibold">Before anyone contributes</h2></div>
            <p className="mt-2 text-xs leading-5 text-[#617267]">{assessment.draftComplete ? 'The local questions have answers. The actual collection is still blocked until these independent checks pass:' : 'This draft needs corrections, and every item below must still be verified:'}</p>
            <ul className="mt-3 space-y-2">
              {SERVER_GATES.map(item => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-[#506c56]"><ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0"/>{item}</li>)}
            </ul>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#66776a]">C2 preview only. No bank selected, no binding Agreement or SecureLink created, no collection started and no money moved.</p>
          <button type="button" disabled={!assessment.draftComplete} onClick={() => setProviderExplorationOpen(true)}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41] disabled:cursor-not-allowed disabled:bg-[#abb8ac]">
            See what my bank must support <ArrowRight size={18} aria-hidden="true"/>
          </button>
          <button type="button" onClick={() => setStage('capacity')} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
            Review or change my rules <ArrowLeft size={17} aria-hidden="true"/>
          </button>
          <button type="button" onClick={onBack} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-[#38664a] hover:bg-[#edf1e9]">Return to my collection idea</button>
        </section>}

        {stage !== 'review' && <button type="button" onClick={next} disabled={!validCurrent}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41] disabled:cursor-not-allowed disabled:bg-[#abb8ac]">
          {stage === 'control' ? 'Review collection rules' : 'Continue'} <ArrowRight size={18} aria-hidden="true"/>
        </button>}
      </main>
      <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-[#708074]">Agreement before Money · Every collection needs clear rules</footer>
    </div>
  );
}
