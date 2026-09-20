import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import { Surface, SurfaceHeader, SurfaceBody } from '../../components/dna/Surface';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { Button } from '../../components/dna/Button';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AgreementMoneyByCurrencyResponse, CurrentUserAgreementSummaryResponse, WorkspaceNextActionResponse } from '../../api/securepay/agreements/dto';
import type {
  AgreementFundedAuthorityStatusResponse,
  AgreementMoneyTransactionResponse,
  MoneyAuthorityGateway,
} from '../../api/securepay/money-authority';
import type { FinancialPartnerGateway, RegulatedPartnerResponse } from '../../api/securepay/financial-partners';
import type {
  ExternalDestinationAccountKind,
  SettlementDestinationGateway,
  SettlementDestinationResponse,
  SettlementVerificationStatusResponse,
} from '../../api/securepay/settlement-destinations';
import type { PaymentIntentGateway } from '../../api/securepay/payment-intent';
import type { CurrencyCapabilityGateway } from '../../api/securepay/currency-capability';
import type { FxApplicationGateway } from '../../api/securepay/fx-application';
import type { RegulatedAccountsGateway } from '../../api/securepay/regulated-accounts';
import type { BusinessCurrencyCapabilityGateway } from '../../api/securepay/business-currency-capability';
import type { BusinessFxApplicationGateway } from '../../api/securepay/business-fx-application';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { PaymentReadyPanel, FundingPanel, ActivityPanel, ReleasePanel } from './AgreementMoneyPanels';
import { peekMoneyHandoff, clearMoneyHandoff, type MoneyHandoff } from './handoff';
import type { MoneyGateway } from '../../api/securepay/money';
import type { PaymentReleaseGateway } from '../../api/securepay/payment-release';
import { createAttemptStore, UNCERTAIN_MONEY, UNRESOLVED_ATTEMPT } from './attempt';
import { resolveSelection, type SelectionTarget } from './selection';
import { openSupportFromRoute } from '../support/context';
import { exceptionHeading, exceptionReason, recordedOn, requiredActionWords, RECOVERY_HEADROOM_NOTE, RECOVERY_LABEL } from '../support/display';
import { readSettlementScope, submitDestination, type ScopeRead, type CurrentRead, type HistoryRead } from './settlementDestination';
import { CurrencyCapabilitySection } from './CurrencyCapabilitySection';
import { AgreementCurrencyActivationPrompt } from './AgreementCurrencyActivationPrompt';
import { FxConversionSection } from './FxConversionSection';
import { BusinessCurrencyCapabilitySection } from './BusinessCurrencyCapabilitySection';
import { BusinessFxConversionSection } from './BusinessFxConversionSection';
import { moneyText } from './amount';

function money(minor: number, currency: string) { return moneyText(minor, currency); }

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/** Final Completion Phase 2 completion pass, Section 7 -- a reversal never rewrites the original Progressed entry; it appears as its own, later, distinct line. */
function transactionLabel(type: AgreementMoneyTransactionResponse['type']): string {
  switch (type) {
    case 'FUNDED': return 'Funded';
    case 'PROGRESSED': return 'Progressed';
    case 'RELEASED': return 'Returned to funder(s)';
    // A recovery never rewrites the original Progressed entry, and a completed ledger recovery does not by itself restore spending headroom.
    default: return RECOVERY_LABEL[type] ?? 'A recorded event for';
  }
}
const isRecoveryEntry = (type: string) => type in RECOVERY_LABEL;

export interface MoneyGateways {
  moneyAuthority: MoneyAuthorityGateway;
  financialPartners: FinancialPartnerGateway;
  settlementDestinations: SettlementDestinationGateway;
  agreements: AgreementGateway;
  money: MoneyGateway;
  paymentRelease: PaymentReleaseGateway;
  paymentIntent: PaymentIntentGateway;
  currencyCapability: CurrencyCapabilityGateway;
  fxApplication: FxApplicationGateway;
  regulatedAccounts: RegulatedAccountsGateway;
  businessCurrencyCapability: BusinessCurrencyCapabilityGateway;
  businessFxApplication: BusinessFxApplicationGateway;
}

export function MoneyExperience({ gateways, auth, session, onLeave }: {
  gateways: MoneyGateways;
  auth: AuthGateway;
  session: SessionStore;
  onLeave: () => void;
}) {
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const [jumpAgreement, setJumpAgreement] = useState<CurrentUserAgreementSummaryResponse | null>(null);
  // Agreement -> Money handoff is in memory only (never in the URL). Peeked here, cleared after mount, so a refresh opens Money Home.
  const [handoff] = useState<MoneyHandoff | null>(() => peekMoneyHandoff());
  useEffect(() => { clearMoneyHandoff(); }, []);

  if (sessionState.status !== 'signed-in') {
    const data = secureAuthView(identityState);
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col">
        <MoneyHeader onBack={onLeave} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-4">
            <div className="text-center">
              <h1 className="font-display text-2xl text-forest-800">SecurePay Money</h1>
              <p className="mt-2 text-sm text-sand-600">Sign in to see Agreement Money across your Agreements, what it is allowed to do, and what has happened.</p>
            </div>
            <SecureAuthCard
              data={data}
              values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
              disabled={identityState.busy}
              errorText={identityState.error}
              onFieldChange={(index, value) => {
                if (identityState.phase === 'otp') identityController.setOtp(value);
                else if (index === 0) identityController.setKsNumber(value);
                else identityController.setPassword(value);
              }}
              onChoice={value => {
                if (value === 'submit_credentials') void identityController.submitCredentials();
                else if (value === 'submit_otp') void identityController.submitOtp();
                else if (value === 'reset_credentials') identityController.reset();
                else if (value === 'cancel_auth') { setIdentityController(createIdentityController(auth, session)); onLeave(); }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-100 flex flex-col pb-8">
      <MoneyHeader onBack={onLeave} />
      <div className="flex-1 px-4 md:px-8 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Final Phase 3 correction (Section 4): the original description overstated what this
            aggregate proves -- AgreementMoneySummaryService is explicit that it establishes
            Agreement Money across the actor's readable Agreements only, never personal ownership,
            money due to the actor, or a general balance. */}
        <PageHeader title="Money" description="Agreement Money across your Agreements, what it is allowed to do, and what has happened. Nothing here is calculated by this screen." />
        <MoneyHomeOverview agreementGateway={gateways.agreements} onOpenAgreement={setJumpAgreement} />
        <AgreementMoneySection
          authorityGateway={gateways.moneyAuthority}
          agreementGateway={gateways.agreements}
          moneyGateway={gateways.money}
          paymentReleaseGateway={gateways.paymentRelease}
          paymentIntentGateway={gateways.paymentIntent}
          currencyCapabilityGateway={gateways.currencyCapability}
          initialAgreement={jumpAgreement}
          handoff={handoff}
        />
        <CurrencyCapabilitySection gateway={gateways.currencyCapability} />
        <FxConversionSection regulatedAccountsGateway={gateways.regulatedAccounts} fxApplicationGateway={gateways.fxApplication} />
        <BusinessCurrencyCapabilitySection gateway={gateways.businessCurrencyCapability} />
        <BusinessFxConversionSection capabilityGateway={gateways.businessCurrencyCapability} fxApplicationGateway={gateways.businessFxApplication} />
        <SettlementDestinationSection gateway={gateways.settlementDestinations} />
        <FinancialPartnersSection gateway={gateways.financialPartners} />
      </div>
    </div>
  );
}

/**
 * Money Home (Phase 3 Section 4, corrected by the deep-review pass): surfaces Agreement Money and
 * "what needs my attention" from the same authoritative aggregate the backend already computes for
 * this purpose -- `GET /api/v1/me/agreements/home` (`agreementGateway.home()`), which the initial
 * archaeology pass missed entirely (it was already fetched for Signed-in Home, just never reused
 * here). `moneyByCurrency` (`fundedTotalMinor`/`exercisedOrSettledMinor`/`releasedTotalMinor`/
 * `remainingFundedMinor`/`positionCount` per currency) is `AgreementMoneySummaryService`'s own
 * aggregate over established Agreement Money positions -- it never combines currencies and never
 * invents an FX equivalent, so this component renders it exactly as returned, with zero client
 * arithmetic. "Needs your attention" reuses the same response's own `needsMe` bucket (already
 * backend-classified) rather than independently fetching and re-filtering the full Agreement list.
 */
function MoneyHomeOverview({ agreementGateway, onOpenAgreement }: {
  agreementGateway: AgreementGateway;
  onOpenAgreement: (agreement: CurrentUserAgreementSummaryResponse) => void;
}) {
  const [moneyByCurrency, setMoneyByCurrency] = useState<AgreementMoneyByCurrencyResponse[] | null>(null);
  const [needsMe, setNeedsMe] = useState<CurrentUserAgreementSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    agreementGateway.home()
      .then(response => {
        if (cancelled) return;
        setMoneyByCurrency(response.moneyByCurrency);
        setNeedsMe(response.needsMe);
      })
      .catch(cause => { if (!cancelled) setError(errorText(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [agreementGateway]);

  if (loading) return <p role="status" className="text-sm text-sand-500">Loading your Agreement Money…</p>;
  if (error) return <StatusNotice tone="warning">{error}</StatusNotice>;
  if (!moneyByCurrency) return null;

  if (moneyByCurrency.length === 0) {
    return (
      <Surface><SurfaceBody>
        <p className="text-sm text-sand-600">No Agreement Money is established yet. Once Agreement Money is set up for an Agreement, it will appear here.</p>
      </SurfaceBody></Surface>
    );
  }

  /*
   * Final Phase 3 correction (Section 16/17): a money-bearing Agreement (proposedAmountMinor
   * present) can need attention for reasons that have nothing to do with money -- evidence, review,
   * confirmation, an unrelated obligation. Presence of a proposed amount is not proof the next
   * action is financial. This now requires the backend's own nextActions to contain a verified
   * money-specific action code (FUND_AGREEMENT -- the same real `/api/v1/me/actions` code already
   * used elsewhere in this codebase, e.g. workspace/controller.ts's fundActionAvailable check) --
   * never inferred from proposedAmountMinor, never re-ranked, never an invented fallback.
   */
  const MONEY_ACTION_CODES = new Set(['FUND_AGREEMENT']);
  const moneyNeedsAttention = needsMe
    .map(agreement => ({ agreement, moneyAction: agreement.nextActions.find(action => MONEY_ACTION_CODES.has(action.actionCode)) }))
    .filter((entry): entry is { agreement: CurrentUserAgreementSummaryResponse; moneyAction: WorkspaceNextActionResponse } => !!entry.moneyAction);

  return (
    <Surface>
      <SurfaceHeader
        title="Agreement Money"
        description="Agreement Money SecurePay can show for Agreements you can access. This comes directly from SecurePay, not calculated by this screen."
      />
      <SurfaceBody>
        <div className="flex flex-wrap gap-4">
          {moneyByCurrency.map(entry => (
            <div key={entry.currency} className="rounded-xl bg-cream-50 px-4 py-3 space-y-1">
              <div>
                {/* Final Phase 3 correction (Section 5): remainingFundedMinor is funded money not
                    yet progressed or released -- not proven to be personally spendable/available,
                    so this never says "available." */}
                <MoneyValue amount={money(entry.remainingFundedMinor, entry.currency)} size="lg" />
                <p className="text-xs text-sand-500 mt-0.5">
                  Remaining funded · {entry.positionCount} position{entry.positionCount === 1 ? '' : 's'}
                </p>
                <p className="text-[0.7rem] text-sand-400">Funded Agreement Money not yet progressed or released</p>
              </div>
              <div className="text-[0.72rem] text-sand-500 space-y-0.5 pt-1 border-t border-cream-200">
                <div>Funded / protected: <MoneyValue amount={money(entry.fundedTotalMinor, entry.currency)} size="sm" /></div>
                <div>Progressed: <MoneyValue amount={money(entry.exercisedOrSettledMinor, entry.currency)} size="sm" /></div>
                <div>Released: <MoneyValue amount={money(entry.releasedTotalMinor, entry.currency)} size="sm" /></div>
              </div>
            </div>
          ))}
        </div>
        {moneyNeedsAttention.length > 0 && (
          <div className="space-y-2">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Needs your attention</div>
            {moneyNeedsAttention.map(({ agreement, moneyAction }) => (
              <button
                key={agreement.agreementId}
                onClick={() => onOpenAgreement(agreement)}
                className="w-full text-left rounded-xl border border-ember-200 bg-ember-50 px-3 py-2.5 hover:border-ember-300 transition-colors"
              >
                <div className="text-sm font-medium text-forest-800">{agreement.title}</div>
                {/* The backend's own reason text for the verified money action, shown faithfully -- never re-ranked, never invented. */}
                <div className="text-xs text-sand-600">{moneyAction.reason}</div>
              </button>
            ))}
          </div>
        )}
      </SurfaceBody>
    </Surface>
  );
}

function MoneyHeader({ onBack }: { onBack: () => void }) {
  return <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between"><button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back</button><img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" /></header>;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Surface>
      <SurfaceHeader title={title} description={description} />
      <SurfaceBody>{children}</SurfaceBody>
    </Surface>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <StatusNotice tone="warning">{message}</StatusNotice>;
}

/**
 * Agreement Money. Everything here is READ. Funding, opening/funding/progressing/returning a position, and hosted links are withheld: SecurePay gates those
 * commands behind an environment check no read exposes and does not make them conditional on the current Agreement version, so this screen can't prove that
 * pressing one is authorised, recoverable, or bound to the version the person is looking at (docs/UI_COMPLETION_PHASE8_MONEY.md).
 * Amount authority: a position's figures are the backend's per-obligation position; the Agreement summary amount and Payment Ready's evaluated amount
 * are separate, labelled sources and are never summed or reconciled here.
 */
function AgreementMoneySection({ authorityGateway, agreementGateway, moneyGateway, paymentReleaseGateway, paymentIntentGateway, currencyCapabilityGateway, initialAgreement, handoff }: {
  authorityGateway: MoneyAuthorityGateway;
  agreementGateway: AgreementGateway;
  moneyGateway: MoneyGateway;
  paymentReleaseGateway: PaymentReleaseGateway;
  paymentIntentGateway: PaymentIntentGateway;
  currencyCapabilityGateway: CurrencyCapabilityGateway;
  initialAgreement?: CurrentUserAgreementSummaryResponse | null;
  handoff?: MoneyHandoff | null;
}) {
  const [agreements, setAgreements] = useState<CurrentUserAgreementSummaryResponse[] | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<SelectionTarget | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [contextNotice, setContextNotice] = useState<string | null>(null);
  // The current version id from a FRESH read at selection time (never from the cached picker list). null = couldn't be established.
  const [freshVersionId, setFreshVersionId] = useState<string | null>(null);
  const [positions, setPositions] = useState<AgreementFundedAuthorityStatusResponse[] | null>(null);
  const [positionsUnknown, setPositionsUnknown] = useState(false);
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null);
  const [history, setHistory] = useState<AgreementMoneyTransactionResponse[] | null>(null);
  const [historyUnknown, setHistoryUnknown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPosition = positions?.find(p => p.obligationId === selectedObligationId) ?? null;

  const loadAgreements = async () => {
    setLoading(true); setError(null);
    try { const items = (await agreementGateway.currentUserAgreements()).items; setAgreements(items); return items; }
    catch (cause) { setError(errorText(cause)); return null; }
    finally { setLoading(false); }
  };

  const readPositions = async (agreementId: string) => {
    setPositionsUnknown(false);
    try { const list = await authorityGateway.list(agreementId); setPositions(list.positions); return list.positions; }
    catch { setPositions(null); setPositionsUnknown(true); return null; }
  };

  /**
   * Selecting an Agreement ALWAYS re-reads it by id (`GET /agreements/{id}/detail`): an exact, authorised read that returns the current version. The paginated
   * `/me/agreements` list is only the picker's source -- it is never searched to establish a version or to decide an Agreement "can't be found" (an Agreement can
   * be fully accessible yet off page 1). If the exact read fails, nothing is claimed about access; version-dependent presentation fails closed (neutral wording).
   */
  const selectAgreement = async (target: SelectionTarget, source?: MoneyHandoff | null) => {
    setFreshVersionId(null); setContextNotice(null);
    const { chosen, label, notice, versionId } = await resolveSelection(agreementGateway, target, source);
    setFreshVersionId(versionId);
    setSelectedAgreement(chosen); setContext(label); setContextNotice(notice);
    setPositions(null); setSelectedObligationId(null); setHistory(null); setHistoryUnknown(false);
    setLoading(true); setError(null);
    const list = await readPositions(chosen.agreementId);
    if (list && list.length === 1) setSelectedObligationId(list[0].obligationId);
    setLoading(false);
  };
  const pick = (a: CurrentUserAgreementSummaryResponse) => selectAgreement({ agreementId: a.agreementId, title: a.title, currency: a.currency, summaryAmountMinor: a.proposedAmountMinor });

  useEffect(() => {
    if (initialAgreement) void pick(initialAgreement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgreement?.agreementId]);

  // Opening from an Agreement: the in-memory handoff names the Agreement; the exact Detail read verifies access and the current version. The picker list is loaded
  // only as a convenience for "choose a different Agreement".
  useEffect(() => {
    if (!handoff) return;
    void selectAgreement({ agreementId: handoff.agreementId, title: handoff.title, currency: null, summaryAmountMinor: null }, handoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff?.agreementId]);

  const loadHistory = async () => {
    if (!selectedAgreement || !selectedObligationId) return;
    setLoading(true); setHistoryUnknown(false);
    try { setHistory(await authorityGateway.transactions(selectedAgreement.agreementId, selectedObligationId)); }
    catch { setHistory(null); setHistoryUnknown(true); }
    finally { setLoading(false); }
  };

  return (
    <SectionCard title="Agreement Money" description="What SecurePay says about one of your Agreements’ money. Nothing here is calculated by this screen.">
      {error && <ErrorBanner message={error} />}
      {!agreements && !selectedAgreement ? (
        <Button variant="secondary" onClick={() => void loadAgreements()} disabled={loading}>Show my Agreements</Button>
      ) : selectedAgreement === null ? (
        agreements && agreements.length === 0 ? (
          <p className="text-sm text-sand-600">You have no Agreements yet.</p>
        ) : (
          <ul className="space-y-2">
            {agreements?.map(agreement => (
              <li key={agreement.agreementId}>
                <button onClick={() => void pick(agreement)} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
                  <div className="font-medium text-forest-800">{agreement.title}</div>
                  <div className="text-xs text-sand-600">{agreement.purpose}{agreement.counterparty?.ksNumber ? ` · ${agreement.counterparty.ksNumber}` : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" onClick={() => { setSelectedAgreement(null); setPositions(null); setSelectedObligationId(null); setContext(null); if (!agreements) void loadAgreements(); }} className="text-xs">← Choose a different Agreement</Button>
          {contextNotice && <StatusNotice tone="warning">{contextNotice}</StatusNotice>}
          <div className="text-sm text-forest-800 font-medium" data-testid="money-context">{context ?? selectedAgreement.title} {selectedAgreement.currency && <span className="text-xs text-sand-500">({selectedAgreement.currency})</span>}</div>

          {selectedAgreement.currency && <AgreementCurrencyActivationPrompt currency={selectedAgreement.currency} gateway={currencyCapabilityGateway} />}

          <PaymentReadyPanel gateway={moneyGateway} agreementId={selectedAgreement.agreementId} summaryAmountMinor={selectedAgreement.summaryAmountMinor} agreementCurrency={selectedAgreement.currency ?? ''} />
          <FundingPanel gateway={paymentIntentGateway} agreementId={selectedAgreement.agreementId} />

          <div className="space-y-2">
            <p className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Agreement Money positions</p>
            {loading && positions === null && !positionsUnknown && <p role="status" className="text-sm text-sand-500">Loading Agreement Money…</p>}
            {positionsUnknown && <ErrorBanner message="Agreement Money positions couldn’t be loaded. That doesn’t mean there are none." />}
            {positions && positions.length === 0 && <p className="text-sm text-sand-600">SecurePay shows no Agreement Money for this Agreement yet.</p>}
            {positions && positions.length > 1 && selectedObligationId === null && (
              <ul className="space-y-2">
                {positions.map(p => (
                  <li key={p.obligationId ?? 'none'}>
                    <button onClick={() => setSelectedObligationId(p.obligationId)} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
                      <div className="font-medium text-forest-800">{p.obligationTitle ?? 'Untitled'}</div>
                      <div className="text-xs text-sand-600">
                        {p.established
                          ? <><MoneyValue amount={money(p.authorisedMaxAmountMinor ?? 0, p.currency ?? '')} size="sm" /> Authorised maximum</>
                          : <><MoneyValue amount={money(p.proposedAmountMinor ?? 0, p.proposedCurrency ?? '')} size="sm" /> Proposed</>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {positions && positions.length > 1 && selectedObligationId !== null && (
              <Button variant="ghost" onClick={() => setSelectedObligationId(null)} className="text-xs">← Choose a different position</Button>
            )}
            {selectedPosition && (
              <AgreementMoneyPositionCard
                position={selectedPosition}
                loading={loading}
                onRefresh={() => void readPositions(selectedAgreement.agreementId)}
                history={history}
                historyUnknown={historyUnknown}
                onLoadHistory={() => void loadHistory()}
              />
            )}
          </div>

          <ActivityPanel gateway={moneyGateway} agreementId={selectedAgreement.agreementId} />
          <ReleasePanel gateway={paymentReleaseGateway} agreementId={selectedAgreement.agreementId} currentVersionId={freshVersionId}
            onGetHelp={exception => openSupportFromRoute({ kind: 'money-exception', agreementId: selectedAgreement.agreementId, title: selectedAgreement.title, heading: exceptionHeading(exception), reason: exceptionReason(exception), requiredAction: requiredActionWords(exception.requiredAction), recordedOn: recordedOn(exception.recordedAt) })} />
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Distinct money states, each a direct backend field and never a client sum: Authorised maximum (a ceiling, not money), Funded (fundedTotalMinor),
 * Ready to progress (remainingFundedMinor), Progressed (exercisedOrSettledMinor), Returned to funder(s) (releasedTotalMinor). "Returned" is not a
 * settlement; "Progressed" is never "Settled": providerSettlementCertified is a certification gate, not transaction-specific settlement evidence in either boolean state. Payment Release is a separate lifecycle (see ReleasePanel).
 */
export function AgreementMoneyPositionCard({ position, loading, onRefresh, history, historyUnknown, onLoadHistory }: {
  position: AgreementFundedAuthorityStatusResponse;
  loading: boolean;
  onRefresh: () => void;
  history: AgreementMoneyTransactionResponse[] | null;
  historyUnknown: boolean;
  onLoadHistory: () => void;
}) {
  const currency = position.currency ?? position.proposedCurrency ?? '';

  if (!position.established) {
    return (
      <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
        <div className="font-medium text-forest-800">{position.obligationTitle}</div>
        {position.proposedAmountMinor != null && <p>Proposed: <MoneyValue amount={money(position.proposedAmountMinor, currency)} size="sm" /></p>}
        <p className="text-xs text-sand-600">No Agreement Money is set up for this yet. A proposed amount isn’t money that has been funded.</p>
        <p className="text-xs text-sand-500">Setting up Agreement Money from here is temporarily unavailable until SecurePay can show it is safely bound to the current Agreement version.</p>
      </div>
    );
  }

  const authorisedMax = position.authorisedMaxAmountMinor;
  const funded = position.fundedTotalMinor ?? 0;
  const readyToProgress = position.remainingFundedMinor ?? 0;
  const progressed = position.exercisedOrSettledMinor ?? 0;
  const returned = position.releasedTotalMinor ?? 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
        <div className="font-medium text-forest-800">{position.obligationTitle}</div>
        <div>
          <p>{authorisedMax != null ? <MoneyValue amount={money(authorisedMax, currency)} size="md" /> : 'Not shown'}</p>
          <p className="text-xs text-sand-500">Authorised maximum for this obligation. A ceiling, not money that has moved.</p>
        </div>
        <div className="pl-3 border-l-2 border-cream-300">
          <div><MoneyValue amount={money(funded, currency)} size="sm" /> Funded</div>
          <div className="text-xs text-sand-500">Funded into this position so far</div>
        </div>
        <div className="pl-3 border-l-2 border-forest-300">
          <div><MoneyValue amount={money(readyToProgress, currency)} size="sm" /> Ready to progress</div>
          <div className="text-xs text-sand-500">Funded and not yet progressed or returned</div>
          {position.beneficiaryMaskedKsNumber && <div className="text-xs text-sand-600">{position.obligationDescription} → {position.beneficiaryMaskedKsNumber}</div>}
        </div>
        <div className="text-xs text-sand-600">
          <MoneyValue amount={money(progressed, currency)} size="sm" /> Progressed within SecurePay
          {/* providerSettlementCertified is a certification/capability gate (isInternalTransferCertified), NOT proof that this progressed amount was settled
              by a provider or bank. It is deliberately never turned into settlement language for the amount. */}
          <span className="block text-sand-500">SecurePay doesn’t show a bank or provider settlement for this progressed amount here.</span>
        </div>
        <div className="text-xs text-sand-600"><MoneyValue amount={money(returned, currency)} size="sm" /> Returned to the funder(s)<span className="block text-sand-500">Returning unused money is not a settlement.</span></div>
        <div className="text-xs text-sand-500">{position.closed ? 'Closed' : 'Open'}</div>
      </div>
      <p className="text-xs text-sand-500">Funding, progressing or returning unused money from here is temporarily unavailable until SecurePay can show that it is safely bound to the current Agreement version. Nothing above was changed by this screen.</p>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onRefresh} disabled={loading} className="text-xs">Refresh</Button>
        <Button variant="ghost" onClick={onLoadHistory} disabled={loading} className="text-xs">What happened</Button>
      </div>
      {historyUnknown && <ErrorBanner message="What happened couldn’t be loaded. That doesn’t mean nothing did." />}
      {history && (
        history.length === 0 ? <p className="text-xs text-sand-600">SecurePay shows nothing has happened here yet.</p> : (
          <>
          {history.some(entry => isRecoveryEntry(entry.type)) && <p className="text-xs text-sand-500">{RECOVERY_HEADROOM_NOTE}</p>}
          <ul className="text-xs text-sand-600 space-y-1">
            {history.map(entry => (
              <li key={entry.eventId}>{new Date(entry.occurredAt).toLocaleString()} — {transactionLabel(entry.type)} {money(entry.amountMinor, entry.currency)}</li>
            ))}
          </ul>
          </>
        )
      )}
    </div>
  );
}

/** Settlement destination: self-service register/replace via the caller's own KS-derived identity (Final Completion Phase 2, Section 7). */
function SettlementDestinationSection({ gateway }: { gateway: SettlementDestinationGateway }) {
  // null = not read yet. Current and history are independent facts (see settlementDestination.ts).
  const [currentRead, setCurrentRead] = useState<CurrentRead | null>(null);
  const [historyRead, setHistoryRead] = useState<HistoryRead | null>(null);
  const current: SettlementDestinationResponse | null = currentRead?.state === 'found' ? currentRead.value : null;
  const [verification, setVerification] = useState<SettlementVerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [accountKind, setAccountKind] = useState<ExternalDestinationAccountKind>('BANK');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  // ONE explicit settlement currency drives current, history, register, replace and the post-success reload. Visible default KES; never a transport default.
  const [currency, setCurrency] = useState('KES');
  const currencyValid = /^[A-Za-z]{3}$/.test(currency);
  const scope = currency.toUpperCase();
  // One logical register/replace = one key (two for replace) + one exact request; a retry after an uncertain outcome re-sends the SAME keys.
  const [attempts] = useState(() => ({ main: createAttemptStore(), verification: createAttemptStore() }));
  const [uncertain, setUncertain] = useState(false);

  const applyScope = (read: ScopeRead) => { setCurrentRead(read.current); setHistoryRead(read.history); };
  const load = async () => {
    if (!currencyValid) return;
    setLoading(true); setError(null); setVerification(null);
    applyScope(await readSettlementScope(gateway, scope));
    setLoading(false);
  };
  /** Changing the currency changes the scope: facts read for the previous currency are cleared, never shown beside a different currency's form. */
  const changeCurrency = (value: string) => {
    if (uncertain) return; // the currency is part of the exact unresolved request
    setCurrency(value.slice(0, 3));
    setCurrentRead(null); setHistoryRead(null); setVerification(null); setError(null); setShowForm(false);
  };
  const checkVerification = async () => {
    if (!current) return;
    setLoading(true); setError(null);
    try { setVerification(await gateway.verificationStatus(current.destinationId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const submit = async (mode: 'register' | 'replace') => {
    if (!accountNumber || !beneficiaryName || !currencyValid) return;
    setLoading(true); setError(null);
    const outcome = await submitDestination(gateway, attempts, mode, { accountKind, bankCode, accountNumber, beneficiaryName, currency });
    if (outcome.kind === 'refused') setError(UNRESOLVED_ATTEMPT);
    else if (outcome.kind === 'uncertain') { setUncertain(true); setError(`${UNCERTAIN_MONEY} Trying again sends the same request, so it can’t be recorded twice.`); }
    else if (outcome.kind === 'rejected') { setUncertain(false); setError(errorText(outcome.error)); }
    else {
      setUncertain(false); setShowForm(false); setAccountNumber(''); setBeneficiaryName(''); setBankCode(''); setVerification(null);
      applyScope(outcome.scope);
    }
    setLoading(false);
  };

  return (
    <SectionCard title="Where your money goes" description="The backend derives your identity and KSNumber -- you only tell it about the account you want paid into.">
      {error && <ErrorBanner message={error} />}
      <label className="block text-xs text-sand-600">Settlement currency
        <input disabled={uncertain} value={currency} onChange={e => changeCurrency(e.target.value)} maxLength={3} autoComplete="off" aria-label="Settlement currency" className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2 text-sm uppercase" />
      </label>
      {!currencyValid && <p className="text-xs text-sand-500">Enter a three-letter currency, for example KES or USD.</p>}
      <Button variant="secondary" onClick={() => void load()} disabled={loading || uncertain || !currencyValid}>Show my {scope} settlement destination</Button>
      {currentRead?.state === 'absent' && <p className="text-sm text-sand-600">No current {scope} settlement destination is registered.</p>}
      {currentRead?.state === 'unavailable' && <ErrorBanner message="Current settlement destination couldn’t be confirmed." />}
      {current && (
        <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
          <div className="font-medium text-forest-800">{current.maskedDestinationDisplay}</div>
          <div>Status: <strong>{current.destinationStatus}</strong> · Verification: <strong>{current.verificationStatus}</strong></div>
          <Button variant="ghost" onClick={() => void checkVerification()} disabled={loading} className="mt-1 text-xs">Check verification status</Button>
        </div>
      )}
      {verification && <div className="text-xs text-sand-600">Latest verification: {verification.verificationStatus} (<MoneyValue amount={money(verification.amountMinor, verification.currency)} size="sm" />)</div>}
      {historyRead?.state === 'unavailable' && <ErrorBanner message="Settlement destination history couldn’t be loaded." />}
      {historyRead?.state === 'loaded' && historyRead.items.length > 0 && (
        <details className="text-xs text-sand-600">
          <summary className="cursor-pointer">History ({historyRead.items.length})</summary>
          <ul className="mt-2 space-y-1">{historyRead.items.map(item => <li key={item.destinationId}>{item.maskedDestinationDisplay} — {item.destinationStatus}</li>)}</ul>
        </details>
      )}
      {currentRead?.state === 'unavailable' && <p className="text-xs text-sand-500">Registering or replacing a destination isn’t offered until the current one can be confirmed.</p>}
      {!showForm ? (
        (currentRead?.state === 'found' || currentRead?.state === 'absent') && <Button variant="ghost" onClick={() => setShowForm(true)} className="text-xs">{current ? 'Replace destination' : 'Register a destination'}</Button>
      ) : (
        <div className="space-y-2 rounded-xl border border-cream-200 p-3">
          <div className="flex gap-2 text-xs">
            <button disabled={uncertain} onClick={() => setAccountKind('BANK')} className={`rounded-full px-3 py-1 ${accountKind === 'BANK' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Bank</button>
            <button disabled={uncertain} onClick={() => setAccountKind('MOBILE_MONEY')} className={`rounded-full px-3 py-1 ${accountKind === 'MOBILE_MONEY' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Mobile money</button>
          </div>
          {accountKind === 'BANK' && (
            <input disabled={uncertain} value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="Bank code" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          )}
          <input disabled={uncertain} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          <input disabled={uncertain} value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)} placeholder="Name on the account" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <Button onClick={() => void submit(current ? 'replace' : 'register')} disabled={loading || !accountNumber || !beneficiaryName || !currencyValid}>
              {uncertain ? 'Try the same request again' : current ? 'Replace' : 'Register'}
            </Button>
            {uncertain
              ? <p className="text-xs text-sand-600 self-center">This request is kept exactly as sent until SecurePay confirms the outcome.</p>
              : <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function humanizeCapability(capability: string): string {
  return capability.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

/**
 * Financial Partner Hall (Phase 3, Sections 14-16): a dignified place to see which regulated
 * partners SecurePay works with and what they factually support -- not a promotional marketplace.
 * Every field shown (currency, limits, fee description) comes straight from
 * RegulatedPartnerResponse; nothing here is invented, ranked, or recommended. Choice is the
 * backbone BaaS provider; the architecture remains provider-neutral.
 */
function FinancialPartnersSection({ gateway }: { gateway: FinancialPartnerGateway }) {
  const [partners, setPartners] = useState<RegulatedPartnerResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setPartners(await gateway.list()); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  return (
    <SectionCard title="Financial partners" description="Regulated partners SecurePay works with, and what they factually support. This is information, not a recommendation.">
      {error && <ErrorBanner message={error} />}
      {!partners ? (
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>Show partners</Button>
      ) : partners.length === 0 ? (
        <p className="text-sm text-sand-600">No financial partners are currently listed.</p>
      ) : (
        <ul className="space-y-3">
          {partners.map(partner => (
            <li key={partner.id} className="rounded-xl border border-cream-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-forest-800">{partner.displayName}</div>
                  <div className="text-xs text-sand-500">{partner.partnerType} · {partner.environment}</div>
                </div>
                <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide shrink-0">{partner.status}</span>
              </div>
              {partner.capabilities.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-cream-100 pt-2">
                  {partner.capabilities.map(c => (
                    <li key={c.capability} className="text-xs text-sand-700">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-forest-800">{humanizeCapability(c.capability)}</span>
                        {!c.enabled && <span className="text-sand-400">Not currently available</span>}
                      </div>
                      {c.enabled && (
                        <div className="text-sand-600 mt-0.5">
                          {c.currency}
                          {(c.minAmountMinor != null || c.maxAmountMinor != null) && (
                            <>
                              {' · '}
                              {c.minAmountMinor != null && <>Min <MoneyValue amount={money(c.minAmountMinor, c.currency)} size="sm" /></>}
                              {c.minAmountMinor != null && c.maxAmountMinor != null && ' · '}
                              {c.maxAmountMinor != null && <>Max <MoneyValue amount={money(c.maxAmountMinor, c.currency)} size="sm" /></>}
                            </>
                          )}
                          {c.feeDescription && <> · {c.feeDescription}</>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
