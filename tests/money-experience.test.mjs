import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const moneyAuthorityGateway = fs.readFileSync(new URL('../src/api/securepay/money-authority/index.ts', import.meta.url), 'utf8');
const financialPartnersGateway = fs.readFileSync(new URL('../src/api/securepay/financial-partners/index.ts', import.meta.url), 'utf8');
const settlementDestinationsGateway = fs.readFileSync(new URL('../src/api/securepay/settlement-destinations/index.ts', import.meta.url), 'utf8');
const moneySessionGateway = fs.readFileSync(new URL('../src/api/securepay/money-session/index.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');
const hostedExperience = fs.readFileSync(new URL('../src/features/money/HostedMoneySessionExperience.tsx', import.meta.url), 'utf8');

test('Final Completion Phase 2 completion pass, Section 1: every Agreement Money operation is obligation-scoped, never a bare authority id', () => {
  assert.match(moneyAuthorityGateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/funded-authority\/\$\{segment\(obligationId\)\}/);
  assert.match(moneyAuthorityGateway, /list: \(agreementId: string\)/);
  for (const method of ['status', 'open', 'fund', 'exercise', 'release', 'transactions']) {
    assert.match(moneyAuthorityGateway, new RegExp(`${method}: \\(agreementId: string, obligationId: string`));
  }
});

test('exercise never accepts a client-supplied beneficiary -- the request carries only an amount', () => {
  const start = moneyAuthorityGateway.indexOf('exercise: (agreementId: string, obligationId: string, amountMinor: number, idempotencyKey: string)');
  assert.ok(start >= 0, 'exercise must take only agreementId/obligationId/amountMinor, never a beneficiary parameter');
  assert.doesNotMatch(moneyAuthorityGateway, /beneficiaryKsNumber|beneficiaryIdentityId/);
});

test('Agreement Money mutating calls carry a CALLER-SUPPLIED Idempotency-Key -- the gateway never mints a fresh key for a retry', () => {
  for (const name of ['fund:', 'exercise:', 'release:']) {
    const start = moneyAuthorityGateway.indexOf(name);
    assert.ok(start >= 0, `${name} must exist in the gateway`);
    const block = moneyAuthorityGateway.slice(start, start + 400);
    assert.match(block, /Idempotency-Key['"]?:\s*idempotencyKey/);
    assert.doesNotMatch(moneyAuthorityGateway, /freshIdempotencyKey/);
  }
});

test('the idempotency key is documented as a request-safety key only, never a financial reference', () => {
  assert.match(moneyAuthorityGateway, /never a financial/);
  assert.match(moneyAuthorityGateway, /reference or receipt number/);
});

test('financial partner discovery is real backend authority, factual only', () => {
  assert.match(financialPartnersGateway, /\/api\/v1\/regulated-accounts\/partners/);
  assert.match(financialPartnersGateway, /never Agreement or Money authority/);
});

test('Section 7: settlement destination gateway is self-service -- no canonicalKsNumber is ever supplied by this client', () => {
  assert.match(settlementDestinationsGateway, /\/api\/v1\/me\/settlement-destinations/);
  assert.match(settlementDestinationsGateway, /current:/);
  assert.match(settlementDestinationsGateway, /history:/);
  assert.match(settlementDestinationsGateway, /verificationStatus:/);
  assert.match(settlementDestinationsGateway, /register:/);
  assert.match(settlementDestinationsGateway, /replace:/);
  assert.doesNotMatch(settlementDestinationsGateway, /canonicalKsNumber: string/);
});

test('Section 9: the hosted Money session gateway never lets the client redefine financial authority', () => {
  assert.match(moneySessionGateway, /\/api\/v1\/money-sessions/);
  assert.match(moneySessionGateway, /create:/);
  assert.match(moneySessionGateway, /resolve:/);
  assert.match(moneySessionGateway, /redeem:/);
});

test('Money is wired as a first-class, non-secret runtime route and its gateways are session-refreshed', () => {
  assert.match(runtime, /useMoneyRoute/);
  assert.match(runtime, /MoneyExperience/);
  assert.match(runtime, /moneyAuthorityGateway/);
  assert.match(runtime, /financialPartnerGateway/);
  assert.match(runtime, /settlementDestinationGateway/);
  assert.match(runtime, /moneySessionGateway/);
  assert.match(runtime, /money\\\/\?\$/);
  // Money now depends on the same agreementGateway other Agreement-aware experiences use --
  // never a second, parallel Agreement client.
  assert.match(runtime, /agreements: agreementGateway/);
});

test('Section 9: the hosted Money session route is wired, keyed only by its opaque token', () => {
  assert.match(runtime, /HostedMoneySessionExperience/);
  assert.match(runtime, /useMoneySessionRoute/);
  assert.match(runtime, /money-session\\\/\(\[\^\/\]\+\)/);
});

test('the API surface registers the Money gateways alongside existing ones', () => {
  assert.match(api, /createMoneyAuthorityGateway/);
  assert.match(api, /createFinancialPartnerGateway/);
  assert.match(api, /createSettlementDestinationGateway/);
  assert.match(api, /createMoneySessionGateway/);
});

test('Section 3/4: the rendered section title is "Agreement Money," never "Funded Authority"', () => {
  assert.match(experience, /title="Agreement Money"/);
  assert.doesNotMatch(experience, /title="Funded Authority"/);
});

// Final Phase 3 semantics correction: "Still protected" (authorisedMaxAmountMinor -
// fundedTotalMinor) was a frontend-invented financial category the backend does not establish --
// the programme controller's own later review retired it rather than re-labelling it. "protected"
// now attaches only to fundedTotalMinor (money actually funded), never to the authorised ceiling.
// This intentionally supersedes the "Still protected" requirement the original version of this test
// asserted; it is not a weakening, it documents a deliberate, later vocabulary correction.
test('Section 3: customer-facing state language matches the programme-controller decision (corrected)', () => {
  assert.match(experience, /protected/);
  assert.match(experience, /Ready to progress/);
  assert.match(experience, /Progressed/);
  assert.doesNotMatch(experience, /Still protected/);
});

test('Section 4: release wording accounts for multi-payer ownership, never "Release remaining to me"', () => {
  // Phase 8: the command is withheld; the wording that remains is "Returned to the funder(s)" and never "Release remaining to me".
  assert.match(experience, /Returned to the funder\(s\)/);
  assert.doesNotMatch(experience, /Release remaining to me/);
  assert.doesNotMatch(experience, /Release unused money/);
});

test('Section 6: progressed money is never labelled as a Settled status, only ever disclosed as pending certified transfer', () => {
  // "Settled" only ever appears inside explanatory doc comments/strings saying it must NOT be
  // shown as a status -- never as a literal customer-facing status label like "Status: Settled".
  assert.doesNotMatch(experience, /Status:\s*['"`{]*\s*Settled/i);
  assert.match(experience, /providerSettlementCertified/);
  assert.match(experience, /hasn’t certified settlement, so this is not shown as settled/);
});

test('Section 1: the UI supports more than one Agreement Money position per Agreement', () => {
  assert.match(experience, /positions\.length > 1/);
  assert.match(experience, /Choose a different position/);
});

test('Agreement Money has no free-form authority-id, max-amount, or beneficiary-KS-number input field', () => {
  // Programme-controller correction: the UI must not look like an engineering console. The person
  // picks one of their own Agreements, and then one of its own Agreement Money positions -- there
  // is no "authority reference" text field, no "max amount" field on open(), and no "beneficiary
  // KS Number" field on exercise().
  assert.doesNotMatch(experience, /Authority reference/i);
  assert.doesNotMatch(experience, /Max amount/i);
  assert.doesNotMatch(experience, /Beneficiary KS Number/i);
  assert.match(experience, /Show my Agreements/);
  assert.match(experience, /currentUserAgreements/);
});

test('Section 7: settlement-destination registration only ever collects real external-account facts', () => {
  assert.doesNotMatch(experience, /regulatedAccountMappingId|destinationFingerprintDigest|maskedDestinationDisplay.*useState/);
  assert.match(experience, /accountNumber/);
  assert.match(experience, /beneficiaryName/);
});

test('Section 13: transaction history is read from the backend, never a client-fabricated receipt', () => {
  assert.match(experience, /transactions\(/);
  assert.doesNotMatch(experience, /crypto\.randomUUID\(\).*receipt|fabricat/i);
});

test('Money never imports fixture financial truth', () => {
  for (const forbidden of ['demoData', 'moneyData', 'ecosystemData', 'mockAgent']) {
    assert.doesNotMatch(experience, new RegExp(forbidden));
  }
});

test('no financial figure is a hardcoded literal total in the Money experience component', () => {
  assert.doesNotMatch(experience, /KES\s+\d/);
});

test('Section 9/10: the hosted page reuses the same session API a real embedded surface would, never a second authority system', () => {
  assert.match(hostedExperience, /gateway\.resolve\(token\)/);
  // Phase 8: redeem is withheld (it progresses funded money and isn't provably atomic vs a version change).
  assert.doesNotMatch(hostedExperience, /gateway\.redeem/);
  assert.match(hostedExperience, /embedded/i);
});

// Deep-review correction pass: the initial Money Home overview summed
// CurrentUserAgreementSummaryResponse.proposedAmountMinor across Agreements and called the result
// "what you have" -- a proposed Agreement amount is not money the person has; it may never be
// funded at all. The real aggregate already exists (agreementGateway.home()'s own moneyByCurrency,
// AgreementMoneySummaryService's own established-positions-only total) and must be used unchanged.
test('deep-review correction: Money Home renders the real backend Agreement Money aggregate, never a client sum of proposed amounts', () => {
  assert.match(experience, /agreementGateway\.home\(\)/);
  assert.match(experience, /moneyByCurrency/);
  assert.match(experience, /remainingFundedMinor/);
  assert.doesNotMatch(experience, /proposedAmountMinor.*totalMinor|totalMinor.*proposedAmountMinor/s);
  // Needs-your-attention now reuses the backend's own needsMe classification, not an independent
  // currentUserAgreements() + attentionRequired re-filter for this surface.
  assert.match(experience, /response\.needsMe/);
});

test('deep-review correction: a non-established position never describes its proposed amount as already protected', () => {
  const start = experience.indexOf('!position.established');
  assert.ok(start >= 0);
  const block = experience.slice(start, start + 600);
  assert.match(block, /Proposed:/);
  assert.doesNotMatch(block, /proposedAmountMinor[^}]*\}\s*protected/);
});

test('deep-review correction: no funded-authority command is wired in the Money experience; returned money never implies a generic balance', () => {
  assert.doesNotMatch(experience, /authorityGateway\.(open|fund|exercise|release)\(/);
  assert.match(experience, /Returned to the funder\(s\)/);
});

// Final Phase 3 semantics correction: a valid backend number must not be given a financial meaning
// the contract doesn't prove. Every assertion below traces to one specific field's real semantics.
test('final Phase 3 correction: Money Home never claims the Agreement Money aggregate as personal ownership', () => {
  assert.doesNotMatch(experience, /money you have/i);
  assert.doesNotMatch(experience, /what you have/i);
});

test('final Phase 3 correction: the authorised ceiling is never labelled "funded"/"protected"; funded money is "Funded"', () => {
  const authMaxLine = experience.indexOf('MoneyValue amount={money(authorisedMax, currency)}');
  assert.ok(authMaxLine >= 0);
  assert.doesNotMatch(experience.slice(authMaxLine, authMaxLine + 200), /protected|Funded /i);
  const fundedLine = experience.indexOf('MoneyValue amount={money(funded, currency)}');
  assert.ok(fundedLine >= 0);
  assert.match(experience.slice(fundedLine, fundedLine + 120), /Funded/);
});

test('final Phase 3 correction: remainingFundedMinor is never presented as a generic available/personal balance', () => {
  const line = experience.indexOf('remainingFundedMinor, entry.currency');
  assert.ok(line >= 0);
  const block = experience.slice(Math.max(0, line - 50), line + 400);
  assert.doesNotMatch(block, /available/i);
});

test('final Phase 3 correction: no authorisedMax-minus-fundedTotal derived category remains anywhere in the component', () => {
  assert.doesNotMatch(experience, /authorisedMax(AmountMinor)?\s*-\s*\(?position\.fundedTotalMinor/);
  assert.doesNotMatch(experience, /notYetFunded/);
});

test('final Phase 3 correction: the non-established position never offers or claims a command, and a proposal is not funded money', () => {
  const start = experience.indexOf('!position.established');
  const end = experience.indexOf('const authorisedMax', start);
  const block = experience.slice(start, end);
  assert.doesNotMatch(block, /onProtect|Protect this money|Set up Agreement Money<\/Button>/);
  assert.match(block, /temporarily unavailable/);
});

test('final Phase 3 correction: Money Home attention requires a verified money-specific backend action code, never a proposedAmountMinor proxy', () => {
  assert.match(experience, /FUND_AGREEMENT/);
  assert.match(experience, /MONEY_ACTION_CODES/);
  // The old proxy (any money-bearing Agreement in needsMe) must not be the attention filter.
  assert.doesNotMatch(experience, /needsMe\.filter\(a => a\.proposedAmountMinor/);
});
