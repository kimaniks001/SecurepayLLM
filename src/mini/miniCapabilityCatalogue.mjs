/**
 * P0: presentation-only projection of SecurePayAPI's server-owned capability
 * truth. No local capability inventory or simulated fallbacks. Unknown schema,
 * unexposed capabilities and missing consent fail closed.
 */
const MODES = new Set(['FORMATION', 'LIVE_AGREEMENT']);
const EXPOSURE = new Set([
  'KNOW_EXPLAIN', 'SUGGEST', 'READ', 'INITIATE_EXPLICIT_USER_FLOW',
]);
const ELIGIBILITY = new Set(['UNKNOWN', 'NOT_REQUIRED', 'ELIGIBLE', 'INELIGIBLE']);
const IMPLEMENTATION = new Set(['IMPLEMENTED', 'IMPLEMENTED_WITH_LIMITS']);
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const text = (value, max) => typeof value === 'string' &&
  value.length > 0 && value.length <= max ? value : null;

export function miniCapabilityCatalogue(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      raw.authority !== 'DESCRIPTIVE_ONLY_NO_ACTION_AUTHORITY' ||
      !MODES.has(raw.interactionMode) ||
      !text(raw.registryVersion, 160) ||
      !Array.isArray(raw.capabilities) ||
      raw.capabilities.length > 32) return null;

  const capabilities = [];
  const seen = new Set();
  for (const entry of raw.capabilities) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        !text(entry.code, 64) || !CODE.test(entry.code) ||
        !text(entry.humanProblem, 240) || !text(entry.humanBenefit, 240) ||
        !Array.isArray(entry.limitations) || entry.limitations.length > 8 ||
        !entry.limitations.every(v => text(v, 200)) ||
        !ELIGIBILITY.has(entry.actorEligibility)) return null;
    // Defence in depth: neither local copy nor server regression may turn
    // financially restricted/unknown capabilities into Mini suggestions.
    if (entry.exposure === 'NOT_EXPOSED' ||
        entry.implementationState === 'NOT_IMPLEMENTED') continue;
    if (!EXPOSURE.has(entry.exposure) ||
        !IMPLEMENTATION.has(entry.implementationState) ||
        seen.has(entry.code)) return null;
    seen.add(entry.code);
    capabilities.push(Object.freeze({
      code: entry.code,
      exposure: entry.exposure,
      eligibility: entry.actorEligibility,
      limited: entry.implementationState === 'IMPLEMENTED_WITH_LIMITS',
      humanBenefit: entry.humanBenefit,
      limitations: Object.freeze([...entry.limitations]),
    }));
  }
  return Object.freeze({
    registryVersion: raw.registryVersion,
    interactionMode: raw.interactionMode,
    capabilities: Object.freeze(capabilities),
  });
}
