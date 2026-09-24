import type { PublicProductViewDto } from '../../api/securepay/agreements';

function formatMoney(currency: string | null, amountMinor: number | null): string | null {
  if (currency == null || amountMinor == null) return null;
  return `${currency} ${(amountMinor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function humanizeCode(code: string): string {
  return code.toLowerCase().split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const PRODUCT_TYPE_LABEL: Record<string, string> = { SECURE_LINK: 'SecureLink', KEY_CONTRACT: 'KeyContract' };
const PUBLIC_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open for review',
  JOINED: 'Already joined',
  EXPIRED: 'Expired',
  REVOKED: 'No longer available',
  CANCELLED: 'Cancelled',
};

export interface PublicProductCardView {
  productTypeLabel: string;
  purposeSummary: string;
  amountLine: string | null;
  statusLine: string;
  expiryLine: string | null;
  participants: string[];
  milestones: string[];
  nextStepGuidance: string | null;
}

/**
 * KS001 Upgrade Phase 5 (Section 8/10) — a THIN presentation mapper. Amount is shown only when the
 * backend's own `amountVisible` says so (public amount-visibility rule); this never re-derives that
 * decision. No internal identifiers are ever surfaced — only the bounded fields the backend already
 * decided are safe for a pre-Join public reader.
 */
export function publicProductView(dto: PublicProductViewDto): PublicProductCardView {
  return {
    productTypeLabel: PRODUCT_TYPE_LABEL[dto.productType] ?? dto.productType,
    purposeSummary: dto.purposeSummary,
    amountLine: dto.amountVisible ? formatMoney(dto.currency, dto.amountMinor) : null,
    statusLine: PUBLIC_STATUS_LABEL[dto.publicStatus] ?? 'Status unavailable',
    expiryLine: dto.expiresAt ? `Expires ${formatDate(dto.expiresAt)}` : null,
    participants: dto.participants.map(p => `${p.displayLabel} · ${humanizeCode(p.roleCode)}`),
    milestones: dto.milestones.map(m => `${m.sequenceOrder}. ${m.title} — ${humanizeCode(m.status)}`),
    nextStepGuidance: dto.nextStepGuidance,
  };
}
