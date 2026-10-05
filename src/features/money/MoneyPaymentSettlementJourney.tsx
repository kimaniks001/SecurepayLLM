import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Landmark,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { ApiError } from '../../api/securepay/http';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type {
  AgreementFundingOptionResponse,
  AgreementFundingQuoteResponse,
  AgreementPaymentIntentCreateResponse,
  AgreementPaymentIntentSummaryResponse,
  InitiatePaymentResponse,
  PaymentAttemptResponse,
  PaymentIntentGateway,
  PaymentIntentResponse,
  PaymentIntentStatus,
} from '../../api/securepay/payment-intent';
import type {
  PaymentReleaseGateway,
  ReleaseAuthorityResponse,
  ReleaseInstructionResponse,
  ReleaseSettlementStatusResponse,
} from '../../api/securepay/payment-release';
import type {
  ExternalDestinationAccountKind,
  RegisterMySettlementDestinationRequest,
  SettlementDestinationGateway,
  SettlementVerificationStatusResponse,
} from '../../api/securepay/settlement-destinations';
import type { AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { createAttemptStore, isUncertainFinancialError, UNCERTAIN_MONEY, UNRESOLVED_ATTEMPT } from './attempt';
import { moneyText } from './amount';
import { readSettlementScope, submitDestination, type ScopeRead } from './settlementDestination';

type Load<T> =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; value: T };

interface QuoteSelection {
  quote: AgreementFundingQuoteResponse;
  rail: AgreementFundingOptionResponse;
  agreementVersionId: string;
}

interface PaymentEvidence {
  intent: PaymentIntentResponse;
  attempts: PaymentAttemptResponse[];
}

interface SettlementRead {
  authority: Load<ReleaseAuthorityResponse>;
  instructions: Load<ReleaseInstructionResponse[]>;
  statuses: Record<string, Load<ReleaseSettlementStatusResponse>>;
}

interface Props {
  agreementGateway: AgreementGateway;
  paymentIntentGateway: PaymentIntentGateway;
  settlementGateway: SettlementDestinationGateway;
  paymentReleaseGateway: PaymentReleaseGateway;
  agreement: CurrentUserAgreementSummaryResponse | null;
  agreementId: string;
  agreementTitle: string;
  currency: string | null;
  snapshot: AgreementMoneySnapshotResponse | null;
  onMoneyRefresh: () => void;
}

const IN_FLIGHT: PaymentIntentStatus[] = [
  'CREATED',
  'INITIATION_PENDING',
  'ACTION_REQUIRED',
  'PROVIDER_PENDING',
  'CONFIRMATION_PENDING',
];

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, letter => letter.toUpperCase());
}

function formatWhen(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toLocaleString();
}

function errorWords(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this request.';
}

function humanBearer(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'CUSTOMER' || normalized === 'PAYER') return 'The payer';
  if (normalized === 'RECIPIENT') return 'The recipient';
  if (normalized === 'PLATFORM') return 'SecurePay';
  if (normalized === 'NONE') return 'No separate bearer';
  if (normalized === 'UNRESOLVED') return 'Not yet resolved';
  return 'SecurePay has not provided a customer-facing bearer description.';
}

function paymentStatus(status: PaymentIntentStatus) {
  const words: Record<PaymentIntentStatus, { heading: string; detail: string; tone: 'good' | 'warn' | 'neutral' }> = {
    CREATED: { heading: 'Payment prepared', detail: 'The Agreement-bound payment exists but has not been sent to the provider.', tone: 'neutral' },
    INITIATION_PENDING: { heading: 'Starting payment', detail: 'SecurePay is sending the payment instruction to the provider.', tone: 'neutral' },
    ACTION_REQUIRED: { heading: 'Action required', detail: 'The provider requires a customer step before this payment can continue.', tone: 'warn' },
    PROVIDER_PENDING: { heading: 'Provider processing', detail: 'Your payment has been sent to the provider. SecurePay is waiting for confirmation. Do not make another payment yet.', tone: 'neutral' },
    CONFIRMATION_PENDING: { heading: 'Confirmation pending', detail: 'SecurePay has not yet received enough evidence to mark this payment complete. Do not make another payment yet.', tone: 'neutral' },
    CONFIRMED: { heading: 'Funding confirmed', detail: 'SecurePay has confirmed this payment. Refresh Agreement Money to see the resulting funded position.', tone: 'good' },
    FAILED: { heading: 'Payment failed', detail: 'The provider/payment state says this attempt failed.', tone: 'warn' },
    EXPIRED: { heading: 'Payment expired', detail: 'This payment attempt expired before completion.', tone: 'warn' },
    CANCELLED: { heading: 'Payment cancelled', detail: 'This payment attempt was cancelled.', tone: 'warn' },
  };
  return words[status];
}

function providerInstruction(result: InitiatePaymentResponse | null) {
  if (!result) return null;
  if (result.status === 'PROVIDER_PENDING') {
    return {
      heading: 'Provider processing',
      detail: 'SecurePay is waiting for the provider. Do not make another payment yet.',
    };
  }
  if (result.clientInstructionType === 'STK_PUSH') {
    return {
      heading: 'Check your phone',
      detail: 'Complete the M-PESA request sent by the provider. SecurePay will wait for authoritative confirmation.',
    };
  }
  if (result.redirectUrl) {
    return {
      heading: 'Continue with provider',
      detail: 'The provider has returned a secure continuation step. Use it only for this payment attempt.',
    };
  }
  if (result.status === 'ACTION_REQUIRED') {
    return {
      heading: 'Provider action required',
      detail: 'SecurePay is waiting for you to complete the provider step.',
    };
  }
  return null;
}

function safeProviderUrl(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function quoteExpired(quote: AgreementFundingQuoteResponse) {
  const expiry = Date.parse(quote.expiresAt);
  return Number.isFinite(expiry) && expiry <= Date.now();
}

function QuoteReview({
  selection,
  busy,
  stale,
  onContinue,
}: {
  selection: QuoteSelection;
  busy: boolean;
  stale: boolean;
  onContinue: () => void;
}) {
  const { quote, rail } = selection;
  const blocked = quote.economicState !== 'READY';
  const expired = quoteExpired(quote);
  return (
    <div className="rounded-2xl border border-forest-200 bg-forest-50/70 p-5" data-testid="build2-quote-review">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Review funding</div>
          <h4 className="mt-1 font-display text-xl text-forest-900">{rail.displayName}</h4>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${blocked || expired || stale ? 'bg-ember-100 text-ember-800' : 'bg-forest-100 text-forest-800'}`}>
          {stale ? 'Agreement changed' : expired ? 'Quote expired' : blocked ? 'Blocked' : 'Ready'}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-sand-600">Agreement principal</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(quote.amountMinor, quote.currency)} size="sm" /></dd></div>
        <div className="flex justify-between gap-4"><dt className="text-sand-600">SecurePay charge</dt><dd className="font-medium text-forest-900"><MoneyValue amount={moneyText(quote.platformChargeMinor, quote.currency)} size="sm" /></dd></div>
        <div className="flex justify-between gap-4"><dt className="text-sand-600">Rail / provider charge</dt><dd className="font-medium text-forest-900">{quote.providerChargeMinor == null ? 'Not confirmed' : <MoneyValue amount={moneyText(quote.providerChargeMinor, quote.currency)} size="sm" />}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-sand-600">Tax</dt><dd className="text-right text-sand-600">Not separately provided by this funding quote</dd></div>
        <div className="flex justify-between gap-4 border-t border-forest-200 pt-3"><dt className="font-semibold text-forest-900">Total payable</dt><dd className="font-semibold text-forest-900">{quote.totalChargeMinor == null ? 'Not confirmed' : <MoneyValue amount={moneyText(quote.totalChargeMinor, quote.currency)} size="sm" />}</dd></div>
      </dl>

      <div className="mt-4 rounded-xl border border-cream-200 bg-white/70 p-3 text-xs leading-5 text-sand-600">
        <div><strong className="text-forest-900">SecurePay charge:</strong> {humanBearer(quote.feeBearer)} bears this charge.</div>
        <div><strong className="text-forest-900">Rail charge:</strong> {humanBearer(quote.railChargeBearer)} bears this charge.</div>
        <div><strong className="text-forest-900">Payer role:</strong> {humanBearer(quote.payerRole)}.</div>
      </div>

      <div className="mt-4 text-xs leading-5 text-sand-500">
        Quote valid until {formatWhen(quote.expiresAt) ?? 'an unknown time'}.
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-forest-700">Pricing details</summary>
          <div className="mt-1">Pricing version: {quote.pricingVersion} · Economic state: {titleCase(quote.economicState)} · Economic reason: {titleCase(quote.economicReasonCode)}</div>
        </details>
      </div>

      {stale && (
        <StatusNotice tone="warning">
          This Agreement changed after this price was prepared. Review the current Agreement and refresh the payment details before continuing.
        </StatusNotice>
      )}
      {blocked && (
        <StatusNotice tone="warning">
          SecurePay’s funding economics are blocked for this quote. The payment cannot be confirmed from this price.
        </StatusNotice>
      )}
      {expired && (
        <StatusNotice tone="warning">This price has expired. Prepare a fresh funding quote before continuing.</StatusNotice>
      )}

      <div className="mt-4">
        <Button onClick={onContinue} disabled={busy || blocked || expired || stale}>
          {busy ? 'Preparing payment…' : 'Continue to funding'}
        </Button>
      </div>
    </div>
  );
}

function PaymentTimeline({ evidence }: { evidence: PaymentEvidence }) {
  const status = paymentStatus(evidence.intent.status);
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/70 p-4" data-testid="build2-payment-evidence">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-forest-900">{status.heading}</div>
          <p className="mt-1 text-xs leading-5 text-sand-600">{status.detail}</p>
        </div>
        <MoneyValue amount={moneyText(evidence.intent.amountMinor, evidence.intent.currency)} size="sm" />
      </div>

      {evidence.intent.confirmedAt && (
        <div className="mt-3 rounded-xl bg-forest-50 p-3 text-sm text-forest-900">
          Confirmed {formatWhen(evidence.intent.confirmedAt) ?? 'at the time recorded by SecurePay'}.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {evidence.attempts.length === 0 ? (
          <p className="text-xs text-sand-500">No provider attempt has been recorded for this payment yet.</p>
        ) : evidence.attempts.map(attempt => (
          <div key={attempt.id} className="border-l-2 border-cream-300 pl-3">
            <div className="text-xs font-medium text-forest-900">{formatWhen(attempt.submittedAt) ?? 'Time unavailable'} · Payment attempt {attempt.attemptNumber}</div>
            <div className="mt-1 text-xs text-sand-600">{attempt.providerIdentifier} · {titleCase(attempt.initiationStatus)}</div>
            {attempt.responseAt && <div className="text-xs text-sand-500">Provider response recorded {formatWhen(attempt.responseAt)}</div>}
            <details className="mt-1 text-xs text-sand-500">
              <summary className="cursor-pointer">Payment details</summary>
              <div className="mt-1">
                Provider reference: {attempt.providerReference ?? 'Not provided'}.
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function coolingOffMessage(until: string | null) {
  if (!until) return null;
  const parsed = Date.parse(until);
  if (!Number.isFinite(parsed)) return 'This destination has a protection delay SecurePay cannot display safely.';
  if (parsed > Date.now()) {
    return `Settlement destination changed. For your protection, money cannot be sent to this new destination until ${new Date(parsed).toLocaleString()}. Money remains protected by the Agreement while this destination is cooling off.`;
  }
  return `The destination protection delay ended ${new Date(parsed).toLocaleString()}.`;
}

function settlementStage(status: ReleaseSettlementStatusResponse | null) {
  if (!status) return { heading: 'Settlement status unavailable', detail: 'SecurePay cannot confirm settlement availability right now.', settled: false };
  if (status.exception) return { heading: 'Settlement needs attention', detail: status.exception.customerSafeReason ?? 'SecurePay has recorded a settlement exception.', settled: false };
  if (status.settledAt) return { heading: 'Settled', detail: 'SecurePay has authoritative settlement completion evidence for this release.', settled: true };
  if (status.settlementPhase === 'INSTRUCTION_CREATED') return { heading: 'Settlement instruction created', detail: 'A release instruction exists. Money has not been reported as settled.', settled: false };
  if (status.settlementPhase === 'RESERVED') return { heading: 'Funds reserved', detail: 'SecurePay has reserved the release amount. Provider settlement is not complete.', settled: false };
  if (status.settlementPhase === 'SETTLED') return { heading: 'Provider processing', detail: 'SecurePay has an execution record but no settled time, so this is not shown as settled.', settled: false };
  if (status.settlementPhase === 'HELD_EXCEPTION') return { heading: 'Settlement needs attention', detail: 'SecurePay has placed this settlement in a held exception state.', settled: false };
  if (status.settlementPhase === 'COMPENSATED') return { heading: 'Settlement did not complete', detail: 'SecurePay records compensation for this release. That does not mean the original Agreement Money authority has been restored.', settled: false };
  return { heading: 'Settlement status', detail: 'SecurePay returned a settlement phase this screen cannot describe yet.', settled: false };
}

export function MoneyPaymentSettlementJourney({
  agreementGateway,
  paymentIntentGateway,
  settlementGateway,
  paymentReleaseGateway,
  agreement,
  agreementId,
  agreementTitle,
  currency,
  snapshot,
  onMoneyRefresh,
}: Props) {
  const [intents, setIntents] = useState<Load<AgreementPaymentIntentSummaryResponse[]>>({ state: 'loading' });
  const [paymentEvidence, setPaymentEvidence] = useState<PaymentEvidence | null>(null);
  const [quoteSelection, setQuoteSelection] = useState<QuoteSelection | null>(null);
  const [quoteBusy, setQuoteBusy] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteStale, setQuoteStale] = useState(false);
  const [createdIntent, setCreatedIntent] = useState<AgreementPaymentIntentCreateResponse | null>(null);
  const [initiation, setInitiation] = useState<InitiatePaymentResponse | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const createIntentAttempt = useRef(createAttemptStore());
  const initiateAttempt = useRef(createAttemptStore());

  const [destination, setDestination] = useState<ScopeRead | null>(null);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [verification, setVerification] = useState<SettlementVerificationStatusResponse | null>(null);
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [destinationMode, setDestinationMode] = useState<'register' | 'replace'>('register');
  const [accountKind, setAccountKind] = useState<ExternalDestinationAccountKind>('BANK');
  const [destinationType, setDestinationType] = useState<RegisterMySettlementDestinationRequest['destinationType']>('PRIMARY_SETTLEMENT');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [destinationUncertain, setDestinationUncertain] = useState(false);
  const destinationAttempts = useRef({ main: createAttemptStore(), verification: createAttemptStore() });

  const [release, setRelease] = useState<SettlementRead>({
    authority: { state: 'loading' },
    instructions: { state: 'loading' },
    statuses: {},
  });

  const fundingOptions = snapshot?.fundingOptions ?? [];
  const currentVersionId = snapshot?.currentVersionId ?? null;
  const scopeCurrency = currency?.toUpperCase() ?? null;

  const loadIntents = async () => {
    setIntents({ state: 'loading' });
    try {
      const response = await paymentIntentGateway.listIntents(agreementId, 0, 50);
      setIntents({ state: 'ready', value: response.items });
    } catch {
      setIntents({ state: 'error' });
    }
  };

  const loadDestination = async () => {
    if (!scopeCurrency || !/^[A-Z]{3}$/.test(scopeCurrency)) {
      setDestination(null);
      return;
    }
    setDestinationLoading(true);
    setDestinationError(null);
    setVerification(null);
    try {
      setDestination(await readSettlementScope(settlementGateway, scopeCurrency));
    } catch {
      setDestinationError('SecurePay could not read your settlement destination right now.');
    } finally {
      setDestinationLoading(false);
    }
  };

  const loadRelease = async () => {
    setRelease({ authority: { state: 'loading' }, instructions: { state: 'loading' }, statuses: {} });
    const [authorityResult, instructionsResult] = await Promise.allSettled([
      paymentReleaseGateway.releaseAuthority(agreementId),
      paymentReleaseGateway.instructions(agreementId),
    ]);

    const authority: Load<ReleaseAuthorityResponse> = authorityResult.status === 'fulfilled'
      ? { state: 'ready', value: authorityResult.value }
      : { state: 'error' };

    if (instructionsResult.status !== 'fulfilled') {
      setRelease({ authority, instructions: { state: 'error' }, statuses: {} });
      return;
    }

    const instructions = instructionsResult.value;
    const statusEntries = await Promise.all(instructions.map(async instruction => {
      try {
        const value = await paymentReleaseGateway.settlementStatus(agreementId, instruction.instructionId);
        return [instruction.instructionId, { state: 'ready', value } as Load<ReleaseSettlementStatusResponse>] as const;
      } catch {
        return [instruction.instructionId, { state: 'error' } as Load<ReleaseSettlementStatusResponse>] as const;
      }
    }));
    setRelease({
      authority,
      instructions: { state: 'ready', value: instructions },
      statuses: Object.fromEntries(statusEntries),
    });
  };

  useEffect(() => {
    setQuoteSelection(null);
    setQuoteError(null);
    setQuoteStale(false);
    setCreatedIntent(null);
    setInitiation(null);
    setPaymentEvidence(null);
    setPaymentError(null);
    createIntentAttempt.current = createAttemptStore();
    initiateAttempt.current = createAttemptStore();
    destinationAttempts.current = { main: createAttemptStore(), verification: createAttemptStore() };
    setDestinationUncertain(false);
    setShowDestinationForm(false);
    void loadIntents();
    void loadDestination();
    void loadRelease();
    // The selected Agreement id/currency define this entire journey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId, scopeCurrency]);

  const prepareQuote = async (rail: AgreementFundingOptionResponse) => {
    setQuoteError(null);
    setQuoteStale(false);
    setCreatedIntent(null);
    setInitiation(null);
    if (!rail.quoteAvailable) {
      setQuoteSelection(null);
      setQuoteError('SecurePay does not offer a quote step for this rail right now.');
      return;
    }
    if (!snapshot || !currentVersionId || !snapshot.feeQuoteRequestsPermitted) {
      setQuoteSelection(null);
      setQuoteError('SecurePay cannot provide an authoritative price for this rail right now.');
      return;
    }
    setQuoteBusy(rail.railCode);
    try {
      const quote = await paymentIntentGateway.createVersionBoundQuote(agreementId, rail.railCode, currentVersionId);
      setQuoteSelection({ quote, rail, agreementVersionId: currentVersionId });
    } catch (error) {
      setQuoteSelection(null);
      setQuoteError(errorWords(error));
    } finally {
      setQuoteBusy(null);
    }
  };

  const createPaymentIntent = async () => {
    if (!quoteSelection) return;
    const { quote, rail, agreementVersionId } = quoteSelection;
    setPaymentError(null);
    setQuoteStale(false);
    if (quoteExpired(quote)) {
      setPaymentError('This funding quote has expired. Prepare a fresh quote before continuing.');
      return;
    }

    setPaymentBusy(true);
    try {
      const detail = await agreementGateway.detail(agreementId);
      const liveVersion = detail.currentVersion?.versionId ?? null;
      if (!liveVersion || liveVersion !== agreementVersionId) {
        setQuoteStale(true);
        setPaymentError('This Agreement changed after this price was prepared. Review the current Agreement and refresh the payment details before continuing.');
        return;
      }

      const signature = JSON.stringify({ agreementId, agreementVersionId, quoteReference: quote.quoteReference, railCode: rail.railCode });
      const key = createIntentAttempt.current.keyFor(signature);
      if (!key.ok) {
        setPaymentError(UNRESOLVED_ATTEMPT);
        return;
      }

      try {
        const created = await paymentIntentGateway.createIntent(
          agreementId,
          agreementVersionId,
          quote.quoteReference,
          key.key,
        );
        createIntentAttempt.current.settle();
        setCreatedIntent(created);
        await loadIntents();
      } catch (error) {
        if (isUncertainFinancialError(error)) {
          setPaymentError(`${UNCERTAIN_MONEY} Try the same request again; SecurePay will reuse the same request key.`);
        } else {
          createIntentAttempt.current.settle();
          if (error instanceof ApiError && error.status === 409) {
            setQuoteStale(true);
            setPaymentError('This Agreement changed after this price was prepared. Review the current Agreement and refresh the payment details before continuing.');
          } else {
            setPaymentError(errorWords(error));
          }
        }
      }
    } catch (error) {
      setPaymentError(errorWords(error));
    } finally {
      setPaymentBusy(false);
    }
  };

  const initiatePayment = async () => {
    if (!quoteSelection || !createdIntent) return;
    setPaymentBusy(true);
    setPaymentError(null);
    const signature = JSON.stringify({
      paymentIntentId: createdIntent.paymentIntentId,
      providerIdentifier: quoteSelection.rail.railCode,
      quoteReference: quoteSelection.quote.quoteReference,
    });
    const key = initiateAttempt.current.keyFor(signature);
    if (!key.ok) {
      setPaymentError(UNRESOLVED_ATTEMPT);
      setPaymentBusy(false);
      return;
    }
    try {
      const result = await paymentIntentGateway.initiate(
        createdIntent.paymentIntentId,
        quoteSelection.rail.railCode,
        key.key,
        quoteSelection.quote.quoteReference,
      );
      initiateAttempt.current.settle();
      setInitiation(result);
      await loadIntents();
      if (result.status === 'CONFIRMED') onMoneyRefresh();
    } catch (error) {
      if (isUncertainFinancialError(error)) {
        setPaymentError(`${UNCERTAIN_MONEY} Do not start another payment. Try the same initiation again so SecurePay can reconcile the existing attempt.`);
      } else {
        initiateAttempt.current.settle();
        setPaymentError(errorWords(error));
      }
    } finally {
      setPaymentBusy(false);
    }
  };

  const openPaymentEvidence = async (intentId: string) => {
    setPaymentError(null);
    setPaymentEvidence(null);
    try {
      const [intent, attempts] = await Promise.all([
        paymentIntentGateway.get(intentId),
        paymentIntentGateway.listAttempts(intentId),
      ]);
      setPaymentEvidence({ intent, attempts });
      if (intent.status === 'CONFIRMED') onMoneyRefresh();
    } catch (error) {
      setPaymentError(errorWords(error));
    }
  };

  const submitSettlementDestination = async () => {
    if (!scopeCurrency || !accountNumber.trim() || !beneficiaryName.trim()) return;
    setDestinationLoading(true);
    setDestinationError(null);
    const outcome = await submitDestination(
      settlementGateway,
      destinationAttempts.current,
      destinationMode,
      {
        accountKind,
        bankCode,
        accountNumber,
        beneficiaryName,
        currency: scopeCurrency,
        destinationType,
      },
    );
    if (outcome.kind === 'ok') {
      setDestination(outcome.scope);
      setShowDestinationForm(false);
      setDestinationUncertain(false);
      setAccountNumber('');
      setBeneficiaryName('');
      setBankCode('');
      setVerification(null);
      void loadRelease();
    } else if (outcome.kind === 'uncertain') {
      setDestinationUncertain(true);
      setDestinationError(`${UNCERTAIN_MONEY} Try the same destination request again; SecurePay will reuse the same request keys.`);
    } else if (outcome.kind === 'refused') {
      setDestinationError(UNRESOLVED_ATTEMPT);
    } else {
      setDestinationUncertain(false);
      setDestinationError(errorWords(outcome.error));
    }
    setDestinationLoading(false);
  };

  const checkDestinationVerification = async () => {
    const current = destination?.current.state === 'found' ? destination.current.value : null;
    if (!current) return;
    setDestinationLoading(true);
    setDestinationError(null);
    try {
      setVerification(await settlementGateway.verificationStatus(current.destinationId));
    } catch (error) {
      setDestinationError(errorWords(error));
    } finally {
      setDestinationLoading(false);
    }
  };

  const currentInstruction = useMemo(() => {
    if (release.instructions.state !== 'ready') return null;
    const current = currentVersionId
      ? release.instructions.value.filter(instruction => instruction.agreementVersion === currentVersionId)
      : [];
    return [...current].sort((a, b) => b.sequence - a.sequence)[0] ?? null;
  }, [currentVersionId, release.instructions]);

  const currentSettlementRead = currentInstruction ? release.statuses[currentInstruction.instructionId] ?? null : null;
  const currentSettlementStatus = currentSettlementRead?.state === 'ready' ? currentSettlementRead.value : null;

  const latestIntent = intents.state === 'ready' ? intents.value[0] ?? null : null;
  const guide = useMemo(() => {
    const settlement = settlementStage(currentSettlementStatus);
    if (currentSettlementStatus?.settledAt) {
      return { stage: 'Settled', next: agreement?.nextActions?.[0]?.reason ?? 'No further money action is shown for this Agreement.' };
    }
    if (currentInstruction) {
      return { stage: settlement.heading, next: currentSettlementStatus?.exception?.requiredAction ?? 'No action is required while SecurePay waits for settlement evidence.' };
    }
    if (release.authority.state === 'ready' && release.authority.value.authorized) {
      return { stage: 'Release available', next: agreement?.nextActions?.[0]?.reason ?? 'Review the release conditions and authorised destination.' };
    }
    if (latestIntent && IN_FLIGHT.includes(latestIntent.status)) {
      return { stage: paymentStatus(latestIntent.status).heading, next: paymentStatus(latestIntent.status).detail };
    }
    if (latestIntent?.status === 'CONFIRMED') {
      return { stage: 'Funding confirmed', next: agreement?.nextActions?.[0]?.reason ?? 'Continue with the Agreement work and milestones.' };
    }
    if (snapshot?.paymentReady.state === 'EVALUATED' && snapshot.paymentReady.ready) {
      return { stage: 'Ready for funding', next: agreement?.nextActions?.[0]?.reason ?? 'Choose an eligible funding route.' };
    }
    return { stage: 'Agreement conditions in progress', next: agreement?.nextActions?.[0]?.reason ?? 'Complete the Agreement steps SecurePay requires before funding.' };
  }, [agreement, currentInstruction, currentSettlementStatus, latestIntent, release.authority, snapshot]);

  const currentDestination = destination?.current.state === 'found' ? destination.current.value : null;
  const providerStep = providerInstruction(initiation);
  const providerUrl = safeProviderUrl(initiation?.redirectUrl ?? null);

  return (
    <section className="space-y-5" data-testid="money-build2-journey">
      <div className="rounded-3xl border border-forest-200 bg-forest-900 p-5 text-cream-50 md:p-6">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-forest-200">Where we are</div>
        <div className="mt-2 grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-end">
          <div>
            <h2 className="font-display text-2xl text-cream-50">{guide.stage}</h2>
            <p className="mt-2 text-sm text-cream-100">{agreementTitle}</p>
          </div>
          <div className="rounded-2xl border border-forest-700 bg-forest-800/70 p-4">
            <div className="text-xs uppercase tracking-wide text-forest-200">Next</div>
            <p className="mt-2 text-sm leading-6 text-cream-50">{guide.next}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-forest-700" />
            <div>
              <h2 className="font-display text-2xl text-forest-900">Funding this Agreement</h2>
              <p className="text-sm text-sand-600">Review the authoritative cost before creating a payment.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {fundingOptions.length === 0 ? (
              <p className="rounded-xl bg-cream-50 p-4 text-sm text-sand-600">No funding route is currently available for this Agreement.</p>
            ) : fundingOptions.map(rail => (
              <div key={rail.railCode} className="rounded-2xl border border-cream-200 bg-cream-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {rail.railCode === 'MPESA_STK' ? <Smartphone className="h-4 w-4 text-forest-700" /> : <Landmark className="h-4 w-4 text-forest-700" />}
                      <span className="font-semibold text-forest-900">{rail.displayName}</span>
                    </div>
                    <div className="mt-1 text-xs text-sand-500">
                      {rail.currency}
                      {rail.minimumAmountMinor != null ? ` · minimum ${moneyText(rail.minimumAmountMinor, rail.currency)}` : ''}
                      {rail.maximumAmountMinor != null ? ` · maximum ${moneyText(rail.maximumAmountMinor, rail.currency)}` : ''}
                    </div>
                  </div>
                  {rail.quoteAvailable ? (
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      disabled={quoteBusy !== null || !snapshot?.feeQuoteRequestsPermitted}
                      onClick={() => void prepareQuote(rail)}
                    >
                      {quoteBusy === rail.railCode ? 'Preparing price…' : 'Review funding'}
                    </Button>
                  ) : (
                    <div className="text-xs text-sand-500">No quote step for this rail.</div>
                  )}
                </div>
                {!rail.quoteAvailable && rail.railCode === 'MPESA_STK' && (
                  <p className="mt-2 text-xs leading-5 text-sand-600">
                    M-PESA remains a funding rail, but SecurePay will not manufacture a provider quote when the backend says none is available.
                  </p>
                )}
              </div>
            ))}
          </div>

          {quoteError && <div className="mt-4"><StatusNotice tone="warning">{quoteError}</StatusNotice></div>}
          {quoteSelection && (
            <div className="mt-5">
              <QuoteReview
                selection={quoteSelection}
                busy={paymentBusy}
                stale={quoteStale}
                onContinue={() => void createPaymentIntent()}
              />
            </div>
          )}

          {createdIntent && quoteSelection && (
            <div className="mt-5 rounded-2xl border border-cream-200 bg-white p-4">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Payment prepared</div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-forest-900">{agreementTitle}</div>
                  <div className="mt-1 text-sm text-sand-600">
                    <MoneyValue amount={moneyText(createdIntent.amountMinor, createdIntent.currency)} size="sm" /> · {quoteSelection.rail.displayName}
                  </div>
                </div>
                <Button onClick={() => void initiatePayment()} disabled={paymentBusy}>
                  {paymentBusy ? 'Starting…' : `Start with ${quoteSelection.rail.displayName}`}
                </Button>
              </div>
            </div>
          )}

          {paymentError && <div className="mt-4"><StatusNotice tone="warning">{paymentError}</StatusNotice></div>}

          {providerStep && (
            <div className="mt-5 rounded-2xl border border-forest-200 bg-forest-50 p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 text-forest-700" />
                <div>
                  <h4 className="font-semibold text-forest-900">{providerStep.heading}</h4>
                  <p className="mt-1 text-sm leading-6 text-sand-700">{providerStep.detail}</p>
                  {providerUrl && (
                    <Button
                      variant="secondary"
                      className="mt-3 min-h-11"
                      onClick={() => window.location.assign(providerUrl)}
                    >
                      Continue securely with provider
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-cream-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl text-forest-900">Payment journey</h3>
                <p className="mt-1 text-xs text-sand-500">A payment is a stateful journey. Pending is never treated as success or failure.</p>
              </div>
              <Button variant="ghost" onClick={() => void loadIntents()}>Refresh</Button>
            </div>

            {intents.state === 'loading' && <p role="status" className="mt-3 text-sm text-sand-500">Loading Agreement payments…</p>}
            {intents.state === 'error' && <div className="mt-3"><StatusNotice tone="warning">Payments could not be loaded, so SecurePay will not guess whether one is in progress.</StatusNotice></div>}
            {intents.state === 'ready' && intents.value.length === 0 && <p className="mt-3 text-sm text-sand-600">No payment attempt has been recorded for this Agreement.</p>}
            {intents.state === 'ready' && intents.value.length > 0 && (
              <div className="mt-3 space-y-2">
                {intents.value.map(intent => {
                  const words = paymentStatus(intent.status);
                  return (
                    <div key={intent.id} className="rounded-2xl border border-cream-200 bg-cream-50/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-forest-900">{words.heading}</div>
                          <p className="mt-1 max-w-2xl text-xs leading-5 text-sand-600">{words.detail}</p>
                        </div>
                        <MoneyValue amount={moneyText(intent.amountMinor, intent.currency)} size="sm" />
                      </div>
                      {intent.retryEligible && (
                        <p className="mt-2 text-xs text-sand-600">
                          This attempt did not complete. A retry must start a fresh funding attempt with a fresh current quote; SecurePay does not re-initiate this terminal intent.
                        </p>
                      )}
                      <div className="mt-3">
                        <Button variant="ghost" onClick={() => void openPaymentEvidence(intent.id)}>Payment details</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {paymentEvidence && <div className="mt-4"><PaymentTimeline evidence={paymentEvidence} /></div>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 md:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-forest-700" />
              <div>
                <h2 className="font-display text-2xl text-forest-900">Where your money will go</h2>
                <p className="text-sm text-sand-600">Your settlement destination for this Agreement currency.</p>
              </div>
            </div>

            {!scopeCurrency ? (
              <p className="mt-4 text-sm text-sand-600">SecurePay has not established the Agreement currency, so no settlement destination is being guessed.</p>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-sand-500">{scopeCurrency} destination</div>
                  <Button variant="ghost" onClick={() => void loadDestination()} disabled={destinationLoading}>Refresh</Button>
                </div>

                {destinationLoading && <p role="status" className="mt-3 text-sm text-sand-500">Checking settlement destination…</p>}
                {destinationError && <div className="mt-3"><StatusNotice tone="warning">{destinationError}</StatusNotice></div>}

                {destination?.current.state === 'absent' && (
                  <div className="mt-3 rounded-2xl bg-cream-50 p-4">
                    <div className="font-semibold text-forest-900">No settlement destination</div>
                    <p className="mt-1 text-sm text-sand-600">Add and verify where released money should be sent.</p>
                  </div>
                )}
                {destination?.current.state === 'unavailable' && (
                  <div className="mt-3"><StatusNotice tone="warning">SecurePay cannot confirm your current settlement destination right now.</StatusNotice></div>
                )}
                {currentDestination && (
                  <div className="mt-3 rounded-2xl border border-forest-200 bg-forest-50/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-forest-900">{currentDestination.maskedDestinationDisplay}</div>
                        <div className="mt-1 text-xs text-sand-500">{currentDestination.currency} · {titleCase(currentDestination.destinationStatus)}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentDestination.verificationStatus === 'VERIFIED' ? 'bg-forest-100 text-forest-800' : 'bg-cream-200 text-sand-700'}`}>
                        {currentDestination.verificationStatus === 'VERIFIED' ? 'Verified' : titleCase(currentDestination.verificationStatus)}
                      </span>
                    </div>
                    {currentDestination.beneficiaryNameReturned && (
                      <div className="mt-3 text-sm text-sand-700"><strong className="text-forest-900">Beneficiary:</strong> {currentDestination.beneficiaryNameReturned}</div>
                    )}
                    {coolingOffMessage(currentDestination.coolingOffUntil) && (
                      <div className="mt-3 rounded-xl border border-ember-200 bg-white p-3 text-xs leading-5 text-sand-700">
                        <LockKeyhole className="mr-1 inline h-4 w-4 text-ember-700" />
                        {coolingOffMessage(currentDestination.coolingOffUntil)}
                      </div>
                    )}
                    <div className="mt-3">
                      <Button variant="ghost" onClick={() => void checkDestinationVerification()} disabled={destinationLoading}>Check verification</Button>
                    </div>
                  </div>
                )}

                {verification && (
                  <div className="mt-3 rounded-xl border border-cream-200 bg-white p-3 text-xs leading-5 text-sand-600">
                    <div><strong className="text-forest-900">Verification:</strong> {titleCase(verification.verificationStatus)}</div>
                    <div><strong className="text-forest-900">Decision:</strong> {verification.verificationDecision ? titleCase(verification.verificationDecision) : 'Not yet decided'}</div>
                    {verification.providerTxReference && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-forest-700">Verification evidence</summary>
                        <div className="mt-1">Provider reference: {verification.providerTxReference}</div>
                      </details>
                    )}
                  </div>
                )}

                {(destination?.current.state === 'found' || destination?.current.state === 'absent') && !showDestinationForm && (
                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => {
                        setDestinationMode(currentDestination ? 'replace' : 'register');
                        setShowDestinationForm(true);
                      }}
                    >
                      {currentDestination ? 'Change settlement destination' : 'Add settlement destination'}
                    </Button>
                  </div>
                )}

                {showDestinationForm && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-cream-200 bg-cream-50/70 p-4">
                    <div className="text-sm font-semibold text-forest-900">{destinationMode === 'replace' ? 'Change settlement destination' : 'Add settlement destination'}</div>

                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={destinationUncertain} onClick={() => setAccountKind('BANK')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${accountKind === 'BANK' ? 'border-forest-400 bg-forest-100 text-forest-900' : 'border-cream-300 bg-white text-sand-700'}`}>Bank</button>
                      <button type="button" disabled={destinationUncertain} onClick={() => setAccountKind('MOBILE_MONEY')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${accountKind === 'MOBILE_MONEY' ? 'border-forest-400 bg-forest-100 text-forest-900' : 'border-cream-300 bg-white text-sand-700'}`}>Mobile money</button>
                    </div>

                    <label className="block text-xs text-sand-600">
                      Destination purpose
                      <select disabled={destinationUncertain} value={destinationType} onChange={event => setDestinationType(event.target.value as RegisterMySettlementDestinationRequest['destinationType'])} className="mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-forest-900">
                        <option value="PRIMARY_SETTLEMENT">Primary settlement</option>
                        <option value="COLLECTION">Collection</option>
                        <option value="DISBURSEMENT">Disbursement</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>

                    {accountKind === 'BANK' && (
                      <label className="block text-xs text-sand-600">Bank code
                        <input disabled={destinationUncertain} value={bankCode} onChange={event => setBankCode(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm" />
                      </label>
                    )}
                    <label className="block text-xs text-sand-600">{accountKind === 'BANK' ? 'Account number' : 'Mobile-money number'}
                      <input disabled={destinationUncertain} value={accountNumber} onChange={event => setAccountNumber(event.target.value)} autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs text-sand-600">Beneficiary name
                      <input disabled={destinationUncertain} value={beneficiaryName} onChange={event => setBeneficiaryName(event.target.value)} autoComplete="name" className="mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm" />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={destinationLoading || !accountNumber.trim() || !beneficiaryName.trim()}
                        onClick={() => void submitSettlementDestination()}
                      >
                        {destinationUncertain ? 'Try the same request again' : destinationMode === 'replace' ? 'Replace destination' : 'Save destination'}
                      </Button>
                      {!destinationUncertain && <Button variant="ghost" onClick={() => setShowDestinationForm(false)}>Cancel</Button>}
                    </div>
                  </div>
                )}

                {destination?.history.state === 'loaded' && destination.history.items.length > 0 && (
                  <details className="mt-5 border-t border-cream-200 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-forest-800">Settlement destination history</summary>
                    <div className="mt-3 space-y-2">
                      {destination.history.items.map(item => (
                        <div key={item.destinationId} className="rounded-xl bg-cream-50 px-3 py-2 text-xs text-sand-600">
                          <div className="font-medium text-forest-900">{item.maskedDestinationDisplay}</div>
                          <div className="mt-0.5">{item.currency} · {titleCase(item.destinationStatus)} · {titleCase(item.verificationStatus)}</div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-sand-500">History is evidence only. Previous destinations are not reactivated from this list.</p>
                  </details>
                )}
              </>
            )}
          </div>

          <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 md:p-6">
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-forest-700" />
              <div>
                <h2 className="font-display text-2xl text-forest-900">Release & settlement</h2>
                <p className="text-sm text-sand-600">Release authority, an instruction, provider processing and settlement are different states.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex items-start gap-3 rounded-xl bg-cream-50 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-forest-700" />
                <div>
                  <div className="text-sm font-semibold text-forest-900">Release authority</div>
                  <div className="text-xs leading-5 text-sand-600">
                    {release.authority.state === 'loading' && 'Checking release authority…'}
                    {release.authority.state === 'error' && 'SecurePay cannot confirm release authority right now.'}
                    {release.authority.state === 'ready' && (release.authority.value.authorized ? 'Release is authorised for the current evaluated scope.' : `Release is not currently authorised: ${titleCase(release.authority.value.reasonCode)}.`)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-cream-50 p-3">
                <ReceiptText className="mt-0.5 h-4 w-4 text-forest-700" />
                <div>
                  <div className="text-sm font-semibold text-forest-900">Settlement instruction</div>
                  <div className="text-xs leading-5 text-sand-600">{currentInstruction ? `Instruction ${currentInstruction.sequence} is recorded for the current Agreement version.` : 'No current-version settlement instruction is recorded.'}</div>
                  {currentInstruction?.settlementDestinationMaskedDisplay && <div className="mt-1 text-xs text-sand-500">To {currentInstruction.settlementDestinationMaskedDisplay}</div>}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-cream-50 p-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-forest-700" />
                <div>
                  <div className="text-sm font-semibold text-forest-900">Provider / settlement state</div>
                  <div className="text-xs leading-5 text-sand-600">{settlementStage(currentSettlementStatus).detail}</div>
                </div>
              </div>

              <div className={`flex items-start gap-3 rounded-xl p-3 ${currentSettlementStatus?.settledAt ? 'bg-forest-50' : 'bg-cream-50'}`}>
                {currentSettlementStatus?.settledAt ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-forest-700" /> : <LockKeyhole className="mt-0.5 h-4 w-4 text-sand-500" />}
                <div>
                  <div className="text-sm font-semibold text-forest-900">{currentSettlementStatus?.settledAt ? 'Settled' : 'Money still protected'}</div>
                  <div className="text-xs leading-5 text-sand-600">
                    {currentSettlementStatus?.settledAt
                      ? `Settlement completed ${formatWhen(currentSettlementStatus.settledAt) ?? 'at the time recorded by SecurePay'} for this Agreement.`
                      : 'Until SecurePay has authoritative settlement completion evidence, this screen does not call the money settled.'}
                  </div>
                </div>
              </div>
            </div>

            {currentSettlementStatus?.exception && (
              <div className="mt-4 rounded-2xl border border-ember-200 bg-ember-50/50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-ember-700" />
                  <div>
                    <h4 className="font-semibold text-forest-900">Settlement needs attention</h4>
                    <p className="mt-1 text-sm leading-6 text-sand-700">{currentSettlementStatus.exception.customerSafeReason ?? 'The settlement did not complete normally.'}</p>
                    <div className="mt-3 text-xs text-sand-600">
                      <strong className="text-forest-900">What you need to do:</strong> {currentSettlementStatus.exception.requiredAction ?? 'SecurePay has not provided a customer action.'}
                    </div>
                    <div className="mt-1 text-xs text-sand-500">Recorded {formatWhen(currentSettlementStatus.exception.recordedAt) ?? 'at an unavailable time'}.</div>
                  </div>
                </div>
              </div>
            )}

            {currentSettlementStatus?.settledAt && currentInstruction && (
              <div className="mt-4 rounded-2xl border border-forest-200 bg-forest-50 p-4" data-testid="settlement-money-record">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Money record</div>
                <div className="mt-2 font-display text-xl text-forest-900">Settled</div>
                <p className="mt-1 text-sm text-sand-700">
                  Money was sent to {currentInstruction.settlementDestinationMaskedDisplay ?? 'the authorised destination'} for {agreementTitle}.
                </p>
                <div className="mt-2 text-xs text-sand-500">Settlement time: {formatWhen(currentSettlementStatus.settledAt) ?? 'Not shown'}.</div>
              </div>
            )}

            <div className="mt-4">
              <Button variant="ghost" onClick={() => void loadRelease()}>
                <RefreshCw className="mr-1 inline h-4 w-4" /> Refresh settlement
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
