import { ArrowLeft, CircleHelp, Clock3, FileCheck2, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import {
  C7_PROTECTIONS, describeC7Readiness, type ProviderReadiness,
} from './c7ProviderReadiness.mjs';
import {
  C7_MONEY_STAGES, summarizeC7Money,
  type MoneyPage,
} from './c7MoneyLifecycle.mjs';

function ksh(minor: number): string {
  return 'KSh '+(minor/100).toLocaleString('en-KE',{
    minimumFractionDigits:2,maximumFractionDigits:2,
  });
}

/**
 * C7 personal Money visibility. In the unauthenticated design preview,
 * never invent balances, provider notifications or contributor records.
 * A future caller may supply only a response from the OWN collection-money
 * server endpoint, not a manual/synthetic fee total.
 */
export function C7MyMoneyLifecycle({onBack,page,providerReadiness}:{
  onBack:()=>void; page?:MoneyPage | null;
  providerReadiness?: ProviderReadiness | null;
}) {
  const snapshot=summarizeC7Money(page);
  const readiness=describeC7Readiness(providerReadiness);
  return <div data-mini-collect-c7 className="min-h-screen bg-[#faf7f0] text-[#244936]">
    <header className="border-b border-[#e4e9df] bg-[#fffefa] px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1">
          <p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#677568]">Collect Money · My Money</p>
        </div>
        <span className="rounded-full bg-[#eef4e9] px-2.5 py-1 text-xs font-medium text-[#42694d]">C7 preview</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-14 pt-5">
      <button type="button" onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#eaf0e8]">
        <ArrowLeft size={17} aria-hidden="true"/> Back to my contribution
      </button>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e7]"><ReceiptText size={24} aria-hidden="true"/></div>
      <h1 className="font-display text-[2rem] leading-tight">See what has happened to your money.</h1>
      <p className="mt-3 text-sm leading-6 text-[#617465]">A request to contribute, a payment being checked and money confirmed by a bank are different things. You should know where yours stands, without chasing the collector.</p>

      {!snapshot.hasAuthoritativeRecords && <section className="mt-6 rounded-3xl border border-[#dae6d6] bg-white p-5">
        <CircleHelp size={23} className="text-[#52765b]" aria-hidden="true"/>
        <h2 className="mt-3 font-semibold">No personal Money records are connected yet</h2>
        <p className="mt-2 text-sm leading-6 text-[#657567]">This is a planning preview. It cannot collect money, confirm a bank payment or say that a refund was sent. A real signed-in collection must show your original item and genuine provider records here.</p>
      </section>}

      <section className="mt-5 rounded-3xl border border-[#dfe7da] bg-white p-5">
        <h2 className="text-base font-semibold">How your collection is protected</h2>
        <ol className="mt-4 space-y-4">
          {C7_MONEY_STAGES.map((step,index)=><li key={step.id} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f1e5] text-xs font-semibold text-[#416e4c]">{index+1}</span>
            <div><p className="text-sm font-semibold">{step.title}</p><p className="mt-1 text-sm leading-5 text-[#647465]">{step.hint}</p></div>
          </li>)}
        </ol>
      </section>

      {snapshot.hasAuthoritativeRecords && <>
        {snapshot.originalItems.map(item=><section key={item.proposalId} className="mt-4 rounded-2xl border border-[#e0e8dd] bg-white p-4">
          <div className="flex items-center gap-2"><FileCheck2 size={18} aria-hidden="true"/><h2 className="text-sm font-semibold">Your original item</h2></div>
          <p className="mt-2 text-xs text-[#647665]">{item.sourceItemReference} · Version {item.sourceItemVersion}</p>
          <p className="mt-2 text-sm">Proposed only: {item.currency==='KES'?ksh(item.proposedAmountMinor):'Unverified currency'}</p>
          <p className="mt-2 text-sm leading-6 text-[#607267]">{item.explanation}</p>
          <p className="mt-2 text-xs text-[#707f71]">Fair Trade examination: {item.fairTradeStatus==='NOT_EXAMINED'?'Not yet examined':'Evidence review required'}. No debt or automatic debit is established.</p>
        </section>)}
        {snapshot.funding.map(item=><section key={item.contributionId} className="mt-4 rounded-2xl border border-[#dfe8dc] bg-white p-4">
          <div className="flex items-center gap-2"><Clock3 size={18} aria-hidden="true"/><h2 className="text-sm font-semibold">Your payment record</h2></div>
          <p className="mt-2 text-xs text-[#667568]">{item.contributionReference}</p>
          <p className="mt-2 text-sm leading-6">{item.explanation}</p>
          {item.state==='VERIFIED_PROVIDER_FUNDING' && item.providerCertified && item.verifiedFundedAmountMinor!==null
            ? <p className="mt-2 text-sm font-semibold text-[#31684b]">Provider-certified: {ksh(item.verifiedFundedAmountMinor)}</p>
            : <p className="mt-2 text-xs font-semibold text-[#856b36]">Not shown as received until independently verified</p>}
        </section>)}
        {snapshot.verifiedFundedMinor!==null && <p className="mt-4 rounded-2xl border border-[#dce7d8] bg-[#f0f6ec] p-4 text-sm font-semibold">Verified original funding, for this complete view: {ksh(snapshot.verifiedFundedMinor)}</p>}
        {snapshot.proposedReturnMinor!==null && <section className="mt-4 rounded-2xl border border-[#dfe7da] bg-white p-4">
          <h2 className="text-sm font-semibold">Amount proposed to return</h2>
          <p className="mt-2 text-lg font-semibold">{ksh(snapshot.proposedReturnMinor)}</p>
          <p className="mt-2 text-sm text-[#667467]">Calculation only. No provider refund instruction, accepted callback or settled refund has been certified.</p>
        </section>}
      </>}

      <section className="mt-5 rounded-3xl border border-[#dce7d8] bg-white p-5">
        <div className="flex items-center gap-2">
          <LockKeyhole size={19} aria-hidden="true"/>
          <h2 className="text-sm font-semibold">{readiness.heading}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#617365]">{readiness.message}</p>
        <ul className="mt-3 space-y-2">
          {C7_PROTECTIONS.map(item=><li key={item.id}
            className="rounded-xl bg-[#f6f8f2] p-3">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-[#68786b]">{item.reason}</p>
          </li>)}
        </ul>
        <p className="mt-3 text-xs leading-5 text-[#778477]">Current provider and notice status is not proof of an authorized payment. Real verified updates belong in your private SecurePay inbox, not in a fabricated payment receipt.</p>
      </section>
      <section className="mt-5 rounded-2xl border border-[#dce8d8] bg-[#f0f6ee] p-4">
        <div className="flex items-center gap-2"><ShieldCheck size={19} aria-hidden="true"/><h2 className="text-sm font-semibold">Your money follows the Agreement</h2></div>
        <p className="mt-2 text-sm leading-6 text-[#5e7260]">Unused money can only follow the contributor-specific rights and certified refund route. A calculated amount is not money already returned. The provider must confirm the actual refund and it must reconcile with the ledger.</p>
        <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#657566]"><LockKeyhole size={15} className="mt-0.5 shrink-0" aria-hidden="true"/> No recurring debit, refund, bank transfer, automatic notification or Money action is enabled here.</div>
      </section>
      <p className="mt-4 text-xs text-[#748274]">Preview mode is not a bank account or payment history. Only an authenticated, independently verified backend response can populate actual amounts.</p>
    </main>
  </div>;
}
