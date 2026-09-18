import { useState, useSyncExternalStore } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
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
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { PaymentIntentFundingSection } from './PaymentIntentFunding';
import { CurrencyCapabilitySection } from './CurrencyCapabilitySection';
import { AgreementCurrencyActivationPrompt } from './AgreementCurrencyActivationPrompt';
import { FxConversionSection } from './FxConversionSection';

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

  if (sessionState.status !== 'signed-in') {
    const data = secureAuthView(identityState);
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col">
        <MoneyHeader onBack={onLeave} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-4">
            <div className="text-center">
              <h1 className="font-display text-2xl text-forest-800">SecurePay Money</h1>
              <p className="mt-2 text-sm text-sand-600">Sign in to see what money you have, what it is allowed to do, and what has happened.</p>
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
        <div>
          <h1 className="font-display text-2xl text-forest-800">Money</h1>
          <p className="mt-1 text-sm text-sand-600">What money you have, what it is allowed to do, and what has happened. Nothing here is calculated by this screen.</p>
        </div>
        <AgreementMoneySection
          authorityGateway={gateways.moneyAuthority}
          agreementGateway={gateways.agreements}
          sessionGateway={gateways.moneySession}
          paymentIntentGateway={gateways.paymentIntent}
          currencyCapabilityGateway={gateways.currencyCapability}
        />
        <CurrencyCapabilitySection gateway={gateways.currencyCapability} />
        <FxConversionSection regulatedAccountsGateway={gateways.regulatedAccounts} fxApplicationGateway={gateways.fxApplication} />
        <SettlementDestinationSection gateway={gateways.settlementDestinations} />
        <FinancialPartnersSection gateway={gateways.financialPartners} />
      </div>
    </div>
  );
}

function MoneyHeader({ onBack }: { onBack: () => void }) {
  return <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between"><button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back</button><img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" /></header>;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50">
        <h2 className="font-display text-lg text-forest-800">{title}</h2>
        <p className="mt-1 text-xs text-sand-600">{description}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-sand-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {message}</div>;
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
function AgreementMoneySection({ authorityGateway, agreementGateway, sessionGateway, paymentIntentGateway, currencyCapabilityGateway }: {
  authorityGateway: MoneyAuthorityGateway;
  agreementGateway: AgreementGateway;
  sessionGateway: MoneySessionGateway;
  paymentIntentGateway: PaymentIntentGateway;
  currencyCapabilityGateway: CurrencyCapabilityGateway;
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
    setLoading(true); setError(null);
    try {
      const list = await authorityGateway.list(agreement.agreementId);
      setPositions(list.positions);
      if (list.positions.length === 1) setSelectedObligationId(list.positions[0].obligationId);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const refreshPositions = async () => {
    if (!selectedAgreement) return;
    setLoading(true); setError(null);
    try { setPositions((await authorityGateway.list(selectedAgreement.agreementId)).positions); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const withObligation = async (action: (agreementId: string, obligationId: string) => Promise<void>) => {
    if (!selectedAgreement || !selectedObligationId) return;
    setLoading(true); setError(null);
    try { await action(selectedAgreement.agreementId, selectedObligationId); await refreshPositions(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const protect = () => withObligation(async (a, o) => { await authorityGateway.open(a, o); });
  const fund = () => withObligation(async (a, o) => {
    if (!fundAmount) return;
    await authorityGateway.fund(a, o, Math.round(Number(fundAmount) * 100));
    setFundAmount('');
  });
  const progress = () => withObligation(async (a, o) => {
    if (!progressAmount) return;
    await authorityGateway.exercise(a, o, Math.round(Number(progressAmount) * 100));
    setProgressAmount('');
  });
  const releaseUnused = () => withObligation(async (a, o) => { await authorityGateway.release(a, o); });

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
        <button onClick={() => void loadAgreements()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Show my Agreements</button>
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
          <button onClick={() => { setSelectedAgreement(null); setPositions(null); setSelectedObligationId(null); }} className="text-xs text-sand-600 underline">← Choose a different Agreement</button>
          <div className="text-sm text-forest-800 font-medium">{selectedAgreement.title} <span className="text-xs text-sand-500">({selectedAgreement.currency})</span></div>

          <AgreementCurrencyActivationPrompt currency={selectedAgreement.currency} gateway={currencyCapabilityGateway} />

          <PaymentIntentFundingSection
            agreementId={selectedAgreement.agreementId}
            gateway={paymentIntentGateway}
            onFunded={() => void refreshPositions()}
          />

          {positions && positions.length === 0 && <p className="text-sm text-sand-600">This Agreement has no Agreement Money yet.</p>}

          {positions && positions.length > 1 && selectedObligationId === null && (
            <ul className="space-y-2">
              {positions.map(p => (
                <li key={p.obligationId ?? 'none'}>
                  <button onClick={() => setSelectedObligationId(p.obligationId)} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
                    <div className="font-medium text-forest-800">{p.obligationTitle ?? 'Untitled'}</div>
                    <div className="text-xs text-sand-600">{money(p.proposedAmountMinor ?? p.authorisedMaxAmountMinor ?? 0, p.proposedCurrency ?? p.currency ?? '')} protected</div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {positions && positions.length > 1 && selectedObligationId !== null && (
            <button onClick={() => setSelectedObligationId(null)} className="text-xs text-sand-600 underline">← Choose a different Agreement Money position</button>
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
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Customer state language (Section 3): "protected" (the total Agreement Money ceiling),
 * "Ready to progress" (funded and available), "Still protected" (authorised but not yet funded),
 * "Progressed" (already moved), "Returned" (released back to the funder(s)). Never "Settled"
 * while providerSettlementCertified is false.
 */
function AgreementMoneyPositionCard({
  position, loading, fundAmount, progressAmount, onFundAmountChange, onProgressAmountChange,
  onProtect, onFund, onProgress, onReleaseUnused, onRefresh, history, onLoadHistory, shareableLink, onGetShareableLink,
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
}) {
  const currency = position.currency ?? position.proposedCurrency ?? '';

  if (!position.established) {
    return (
      <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
        <div className="font-medium text-forest-800">{position.obligationTitle}</div>
        {position.proposedAmountMinor != null && <p>{money(position.proposedAmountMinor, currency)} protected</p>}
        <p className="text-xs text-sand-600">Not yet protected{position.reasonCode ? ` (${position.reasonCode})` : ''}.</p>
        <button onClick={onProtect} disabled={loading} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Protect this money</button>
      </div>
    );
  }

  const totalProtected = position.authorisedMaxAmountMinor ?? 0;
  const readyToProgress = position.remainingFundedMinor ?? 0;
  const stillProtected = Math.max(0, totalProtected - (position.fundedTotalMinor ?? 0));
  const progressed = position.exercisedOrSettledMinor ?? 0;
  const returned = position.releasedTotalMinor ?? 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
        <div className="font-medium text-forest-800">{position.obligationTitle}</div>
        <p>{money(totalProtected, currency)} protected</p>
        {readyToProgress > 0 && (
          <div className="pl-3 border-l-2 border-forest-300">
            <div>{money(readyToProgress, currency)} <span className="text-forest-700 font-medium">Ready to progress</span></div>
            {position.beneficiaryMaskedKsNumber && <div className="text-xs text-sand-600">{position.obligationDescription} → {position.beneficiaryMaskedKsNumber}</div>}
          </div>
        )}
        {stillProtected > 0 && <div className="pl-3 border-l-2 border-cream-300">{money(stillProtected, currency)} Still protected</div>}
        {progressed > 0 && (
          <div className="text-xs text-sand-600">
            {money(progressed, currency)} Progressed within SecurePay
            {!position.providerSettlementCertified && ' (pending certified bank transfer -- never shown as Settled)'}
          </div>
        )}
        {returned > 0 && <div className="text-xs text-sand-600">{money(returned, currency)} Returned</div>}
        <div className="text-xs text-sand-500">{position.closed ? 'Closed' : 'Open'}</div>
      </div>
      {!position.closed && (
        <>
          <div className="flex gap-2">
            <input value={fundAmount} onChange={e => onFundAmountChange(e.target.value)} placeholder="Amount to protect" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
            <button onClick={onFund} disabled={loading || !fundAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add money</button>
          </div>
          <div className="flex gap-2">
            <input value={progressAmount} onChange={e => onProgressAmountChange(e.target.value)} placeholder="Amount to progress" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
            <button onClick={onProgress} disabled={loading || !progressAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Progress to {position.beneficiaryMaskedKsNumber ?? 'beneficiary'}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onReleaseUnused} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Release unused money</button>
            {readyToProgress > 0 && (
              <button onClick={onGetShareableLink} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Get a shareable link</button>
            )}
          </div>
        </>
      )}
      {shareableLink && (
        <p className="text-xs text-sand-600 break-all">Hosted link (opens the same real progress action): {shareableLink}</p>
      )}
      <div className="flex gap-3">
        <button onClick={onRefresh} disabled={loading} className="text-xs text-sand-600 underline">Refresh</button>
        <button onClick={onLoadHistory} disabled={loading} className="text-xs text-sand-600 underline">What happened</button>
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
    <SectionCard title="Settlement destination" description="Where an Agreement's money settles. The backend derives your identity and KSNumber -- you only tell it about the account you want paid into.">
      {error && <ErrorBanner message={error} />}
      <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Show my settlement destination</button>
      {notFound && <p className="text-sm text-sand-600">No settlement destination is registered yet.</p>}
      {current && (
        <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
          <div>{current.maskedDestinationDisplay}</div>
          <div>Status: <strong>{current.destinationStatus}</strong> · Verification: <strong>{current.verificationStatus}</strong></div>
          <button onClick={() => void checkVerification()} disabled={loading} className="mt-1 text-xs text-forest-700 underline">Check verification status</button>
        </div>
      )}
      {verification && <div className="text-xs text-sand-600">Latest verification: {verification.verificationStatus} ({money(verification.amountMinor, verification.currency)})</div>}
      {history && history.length > 0 && (
        <details className="text-xs text-sand-600">
          <summary className="cursor-pointer">History ({history.length})</summary>
          <ul className="mt-2 space-y-1">{history.map(item => <li key={item.destinationId}>{item.maskedDestinationDisplay} — {item.destinationStatus}</li>)}</ul>
        </details>
      )}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="text-xs text-forest-700 underline">{current ? 'Replace destination' : 'Register a destination'}</button>
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
            <button onClick={() => void submit(current ? 'replace' : 'register')} disabled={loading || !accountNumber || !beneficiaryName} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {current ? 'Replace' : 'Register'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-sand-600 underline">Cancel</button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/** Financial Partners: factual discovery only. Choice is the backbone BaaS provider; the architecture remains provider-neutral. */
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
    <SectionCard title="Financial partners" description="Regulated partners SecurePay works with, and what they factually support.">
      {error && <ErrorBanner message={error} />}
      {!partners ? (
        <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Show partners</button>
      ) : (
        <ul className="space-y-3">
          {partners.map(partner => (
            <li key={partner.id} className="rounded-xl border border-cream-200 p-3">
              <div className="font-medium text-forest-800">{partner.displayName}</div>
              <div className="text-xs text-sand-600">{partner.partnerType} · {partner.environment} · {partner.status}</div>
              {partner.capabilities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {partner.capabilities.map(c => (
                    <span key={c.capability} className="rounded-full bg-cream-100 px-2 py-0.5 text-xs text-sand-700">{c.capability}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
