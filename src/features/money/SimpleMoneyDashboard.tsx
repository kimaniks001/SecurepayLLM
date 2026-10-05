import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  Clock3,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type { FinancialPartnerGateway, RegulatedPartnerResponse } from '../../api/securepay/financial-partners';
import type { AgreementMoneySnapshotResponse, MoneySnapshotGateway } from '../../api/securepay/money-snapshot';
import { moneyText, minorFromString } from './amount';
import { resolveSelection, type SelectionTarget } from './selection';
import type { MoneyHandoff } from './handoff';

type Load<T> =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; value: T };

interface SimpleMoneyDashboardProps {
  agreementGateway: AgreementGateway;
  snapshotGateway: MoneySnapshotGateway;
  financialPartners: FinancialPartnerGateway;
  handoff?: MoneyHandoff | null;
  onSelectAgreement: (agreement: CurrentUserAgreementSummaryResponse) => void;
}

function statusTone(status: string) {
  if (['Ready', 'Available', 'Connected', 'Funded'].includes(status)) return 'bg-mint-100 text-forest-800';
  if (['Not ready', 'Not funded'].includes(status)) return 'bg-ember-100 text-ember-800';
  return 'bg-cream-200 text-sand-700';
}

function StatusCard({
  icon,
  title,
  status,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/70 p-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-cream-100 p-2 text-forest-800 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-forest-900">{title}</div>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusTone(status)}`}>
            {status}
          </span>
          <p className="mt-2 text-xs leading-5 text-sand-600">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function snapshotReadiness(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'SecurePay has not loaded the current money state yet.' };
  if (snapshot.paymentReady.state !== 'EVALUATED') {
    return { status: 'Waiting', detail: 'Payment Ready has not been evaluated for this Agreement yet.' };
  }
  if (snapshot.paymentReady.ready) {
    return { status: 'Ready', detail: 'SecurePay says the evaluated payment conditions are satisfied.' };
  }
  return { status: 'Not ready', detail: 'One or more evaluated payment conditions are still outstanding.' };
}

function fundingStatus(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'Funding information is not loaded yet.' };
  const established = snapshot.positions.filter(position => position.established);
  if (established.length === 0) return { status: 'Not funded', detail: 'No established Agreement Money position is shown.' };
  if (established.some(position => (position.fundedTotalMinor ?? 0) > 0)) {
    return { status: 'Funded', detail: 'SecurePay shows funded money on this Agreement.' };
  }
  return { status: 'Not funded', detail: 'Agreement Money exists, but SecurePay shows no funded amount yet.' };
}

function releaseStatus(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'Release authority is not loaded yet.' };
  if (snapshot.releaseRequest.authorityGranted) {
    return { status: 'Available', detail: 'SecurePay currently grants release-request authority for the evaluated scope.' };
  }
  return { status: 'Not ready', detail: 'SecurePay does not currently grant release-request authority.' };
}

function nextStep(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return 'Choose an Agreement so SecurePay can show its current money state.';
  if (snapshot.movement.state === 'READY') {
    return 'SecurePay says the current movement preflight is ready. Open the detailed money view before taking a financial action.';
  }
  if (snapshot.paymentReady.state !== 'EVALUATED') {
    return 'Wait for the Payment Ready evaluation. SecurePay will then show the next safe money step.';
  }
  if (!snapshot.paymentReady.ready) {
    return 'Review the outstanding Agreement conditions before trying to fund or release money.';
  }
  if (snapshot.fundingOptions.length === 0) {
    return 'Payment Ready is satisfied, but SecurePay does not currently list a funding route for this Agreement.';
  }
  return 'Review the funding route and charges before any money action.';
}

function MoneyMetric({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-sand-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-forest-900 break-words">{value}</dd>
      {note && <div className="mt-1 text-xs text-sand-500">{note}</div>}
    </div>
  );
}

function enablerBankNote(partners: Load<RegulatedPartnerResponse[]>) {
  if (partners.state === 'loading') return 'Checking connected bank partners…';
  if (partners.state === 'error') return 'Bank partner status is unavailable right now.';
  const liveBanks = partners.value.filter(partner => partner.partnerType === 'BANK' && partner.status === 'ACTIVE');
  if (liveBanks.length === 0) return 'No active bank partner is listed by SecurePay right now.';
  return `Connected: ${liveBanks.map(partner => partner.displayName).join(', ')}`;
}

function EnablerCard({
  icon,
  title,
  text,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3">
      <div className="flex items-center gap-2 text-forest-900">
        <span className="shrink-0">{icon}</span>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="mt-1 text-xs text-sand-600">{text}</p>
      <p className="mt-2 text-[0.7rem] leading-4 text-sand-500">{note}</p>
    </div>
  );
}

/**
 * Simple Money is deliberately a read-first composition over existing backend authority.
 * It does not create Payment Ready, funding, release, partner availability, settlement or balances.
 * SACCO/MMF/insurance are shown as the fair-trade support categories the product is designed to
 * accommodate; only bank connectivity is currently discoverable from the regulated-partner API.
 */
export function SimpleMoneyDashboard({
  agreementGateway,
  snapshotGateway,
  financialPartners,
  handoff,
  onSelectAgreement,
}: SimpleMoneyDashboardProps) {
  const [agreements, setAgreements] = useState<Load<CurrentUserAgreementSummaryResponse[]>>({ state: 'loading' });
  const [selected, setSelected] = useState<SelectionTarget | null>(null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Load<AgreementMoneySnapshotResponse | null>>({ state: 'ready', value: null });
  const [partners, setPartners] = useState<Load<RegulatedPartnerResponse[]>>({ state: 'loading' });

  useEffect(() => {
    let live = true;
    agreementGateway.currentUserAgreements()
      .then(response => {
        if (!live) return;
        setAgreements({ state: 'ready', value: response.items });
        if (!handoff && response.items.length === 1) {
          const only = response.items[0];
          onSelectAgreement(only);
          void resolveSelection(agreementGateway, {
            agreementId: only.agreementId,
            title: only.title,
            currency: only.currency,
            summaryAmountMinor: only.proposedAmountMinor,
          }).then(result => {
            if (!live) return;
            setSelected(result.chosen);
            setSelectionNotice(result.notice);
          });
        }
      })
      .catch(() => { if (live) setAgreements({ state: 'error' }); });
    return () => { live = false; };
  }, [agreementGateway, handoff, onSelectAgreement]);

  useEffect(() => {
    if (!handoff) return;
    let live = true;
    void resolveSelection(agreementGateway, {
      agreementId: handoff.agreementId,
      title: handoff.title,
      currency: null,
      summaryAmountMinor: null,
    }, handoff).then(result => {
      if (!live) return;
      setSelected(result.chosen);
      setSelectionNotice(result.notice);
    });
    return () => { live = false; };
  }, [agreementGateway, handoff]);

  useEffect(() => {
    let live = true;
    financialPartners.list()
      .then(value => { if (live) setPartners({ state: 'ready', value }); })
      .catch(() => { if (live) setPartners({ state: 'error' }); });
    return () => { live = false; };
  }, [financialPartners]);

  useEffect(() => {
    if (!selected) {
      setSnapshot({ state: 'ready', value: null });
      return;
    }
    let live = true;
    setSnapshot({ state: 'loading' });
    snapshotGateway.read(selected.agreementId)
      .then(value => { if (live) setSnapshot({ state: 'ready', value }); })
      .catch(() => { if (live) setSnapshot({ state: 'error' }); });
    return () => { live = false; };
  }, [selected?.agreementId, snapshotGateway]);

  const currentSnapshot = snapshot.state === 'ready' ? snapshot.value : null;
  const payment = snapshotReadiness(currentSnapshot);
  const funding = fundingStatus(currentSnapshot);
  const release = releaseStatus(currentSnapshot);
  const singlePosition = currentSnapshot?.positions.length === 1 ? currentSnapshot.positions[0] : null;

  const summaryAmount = useMemo(() => {
    if (!selected) return null;
    const minor = minorFromString(selected.summaryAmountMinor);
    return minor === null ? null : moneyText(minor, selected.currency ?? '');
  }, [selected]);

  const chooseAgreement = async (agreement: CurrentUserAgreementSummaryResponse) => {
    onSelectAgreement(agreement);
    setSelectionNotice(null);
    const result = await resolveSelection(agreementGateway, {
      agreementId: agreement.agreementId,
      title: agreement.title,
      currency: agreement.currency,
      summaryAmountMinor: agreement.proposedAmountMinor,
    });
    setSelected(result.chosen);
    setSelectionNotice(result.notice);
  };

  const selectedId = selected?.agreementId ?? '';

  return (
    <div className="space-y-5" data-testid="simple-money-dashboard">
      <section className="rounded-2xl border border-cream-200 bg-white/70 p-4 md:p-5">
        {agreements.state === 'loading' && !selected && <p role="status" className="text-sm text-sand-500">Loading your Agreements…</p>}
        {agreements.state === 'error' && !selected && (
          <StatusNotice tone="warning">SecurePay couldn’t load your Agreement list. No money state is being guessed.</StatusNotice>
        )}
        {agreements.state === 'ready' && agreements.value.length === 0 && !selected && (
          <p className="text-sm text-sand-600">You have no Agreements yet. Money follows an Agreement once one exists.</p>
        )}

        {(selected || (agreements.state === 'ready' && agreements.value.length > 1)) && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              {selected ? (
                <>
                  <div className="text-base font-semibold text-forest-900 truncate">{selected.title}</div>
                  <div className="mt-0.5 text-xs text-sand-500">
                    Agreement Money{selected.currency ? ` · ${selected.currency}` : ''}
                  </div>
                </>
              ) : (
                <div className="text-sm font-medium text-forest-800">Choose an Agreement</div>
              )}
            </div>
            {agreements.state === 'ready' && agreements.value.length > 1 && (
              <label className="w-full md:w-auto">
                <span className="sr-only">Choose an Agreement</span>
                <select
                  aria-label="Choose an Agreement"
                  value={selectedId}
                  onChange={event => {
                    const match = agreements.value.find(item => item.agreementId === event.target.value);
                    if (match) void chooseAgreement(match);
                  }}
                  className="w-full md:min-w-72 rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-forest-900"
                >
                  <option value="">Choose an Agreement</option>
                  {agreements.value.map(agreement => (
                    <option key={agreement.agreementId} value={agreement.agreementId}>{agreement.title}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      {selectionNotice && <StatusNotice tone="warning">{selectionNotice}</StatusNotice>}
      {snapshot.state === 'loading' && <p role="status" className="text-sm text-sand-500">Reading this Agreement’s money state…</p>}
      {snapshot.state === 'error' && (
        <StatusNotice tone="warning">SecurePay couldn’t load this Agreement’s money snapshot. No financial state is being inferred.</StatusNotice>
      )}

      {selected && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard icon={<Clock3 className="h-5 w-5" />} title="Payment readiness" status={payment.status} detail={payment.detail} />
            <StatusCard icon={<WalletCards className="h-5 w-5" />} title="Funding" status={funding.status} detail={funding.detail} />
            <StatusCard icon={<LockKeyhole className="h-5 w-5" />} title="Release" status={release.status} detail={release.detail} />
            <StatusCard
              icon={<Users className="h-5 w-5" />}
              title="Financial enablers"
              status="Support"
              detail="Banks · SACCOs · MMFs · Insurance"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <div className="rounded-2xl border border-cream-200 bg-white/70 p-5">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-forest-800" />
                <div>
                  <h2 className="font-display text-xl text-forest-900">Money at a glance</h2>
                  <p className="text-xs text-sand-500">Only the simplest facts for this Agreement.</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-4 md:divide-x md:divide-cream-200">
                <MoneyMetric
                  label="Agreement summary"
                  value={summaryAmount ? <MoneyValue amount={summaryAmount} size="md" /> : 'Not shown'}
                  note="Summary value, not a separate balance"
                />
                <div className="md:pl-5">
                  <MoneyMetric
                    label="Funded"
                    value={singlePosition?.established && singlePosition.currency
                      ? <MoneyValue amount={moneyText(singlePosition.fundedTotalMinor ?? 0, singlePosition.currency)} size="md" />
                      : currentSnapshot && currentSnapshot.positions.length > 1 ? 'Multiple positions' : 'Not shown'}
                  />
                </div>
                <div className="md:pl-5">
                  <MoneyMetric
                    label="Released / returned"
                    value={singlePosition?.established && singlePosition.currency
                      ? <MoneyValue amount={moneyText(singlePosition.releasedTotalMinor ?? 0, singlePosition.currency)} size="md" />
                      : currentSnapshot && currentSnapshot.positions.length > 1 ? 'Multiple positions' : 'Not shown'}
                  />
                </div>
                <div className="md:pl-5">
                  <MoneyMetric label="Currency" value={selected.currency ?? 'Not shown'} />
                </div>
              </dl>
            </div>

            <aside className="rounded-2xl border border-mint-200 bg-mint-50/70 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-forest-800" />
                <h2 className="font-display text-xl text-forest-900">What happens next</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-sand-700">{nextStep(currentSnapshot)}</p>
              <div className="mt-4 border-t border-mint-200 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-sand-500">Funding route</div>
                {currentSnapshot?.fundingOptions.length ? (
                  <p className="mt-1 text-sm text-forest-900">
                    {currentSnapshot.fundingOptions.map(option => option.displayName).join(' · ')}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-sand-600">No funding route is listed yet.</p>
                )}
              </div>
            </aside>
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-forest-800" />
              <div>
                <h2 className="font-display text-xl text-forest-900">Financial enablers</h2>
                <p className="text-xs text-sand-500">The support around fair trade, kept simple.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EnablerCard
                icon={<Landmark className="h-5 w-5" />}
                title="Banks"
                text="Funding and settlement."
                note={enablerBankNote(partners)}
              />
              <EnablerCard
                icon={<Users className="h-5 w-5" />}
                title="SACCOs"
                text="Community finance."
                note="Shown as a fair-trade support category; live SACCO capability is not claimed here yet."
              />
              <EnablerCard
                icon={<Building2 className="h-5 w-5" />}
                title="MMFs"
                text="Cash parking and liquidity."
                note="Shown as a fair-trade support category; live MMF capability is not claimed here yet."
              />
              <EnablerCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Insurance"
                text="Protection for agreed risks."
                note="Shown as a fair-trade support category; live insurance capability is not claimed here yet."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-forest-800" />
              <div>
                <h2 className="font-display text-xl text-forest-900">Funding route</h2>
                <p className="text-xs text-sand-500">How SecurePay says this Agreement can be funded.</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-cream-50 px-4 py-3 text-sm text-sand-700">
              {currentSnapshot?.fundingOptions.length
                ? currentSnapshot.fundingOptions.map(option => `${option.displayName} · ${option.currency}`).join('   •   ')
                : 'SecurePay does not currently list a funding route for this Agreement.'}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
