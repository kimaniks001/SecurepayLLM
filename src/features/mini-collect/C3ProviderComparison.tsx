import { useState } from 'react';
import type { GovernanceDraft } from './governanceDraft.mjs';
import { C3DClosingPreview } from './C3DClosingPreview';
import { ArrowLeft, Banknote, CircleHelp, FileCheck2, LockKeyhole, ShieldAlert } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

export type C3ProviderOption = {
  providerKsNumber: string;
  legalName: string;
  institutionClass: string;
  maximumCollectionAmountMinor: number;
  maximumHoldDays: number;
  evidenceValidUntil: string;
  quoteFingerprint: string;
  verifiedServices: string[];
  limitations: string[];
  proposalAllowed: boolean;
  financialExecutionAllowed: false;
  fees: {
    currency: 'KES';
    chargeBearer: 'COLLECTOR' | 'CONTRIBUTOR';
    contributionFixedMinor: number;
    contributionBasisPoints: number;
    refundFixedMinor: number;
    refundBasisPoints: number;
    payoutFixedMinor: number;
    payoutBasisPoints: number;
    feeScheduleVersion: string;
    validUntil: string;
    totalCostKnown: false;
  };
};

const money = (minor: number) =>
  'KSh ' + (minor / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const charge = (fixed: number, bps: number) =>
  money(fixed) + (bps ? ' + ' + (bps / 100).toFixed(2) + '% of the transaction' : '');

/**
 * Receives ONLY server-authorized and C3A/C3B/C3C-matched shortlist responses.
 * This demo has no authenticated Agreement/provider feed: NEVER seed examples.
 */
export function C3ProviderComparison({ onBack, options = [], onPropose, draft }: {
  onBack: () => void;
  options?: C3ProviderOption[];
  onPropose?: (providerKsNumber: string, quoteFingerprint: string) => void;
  draft?: GovernanceDraft;
}) {
  const [exploringClose, setExploringClose] = useState(false);
  const approved = options.filter(p => p.proposalAllowed
    && !p.financialExecutionAllowed && p.fees?.currency === 'KES'
    && /^[a-f0-9]{64}$/.test(p.quoteFingerprint));
  if (exploringClose && draft) return <C3DClosingPreview draft={draft} onBack={() => setExploringClose(false)} />;
  return <div className="min-h-screen bg-[#faf7f0] text-[#244936]" data-mini-collect-c3c>
    <header className="border-b border-[#e4e7dc] bg-[#fffefa]/95 px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={securepayMark} alt="" className="h-9 w-9 object-contain"/>
        <div className="flex-1"><p className="text-sm font-semibold">SecurePay Mini</p>
          <p className="text-xs text-[#677568]">Collect Money · Choose a financial provider</p></div>
        <span className="rounded-full border border-[#d6e3d4] bg-[#eff6e9] px-2.5 py-1 text-[11px] font-semibold text-[#42694d]">C3C preview</span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d41]">
        <ArrowLeft size={17} aria-hidden="true"/> Back to what my bank must support
      </button>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2e5]"><Banknote size={25} aria-hidden="true"/></div>
      <h1 className="font-display text-[2rem] leading-tight">Find a provider that fits your plan</h1>
      <p className="mt-3 text-sm leading-6 text-[#617366]">Only compare providers whose evidence covers your actual collection, duration, money protections, fees and rules.</p>

      {!approved.length ? <section className="mt-7 rounded-3xl border border-[#d7e2d4] bg-white p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5ec] text-[#3c7754]"><ShieldAlert size={23} aria-hidden="true"/></span>
        <h2 className="mt-4 text-lg font-semibold">No verified provider to recommend yet</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d6f63]">SecurePay has not established an authenticated provider shortlist for this demonstration. We won’t fill this space with bank names, guessed prices or promises about refunds.</p>
        <p className="mt-3 text-sm leading-6 text-[#5d6f63]">Your collection rules can remain prepared. A provider should appear only after its verified services and complete fee schedule meet those rules.</p>
        <div className="mt-4 rounded-2xl bg-[#f4f6f0] p-3 text-xs leading-5 text-[#5c715f]">
          No bank selected, no contribution requested, and no payment instructions created.
        </div>
      </section> : <div className="mt-6 grid gap-4">
        {approved.map(provider => <section key={provider.providerKsNumber} className="rounded-3xl border border-[#dfe7da] bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5ec] text-[#477454]"><FileCheck2 size={22} aria-hidden="true"/></span>
            <div className="min-w-0 flex-1"><h2 className="text-base font-semibold">{provider.legalName}</h2>
              <p className="mt-1 text-xs text-[#728172]">{provider.institutionClass} · Evidence reviewed for this collection</p></div>
          </div>
          <div className="mt-4 rounded-2xl bg-[#f5f7f2] p-3 text-sm leading-7">
            <p><strong>Each contribution:</strong> {charge(provider.fees.contributionFixedMinor, provider.fees.contributionBasisPoints)}</p>
            <p><strong>Each refund:</strong> {charge(provider.fees.refundFixedMinor, provider.fees.refundBasisPoints)}</p>
            <p><strong>Payout:</strong> {charge(provider.fees.payoutFixedMinor, provider.fees.payoutBasisPoints)}</p>
            <p><strong>Fees paid by:</strong> {provider.fees.chargeBearer === 'COLLECTOR' ? 'Collection organizer' : 'Contributor'}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#667666]">Maximum supported collection: {money(provider.maximumCollectionAmountMinor)}. Maximum stated holding period: {provider.maximumHoldDays} days. Fee schedule version: {provider.fees.feeScheduleVersion}.</p>
          <p className="mt-3 text-xs leading-5 text-[#81653f]">Total cost cannot be known until the number and size of contributions, refunds and payout route are known.</p>
          <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#596f60]"><CircleHelp size={15} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{provider.limitations.join(' · ')}</span></div>
          {onPropose ? <button type="button" onClick={() => onPropose(provider.providerKsNumber, provider.quoteFingerprint)}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#285d41] px-4 text-sm font-semibold text-white hover:bg-[#1e4b35]">
            Propose this provider for our Agreement</button> : null}
        </section>)}
      </div>}
      {draft ? <button type="button" onClick={() => setExploringClose(true)}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#cfded0] bg-white px-4 text-sm font-semibold text-[#285d41] hover:bg-[#edf4e9]">
        Explore what happens when this collection closes
      </button> : null}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#d5dfd4] bg-[#f0f5ec] p-4">
        <LockKeyhole size={19} className="mt-0.5 shrink-0" aria-hidden="true"/>
        <p className="text-sm leading-6 text-[#536a58]">Choosing a provider will only propose a financial partner. Your contributors must still accept any material terms, and certified Money safeguards must still pass.</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#718072]">Preview only. No real bank or financial provider has been verified through this preview.</p>
    </main>
  </div>;
}
