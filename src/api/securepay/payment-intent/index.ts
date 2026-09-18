import { segment, type HttpClient } from '../http';
import type {
  AgreementFundingAuthorityResponse,
  AgreementFundingOptionListResponse,
  AgreementFundingQuoteResponse,
  AgreementPaymentIntentCreateResponse,
  AgreementPaymentIntentListResponse,
  InitiatePaymentResponse,
  PaymentAttemptResponse,
  PaymentIntentResponse,
} from './dto';

function freshIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`;
}

/**
 * Final Completion Phase 2 completion pass, Section 1/10 -- the real, provider-driven funding
 * journey backing "PaymentIntent execution": rail discovery (`fundingOptions`), optional quoting
 * (`createQuote`, only meaningful for rails that support it), agreement-bound intent creation
 * (`createIntent` -- amount/currency/beneficiary are always server-derived, never accepted here),
 * and `initiate`, which actually hands the intent to a rail adapter (M-PESA STK, PesaLink, ...).
 * `get`/`listAttempts` poll the real state machine; a disabled or uncertified rail simply never
 * appears in `fundingOptions` -- this client never hardcodes which rails exist.
 */
export function createPaymentIntentGateway(http: HttpClient) {
  return {
    fundingAuthority: (agreementId: string) =>
      http.request<AgreementFundingAuthorityResponse>(`/api/v1/agreements/${segment(agreementId)}/participants/me/funding-authority`, { auth: 'required' }),
    fundingOptions: (agreementId: string) =>
      http.request<AgreementFundingOptionListResponse>(`/api/v1/agreements/${segment(agreementId)}/funding-options`, { auth: 'required' }),
    createQuote: (agreementId: string, railCode: string) =>
      http.request<AgreementFundingQuoteResponse>(`/api/v1/agreements/${segment(agreementId)}/funding-quotes`, {
        method: 'POST', auth: 'required', body: { railCode },
      }),
    createIntent: (agreementId: string, externalReference?: string) =>
      http.request<AgreementPaymentIntentCreateResponse>(`/api/v1/agreements/${segment(agreementId)}/payment-intents`, {
        method: 'POST', auth: 'required', body: { idempotencyKey: freshIdempotencyKey(), externalReference: externalReference ?? null },
      }),
    listIntents: (agreementId: string, page = 0, size = 20) =>
      http.request<AgreementPaymentIntentListResponse>(`/api/v1/agreements/${segment(agreementId)}/payment-intents?page=${page}&size=${size}`, { auth: 'required' }),
    get: (paymentIntentId: string) =>
      http.request<PaymentIntentResponse>(`/api/v1/payment-intents/${segment(paymentIntentId)}`, { auth: 'required' }),
    listAttempts: (paymentIntentId: string) =>
      http.request<PaymentAttemptResponse[]>(`/api/v1/payment-intents/${segment(paymentIntentId)}/attempts`, { auth: 'required' }),
    initiate: (paymentIntentId: string, providerIdentifier: string, quoteReference?: string) =>
      http.request<InitiatePaymentResponse>(`/api/v1/payment-intents/${segment(paymentIntentId)}/initiate`, {
        method: 'POST', auth: 'required', body: { idempotencyKey: freshIdempotencyKey(), providerIdentifier, quoteReference: quoteReference ?? null },
      }),
  };
}

export type PaymentIntentGateway = ReturnType<typeof createPaymentIntentGateway>;
export type {
  AgreementFundingAuthorityResponse,
  AgreementFundingOptionListResponse,
  AgreementFundingOptionResponse,
  AgreementFundingQuoteResponse,
  AgreementPaymentIntentCreateResponse,
  AgreementPaymentIntentListResponse,
  AgreementPaymentIntentSummaryResponse,
  InitiatePaymentResponse,
  PaymentAttemptResponse,
  PaymentIntentResponse,
  PaymentIntentStatus,
} from './dto';
