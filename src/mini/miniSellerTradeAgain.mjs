/**
 * Phase 6A: read-only references for a NEW trade.
 * Never duplicates an old Agreement, price, confirmations, payer or Money.
 */
export function miniSellerRecentTradeReferences(page) {
  if (!page || !Array.isArray(page.items)) return [];
  const seen = new Set();
  return page.items.filter((item) => {
    if (!item || item.status !== 'COMPLETED' ||
        typeof item.agreementId !== 'string' || !item.agreementId ||
        typeof item.title !== 'string' || !item.title.trim() ||
        typeof item.currentAgreementVersionId !== 'string' || !item.currentAgreementVersionId ||
        seen.has(item.agreementId)) return false;
    seen.add(item.agreementId);
    return true;
  }).slice(0, 6);
}

/**
 * A fresh authenticated detail read is required before taking even its title
 * into the seller's new draft. Stale, uncompleted or mismatched rows fail closed.
 */
export function miniSellerReadTradeAgainTitle(reference, detail) {
  if (!reference || !detail || !detail.overview || !detail.currentVersion ||
      reference.status !== 'COMPLETED' ||
      detail.overview.status !== 'COMPLETED' ||
      detail.overview.agreementId !== reference.agreementId ||
      detail.currentVersion.versionId !== reference.currentAgreementVersionId ||
      typeof detail.overview.title !== 'string' ||
      !detail.overview.title.trim()) return null;
  return detail.overview.title.trim().slice(0, 240);
}
