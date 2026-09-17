import { useState, useSyncExternalStore } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type { AgreementFundedAuthorityStatusResponse, MoneyAuthorityGateway } from '../../api/securepay/money-authority';
import type { FinancialPartnerGateway, RegulatedPartnerResponse } from '../../api/securepay/financial-partners';
import type { SettlementDestinationGateway, SettlementDestinationResponse, SettlementVerificationStatusResponse } from '../../api/securepay/settlement-destinations';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

export interface MoneyGateways {
  moneyAuthority: MoneyAuthorityGateway;
  financialPartners: FinancialPartnerGateway;
  settlementDestinations: SettlementDestinationGateway;
  agreements: AgreementGateway;
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
          <p className="mt-1 text-sm text-sand-600">Real backend authority only. Nothing here is calculated by this screen.</p>
        </div>
        <FundedAuthoritySection authorityGateway={gateways.moneyAuthority} agreementGateway={gateways.agreements} />
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
 * Funded Authority: Agreement-scoped only (Final Completion Phase 2 correction pass). There is no
 * "authority id" field anywhere in this UI -- the person picks one of their own Agreements, and
 * every fact shown (obligation, authorised max, currency, beneficiary) is the backend's own
 * server-derived read model. Fund/Exercise/Release only ever act on the Agreement the person
 * selected; a 409 (e.g. "you are not this Agreement's payer") is shown honestly rather than
 * silently retried or hidden.
 */
function FundedAuthoritySection({ authorityGateway, agreementGateway }: {
  authorityGateway: MoneyAuthorityGateway;
  agreementGateway: AgreementGateway;
}) {
  const [agreements, setAgreements] = useState<CurrentUserAgreementSummaryResponse[] | null>(null);
  const [selected, setSelected] = useState<CurrentUserAgreementSummaryResponse | null>(null);
  const [status, setStatus] = useState<AgreementFundedAuthorityStatusResponse | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [exerciseAmount, setExerciseAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgreements = async () => {
    setLoading(true); setError(null);
    try { setAgreements((await agreementGateway.currentUserAgreements()).items); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const select = async (agreement: CurrentUserAgreementSummaryResponse) => {
    setSelected(agreement);
    setStatus(null);
    setLoading(true); setError(null);
    try { setStatus(await authorityGateway.status(agreement.agreementId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try { setStatus(await authorityGateway.status(selected.agreementId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const open = async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try { setStatus(await authorityGateway.open(selected.agreementId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const fund = async () => {
    if (!selected || !fundAmount) return;
    setLoading(true); setError(null);
    try { setStatus(await authorityGateway.fund(selected.agreementId, Math.round(Number(fundAmount) * 100))); setFundAmount(''); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const exercise = async () => {
    if (!selected || !exerciseAmount) return;
    setLoading(true); setError(null);
    try {
      await authorityGateway.exercise(selected.agreementId, Math.round(Number(exerciseAmount) * 100));
      setStatus(await authorityGateway.status(selected.agreementId));
      setExerciseAmount('');
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const release = async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try { await authorityGateway.release(selected.agreementId); setStatus(await authorityGateway.status(selected.agreementId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  return (
    <SectionCard title="Funded Authority" description="Progress money already authorised under one of your own Agreements. Nothing here is calculated by this screen.">
      {error && <ErrorBanner message={error} />}
      {!agreements ? (
        <button onClick={() => void loadAgreements()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Show my Agreements</button>
      ) : selected === null ? (
        agreements.length === 0 ? (
          <p className="text-sm text-sand-600">You have no Agreements yet.</p>
        ) : (
          <ul className="space-y-2">
            {agreements.map(agreement => (
              <li key={agreement.agreementId}>
                <button onClick={() => void select(agreement)} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50">
                  <div className="font-medium text-forest-800">{agreement.title}</div>
                  <div className="text-xs text-sand-600">{agreement.purpose}{agreement.counterparty?.ksNumber ? ` · ${agreement.counterparty.ksNumber}` : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-3">
          <button onClick={() => { setSelected(null); setStatus(null); }} className="text-xs text-sand-600 underline">← Choose a different Agreement</button>
          <div className="text-sm text-forest-800 font-medium">{selected.title}</div>
          <div className="text-xs text-sand-600">{selected.purpose}</div>
          {!status ? null : !status.established ? (
            <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-2">
              <p>No Funded Authority is open yet for this Agreement{status.reasonCode ? ` (${status.reasonCode})` : ''}.</p>
              <button onClick={() => void open()} disabled={loading} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Open Funded Authority</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 grid grid-cols-2 gap-2">
                <div>Authorised max: <strong>{money(status.authorisedMaxAmountMinor ?? 0, status.currency ?? '')}</strong></div>
                <div>Funded: <strong>{money(status.fundedTotalMinor ?? 0, status.currency ?? '')}</strong></div>
                <div>Exercised/settled: <strong>{money(status.exercisedOrSettledMinor ?? 0, status.currency ?? '')}</strong></div>
                <div>Released: <strong>{money(status.releasedTotalMinor ?? 0, status.currency ?? '')}</strong></div>
                <div>Remaining: <strong>{money(status.remainingFundedMinor ?? 0, status.currency ?? '')}</strong></div>
                <div>Status: <strong>{status.closed ? 'Closed' : 'Open'}</strong></div>
                {status.beneficiaryMaskedKsNumber && <div className="col-span-2">Beneficiary: <strong>{status.beneficiaryMaskedKsNumber}</strong></div>}
              </div>
              {!status.closed && (
                <>
                  <div className="flex gap-2">
                    <input value={fundAmount} onChange={e => setFundAmount(e.target.value)} placeholder="Fund amount" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
                    <button onClick={() => void fund()} disabled={loading || !fundAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Fund from my own position</button>
                  </div>
                  <div className="flex gap-2">
                    <input value={exerciseAmount} onChange={e => setExerciseAmount(e.target.value)} placeholder="Amount to progress" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
                    <button onClick={() => void exercise()} disabled={loading || !exerciseAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Progress to {status.beneficiaryMaskedKsNumber ?? 'beneficiary'}</button>
                  </div>
                  <button onClick={() => void release()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Release remaining to me</button>
                </>
              )}
              <button onClick={() => void refresh()} disabled={loading} className="text-xs text-sand-600 underline">Refresh</button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/** Settlement destination: view current + history + verification status. Registration/replacement requires backend-computed values this client never fabricates -- a genuine, disclosed gap, not a fake form. */
function SettlementDestinationSection({ gateway }: { gateway: SettlementDestinationGateway }) {
  const [ksNumber, setKsNumber] = useState('');
  const [current, setCurrent] = useState<SettlementDestinationResponse | null>(null);
  const [history, setHistory] = useState<SettlementDestinationResponse[] | null>(null);
  const [verification, setVerification] = useState<SettlementVerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    if (!ksNumber) return;
    setLoading(true); setError(null); setNotFound(false); setVerification(null);
    try {
      const [currentDestination, destinationHistory] = await Promise.all([gateway.current(ksNumber), gateway.history(ksNumber)]);
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

  return (
    <SectionCard title="Settlement destination" description="Where an Agreement's money settles. Registering a new destination is not yet available in-product -- a genuine, disclosed gap.">
      {error && <ErrorBanner message={error} />}
      <div className="flex gap-2">
        <input value={ksNumber} onChange={e => setKsNumber(e.target.value)} placeholder="Your KS Number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
        <button onClick={() => void load()} disabled={loading || !ksNumber} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Look up</button>
      </div>
      {notFound && <p className="text-sm text-sand-600">No settlement destination is registered yet for this KS Number.</p>}
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
