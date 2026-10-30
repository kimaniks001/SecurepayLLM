import type { FairTradeExaminationDto, SelectedCommercialSourceDto } from '../../api/securepay/agent/dto';
import type { AgreementFormation } from '../formation/view';

/**
 * True North Gate 4: a source-aware conversational nudge, NOT a second
 * examination engine. Only canonical current Formation/FairTrade reads can
 * specify that KS001 identified a material question or observation.
 *
 * A Community OPPORTUNITY may be voluntary, paid, or undecided. We never
 * infer employment, a completed 12-lens assessment, consent, legal compliance
 * or actual funds merely from selecting that post.
 */
export function projectFairTradeGuidance(
  source: SelectedCommercialSourceDto | null,
  formation: AgreementFormation | null,
  reading: FairTradeExaminationDto | null,
): {title:string;nextQuestion:string;basis:'formation'|'examination'|'starting-point';observations:string;funding:string} | null {
  if (!source || source.sourceType !== 'OPPORTUNITY' || !formation) return null;
  const current=reading?.status==='PARTIAL_ADVISORY'
    && reading.conversationId===formation.conversationId
    && reading.tradeContextVersion===formation.version ? reading : null;
  const question=formation.question?.text?.trim();
  const advisory=current?.advisoryQuestion?.trim();
  const nextQuestion=question || advisory ||
    'For this opportunity, what work is proposed, is it paid or voluntary, how are people selected, and what safety and payment conditions still need agreement?';
  const basis=question?'formation':advisory?'examination':'starting-point';
  const observations=current
    ?current.hasMaterialConcern
      ?'The current Fair Trade reading identifies a material concern. Resolve it with KS001 before relying on the proposal.'
      :current.findings.length
        ?'This version has open Fair Trade matters. Only the displayed observations have been grounded; the other principles are not cleared.'
        :'No Fair Trade concern is confirmed in this partial reading; this does not mean all 12 principles were assessed.'
    :'No current Fair Trade examination is confirmed for this Agreement version.';
  return {
    title:source.sourceTitle?.trim()||'Community opportunity',
    nextQuestion,basis,observations,
    funding:'Funding has not been verified in this conversation view. An organiser’s statement or project budget is not secured money.',
  };
}

export function projectFairTradeDraft(question:string):string {
  return [
    'KS001, help me examine the Community opportunity I selected against the canonical 12 Principles of Fair Trade.',
    'Start with this material question: '+question.trim(),
    'Please distinguish paid work from voluntary participation; clarify the work, who will perform it, hours, safety, conditions for completion, compensation and payment timing, who pays and who receives payment, and how participants are selected.',
    'Do not assume any interested person has been selected, invited into an Agreement, or accepted. A draft available for review is not Fair Trade qualification.',
    'Do not assert funding is verified or money is reserved unless the authorised Money system provides that evidence. Ask ONE meaningful unanswered question next, then continue as facts become clear.',
  ].join('\n');
}
