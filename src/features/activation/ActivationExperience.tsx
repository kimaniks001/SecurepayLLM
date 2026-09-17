import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, WalletCards } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type { ActivationAgreementResponse, SubscriptionBillingCycleResponse, SubscriptionGateway, SubscriptionPlan, SubscriptionStatusResponse } from '../../api/securepay/subscription';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

const planLabel: Record<SubscriptionPlan, string> = { FOR_YOU: 'For You', BUSINESS: 'For Business' };

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

export function ActivationExperience({ gateway, auth, session, onLeave }: {
  gateway: SubscriptionGateway;
  auth: AuthGateway;
  session: SessionStore;
  onLeave: () => void;
}) {
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [agreement, setAgreement] = useState<ActivationAgreementResponse | null>(null);
  const [billing, setBilling] = useState<SubscriptionBillingCycleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [authorityReadFailed, setAuthorityReadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (session.getSnapshot().status !== 'signed-in') return;
    setLoading(true);
    setAuthorityReadFailed(false);
    setError(null);
    try {
      const current = await gateway.myStatus();
      setSubscription(current);
      try {
        setAgreement(await gateway.activationAgreement());
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) setAgreement(null);
        else throw cause;
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setSubscription(null);
        setAgreement(null);
      } else {
        // A failed authority read is not an authoritative empty state. Clear any stale snapshot
        // and keep all plan/agreement mutations unavailable until a future read succeeds.
        setSubscription(null);
        setAgreement(null);
        setAuthorityReadFailed(true);
        setError(errorText(cause));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBilling(null);
    if (sessionState.status === 'signed-in') void load();
    else {
      setSubscription(null);
      setAgreement(null);
      setAuthorityReadFailed(false);
    }
    // Session transitions are the authority boundary. Gateway/controller identities are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status]);

  const selectPlan = async (plan: SubscriptionPlan) => {
    if (loading || authorityReadFailed) return;
    setLoading(true);
    setError(null);
    try {
      const selected = await gateway.selectPlan(plan);
      setSubscription(selected);
      setAgreement(await gateway.establishActivationAgreement());
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  };

  const establishAgreement = async () => {
    if (loading || authorityReadFailed) return;
    setLoading(true);
    setError(null);
    try { setAgreement(await gateway.establishActivationAgreement()); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const confirmAgreement = async () => {
    if (loading || authorityReadFailed || !agreement || agreement.confirmed) return;
    setLoading(true);
    setError(null);
    try { setAgreement(await gateway.confirmActivationAgreement()); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const prepareBilling = async () => {
    if (loading || authorityReadFailed || !agreement?.confirmed) return;
    setLoading(true);
    setError(null);
    try { setBilling(await gateway.prepareCurrentBillingCycle()); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  if (sessionState.status !== 'signed-in') {
    const data = secureAuthView(identityState);
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col">
        <ActivationHeader onBack={onLeave} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-4">
            <div className="text-center">
              <h1 className="font-display text-2xl text-forest-800">Activate SecurePay</h1>
              <p className="mt-2 text-sm text-sand-600">Sign in first. Choosing a plan does not move money and does not confirm an Agreement.</p>
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
      <ActivationHeader onBack={onLeave} />
      <main className="w-full max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div className="max-w-2xl">
          <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-orange-600">Activation</div>
          <h1 className="font-display text-3xl md:text-4xl text-forest-800 mt-2">Begin with SecurePay's own agreement.</h1>
          <p className="mt-3 text-sand-600 leading-relaxed">SecurePay does not ask you to pay an unexplained activation fee. Choose the relationship you need, review the exact backend-authored promise, then confirm that exact Agreement before any billing intent is prepared.</p>
        </div>

        {error && <div role="alert" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-sand-700">{error}</div>}
        {loading && <p role="status" className="text-sm text-sand-500">Checking SecurePay…</p>}
        {authorityReadFailed && !loading && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <h2 className="font-display text-lg text-forest-800">SecurePay could not verify your current activation state.</h2>
            <p className="mt-2 text-sm text-sand-600">No activation action is available from an unknown state. Try the authoritative read again before choosing a plan, creating an Agreement, confirming it, or preparing Money.</p>
            <button onClick={() => void load()} className="mt-4 rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-700 hover:bg-cream-50">Try again</button>
          </section>
        )}

        {!authorityReadFailed && !loading && !subscription && (
          <section className="grid md:grid-cols-2 gap-4" aria-label="Choose activation plan">
            <PlanCard title="For You" description="For personal agreements and the standard SecurePay agreement, Payment Ready and settlement infrastructure." onChoose={() => void selectPlan('FOR_YOU')} />
            <PlanCard title="For Business" description="For a Business KS and access to SecurePay business infrastructure, subject to the authority and entitlement checks that apply." onChoose={() => void selectPlan('BUSINESS')} />
            <p className="md:col-span-2 text-xs text-sand-500">The exact activation-funding total and its subscription, returned verification transfer and customer-owned Review Reserve breakdown are shown from the canonical Activation Agreement before you confirm it. This screen does not calculate those figures itself.</p>
          </section>
        )}

        {subscription && !agreement && !loading && !authorityReadFailed && (
          <section className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
            <div className="text-xs uppercase tracking-wide text-sand-500">Selected relationship</div>
            <h2 className="font-display text-xl text-forest-800 mt-1">{planLabel[subscription.plan]}</h2>
            <p className="mt-2 text-sm text-sand-600">Monthly subscription: {money(subscription.monthlyFeeMinor, subscription.currency)}. No funding has been initiated by selecting this plan.</p>
            <button disabled={loading} onClick={() => void establishAgreement()} className="mt-5 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">Create my Activation Agreement</button>
          </section>
        )}

        {subscription && agreement && !authorityReadFailed && (
          <section className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-cream-200 bg-cream-50 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-sand-500">Canonical Activation Agreement</div>
                <h2 className="font-display text-xl text-forest-800 mt-1">{agreement.title}</h2>
              </div>
              {agreement.confirmed && <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>}
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-sand-500">Purpose</div>
                <p className="mt-2 text-sm leading-relaxed text-sand-700">{agreement.purpose}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-sand-500">What SecurePay is promising</div>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-sand-700">{agreement.description}</p>
              </div>
              <div className="rounded-xl bg-cream-50 p-3 text-xs text-sand-500 break-all">
                Exact version: {agreement.agreementVersionId}<br />Content hash: {agreement.contentHash}
              </div>
              {!agreement.confirmed ? (
                <button disabled={loading} onClick={() => void confirmAgreement()} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">Yes, this is what I agree to</button>
              ) : (
                <div className="flex items-start gap-2 rounded-xl bg-forest-50 p-4 text-sm text-forest-800">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>This exact Activation Agreement version is confirmed{agreement.confirmedAt ? ` as of ${new Date(agreement.confirmedAt).toLocaleString()}` : ''}.</span>
                </div>
              )}
            </div>
          </section>
        )}

        {agreement?.confirmed && !billing && !authorityReadFailed && (
          <section className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-2"><WalletCards className="w-4 h-4 text-forest-600" /><h2 className="font-display text-lg text-forest-800">Prepare first subscription payment</h2></div>
            <p className="mt-2 text-sm text-sand-600">The backend allows the current subscription billing cycle to be prepared only after canonical Agreement confirmation. Preparing it creates a real payment intent; it does not settle money.</p>
            <button disabled={loading} onClick={() => void prepareBilling()} className="mt-4 rounded-xl border border-forest-200 bg-forest-50 px-4 py-2.5 text-sm font-medium text-forest-700 hover:bg-forest-100 disabled:opacity-50">Prepare payment intent</button>
          </section>
        )}

        {billing && !authorityReadFailed && (
          <section className="rounded-2xl border border-forest-200 bg-forest-50 p-5">
            <div className="text-xs uppercase tracking-wide text-forest-600">Payment intent prepared</div>
            <div className="mt-2 font-display text-2xl text-forest-800">{money(billing.feeDueMinor, billing.currency)}</div>
            <p className="mt-1 text-sm text-sand-600">{planLabel[billing.plan]} subscription · {billing.cycleMonth}</p>
            <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs text-sand-600 break-all">Payment intent: {billing.paymentIntentId}</div>
            <p className="mt-4 text-xs leading-relaxed text-sand-500">This is the subscription component only. SecurePay does not mark activation complete here because the current customer API does not yet expose one authoritative command/status covering the returned settlement-verification transfer and customer-owned Review Reserve described in the Activation Agreement. Those states must be wired through Money rather than inferred by this UI.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function ActivationHeader({ onBack }: { onBack: () => void }) {
  return <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between"><button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back</button><img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" /></header>;
}

function PlanCard({ title, description, onChoose }: { title: string; description: string; onChoose: () => void }) {
  return <button onClick={onChoose} className="text-left rounded-2xl border border-cream-200 bg-white p-5 shadow-card hover:border-forest-200 hover:bg-cream-50 transition-colors"><div className="font-display text-xl text-forest-800">{title}</div><p className="mt-2 text-sm leading-relaxed text-sand-600">{description}</p><div className="mt-5 text-sm font-medium text-orange-600">Choose {title} →</div></button>;
}
