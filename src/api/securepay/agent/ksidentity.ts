import type { KsIdentityDto } from './dto';

/**
 * Mirrors the backend's strict `KsNumberParser` (^KS[0-9]{3,}$, sequence > 0, no surrounding
 * whitespace). A person may type "ks 003" or " ks003 "; those are normalised here so the request
 * the backend sees is always canonical. Anything that still does not match never leaves the browser.
 */
export type KsNumberInput = { ok: true; value: string } | { ok: false };
export function normalizeKsNumber(raw: string): KsNumberInput {
  const value = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^KS[0-9]{3,}$/.test(value)) return { ok: false };
  if (Number(value.slice(2)) <= 0) return { ok: false };
  return { ok: true, value };
}

/**
 * The participant-safe projection of a KS identity: a KS Number, an optional display name and the
 * broad kind of identity. The wire record also carries an internal identity id, a sequence number,
 * lifecycle timestamps -- none of which the workbench needs, shows, stores or forwards
 * (IDENTITY_ENDPOINT_EXPOSURE_STANDARD: "public lookup may expose only an approved projection").
 * `active` is the ONLY status-derived fact kept: SUSPENDED / CLOSED / PENDING identities can be
 * described as "not active" but are never offered as a counterparty.
 */
export interface KsIdentityView {
  ksNumber: string;
  displayName: string | null;
  kind: 'INDIVIDUAL' | 'BUSINESS' | null;
  active: boolean;
}
export function ksIdentityView(dto: KsIdentityDto, requested: string): KsIdentityView | null {
  if (!dto || typeof dto.canonicalKsNumber !== 'string' || dto.canonicalKsNumber !== requested || typeof dto.status !== 'string') return null;
  const name = typeof dto.displayName === 'string' ? dto.displayName.trim() : '';
  return {
    ksNumber: dto.canonicalKsNumber,
    displayName: name.length > 0 ? name.slice(0, 128) : null,
    kind: dto.identityType === 'INDIVIDUAL' || dto.identityType === 'BUSINESS' ? dto.identityType : null,
    active: dto.status === 'ACTIVE',
  };
}
