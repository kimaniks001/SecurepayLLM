import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
import type { MoneyGateway } from '../../api/securepay/money';
import type { AppView } from '../../types';
import { resolveHandoffContext } from '../money/handoff';
import { paymentReadyFacts } from '../money/display';
import { CONTEXT_UNREFRESHED } from '../money/selection';
import type { SupportContext } from './context';

type Read<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };
function useRead<T>(load: (() => Promise<T>) | null, key: string): Read<T> | null {
  const [state, setState] = useState<Read<T>>({ status: 'loading' });
  useEffect(() => {
    if (!load) return;
    let live = true;
    setState({ status: 'loading' });
    load().then(data => { if (live) setState({ status: 'ready', data }); }).catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return load ? state : null;
}
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-sand-600">{children}</p>;
const Unknown = ({ children }: { children: React.ReactNode }) => <p role="alert" className="text-sm text-ember-700">{children}</p>;
const Label = ({ children }: { children: React.ReactNode }) => <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{children}</div>;
const card = 'rounded-2xl border border-cream-200 bg-white px-5 py-4 space-y-3';
const rowBtn = 'w-full text-left rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all';

export const HUMAN_SUPPORT_UNAVAILABLE = 'Human support requests are not yet available from this screen. SecurePay can still help you inspect the Agreement, Money and formal Review state here.';
export const HELP_IS_NOT = 'Help & Support is a guide to where SecurePay already shows what it knows. It isn’t a support ticket: opening it doesn’t start a review, contact a person or change anything.';

export interface HelpNav {
  openAgreement: (agreementId: string) => void;
  openAgreementReviews: (agreementId: string) => void;
  openMoney: (m: { agreementId: string; title: string; versionLabel: string | null; currentVersionId: string | null }) => void;
  askAgent: () => void;
  recovery: () => void;
  notifications: () => void;
  account: () => void;
  agreements: () => void;
  money: () => void;
  store: () => void;
  community: () => void;
}
export interface HelpLabel { title: string | null; versionLabel: string | null; currentVersionId: string | null; notice: string | null }

/**
 * Help & Support: a routing and TRUTH surface, not a ticket console. Every action goes to the authority that already owns the matter; each states its exact
 * consequence. There is no support-case lifecycle, ticket, assignee or "escalated" state anywhere here -- none exists as a customer contract.
 */
export function SupportView({ signedIn, ctx, label, reviews, money, nav, onBack, navBar }: {
  signedIn: boolean; ctx: SupportContext | null; label: HelpLabel | null;
  reviews: Read<{ active: number }> | null; money: Read<{ headline: string }> | null; nav: HelpNav; onBack?: () => void; navBar?: React.ReactNode;
}) {
  const scoped = ctx && ctx.kind !== 'money-exception' ? ctx : null;
  return (
    <div className="min-h-dvh bg-cream-100 pb-16 md:pb-8">
      {navBar}
      <div className="px-4 md:px-8 py-6 space-y-5 max-w-2xl mx-auto w-full" data-testid="help">
        {onBack && <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700"><ArrowLeft className="w-4 h-4" /> Back</button>}
        <div>
          <h1 className="font-display text-2xl text-forest-800">{ctx ? `Help with ${label?.title ?? ctx.title}${label?.versionLabel ? ` · ${label.versionLabel}` : ''}` : 'Help & Support'}</h1>
          <p className="mt-2 text-sm text-sand-600">{HELP_IS_NOT}</p>
        </div>
        {label?.notice && <p role="status" className="text-sm text-forest-800">{label.notice}</p>}

        {ctx?.kind === 'money-exception' && (
          <section className={card} data-testid="help-exception">
            <Label>From Money</Label>
            <div className="font-medium text-forest-800">{ctx.heading}</div>
            {ctx.reason && <p className="text-sm text-sand-700">{ctx.reason}</p>}
            {ctx.requiredAction && <div className="text-sm text-sand-700"><span className="block text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">What is needed</span>{ctx.requiredAction}</div>}
            {ctx.recordedOn && <div className="text-xs text-sand-600">Recorded {ctx.recordedOn}</div>}
            <p className="text-xs text-sand-500">This is what SecurePay showed on the Money screen when you opened Help. Open Money for the current state; seeing it here doesn’t mean anyone is working on it.</p>
          </section>
        )}

        {(scoped || ctx?.kind === 'money-exception') && signedIn && (
          <section className={card}>
            <Label>What SecurePay can show you</Label>
            {scoped && reviews && (
              <div>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">From Formal Review</div>
                {reviews.status === 'loading' && <Note>Loading reviews…</Note>}
                {reviews.status === 'error' && <Unknown>Reviews couldn’t be loaded.</Unknown>}
                {reviews.status === 'ready' && <Note>{reviews.data.active === 0 ? 'No active formal reviews on this Agreement.' : `${reviews.data.active} active formal review${reviews.data.active === 1 ? '' : 's'} on this Agreement.`}</Note>}
              </div>
            )}
            {money && (
              <div>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">From Money</div>
                {money.status === 'loading' && <Note>Loading Money…</Note>}
                {money.status === 'error' && <Unknown>Money couldn’t be loaded.</Unknown>}
                {money.status === 'ready' && <Note>{money.data.headline}</Note>}
              </div>
            )}
          </section>
        )}

        {ctx?.kind === 'review' && (
          <section className={card}>
            <Label>Formal Review and Help are different</Label>
            <Note>A formal review is part of the Agreement and can affect whether related money can progress. Help is guidance: opening it can’t affect a review, and it doesn’t contact anyone.</Note>
          </section>
        )}

        <section className={card}>
          <Label>{ctx ? 'What you can do' : 'What do you need help with?'}</Label>
          <div className="space-y-2">
            {ctx && signedIn && (
              <>
                <Action title="Open this Agreement" consequence="SecurePay will show the Agreement." onClick={() => nav.openAgreement(ctx.agreementId)} />
                <Action title={ctx.kind === 'review' ? 'View formal review' : 'Reviews & issues'} consequence="SecurePay will open the Agreement’s Support tab, where formal reviews are shown." onClick={() => nav.openAgreementReviews(ctx.agreementId)} />
                <Action title="Open Money" consequence="SecurePay will show the latest Money information it can read for this Agreement." onClick={() => nav.openMoney({ agreementId: ctx.agreementId, title: label?.title ?? ctx.title, versionLabel: label?.versionLabel ?? null, currentVersionId: label?.currentVersionId ?? null })} />
              </>
            )}
            {!ctx && signedIn && (
              <>
                <Action title="An Agreement" consequence="SecurePay will show your Agreements; pick one to see its state and Support." onClick={nav.agreements} />
                <Action title="Money" consequence="SecurePay will show the latest Money information it can read." onClick={nav.money} />
                <Action title="A formal review" consequence="SecurePay will show your Agreements. Formal reviews live on each one: open it, then Support → Reviews & issues." onClick={nav.agreements} />
                <Action title="Store or Community" consequence="SecurePay will open the Store." onClick={nav.store} />
              </>
            )}
            <Action title="Trouble signing in" consequence="SecurePay will start the real account credential recovery flow." onClick={nav.recovery} />
            <Action title={signedIn ? 'Something else — ask KS001' : 'Ask KS001'} consequence="SecurePay will return you to the same conversation." onClick={nav.askAgent} />
          </div>
        </section>

        <section className={card}>
          <Label>Talking to a person</Label>
          <Note>{HUMAN_SUPPORT_UNAVAILABLE}</Note>
        </section>

        {signedIn && (
          <section className={card}>
            <Label>Where things show up</Label>
            <Note>Notifications show what needs your attention. They aren’t support cases and don’t mean anyone is handling something.</Note>
            <div className="flex flex-wrap gap-2">
              <button onClick={nav.notifications} className="text-sm text-forest-700 underline">Open notifications</button>
              <button onClick={nav.account} className="text-sm text-forest-700 underline">Account &amp; security</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Action({ title, consequence, onClick }: { title: string; consequence: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={rowBtn}>
      <div className="text-[0.9rem] font-medium text-forest-800">{title}</div>
      <div className="text-xs text-sand-600">When you press this, {consequence}</div>
    </button>
  );
}

/** Container: reads only what the signed-in person can already read AS THEMSELVES (their Agreement, its Reviews, its Money). The staff Support Context API is never called. */
export function SupportExperience({ ctx, signedIn, agreementGateway, reviewGateway, moneyGateway, nav, navigate, onBack }: {
  ctx: SupportContext | null; signedIn: boolean;
  agreementGateway: Pick<AgreementGateway, 'detail'>; reviewGateway: Pick<AgreementReviewGateway, 'list'>; moneyGateway: Pick<MoneyGateway, 'status'>;
  nav: HelpNav; navigate: (view: AppView) => void; onBack?: () => void;
}) {
  const agreementId = ctx?.agreementId ?? null;
  const scoped = !!ctx && ctx.kind !== 'money-exception';
  const detail = useRead(signedIn && scoped && agreementId ? () => agreementGateway.detail(agreementId) : null, `d:${agreementId}`);
  const reviews = useRead(signedIn && scoped && agreementId ? async () => ({ active: (await reviewGateway.list({ agreementId, activeOnly: true, size: 50 })).totalElements }) : null, `r:${agreementId}`);
  const money = useRead(signedIn && agreementId ? async () => { const st = await moneyGateway.status(agreementId); return { headline: paymentReadyFacts(st.paymentReadyStatus, st.paymentReady).headline }; } : null, `m:${agreementId}`);

  let label: HelpLabel | null = null;
  if (ctx && ctx.kind !== 'money-exception') {
    if (detail?.status === 'ready') {
      const versionId = detail.data.currentVersion?.versionId ?? null;
      // The source screen's version label survives only if the fresh exact Agreement read still agrees; otherwise the fresh title and a calm notice.
      const resolved = resolveHandoffContext({ agreementId: ctx.agreementId, title: ctx.title, versionLabel: ctx.versionLabel, currentVersionId: ctx.currentVersionId }, { title: detail.data.overview.title, currentAgreementVersionId: versionId });
      const same = resolved.context !== detail.data.overview.title;
      label = { title: detail.data.overview.title, versionLabel: same ? ctx.versionLabel : null, currentVersionId: versionId, notice: resolved.notice ? 'The Agreement changed after you opened Help. Help is showing the latest Agreement SecurePay can read.' : null };
    } else if (detail?.status === 'error') label = { title: ctx.title, versionLabel: null, currentVersionId: null, notice: CONTEXT_UNREFRESHED };
    else label = { title: ctx.title, versionLabel: null, currentVersionId: null, notice: null };
  }
  const nb = useCallback(() => <NavBar view="signed-in" onNavigate={navigate} />, [navigate]);
  return <SupportView signedIn={signedIn} ctx={ctx} label={label} reviews={reviews} money={money} nav={nav} onBack={onBack} navBar={signedIn ? nb() : undefined} />;
}
