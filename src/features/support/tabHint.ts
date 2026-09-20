/**
 * One-shot, in-memory hint: "open this Agreement on its Support tab" (where Reviews & issues lives). Nothing in the URL, storage or history; consumed once by the
 * workspace when it mounts. It is only a navigation hint -- never Agreement truth.
 */
export interface DetailTabHint { agreementId: string; tab: 'support'; /** Optional: open this exact Review case (one-shot, in memory; never in the URL, storage or history). */ reviewCaseId?: string }
let hint: DetailTabHint | null = null;
export const setDetailTabHint = (h: DetailTabHint) => { hint = h; };
export const peekDetailTabHint = (): DetailTabHint | null => hint;
export const clearDetailTabHint = () => { hint = null; };
