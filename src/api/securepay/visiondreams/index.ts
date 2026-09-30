import type { HttpClient } from '../http';
import { segment } from '../http';
import { CONVERSATION_TOKEN_HEADER, conversationAccess, type ConversationAccessStore } from '../agent/continuity';
import type { CreateVisionDreamRequest, UpdateVisionDreamRequest, VisionDreamDto } from './dto';

/** One conversation's secret is sent in a header ONLY for its own explicit signed-in Dream claim. */
export function createVisionDreamGateway(http: HttpClient, access: ConversationAccessStore = conversationAccess) {
  const item = (id: string) => '/api/v1/vision-dreams/' + segment(id);
  return {
    async create(body: CreateVisionDreamRequest): Promise<VisionDreamDto> {
      const record = access.current();
      const headers = record?.conversationId === body.conversationId
        ? { [CONVERSATION_TOKEN_HEADER]: record.secret } : undefined;
      const created = await http.request<VisionDreamDto>('/api/v1/vision-dreams', {
        method: 'POST', auth: 'required', body, headers,
      });
      // The backend retires possession on claim. A failed/unknown POST retains the secret for retry.
      access.forget(body.conversationId);
      return created;
    },
    mine: (): Promise<VisionDreamDto[]> =>
      http.request<VisionDreamDto[]>('/api/v1/vision-dreams', { auth: 'required' }),
    get: (dreamId: string): Promise<VisionDreamDto> =>
      http.request<VisionDreamDto>(item(dreamId), { auth: 'required' }),
    update: (dreamId: string, body: UpdateVisionDreamRequest): Promise<VisionDreamDto> =>
      http.request<VisionDreamDto>(item(dreamId), { method: 'PATCH', auth: 'required', body }),
  };
}
export type VisionDreamGateway = ReturnType<typeof createVisionDreamGateway>;