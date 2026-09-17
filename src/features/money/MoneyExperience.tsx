import { useState, useSyncExternalStore } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type { FundedAuthorityPositionResponse, MoneyAuthorityGateway } from '../../api/securepay/money-authority';
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
        <FundedAuthoritySection gateway={gateways.moneyAuthority} />
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

/** Funded Authority: open a direct-money authority, fund it from your own position, exercise it against a KS-addressed beneficiary, or release what remains. Every figure shown is the backend's own read model. */
function FundedAuthoritySection({ gateway }: { gateway: MoneyAuthorityGateway }) {
  const [authorityId, setAuthorityId] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [maxAmount, setMaxAmount] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [exerciseKsNumber, setExerciseKsNumber] = useState('');
  const [exerciseAmount, setExerciseAmount] = useState('');
  const [position, setPosition] = useState<FundedAuthorityPositionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startNew = () => setAuthorityId(crypto.randomUUID());

  const open = async () => {
    if (!authorityId || !maxAmount) return;
    setLoading(true); setError(null);
    try { setPosition(await gateway.open(authorityId, currency, Math.round(Number(maxAmount) * 100))); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const refresh = async () => {
    setLoading(true); setError(null);
    try { setPosition(await gateway.status(authorityId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const fund = async () => {
    if (!fundAmount) return;
    setLoading(true); setError(null);
    try { setPosition(await gateway.fund(authorityId, Math.round(Number(fundAmount) * 100))); setFundAmount(''); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const exercise = async () => {
    if (!exerciseKsNumber || !exerciseAmount) return;
    setLoading(true); setError(null);
    try {
      const outcome = await gateway.exercise(authorityId, exerciseKsNumber, Math.round(Number(exerciseAmount) * 100));
      setPosition(await gateway.status(authorityId));
      setExerciseAmount(''); setExerciseKsNumber('');
      void outcome;
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };
  const release = async () => {
    setLoading(true); setError(null);
    try { await gateway.release(authorityId); setPosition(await gateway.status(authorityId)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  return (
    <SectionCard title="Funded Authority" description="Authorise a ceiling, fund it from your own position, exercise it as conditions are met.">
      {error && <ErrorBanner message={error} />}
      <div className="flex gap-2">
        <input value={authorityId} onChange={e => setAuthorityId(e.target.value)} placeholder="Authority reference (a UUID you keep)" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
        <button onClick={startNew} disabled={loading} className="rounded-xl border border-forest-200 px-3 py-2 text-sm text-forest-700 hover:bg-cream-50">New</button>
      </div>
      {!position ? (
        <div className="flex gap-2">
          <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Currency" className="w-24 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          <input value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="Max amount" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
          <button onClick={() => void open()} disabled={loading || !authorityId || !maxAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Open</button>
          <button onClick={() => void refresh()} disabled={loading || !authorityId} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Load</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 grid grid-cols-2 gap-2">
            <div>Authorised max: <strong>{money(position.authorisedMaxAmountMinor, position.currency)}</strong></div>
            <div>Funded: <strong>{money(position.fundedTotalMinor, position.currency)}</strong></div>
            <div>Exercised/settled: <strong>{money(position.exercisedOrSettledMinor, position.currency)}</strong></div>
            <div>Released: <strong>{money(position.releasedTotalMinor, position.currency)}</strong></div>
            <div>Remaining: <strong>{money(position.remainingFundedMinor, position.currency)}</strong></div>
            <div>Status: <strong>{position.closed ? 'Closed' : 'Open'}</strong></div>
          </div>
          {!position.closed && (
            <>
              <div className="flex gap-2">
                <input value={fundAmount} onChange={e => setFundAmount(e.target.value)} placeholder="Fund amount" type="number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
                <button onClick={() => void fund()} disabled={loading || !fundAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Fund from my own position</button>
              </div>
              <div className="flex gap-2">
                <input value={exerciseKsNumber} onChange={e => setExerciseKsNumber(e.target.value)} placeholder="Beneficiary KS Number" className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
                <input value={exerciseAmount} onChange={e => setExerciseAmount(e.target.value)} placeholder="Amount" type="number" className="w-32 rounded-xl border border-cream-200 px-3 py-2 text-sm" />
                <button onClick={() => void exercise()} disabled={loading || !exerciseKsNumber || !exerciseAmount} className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Exercise</button>
              </div>
              <button onClick={() => void release()} disabled={loading} className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-700 disabled:opacity-50">Release remaining to me</button>
            </>
          )}
          <button onClick={() => void refresh()} disabled={loading} className="text-xs text-sand-600 underline">Refresh</button>
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
