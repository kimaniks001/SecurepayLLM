import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AlertTriangle } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { SecureAuthCard } from '../../components/SecureAuth';
import type { AuthGateway } from '../../api/securepay/auth';
import { ApiError } from '../../api/securepay/http';
import type { SessionStore } from '../../api/securepay/session';
import type { MoneySessionGateway, MoneySessionViewResponse } from '../../api/securepay/money-session';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { notifyEmbedParent, resolveEmbedOrigin } from './embedContract';

function money(minor: number | null, currency: string) {
  if (minor == null) return '';
  return `${currency} ${(minor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/**
 * Final Completion Phase 2, Section 9/10 -- Hosted SecurePay Money. This same page is what an
 * embedded (iframe) integration would load too (Section 4): it has no external navigation
 * dependency and reuses the identical session/redeem API, proving hosted and embedded share the
 * same backend truth rather than a second authority surface. When loaded inside an allow-listed
 * iframe (see `embedContract.ts`), it notifies the parent frame of readiness, completion and
 * cancellation -- but only ever at an origin verified against the session's own
 * `allowedEmbedOrigins`, never a wildcard or caller-supplied origin.
 *
 * Disclosed scope limit (see HostedMoneySessionService's javadoc): redemption still requires the
 * signed-in identity to be the session's own legitimate actor (named participant, or the session
 * creator for a self-service link) -- this page signs the visitor in rather than trusting the
 * token alone as identity.
 */
export function HostedMoneySessionExperience({ token, gateway, auth, session }: {
  token: string;
  gateway: MoneySessionGateway;
  auth: AuthGateway;
  session: SessionStore;
}) {
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const [view, setView] = useState<MoneySessionViewResponse | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [cancelled, setCancelled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embedOrigin = useMemo(
    () => (view ? resolveEmbedOrigin(view.allowedEmbedOrigins) : null),
    [view],
  );

  useEffect(() => {
    if (sessionState.status !== 'signed-in' || view || result) return;
    setLoading(true); setError(null);
    gateway.resolve(token)
      .then(setView)
      .catch(cause => setError(errorText(cause)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status, token]);

  useEffect(() => {
    if (embedOrigin) notifyEmbedParent(embedOrigin, { type: 'securepay:ready', sessionId: token });
  }, [embedOrigin, token]);

  const redeem = async () => {
    setLoading(true); setError(null);
    try {
      const outcome = await gateway.redeem(token);
      setResult(outcome);
      notifyEmbedParent(embedOrigin, { type: 'securepay:completed', sessionId: token });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setCancelled(true);
    notifyEmbedParent(embedOrigin, { type: 'securepay:cancelled', sessionId: token });
  };

  if (sessionState.status !== 'signed-in') {
    const data = secureAuthView(identityState);
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6">
        <img src={securepayWordmark} alt="SecurePay" className="h-8 w-auto mb-6" />
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center">
            <h1 className="font-display text-2xl text-forest-800">SecurePay Money</h1>
            <p className="mt-2 text-sm text-sand-600">Sign in to continue this Money action.</p>
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
              else if (value === 'cancel_auth') setIdentityController(createIdentityController(auth, session));
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6">
      <img src={securepayWordmark} alt="SecurePay" className="h-8 w-auto mb-6" />
      <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white shadow-card p-6 space-y-4">
        {error && <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-sand-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}
        {cancelled ? (
          <div className="text-sm text-sand-700 space-y-2">
            <p className="font-medium text-forest-800">Cancelled.</p>
            <p>Nothing was progressed.</p>
          </div>
        ) : result ? (
          <div className="text-sm text-sand-700 space-y-2">
            <p className="font-medium text-forest-800">Done.</p>
            <p>This link has now been used and cannot be used again.</p>
          </div>
        ) : view ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-sand-500">SecurePay Money</p>
              {view.agreementTitle && <p className="text-sm text-sand-600">{view.agreementTitle}</p>}
              {view.obligationTitle && <p className="text-sm text-sand-600">{view.obligationTitle}</p>}
            </div>
            <h1 className="font-display text-2xl text-forest-800">Progress {money(view.amountMinorCap, view.currency)}</h1>
            <dl className="text-sm text-sand-700 space-y-1">
              {view.beneficiaryMaskedKsNumber && (
                <div className="flex gap-1"><dt className="text-sand-500">To:</dt><dd>{view.beneficiaryMaskedKsNumber}</dd></div>
              )}
              {view.obligationDescription && (
                <div className="flex gap-1"><dt className="text-sand-500">Why:</dt><dd>{view.obligationDescription}</dd></div>
              )}
              {view.agreementTitle && (
                <div className="flex gap-1"><dt className="text-sand-500">From:</dt><dd>{view.agreementTitle} Agreement Money</dd></div>
              )}
              {view.remainingAfterMinor != null && (
                <div className="flex gap-1"><dt className="text-sand-500">After this:</dt><dd>{money(view.remainingAfterMinor, view.currency)} remains protected</dd></div>
              )}
            </dl>
            {!view.providerSettlementCertified && (
              <p className="text-xs text-sand-500">Progressed within SecurePay -- bank transfer pending certified execution, never shown as Settled.</p>
            )}
            <p className="text-sm text-sand-600">This link only ever does this one bounded action, and only once.</p>
            <button onClick={() => void redeem()} disabled={loading} className="w-full rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Confirm</button>
            {embedOrigin && (
              <button onClick={cancel} disabled={loading} className="w-full rounded-xl border border-cream-200 px-4 py-2 text-sm font-medium text-sand-600 disabled:opacity-50">Cancel</button>
            )}
          </>
        ) : (
          <p className="text-sm text-sand-600">{loading ? 'Loading…' : 'This link is no longer valid.'}</p>
        )}
      </div>
    </div>
  );
}
