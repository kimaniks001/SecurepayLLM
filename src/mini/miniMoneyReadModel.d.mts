import type {
  AgreementFundingOptionResponse, AgreementFundingQuoteResponse,
  AgreementPaymentIntentListResponse, AgreementPaymentIntentSummaryResponse,
  PaymentIntentResponse, PaymentIntentStatus,
} from '../api/securepay/payment-intent/dto';
export function miniMoneyIntentListProof(value:unknown): value is AgreementPaymentIntentListResponse;
export function miniMoneyIntentDetailProof(value:unknown, summary:AgreementPaymentIntentSummaryResponse,agreementId:string):value is PaymentIntentResponse;
export function miniMoneyFeeQuoteProof(value:unknown,agreementId:string,versionId:string,rail:AgreementFundingOptionResponse):value is AgreementFundingQuoteResponse;
export function miniMoneyIntentStatus(value:PaymentIntentStatus):string;
