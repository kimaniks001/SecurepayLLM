import {
  collectionTypesFor, assessCollectionTypeSelection,
} from './collectionTypes.mjs';
import { isCalendarDate } from './governanceDraft.mjs';

const CADENCE_CODES = Object.freeze({
  'one-time': 'ONE_TIME', monthly: 'MONTHLY', 'school-term': 'SCHOOL_TERM',
  'agreed-cycle': 'AGREED_CYCLE', instalments: 'INSTALMENTS',
});

/**
 * Client-side C5B guide. Canonical Agreement, payer identity and every source
 * remain backend-owned, and an answer pill cannot create an invoice or debit.
 */
export function canonicalCollectionTypeTerms(draft) {
  const selection = {
    kind: draft?.kind,
    typeId: draft?.collectionTypeId ?? null,
    cadence: draft?.collectionCadence ?? null,
  };
  if (!assessCollectionTypeSelection(selection).draftComplete) return null;
  if (!collectionTypesFor(selection.kind).some(x => x.id === selection.typeId)) return null;
  return Object.freeze({
    typeId: selection.typeId,
    kind: selection.kind,
    cadence: CADENCE_CODES[selection.cadence],
  });
}

export const SOURCE_OPTIONS = Object.freeze([
  { id: 'existing-bill', label: 'An existing bill or Agreement',
    hint: 'Keep the original issuer, recipient, amount and version' },
  { id: 'store-offer', label: 'A product or service offer',
    hint: 'Carry the original seller, price and accepted offer version' },
  { id: 'document', label: 'A quote or supporting document',
    hint: 'SecurePay must examine the document before anyone can accept' },
  { id: 'purpose-only', label: 'A named voluntary cause',
    hint: 'Explain the beneficiary, collection authority and permitted use' },
]);

const asUTC = value => Date.parse(value + 'T00:00:00.000Z');

export function assessCyclePeriod(draft, selection, todayIso) {
  const missing = [];
  const terms = canonicalCollectionTypeTerms(draft);
  if (!terms) missing.push('Choose a compatible collection type and schedule');
  if (!isCalendarDate(todayIso)) missing.push('Current local date is unavailable');
  if (!isCalendarDate(selection?.startsOn) || !isCalendarDate(selection?.endsOn)
      || (isCalendarDate(selection?.startsOn) && isCalendarDate(selection?.endsOn)
        && selection.startsOn > selection.endsOn)) {
    missing.push('Choose real starting and closing dates in order');
  } else {
    if (isCalendarDate(todayIso) && selection.endsOn < todayIso) {
      missing.push('This period has already ended');
    }
    if (draft?.startRule === 'scheduled' && isCalendarDate(draft?.startDate)
        && selection.startsOn < draft.startDate) {
      missing.push('The period cannot start before the agreed collection opening date');
    }
    if (isCalendarDate(draft?.deadline) && selection.endsOn > draft.deadline) {
      missing.push('The period cannot continue beyond your collection closing date');
    }
    if (asUTC(selection.endsOn) - asUTC(selection.startsOn) > 366 * 24 * 3600 * 1000) {
      missing.push('Each period must have a finite length');
    }
    if (terms?.cadence === 'MONTHLY') {
      const first = selection.startsOn.endsWith('-01');
      const d = new Date(asUTC(selection.startsOn));
      const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
        .toISOString().slice(0, 10);
      if (!first || selection.endsOn !== last) {
        missing.push('A monthly period must cover one full calendar month');
      }
    }
  }
  if (selection?.timeZoneId !== 'Africa/Nairobi') {
    missing.push('Choose the correct collection time zone before agreement formation');
  }
  if (!SOURCE_OPTIONS.some(x => x.id === selection?.sourceCategory)
      || (draft?.kind !== 'give' && selection?.sourceCategory === 'purpose-only')) {
    missing.push('Identify what original item, bill or purpose people will review');
  }
  return Object.freeze({
    reviewComplete: missing.length === 0,
    missing: Object.freeze(missing),
    // Never submit this client representation as financial or legal authority.
    backendAgreementCreated: false,
    periodPersisted: false,
    payerObligationsVerified: false,
    debtEstablished: false,
    paymentAuthorized: false,
    recurringDebitAuthorized: false,
    refundsAuthorized: false,
  });
}
export function canSubmitFinancialCycle() { return false; }
