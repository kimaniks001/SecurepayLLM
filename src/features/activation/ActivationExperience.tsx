import { useEffect, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, PartyPopper, ShieldCheck, WalletCards } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type {
  ActivationAgreementResponse,
  ActivationFundingComponentResponse,
  ActivationFundingNextAction,
  ActivationFundingStatusResponse,
  SubscriptionBillingCycleResponse,
  SubscriptionGateway,
  SubscriptionPlan,
  SubscriptionStatusResponse,
} from '../../api/securepay/subscription';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

const planLabel: Record<SubscriptionPlan, string> = { FOR_YOU: 'For You', BUSINESS: 'For Business' };

const componentStateLabel: Record<string, string> = {
  NOT_STARTED: 'Not started',
  INTENDED: 'Payment intent created — awaiting your payment',
  CONFIRMED: 'Payment confirmed',
  TRANSFERRED: 'Transferred to your settlement destination',
  RESERVED: 'Reserve established',
  EARNED: 'Earned',
  FAILED: 'Failed',
};

const componentTitle: Record<string, string> = {
  SECUREPAY_SUBSCRIPTION_FEE: 'First-month subscription',
  ACTIVATION_VERIFICATION_RETURN: 'Settlement-destination verification',
  ACTIVATION_REVIEW_RESERVE: 'Agreement Review Reserve',
};

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
  const [funding, setFunding] = useState<ActivationFundingStatusResponse | null>(null);
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
    try {
      setBilling(await gateway.prepareCurrentBillingCycle());
      setFunding(await gateway.activationFundingStatus());
    }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const refreshFunding = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try { setFunding(await gateway.activationFundingStatus()); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  // Backend-authorized next funding action only -- this UI never infers completion or advances a
  // step the backend has not itself confirmed. Every action re-reads live status afterward.
  const runFundingAction = async (action: ActivationFundingNextAction) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      switch (action) {
        case 'PREPARE_VERIFICATION_FUNDING':
          setFunding(await gateway.prepareVerificationFunding());
          break;
        case 'INITIATE_VERIFICATION_TRANSFER':
          await gateway.initiateVerificationTransfer();
          setFunding(await gateway.activationFundingStatus());
          break;
        case 'PREPARE_RESERVE_FUNDING':
          setFunding(await gateway.prepareReserveFunding());
          break;
        case 'ESTABLISH_REVIEW_RESERVE':
          setFunding(await gateway.establishReviewReserve());
          break;
        default:
          // PAY_VERIFICATION_INTENT / PAY_RESERVE_INTENT / REGISTER_SETTLEMENT_DESTINATION /
          // RETRY_FAILED_COMPONENT / NONE_ACTIVATION_COMPLETE are not this UI's own action to
          // perform -- re-reading live status is the only safe thing to do.
          setFunding(await gateway.activationFundingStatus());
      }
    } catch (cause) { setError(errorText(cause)); }
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
            <div className="text-xs uppercase tracking-wide text-forest-600">First subscription payment intent</div>
            <div className="mt-2 font-display text-2xl text-forest-800">{money(billing.feeDueMinor, billing.currency)}</div>
            <p className="mt-1 text-sm text-sand-600">{planLabel[billing.plan]} subscription · {billing.cycleMonth}</p>
            <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs text-sand-600 break-all">Payment intent: {billing.paymentIntentId}</div>
          </section>
        )}

        {billing && !authorityReadFailed && (
          <ActivationFundingSection
            funding={funding}
            loading={loading}
            onRefresh={() => void refreshFunding()}
            onAction={action => void runFundingAction(action)}
            onContinue={onLeave}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Final Completion Phase 1 (Outcome C/E): the single, bounded activation-funding read model
 * drives this section end to end. It shows exactly one backend-authorized next action at a time,
 * never infers completion, never fabricates a transaction reference, and fails closed on any
 * component state or next action it does not recognize (the gateway's own
 * `activationFundingStatusView` already throws before an unrecognized value ever reaches here --
 * this component's `default` branches are the second, defense-in-depth layer).
 */
function ActivationFundingSection({ funding, loading, onRefresh, onAction, onContinue }: {
  funding: ActivationFundingStatusResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onAction: (action: ActivationFundingNextAction) => void;
  onContinue: () => void;
}) {
  if (!funding) {
    return (
      <section className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
        <p className="text-sm text-sand-600">Reading your activation funding status…</p>
        <button disabled={loading} onClick={onRefresh} className="mt-3 rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-700 hover:bg-cream-50 disabled:opacity-50">Check status</button>
      </section>
    );
  }

  const action = funding.nextAction as ActivationFundingNextAction;

  return (
    <section className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50">
        <div className="text-xs uppercase tracking-wide text-sand-500">Activation funding</div>
        <h2 className="font-display text-lg text-forest-800 mt-1">What's required, and what's satisfied so far</h2>
      </div>
      <div className="p-5 space-y-4">
        <ul className="space-y-3">
          {funding.components.map(component => <FundingComponentRow key={component.componentType} component={component} />)}
        </ul>

        {funding.financiallyEnabled ? (
          <div className="rounded-xl bg-forest-50 p-4 text-sm text-forest-800 flex items-start gap-2">
            <PartyPopper className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Activation is complete.</div>
              <p className="mt-1 text-forest-700">SecurePay has confirmed all three activation funding components. This is a real, backend-confirmed state — not something this screen calculated.</p>
              <button onClick={onContinue} className="mt-3 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800">Continue to SecurePay</button>
            </div>
          </div>
        ) : (
          <FundingNextActionPanel action={action} loading={loading} onAction={onAction} onRefresh={onRefresh} />
        )}
      </div>
    </section>
  );
}

function FundingComponentRow({ component }: { component: ActivationFundingComponentResponse }) {
  const failed = component.state === 'FAILED';
  const done = component.state === 'TRANSFERRED' || component.state === 'RESERVED' || component.state === 'EARNED';
  return (
    <li className={`rounded-xl border p-3 ${failed ? 'border-orange-200 bg-orange-50' : done ? 'border-forest-200 bg-forest-50' : 'border-cream-200 bg-cream-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-forest-800">{componentTitle[component.componentType] ?? component.componentType}</div>
        <div className="text-sm text-sand-700">{money(component.amountMinor, component.currency)}</div>
      </div>
      <div className="mt-1 text-xs text-sand-600">{componentStateLabel[component.state] ?? `Unrecognized state: ${component.state}`}</div>
      <p className="mt-1 text-xs text-sand-500">{component.description}</p>
    </li>
  );
}

function FundingNextActionPanel({ action, loading, onAction, onRefresh }: {
  action: ActivationFundingNextAction;
  loading: boolean;
  onAction: (action: ActivationFundingNextAction) => void;
  onRefresh: () => void;
}) {
  const actionButton = (label: string) => (
    <button disabled={loading} onClick={() => onAction(action)} className="rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">{label}</button>
  );
  const refreshButton = (label: string) => (
    <button disabled={loading} onClick={onRefresh} className="rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm font-medium text-forest-700 hover:bg-cream-50 disabled:opacity-50">{label}</button>
  );

  switch (action) {
    case 'PREPARE_VERIFICATION_FUNDING':
      return <div className="space-y-2"><p className="text-sm text-sand-600">Next, SecurePay needs to prepare the settlement-destination verification funding.</p>{actionButton('Prepare settlement verification funding')}</div>;
    case 'PAY_VERIFICATION_INTENT':
      return <div className="space-y-2"><p className="text-sm text-sand-600">Complete the settlement-verification payment intent through your usual SecurePay Money flow, then check status again. This screen cannot mark a payment as paid for you.</p>{refreshButton('Check status')}</div>;
    case 'REGISTER_SETTLEMENT_DESTINATION':
      return (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-sand-800"><AlertTriangle className="w-4 h-4" /> A settlement destination is required</div>
          <p className="text-sm text-sand-700">Register a settlement destination for your account before SecurePay can verify it. This is managed outside Activation, in your account's settlement settings.</p>
          {refreshButton('Check status')}
        </div>
      );
    case 'INITIATE_VERIFICATION_TRANSFER':
      return <div className="space-y-2"><p className="text-sm text-sand-600">Your settlement-verification funding is confirmed. SecurePay can now send the verification transfer to your registered destination.</p>{actionButton('Initiate settlement verification transfer')}</div>;
    case 'PREPARE_RESERVE_FUNDING':
      return <div className="space-y-2"><p className="text-sm text-sand-600">Next, SecurePay needs to prepare your Agreement Review Reserve funding — this stays your own money.</p>{actionButton('Prepare Agreement Review Reserve funding')}</div>;
    case 'PAY_RESERVE_INTENT':
      return <div className="space-y-2"><p className="text-sm text-sand-600">Complete the Agreement Review Reserve payment intent through your usual SecurePay Money flow, then check status again.</p>{refreshButton('Check status')}</div>;
    case 'ESTABLISH_REVIEW_RESERVE':
      return <div className="space-y-2"><p className="text-sm text-sand-600">Your Agreement Review Reserve funding is confirmed. SecurePay can now establish your standing reserve.</p>{actionButton('Establish my Agreement Review Reserve')}</div>;
    case 'RETRY_FAILED_COMPONENT':
      return (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-sand-800"><AlertTriangle className="w-4 h-4" /> One activation funding component failed</div>
          <p className="text-sm text-sand-700">Check status for the exact component. You may need to retry the failed component's funding.</p>
          {refreshButton('Check status')}
        </div>
      );
    case 'CONFIRM_AGREEMENT':
    case 'FUND_SUBSCRIPTION':
    case 'NONE_ACTIVATION_COMPLETE':
      // Reached only if live status disagrees with this screen's own earlier reads (e.g. a
      // concurrent change) -- re-read rather than assume either direction.
      return <div className="space-y-2"><p className="text-sm text-sand-600">SecurePay's activation funding state has changed. Checking the current status.</p>{refreshButton('Check status')}</div>;
    default:
      // Unreachable in practice (activationFundingStatusView already fails closed on an
      // unrecognized nextAction before it ever reaches this component) -- kept as a second,
      // defense-in-depth layer per doctrine: never silently treat an unknown state as safe.
      return (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-sand-800"><AlertTriangle className="w-4 h-4" /> SecurePay reported an unrecognized activation state</div>
          {refreshButton('Check status')}
        </div>
      );
  }
}

function ActivationHeader({ onBack }: { onBack: () => void }) {
  return <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between"><button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back</button><img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" /></header>;
}

function PlanCard({ title, description, onChoose }: { title: string; description: string; onChoose: () => void }) {
  return <button onClick={onChoose} className="text-left rounded-2xl border border-cream-200 bg-white p-5 shadow-card hover:border-forest-200 hover:bg-cream-50 transition-colors"><div className="font-display text-xl text-forest-800">{title}</div><p className="mt-2 text-sm leading-relaxed text-sand-600">{description}</p><div className="mt-5 text-sm font-medium text-orange-600">Choose {title} →</div></button>;
}
