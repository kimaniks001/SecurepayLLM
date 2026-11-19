/**
 * H1 Mini-only Human Layer doorway contract. This local intent is NOT a
 * support case, an Agreement, a Plug assignment, location consent or Money.
 * Only SecurePayAPI authorities may create those records in later phases.
 */
export type MiniTradeJourney = 'buy' | 'sell' | 'pay' | 'collect' | 'living-agreement';
export type HumanHelpIntent =
  | 'report-concern' | 'review-agreement' | 'talk-to-someone'
  | 'local-knowledge' | 'field-fact-check' | 'specialist-advice';

export interface HumanHelpLaunchInput {
  journey: MiniTradeJourney;
  intent: HumanHelpIntent;
  /** Pointers, not access grants; exact current version must be re-read server-side. */
  agreementId?: string | null;
  acceptedVersionId?: string | null;
}

export interface LocalHumanHelpIntent {
  sourceProduct: 'MINI';
  sourceJourney: MiniTradeJourney;
  intent: HumanHelpIntent;
  agreementRef: { agreementId: string; acceptedVersionId: string } | null;
  access: 'NONE_UNTIL_SERVER_REAUTHORISES';
  state: 'LOCAL_INTENT_ONLY';
}

/** Never carries Money, private messages, addresses, credentials, or provider data. */
export function prepareHumanHelpLaunch(input: HumanHelpLaunchInput): LocalHumanHelpIntent {
  if (!input || !['buy', 'sell', 'pay', 'collect', 'living-agreement'].includes(input.journey)) {
    throw new Error('Unknown SecurePay Mini journey');
  }
  if (!['report-concern', 'review-agreement', 'talk-to-someone',
    'local-knowledge', 'field-fact-check', 'specialist-advice'].includes(input.intent)) {
    throw new Error('Unknown Human Layer intent');
  }
  const agreementId = input.agreementId?.trim() || null;
  const acceptedVersionId = input.acceptedVersionId?.trim() || null;
  if (!!agreementId !== !!acceptedVersionId || (input.journey === 'living-agreement' && !agreementId)) {
    throw new Error('An Agreement reference requires its exact accepted version');
  }
  return {
    sourceProduct: 'MINI', sourceJourney: input.journey, intent: input.intent,
    agreementRef: agreementId && acceptedVersionId ? { agreementId, acceptedVersionId } : null,
    access: 'NONE_UNTIL_SERVER_REAUTHORISES', state: 'LOCAL_INTENT_ONLY'
  };
}

export const HUMAN_HELP_ENTRY_LABEL = 'Need a hand?';
