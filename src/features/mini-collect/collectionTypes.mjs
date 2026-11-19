/**
 * SecurePay Mini Collect C5A — non-authoritative collection purpose profiles.
 * These choices describe the work; they do not establish an Agreement,
 * a debt, a fee, recurring debit authority, beneficiary or refund rights.
 * A future canonical backend contract must bind the profile and recurrence
 * to an accepted Agreement version, per-person obligations and provider terms.
 */
export const COLLECTION_TYPE_PROFILES = Object.freeze([
  {
    id: 'shared-purchase', kind: 'buy', title: 'Buy together', hint: 'One item or a basket for a group',
    example: 'Parents buying school equipment', cadences: ['one-time'],
    obligation: 'conditional', recipient: 'The verified supplier named by the accepted offer',
    checks: ['Keep the exact item, supplier, price and offer version.', 'Confirm stock, delivery, cancellation and each person’s share.', 'A reached target never releases money to the seller automatically.'],
  },
  {
    id: 'school-fees', kind: 'paid', title: 'School fees', hint: 'Know which student and term each payment is for',
    example: 'A headmaster collecting term fees', cadences: ['one-time', 'school-term'],
    obligation: 'amount-due', recipient: 'The verified school with authority to receive the fee',
    checks: ['Keep student-specific obligations private and separate.', 'Match the school, invoice, student and exact term.', 'Late fees and refunds must follow accepted school terms.'],
  },
  {
    id: 'course-enrolment', kind: 'paid', title: 'Lessons or courses', hint: 'Enrolments with promised learning',
    example: 'A trainer selling online classes', cadences: ['one-time', 'instalments'],
    obligation: 'conditional', recipient: 'The trainer or authorized training business',
    checks: ['Specify course access, start date, lessons and promised support.', 'Record each learner’s acceptance and permitted cancellation.', 'Instalments do not imply automatic debits or earned income.'],
  },
  {
    id: 'thrift-item', kind: 'paid', title: 'Selling items', hint: 'Each buyer pays for their own item',
    example: 'A thrift-shop owner selling a jacket', cadences: ['one-time', 'instalments'],
    obligation: 'conditional', recipient: 'The lawful seller of the identified item',
    checks: ['Keep each buyer’s exact item, condition, price and source offer.', 'Clarify reservation, handover and refunds before acceptance.', 'Never count a pledge or pending payment as a completed sale.'],
  },
  {
    id: 'single-bill', kind: 'paid', title: 'A bill or service', hint: 'One accepted obligation, correctly attributed',
    example: 'A contractor collecting for completed work', cadences: ['one-time', 'instalments'],
    obligation: 'amount-due', recipient: 'The proven payee under the actual Agreement',
    checks: ['Prove the underlying bill or delivered work.', 'Give the payer a chance to review disputed amounts.', 'Keep each payer’s remaining obligation separate.'],
  },
  {
    id: 'estate-dues', kind: 'regular', title: 'Estate or community dues', hint: 'Security, services or monthly levies',
    example: 'Varsityville monthly contributions', cadences: ['monthly', 'agreed-cycle'],
    obligation: 'amount-due', recipient: 'The verified community or service provider',
    checks: ['Each month needs its own obligation and statement.', 'No duplicated period or silently increased charge.', 'Reminders are not debits; a new charge requires valid accepted rules.'],
  },
  {
    id: 'school-transport', kind: 'regular', title: 'School transport', hint: 'A bus route and service period',
    example: 'Parents contributing towards a school bus', cadences: ['monthly', 'school-term'],
    obligation: 'conditional', recipient: 'The verified transport operator or appointed school',
    checks: ['Name the route, children served, vehicle/operator and service dates.', 'Verify provider availability and the underlying transport Agreement.', 'Cancellation, missed trips and parent returns need explicit terms.'],
  },
  {
    id: 'membership', kind: 'regular', title: 'Subscriptions or membership', hint: 'A continuing service with clear periods',
    example: 'A club or class membership', cadences: ['monthly', 'agreed-cycle'],
    obligation: 'amount-due', recipient: 'The verified membership or service organization',
    checks: ['Identify the service included in each period.', 'State renewal, notice, cancellation and missed-payment rules.', 'One active cycle never proves that another was paid.'],
  },
  {
    id: 'rent', kind: 'regular', title: 'Rent or regular bill', hint: 'Keep every due period distinct',
    example: 'Monthly rent owed under a tenancy', cadences: ['monthly', 'agreed-cycle'],
    obligation: 'amount-due', recipient: 'The authorized landlord or payment agent',
    checks: ['Confirm the actual tenancy and payee authority.', 'Match payments to the correct due month and property.', 'No new rent debt or automatic debit from a screen choice.'],
  },
  {
    id: 'chama-cycle', kind: 'group', title: 'Chama or merry-go-round', hint: 'A group with its own accepted rules',
    example: 'Members contributing to a rotation', cadences: ['monthly', 'agreed-cycle'],
    obligation: 'group-rule', recipient: 'The person or purpose chosen by the accepted group mandate',
    checks: ['Verify membership, contribution schedule and payout order.', 'Record missed payments and votes without silently changing rules.', 'Payout requires independent approved authority and a suitable provider.'],
  },
  {
    id: 'group-project', kind: 'group', title: 'Shared project', hint: 'Many contributors, one defined purpose',
    example: 'Neighbours funding drainage', cadences: ['one-time', 'agreed-cycle'],
    obligation: 'conditional', recipient: 'The verified project beneficiary or supplier',
    checks: ['Link the project scope, quotes, roles and milestones.', 'Explain the shortfall, surplus and cancellation fallback.', 'Keep the original agreed purpose when approving spending.'],
  },
  {
    id: 'welfare', kind: 'give', title: 'Welfare or fundraising', hint: 'Support someone or a cause',
    example: 'Medical, funeral or disaster support', cadences: ['one-time'],
    obligation: 'voluntary', recipient: 'The verified beneficiary and authorized receiving party',
    checks: ['Prove authority when collecting for another person.', 'Explain the cause and permitted use without exposing donors.', 'Giving is not automatically a refundable loan.'],
  },
  {
    id: 'church-giving', kind: 'give', title: 'Church or community giving', hint: 'Offerings and purpose-specific projects',
    example: 'An offering or building fund', cadences: ['one-time', 'monthly'],
    obligation: 'voluntary', recipient: 'The verified recipient organization',
    checks: ['Keep offerings, tithes and projects separately designated.', 'Never announce individual donors or their amounts by default.', 'A purpose change needs the right authorization, not an organizer’s assumption.'],
  },
  {
    id: 'education-fund', kind: 'goal', title: 'Education savings goal', hint: 'Prepare for a known future need',
    example: 'Fees for a coming school year', cadences: ['one-time', 'monthly'],
    obligation: 'conditional', recipient: 'The beneficiary or education provider under accepted terms',
    checks: ['Define beneficial ownership and when the school needs funds.', 'Check a real provider’s term, liquidity and return capabilities.', 'Do not invent interest, investment or guaranteed withdrawal.'],
  },
  {
    id: 'event-goal', kind: 'goal', title: 'A planned event or milestone', hint: 'Save together for one date',
    example: 'A family event or group journey', cadences: ['one-time', 'monthly'],
    obligation: 'conditional', recipient: 'The accepted event supplier or beneficiary',
    checks: ['Name the event, date, suppliers and goal.', 'Agree what happens if the date or cost changes.', 'Keep contributions returnable only where accepted terms permit.'],
  },
].map(profile => Object.freeze({ ...profile, cadences: Object.freeze(profile.cadences), checks: Object.freeze(profile.checks) })));

export const CADENCE_OPTIONS = Object.freeze([
  { id: 'one-time', title: 'Just this once', hint: 'One defined collection with its own closing date' },
  { id: 'monthly', title: 'Every month', hint: 'A separate record and consented obligation for each month' },
  { id: 'school-term', title: 'Every school term', hint: 'Each term has clear fees, dates and a new record' },
  { id: 'agreed-cycle', title: 'On our agreed schedule', hint: 'The timetable must be accepted before use' },
  { id: 'instalments', title: 'Pay in parts', hint: 'Each instalment must follow an accepted payment schedule' },
]);
export function collectionTypesFor(kind) {
  return COLLECTION_TYPE_PROFILES.filter(profile => profile.kind === kind);
}
export function newCollectionTypeSelection(kind) {
  if (collectionTypesFor(kind).length === 0) throw new Error('Unsupported collection purpose');
  return Object.freeze({ kind, typeId: null, cadence: null });
}
export function chooseCollectionType(selection, typeId) {
  const profile = collectionTypesFor(selection?.kind).find(x => x.id === typeId);
  if (!profile) throw new Error('Collection type must match its purpose');
  // Changing purpose must never preserve a previous cadence or its assumed rights.
  return Object.freeze({ kind: selection.kind, typeId, cadence: null });
}
export function chooseCollectionCadence(selection, cadence) {
  const profile = collectionTypesFor(selection?.kind).find(x => x.id === selection?.typeId);
  if (!profile || !profile.cadences.includes(cadence)) {
    throw new Error('Cadence not permitted for this collection type');
  }
  return Object.freeze({ ...selection, cadence });
}
export function assessCollectionTypeSelection(selection) {
  const profile = collectionTypesFor(selection?.kind).find(x => x.id === selection?.typeId);
  const missing = [];
  if (!profile) missing.push('Choose the type of collection');
  if (profile && !profile.cadences.includes(selection.cadence)) missing.push('Choose how often this collection happens');
  return Object.freeze({
    draftComplete: missing.length === 0,
    missing: Object.freeze(missing),
    agreementAccepted: false, providerVerified: false, paymentAuthorized: false,
    recurringDebitAuthorized: false, refundAuthorized: false,
  });
}
/** Types are review material. Never translate a choice into payment authority. */
export function canExecuteTypeSelection() { return false; }
