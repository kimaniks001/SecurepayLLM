import type { AmendmentDiffDto } from '../../api/securepay/agreements';
import { formatMinor } from '../discovery/money';

/**
 * A bounded display adapter for Agreement snapshot fields. Snapshots can hold internal keys; nothing here dumps raw JSON,
 * ids, hashes or metadata into the product. Unknown keys get a restrained humanised label only when the key looks like a
 * plain field name; structured values are never stringified.
 */
export const FIELD_LABEL: Readonly<Record<string, string>> = {
  title: 'Title', purpose: 'Purpose', description: 'What this covers', agreement_type: 'Type of Agreement',
  currency: 'Currency', proposed_amount_minor: 'Amount', expires_at: 'Expiry',
};
/** Never shown as customer content: version machinery, ids, authority and hashes. */
const INTERNAL = /^(version_number|.*_id|id|.*_hash|hash|.*_ids|organization_id|payer_designation|payee_designation|participant_roles|correlation.*|causation.*|.*authority.*|.*token.*|.*secret.*)$/;
const PLAIN_KEY = /^[a-z][a-z0-9_]{1,40}$/;
export const isInternalField = (field: string) => INTERNAL.test(field) || !PLAIN_KEY.test(field);
export const fieldLabel = (field: string) => FIELD_LABEL[field] ?? (field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '));

export interface ShownValue { text: string; structured: boolean }
/** One value in plain words. Money is integer-exact; objects/arrays are "a structured term", never JSON. */
export function displayValue(field: string, value: unknown, currency: string | null): ShownValue {
  if (value === null || value === undefined) return { text: 'Not set', structured: false };
  if (field === 'proposed_amount_minor') {
    const minor = typeof value === 'number' ? value : (typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN);
    const money = Number.isSafeInteger(minor) ? formatMinor(minor, currency ?? '') : null;
    return { text: money ?? 'An amount SecurePay can’t show safely', structured: false };
  }
  if (typeof value === 'string') return { text: value.length > 400 ? `${value.slice(0, 400)}…` : (value || 'Empty'), structured: false };
  if (typeof value === 'number' || typeof value === 'boolean') return { text: String(value), structured: false };
  return { text: 'A structured term', structured: true };
}

export interface FieldFact { field: string; label: string; value: ShownValue }
/** The fields a proposal explicitly SETS (what apply merges over the snapshot) -- no comparison is implied. */
export function proposedFields(terms: Record<string, unknown>, currency: string | null): { shown: FieldFact[]; hidden: number } {
  const shown: FieldFact[] = []; let hidden = 0;
  for (const [field, value] of Object.entries(terms ?? {})) {
    if (isInternalField(field)) { hidden++; continue; }
    shown.push({ field, label: fieldLabel(field), value: displayValue(field, value, currency) });
  }
  return { shown, hidden };
}

export interface TrustedChange { field: string; label: string; kind: 'added' | 'changed'; before: ShownValue; after: ShownValue }
/**
 * WHY THIS EXISTS: SecurePay's diff compares the amendment's proposedTerms with the FULL source snapshot and reports every
 * source field missing from proposedTerms as REMOVED, but applying an amendment MERGES proposedTerms over the current
 * snapshot (putAll) and never removes anything. For a partial change the diff would therefore say "Title removed" while
 * apply keeps the title. So the two only agree when the diff has no REMOVED entry. This returns the changes ONLY in that
 * case and `null` otherwise (fail closed): the frontend never computes its own comparison.
 */
export function trustedDiff(diff: AmendmentDiffDto | null | undefined, currency: string | null): { changes: TrustedChange[]; hidden: number } | null {
  if (!diff || !Array.isArray(diff.changes)) return null;
  for (const c of diff.changes) {
    if (c.changeType === 'REMOVED') return null; // apply never removes a field
    if (c.changeType !== 'ADDED' && c.changeType !== 'CHANGED') return null; // unknown change type: not understood
    if (c.field === 'version_number') return null; // apply overwrites it with N+1 whatever was proposed
  }
  const changes: TrustedChange[] = []; let hidden = 0;
  for (const c of diff.changes) {
    if (isInternalField(c.field)) { hidden++; continue; }
    changes.push({ field: c.field, label: fieldLabel(c.field), kind: c.changeType === 'ADDED' ? 'added' : 'changed', before: displayValue(c.field, c.oldValue, currency), after: displayValue(c.field, c.newValue, currency) });
  }
  return { changes, hidden };
}
