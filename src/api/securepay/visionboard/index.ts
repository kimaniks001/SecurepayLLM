import { segment, type HttpClient } from '../http';
import type {
  CreateVisionItemRequest, GenerateDocumentRequest, SupersedeVisionItemRequest, UpdateVisionItemRequest,
  VisionDocumentDto, VisionItemDto, VisionItemLifecycleRequest, VisionItemListDto, VisionShelfCode,
  VisionShelfListDto,
} from './dto';

/**
 * SecurePay Final Completion Phase 5B -- every call here is private, owner-scoped operating memory.
 * There is deliberately no `share`, `invite`, or `member` method: no such SecurePay endpoint exists.
 */
export function createVisionBoardGateway(http: HttpClient) {
  const item = (id: string) => `/api/v1/vision-board/items/${segment(id)}`;
  return {
    shelves: (ownerKsNumber: string) =>
      http.request<VisionShelfListDto>(`/api/v1/vision-board/shelves?ownerKsNumber=${encodeURIComponent(ownerKsNumber)}`, { auth: 'required' }),
    items: (ownerKsNumber: string, shelf?: VisionShelfCode, query?: string) => {
      const params = new URLSearchParams({ ownerKsNumber });
      if (shelf) params.set('shelf', shelf);
      if (query) params.set('query', query);
      return http.request<VisionItemListDto>(`/api/v1/vision-board/items?${params.toString()}`, { auth: 'required' });
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
