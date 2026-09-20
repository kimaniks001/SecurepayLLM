/** Where a trade started, from the backend's own sourceType. STORE_LISTING is the only selectable type today; the others fail closed on the backend until Community/Opportunity converge. */
export const originLabel = (sourceType?: string): string => !sourceType || sourceType === 'STORE_LISTING' ? 'SecurePay Store' : sourceType.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
