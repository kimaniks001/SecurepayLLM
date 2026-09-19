import { segment, type HttpClient } from '../http';
import type { ActivateCurrencyCapabilityResponse, CurrencyCapabilityListResponse } from '../currency-capability/dto';

/**
 * Currency/FX convergence -- the "Kamau Hardware" scenario. Same self-service discovery and
 * just-in-time activation shape as the individual currency-capability gateway, scoped to a
 * Business KS Number instead of the caller's own identity. The organization/authority mapping
 * behind that businessKsNumber is always resolved server-side -- this gateway never asks for or
 * sends an internal organization id.
 */
export function createBusinessCurrencyCapabilityGateway(http: HttpClient) {
  return {
    list: (businessKsNumber: string) =>
      http.request<CurrencyCapabilityListResponse>(`/api/v1/business/${segment(businessKsNumber)}/currency-capabilities`, { auth: 'required' }),
    activate: (businessKsNumber: string, currency: string) =>
      http.request<ActivateCurrencyCapabilityResponse>(
        `/api/v1/business/${segment(businessKsNumber)}/currency-capabilities/${segment(currency)}/activate`,
        { method: 'POST', auth: 'required' },
      ),
  };
}

export type BusinessCurrencyCapabilityGateway = ReturnType<typeof createBusinessCurrencyCapabilityGateway>;

/**
 * Partially applies a businessKsNumber so the result has the exact same list()/activate(currency)
 * shape as the individual CurrencyCapabilityGateway -- lets AgreementCurrencyActivationPrompt be
 * reused verbatim for a Business Agreement, with zero changes to that component.
 */
export function bindBusinessCurrencyCapabilityGateway(gateway: BusinessCurrencyCapabilityGateway, businessKsNumber: string) {
  return {
    list: () => gateway.list(businessKsNumber),
    activate: (currency: string) => gateway.activate(businessKsNumber, currency),
  };
}
export type {
  ActivateCurrencyCapabilityResponse,
  CurrencyActivationOutcomeStatus,
  CurrencyCapability,
  CurrencyCapabilityListResponse,
  CurrencyCapabilityStatus,
} from '../currency-capability/dto';
