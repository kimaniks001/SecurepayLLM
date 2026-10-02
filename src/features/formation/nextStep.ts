import type { AgreementFormation, FormationOpenPoint } from './view';

/**
 * User-Ready Beta Gate 1 -- REVIEW SHOULD INTERRUPT ONLY AS MUCH AS THE DECISION REQUIRES (EP-CERT-007), and the call to action
 * says what the actual next step is, never a generic "Review this".
 *
 *   one open point      → a micro-review of that one decision ("Resolve price", "Check date", "Choose person", …)
 *   several open points → "Review 2 points" (the full Review, open points first)
 *   none                → "Review agreement" (the whole agreement, before setting it up securely)
 *
 * Pure presentation over the server's own formation (open points, topics, reviewable): it decides nothing about the agreement.
 */
export type NextStep =
  | { kind: 'none' }
  | { kind: 'point'; label: string; point: FormationOpenPoint }
  | { kind: 'points'; label: string; count: number }
  | { kind: 'review'; label: 'Review agreement' };

/** Points still asking for the person: anything that blocks setting it up, and anything not yet checked. */
export function openPointsOf(formation: AgreementFormation | null): FormationOpenPoint[] {
  return formation ? formation.openPoints.filter(p => p.blocksConfirmation || !p.checked) : [];
}

export function pointLabel(point: FormationOpenPoint): string {
  if (point.kind === 'SCHEDULE_MISMATCH') return 'Check payments';
  switch (point.topic) {
    case 'MONEY': return point.kind === 'CONFLICT' ? 'Resolve price' : 'Check amount';
    case 'CURRENCY': return 'Check currency';
    case 'DATE': case 'TIMING': return 'Check date';
    case 'ROLE': case 'PARTY': return 'Choose person';
    case 'RESPONSIBILITY': return 'Check who does it';
    case 'INCLUSION': return 'Check what’s included';
    default: return 'Check 1 point';
  }
}

export function nextStep(formation: AgreementFormation | null): NextStep {
  if (!formation || !formation.reviewable) return { kind: 'none' };
  const open = openPointsOf(formation);
  if (open.length === 1) return { kind: 'point', label: pointLabel(open[0]), point: open[0] };
  if (open.length > 1) return { kind: 'points', label: `Review ${open.length} points`, count: open.length };
  return { kind: 'review', label: 'Review agreement' };
}

/** The micro-review's question, in the person's terms. */
export function pointQuestion(point: FormationOpenPoint): string {
  if (point.kind === 'SCHEDULE_MISMATCH') return 'Do the payments add up?';
  if (point.kind !== 'CONFLICT') return 'Is this right?';
  switch (point.topic) {
    case 'MONEY': return 'Which price is right?';
    case 'DATE': case 'TIMING': return 'Which date is right?';
    case 'ROLE': case 'PARTY': return 'Which is right?';
    case 'RESPONSIBILITY': return 'Who does this?';
    case 'INCLUSION': return 'Is it included?';
    default: return 'Which is right?';
  }
}

/** "KES 95,000" -> { amount: '95000', currency: 'KES' } -- used only to prefill "Enter another amount"; never authority. */
export function splitMoney(value: string): { amount: string; currency: string } {
  const match = value.trim().match(/^([A-Z]{3})\s+([\d,]+(?:\.\d+)?)$/);
  return match ? { currency: match[1], amount: match[2].replace(/,/g, '') } : { currency: '', amount: '' };
}
