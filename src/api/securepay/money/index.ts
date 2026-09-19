import { segment, type HttpClient } from '../http';
import type { AgreementMoneyRecordResponse, AgreementMoneyStatusResponse } from '../agreements/dto';
/** Read authority only. READY never manufactures a funding command. */
export function createMoneyGateway(http: HttpClient) {
  return {
    status: (id: string) => http.request<AgreementMoneyStatusResponse>(`/api/v1/agreements/${segment(id)}/money-status`, { auth: 'required' }),
    records: (id: string) => http.request<AgreementMoneyRecordResponse[]>(`/api/v1/agreements/${segment(id)}/money-records`, { auth: 'required' }),
  };
}
export type MoneyGateway = ReturnType<typeof createMoneyGateway>;
