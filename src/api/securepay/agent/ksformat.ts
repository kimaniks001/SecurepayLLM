/**
 * KS Number FORMAT -- the real platform identity shape.
 *
 * Platform identity (`KsNumberParser`, `KsNumber.parse`): `^KS[0-9]{3,}$` with a strictly positive
 * sequence number (KS000 is rejected -- a zero sequence never exists), canonical `KS001`, `KS002`,
 * `KS003` ... This is the ONLY format the Who instrument's "I have a KS Number" path uses (via
 * SecurePay's real `/identity-selections` endpoint, Phase 4 of the Agent/Trade-Context Convergence,
 * Part C).
 *
 * The legacy formation-only shape (`KSNumberFormatPolicy` / `RuleBasedAgreementInterpreter.KS_NUMBER_TOKEN`
 * -- exactly `KS` + 9 digits) belonged to the retired free-text interpreter path and is never used here:
 * do not zero-pad, do not invent a second format, and never route a KS Number through that legacy policy.
 */
export const PLATFORM_KS = /^KS[0-9]{3,}$/;
export const normalizeKs = (raw: string): string => raw.replace(/\s+/g, '').toUpperCase();
/** The full real rule: the shape above, AND a strictly positive sequence (KS000 is not a real KS Number). */
export const isValidKsNumber = (raw: string): boolean => {
  const value = normalizeKs(raw);
  return PLATFORM_KS.test(value) && Number(value.slice(2)) > 0;
};
