import { segment, type HttpClient } from '../http';
import type { ActivateCurrencyCapabilityResponse, CurrencyCapabilityListResponse } from './dto';

/** Currency/FX convergence -- self-service currency capability discovery and just-in-time activation. */
export function createCurrencyCapabilityGateway(http: HttpClient) {
  return {
    list: () => http.request<CurrencyCapabilityListResponse>('/api/v1/me/currency-capabilities', { auth: 'required' }),
    activate: (currency: string) =>
      http.request<ActivateCurrencyCapabilityResponse>(`/api/v1/me/currency-capabilities/${segment(currency)}/activate`, {
        method: 'POST', auth: 'required',
      }),
  };
}

export type CurrencyCapabilityGateway = ReturnType<typeof createCurrencyCapabilityGateway>;
export type {
  ActivateCurrencyCapabilityResponse,
  CurrencyActivationOutcomeStatus,
  CurrencyCapability,
  CurrencyCapabilityListResponse,
  CurrencyCapabilityStatus,
} from './dto';
