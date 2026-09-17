import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { SubscriptionGateway, SubscriptionPlan } from '../../api/securepay/subscription';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { createActivationController } from './controller';

const plans: Record<SubscriptionPlan, { name: string; total: number; monthly: number; summary: string }> = {
  FOR_YOU: { name: 'For You', total: 400, monthly: 100, summary: 'SecurePay agreement, Payment Ready and settlement infrastructure for personal use.' },
  BUSINESS: { name: 'For Business', total: 500, monthly: 200, summary: 'Operate a Business KS and connect/build using SecurePay infrastructure, subject to authority checks.' },
};

function FundingBreakdown({ plan }: { plan: SubscriptionPlan }) {
  const p = plans[plan];
  return <div className="rounded-2xl border border-cream-200 bg-white p-5">
    <div className="flex items-baseline justify-between gap-4"><h2 className="font-display text-lg text-forest-800">Activation funding</h2><span className="font-display text-2xl text-forest-800">KES {p.total}</span></div>
    <p className="mt-2 text-sm text-sand-600">This is not an activation fee. It is three separately-classified amounts.</p>
    <div className="mt-4 divide-y divide-cream-200 text-sm">
      <div className="flex justify-between py-3"><span>First month subscription</span><strong>KES {p.monthly}</strong></div>
      <div className="flex justify-between py-3"><span>Settlement verification · returned after verification</span><strong>KES 100</strong></div>
      <div className="flex justify-between py-3"><span>Agreement Review Reserve · remains your money</span><strong>KES 200</strong></div>
    </div>
    <p className="mt-3 text-xs text-sand-500">Only the subscription component can ever become SecurePay revenue, and only when legitimately earned. Funding ≠ earning.</p>
  </div>;
}

export function ActivationExperience({ gateway, auth, session, onLeave }: { gateway: SubscriptionGateway; auth: AuthGateway; session: SessionStore; onLeave: () => void }) {
  const [controller] = useState(() => createActivationController(gateway));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);

  useEffect(() => {
    if (sessionState.status === 'signed-in') void controller.load();
    else controller.reset();
  }, [sessionState.status, controller]);

  if (sessionState.status !== 'signed-in') {
    const authData = secureAuthView(identityState);
    return <main className="min-h-dvh bg-cream-50 text-forest-800 p-5 md:p-8 pb-24">
      <button onClick={onLeave} className="inline-flex items-center gap-2 text-sm text-sand-600"><ArrowLeft className="w-4 h-4" />Back</button>
      <div className="max-w-md mx-auto mt-12"><img src={securepayWordmark} alt="SecurePay" className="h-9 w-auto mx-auto mb-7" />
        <h1 className="font-display text-2xl text-center">Set up SecurePay</h1><p className="text-sm text-sand-600 text-center mt-2 mb-6">Sign in so your activation Agreement can be created for your own KS identity.</p>
        <SecureAuthCard data={authData} values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]} disabled={identityState.busy} errorText={identityState.error}
          onFieldChange={(index, value) => { if (identityState.phase === 'otp') identityController.setOtp(value); else if (index === 0) identityController.setKsNumber(value); else identityController.setPassword(value); }}
          onChoice={value => { if (value === 'submit_credentials') void identityController.submitCredentials(); else if (value === 'submit_otp') void identityController.submitOtp(); else if (value === 'reset_credentials') identityController.reset(); else if (value === 'cancel_auth') { setIdentityController(createIdentityController(auth, session)); onLeave(); } }} />
      </div>
    </main>;
  }

  const subscription = state.subscription.status === 'ready' ? state.subscription.data : undefined;
  const agreement = state.agreement.status === 'ready' ? state.agreement.data : undefined;
  const billing = state.billing.status === 'ready' ? state.billing.data : undefined;

  return <main className="min-h-dvh bg-cream-50 text-forest-800 pb-24">
    <header className="sticky top-0 z-20 border-b border-cream-200/60 bg-cream-50/90 backdrop-blur-sm px-5 md:px-8 py-4 flex items-center justify-between">
      <button onClick={onLeave} className="inline-flex items-center gap-2 text-sm text-sand-600"><ArrowLeft className="w-4 h-4" />Back</button>
      <img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" />
      <span className="w-12" />
    </header>
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8">
      <div className="mb-8"><div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-forest-600 font-medium"><ShieldCheck className="w-4 h-4" />Your first SecurePay Agreement</div>
        <h1 className="font-display text-3xl md:text-4xl mt-3">Activate by agreement, not by a hidden fee.</h1>
        <p className="mt-3 text-sand-600 leading-relaxed">Choose how you will use SecurePay. SecurePay then proposes the exact activation Agreement for you to review and confirm. Money follows that Agreement.</p>
      </div>

      {state.subscription.status === 'loading' && <p role="status" className="text-sm text-sand-500">Checking activation status…</p>}
      {state.error && <div role="alert" className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-sand-700">{state.error}</div>}

      {subscription === null && <section className="grid md:grid-cols-2 gap-4">
        {(Object.keys(plans) as SubscriptionPlan[]).map(plan => <button key={plan} disabled={state.busy} onClick={() => void controller.selectPlan(plan)} className="text-left rounded-2xl border border-cream-200 bg-white p-5 hover:border-forest-300 transition-colors disabled:opacity-50">
          <div className="flex items-baseline justify-between gap-3"><h2 className="font-display text-xl">{plans[plan].name}</h2><span className="font-display text-xl">KES {plans[plan].total}</span></div>
          <p className="text-xs text-sand-500 mt-1">activation funding</p><p className="text-sm text-sand-600 mt-4">{plans[plan].summary}</p>
          <div className="mt-5 text-sm font-medium text-forest-600">Choose {plans[plan].name} →</div>
        </button>)}
      </section>}

      {subscription && <div className="space-y-5">
        <div className="rounded-xl bg-forest-50 border border-forest-100 p-4 flex items-center gap-3"><Check className="w-5 h-5 text-forest-600" /><div><div className="text-sm font-medium">{plans[subscription.plan]?.name ?? subscription.plan} selected</div><div className="text-xs text-sand-500">Backend subscription status: {subscription.status} · monthly fee {subscription.currency} {(subscription.monthlyFeeMinor / 100).toLocaleString()}</div></div></div>
        <FundingBreakdown plan={subscription.plan} />

        {agreement === null && <div className="rounded-2xl border border-cream-200 bg-white p-5"><h2 className="font-display text-lg">Review SecurePay's promise</h2><p className="mt-2 text-sm text-sand-600">SecurePay will create the canonical activation Agreement as proposer, invite your identity and join you as an unconfirmed participant. You still confirm separately.</p><button disabled={state.busy} onClick={() => void controller.establishAgreement()} className="mt-4 rounded-xl bg-forest-700 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">Create my Activation Agreement</button></div>}

        {agreement && <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden"><div className="p-5 border-b border-cream-200"><div className="text-xs uppercase tracking-wide text-sand-500">Canonical Agreement</div><h2 className="font-display text-xl mt-1">{agreement.title}</h2><p className="mt-3 text-sm text-sand-700 leading-relaxed">{agreement.purpose}</p></div><div className="p-5 bg-cream-50"><p className="text-sm text-sand-700 leading-relaxed whitespace-pre-wrap">{agreement.description}</p><div className="mt-4 text-xs text-sand-400 break-all">Version {agreement.agreementVersionId} · content hash {agreement.contentHash}</div>
          {!agreement.confirmed ? <button disabled={state.busy} onClick={() => void controller.confirmAgreement()} className="mt-5 rounded-xl bg-forest-700 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">Yes, this is what I agree to</button> : <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-forest-700"><Check className="w-4 h-4" />Confirmed {agreement.confirmedAt ? new Date(agreement.confirmedAt).toLocaleString() : ''}</div>}</div></div>}

        {agreement?.confirmed && !billing && <div className="rounded-2xl border border-cream-200 bg-white p-5"><h2 className="font-display text-lg">Begin funding</h2><p className="mt-2 text-sm text-sand-600">The backend can now create the first-month subscription PaymentIntent. This is only the subscription component — it is not the KES {plans[subscription.plan].total} total and does not represent the separate verification transfer or Review Reserve.</p><button disabled={state.busy} onClick={() => void controller.prepareBilling()} className="mt-4 rounded-xl bg-orange-500 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">Create subscription payment</button></div>}

        {billing && <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5"><div className="text-xs uppercase tracking-wide text-orange-700 font-medium">Money handoff ready</div><h2 className="font-display text-xl mt-1">{billing.currency} {(billing.feeDueMinor / 100).toLocaleString()} subscription payment</h2><p className="mt-2 text-sm text-sand-700">PaymentIntent <span className="font-mono text-xs break-all">{billing.paymentIntentId}</span> was created by SecurePay. Actual rail selection/payment execution belongs to Money and is not being simulated here.</p><p className="mt-3 text-xs text-sand-500">Activation is not shown as complete merely because this PaymentIntent exists. Settlement verification and Review Reserve remain separately-classified funding authorities.</p></div>}
      </div>}
    </div>
  </main>;
}
