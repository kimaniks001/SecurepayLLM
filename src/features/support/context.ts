/**
 * Help & Support context handoff. In memory only, like the Agreement -> Money handoff: nothing goes in the URL, storage or history. A context is the MINIMUM a
 * screen already showed the person; it never carries provider payloads, ledger/destination ids, risk flags or raw exception text. Help re-reads whatever it
 * needs (the exact Agreement Detail) itself, so a stale label is never presented as current.
 */
export type SupportContext =
  | { kind: 'agreement'; agreementId: string; title: string; versionLabel: string | null; currentVersionId: string | null }
  | { kind: 'review'; agreementId: string; title: string; versionLabel: string | null; currentVersionId: string | null }
  | { kind: 'money-exception'; agreementId: string; title: string; heading: string; reason: string | null; requiredAction: string | null; recordedOn: string | null };

let pending: SupportContext | null = null;
export function setSupportContext(context: SupportContext): void { pending = context; }
/** Non-consuming read (React may run initialisers twice). */
export function peekSupportContext(): SupportContext | null { return pending; }
export function clearSupportContext(): void { pending = null; }

/**
 * Opens Help from a route that is NOT inside the signed-in shell (the Money route). The hash returns to the root, where the shell opens Help because a
 * context is pending. The hash carries no identifiers.
 */
export function openSupportFromRoute(context: SupportContext): void {
  setSupportContext(context);
  if (typeof window !== 'undefined') window.location.hash = '';
}
