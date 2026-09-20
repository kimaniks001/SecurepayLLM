/**
 * Agreement -> Money handoff. In-memory only: the Agreement id, title and version label are NEVER put in the URL (no query, no path), storage or
 * history state. `#/money` stays the one non-secret route; the chosen Agreement travels in this module variable, consumed exactly once.
 * A refresh or a direct `#/money` visit simply opens Money Home (nothing to hand off), which is the correct fail-safe.
 */
export interface MoneyHandoff {
  agreementId: string;
  title: string;
  /** Display label only ("version 2"); never used as authority. */
  versionLabel: string | null;
}

let pending: MoneyHandoff | null = null;

export function setMoneyHandoff(handoff: MoneyHandoff): void { pending = handoff; }
/** Returns the pending handoff once, then forgets it. */
/** Non-consuming read (React may run initialisers twice). */
export function peekMoneyHandoff(): MoneyHandoff | null { return pending; }
export function takeMoneyHandoff(): MoneyHandoff | null { const value = pending; pending = null; return value; }
export function clearMoneyHandoff(): void { pending = null; }

export function contextLine(handoff: Pick<MoneyHandoff, 'title' | 'versionLabel'>): string {
  return handoff.versionLabel ? `${handoff.title} · ${handoff.versionLabel}` : handoff.title;
}

/** Leaves the Agreement surface for canonical Money. The hash is the fixed `#/money` and carries no identifiers. */
export function openMoneyFor(handoff: MoneyHandoff): void {
  setMoneyHandoff(handoff);
  if (typeof window !== 'undefined') window.location.hash = '#/money';
}
