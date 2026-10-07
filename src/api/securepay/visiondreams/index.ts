import type { HttpClient } from '../http';
import { segment } from '../http';
import { CONVERSATION_TOKEN_HEADER, conversationAccess, type ConversationAccessStore } from '../agent/continuity';
import type { CreateVisionDreamRequest, UpdateVisionDreamRequest, VisionDreamDto, SaveVisionDreamBoardRequest, VisionDreamBoardDto, VisionDreamAssetDto, UploadVisionDreamAssetRequest } from './dto';

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
      // A successful HTTP response must still identify the SAME conversation being claimed.
      // If the response is inconsistent, retain temporary possession for safe reconciliation.
      if (!created || created.conversationId !== body.conversationId) {
        throw new Error('SecurePay returned a Dream for a different conversation. Check whether this Dream saved before retrying.');
      }
      // The backend retires possession on a validated claim. Unknown/failed outcomes retain it.
      access.forget(body.conversationId);
      return created;
    },
    mine: (): Promise<VisionDreamDto[]> =>
      http.request<VisionDreamDto[]>('/api/v1/vision-dreams', { auth: 'required' }),
    get: (dreamId: string): Promise<VisionDreamDto> =>
      http.request<VisionDreamDto>(item(dreamId), { auth: 'required' }),
    update: (dreamId: string, body: UpdateVisionDreamRequest): Promise<VisionDreamDto> =>
      http.request<VisionDreamDto>(item(dreamId), { method: 'PATCH', auth: 'required', body }),
    board: (dreamId: string): Promise<VisionDreamBoardDto> =>
      http.request<VisionDreamBoardDto>(item(dreamId) + '/board', { auth: 'required' }),
    saveBoard: (dreamId: string, body: SaveVisionDreamBoardRequest): Promise<VisionDreamBoardDto> =>
      http.request<VisionDreamBoardDto>(item(dreamId) + '/board', { method: 'PUT', auth: 'required', body }),
    assets: (dreamId: string): Promise<VisionDreamAssetDto[]> =>
      http.request<VisionDreamAssetDto[]>(item(dreamId) + '/assets', { auth: 'required' }),
    asset: (dreamId: string, assetId: string): Promise<VisionDreamAssetDto> =>
      http.request<VisionDreamAssetDto>(item(dreamId) + '/assets/' + segment(assetId), { auth: 'required' }),
    uploadAsset: (dreamId: string, body: UploadVisionDreamAssetRequest): Promise<VisionDreamAssetDto> =>
      http.request<VisionDreamAssetDto>(item(dreamId) + '/assets', { method: 'POST', auth: 'required', body }),
    deleteAsset: (dreamId: string, assetId: string): Promise<void> =>
      http.request<void>(item(dreamId) + '/assets/' + segment(assetId), { method: 'DELETE', auth: 'required' }),
  };
}
export type VisionDreamGateway = ReturnType<typeof createVisionDreamGateway>;