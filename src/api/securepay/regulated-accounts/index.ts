import type { HttpClient } from '../http';
import type { RegulatedAccountMapping } from './dto';

/** Self-service listing of the caller's own regulated account mappings -- pre-existing backend endpoint, first exposed to this frontend for the FX conversion picker. */
export function createRegulatedAccountsGateway(http: HttpClient) {
  return {
    listMine: () => http.request<RegulatedAccountMapping[]>('/api/v1/regulated-accounts/accounts', { auth: 'required' }),
  };
}

export type RegulatedAccountsGateway = ReturnType<typeof createRegulatedAccountsGateway>;
export type { RegulatedAccountMapping } from './dto';
