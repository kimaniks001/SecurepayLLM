/**
 * B1 Business Knowledge Centre: merchant-scoped *read projection and draft
 * validation* only. Storage, review, approval and knowledge retrieval authority
 * must be implemented by SecurePayAPI before any production assistant uses this.
 *
 * Never train or fine-tune a shared model directly from customer or merchant
 * content. Read only scoped, currently approved information.
 */
export type BusinessKnowledgeTopic =
  | 'ABOUT' | 'PRODUCT_GUIDANCE' | 'OPENING_HOURS' | 'DELIVERY'
  | 'RETURNS' | 'WARRANTY' | 'SERVICE_RULES' | 'FAQ';

export type BusinessKnowledgeAudience = 'CUSTOMER_VISIBLE' | 'ASSISTANT_INSTRUCTION' | 'MERCHANT_PRIVATE';
export type BusinessKnowledgeOrigin = 'MERCHANT_ENTRY' | 'MERCHANT_UPLOAD' | 'AUTHORIZED_STORE_FEED';

export interface BusinessKnowledgeDraft {
  businessKsNumber: string;
  topic: BusinessKnowledgeTopic;
  audience: BusinessKnowledgeAudience;
  origin: BusinessKnowledgeOrigin;
  content: string;
  /** Record/source reference. Never a URL containing secrets. */
  sourceReference?: string;
}

export interface ApprovedBusinessKnowledge extends BusinessKnowledgeDraft {
  recordId: string;
  status: 'APPROVED' | 'DRAFT' | 'REJECTED' | 'SUPERSEDED';
  /** Must originate in SecurePayAPI; frontend must never self-approve a draft. */
  approvedByIdentityId: string | null;
  approvedAt: string | null;
  currentUntil: string | null;
  version: number;
}

export interface StoreGuideKnowledgeContext {
  businessKsNumber: string;
  /** Facts safe to communicate to a customer. */
  customerFacts: ReadonlyArray<{ recordId: string; topic: BusinessKnowledgeTopic; content: string; version: number }>;
  /** Approved directions for response style or workflow, not quotable policy facts. */
  privateInstructions: ReadonlyArray<{ recordId: string; topic: BusinessKnowledgeTopic; content: string; version: number }>;
}

/**
 * Merchant drafts default to private so accidental form submits cannot publish.
 * The API must verify that the actor may teach this exact Business KSNumber.
 */
export function prepareBusinessKnowledgeDraft(input: {
  businessKsNumber: string;
  topic: BusinessKnowledgeTopic;
  origin: BusinessKnowledgeOrigin;
  content: string;
  audience?: BusinessKnowledgeAudience;
  sourceReference?: string;
}): BusinessKnowledgeDraft {
  const content = input.content.trim();
  if (!/^KS\d{3,}$/.test(input.businessKsNumber)) throw new Error('Valid Business KSNumber required');
  if (!content || content.length > 6000) throw new Error('Knowledge entry must contain 1–6000 characters');
  if (input.sourceReference && input.sourceReference.length > 150) throw new Error('Source reference too long');
  return {
    businessKsNumber: input.businessKsNumber,
    topic: input.topic,
    audience: input.audience ?? 'MERCHANT_PRIVATE',
    origin: input.origin,
    content,
    ...(input.sourceReference ? { sourceReference: input.sourceReference } : {}),
  };
}

/**
 * Read-only projection of previously API-approved records. No record may
 * cross merchant boundaries. No private draft can become an answer.
 * Live prices/stock and authoritative Money/KRA facts MUST come from their own APIs.
 */
export function storeGuideKnowledgeContext(
  businessKsNumber: string,
  records: readonly ApprovedBusinessKnowledge[],
  now = Date.now(),
): StoreGuideKnowledgeContext {
  const customerFacts: StoreGuideKnowledgeContext['customerFacts'][number][] = [];
  const privateInstructions: StoreGuideKnowledgeContext['privateInstructions'][number][] = [];
  for (const record of records) {
    if (record.businessKsNumber !== businessKsNumber
        || record.status !== 'APPROVED'
        || !record.approvedByIdentityId
        || !record.approvedAt
        || !Number.isSafeInteger(record.version) || record.version < 1
        || !record.recordId || !record.content.trim()) continue;
    const approvedAt = Date.parse(record.approvedAt);
    const currentUntil = record.currentUntil ? Date.parse(record.currentUntil) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(approvedAt) || approvedAt > now || currentUntil <= now) continue;
    const item = {
      recordId: record.recordId,
      topic: record.topic,
      content: record.content,
      version: record.version,
    };
    if (record.audience === 'CUSTOMER_VISIBLE') customerFacts.push(item);
    else if (record.audience === 'ASSISTANT_INSTRUCTION') privateInstructions.push(item);
    // MERCHANT_PRIVATE content is deliberately excluded.
  }
  return { businessKsNumber, customerFacts, privateInstructions };
}
