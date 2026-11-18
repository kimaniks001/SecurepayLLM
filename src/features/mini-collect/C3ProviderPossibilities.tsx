import { ArrowLeft, Banknote, CalendarDays, CircleHelp, Landmark, LockKeyhole, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { failureOptions, PAYOUT_RULES, type GovernanceDraft } from './governanceDraft.mjs';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

const PURPOSES: Record<GovernanceDraft['kind'], string> = {
  buy: 'buy the agreed item',
  paid: 'receive payment for the agreed work',
  regular: 'manage the agreed recurring collection',
  group: 'manage the group’s contributions fairly',
  give: 'receive contributions for the stated cause',
  goal: 'save towards the stated goal',
};

/**
 * Real provider matching is a server-side C3 authority and requires a real
 * Agreement, a real financial institution and operations-certified capability.
 * This is an educational preview. Never insert synthetic bank names or LIVE flags.
 */
export function C3ProviderPossibilities({ draft, onBack }: {
  draft: GovernanceDraft; onBack: () => void;
}) {
  const failure = failureOptions(draft.kind).find(x => x.id === draft.failureRule);
  const payout = PAYOUT_RULES.find(x => x.id === draft.payoutRule);
  const target = draft.targetMode === 'fixed'
    ? 'KSh ' + (draft.targetAmountKes ?? 0).toLocaleString('en-KE')
    : 'an open collection';
  const needsRefund = ['return','decision-return','conditional-return','return-if-cancelled','hold-review']
    .includes(draft.failureRule ?? '') || draft.surplusRule === 'refund';
  const features = [
    { icon: Users, label: 'Know whose money it is', body: draft.kind === 'give'
      ? 'Keep every confirmed contribution linked to its giving purpose, without publishing individual tithes or donor names.'
      : 'Match each confirmed contribution to the right person and Agreement. A pledge or screenshot is not proof of payment.' },
    { icon: CalendarDays, label: 'Support your collection period',
      body: 'The provider must support the arrangement until ' + (draft.deadline || 'the agreed closing date')
        + ', and confirm how long resolution can take after that date.' },
    { icon: Landmark, label: 'Hold and account for it lawfully',
      body: 'Verify the licensed institution, suitable regulated account, fees, custody responsibilities and how the money is reconciled.' },
    { icon: RotateCcw, label: needsRefund ? 'Return money to the rightful contributors' : 'Follow the exact failed-plan rule',
      body: needsRefund
        ? 'If the agreed outcome calls for refunds, the provider must prove that it can return the correct amount to each entitled contributor and track failures.'
        : (failure?.label ?? 'The agreed fallback') + '. The bank must support the lawful outcome; we will not invent refund rights.' },
    { icon: LockKeyhole, label: 'Release only with the right approval',
      body: (payout?.label ?? 'The agreed payout authority') +
        '. A successful target is not permission for the bank to pay out automatically.' },
  ];

  return <div className="min-h-screen bg-[#faf7f0] text-[#244936]" data-mini-collect-c3>
    <header className="border-b border-[#e4e7dc] bg-[#fffefa]/95 px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1"><p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#677568]">Collect Money · Where should the money go?</p></div>
        <span className="rounded-full border border-[#d6e3d4] bg-[#eff6e9] px-2.5 py-1 text-[11px] font-semibold text-[#42694d]">C3 preview</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-14 pt-5">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
        <ArrowLeft size={17} aria-hidden="true"/> Back to my collection rules
      </button>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><Banknote size={25} aria-hidden="true"/></div>
      <h1 className="font-display text-[2rem] leading-tight">What must your bank be able to do?</h1>
      <p className="mt-3 text-sm leading-6 text-[#617366]">Your plan is to {PURPOSES[draft.kind]}. Before you choose a bank, we'll need evidence it can support <strong>{target}</strong> and your exact collection rules.</p>

      <div className="mt-5 grid gap-3">
        {features.map(({ icon: FeatureIcon, label, body }) =>
          <section key={label} className="rounded-2xl border border-[#e1e6dd] bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf4e9] text-[#3d7150]"><FeatureIcon size={19} aria-hidden="true"/></span>
              <div className="flex-1">
                <h2 className="text-sm font-semibold">{label}</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#637468]">{body}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#89652a]"><CircleHelp size={14} aria-hidden="true"/> Provider evidence not yet checked</p>
              </div>
            </div>
          </section>)}
      </div>
      <div className="mt-5 rounded-2xl border border-[#d4dfd1] bg-[#f0f6ec] p-4">
        <div className="flex items-center gap-2"><ShieldCheck size={19} aria-hidden="true"/><h2 className="text-sm font-semibold">No bank selected yet</h2></div>
        <p className="mt-2 text-sm leading-6 text-[#56705b]">Only institutions with confirmed collection, custody, refund and payout capabilities should be considered. This demonstration has no authenticated Agreement or certified provider to compare, so it cannot responsibly recommend one.</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#6b786e]">Preview only. No collection, SecureLink, account, bank service, refund or Money instruction has been created.</p>
      <button type="button" onClick={onBack} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#285d41] px-5 text-sm font-semibold text-white hover:bg-[#1e4b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">Return to my agreed rules</button>
    </main>
    <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-[#708074]">Agreement before Money · Your bank must support your rules</footer>
  </div>;
}
