/**
 * B4 deterministic query helper for the current canonical Agreement search API.
 * Understands ONLY explicit "with <business>", subject and year forms.
 * Never treats an old year as proof that SecurePay has imported that history.
 *
 * The backend remains responsible for access control and matching facts.
 * No AI summary, invented amount, transcript or inferred person identity.
 */
export interface ArchiveSearchPlan {
  original: string;
  notificationQuery: string;
  person: string | null;
  subject: string | null;
  fromDate: string | null;
  toDate: string | null;
  /** True means a person query is explicitly present, so the API uses AND. */
  explicitPerson: boolean;
}

function shorten(q: string, max: number) {
  return q.trim().replace(/\s+/g, ' ').slice(0, max);
}

/** Parses "cement deal around 2016 with Tom Contractors" without an LLM. */
export function parseArchiveSearch(raw: string): ArchiveSearchPlan {
  const original = shorten(raw, 160);
  if (original.length < 2) throw new Error('Describe what you are looking for');
  let pending = original;

  const yearMatch = /\b(?:around|about|approximately|in|from|during)?\s*((?:19|20)\d{2})\b/i.exec(pending);
  let fromDate: string | null = null;
  let toDate: string | null = null;
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    const around = /\b(around|about|approximately)\b/i.test(yearMatch[0]);
    const from = around ? year - 1 : year;
    const to = around ? year + 2 : year + 1;
    fromDate = `${from}-01-01T00:00:00Z`;
    toDate = `${to}-01-01T00:00:00Z`;
    pending = pending.replace(yearMatch[0], ' ');
  }

  const withMatch = /\bwith\s+([^,;?]+)$/i.exec(pending);
  let person: string | null = null;
  if (withMatch) {
    person = shorten(withMatch[1], 100).replace(/[.!?]+$/, '') || null;
    pending = pending.slice(0, withMatch.index);
  }

  const subject = shorten(pending
    .replace(/\b(?:the|a|an|that|my|deal|agreement|transaction|purchase|order|record|regarding|about|for)\b/gi, ' ')
    .replace(/[,.!?;:]/g, ' '), 100) || null;

  // Notification text is searched on what the user actually gave. When they
  // specify a subject, use it; otherwise a named party, otherwise original.
  const notificationQuery = shorten(subject || person || original, 160);
  return { original, notificationQuery, person, subject, fromDate, toDate, explicitPerson: !!person };
}

export function uniqueAgreements<T extends { agreementId: string }>(
  pages: readonly (readonly T[])[],
): T[] {
  const byId = new Map<string, T>();
  for (const page of pages) for (const item of page) {
    if (item?.agreementId && !byId.has(item.agreementId)) byId.set(item.agreementId, item);
  }
  return [...byId.values()];
}
