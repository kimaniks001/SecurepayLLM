import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const journey = fs.readFileSync(new URL('../src/features/money/MoneyPaymentSettlementJourney.tsx', import.meta.url), 'utf8');
const destination = fs.readFileSync(new URL('../src/features/money/settlementDestination.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');

test('Build 2 keeps principal, SecurePay charge, provider charge and total backend-derived', () => {
  assert.match(journey, /quote\.amountMinor/);
  assert.match(journey, /quote\.platformChargeMinor/);
  assert.match(journey, /quote\.providerChargeMinor/);
  assert.match(journey, /quote\.totalChargeMinor/);
  assert.doesNotMatch(journey, /platformChargeMinor\s*\+/);
});

test('fee bearer, rail-charge bearer and payer role are translated from backend quote facts', () => {
  assert.match(journey, /quote\.feeBearer/);
  assert.match(journey, /quote\.railChargeBearer/);
  assert.match(journey, /quote\.payerRole/);
  assert.match(journey, /humanBearer/);
});

test('funding quote expiry is displayed and expired quotes cannot continue', () => {
  assert.match(journey, /quote\.expiresAt/);
  assert.match(journey, /Quote valid until/);
  assert.match(journey, /quoteExpired\(quote\)/);
  assert.match(journey, /Prepare a fresh funding quote/);
});

test('quoteAvailable false never creates a fake quote path', () => {
  assert.match(journey, /if \(!rail\.quoteAvailable\)/);
  assert.match(journey, /does not offer a quote step for this rail/);
  assert.match(journey, /createVersionBoundQuote/);
  assert.doesNotMatch(journey, /createQuote\(/);
});

test('Agreement version protection is checked before payment intent creation', () => {
  assert.match(journey, /agreementGateway\.detail\(agreementId\)/);
  assert.match(journey, /liveVersion !== agreementVersionId/);
  assert.match(journey, /createIntent\(/);
  assert.match(journey, /agreementVersionId,/);
  assert.match(journey, /This Agreement changed after this price was prepared/);
});

test('all payment intent statuses remain distinct human states', () => {
  for (const status of ['CREATED','INITIATION_PENDING','ACTION_REQUIRED','PROVIDER_PENDING','CONFIRMATION_PENDING','CONFIRMED','FAILED','EXPIRED','CANCELLED']) {
    assert.match(journey, new RegExp(`${status}:`));
  }
});

test('provider pending and confirmation pending are never rendered as success or failure', () => {
  assert.match(journey, /PROVIDER_PENDING:[^\n]*Provider processing/);
  assert.match(journey, /CONFIRMATION_PENDING:[^\n]*Confirmation pending/);
  assert.match(journey, /Do not make another payment yet/);
  assert.doesNotMatch(journey, /PROVIDER_PENDING:[^\n]*(success|failed)/i);
  assert.doesNotMatch(journey, /CONFIRMATION_PENDING:[^\n]*(success|failed)/i);
});

test('retry guidance requires a fresh funding attempt instead of re-initiating a terminal intent', () => {
  assert.match(journey, /retryEligible/);
  assert.match(journey, /fresh funding attempt with a fresh current quote/);
  assert.match(journey, /does not re-initiate this terminal intent/);
});

test('confirmed payment refreshes Agreement Money', () => {
  assert.match(journey, /result\.status === 'CONFIRMED'\) onMoneyRefresh\(\)/);
  assert.match(journey, /intent\.status === 'CONFIRMED'\) onMoneyRefresh\(\)/);
});

test('provider instructions are bounded and raw metadata is never dumped', () => {
  assert.match(journey, /clientInstructionType === 'STK_PUSH'/);
  assert.match(journey, /safeProviderUrl/);
  assert.match(journey, /parsed\.protocol === 'https:'/);
  assert.doesNotMatch(journey, /Object\.entries\([^)]*clientInstructionMetadata/);
});

test('consequential payment commands preserve idempotency and uncertain outcomes', () => {
  assert.match(journey, /createAttemptStore/);
  assert.match(journey, /isUncertainFinancialError/);
  assert.match(journey, /UNCERTAIN_MONEY/);
  assert.match(journey, /same initiation again/);
});

test('settlement destination display uses the backend masked destination and beneficiary', () => {
  assert.match(journey, /currentDestination\.maskedDestinationDisplay/);
  assert.match(journey, /currentDestination\.beneficiaryNameReturned/);
  assert.doesNotMatch(journey, /currentDestination\.accountNumber/);
});

test('destination verification is read from the API, never inferred from registration', () => {
  assert.match(journey, /settlementGateway\.verificationStatus\(current\.destinationId\)/);
  assert.match(journey, /verification\.verificationStatus/);
  assert.match(journey, /verification\.verificationDecision/);
  assert.match(journey, /currentDestination\.verificationStatus === 'VERIFIED'/);
});

test('destination replacement preserves cooling-off protection and exact-request retry', () => {
  assert.match(journey, /currentDestination\.coolingOffUntil/);
  assert.match(journey, /money cannot be sent to this new destination until/);
  assert.match(journey, /Money remains protected by the Agreement/);
  assert.match(destination, /mode === 'register'/);
  assert.match(destination, /gateway\.replace\(request, main\.key, verify\.key\)/);
});

test('destination purpose and BANK or MOBILE_MONEY are customer facts, not internal identifiers', () => {
  assert.match(journey, /PRIMARY_SETTLEMENT/);
  assert.match(journey, /COLLECTION/);
  assert.match(journey, /DISBURSEMENT/);
  assert.match(journey, /MOBILE_MONEY/);
  assert.doesNotMatch(journey, /regulatedAccountMappingId|destinationFingerprintDigest|ownerIdentityId/);
});

test('destination history is read-only evidence', () => {
  assert.match(journey, /Settlement destination history/);
  assert.match(journey, /History is evidence only/);
  assert.match(journey, /Previous destinations are not reactivated/);
  assert.doesNotMatch(journey, /reactivateDestination|restoreDestination/);
});

test('release authority is never presented as settlement completion', () => {
  assert.match(journey, /Release authority/);
  assert.match(journey, /Settlement instruction/);
  assert.match(journey, /Provider \/ settlement state/);
  assert.match(journey, /Until SecurePay has authoritative settlement completion evidence/);
});

test('settlement exception uses only backend customer-safe reason and required action', () => {
  assert.match(journey, /exception\.customerSafeReason/);
  assert.match(journey, /exception\.requiredAction/);
  assert.doesNotMatch(journey, /Error 500/);
});

test('only settledAt produces the customer-facing Settled state', () => {
  assert.match(journey, /if \(status\.settledAt\) return \{ heading: 'Settled'/);
  assert.match(journey, /currentSettlementStatus\?\.settledAt \? 'Settled'/);
  assert.match(journey, /SETTLED[^\n]*Provider processing/);
});

test('Agreement context remains visible in the payment and settlement workspace on mobile and desktop', () => {
  assert.match(journey, /agreementTitle/);
  assert.match(journey, /Funding this Agreement/);
  assert.match(journey, /grid gap-5 xl:grid-cols/);
  assert.match(journey, /md:grid-cols/);
  assert.match(experience, /Choose an Agreement, see where its money stands/);
});

test('Build 2 does not pull later marketplace, Community Saver, loan or insurance-claim work into Money', () => {
  assert.doesNotMatch(journey, /Community Saver/);
  assert.doesNotMatch(journey, /Compare bank prices|SACCO price ranking|Apply for a loan|Insurance claim|Become a financial partner/);
});


test('Build 2 does not extend frontend response DTOs beyond SecurePayAPI settlement contracts', () => {
  const destinationDto = fs.readFileSync(new URL('../src/api/securepay/settlement-destinations/dto.ts', import.meta.url), 'utf8');
  const releaseDto = fs.readFileSync(new URL('../src/api/securepay/payment-release/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(destinationDto, /destinationType\?:/);
  assert.doesNotMatch(releaseDto, /amountMinor\?:|currency\?:|railCode\?:/);
  assert.doesNotMatch(journey, /currentDestination\.destinationType/);
  assert.doesNotMatch(journey, /currentSettlementStatus\.amountMinor|currentSettlementStatus\.currency|currentSettlementStatus\.railCode/);
});

test('confirmed payment is described as Agreement funding rather than generic payment success', () => {
  assert.match(journey, /has been funded into \{agreementTitle\}/);
  assert.match(journey, /evidence\.intent\.status === 'CONFIRMED'/);
  assert.doesNotMatch(journey, /Payment successful/);
});

test('settlement required action uses the existing safe translation helper', () => {
  assert.match(journey, /requiredActionWords\(currentSettlementStatus\.exception\.requiredAction\)/);
});
