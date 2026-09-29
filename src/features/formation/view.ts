import type { AgreementFormationDto, FormationEvidenceDto, FormationTermDto } from '../../api/securepay/agent/dto';

/**
 * Entry Perfection Phase 6 -- the emerging agreement, validated. The server owns every word of it (terms, open points,
 * summary); this only normalises shapes and never invents or re-derives a term. Unknown enum values degrade safely
 * (an unknown stage is "not reviewable", an unknown effect is "needs checking").
 */
export interface FormationTerm { key: string; label: string; value: string; detail: string | null; basis: 'STATED' | 'INFERRED' | 'YOURS'; needsChecking: boolean; evidence: FormationEvidenceDto[]; history: string | null }
export interface FormationSide { value: string; from: string; factId: string | null; choosable: boolean }
export interface FormationOpenPoint { id: string; kind: string; blocksConfirmation: boolean; text: string; sides: FormationSide[]; checkable: boolean; checked: boolean; sourceName: string | null;
  /** MONEY, DATE, TIMING, RESPONSIBILITY, INCLUSION, ROLE, PARTY, CURRENCY, ... (server-owned); OTHER when unknown. */
  topic: string }
/**
 * Entry Perfection Phase 7 -- the one question SecurePay needs next, planned by the server (never the client or the model). Only
 * present when SecurePay genuinely needs to ask; {@code choices} only when the evidence bounds the answer (free text always works).
 */
export interface FormationQuestion { id: string; text: string; choices: string[]; blocksSetUp: boolean; alreadyAsked: boolean;
  /** User-Ready Beta Gate 1 -- the open point(s) this question is about, so a settleable conflict can be answered directly. */
  openPointIds: string[] }
export interface AgreementFormation {
  conversationId: string; version: number; digest: string;
  stage: 'NOTHING_YET' | 'BUILD' | 'UNDERSTOOD'; reviewable: boolean; confirmable: boolean;
  reviewBlockedReason: string | null; confirmationBlockedReason: string | null; summary: string | null;
  what: FormationTerm[]; who: { key: string; name: string; role: string | null; identity: 'VERIFIED' | 'DESCRIBED' | 'MISSING'; ksNumber: string | null; describedAs: string | null; linked: boolean }[];
  money: FormationTerm[]; when: FormationTerm[]; responsibilities: { party: string; duties: FormationTerm[] }[];
  conditions: FormationTerm[]; notIncluded: FormationTerm[];
  origin: { type: string; title: string; offeredBy: string | null; priceNow: string | null; priceChanged: boolean } | null;
  openPoints: FormationOpenPoint[];
  question: FormationQuestion | null;
  /** Entry Perfection Phase 9 -- still being read; Review shows what is known so far. */
  readingSources: string[];
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
      // Entry Perfection Phase 8 -- only a server-VERIFIED party is linked; anything else (including a missing field) is not.
      linked: p.identity === 'VERIFIED' && !!str(p.ksNumber),
    })) : [],
    money: terms(dto.money), when: terms(dto.when),
    responsibilities: Array.isArray(dto.responsibilities) ? dto.responsibilities.filter(g => g && typeof g.party === 'string').map(g => ({ party: g.party, duties: terms(g.duties) })) : [],
    conditions: terms(dto.conditions), notIncluded: terms(dto.notIncluded),
    origin: dto.origin && typeof dto.origin.title === 'string'
      ? { type: dto.origin.type, title: dto.origin.title, offeredBy: str(dto.origin.offeredBy), priceNow: str(dto.origin.priceNow), priceChanged: dto.origin.priceChanged === true }
      : null,
    openPoints: Array.isArray(dto.openPoints) ? dto.openPoints.filter(p => p && typeof p.id === 'string' && typeof p.text === 'string').map(p => ({
      id: p.id, kind: String(p.kind), blocksConfirmation: p.effect === 'BLOCKS_CONFIRMATION', text: p.text,
      sides: Array.isArray(p.sides) ? p.sides.filter(s => s && typeof s.value === 'string').map(s => ({
        value: s.value, from: String(s.from ?? ''), factId: str(s.factId),
        // Settled directly only when the server says so AND names the fact -- never inferred here.
        choosable: s.choosable === true && !!str(s.factId),
      })) : [],
      checkable: p.checkable === true && p.effect !== 'BLOCKS_CONFIRMATION',
      checked: p.checked === true, sourceName: str(p.sourceName), topic: str(p.topic) ?? 'OTHER',
    })) : [],
    question: question(dto.question),
    readingSources: Array.isArray(dto.readingSources) ? dto.readingSources.filter((n): n is string => typeof n === 'string' && n.length > 0).slice(0, 5) : [],
  };
}

const MAX_CHOICES = 3;
function question(q: AgreementFormationDto['question']): FormationQuestion | null {
  if (!q || q.ask !== true || typeof q.id !== 'string' || !str(q.text)) return null;
  const choices = Array.isArray(q.choices) ? q.choices.filter((c): c is string => typeof c === 'string' && c.trim().length > 0 && c.length <= 60) : [];
  const openPointIds = Array.isArray(q.openPointIds) ? q.openPointIds.filter((id): id is string => typeof id === 'string') : [];
  return { id: q.id, text: String(q.text), choices: choices.slice(0, MAX_CHOICES), blocksSetUp: q.blocksSetUp === true, alreadyAsked: q.alreadyAsked === true, openPointIds };
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
