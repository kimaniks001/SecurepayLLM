import { segment, type HttpClient } from '../http';

/**
 * B4 canonical Agreement communication. Human messages are not accepted terms,
 * evidence or Money instructions. Every read/write is independently scoped to
 * the signed-in actual participant by SecurePayAPI, never by client-supplied KS.
 */
export interface AgreementConversationMessage {
  id: string;
  agreementId: string;
  agreementVersionId: string | null;
  body: string;
  originSurface: string;
  createdAt: string;
  mine: boolean;
  replayed: boolean;
}

export interface AgreementConversationHit {
  id: string;
  agreementId: string;
  agreementTitle: string;
  body: string;
  originSurface: string;
  createdAt: string;
  mine: boolean;
}

export function createAgreementMessagesGateway(http: HttpClient) {
  const base = (id: string) => `/api/v1/agreements/${segment(id)}/messages`;
  return {
    thread: (agreementId: string, page = 0, size = 20, query?: string) => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (query?.trim()) params.set('query', query.trim());
      return http.request<AgreementConversationMessage[]>(`${base(agreementId)}?${params}`, { auth: 'required' });
    },
    send: (agreementId: string, body: string, clientMessageId: string) =>
      http.request<AgreementConversationMessage>(base(agreementId), {
        method: 'POST', auth: 'required', body: { body, clientMessageId },
      }),
    search: (params: {
      query: string; fromDate?: string; toDate?: string; page?: number; size?: number;
    }) => {
      const query = params.query.trim();
      if (query.length < 2 || query.length > 160) throw new Error('Search text must have 2–160 characters');
      const args = new URLSearchParams({ query, page: String(params.page ?? 0), size: String(params.size ?? 20) });
      if (params.fromDate) args.set('fromDate', params.fromDate);
      if (params.toDate) args.set('toDate', params.toDate);
      return http.request<AgreementConversationHit[]>(`/api/v1/me/agreement-messages/search?${args}`, { auth: 'required' });
    },
  };
}
export type AgreementMessagesGateway = ReturnType<typeof createAgreementMessagesGateway>;
