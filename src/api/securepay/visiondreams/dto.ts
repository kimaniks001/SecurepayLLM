/** A Dream is a private Vision IDEA linked to an independently-owned KS001 conversation. */
export interface VisionDreamDto {
  dreamId: string;
  conversationId: string;
  visionItemId: string;
  title: string;
  content: string | null;
  locked: boolean;
  /** Historical Vision note superseded through the Library. */
  superseded: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface CreateVisionDreamRequest {
  conversationId: string;
  title: string;
  initialThought: string;
}
export interface UpdateVisionDreamRequest {
  title: string;
  content: string;
  expectedVersion: number;
}
export interface VisionDreamBoardDto {
  dreamId: string;
  revision: number;
  schemaVersion: number;
  documentJson: string;
  contentSha256: string | null;
  savedAt: string | null;
}
export interface SaveVisionDreamBoardRequest {
  schemaVersion: number;
  documentJson: string;
  expectedRevision: number;
  idempotencyKey: string;
}
export interface VisionDreamAssetDto {
  assetId: string;
  dreamId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
  base64Content: string | null;
}
export interface UploadVisionDreamAssetRequest {
  fileName: string;
  mimeType: string;
  base64Content: string;
  idempotencyKey: string;
}
