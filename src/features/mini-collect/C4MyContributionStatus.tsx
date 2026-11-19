import { ArrowLeft, CheckCircle2, CircleHelp, Clock3, ReceiptText, ShieldCheck } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

export type MyContribution = {
  contributionId: string;
  contributionReference: string;
  pledgedAmountMinor: number;
  currency: string;
  state: 'PLEDGE_ONLY' | 'PAYMENT_PENDING' | 'INCOMPLETE_PAYMENT_SOURCE'
    | 'PAYMENT_SOURCE_CONFLICT' | 'POSTED_AWAITING_PROVIDER_CERTIFICATION' | 'VERIFIED_FUNDING';
  verifiedFundedAmountMinor: number | null;
  returnEntitlementStatus: string;
  refundAmountOwedMinor: number | null;
  refundAmountSettledMinor: number | null;
  providerConfirmedRefund: boolean;
  explanation: string;
};
export type MyContributionRecords = {
  agreementId: string;
  contributions: MyContribution[];
  totalRecords: number;
  furtherPages: boolean;
  anyRefundAuthorized: boolean;
  providerRefundsConnected: boolean;
};
export type MyReturnStatus = {
  agreementId: string;
  status: 'NOT_DETERMINED' | 'CALCULATED_NOT_AUTHORIZED' | 'NO_CERTIFIED_ALLOCATION_IN_SNAPSHOT';
  calculatedReturnMinor: number | null;
  currency: string;
  refundInstructed: boolean;
  refundSettled: boolean;
  providerSettlementConnected: boolean;
  explanation: string;
};

const shillings = (amount: number) =>
  'KSh ' + (amount / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
const descriptions: Record<MyContribution['state'], string> = {
  PLEDGE_ONLY: 'Recorded intention — no payment verified',
  PAYMENT_PENDING: 'Payment being checked',
  INCOMPLETE_PAYMENT_SOURCE: 'Awaiting complete provider and ledger record',
  PAYMENT_SOURCE_CONFLICT: 'Payment records need correction or review',
  POSTED_AWAITING_PROVIDER_CERTIFICATION: 'Ledger record found — provider certification still pending',
  VERIFIED_FUNDING: 'Contribution verified against a certified provider source',
};

/**
 * This component intentionally never fetches by an arbitrary user ID.
 * Future Mini authenticated controller must supply GET .../mine and
 * GET .../mine/return-status from the same server-derived logged-in identity.
 * The standalone preview has NO fabricated contributions or refunds.
 */
export function C4MyContributionStatus({ onBack, records, returnStatus, planningContext }: {
  onBack: () => void;
  records?: MyContributionRecords;
  returnStatus?: MyReturnStatus;
  planningContext?: { typeTitle: string; cadenceTitle: string };
}) {
  return <div className="min-h-screen bg-[#faf7f0] text-[#244936]" data-mini-collect-c4>
    <header className="border-b border-[#e4e9de] bg-[#fffefa] px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1"><p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#677568]">Collect Money · My contributions</p></div>
        <span className="rounded-full bg-[#edf3e8] px-2 py-1 text-xs text-[#426b4d]">C4 preview</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
      <button type="button" onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#eaf0e8]">
        <ArrowLeft size={17} aria-hidden="true"/> Back to closing protections
      </button>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f2e7]"><ReceiptText size={24} aria-hidden="true"/></div>
      <h1 className="font-display text-[2rem] leading-tight">Where does my contribution stand?</h1>
      <p className="mt-3 text-sm leading-6 text-[#647567]">Your money should not disappear into someone else's collection total. This view belongs to the contributor, not the public.</p>
      {planningContext && <p className="mt-4 rounded-xl border border-[#dfe7d9] bg-[#fffefa] p-3 text-sm leading-6 text-[#657465]">Planning example: <strong>{planningContext.typeTitle}</strong> · {planningContext.cadenceTitle}. This is your draft choice, not an accepted Agreement or evidence that money was received.</p>}
      {!records ? <section className="mt-6 rounded-3xl border border-[#d9e3d6] bg-white p-5">
        <CircleHelp size={25} className="text-[#52775a]" aria-hidden="true"/>
        <h2 className="mt-3 text-lg font-semibold">No personal contribution is connected here</h2>
        <p className="mt-2 text-sm leading-6 text-[#637468]">This is a design preview, not a collection account. We haven't received or verified any payments here, and no refund has been initiated. When signed in to a real governed collection, you will see only your own contribution records and return status.</p>
      </section> : <>
        {records.contributions.map(c => <section key={c.contributionId} className="mt-4 rounded-3xl border border-[#dfe8dc] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6e7d70]">{c.contributionReference}</p>
          <p className="mt-2 text-base font-semibold">{descriptions[c.state]}</p>
          <p className="mt-2 text-sm text-[#607062]">Amount intended: {shillings(c.pledgedAmountMinor)}</p>
          {c.state === 'VERIFIED_FUNDING' && c.verifiedFundedAmountMinor !== null ?
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#31664a]">
              <CheckCircle2 size={16} aria-hidden="true"/> Verified funding: {shillings(c.verifiedFundedAmountMinor)}
            </p> : null}
          <p className="mt-2 text-sm leading-6 text-[#677667]">{c.explanation}</p>
        </section>)}
        {records.totalRecords === 0 && <p className="mt-6 text-sm text-[#677667]">No contribution records for your account.</p>}
      </>}
      <section className="mt-5 rounded-3xl border border-[#d7e1d4] bg-white p-5">
        <div className="flex items-center gap-2"><Clock3 size={20} aria-hidden="true"/><h2 className="font-semibold">Any money due back to me?</h2></div>
        {returnStatus?.status === 'CALCULATED_NOT_AUTHORIZED'
          && returnStatus.calculatedReturnMinor !== null ?
          <>
            <p className="mt-3 text-xl font-semibold">{shillings(returnStatus.calculatedReturnMinor)}</p>
            <p className="mt-2 text-sm leading-6 text-[#667366]">Proposed return from certified calculation. It is not an issued refund or money received in your account.</p>
          </> :
          <p className="mt-3 text-sm leading-6 text-[#667366]">Not yet determined. This does not mean KSh 0 is owed. SecurePay must first verify the accepted outcome, how much remains unspent, and your individual return rights.</p>}
      </section>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#d5e2d4] bg-[#f0f5ec] p-4">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true"/>
        <p className="text-sm leading-6 text-[#526b59]">An entitlement calculation, refund instruction, provider acknowledgement and confirmed refund are different stages. We only mark money returned when the provider and ledger independently prove it.</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#768273]">No bank, Money provider, transaction or refund is simulated as real in this preview.</p>
    </main>
  </div>;
}
