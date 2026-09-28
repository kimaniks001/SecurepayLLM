import type { AgreementFormationDto, FormationEvidenceDto, FormationTermDto } from '../../api/securepay/agent/dto';

/**
 * Entry Perfection Phase 6 -- the emerging agreement, validated. The server owns every word of it (terms, open points,
 * summary); this only normalises shapes and never invents or re-derives a term. Unknown enum values degrade safely
 * (an unknown stage is "not reviewable", an unknown effect is "needs checking").
 */
export interface FormationTerm { key: string; label: string; value: string; detail: string | null; basis: 'STATED' | 'INFERRED' | 'YOURS'; needsChecking: boolean; evidence: FormationEvidenceDto[]; history: string | null }
export interface FormationOpenPoint { id: string; kind: string; blocksConfirmation: boolean; text: string; sides: { value: string; from: string }[]; checkable: boolean; checked: boolean; sourceName: string | null }
export interface AgreementFormation {
  conversationId: string; version: number; digest: string;
  stage: 'NOTHING_YET' | 'BUILD' | 'UNDERSTOOD'; reviewable: boolean; confirmable: boolean;
  reviewBlockedReason: string | null; confirmationBlockedReason: string | null; summary: string | null;
  what: FormationTerm[]; who: { key: string; name: string; role: string | null; identity: 'VERIFIED' | 'DESCRIBED' | 'MISSING'; ksNumber: string | null; describedAs: string | null }[];
  money: FormationTerm[]; when: FormationTerm[]; responsibilities: { party: string; duties: FormationTerm[] }[];
  conditions: FormationTerm[]; notIncluded: FormationTerm[];
  origin: { type: string; title: string; offeredBy: string | null; priceNow: string | null; priceChanged: boolean } | null;
  openPoints: FormationOpenPoint[];
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const term = (t: FormationTermDto): FormationTerm => ({
  key: String(t.key), label: String(t.label), value: String(t.value), detail: str(t.detail),
  basis: t.basis === 'INFERRED' ? 'INFERRED' : t.basis === 'YOURS' ? 'YOURS' : 'STATED', needsChecking: t.needsChecking === true,
  evidence: Array.isArray(t.evidence) ? t.evidence.filter(e => e && typeof e.sourceName === 'string') : [], history: str(t.history),
});
const terms = (list: unknown): FormationTerm[] => (Array.isArray(list) ? list.filter(t => t && typeof t.label === 'string' && typeof t.value === 'string').map(term) : []);

export function agreementFormationView(dto: AgreementFormationDto): AgreementFormation | null {
  if (!dto || typeof dto.conversationId !== 'string' || !Number.isSafeInteger(dto.version)) return null;
  const stage = dto.stage === 'UNDERSTOOD' || dto.stage === 'BUILD' ? dto.stage : 'NOTHING_YET';
  return {
    conversationId: dto.conversationId, version: dto.version, digest: String(dto.digest ?? ''), stage,
    reviewable: dto.reviewable === true && stage === 'UNDERSTOOD', confirmable: dto.confirmable === true,
    reviewBlockedReason: str(dto.reviewBlockedReason), confirmationBlockedReason: str(dto.confirmationBlockedReason), summary: str(dto.summary),
    what: terms(dto.what),
    who: Array.isArray(dto.who) ? dto.who.filter(p => p && typeof p.name === 'string').map(p => ({
      key: String(p.key), name: p.name, role: str(p.role),
      identity: p.identity === 'VERIFIED' ? 'VERIFIED' : p.identity === 'MISSING' ? 'MISSING' : 'DESCRIBED',
      ksNumber: p.identity === 'VERIFIED' ? str(p.ksNumber) : null, describedAs: str(p.describedAs),
    })) : [],
    money: terms(dto.money), when: terms(dto.when),
    responsibilities: Array.isArray(dto.responsibilities) ? dto.responsibilities.filter(g => g && typeof g.party === 'string').map(g => ({ party: g.party, duties: terms(g.duties) })) : [],
    conditions: terms(dto.conditions), notIncluded: terms(dto.notIncluded),
    origin: dto.origin && typeof dto.origin.title === 'string'
      ? { type: dto.origin.type, title: dto.origin.title, offeredBy: str(dto.origin.offeredBy), priceNow: str(dto.origin.priceNow), priceChanged: dto.origin.priceChanged === true }
      : null,
    openPoints: Array.isArray(dto.openPoints) ? dto.openPoints.filter(p => p && typeof p.id === 'string' && typeof p.text === 'string').map(p => ({
      id: p.id, kind: String(p.kind), blocksConfirmation: p.effect === 'BLOCKS_CONFIRMATION', text: p.text,
      sides: Array.isArray(p.sides) ? p.sides.filter(s => s && typeof s.value === 'string') : [], checkable: p.checkable === true && p.effect !== 'BLOCKS_CONFIRMATION',
      checked: p.checked === true, sourceName: str(p.sourceName),
    })) : [],
  };
}

/** Every term, flattened, for comparing two versions of the agreement. */
function allTerms(f: AgreementFormation): FormationTerm[] {
  return [...f.what, ...f.money, ...f.when, ...f.conditions, ...f.notIncluded, ...f.responsibilities.flatMap(g => g.duties)];
}

/**
 * Entry Perfection Phase 6 (§40) -- the material terms that changed between the version the person last saw and this one:
 * "Total price is now KES 175,000". Keyed by the server's semantic term key, so a correction reads as an update, not as a
 * removal plus an addition. At most three, never an audit log.
 */
export function whatChanged(previous: AgreementFormation | null, current: AgreementFormation | null): string[] {
  if (!previous || !current || previous.version === current.version || previous.conversationId !== current.conversationId) return [];
  const before = new Map(allTerms(previous).map(t => [t.key, t]));
  const changes: string[] = [];
  for (const t of allTerms(current)) {
    const old = before.get(t.key);
    if (old && old.value !== t.value) changes.push(`${t.label} is now ${t.value}`);
    else if (!old && previous.reviewable) changes.push(`Added: ${t.label.toLowerCase()} ${t.value}`);
  }
  const now = new Set(allTerms(current).map(t => t.key));
  for (const t of allTerms(previous)) if (!now.has(t.key)) changes.push(`Removed: ${t.label.toLowerCase()} ${t.value}`);
  return changes.slice(0, 3);
}
