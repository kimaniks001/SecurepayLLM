import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Landmark,
  LockKeyhole,
  Route,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Users,
  WalletCards,
} from 'lucide-react';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type {
  AgreementDetailResponse,
  CurrentUserAgreementSummaryResponse,
} from '../../api/securepay/agreements/dto';
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

function amountFromSummary(agreement: Pick<CurrentUserAgreementSummaryResponse, 'proposedAmountMinor' | 'currency'>) {
  const minor = minorFromString(agreement.proposedAmountMinor);
  return minor === null ? null : moneyText(minor, agreement.currency);
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, letter => letter.toUpperCase());
}

function statusTone(status: string) {
  if (['Ready', 'Available', 'Connected', 'Selected', 'Funded', 'Active'].includes(status)) return 'bg-forest-100 text-forest-800';
  if (['Blocked', 'Not ready', 'Not funded'].includes(status)) return 'bg-ember-100 text-ember-800';
  return 'bg-cream-200 text-sand-700';
}

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusTone(status)}`}>{status}</span>;
}

function snapshotReadiness(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'SecurePay has not loaded the current money state yet.' };
  if (snapshot.paymentReady.state !== 'EVALUATED') {
    return { status: 'Waiting', detail: 'Payment Ready has not been evaluated for this Agreement version yet.' };
  }
  if (snapshot.paymentReady.ready) {
    return { status: 'Ready', detail: 'The evaluated payment conditions are satisfied.' };
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
  return { status: 'Not funded', detail: 'Agreement Money exists, but no funded amount is shown yet.' };
}

function releaseStatus(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'Release authority is not loaded yet.' };
  if (snapshot.releaseRequest.authorityGranted) {
    return { status: 'Available', detail: 'Release-request authority is currently available for the evaluated scope.' };
  }
  return { status: 'Not ready', detail: 'SecurePay does not currently grant release-request authority.' };
}

function movementStatus(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'Movement preflight has not loaded.' };
  if (snapshot.movement.state === 'READY') {
    return { status: 'Ready', detail: 'The current read-only movement preflight passed.' };
  }
  if (snapshot.movement.state === 'UNAVAILABLE') {
    return { status: 'Unknown', detail: 'SecurePay could not complete the movement preflight.' };
  }
  return { status: 'Blocked', detail: titleCase(snapshot.movement.reasonCode) };
}

function nextStep(snapshot: AgreementMoneySnapshotResponse | null, agreement: CurrentUserAgreementSummaryResponse | null) {
  const backendNext = agreement?.nextActions?.[0]?.reason;
  if (backendNext) return backendNext;
  if (!snapshot) return 'Choose an Agreement to see the next money step.';
  if (snapshot.movement.state === 'READY') return 'The current money movement preflight is ready.';
  if (snapshot.paymentReady.state !== 'EVALUATED') return 'Complete the Agreement steps needed before Payment Ready can be evaluated.';
  if (!snapshot.paymentReady.ready) return 'Resolve the outstanding Agreement conditions before funding or release.';
  if (snapshot.fundingOptions.length === 0) return 'Payment Ready is satisfied, but SecurePay does not currently list a funding route.';
  return 'Review the funding route and charges before any money action.';
}

function fundingRailState(snapshot: AgreementMoneySnapshotResponse | null, railCode: string, name: string) {
  if (!snapshot) return { status: 'Unknown', detail: `SecurePay has not loaded ${name} availability for this Agreement yet.` };
  const option = snapshot.fundingOptions.find(route => route.railCode === railCode);
  if (option) {
    return {
      status: 'Available',
      detail: `${name} is currently eligible to fund this Agreement in ${option.currency}.`,
    };
  }
  return {
    status: 'Not available',
    detail: `${name} is part of SecurePay's rail architecture, but it is not currently eligible for this Agreement.`,
  };
}

function choiceRailState(snapshot: AgreementMoneySnapshotResponse | null, partners: Load<RegulatedPartnerResponse[]>) {
  if (snapshot?.movement.railCode === 'CHOICE_KS_ACCOUNT') {
    return {
      status: 'Selected',
      detail: 'The current Agreement movement preflight routes external settlement through Choice Bank.',
    };
  }
  if (partners.state === 'loading') return { status: 'Checking', detail: 'Checking the connected bank-partner record.' };
  if (partners.state === 'error') return { status: 'Unknown', detail: 'SecurePay could not read the bank-partner state just now.' };
  const choice = partners.value.find(partner =>
    partner.partnerCode.toUpperCase().includes('CHOICE')
    || partner.displayName.toUpperCase().includes('CHOICE')
    || partner.legalName.toUpperCase().includes('CHOICE')
  );
  if (!choice) {
    return {
      status: 'Not active',
      detail: 'Choice Bank is the bank-account/settlement rail in the SecurePay architecture, but no active Choice partner record is visible here.',
    };
  }
  if (choice.status === 'ACTIVE') {
    return {
      status: 'Connected',
      detail: 'Choice Bank is connected as a regulated bank partner. Agreement authority still decides whether money may settle through it.',
    };
  }
  return {
    status: titleCase(choice.status),
    detail: 'Choice Bank is known to SecurePay, but the current partner state does not make it executable for this Agreement.',
  };
}

function enablerBankNote(partners: Load<RegulatedPartnerResponse[]>) {
  if (partners.state === 'loading') return 'Checking connected bank partners…';
  if (partners.state === 'error') return 'Bank partner status is unavailable right now.';
  const liveBanks = partners.value.filter(partner => partner.partnerType === 'BANK' && partner.status === 'ACTIVE');
  if (liveBanks.length === 0) return 'No active bank partner is listed by SecurePay right now.';
  return `Connected: ${liveBanks.map(partner => partner.displayName).join(', ')}`;
}

function AgreementCard({
  agreement,
  active,
  onOpen,
}: {
  agreement: CurrentUserAgreementSummaryResponse;
  active: boolean;
  onOpen: () => void;
}) {
  const amount = amountFromSummary(agreement);
  const action = agreement.nextActions[0]?.reason ?? (agreement.attentionRequired ? 'This Agreement needs your attention.' : 'No immediate action is shown.');
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      className={`w-full rounded-2xl border p-4 text-left transition-card ${active
        ? 'border-forest-300 bg-forest-50 shadow-soft'
        : 'border-cream-200 bg-white/70 hover:border-forest-200 hover:bg-cream-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-lg text-forest-900 truncate">{agreement.title}</div>
          <div className="mt-1 text-xs text-sand-500">
            {agreement.counterparty?.displayName ?? agreement.counterparty?.ksNumber ?? titleCase(agreement.agreementType)}
          </div>
        </div>
        <StatusPill status={titleCase(agreement.status)} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-5 text-sand-700">{agreement.purpose}</p>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-cream-200 pt-3">
        <div>
          <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">Agreement amount</div>
          <div className="mt-0.5 text-sm font-semibold text-forest-900">
            {amount ? <MoneyValue amount={amount} size="sm" /> : 'Not shown'}
          </div>
        </div>
        <div className="max-w-[55%] text-right text-xs leading-4 text-sand-600">{action}</div>
      </div>
    </button>
  );
}

function FinanceStateCard({
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
    <div className="rounded-2xl border border-cream-200 bg-white/75 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-cream-100 p-2 text-forest-800">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-forest-900">{title}</div>
          <div className="mt-1"><StatusPill status={status} /></div>
          <p className="mt-2 text-xs leading-5 text-sand-600">{detail}</p>
        </div>
      </div>
    </div>
  );
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
    <div className="rounded-2xl border border-cream-200 bg-cream-50/80 p-4">
      <div className="flex items-center gap-2 text-forest-900">
        <span className="shrink-0">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-sm text-sand-700">{text}</p>
      <p className="mt-2 text-xs leading-5 text-sand-500">{note}</p>
    </div>
  );
}

function PositionMoney({ snapshot }: { snapshot: AgreementMoneySnapshotResponse }) {
  if (snapshot.positions.length === 0) {
    return <p className="text-sm text-sand-600">No Agreement Money position is established yet.</p>;
  }

  return (
    <div className="space-y-3">
      {snapshot.positions.map((position, index) => {
        const currency = position.currency ?? position.proposedCurrency ?? '';
        if (!position.established) {
          return (
            <div key={position.obligationId ?? `position-${index}`} className="rounded-xl bg-cream-50 p-3">
              <div className="text-sm font-medium text-forest-900">{position.obligationTitle ?? 'Agreement Money position'}</div>
              <div className="mt-1 text-xs text-sand-600">
                Proposed {position.proposedAmountMinor != null ? <MoneyValue amount={moneyText(position.proposedAmountMinor, currency)} size="sm" /> : 'amount not shown'} · not funded yet
              </div>
            </div>
          );
        }
        return (
          <div key={position.obligationId ?? `position-${index}`} className="rounded-xl border border-cream-200 bg-white/60 p-3">
            <div className="text-sm font-medium text-forest-900">{position.obligationTitle ?? 'Agreement Money position'}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Funded</dt><dd className="mt-1 text-sm text-forest-900"><MoneyValue amount={moneyText(position.fundedTotalMinor ?? 0, currency)} size="sm" /></dd></div>
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Progressed</dt><dd className="mt-1 text-sm text-forest-900"><MoneyValue amount={moneyText(position.exercisedOrSettledMinor ?? 0, currency)} size="sm" /></dd></div>
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Remaining</dt><dd className="mt-1 text-sm text-forest-900"><MoneyValue amount={moneyText(position.remainingFundedMinor ?? 0, currency)} size="sm" /></dd></div>
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Returned</dt><dd className="mt-1 text-sm text-forest-900"><MoneyValue amount={moneyText(position.releasedTotalMinor ?? 0, currency)} size="sm" /></dd></div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

/**
 * This is the human Money home: Agreements first, then the money truth that follows each Agreement.
 * It composes existing backend-owned reads. It does not create Payment Ready, funding, release,
 * settlement, provider availability or balances, and it never manufactures a cross-currency total.
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
  const [detail, setDetail] = useState<Load<AgreementDetailResponse | null>>({ state: 'ready', value: null });
  const [partners, setPartners] = useState<Load<RegulatedPartnerResponse[]>>({ state: 'loading' });

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

  useEffect(() => {
    let live = true;
    agreementGateway.currentUserAgreements()
      .then(response => {
        if (!live) return;
        setAgreements({ state: 'ready', value: response.items });
        // Landing on Money should immediately feel alive. The first backend-returned Agreement is opened
        // as a neutral default; this is not a client-side priority or financial recommendation.
        if (!handoff && response.items.length > 0) {
          const first = response.items[0];
          onSelectAgreement(first);
          void resolveSelection(agreementGateway, {
            agreementId: first.agreementId,
            title: first.title,
            currency: first.currency,
            summaryAmountMinor: first.proposedAmountMinor,
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
      setDetail({ state: 'ready', value: null });
      return;
    }
    let live = true;
    setSnapshot({ state: 'loading' });
    setDetail({ state: 'loading' });

    snapshotGateway.read(selected.agreementId)
      .then(value => { if (live) setSnapshot({ state: 'ready', value }); })
      .catch(() => { if (live) setSnapshot({ state: 'error' }); });

    agreementGateway.detail(selected.agreementId)
      .then(value => { if (live) setDetail({ state: 'ready', value }); })
      .catch(() => { if (live) setDetail({ state: 'error' }); });

    return () => { live = false; };
  }, [selected?.agreementId, agreementGateway, snapshotGateway]);

  const currentSnapshot = snapshot.state === 'ready' ? snapshot.value : null;
  const currentDetail = detail.state === 'ready' ? detail.value : null;
  const selectedSummary = useMemo(() => {
    if (!selected || agreements.state !== 'ready') return null;
    return agreements.value.find(agreement => agreement.agreementId === selected.agreementId) ?? null;
  }, [agreements, selected]);

  const payment = snapshotReadiness(currentSnapshot);
  const funding = fundingStatus(currentSnapshot);
  const release = releaseStatus(currentSnapshot);
  const movement = movementStatus(currentSnapshot);
  const selectedAmount = selectedSummary ? amountFromSummary(selectedSummary) : (
    selected?.summaryAmountMinor != null && selected.currency
      ? moneyText(minorFromString(selected.summaryAmountMinor), selected.currency)
      : null
  );
  const economics = currentSnapshot?.movement.economics ?? null;
  const agreementSnippet = currentDetail?.overview.description?.trim()
    || currentDetail?.overview.purpose?.trim()
    || selectedSummary?.purpose?.trim()
    || 'SecurePay has not loaded a short Agreement description.';
  const fundingRoutes = currentSnapshot?.fundingOptions ?? [];
  const mpesaRail = fundingRailState(currentSnapshot, 'MPESA_STK', 'M-PESA');
  const pesalinkRail = fundingRailState(currentSnapshot, 'PESALINK', 'PesaLink');
  const choiceRail = choiceRailState(currentSnapshot, partners);
  const selectedId = selected?.agreementId ?? '';

  return (
    <div className="space-y-6" data-testid="simple-money-dashboard">
      <section className="overflow-hidden rounded-3xl border border-forest-200 bg-gradient-to-br from-forest-50 via-cream-50 to-cream-100 shadow-soft">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white/70 px-3 py-1 text-xs font-semibold text-forest-800">
              <Sparkles className="h-3.5 w-3.5" />
              Agreement-led money
            </div>
            <h2 className="mt-4 font-display text-3xl text-forest-900 md:text-4xl">Money follows the agreement.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sand-700 md:text-base">
              See the trade, the amount, what happens next, and the financial support around it — without losing the deeper money record underneath.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sand-500">Community promise</div>
            <p className="mt-2 font-display text-lg leading-7 text-forest-900">
              Clear agreements. Accountable money. More room for people to trade with confidence.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-forest-900">Your Agreements</h2>
            <p className="mt-1 text-sm text-sand-600">Your contracts come first. Choose one to see the money that belongs to it.</p>
          </div>
          {agreements.state === 'ready' && agreements.value.length > 0 && (
            <div className="text-xs text-sand-500">{agreements.value.length} Agreement{agreements.value.length === 1 ? '' : 's'}</div>
          )}
        </div>

        {agreements.state === 'loading' && <p role="status" className="text-sm text-sand-500">Loading your Agreements…</p>}
        {agreements.state === 'error' && (
          <StatusNotice tone="warning">SecurePay couldn’t load your Agreement list. No money state is being guessed.</StatusNotice>
        )}
        {agreements.state === 'ready' && agreements.value.length === 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white/70 p-5 text-sm text-sand-600">
            You have no Agreements yet. Money appears here once an Agreement exists.
          </div>
        )}
        {agreements.state === 'ready' && agreements.value.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agreements.value.map(agreement => (
              <AgreementCard
                key={agreement.agreementId}
                agreement={agreement}
                active={agreement.agreementId === selectedId}
                onOpen={() => void chooseAgreement(agreement)}
              />
            ))}
          </div>
        )}
      </section>

      {selectionNotice && <StatusNotice tone="warning">{selectionNotice}</StatusNotice>}
      {snapshot.state === 'error' && (
        <StatusNotice tone="warning">SecurePay couldn’t load this Agreement’s money snapshot. No financial state is being inferred.</StatusNotice>
      )}

      {selected && (
        <>
          <section className="rounded-3xl border border-cream-200 bg-white/80 shadow-soft">
            <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-5 w-5 text-forest-700" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-sand-500">What was agreed</span>
                  {selectedSummary && <StatusPill status={titleCase(selectedSummary.status)} />}
                </div>
                <h2 className="mt-3 font-display text-3xl text-forest-900">{selected.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-sand-700">{agreementSnippet}</p>
                {selectedSummary?.counterparty && (
                  <p className="mt-3 text-xs text-sand-500">
                    With {selectedSummary.counterparty.displayName ?? selectedSummary.counterparty.ksNumber ?? 'the other Agreement participant'}
                  </p>
                )}
                {currentDetail && currentDetail.terms.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {currentDetail.terms.slice(0, 4).map(term => (
                      <span key={term.obligationId} className="rounded-full border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs text-sand-700">
                        {term.title}
                      </span>
                    ))}
                    {currentDetail.terms.length > 4 && (
                      <span className="rounded-full bg-cream-100 px-3 py-1.5 text-xs text-sand-500">+{currentDetail.terms.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-forest-900 p-5 text-cream-50">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-200">Agreement amount</div>
                <div className="mt-2 font-display text-3xl">
                  {selectedAmount ? <MoneyValue amount={selectedAmount} size="lg" className="!text-cream-50" /> : 'Not shown'}
                </div>
                <div className="mt-4 border-t border-forest-700 pt-4">
                  <div className="text-xs uppercase tracking-wide text-forest-200">Next step</div>
                  <p className="mt-2 text-sm leading-6 text-cream-100">{nextStep(currentSnapshot, selectedSummary)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceStateCard icon={<CheckCircle2 className="h-5 w-5" />} title="Payment readiness" status={payment.status} detail={payment.detail} />
            <FinanceStateCard icon={<WalletCards className="h-5 w-5" />} title="Funding" status={funding.status} detail={funding.detail} />
            <FinanceStateCard icon={<LockKeyhole className="h-5 w-5" />} title="Release" status={release.status} detail={release.detail} />
            <FinanceStateCard icon={<ArrowRight className="h-5 w-5" />} title="Can money move?" status={movement.status} detail={movement.detail} />
          </section>

          <section className="rounded-3xl border border-forest-200 bg-white/80 p-5 md:p-6" data-testid="agreement-rail-map">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-forest-700" />
                  <h2 className="font-display text-2xl text-forest-900">Money routes for this Agreement</h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-sand-600">
                  The Agreement decides the money scope. SecurePay then shows which rails can bring money in, hold it against the Agreement, and move it out when authority permits.
                </p>
              </div>
              <div className="text-xs text-sand-500">Visible does not mean executable</div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-stretch">
              <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">1 · Authority</div>
                <div className="mt-2 flex items-center gap-2"><FileText className="h-5 w-5 text-forest-700" /><h3 className="font-display text-lg text-forest-900">Agreement</h3></div>
                <p className="mt-2 text-xs leading-5 text-sand-600">Defines who pays, the authorised amount, currency, conditions and what money is allowed to do.</p>
              </div>

              <div className="hidden xl:flex items-center justify-center text-sand-400"><ArrowRight className="h-5 w-5" /></div>

              <div className="rounded-2xl border border-cream-200 bg-white p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">2 · Fund</div>
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-cream-200 bg-cream-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-forest-700" /><span className="text-sm font-semibold text-forest-900">M-PESA</span></div>
                      <StatusPill status={mpesaRail.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-sand-600">{mpesaRail.detail}</p>
                  </div>
                  <div className="rounded-xl border border-cream-200 bg-cream-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-forest-700" /><span className="text-sm font-semibold text-forest-900">PesaLink</span></div>
                      <StatusPill status={pesalinkRail.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-sand-600">{pesalinkRail.detail}</p>
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex items-center justify-center text-sand-400"><ArrowRight className="h-5 w-5" /></div>

              <div className="rounded-2xl border border-forest-200 bg-forest-50/70 p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">3 · Protect</div>
                <div className="mt-2 flex items-center gap-2"><WalletCards className="h-5 w-5 text-forest-700" /><h3 className="font-display text-lg text-forest-900">Agreement Money</h3></div>
                <p className="mt-2 text-xs leading-5 text-sand-600">Funds are recorded against the Agreement. They do not become free-floating money or bypass the Agreement's authority.</p>
              </div>

              <div className="hidden xl:flex items-center justify-center text-sand-400"><ArrowRight className="h-5 w-5" /></div>

              <div className="rounded-2xl border border-cream-200 bg-white p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">4 · Settle</div>
                <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-forest-700" /><span className="text-sm font-semibold text-forest-900">Choice Bank</span></div>
                    <StatusPill status={choiceRail.status} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-sand-600">{choiceRail.detail}</p>
                </div>
                <p className="mt-3 text-[0.72rem] leading-5 text-sand-500">Release and settlement still require the Agreement, destination and rail gates to pass.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 md:p-6">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-forest-700" />
                <div>
                  <h2 className="font-display text-2xl text-forest-900">Agreement Money</h2>
                  <p className="text-xs text-sand-500">What SecurePay actually holds for this Agreement’s money positions.</p>
                </div>
              </div>
              <div className="mt-5">
                {snapshot.state === 'loading' && <p role="status" className="text-sm text-sand-500">Reading Agreement Money…</p>}
                {currentSnapshot && <PositionMoney snapshot={currentSnapshot} />}
              </div>
            </div>

            <div className="rounded-3xl border border-forest-200 bg-forest-50/70 p-5 md:p-6">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-forest-700" />
                <h2 className="font-display text-2xl text-forest-900">Funding & charges</h2>
              </div>
              <div className="mt-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Funding route</div>
                {fundingRoutes.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {fundingRoutes.map(route => (
                      <li key={route.railCode} className="rounded-xl border border-forest-100 bg-white/70 px-3 py-2 text-sm text-forest-900">
                        <div className="font-medium">{route.displayName}</div>
                        <div className="text-xs text-sand-500">{route.currency}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-sand-600">No funding route is listed yet.</p>
                )}
              </div>

              <div className="mt-5 border-t border-forest-200 pt-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Current charges</div>
                {economics && currentSnapshot?.movement.currency ? (
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-sand-600">Recipient principal</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.recipientPrincipalMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-sand-600">SecurePay charge</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.securePayFeeMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-sand-600">Rail/provider</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.providerRailChargeMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    <div className="flex justify-between gap-4 border-t border-forest-200 pt-2"><dt className="font-semibold text-forest-900">Total payable</dt><dd className="font-semibold text-forest-900"><MoneyValue amount={moneyText(economics.totalPayableMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-sand-600">Charges appear here when SecurePay has authoritative movement economics for this Agreement.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-cream-200 bg-white/80 p-5 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-forest-700" />
                  <h2 className="font-display text-2xl text-forest-900">Fair trade finance</h2>
                </div>
                <p className="mt-1 text-sm text-sand-600">The institutions that can help good Agreements become possible, safer and easier to complete.</p>
              </div>
              <div className="text-xs text-sand-500">Banks · SACCOs · MMFs · Insurance</div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <EnablerCard
                icon={<Landmark className="h-5 w-5" />}
                title="Banks"
                text="Funding, payment rails and settlement."
                note={enablerBankNote(partners)}
              />
              <EnablerCard
                icon={<Users className="h-5 w-5" />}
                title="SACCOs"
                text="Community finance and member support."
                note="Visible as a fair-trade support category; live SACCO availability is only shown once SecurePay can prove it."
              />
              <EnablerCard
                icon={<Building2 className="h-5 w-5" />}
                title="MMFs"
                text="Liquidity and a place for waiting funds."
                note="Visible as a fair-trade support category; live MMF availability is only shown once SecurePay can prove it."
              />
              <EnablerCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Insurance"
                text="Protection for agreed risks."
                note="Visible as a fair-trade support category; live cover is only shown once SecurePay can prove it."
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
