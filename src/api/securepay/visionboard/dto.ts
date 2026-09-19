// SecurePay Final Completion Phase 5B -- Vision Board (private KS operating memory).
// A Vision Board belongs to exactly one KS owner, is never shared, and grants no Agreement, Money,
// Project, or identity authority -- see docs/phase5b/PHASE_5B_GUARDIAN_COMPANION_VISION_BOARD_COMPLETION.md
// on the backend. There is deliberately no share/invite/participant/member field anywhere in this
// file, because no such capability exists on the backend.

export type VisionShelfCode =
  | 'RECEIPTS' | 'INVOICES' | 'QUOTATIONS' | 'PRICE_LISTS' | 'BUSINESS_PLANS'
  | 'POLICIES_GUIDELINES' | 'CUSTOMER_MESSAGES' | 'BUSINESS_DOCUMENTS' | 'IDEAS_GROWTH' | 'MY_TEMPLATES';

export type VisionItemTypeCode =
  | 'IDEA' | 'PLAN' | 'BUSINESS_RULE' | 'METHOD' | 'TEMPLATE' | 'REFERENCE_DOCUMENT'
  | 'GUIDELINE' | 'MESSAGE_TEMPLATE' | 'REMINDER' | 'PERSONAL_GUIDANCE';

export type VisionItemUsagePolicy = 'PROACTIVE' | 'REFERENCE_ONLY' | 'EXPLICIT_ONLY';

export interface VisionShelfDto {
  shelf: VisionShelfCode;
  label: string;
  teachingLine: string;
  itemCount: number;
}

export interface VisionShelfListDto { shelves: VisionShelfDto[] }

export interface VisionItemDto {
  itemId: string;
  ownerKsNumber: string;
  shelf: VisionShelfCode;
  itemType: VisionItemTypeCode;
  title: string;
  content: string | null;
  templateCode: string | null;
  usagePolicy: VisionItemUsagePolicy;
  locked: boolean;
  supersedesItemId: string | null;
  supersededByItemId: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface VisionItemListDto { items: VisionItemDto[] }

export interface CreateVisionItemRequest {
  /** Optional (convergence correction, section 43) -- omit to use the signed-in person's own KS. */
  ownerKsNumber?: string;
  shelf: VisionShelfCode;
  itemType: VisionItemTypeCode;
  title: string;
  content?: string;
  templateCode?: string;
  usagePolicy?: VisionItemUsagePolicy;
  source?: string;
}

export interface UpdateVisionItemRequest {
  title: string;
  content?: string;
  usagePolicy?: VisionItemUsagePolicy;
  expectedVersion: number;
}

export interface SupersedeVisionItemRequest {
  title?: string;
  content?: string;
  expectedVersion: number;
}

export interface VisionItemLifecycleRequest { expectedVersion: number }

export interface GenerateDocumentRequest {
  /** Optional (convergence correction, section 43) -- omit to use the signed-in person's own KS. */
  issuingKsNumber?: string;
  agreementId?: string;
  counterpartyName?: string;
  description?: string;
  amount?: string;
  currency?: string;
}

export interface VisionDocumentDto {
  template: string;
  documentNumber: string;
  draftOnly: boolean;
  truthNote: string | null;
  fields: Record<string, string>;
}
