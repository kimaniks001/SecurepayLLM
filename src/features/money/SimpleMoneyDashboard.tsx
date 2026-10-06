import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Landmark,
  LockKeyhole,
  Route,
  Search,
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
import type { PaymentIntentGateway } from '../../api/securepay/payment-intent';
import type { SettlementDestinationGateway } from '../../api/securepay/settlement-destinations';
import type { PaymentReleaseGateway } from '../../api/securepay/payment-release';
import { moneyText, minorFromString } from './amount';
import { resolveSelection, type SelectionTarget } from './selection';
import type { MoneyHandoff } from './handoff';
import { MoneyPaymentSettlementJourney } from './MoneyPaymentSettlementJourney';

type Load<T> =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; value: T };

interface SimpleMoneyDashboardProps {
  agreementGateway: AgreementGateway;
  snapshotGateway: MoneySnapshotGateway;
  financialPartners: FinancialPartnerGateway;
  paymentIntentGateway: PaymentIntentGateway;
  settlementGateway: SettlementDestinationGateway;
  paymentReleaseGateway: PaymentReleaseGateway;
  handoff?: MoneyHandoff | null;
  onSelectAgreement: (agreement: CurrentUserAgreementSummaryResponse) => void;
  onNavigate?: (view: import('../../types').AppView) => void;
  onOpenAgreement?: (agreementId: string) => void;
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
  if (['Blocked', 'Not ready', 'Not funded', 'Not available'].includes(status)) return 'bg-ember-100 text-ember-800';
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
  const knownFunded = established.map(position => position.fundedTotalMinor).filter((value): value is number => value != null);
  if (knownFunded.some(value => value > 0)) {
    return { status: 'Funded', detail: 'SecurePay shows funded money on this Agreement.' };
  }
  if (knownFunded.length !== established.length) {
    return { status: 'Unknown', detail: 'SecurePay has not returned a funded amount for every established money position.' };
  }
  return { status: 'Not funded', detail: 'Agreement Money exists, but SecurePay shows no funded amount yet.' };
}

function releaseStatus(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unknown', detail: 'Release authority is not loaded yet.' };
  if (snapshot.releaseRequest.authorityGranted) {
    return { status: 'Available', detail: 'Release-request authority is currently available for the evaluated scope.' };
  }
  return { status: 'Not ready', detail: 'SecurePay does not currently grant release-request authority.' };
}

function movementStatus(snapshot: AgreementMoneySnapshotResponse | null) {
  if (!snapshot) return { status: 'Unavailable', detail: 'SecurePay has not loaded the current movement state.' };
  if (snapshot.movement.state === 'READY') {
    return { status: 'Money can move', detail: 'The current read-only movement preflight passed.' };
  }
  if (snapshot.movement.state === 'UNAVAILABLE') {
    return { status: 'Unavailable', detail: 'SecurePay could not complete the movement preflight. This is unknown, not blocked.' };
  }
  return { status: 'Money cannot move yet', detail: titleCase(snapshot.movement.reasonCode) };
}

function nextStep(_snapshot: AgreementMoneySnapshotResponse | null, agreement: CurrentUserAgreementSummaryResponse | null) {
  const backendNext = agreement?.nextActions?.[0]?.reason;
  if (backendNext) return backendNext;
  if (!agreement) return 'Choose an Agreement to see its current money position.';
  return 'Nothing needs you right now.';
}


function fundingRailState(snapshot: AgreementMoneySnapshotResponse | null, railCode: string, name: string) {
  if (!snapshot) {
    return {
      status: 'Unknown',
      detail: `SecurePay has not loaded ${name} availability for this Agreement yet.`,
      option: null,
    };
  }
  const option = snapshot.fundingOptions.find(route => route.railCode === railCode) ?? null;
  if (option) {
    return {
      status: 'Available',
      detail: `${name} is currently listed by SecurePay as an eligible funding route for this Agreement.`,
      option,
    };
  }
  return {
    status: 'Not available',
    detail: `${name} is part of SecurePay's rail architecture, but it is not currently available for this Agreement.`,
    option: null,
  };
}

function choiceRailState(snapshot: AgreementMoneySnapshotResponse | null, partners: Load<RegulatedPartnerResponse[]>) {
  if (snapshot?.movement.railCode === 'CHOICE_KS_ACCOUNT') {
    return {
      status: 'Selected',
      detail: 'Choice Bank is the settlement rail selected by the current backend movement preflight.',
    };
  }
  if (partners.state === 'loading') {
    return { status: 'Checking', detail: 'Checking SecurePay’s connected bank-partner record.' };
  }
  if (partners.state === 'error') {
    return { status: 'Unknown', detail: 'SecurePay could not read the bank-partner state right now.' };
  }
  const choice = partners.value.find(partner =>
    partner.partnerCode.toUpperCase().includes('CHOICE')
    || partner.displayName.toUpperCase().includes('CHOICE')
    || partner.legalName.toUpperCase().includes('CHOICE')
  );
  if (choice?.status === 'ACTIVE') {
    return {
      status: 'Connected',
      detail: 'Choice Bank is connected as a regulated bank partner. That does not by itself make settlement executable for this Agreement.',
    };
  }
  return {
    status: 'Visible',
    detail: 'Choice Bank is shown for its bank-account and settlement role. SecurePay has not selected it for this Agreement movement.',
  };
}

function FundingOptionCard({ route }: { route: AgreementMoneySnapshotResponse['fundingOptions'][number] }) {
  return (
    <div className="rounded-xl border border-forest-100 bg-white/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-forest-900">{route.displayName}</div>
          <div className="mt-0.5 text-xs text-sand-500">{route.currency}</div>
        </div>
        <StatusPill status="Available" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-sand-500">Minimum</dt>
          <dd className="mt-0.5 font-medium text-forest-900">
            {route.minimumAmountMinor == null ? 'Not shown' : <MoneyValue amount={moneyText(route.minimumAmountMinor, route.currency)} size="sm" />}
          </dd>
        </div>
        <div>
          <dt className="text-sand-500">Maximum</dt>
          <dd className="mt-0.5 font-medium text-forest-900">
            {route.maximumAmountMinor == null ? 'Not shown' : <MoneyValue amount={moneyText(route.maximumAmountMinor, route.currency)} size="sm" />}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-sand-600">
        {route.quoteAvailable
          ? 'A backend Agreement-bound quote is available for this rail.'
          : 'SecurePay does not offer a quote step for this rail right now.'}
      </p>
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
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-card ${active
        ? 'border-forest-300 bg-forest-50 shadow-soft'
        : 'border-cream-200 bg-white/75 hover:border-forest-200 hover:bg-cream-50'}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-forest-900">{agreement.title}</div>
        <div className="mt-0.5 truncate text-xs text-sand-500">
          {agreement.counterparty?.displayName ?? agreement.counterparty?.ksNumber ?? titleCase(agreement.agreementType)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-forest-900">
          {amount ? <MoneyValue amount={amount} size="sm" /> : 'Amount not shown'}
        </div>
        <div className="mt-0.5 text-[0.68rem] text-sand-500">{titleCase(agreement.status)}</div>
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
    return <p className="text-sm text-sand-600">No Agreement Money has been funded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {snapshot.positions.map((position, index) => {
        const currency = position.currency ?? position.proposedCurrency ?? '';
        if (!position.established) {
          return (
            <div key={position.obligationId ?? `position-${index}`} className="rounded-xl bg-cream-50 p-4">
              <div className="text-sm font-medium text-forest-900">{position.obligationTitle ?? 'Agreement Money position'}</div>
              <div className="mt-2 text-sm text-sand-700">
                Proposed {position.proposedAmountMinor != null ? <MoneyValue amount={moneyText(position.proposedAmountMinor, currency)} size="sm" /> : 'amount not shown'}
              </div>
              <p className="mt-1 text-xs text-sand-500">No Agreement Money has been funded yet.</p>
            </div>
          );
        }

        const authorised = position.authorisedMaxAmountMinor;
        const funded = position.fundedTotalMinor;
        const fundedWidth = authorised != null && authorised > 0 && funded != null
          ? Math.min(100, Math.max(0, (funded / authorised) * 100))
          : null;

        return (
          <div key={position.obligationId ?? `position-${index}`} className="rounded-2xl border border-cream-200 bg-white/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-forest-900">{position.obligationTitle ?? 'Agreement Money position'}</div>
                {position.beneficiaryMaskedKsNumber && (
                  <div className="mt-1 text-xs text-sand-500">Beneficiary {position.beneficiaryMaskedKsNumber}</div>
                )}
              </div>
              {position.closed && <StatusPill status="Closed" />}
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">Authorised maximum</div>
                  <div className="mt-1">
                    {authorised == null ? 'Not shown' : <MoneyValue amount={moneyText(authorised, currency)} size="md" />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.68rem] uppercase tracking-wide text-sand-500">Funded</div>
                  <div className="mt-1">{funded == null ? 'Not shown' : <MoneyValue amount={moneyText(funded, currency)} size="md" />}</div>
                </div>
              </div>
              {fundedWidth != null && (
                <div className="sp-progress-track mt-3" aria-label="Funding progress against authorised maximum">
                  <div className="sp-progress-fill" style={{ width: `${fundedWidth}%` }} />
                </div>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-cream-200 pt-4 sm:grid-cols-4">
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Funded</dt><dd className="mt-1">{funded == null ? 'Unavailable' : <MoneyValue amount={moneyText(funded, currency)} size="sm" />}</dd></div>
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Progressed / earned</dt><dd className="mt-1">{position.exercisedOrSettledMinor == null ? 'Unavailable' : <MoneyValue amount={moneyText(position.exercisedOrSettledMinor, currency)} size="sm" />}</dd></div>
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Remaining funded</dt><dd className="mt-1">{position.remainingFundedMinor == null ? 'Unavailable' : <MoneyValue amount={moneyText(position.remainingFundedMinor, currency)} size="sm" />}</dd></div>
              <div><dt className="text-[0.68rem] uppercase tracking-wide text-sand-500">Released / returned</dt><dd className="mt-1">{position.releasedTotalMinor == null ? 'Unavailable' : <MoneyValue amount={moneyText(position.releasedTotalMinor, currency)} size="sm" />}</dd></div>
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
  paymentIntentGateway,
  settlementGateway,
  paymentReleaseGateway,
  handoff,
  onSelectAgreement,
  onNavigate,
  onOpenAgreement,
}: SimpleMoneyDashboardProps) {
  const AGREEMENTS_PER_PAGE = 12;
  const [agreements, setAgreements] = useState<Load<CurrentUserAgreementSummaryResponse[]>>({ state: 'loading' });
  const [agreementPage, setAgreementPage] = useState(0);
  const [agreementTotal, setAgreementTotal] = useState(0);
  const [agreementSearch, setAgreementSearch] = useState('');
  const [selected, setSelected] = useState<SelectionTarget | null>(null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Load<AgreementMoneySnapshotResponse | null>>({ state: 'ready', value: null });
  const [detail, setDetail] = useState<Load<AgreementDetailResponse | null>>({ state: 'ready', value: null });
  const [partners, setPartners] = useState<Load<RegulatedPartnerResponse[]>>({ state: 'loading' });
  const [moneyRefreshKey, setMoneyRefreshKey] = useState(0);

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
    setAgreements({ state: 'loading' });
    agreementGateway.currentUserAgreements(agreementPage, AGREEMENTS_PER_PAGE)
      .then(response => {
        if (!live) return;
        setAgreements({ state: 'ready', value: response.items });
        setAgreementTotal(response.totalElements);
        // On the first page only, open the first backend-returned Agreement as a neutral default.
        // Later pages never replace a person's current selection.
        if (!handoff && agreementPage === 0 && !selected && response.items.length > 0) {
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
  }, [agreementGateway, handoff, onSelectAgreement, agreementPage]);

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
  }, [selected?.agreementId, agreementGateway, snapshotGateway, moneyRefreshKey]);

  const currentSnapshot = snapshot.state === 'ready' ? snapshot.value : null;
  const currentDetail = detail.state === 'ready' ? detail.value : null;
  const selectedSummary = useMemo(() => {
    if (!selected || agreements.state !== 'ready') return null;
    return agreements.value.find(agreement => agreement.agreementId === selected.agreementId) ?? null;
  }, [agreements, selected]);

  const visibleAgreements = useMemo(() => {
    if (agreements.state !== 'ready') return [];
    const query = agreementSearch.trim().toLowerCase();
    if (!query) return agreements.value;
    return agreements.value.filter(agreement => {
      const amount = amountFromSummary(agreement)?.toLowerCase() ?? '';
      const counterparty = agreement.counterparty?.displayName?.toLowerCase() ?? agreement.counterparty?.ksNumber?.toLowerCase() ?? '';
      return agreement.title.toLowerCase().includes(query)
        || agreement.purpose.toLowerCase().includes(query)
        || counterparty.includes(query)
        || amount.includes(query);
    });
  }, [agreements, agreementSearch]);
  const agreementPageCount = Math.max(1, Math.ceil(agreementTotal / AGREEMENTS_PER_PAGE));

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
      <section className="sp-hero overflow-hidden">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white/70 px-3 py-1 text-xs font-semibold text-forest-800">
              <Sparkles className="h-3.5 w-3.5" />
              Agreement-led money
            </div>
            <h2 className="sp-display mt-4 text-3xl md:text-5xl">{handoff ? 'Money for this Agreement.' : 'Money follows the agreement.'}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sand-700 md:text-base">
              {handoff
                ? `You came from “${handoff.title}”. Keep that Agreement in view while you see funding, charges, readiness and the next real money step.`
                : 'See the trade, the amount, what happens next, and the financial support around it — without losing the deeper money record underneath.'}
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

      <details className="sp-section overflow-hidden" open={!handoff}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 md:px-5">
          <div>
            <h2 className="font-display text-xl text-forest-900">{handoff ? 'Change Agreement' : 'Choose an Agreement'}</h2>
            <p className="mt-0.5 text-xs text-sand-600">{handoff ? 'The Agreement you came from stays selected.' : 'A compact Money selector — not a second Agreement dashboard.'}</p>
          </div>
          {agreementTotal > 0 && <div className="shrink-0 text-xs text-sand-500">{agreementTotal} Agreement{agreementTotal === 1 ? '' : 's'}</div>}
        </summary>
        <div className="border-t border-cream-200 px-4 py-4 md:px-5">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
            <input
              type="search"
              value={agreementSearch}
              onChange={event => setAgreementSearch(event.target.value)}
              placeholder="Search this page by title, person or amount"
              className="min-h-11 w-full rounded-xl border border-cream-200 bg-white pl-10 pr-3 text-sm text-forest-900 outline-none focus:border-forest-400"
              aria-label="Search Agreements on this page"
            />
          </div>

          {agreements.state === 'loading' && <p role="status" className="text-sm text-sand-500">Loading Agreements…</p>}
          {agreements.state === 'error' && (
            <div className="space-y-2">
              <StatusNotice tone="warning">SecurePay couldn’t load this Agreement page. No money state is being guessed.</StatusNotice>
              {onNavigate && <button type="button" onClick={() => onNavigate('agreements')} className="min-h-11 rounded-full border border-forest-200 bg-white px-4 text-sm font-medium text-forest-700">Open Agreements</button>}
            </div>
          )}
          {agreements.state === 'ready' && agreements.value.length === 0 && agreementTotal === 0 && (
            <div className="rounded-2xl border border-cream-200 bg-white/70 p-5">
              <div className="text-sm font-medium text-forest-900">Money starts with an Agreement.</div>
              <p className="mt-1 text-sm text-sand-600">You have no Agreements yet. Shape the idea in Vision or start the Agreement, then Money will follow it here.</p>
            </div>
          )}
          {agreements.state === 'ready' && visibleAgreements.length === 0 && agreements.value.length > 0 && (
            <p className="py-4 text-sm text-sand-500">No Agreement on this page matches that search. Try another page or clear the search.</p>
          )}
          {agreements.state === 'ready' && visibleAgreements.length > 0 && (
            <div className="space-y-2">
              {visibleAgreements.map(agreement => (
                <AgreementCard
                  key={agreement.agreementId}
                  agreement={agreement}
                  active={agreement.agreementId === selectedId}
                  onOpen={() => void chooseAgreement(agreement)}
                />
              ))}
            </div>
          )}

          {agreementTotal > AGREEMENTS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-200 pt-3">
              <button
                type="button"
                disabled={agreementPage === 0}
                onClick={() => { setAgreementSearch(''); setAgreementPage(page => Math.max(0, page - 1)); }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-cream-200 bg-white px-3 text-sm font-medium text-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-xs text-sand-500">Page {agreementPage + 1} of {agreementPageCount}</span>
              <button
                type="button"
                disabled={agreementPage + 1 >= agreementPageCount}
                onClick={() => { setAgreementSearch(''); setAgreementPage(page => Math.min(agreementPageCount - 1, page + 1)); }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-cream-200 bg-white px-3 text-sm font-medium text-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </details>

      {selectionNotice && <StatusNotice tone="warning">{selectionNotice}</StatusNotice>}
      {snapshot.state === 'error' && (
        <StatusNotice tone="warning">SecurePay couldn’t load this Agreement’s money snapshot. No financial state is being inferred.</StatusNotice>
      )}

      {selected && (
        <>
          <section className="sp-section sp-lift-in overflow-hidden">
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
                {onOpenAgreement && (
                  <button type="button" onClick={() => onOpenAgreement(selected.agreementId)} className="mt-4 min-h-11 rounded-full border border-forest-200 bg-white px-4 text-sm font-medium text-forest-700">
                    Open this Agreement
                  </button>
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
                <div className="mt-4 border-t border-forest-700 pt-4">
                  <div className="text-xs uppercase tracking-wide text-forest-200">Money responsibility</div>
                  <p className="mt-2 text-sm text-cream-100">
                    {economics?.payerRole ? `Payer role: ${titleCase(economics.payerRole)}` : 'SecurePay has not established a payer role in the current movement economics.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Your money position" className="rounded-3xl border border-forest-200 bg-white/85 p-5 md:p-6">
            <div className="mb-4">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Your money position</div>
              <h2 className="mt-1 font-display text-2xl text-forest-900">Where the money is now</h2>
              <p className="mt-1 text-sm text-sand-600">These figures come from SecurePay’s Agreement Money positions. Missing values stay unavailable — never zeroed.</p>
            </div>
            {snapshot.state === 'loading' && <p role="status" className="text-sm text-sand-500">Reading Agreement Money…</p>}
            {currentSnapshot && <PositionMoney snapshot={currentSnapshot} />}
          </section>

          <section aria-label="Money at a glance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceStateCard icon={<CheckCircle2 className="h-5 w-5" />} title="Payment readiness" status={payment.status} detail={payment.detail} />
            <FinanceStateCard icon={<WalletCards className="h-5 w-5" />} title="Funding" status={funding.status} detail={funding.detail} />
            <FinanceStateCard icon={<LockKeyhole className="h-5 w-5" />} title="Release" status={release.status} detail={release.detail} />
            <FinanceStateCard icon={<ArrowRight className="h-5 w-5" />} title="Can money move?" status={movement.status} detail={movement.detail} />
          </section>

          <details className="rounded-3xl border border-forest-200 bg-white/80" data-testid="agreement-money-flow">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-6">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Financial details</div>
                <div className="mt-1 font-display text-xl text-forest-900">See payment route & settlement architecture</div>
              </div>
              <span className="text-xs text-sand-500">Open details</span>
            </summary>
            <section className="border-t border-forest-100 p-5 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-forest-700" />
                  <h2 className="font-display text-2xl text-forest-900">How money moves around this Agreement</h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-sand-600">
                  Agreement first, then funding, Agreement Money, and settlement. Each step remains controlled by backend authority.
                </p>
              </div>
              <div className="text-xs font-medium text-sand-500">Visible does not mean executable.</div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-stretch">
              <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">1 · Agreement</div>
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-forest-700" />
                  <h3 className="font-display text-lg text-forest-900">Authority</h3>
                </div>
                <p className="mt-2 text-xs leading-5 text-sand-600">Who pays, the amount, currency and conditions all begin with the Agreement.</p>
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
                    <p className="mt-2 text-xs leading-5 text-sand-600">Funding / collection into this Agreement.</p>
                    <p className="mt-1 text-xs leading-5 text-sand-500">{mpesaRail.detail}</p>
                  </div>
                  <div className="rounded-xl border border-cream-200 bg-cream-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-forest-700" /><span className="text-sm font-semibold text-forest-900">PesaLink</span></div>
                      <StatusPill status={pesalinkRail.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-sand-600">Bank-based funding into this Agreement where eligible.</p>
                    <p className="mt-1 text-xs leading-5 text-sand-500">{pesalinkRail.detail}</p>
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex items-center justify-center text-sand-400"><ArrowRight className="h-5 w-5" /></div>

              <div className="rounded-2xl border border-forest-200 bg-forest-50/70 p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">3 · Agreement Money</div>
                <div className="mt-2 flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-forest-700" />
                  <h3 className="font-display text-lg text-forest-900">Protected by the Agreement</h3>
                </div>
                <p className="mt-2 text-xs leading-5 text-sand-600">Funded money is recorded against the Agreement and its obligations, not treated as a generic wallet balance.</p>
              </div>

              <div className="hidden xl:flex items-center justify-center text-sand-400"><ArrowRight className="h-5 w-5" /></div>

              <div className="rounded-2xl border border-cream-200 bg-white p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">4 · Settle</div>
                <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-forest-700" /><span className="text-sm font-semibold text-forest-900">Choice Bank</span></div>
                    <StatusPill status={choiceRail.status} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-sand-600">Bank/account infrastructure and authorised external settlement where backend authority permits.</p>
                  <p className="mt-1 text-xs leading-5 text-sand-500">{choiceRail.detail}</p>
                </div>
                <p className="mt-3 text-[0.72rem] leading-5 text-sand-500">Settlement still requires Agreement authority, a valid destination, provider/rail gates and a successful movement preflight.</p>
              </div>
            </div>
            </section>
          </details>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 md:p-6">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-forest-700" />
                <div>
                  <h2 className="font-display text-2xl text-forest-900">Money position detail</h2>
                  <p className="text-xs text-sand-500">The same backend positions, kept here for deeper inspection.</p>
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
                  <div className="mt-2 space-y-2">
                    {fundingRoutes.map(route => <FundingOptionCard key={route.railCode} route={route} />)}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-sand-600">SecurePay does not currently list an eligible funding route for this Agreement.</p>
                )}
              </div>

              <div className="mt-5 border-t border-forest-200 pt-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Current charges</div>
                {economics && currentSnapshot?.movement.currency ? (
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-sand-600">Recipient principal</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.recipientPrincipalMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-sand-600">SecurePay charge</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.securePayFeeMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-sand-600">Rail/provider</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.providerRailChargeMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    {economics.taxMinor > 0 && (
                      <div className="flex justify-between gap-4"><dt className="text-sand-600">Tax</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(economics.taxMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-forest-200 pt-2"><dt className="font-semibold text-forest-900">Total payable</dt><dd className="font-semibold text-forest-900"><MoneyValue amount={moneyText(economics.totalPayableMinor, currentSnapshot.movement.currency)} size="sm" /></dd></div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-sand-600">Charges appear here when SecurePay has authoritative movement economics for this Agreement.</p>
                )}
              </div>
            </div>
          </section>

          <MoneyPaymentSettlementJourney
            agreementGateway={agreementGateway}
            paymentIntentGateway={paymentIntentGateway}
            settlementGateway={settlementGateway}
            paymentReleaseGateway={paymentReleaseGateway}
            agreement={selectedSummary}
            agreementId={selected.agreementId}
            agreementTitle={selected.title}
            currency={selected.currency}
            snapshot={currentSnapshot}
            onMoneyRefresh={() => setMoneyRefreshKey(key => key + 1)}
          />

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
