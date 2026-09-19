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
import type { MoneySessionGateway } from '../../api/securepay/money-session';
import type { PaymentIntentGateway } from '../../api/securepay/payment-intent';
import type { CurrencyCapabilityGateway } from '../../api/securepay/currency-capability';
import type { FxApplicationGateway } from '../../api/securepay/fx-application';
import type { RegulatedAccountsGateway } from '../../api/securepay/regulated-accounts';
import type { BusinessCurrencyCapabilityGateway } from '../../api/securepay/business-currency-capability';
import type { BusinessFxApplicationGateway } from '../../api/securepay/business-fx-application';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { PaymentIntentFundingSection } from './PaymentIntentFunding';
import { CurrencyCapabilitySection } from './CurrencyCapabilitySection';
import { AgreementCurrencyActivationPrompt } from './AgreementCurrencyActivationPrompt';
import { FxConversionSection } from './FxConversionSection';
import { BusinessCurrencyCapabilitySection } from './BusinessCurrencyCapabilitySection';
import { BusinessFxConversionSection } from './BusinessFxConversionSection';

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/** Final Completion Phase 2 completion pass, Section 7 -- a reversal never rewrites the original Progressed entry; it appears as its own, later, distinct line. */
function transactionLabel(type: AgreementMoneyTransactionResponse['type']): string {
  switch (type) {
    case 'FUNDED': return 'Protected';
    case 'PROGRESSED': return 'Progressed';
    case 'RELEASED': return 'Returned';
    case 'REQUESTED': return 'Reversal requested for';
    case 'RECOVERY_PENDING': return 'Reversal recovery pending for';
    case 'RECOVERY_COMPLETED': return 'Reversal recovered for';
    case 'RECOVERY_FAILED': return 'Reversal recovery failed for';
  }
}

export interface MoneyGateways {
  moneyAuthority: MoneyAuthorityGateway;
  financialPartners: FinancialPartnerGateway;
  settlementDestinations: SettlementDestinationGateway;
  agreements: AgreementGateway;
  moneySession: MoneySessionGateway;
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
          sessionGateway={gateways.moneySession}
          paymentIntentGateway={gateways.paymentIntent}
          currencyCapabilityGateway={gateways.currencyCapability}
          initialAgreement={jumpAgreement}
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
 * Agreement Money (customer-facing name; "Funded Authority" is the internal/API term -- see
 * AgreementFundedAuthorityOrchestrationService). Final Completion Phase 2 completion pass,
 * Section 1: an Agreement is not permanently one Agreement Money position -- every MONETARY
 * obligation gets its own independent position, listed here and acted on individually. Section 2:
 * a 409 while progressing may honestly mean the caller is not this position's payer or a valid
 * delegate; it is shown as-is, never silently retried or hidden. Section 6: providerSettlementCertified
 * is always false in this environment, so progressed money is always described as "Progressed
 * within SecurePay," never "Settled."
 */
function AgreementMoneySection({ authorityGateway, agreementGateway, sessionGateway, paymentIntentGateway, currencyCapabilityGateway, initialAgreement }: {
  authorityGateway: MoneyAuthorityGateway;
  agreementGateway: AgreementGateway;
  sessionGateway: MoneySessionGateway;
  paymentIntentGateway: PaymentIntentGateway;
  currencyCapabilityGateway: CurrencyCapabilityGateway;
  /** Phase 3 Money Home (Section 11) -- a "Needs your attention" item there jumps straight into
   * this exact Agreement's own position, instead of making the person re-find it in the picker. */
  initialAgreement?: CurrentUserAgreementSummaryResponse | null;
}) {
  const [agreements, setAgreements] = useState<CurrentUserAgreementSummaryResponse[] | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<CurrentUserAgreementSummaryResponse | null>(null);
  const [positions, setPositions] = useState<AgreementFundedAuthorityStatusResponse[] | null>(null);
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [progressAmount, setProgressAmount] = useState('');
  const [history, setHistory] = useState<AgreementMoneyTransactionResponse[] | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPosition = positions?.find(p => p.obligationId === selectedObligationId) ?? null;

  const loadAgreements = async () => {
    setLoading(true); setError(null);
    try { setAgreements((await agreementGateway.currentUserAgreements()).items); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const selectAgreement = async (agreement: CurrentUserAgreementSummaryResponse) => {
    setSelectedAgreement(agreement);
    setPositions(null);
    setSelectedObligationId(null);
    setHistory(null);
    setShareableLink(null);
    setSuccessMessage(null);
    setLoading(true); setError(null);
    try {
      const list = await authorityGateway.list(agreement.agreementId);
      setPositions(list.positions);
      if (list.positions.length === 1) setSelectedObligationId(list.positions[0].obligationId);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialAgreement) void selectAgreement(initialAgreement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgreement?.agreementId]);

  const refreshPositions = async () => {
    if (!selectedAgreement) return;
    setLoading(true); setError(null);
    try { setPositions((await authorityGateway.list(selectedAgreement.agreementId)).positions); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const withObligation = async (action: (agreementId: string, obligationId: string) => Promise<void>) => {
    if (!selectedAgreement || !selectedObligationId) return;
    setLoading(true); setError(null); setSuccessMessage(null);
    try { await action(selectedAgreement.agreementId, selectedObligationId); await refreshPositions(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  // Phase 3 Money World (Section 32): a successful money action explains what changed, in terms of
  // the Agreement it belongs to -- never just "Success." The amount/currency named here is always
  // the one the person just submitted or that the backend's own release response returned, never a
  // recomputed total.
  const protect = () => withObligation(async (a, o) => {
    // Final Phase 3 correction (Sections 12/18): open() establishes the Agreement Money authority
    // (the authorised ceiling) for this obligation -- it does not itself move or fund any money.
    // The success message must describe that exact transition, never imply money moved.
    await authorityGateway.open(a, o);
    setSuccessMessage(`Agreement Money is ready for funding for ${selectedAgreement?.title ?? 'this Agreement'}.`);
  });
  const fund = () => withObligation(async (a, o) => {
    if (!fundAmount) return;
    const amountMinor = Math.round(Number(fundAmount) * 100);
    const currency = selectedPosition?.currency ?? selectedPosition?.proposedCurrency ?? '';
    await authorityGateway.fund(a, o, amountMinor);
    setFundAmount('');
    setSuccessMessage(`${money(amountMinor, currency)} is now protected for ${selectedAgreement?.title ?? 'this Agreement'}.`);
  });
  const progress = () => withObligation(async (a, o) => {
    if (!progressAmount) return;
    const amountMinor = Math.round(Number(progressAmount) * 100);
    const currency = selectedPosition?.currency ?? selectedPosition?.proposedCurrency ?? '';
    await authorityGateway.exercise(a, o, amountMinor);
    setProgressAmount('');
    setSuccessMessage(`${money(amountMinor, currency)} has been progressed within SecurePay for ${selectedAgreement?.title ?? 'this Agreement'}.`);
  });
  const releaseUnused = () => withObligation(async (a, o) => {
    // Deep-review correction (Section 18): release() returns unexercised funded money to the
    // rightful funder(s) and closes that lifecycle -- it must never read as if the money simply
    // became generic available balance.
    const response = await authorityGateway.release(a, o);
    setSuccessMessage(`${money(response.releasedTotalMinor, selectedPosition?.currency ?? selectedPosition?.proposedCurrency ?? '')} has been released back to the funder(s) for ${selectedAgreement?.title ?? 'this Agreement'}.`);
  });

  const loadHistory = async () => {
    if (!selectedAgreement || !selectedObligationId) return;
    setLoading(true); setError(null);
    try { setHistory(await authorityGateway.transactions(selectedAgreement.agreementId, selectedObligationId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const getShareableLink = async () => {
    if (!selectedAgreement || !selectedObligationId || !selectedPosition?.remainingFundedMinor) return;
    setLoading(true); setError(null);
    try {
      const created = await sessionGateway.create({
        agreementId: selectedAgreement.agreementId,
        obligationId: selectedObligationId,
        purpose: 'EXERCISE',
        amountMinorCap: selectedPosition.remainingFundedMinor,
      });
      setShareableLink(`${window.location.origin}/#/money-session/${created.token}`);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  return (
    <SectionCard title="Agreement Money" description="Money already authorised under one of your own Agreements. Nothing here is calculated by this screen.">
      {error && <ErrorBanner message={error} />}
      {!agreements ? (
        <Button variant="secondary" onClick={() => void loadAgreements()} disabled={loading}>Show my Agreements</Button>
      ) : selectedAgreement === null ? (
        agreements.length === 0 ? (
          <p className="text-sm text-sand-600">You have no Agreements yet.</p>
        ) : (
          <ul className="space-y-2">
            {agreements.map(agreement => (
              <li key={agreement.agreementId}>
                <button onClick={() => void selectAgreement(agreement)} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
                  <div className="font-medium text-forest-800">{agreement.title}</div>
                  <div className="text-xs text-sand-600">{agreement.purpose}{agreement.counterparty?.ksNumber ? ` · ${agreement.counterparty.ksNumber}` : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" onClick={() => { setSelectedAgreement(null); setPositions(null); setSelectedObligationId(null); }} className="text-xs">← Choose a different Agreement</Button>
          <div className="text-sm text-forest-800 font-medium">{selectedAgreement.title} <span className="text-xs text-sand-500">({selectedAgreement.currency})</span></div>

          <AgreementCurrencyActivationPrompt currency={selectedAgreement.currency} gateway={currencyCapabilityGateway} />

          <PaymentIntentFundingSection
            agreementId={selectedAgreement.agreementId}
            gateway={paymentIntentGateway}
            onFunded={() => void refreshPositions()}
          />
          {/* Phase 3 Money World (Section 5/7): two distinct, non-duplicate steps -- above brings new
              money into this Agreement from a real payment method; below allocates money that is
              already available to a specific position. Explained once, here, so it never reads as
              two competing "add money" mechanisms. */}
          <p className="text-xs text-sand-500">Once money is brought in above, protect and progress it against a specific position below.</p>

          {positions && positions.length === 0 && <p className="text-sm text-sand-600">This Agreement has no Agreement Money yet.</p>}

          {positions && positions.length > 1 && selectedObligationId === null && (
            <ul className="space-y-2">
              {positions.map(p => (
                <li key={p.obligationId ?? 'none'}>
                  <button onClick={() => setSelectedObligationId(p.obligationId)} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
                    <div className="font-medium text-forest-800">{p.obligationTitle ?? 'Untitled'}</div>
                    {/* Final Phase 3 correction (Section 22): neither a proposed amount nor an
                        authorised ceiling is protected (funded) money -- label each honestly. */}
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
            <Button variant="ghost" onClick={() => setSelectedObligationId(null)} className="text-xs">← Choose a different Agreement Money position</Button>
          )}

          {selectedPosition && (
            <AgreementMoneyPositionCard
              position={selectedPosition}
              loading={loading}
              fundAmount={fundAmount}
              progressAmount={progressAmount}
              onFundAmountChange={setFundAmount}
              onProgressAmountChange={setProgressAmount}
              onProtect={() => void protect()}
              onFund={() => void fund()}
              onProgress={() => void progress()}
              onReleaseUnused={() => void releaseUnused()}
              onRefresh={() => void refreshPositions()}
              history={history}
              onLoadHistory={() => void loadHistory()}
              shareableLink={shareableLink}
              onGetShareableLink={() => void getShareableLink()}
              successMessage={successMessage}
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Customer state language (Section 3, corrected by the final Phase 3 semantics pass): "Authorised
 * maximum" (the ceiling -- never itself funded/moved money, never labelled "protected"),
 * "Funded / protected" (fundedTotalMinor -- money actually funded so far), "Ready to progress"
 * (remainingFundedMinor -- funded, not yet progressed or released), "Progressed" (exercisedOrSettledMinor),
 * "Released" (releasedTotalMinor, back to the funder(s)). Never "Settled" while
 * providerSettlementCertified is false. A previous, separate derived figure (the gap between the
 * authorised ceiling and what had actually been funded) was a frontend-invented financial category
 * and has been removed outright, not relabelled.
 */
function AgreementMoneyPositionCard({
  position, loading, fundAmount, progressAmount, onFundAmountChange, onProgressAmountChange,
  onProtect, onFund, onProgress, onReleaseUnused, onRefresh, history, onLoadHistory, shareableLink, onGetShareableLink, successMessage,
}: {
  position: AgreementFundedAuthorityStatusResponse;
  loading: boolean;
  fundAmount: string;
  progressAmount: string;
  onFundAmountChange: (value: string) => void;
  onProgressAmountChange: (value: string) => void;
  onProtect: () => void;
  onFund: () => void;
  onProgress: () => void;
  onReleaseUnused: () => void;
  onRefresh: () => void;
  history: AgreementMoneyTransactionResponse[] | null;
  onLoadHistory: () => void;
  shareableLink: string | null;
  onGetShareableLink: () => void;
  successMessage: string | null;
}) {
  const currency = position.currency ?? position.proposedCurrency ?? '';

  if (!position.established) {
    return (
      <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
        <div className="font-medium text-forest-800">{position.obligationTitle}</div>
        {/* Deep-review correction (Section 19): a proposed amount is not yet protected money --
            it must never carry the same "protected" word as an established position's real total. */}
        {position.proposedAmountMinor != null && <p>Proposed: <MoneyValue amount={money(position.proposedAmountMinor, currency)} size="sm" /></p>}
        <p className="text-xs text-sand-600">Not yet protected{position.reasonCode ? ` (${position.reasonCode})` : ''}.</p>
        {/* Final Phase 3 correction (Section 12): open() only establishes the Agreement Money
            authority for this obligation -- it does not fund or protect any money -- so the CTA
            must not claim it will "protect this money." */}
        <Button onClick={onProtect} disabled={loading}>Set up Agreement Money</Button>
      </div>
    );
  }

  /*
   * Final Phase 3 correction (Sections 6/7/11): every figure below is a direct backend field, with
   * no third, client-derived financial category. `authorisedMaxAmountMinor` is only an authorised
   * ceiling -- it has never itself moved and is never labelled "protected." `fundedTotalMinor` is
   * the money that has actually been funded, so "protected" (matching this codebase's own
   * transaction-history label, FUNDED -> "Protected") attaches there instead. The previous derived
   * figure (authorisedMax - fundedTotal, labelled as if it were its own protected state) has been
   * removed outright -- it was a frontend-invented financial category the backend does not establish.
   */
  const authorisedMax = position.authorisedMaxAmountMinor ?? 0;
  const funded = position.fundedTotalMinor ?? 0;
  const readyToProgress = position.remainingFundedMinor ?? 0;
  const progressed = position.exercisedOrSettledMinor ?? 0;
  const released = position.releasedTotalMinor ?? 0;

  return (
    <div className="space-y-3">
      {successMessage && <StatusNotice tone="success" icon={false}>{successMessage}</StatusNotice>}
      <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
        <div className="font-medium text-forest-800">{position.obligationTitle}</div>
        <div>
          <p><MoneyValue amount={money(authorisedMax, currency)} size="md" /></p>
          <p className="text-xs text-sand-500">Authorised maximum for this obligation</p>
        </div>
        {funded > 0 && (
          <div className="pl-3 border-l-2 border-cream-300">
            <div><MoneyValue amount={money(funded, currency)} size="sm" /> Funded / protected</div>
            <div className="text-xs text-sand-500">Actually funded into this position so far</div>
          </div>
        )}
        {readyToProgress > 0 && (
          <div className="pl-3 border-l-2 border-forest-300">
            <div><MoneyValue amount={money(readyToProgress, currency)} size="sm" /> <span className="text-forest-700 font-medium">Ready to progress</span></div>
            <div className="text-xs text-sand-500">Funded, not yet progressed or released</div>
            {position.beneficiaryMaskedKsNumber && <div className="text-xs text-sand-600">{position.obligationDescription} → {position.beneficiaryMaskedKsNumber}</div>}
          </div>
        )}
        {progressed > 0 && (
          <div className="text-xs text-sand-600">
            <MoneyValue amount={money(progressed, currency)} size="sm" /> Progressed within SecurePay
            {!position.providerSettlementCertified && ' (pending certified bank transfer -- never shown as Settled)'}
          </div>
        )}
        {released > 0 && <div className="text-xs text-sand-600"><MoneyValue amount={money(released, currency)} size="sm" /> Released back to the funder(s)</div>}
        <div className="text-xs text-sand-500">{position.closed ? 'Closed' : 'Open'}</div>
      </div>
      {!position.closed && (
        <>
          <div className="flex gap-2">
            <input value={fundAmount} onChange={e => onFundAmountChange(e.target.value)} placeholder="Amount to protect" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
            <Button onClick={onFund} disabled={loading || !fundAmount}>Add money</Button>
          </div>
          <div className="flex gap-2">
            <input value={progressAmount} onChange={e => onProgressAmountChange(e.target.value)} placeholder="Amount to progress" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
            <Button onClick={onProgress} disabled={loading || !progressAmount}>Progress to {position.beneficiaryMaskedKsNumber ?? 'beneficiary'}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onReleaseUnused} disabled={loading}>Release unused money</Button>
            {readyToProgress > 0 && (
              <Button variant="secondary" onClick={onGetShareableLink} disabled={loading}>Get a shareable link</Button>
            )}
          </div>
        </>
      )}
      {shareableLink && (
        <p className="text-xs text-sand-600 break-all">Hosted link (opens the same real progress action): {shareableLink}</p>
      )}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onRefresh} disabled={loading} className="text-xs">Refresh</Button>
        <Button variant="ghost" onClick={onLoadHistory} disabled={loading} className="text-xs">What happened</Button>
      </div>
      {history && (
        history.length === 0 ? <p className="text-xs text-sand-600">Nothing has happened yet.</p> : (
          <ul className="text-xs text-sand-600 space-y-1">
            {history.map(entry => (
              <li key={entry.eventId}>
                {new Date(entry.occurredAt).toLocaleString()} — {transactionLabel(entry.type)} {money(entry.amountMinor, entry.currency)}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/** Settlement destination: self-service register/replace via the caller's own KS-derived identity (Final Completion Phase 2, Section 7). */
function SettlementDestinationSection({ gateway }: { gateway: SettlementDestinationGateway }) {
  const [current, setCurrent] = useState<SettlementDestinationResponse | null>(null);
  const [history, setHistory] = useState<SettlementDestinationResponse[] | null>(null);
  const [verification, setVerification] = useState<SettlementVerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [accountKind, setAccountKind] = useState<ExternalDestinationAccountKind>('BANK');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');

  const load = async () => {
    setLoading(true); setError(null); setNotFound(false); setVerification(null);
    try {
      const [currentDestination, destinationHistory] = await Promise.all([gateway.current(), gateway.history()]);
      setCurrent(currentDestination);
      setHistory(destinationHistory);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) { setCurrent(null); setHistory([]); setNotFound(true); }
      else setError(errorText(cause));
    } finally { setLoading(false); }
  };
  const checkVerification = async () => {
    if (!current) return;
    setLoading(true); setError(null);
    try { setVerification(await gateway.verificationStatus(current.destinationId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const submit = async (mode: 'register' | 'replace') => {
    if (!accountNumber || !beneficiaryName) return;
    setLoading(true); setError(null);
    try {
      const request = { destinationType: 'PRIMARY_SETTLEMENT' as const, currency: 'KES', accountKind, bankCode: accountKind === 'BANK' ? bankCode : null, accountNumber, beneficiaryName };
      if (mode === 'register') setCurrent(await gateway.register(request));
      else await gateway.replace(request);
      setShowForm(false); setAccountNumber(''); setBeneficiaryName(''); setBankCode('');
      await load();
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  return (
    <SectionCard title="Where your money goes" description="The backend derives your identity and KSNumber -- you only tell it about the account you want paid into.">
      {error && <ErrorBanner message={error} />}
      <Button variant="secondary" onClick={() => void load()} disabled={loading}>Show my settlement destination</Button>
      {notFound && <p className="text-sm text-sand-600">No settlement destination is registered yet.</p>}
      {current && (
        <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
          <div className="font-medium text-forest-800">{current.maskedDestinationDisplay}</div>
          <div>Status: <strong>{current.destinationStatus}</strong> · Verification: <strong>{current.verificationStatus}</strong></div>
          <Button variant="ghost" onClick={() => void checkVerification()} disabled={loading} className="mt-1 text-xs">Check verification status</Button>
        </div>
      )}
      {verification && <div className="text-xs text-sand-600">Latest verification: {verification.verificationStatus} (<MoneyValue amount={money(verification.amountMinor, verification.currency)} size="sm" />)</div>}
      {history && history.length > 0 && (
        <details className="text-xs text-sand-600">
          <summary className="cursor-pointer">History ({history.length})</summary>
          <ul className="mt-2 space-y-1">{history.map(item => <li key={item.destinationId}>{item.maskedDestinationDisplay} — {item.destinationStatus}</li>)}</ul>
        </details>
      )}
      {!showForm ? (
        <Button variant="ghost" onClick={() => setShowForm(true)} className="text-xs">{current ? 'Replace destination' : 'Register a destination'}</Button>
      ) : (
        <div className="space-y-2 rounded-xl border border-cream-200 p-3">
          <div className="flex gap-2 text-xs">
            <button onClick={() => setAccountKind('BANK')} className={`rounded-full px-3 py-1 ${accountKind === 'BANK' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Bank</button>
            <button onClick={() => setAccountKind('MOBILE_MONEY')} className={`rounded-full px-3 py-1 ${accountKind === 'MOBILE_MONEY' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Mobile money</button>
          </div>
          {accountKind === 'BANK' && (
            <input value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="Bank code" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          )}
          <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          <input value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)} placeholder="Name on the account" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <Button onClick={() => void submit(current ? 'replace' : 'register')} disabled={loading || !accountNumber || !beneficiaryName}>
              {current ? 'Replace' : 'Register'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
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
