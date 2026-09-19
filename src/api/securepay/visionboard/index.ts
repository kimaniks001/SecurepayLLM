import { segment, type HttpClient } from '../http';
import type {
  CreateVisionItemRequest, GenerateDocumentRequest, SupersedeVisionItemRequest, UpdateVisionItemRequest,
  VisionDocumentDto, VisionItemDto, VisionItemLifecycleRequest, VisionItemListDto, VisionShelfCode,
  VisionShelfListDto,
} from './dto';

/**
 * SecurePay Final Completion Phase 5B -- every call here is private, owner-scoped operating memory.
 * There is deliberately no `share`, `invite`, or `member` method: no such SecurePay endpoint exists.
 *
 * Convergence correction (section 43) -- `ownerKsNumber` is optional on `shelves`/`items`: omitting
 * it resolves to the signed-in person's own KS number server-side, so a person is never forced to
 * type their own KS number just to see their own board. Pass it explicitly only to manage a
 * different KS (e.g. a Business) the signed-in person also administers.
 */
export function createVisionBoardGateway(http: HttpClient) {
  const item = (id: string) => `/api/v1/vision-board/items/${segment(id)}`;
  return {
    shelves: (ownerKsNumber?: string) => {
      const params = new URLSearchParams();
      if (ownerKsNumber) params.set('ownerKsNumber', ownerKsNumber);
      const query = params.toString();
      return http.request<VisionShelfListDto>(`/api/v1/vision-board/shelves${query ? `?${query}` : ''}`, { auth: 'required' });
    },
    items: (ownerKsNumber?: string, shelf?: VisionShelfCode, query?: string) => {
      const params = new URLSearchParams();
      if (ownerKsNumber) params.set('ownerKsNumber', ownerKsNumber);
      if (shelf) params.set('shelf', shelf);
      if (query) params.set('query', query);
      const search = params.toString();
      return http.request<VisionItemListDto>(`/api/v1/vision-board/items${search ? `?${search}` : ''}`, { auth: 'required' });
    },
    get: (itemId: string) => http.request<VisionItemDto>(item(itemId), { auth: 'required' }),
    create: (body: CreateVisionItemRequest) =>
      http.request<VisionItemDto>('/api/v1/vision-board/items', { method: 'POST', body, auth: 'required' }),
    update: (itemId: string, body: UpdateVisionItemRequest) =>
      http.request<VisionItemDto>(item(itemId), { method: 'PATCH', body, auth: 'required' }),
    lock: (itemId: string, body: VisionItemLifecycleRequest) =>
      http.request<VisionItemDto>(`${item(itemId)}/lock`, { method: 'POST', body, auth: 'required' }),
    unlock: (itemId: string, body: VisionItemLifecycleRequest) =>
      http.request<VisionItemDto>(`${item(itemId)}/unlock`, { method: 'POST', body, auth: 'required' }),
    supersede: (itemId: string, body: SupersedeVisionItemRequest) =>
      http.request<VisionItemDto>(`${item(itemId)}/supersede`, { method: 'POST', body, auth: 'required' }),
    generateQuotation: (body: GenerateDocumentRequest) =>
      http.request<VisionDocumentDto>('/api/v1/vision-board/documents/quotation', { method: 'POST', body, auth: 'required' }),
    generateInvoice: (body: GenerateDocumentRequest) =>
      http.request<VisionDocumentDto>('/api/v1/vision-board/documents/invoice', { method: 'POST', body, auth: 'required' }),
    generateReceipt: (body: GenerateDocumentRequest) =>
      http.request<VisionDocumentDto>('/api/v1/vision-board/documents/receipt', { method: 'POST', body, auth: 'required' }),
  };
}
export type VisionBoardGateway = ReturnType<typeof createVisionBoardGateway>;
