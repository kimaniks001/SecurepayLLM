import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type {
  AgreementFundingOptionResponse,
  AgreementFundingQuoteResponse,
  PaymentIntentGateway,
  PaymentIntentResponse,
  PaymentIntentStatus,
} from '../../api/securepay/payment-intent';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

function statusLine(status: PaymentIntentStatus): string {
  switch (status) {
    case 'CREATED':
    case 'INITIATION_PENDING':
      return 'Starting this payment…';
    case 'ACTION_REQUIRED':
      return 'Action required to continue.';
    case 'PROVIDER_PENDING':
      return 'Your provider is processing this payment.';
    case 'CONFIRMATION_PENDING':
      return 'Progressed within SecurePay -- reconciliation with the provider is pending.';
    case 'CONFIRMED':
      return 'Confirmed. This money is now available to protect into your Agreement.';
    case 'FAILED':
      return 'This attempt failed.';
    case 'EXPIRED':
      return 'This attempt expired before it completed.';
    case 'CANCELLED':
      return 'This attempt was cancelled.';
  }
}

const TERMINAL: PaymentIntentStatus[] = ['CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED'];
const POLL_INTERVAL_MS = 3000;

type Stage =
  | { name: 'idle' }
  | { name: 'not-authorized'; reasonCode: string }
  | { name: 'choose-rail'; rails: AgreementFundingOptionResponse[] }
  | { name: 'quoted'; rail: AgreementFundingOptionResponse; quote: AgreementFundingQuoteResponse }
  | { name: 'in-flight'; intent: PaymentIntentResponse; instruction: { type: string | null; metadata: Record<string, unknown> | null; redirectUrl: string | null } | null };

/**
 * Final Completion Phase 2 completion pass, Section 1/10 -- the real PaymentIntent execution UI:
 * rail discovery, choose rail, initiate, provider authorization/instruction, provider-pending,
 * reconciliation-pending (CONFIRMATION_PENDING), terminal state, and retry (always by creating a
 * new intent -- this state machine never lets a terminal, unsuccessful intent be re-initiated).
 * This frontend never decides rail eligibility: an unavailable/disabled/uncertified rail simply
 * never appears in `fundingOptions`, and any 409/403 the backend returns is shown as-is.
 */
export function PaymentIntentFundingSection({ agreementId, gateway, onFunded }: {
  agreementId: string;
  gateway: PaymentIntentGateway;
  onFunded: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ name: 'idle' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const pollIntent = (paymentIntentId: string) => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void gateway.get(paymentIntentId).then(intent => {
        setStage(current => current.name === 'in-flight' ? { ...current, intent } : current);
        if (TERMINAL.includes(intent.status)) {
          stopPolling();
          if (intent.status === 'CONFIRMED') onFunded();
        }
      }).catch(() => { /* transient poll failure -- next tick retries */ });
    }, POLL_INTERVAL_MS);
  };

  const start = async () => {
    setLoading(true); setError(null);
    try {
      const authority = await gateway.fundingAuthority(agreementId);
      if (!authority.authorized) { setStage({ name: 'not-authorized', reasonCode: authority.reasonCode }); return; }
      const options = await gateway.fundingOptions(agreementId);
      setStage({ name: 'choose-rail', rails: options.items });
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const chooseRail = async (rail: AgreementFundingOptionResponse) => {
    if (!rail.quoteAvailable) { await proceed(rail, undefined); return; }
    setLoading(true); setError(null);
    try {
      const quote = await gateway.createQuote(agreementId, rail.railCode);
      setStage({ name: 'quoted', rail, quote });
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const proceed = async (rail: AgreementFundingOptionResponse, quoteReference: string | undefined) => {
    setLoading(true); setError(null);
    try {
      const created = await gateway.createIntent(agreementId);
      const initiated = await gateway.initiate(created.paymentIntentId, rail.railCode, quoteReference);
      const intent = await gateway.get(created.paymentIntentId);
      setStage({
        name: 'in-flight',
        intent,
        instruction: { type: initiated.clientInstructionType, metadata: initiated.clientInstructionMetadata, redirectUrl: initiated.redirectUrl },
      });
      if (!TERMINAL.includes(intent.status)) pollIntent(created.paymentIntentId);
      else if (intent.status === 'CONFIRMED') onFunded();
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const reset = () => { stopPolling(); setStage({ name: 'idle' }); setError(null); };

  return (
    <div className="rounded-xl border border-cream-200 p-3 space-y-3">
      <div className="text-sm font-medium text-forest-800">Funding needed</div>
      {error && <StatusNotice tone="warning">{error}</StatusNotice>}

      {stage.name === 'idle' && (
        <Button variant="secondary" onClick={() => void start()} disabled={loading}>Add money</Button>
      )}

      {stage.name === 'not-authorized' && (
        <p className="text-xs text-sand-600">Funding is not available right now ({stage.reasonCode}).</p>
      )}

      {stage.name === 'choose-rail' && (
        stage.rails.length === 0 ? (
          <p className="text-xs text-sand-600">No funding rail is currently available.</p>
        ) : (
          <ul className="space-y-2">
            {stage.rails.map(rail => (
              <li key={rail.railCode}>
                <button onClick={() => void chooseRail(rail)} disabled={loading} className="w-full text-left rounded-xl border border-cream-200 p-3 hover:border-forest-200 hover:bg-cream-50 disabled:opacity-50">
                  <div className="font-medium text-forest-800">{rail.displayName}</div>
                  {(rail.minimumAmountMinor != null || rail.maximumAmountMinor != null) && (
                    <div className="text-xs text-sand-600">
                      {rail.minimumAmountMinor != null && <>Min <MoneyValue amount={money(rail.minimumAmountMinor, rail.currency)} size="sm" /></>}
                      {rail.minimumAmountMinor != null && rail.maximumAmountMinor != null && ' · '}
                      {rail.maximumAmountMinor != null && <>Max <MoneyValue amount={money(rail.maximumAmountMinor, rail.currency)} size="sm" /></>}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      {stage.name === 'quoted' && (
        <div className="space-y-2">
          <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
            <div><MoneyValue amount={money(stage.quote.amountMinor, stage.quote.currency)} size="md" /> via {stage.rail.displayName}</div>
            <div className="text-xs text-sand-600">Provider fee {money(stage.quote.providerChargeMinor, stage.quote.currency)} + platform fee {money(stage.quote.platformChargeMinor, stage.quote.currency)} = <MoneyValue amount={money(stage.quote.totalChargeMinor, stage.quote.currency)} size="sm" /> total charge</div>
            <div className="text-xs text-sand-500">Quote expires {new Date(stage.quote.expiresAt).toLocaleTimeString()}</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void proceed(stage.rail, stage.quote.quoteReference)} disabled={loading}>Continue</Button>
            <Button variant="ghost" onClick={reset} disabled={loading}>Choose another rail</Button>
          </div>
        </div>
      )}

      {stage.name === 'in-flight' && (
        <div className="space-y-2">
          <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
            <div><MoneyValue amount={money(stage.intent.amountMinor, stage.intent.currency)} size="md" /></div>
            <div className="text-xs text-sand-600">{statusLine(stage.intent.status)}</div>
          </div>
          {stage.instruction?.type && (
            <div className="rounded-xl border border-forest-200 bg-forest-50 p-3 text-xs text-forest-800 space-y-1">
              <div className="font-medium">{stage.instruction.type}</div>
              {stage.instruction.metadata && Object.entries(stage.instruction.metadata).map(([key, value]) => (
                <div key={key}>{key}: {String(value)}</div>
              ))}
            </div>
          )}
          {stage.instruction?.redirectUrl && (
            <a href={stage.instruction.redirectUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-forest-700 underline">Continue with provider</a>
          )}
          {TERMINAL.includes(stage.intent.status) && stage.intent.status !== 'CONFIRMED' && (
            <Button variant="secondary" onClick={reset}>Try again</Button>
          )}
          {stage.intent.status === 'CONFIRMED' && (
            <Button variant="secondary" onClick={reset}>Done</Button>
          )}
        </div>
      )}
    </div>
  );
}
