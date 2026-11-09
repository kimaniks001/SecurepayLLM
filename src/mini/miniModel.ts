/**
 * SecurePay Mini Phase 1 — local human-experience draft model.
 * This is NOT an Agreement, an Agent model, payment or identity gateway.
 * No scenario-specific product or trader logic is allowed here.
 */
export type MiniIntent = 'sell' | 'pay' | 'collect';
export type MiniScreen = 'home' | 'describe' | 'review' | 'saved' | 'help';
export type MiniLanguage = 'en' | 'sw';

export interface MiniDraft {
  intent: MiniIntent;
  description: string;
  amount: string;
  counterparty: string;
  note: string;
  quantity: string;
  unit: string;
}

export type MiniIssue = 'description' | 'amount' | 'amount-format' | 'quantity' | null;

export function emptyMiniDraft(intent: MiniIntent = 'sell'): MiniDraft {
  return { intent, description: '', amount: '', counterparty: '', note: '', quantity: '', unit: '' };
}

/** Price is trader-supplied and optional for a collection, never inferred from a photograph. */
export function miniDraftIssue(draft: MiniDraft): MiniIssue {
  if (!draft.description.trim()) return 'description';
  if (draft.quantity.trim() && !/^(?:0|[1-9]\\d{0,6})(?:\\.\\d{1,3})?$/.test(draft.quantity.trim())) return 'quantity';
  if (draft.quantity.trim() && Number(draft.quantity.trim()) <= 0) return 'quantity';
  const raw = draft.amount.trim().replace(/,/g, '');
  if (!raw && draft.intent === 'collect') return null;
  if (!raw) return 'amount';
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(raw)) return 'amount-format';
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 'amount-format';
  return null;
}

export function formatMiniAmount(raw: string): string {
  const amount = Number(raw.trim().replace(/,/g, ''));
  if (!raw.trim() || !Number.isFinite(amount) || amount <= 0) return 'Amount not set';
  return 'KSh ' + amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function miniReviewSummary(draft: MiniDraft) {
  return {
    kind: draft.intent,
    description: draft.description.trim(),
    amount: draft.amount.trim() ? formatMiniAmount(draft.amount) : 'Contributor chooses amount',
    party: draft.counterparty.trim() || null,
    note: draft.note.trim() || null,
    quantity: draft.quantity.trim() || null,
    unit: draft.unit.trim() || null,
    status: 'LOCAL_DRAFT_NOT_ISSUED' as const,
  };
}

/** Only intentionally saved non-sensitive preview text survives tab refresh. */
export function miniStorableDraft(draft: MiniDraft): Pick<MiniDraft, 'intent' | 'description' | 'amount' | 'note' | 'quantity' | 'unit'> {
  return {
    intent: draft.intent,
    description: draft.description.slice(0, 400),
    amount: draft.amount.slice(0, 30),
    note: draft.note.slice(0, 400),
    quantity: draft.quantity.slice(0, 15),
    unit: draft.unit.slice(0, 30),
  };
}

export function miniRestoreDraft(source: unknown): MiniDraft | null {
  if (!source || typeof source !== 'object') return null;
  const item = source as Partial<MiniDraft>;
  if (!['sell', 'pay', 'collect'].includes(item.intent ?? '')) return null;
  if (typeof item.description !== 'string' || typeof item.amount !== 'string') return null;
  if (item.description.length > 400 || item.amount.length > 30) return null;
  if (item.note != null && (typeof item.note !== 'string' || item.note.length > 400)) return null;
  if (item.quantity != null && (typeof item.quantity !== 'string' || item.quantity.length > 15)) return null;
  if (item.unit != null && (typeof item.unit !== 'string' || item.unit.length > 30)) return null;
  return { intent: item.intent as MiniIntent, description: item.description, amount: item.amount,
    counterparty: '', note: item.note || '', quantity: item.quantity || '', unit: item.unit || '' };
}
