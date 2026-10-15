import type { AgreementFormation } from '../formation/view';

/**
 * Human-facing preparation guidance ONLY. The backend owns Agreement Formation,
 * readiness, review, actor identity and all Money decisions.
 *
 * These are questions to help make a real arrangement workable, not client-side
 * required facts, inferred answer values, automatic Agreement mutations, or
 * deterministic prompts injected into the model as system instructions.
 */
export type PracticalQuestion = { id: string; question: string; reason: string };

function mentioned(f: AgreementFormation, pattern: RegExp): boolean {
  const pieces = [
    ...f.who.map(p => [p.role, p.describedAs].filter(Boolean).join(' ')),
    ...f.money.map(t => t.label + ' ' + t.value + ' ' + (t.detail ?? '')),
    ...f.responsibilities.flatMap(g => [g.party, ...g.duties.map(t => t.label + ' ' + t.value)]),
    ...f.conditions.map(t => t.label + ' ' + t.value),
  ];
  return pieces.some(part => pattern.test(part));
}

export function practicalQuestions(formation: AgreementFormation | null): PracticalQuestion[] {
  if (!formation || formation.stage === 'NOTHING_YET') return [];

  // A server-planned question takes priority over advisory exploration.
  if (formation.question) return [{
    id:'server-next', question:formation.question.text,
    reason:'SecurePay identified this as the next material question.',
  }];

  const questions: PracticalQuestion[] = [];
  if (!mentioned(formation, /\b(seller|supplier|merchant|provider|contractor|vendor|payee|seller's|vendor's)\b/i)) {
    questions.push({
      id:'who-provides',
      question:'Who is providing what is being agreed, and who should receive payment for it?',
      reason:'The person receiving the goods or benefit may not be the person entitled to the money.',
    });
  }
  if (!mentioned(formation, /\b(payer|buyer pays|customer pays|paid by|paying party|payment responsibility)\b/i)) {
    questions.push({
      id:'who-pays',
      question:'Who is responsible for paying under this Agreement?',
      reason:'An agreed price is not the same as an identified payer.',
    });
  }
  if (!formation.when.length || !formation.responsibilities.some(g=>g.duties.length)) {
    questions.push({
      id:'fulfilment',
      question:'How will this be delivered, handed over or completed, and by when?',
      reason:'Each trade needs a practical way to carry out its promises, not just a price.',
    });
  }
  if (!mentioned(formation, /\b(release|after delivery|on delivery|on completion|upon acceptance|proof of|payment due|paid after|payment trigger|paid when)\b/i)) {
    questions.push({
      id:'when-money-moves',
      question:'What must happen before the payee becomes entitled to the money?',
      reason:'Money should follow verified Agreement obligations, not move simply because a price is known.',
    });
  }
  if (!mentioned(formation, /\b(refund|return|cancel|failure|damaged|dispute|replacement|remedy)\b/i)) {
    questions.push({
      id:'if-things-change',
      question:'What should happen if the agreed delivery or work does not happen as expected?',
      reason:'A practical Agreement needs a fair way to deal with non-performance where relevant.',
    });
  }
  return questions;
}

export function prepareQuestionForKs001(question: string): string {
  // A visible, explicitly user-triggered request, not a secret system instruction.
  return 'Before I review this Agreement, help me clarify this practical point: ' + question +
    ' Please ask me only the next necessary question, do not assume an answer, and do not initiate payment.';
}
