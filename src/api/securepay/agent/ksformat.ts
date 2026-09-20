/**
 * KS Number FORMATS -- and why KS Number resolution and linking is unavailable in Phase 1.
 *
 *  - Platform identity (`KsNumberParser`, identity API): `^KS[0-9]{3,}$`, canonical `KS001`, `KS002`, `KS003` ...
 *  - Formation / Trade Context (`KSNumberFormatPolicy`, `RuleBasedAgreementInterpreter.KS_NUMBER_TOKEN`):
 *    exactly `KS` + 9 digits, and only attached when exactly ONE entity has been mentioned.
 *
 * So a real platform number such as KS003 has no format the formation path recognises, and this UI
 * must not invent one (no zero-padding, no frontend-only association). Nothing here talks to any API:
 * the identity record endpoint returns internal ids/timestamps, so it is not a participant-safe transport.
 */
export const PLATFORM_KS = /^KS[0-9]{3,}$/;
export const FORMATION_KS = /^KS[0-9]{9}$/;
export const normalizeKs = (raw: string): string => raw.replace(/\s+/g, '').toUpperCase();
export type KsShape = 'malformed' | 'platform-only' | 'formation-compatible';
export function ksShape(raw: string): KsShape {
  const value = normalizeKs(raw);
  if (!PLATFORM_KS.test(value) || Number(value.slice(2)) <= 0) return 'malformed';
  return FORMATION_KS.test(value) ? 'formation-compatible' : 'platform-only';
}
