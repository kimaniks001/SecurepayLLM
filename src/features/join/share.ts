/**
 * Public Experience Convergence Phase 4 -- quick Trust Project share invitations (UR-210).
 *
 * A share link is an ACQUISITION DOORWAY ONLY. It is a public, non-secret `#/join` URL, optionally carrying a
 * presentation-only `interest` (member | plug | master) that changes explanatory copy on the Join page and
 * nothing else. It creates no membership row, grants no membership, Plug or Master capacity, no referral,
 * attribution, Lifetime Share, reward or authority, and it carries no inviter identity (there is no
 * server-signed provenance for share links). Canonical invitations of an EXISTING KS Number stay the separate
 * `/membership/invite` flow.
 */
export type JoinInterest = 'member' | 'plug' | 'master';

const INTERESTS: readonly JoinInterest[] = ['member', 'plug', 'master'];

/** A closed enum: anything else is ignored safely. */
export function parseJoinInterest(value: string | null | undefined): JoinInterest | null {
  const normalized = (value ?? '').trim().toLowerCase();
  return (INTERESTS as readonly string[]).includes(normalized) ? (normalized as JoinInterest) : null;
}

/** The public Join URL for this app, with only the presentation context -- never a token, never an identity. */
export function joinUrl(origin: string, interest: JoinInterest | null): string {
  const base = origin.replace(/\/+$/, '');
  return interest ? `${base}/#/join?interest=${interest}` : `${base}/#/join`;
}

/** Human invitation copy. Never promises income or work, never calls the person a Plug or Master already. */
export const SHARE_MESSAGE: Record<JoinInterest, string> = {
  member: 'I thought you might find The Trust Project useful — people, practical systems and fair-trade tools for making useful things happen together.',
  plug: 'I thought of you because you’re good at connecting people and helping things move.',
  master: 'I thought of you because your experience could be useful to other people and shouldn’t disappear.',
};

/** The small prompts beside the Member / Plug / Master cards for an ACTIVE member. */
export const SHARE_PROMPT: Record<JoinInterest, string> = {
  member: 'Know someone who could benefit from being here?',
  plug: 'Know someone who is good at connecting people and helping things move?',
  master: 'Know someone whose experience should not disappear?',
};

/**
 * User-Ready Beta Gate 1 (EP-CERT-012, decision D3) -- an optional short personal note ("I think this is what we were talking
 * about.") travels ONLY inside the shared message itself, so the recipient knows who it is from and why. It is never stored,
 * never sent to SecurePay and creates no invitation record, membership or referral.
 */
export const MAX_SHARE_NOTE = 280;
export function shareText(interest: JoinInterest, url: string, note?: string): string {
  const personal = (note ?? '').trim().slice(0, MAX_SHARE_NOTE);
  return `${personal ? `${personal}\n\n` : ''}${SHARE_MESSAGE[interest]}\n\n${url}`;
}

/** The standard WhatsApp share composer -- no contacts are read or uploaded. */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Join page copy for someone who arrived through a shared context. Explanatory only. */
export const INTEREST_CONTEXT: Record<JoinInterest, string> = {
  member: 'Someone thought you might find The Trust Project useful.',
  plug: 'Someone thought of you because you’re good at connecting people and helping things move. Everyone joins as a Member; being a Plug is a separate choice you can explore later.',
  master: 'Someone thought your experience could be useful to other people. Everyone joins as a Member; being a Master is a separate choice you can explore later.',
};
