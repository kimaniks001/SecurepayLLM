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